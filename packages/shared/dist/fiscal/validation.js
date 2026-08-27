/**
 * Zod Schemas & Statutory Validation for 54-FZ FFD 1.2 Fiscal Receipts & Operations.
 * Compliant with Order of FTS Russia No. ED-7-20/662@ and Order of Minzdrav 804n.
 */
import { z } from "zod";
import { ffd12CorrectionTypeSchema, ffd12OperationTypeSchema, ffd12PaymentMethodSchema, ffd12PaymentSubjectSchema, ffd12QuantityMeasureSchema, ffd12TaxationSystemSchema, ffd12VatRateSchema, taxDeductionCategorySchema, } from "./ffd12Types.js";
import { parseChestnyZnakDataMatrix } from "./markingValidation.js";
import { computePayloadHash, parseIdempotencyKey, } from "../sync/hashing.js";
/**
 * Single line item schema in a 54-FZ FFD 1.2 Fiscal Receipt.
 */
export const fiscalReceiptItemSchema = z
    .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Наименование позиции обязательно").max(128, "Максимум 128 символов по ФФД 1.2 (Тег 1030)"),
    priceKopecks: z.number().int().positive("Цена в копейках должна быть положительным числом"),
    quantity: z.number().positive("Количество должно быть больше нуля").default(1),
    amountKopecks: z.number().int().positive("Сумма в копейках должна быть положительным числом"),
    subject: ffd12PaymentSubjectSchema.default("service"),
    method: ffd12PaymentMethodSchema.default("full_payment"),
    vatRate: ffd12VatRateSchema.default("vat_none"),
    measure: ffd12QuantityMeasureSchema.default("piece"),
    taxDeductionCode: taxDeductionCategorySchema.default("code_1_standard"),
    medicalServiceCode804n: z.string().trim().max(32).optional().nullable(),
    medicalServiceCodeMzk: z.string().trim().max(32).optional().nullable(),
    toothFdiNumber: z.number().int().min(11).max(85).optional().nullable(),
    /** Честный ЗНАК / МДЛП DataMatrix marking barcode (Тег 1162 / Тег 1163 / Тег 2000) */
    markingCode: z.string().trim().max(200).optional().nullable(),
})
    .transform((item) => ({
    ...item,
    medicalServiceCode804n: item.medicalServiceCode804n ?? item.medicalServiceCodeMzk ?? null,
}))
    .superRefine((item, ctx) => {
    // Verify exact integer kopecks arithmetic: priceKopecks * quantity == amountKopecks
    const expectedAmount = Math.round(item.priceKopecks * item.quantity);
    if (Math.abs(expectedAmount - item.amountKopecks) > 1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Сумма позиции «${item.name}» (${item.amountKopecks} коп.) не соответствует расчёту цена × количество (${expectedAmount} коп.).`,
            path: ["amountKopecks"],
        });
    }
    // If marking code is provided, validate DataMatrix format
    if (item.markingCode && item.markingCode.trim().length > 0) {
        const parsed = parseChestnyZnakDataMatrix(item.markingCode);
        if (!parsed.isValid) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Некорректный код маркировки DataMatrix Честный ЗНАК: ${parsed.errorMessage || "ошибка формата"}`,
                path: ["markingCode"],
            });
        }
    }
});
/**
 * Schema for creating and queueing an FFD 1.2 fiscal receipt.
 */
export const createFiscalReceiptPayloadSchema = z
    .object({
    clientMutationId: z.string().trim().min(1).max(128).optional().nullable(),
    invoiceId: z.string().uuid().optional().nullable(),
    visitId: z.string().uuid().optional().nullable(),
    documentId: z.string().uuid().optional().nullable(),
    patientId: z.string().uuid("Некорректный UUID пациента"),
    operationType: ffd12OperationTypeSchema.default("income"),
    taxationSystem: ffd12TaxationSystemSchema.default("usn_income"),
    customerContact: z
        .string()
        .trim()
        .min(5, "Укажите телефон или email для отправки чека")
        .max(100, "Контакт клиента не может превышать 100 символов"),
    cashierFullName: z
        .string()
        .trim()
        .min(1, "ФИО кассира обязательно")
        .max(120, "ФИО кассира не может превышать 120 символов")
        .default("Кассир-администратор"),
    cashierInn: z.string().trim().max(12).optional().nullable(),
    paymentAddress: z.string().trim().max(256).optional().nullable(),
    paymentPlace: z.string().trim().max(256).optional().nullable(),
    items: z.array(fiscalReceiptItemSchema).min(1, "Чек должен содержать хотя бы одну позицию"),
    cashKopecks: z.number().int().min(0).default(0),
    electronicCardKopecks: z.number().int().min(0).default(0),
    sbpKopecks: z.number().int().min(0).default(0),
    prepaidKopecks: z.number().int().min(0).default(0),
    creditKopecks: z.number().int().min(0).default(0),
    totalKopecks: z.number().int().positive("Общая сумма чека должна быть больше нуля"),
    taxDeductionSummaryCode: taxDeductionCategorySchema.default("code_1_standard"),
    /** Optional 54-FZ correction attributes */
    isCorrection: z.boolean().optional().default(false),
    correctionType: ffd12CorrectionTypeSchema.optional().nullable(),
    correctionDocDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты коррекции: ГГГГ-ММ-ДД").optional().nullable(),
    correctionDocNumber: z.string().trim().max(64).optional().nullable(),
})
    .superRefine((val, ctx) => {
    // Strict parity: Sum of payment tenders MUST EQUAL total receipt amount
    const paymentsSum = val.cashKopecks +
        val.electronicCardKopecks +
        val.sbpKopecks +
        val.prepaidKopecks +
        val.creditKopecks;
    if (paymentsSum > 0 && paymentsSum !== val.totalKopecks) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Сумма способов оплаты (${paymentsSum} коп.) не совпадает с общей суммой чека (${val.totalKopecks} коп.)`,
            path: ["totalKopecks"],
        });
    }
    // Strict parity: Sum of line items MUST EQUAL total receipt amount
    const itemsSum = val.items.reduce((sum, item) => sum + item.amountKopecks, 0);
    if (itemsSum !== val.totalKopecks) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Сумма позиций чека (${itemsSum} коп.) не совпадает с общей суммой чека (${val.totalKopecks} коп.)`,
            path: ["items"],
        });
    }
    // If correction receipt is requested, base document data is mandatory
    if (val.isCorrection && (!val.correctionDocDate || !val.correctionDocNumber)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Для чека коррекции по 54-ФЗ обязательно указание даты и номера документа-основания (Теги 1178, 1179).",
            path: ["isCorrection"],
        });
    }
});
/**
 * Schema for 54-FZ Return Receipt (Возврат прихода / Возврат расхода).
 */
export const fiscalRefundPayloadSchema = z
    .object({
    clientMutationId: z.string().trim().min(1).max(128).optional().nullable(),
    originalPaymentId: z.string().uuid("Некорректный UUID исходного платежа"),
    originalReceiptNumber: z.string().trim().min(1, "Номер исходного чека обязателен"),
    originalFiscalSign: z.string().trim().max(32).optional().nullable(),
    patientId: z.string().uuid("Некорректный UUID пациента"),
    refundCashKopecks: z.number().int().min(0).default(0),
    refundElectronicKopecks: z.number().int().min(0).default(0),
    refundPrepaidKopecks: z.number().int().min(0).default(0),
    totalRefundKopecks: z.number().int().positive("Сумма возврата должна быть больше нуля"),
    reason: z.string().trim().min(1, "Причина возврата обязательна").max(256),
    cashierFullName: z.string().trim().min(1).max(120).default("Кассир-администратор"),
    items: z.array(fiscalReceiptItemSchema).min(1, "Укажите возвращаемые позиции"),
})
    .superRefine((val, ctx) => {
    const tenderSum = val.refundCashKopecks + val.refundElectronicKopecks + val.refundPrepaidKopecks;
    if (tenderSum !== val.totalRefundKopecks) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Сумма возвращаемых средств по типам оплат (${tenderSum} коп.) не равна общей сумме возврата (${val.totalRefundKopecks} коп.).`,
            path: ["totalRefundKopecks"],
        });
    }
    const itemsSum = val.items.reduce((sum, item) => sum + item.amountKopecks, 0);
    if (itemsSum !== val.totalRefundKopecks) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Сумма позиций чека возврата (${itemsSum} коп.) не совпадает с общей суммой (${val.totalRefundKopecks} коп.).`,
            path: ["items"],
        });
    }
});
/**
 * Formats statutory 54-FZ FTS QR-code payload string:
 * t=YYYYMMDDTHHMM&s=XXXX.XX&fn=16_DIGITS&i=FD_NUM&fp=FPD_NUM&n=OPER_TYPE
 */
export function format54FzFtsQrString(params) {
    const dateObj = typeof params.issuedAt === "string" ? new Date(params.issuedAt) : params.issuedAt;
    if (Number.isNaN(dateObj.getTime())) {
        throw new Error("Некорректная дата фискального чека для QR-кода");
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const t = `${year}${month}${day}T${hours}${minutes}`;
    const rubles = Math.floor(params.totalKopecks / 100);
    const kopecks = Math.abs(params.totalKopecks % 100);
    const s = `${rubles}.${String(kopecks).padStart(2, "0")}`;
    const fn = String(params.fnSerial).trim();
    const i = String(params.fiscalDocumentNumber).trim();
    const fp = String(params.fiscalSign).trim();
    let n = "1";
    if (typeof params.operationType === "number") {
        n = String(params.operationType);
    }
    else {
        switch (params.operationType) {
            case "income":
                n = "1";
                break;
            case "income_return":
                n = "2";
                break;
            case "expense":
                n = "3";
                break;
            case "expense_return":
                n = "4";
                break;
            default:
                n = "1";
        }
    }
    return `t=${t}&s=${s}&fn=${fn}&i=${i}&fp=${fp}&n=${n}`;
}
/**
 * Parses and strictly validates a 54-FZ FTS QR-code string according to FFD 1.2 rules.
 */
export function parseAndValidate54FzFtsQrString(qrString) {
    if (!qrString || typeof qrString !== "string" || qrString.trim().length === 0) {
        return { isValid: false, errorMessage: "QR-строка пуста" };
    }
    const trimmed = qrString.trim();
    const pairs = trimmed.split("&");
    const params = {};
    for (const pair of pairs) {
        const [rawKey, ...rest] = pair.split("=");
        if (rawKey && rest.length > 0) {
            params[rawKey.trim().toLowerCase()] = rest.join("=").trim();
        }
    }
    // 1. Mandatory keys check
    const requiredKeys = ["t", "s", "fn", "i", "fp", "n"];
    for (const key of requiredKeys) {
        if (!params[key]) {
            return {
                isValid: false,
                errorMessage: `В QR-строке 54-ФЗ отсутствует обязательный реквизит '${key}'`,
                rawParams: params,
            };
        }
    }
    // 2. Validate timestamp 't' (YYYYMMDDTHHMM or YYYYMMDDTHHMMSS)
    const tVal = params["t"];
    const tMatch = tVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/i);
    if (!tMatch) {
        return {
            isValid: false,
            errorMessage: `Некорректный формат даты/времени '${tVal}' в реквизите 't' (ожидается YYYYMMDDTHHMM)`,
            rawParams: params,
        };
    }
    const [, yStr, mStr, dStr, hStr, minStr, secStr] = tMatch;
    const year = Number(yStr);
    const month = Number(mStr);
    const day = Number(dStr);
    const hours = Number(hStr);
    const minutes = Number(minStr);
    const seconds = secStr ? Number(secStr) : 0;
    if (month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31 ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59 ||
        seconds < 0 ||
        seconds > 59) {
        return {
            isValid: false,
            errorMessage: `Значение даты/времени '${tVal}' выходит за допустимые календарные пределы`,
            rawParams: params,
        };
    }
    const parsedDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    const issuedAtIso = parsedDate.toISOString();
    // 3. Validate sum 's' (format: XXXX.XX)
    const sVal = params["s"];
    if (!/^\d+(\.\d{1,2})?$/.test(sVal)) {
        return {
            isValid: false,
            errorMessage: `Некорректный формат суммы '${sVal}' в реквизите 's' (ожидается числовое значение)`,
            rawParams: params,
        };
    }
    const totalAmountRub = parseFloat(sVal);
    if (Number.isNaN(totalAmountRub) || totalAmountRub < 0) {
        return {
            isValid: false,
            errorMessage: `Сумма '${sVal}' должна быть неотрицательным числом`,
            rawParams: params,
        };
    }
    const totalAmountKopecks = Math.round(totalAmountRub * 100);
    // 4. Validate FN serial 'fn' (16 digits)
    const fnVal = params["fn"];
    if (!/^\d{16}$/.test(fnVal)) {
        return {
            isValid: false,
            errorMessage: `Номер фискального накопителя 'fn' должен содержать ровно 16 цифр (получено: '${fnVal}')`,
            rawParams: params,
        };
    }
    // 5. Validate Fiscal Document number 'i' (integer >= 1)
    const iVal = params["i"];
    if (!/^\d{1,10}$/.test(iVal) || Number(iVal) <= 0) {
        return {
            isValid: false,
            errorMessage: `Номер фискального документа 'i' должен быть положительным целым числом (получено: '${iVal}')`,
            rawParams: params,
        };
    }
    const fiscalDocumentNumber = Number(iVal);
    // 6. Validate Fiscal Sign 'fp' (up to 10 digits integer)
    const fpVal = params["fp"];
    if (!/^\d{1,10}$/.test(fpVal)) {
        return {
            isValid: false,
            errorMessage: `Фискальный признак 'fp' должен содержать до 10 десятичных цифр (получено: '${fpVal}')`,
            rawParams: params,
        };
    }
    // 7. Validate Operation Type 'n' (1, 2, 3, 4)
    const nVal = params["n"];
    let operationType;
    switch (nVal) {
        case "1":
            operationType = "income";
            break;
        case "2":
            operationType = "income_return";
            break;
        case "3":
            operationType = "expense";
            break;
        case "4":
            operationType = "expense_return";
            break;
        default:
            return {
                isValid: false,
                errorMessage: `Недопустимый признак расчета 'n=${nVal}' (разрешены: 1, 2, 3, 4)`,
                rawParams: params,
            };
    }
    return {
        isValid: true,
        issuedAtIso,
        totalAmountRub,
        totalAmountKopecks,
        fnSerial: fnVal,
        fiscalDocumentNumber,
        fiscalSign: fpVal,
        operationType,
        rawParams: params,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITE IDEMPOTENCY KEY BUILDERS (<UUID>#<SHA256(PAYLOAD)>) FOR 54-FZ
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Builds a deterministic canonical signature for a 54-FZ receipt payload.
 * Normalizes all fields to prevent key ordering or whitespace discrepancies.
 */
export function buildFiscalReceiptPayloadSignature(input) {
    return {
        patientId: input.patientId,
        operationType: input.operationType ?? "income",
        taxationSystem: input.taxationSystem ?? "usn_income",
        totalKopecks: input.totalKopecks,
        cashKopecks: input.cashKopecks ?? 0,
        electronicCardKopecks: input.electronicCardKopecks ?? 0,
        sbpKopecks: input.sbpKopecks ?? 0,
        prepaidKopecks: input.prepaidKopecks ?? 0,
        creditKopecks: input.creditKopecks ?? 0,
        items: input.items.map((it) => ({
            name: it.name.trim(),
            priceKopecks: it.priceKopecks,
            quantity: it.quantity,
            amountKopecks: it.amountKopecks,
            subject: it.subject ?? "service",
            method: it.method ?? "full_payment",
            vatRate: it.vatRate ?? "vat_none",
            measure: it.measure ?? "piece",
            markingCode: it.markingCode ? it.markingCode.trim() : null,
            medicalServiceCode804n: it.medicalServiceCode804n ? it.medicalServiceCode804n.trim() : null,
        })),
    };
}
/**
 * Builds a deterministic canonical signature for a 54-FZ refund receipt payload.
 */
export function buildFiscalRefundPayloadSignature(input) {
    return {
        originalPaymentId: input.originalPaymentId ?? null,
        originalReceiptNumber: input.originalReceiptNumber ?? null,
        patientId: input.patientId,
        totalRefundKopecks: input.totalRefundKopecks,
        refundCashKopecks: input.refundCashKopecks ?? 0,
        refundElectronicKopecks: input.refundElectronicKopecks ?? 0,
        refundPrepaidKopecks: input.refundPrepaidKopecks ?? 0,
        reason: input.reason ? input.reason.trim() : "",
        items: input.items.map((it) => ({
            name: it.name.trim(),
            priceKopecks: it.priceKopecks,
            quantity: it.quantity,
            amountKopecks: it.amountKopecks,
        })),
    };
}
/**
 * Creates a statutory composite Idempotency-Key: `<uuid>#<sha256(canonicalPayload)>`.
 */
export function createFiscalCompositeIdempotencyKey(uuid, payloadSignature) {
    const hash = computePayloadHash(payloadSignature);
    return `${uuid}#${hash}`;
}
/**
 * Verifies if an incoming composite idempotency key matches the computed payload signature.
 */
export function verifyFiscalCompositeIdempotencyKey(compositeKey, payloadSignature) {
    const parsed = parseIdempotencyKey(compositeKey);
    const actualHash = computePayloadHash(payloadSignature);
    const isValid = parsed.embeddedHash === null || parsed.embeddedHash === actualHash;
    return {
        isValid,
        uuid: parsed.uuid,
        expectedHash: parsed.embeddedHash,
        actualHash,
    };
}
/**
 * Computes exact kopeck cash change or shortage for rapid cashier counter.
 */
export function calculateCashChange(cashRequiredRub, receivedCashRub) {
    const requiredKopecks = Math.max(0, Math.round(cashRequiredRub * 100));
    const receivedKopecks = Math.max(0, Math.round(receivedCashRub * 100));
    if (receivedKopecks >= requiredKopecks) {
        const changeKop = receivedKopecks - requiredKopecks;
        return {
            cashRequiredRub,
            receivedCashRub,
            changeRub: Number((changeKop / 100).toFixed(2)),
            changeKopecks: changeKop,
            isShortage: false,
            shortageRub: 0,
            shortageKopecks: 0,
        };
    }
    const shortageKop = requiredKopecks - receivedKopecks;
    return {
        cashRequiredRub,
        receivedCashRub,
        changeRub: 0,
        changeKopecks: 0,
        isShortage: true,
        shortageRub: Number((shortageKop / 100).toFixed(2)),
        shortageKopecks: shortageKop,
    };
}
/**
 * Returns rapid cash preset suggestions for common banknotes and exact amounts.
 */
export function getCashPresetSuggestions(cashRequiredRub) {
    const req = Math.ceil(cashRequiredRub);
    if (req <= 0)
        return [100, 500, 1000, 5000];
    const presets = new Set();
    presets.add(req);
    const standardBills = [50, 100, 200, 500, 1000, 2000, 5000];
    for (const bill of standardBills) {
        if (bill >= req) {
            presets.add(bill);
        }
    }
    const nextHundred = Math.ceil(req / 100) * 100;
    if (nextHundred > req)
        presets.add(nextHundred);
    const nextFiveHundred = Math.ceil(req / 500) * 500;
    if (nextFiveHundred > req)
        presets.add(nextFiveHundred);
    const nextThousand = Math.ceil(req / 1000) * 1000;
    if (nextThousand > req)
        presets.add(nextThousand);
    return Array.from(presets).sort((a, b) => a - b).slice(0, 5);
}
/**
 * Statutory validation of Russian Taxpayer Identification Numbers (ИНН):
 * - Legal entity (ЮЛ): 10 digits with Modulo 11 checksum
 * - Individual / Sole proprietor (ФЛ / ИП): 12 digits with 2-level Modulo 11 checksum
 */
export function validateRussianTaxpayerInn(inn) {
    if (!inn) {
        return { isValid: false, kind: null, digits: "", errorMessage: "ИНН не указан" };
    }
    const clean = inn.trim().replace(/\D/g, "");
    if (clean.length !== 10 && clean.length !== 12) {
        return {
            isValid: false,
            kind: null,
            digits: clean,
            errorMessage: "ИНН должен содержать ровно 10 цифр (ЮЛ) или 12 цифр (ФЛ/ИП)",
        };
    }
    const digitsArr = clean.split("").map(Number);
    if (clean.length === 10) {
        // 10-digit INN (Legal Entity): checksum on 10th digit
        const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
        const sum = weights.reduce((acc, w, idx) => acc + w * (digitsArr[idx] ?? 0), 0);
        const checkDigit = (sum % 11) % 10;
        const isValid = checkDigit === digitsArr[9];
        return {
            isValid,
            kind: "ul",
            digits: clean,
            errorMessage: isValid ? undefined : "Неверная контрольная сумма 10-значного ИНН ЮЛ",
        };
    }
    // 12-digit INN (Individual / Sole proprietor): checksums on 11th and 12th digits
    const weights11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const weights12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const sum11 = weights11.reduce((acc, w, idx) => acc + w * (digitsArr[idx] ?? 0), 0);
    const checkDigit11 = (sum11 % 11) % 10;
    const sum12 = weights12.reduce((acc, w, idx) => acc + w * (digitsArr[idx] ?? 0), 0);
    const checkDigit12 = (sum12 % 11) % 10;
    const isValid = checkDigit11 === digitsArr[10] && checkDigit12 === digitsArr[11];
    return {
        isValid,
        kind: "fl",
        digits: clean,
        errorMessage: isValid ? undefined : "Неверная контрольная сумма 12-значного ИНН ФЛ/ИП",
    };
}
