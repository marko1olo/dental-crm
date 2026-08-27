import { recognizeDentalMedication } from "./catalog.js";
// GTIN Checksum & Modulo 10 Algorithm
/**
 * Calculates GS1 Modulo 10 check digit for a 13-digit string.
 * For a 14-digit GTIN, the first 13 digits are multiplied by weights 3 and 1 alternating:
 * Positions 1, 3, 5, 7, 9, 11, 13 (indices 0, 2, 4, 6, 8, 10, 12) have weight 3.
 * Positions 2, 4, 6, 8, 10, 12 (indices 1, 3, 5, 7, 9, 11) have weight 1.
 */
export function computeGtinCheckDigit(gtin13) {
    if (!gtin13 || typeof gtin13 !== "string" || !/^\d{13}$/.test(gtin13)) {
        throw new Error(`Неверный формат входных данных для вычисления контрольной суммы GTIN: "${gtin13}". Ожидалось ровно 13 цифр.`);
    }
    let sum = 0;
    for (let i = 0; i < 13; i++) {
        const digit = Number.parseInt(gtin13[i], 10);
        const weight = i % 2 === 0 ? 3 : 1;
        sum += digit * weight;
    }
    const mod = sum % 10;
    return mod === 0 ? 0 : 10 - mod;
}
/**
 * Safe version of computeGtinCheckDigit that returns a Result object instead of throwing.
 */
export function safeComputeGtinCheckDigit(gtin13) {
    if (!gtin13 || typeof gtin13 !== "string" || !/^\d{13}$/.test(gtin13)) {
        return {
            isValid: false,
            error: `Неверный формат входных данных для вычисления контрольной суммы GTIN: "${String(gtin13)}". Ожидалось ровно 13 цифр.`,
        };
    }
    try {
        const checkDigit = computeGtinCheckDigit(gtin13);
        return { isValid: true, checkDigit };
    }
    catch (err) {
        const error = err instanceof Error ? err.message : "Ошибка вычисления контрольной суммы";
        return { isValid: false, error };
    }
}
/**
 * Validates a 14-digit GTIN string by computing and comparing its Modulo 10 check digit.
 * Rejects all-zero dummy GTINs and non-numeric inputs.
 */
export function isValidGtinChecksum(gtin14) {
    if (!gtin14 || typeof gtin14 !== "string" || !/^\d{14}$/.test(gtin14) || /^0+$/.test(gtin14)) {
        return false;
    }
    const body = gtin14.slice(0, 13);
    const expectedCheckDigit = Number.parseInt(gtin14[13], 10);
    try {
        const calculatedCheckDigit = computeGtinCheckDigit(body);
        return calculatedCheckDigit === expectedCheckDigit;
    }
    catch {
        return false;
    }
}
// Special Character Constants
export const GS1_GROUP_SEPARATOR = "\x1d"; // ASCII 29 <GS>
export const GS1_FNC1 = "\x1d";
/**
 * Normalizes scanner input representation into standard internal form.
 */
export function normalizeDataMatrixSeparators(raw) {
    if (!raw || typeof raw !== "string")
        return "";
    let s = raw.trim();
    // Remove common scanner prefix / suffix like AIM identifiers ]d2, ]Q3, etc.
    s = s.replace(/^\][a-zA-Z0-9]{2}/, "");
    // Replace human-readable representations of GS separator: <GS>, <FNC1>, {GS}, [GS], \u001d, %1D
    s = s.replace(/<GS>/gi, GS1_GROUP_SEPARATOR);
    s = s.replace(/<FNC1>/gi, GS1_GROUP_SEPARATOR);
    s = s.replace(/\{GS\}/gi, GS1_GROUP_SEPARATOR);
    s = s.replace(/\[GS\]/gi, GS1_GROUP_SEPARATOR);
    s = s.replace(/\\x1d/gi, GS1_GROUP_SEPARATOR);
    s = s.replace(/\\u001d/gi, GS1_GROUP_SEPARATOR);
    s = s.replace(/%1D/gi, GS1_GROUP_SEPARATOR);
    return s;
}
/**
 * Parses GS1 Expiration Date (AI 17) in YYMMDD format.
 */
export function parseMdlpExpirationDate(yymmdd, referenceDate = new Date()) {
    const refDate = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
        ? referenceDate
        : new Date();
    if (!yymmdd || typeof yymmdd !== "string" || !/^\d{6}$/.test(yymmdd)) {
        return {
            isoDate: null,
            isExpired: false,
            daysUntilExpiration: null,
            isExpiringSoon: false,
            error: "Неверный формат даты срока годности (ожидается ровно 6 цифр YYMMDD)",
        };
    }
    const yy = Number.parseInt(yymmdd.slice(0, 2), 10);
    const mm = Number.parseInt(yymmdd.slice(2, 4), 10);
    const dd = Number.parseInt(yymmdd.slice(4, 6), 10);
    // Century heuristic: 2000-2099
    const fullYear = 2000 + yy;
    if (mm < 1 || mm > 12) {
        return {
            isoDate: null,
            isExpired: false,
            daysUntilExpiration: null,
            isExpiringSoon: false,
            error: `Некорректный месяц в сроке годности: ${mm}`,
        };
    }
    // In GS1 standard, DD=00 represents the last calendar day of that month
    let actualDay = dd;
    if (dd === 0) {
        // Last day of month: new Date(year, month, 0).getDate()
        actualDay = new Date(fullYear, mm, 0).getDate();
    }
    else {
        const maxDaysInMonth = new Date(fullYear, mm, 0).getDate();
        if (dd < 1 || dd > maxDaysInMonth) {
            return {
                isoDate: null,
                isExpired: false,
                daysUntilExpiration: null,
                isExpiringSoon: false,
                error: `Некорректный день месяца в сроке годности: ${dd} (в месяце ${mm} только ${maxDaysInMonth} дн.)`,
            };
        }
    }
    const expiryDate = new Date(Date.UTC(fullYear, mm - 1, actualDay, 23, 59, 59, 999));
    const pad = (n) => n.toString().padStart(2, "0");
    const isoDate = `${fullYear}-${pad(mm)}-${pad(actualDay)}`;
    const diffMs = expiryDate.getTime() - refDate.getTime();
    const daysUntilExpiration = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const isExpired = daysUntilExpiration < 0;
    const isExpiringSoon = !isExpired && daysUntilExpiration <= 90;
    return {
        isoDate,
        isExpired,
        daysUntilExpiration,
        isExpiringSoon,
    };
}
/**
 * Main GS1 DataMatrix parser for Russian Pharma / MDLP / Chestny ZNAK barcodes.
 */
export function parseMdlpDataMatrix(rawInput, referenceDate = new Date()) {
    const errors = [];
    const warnings = [];
    const parsedAIs = {};
    if (!rawInput || typeof rawInput !== "string" || !rawInput.trim()) {
        return {
            rawBarcode: typeof rawInput === "string" ? rawInput : "",
            gtin: "",
            serialNumber: "",
            cryptoKey: "",
            cryptoSignature: "",
            sgtin: "",
            expirationDate: null,
            expirationDateRaw: null,
            series: null,
            lot: null,
            isValidGtinChecksum: false,
            isExpired: false,
            daysUntilExpiration: null,
            isExpiringSoon: false,
            recognizedDrug: null,
            parsedAIs: {},
            errors: ["Пустой или некорректный штрихкод."],
            warnings: [],
            isValid: false,
        };
    }
    const normalized = normalizeDataMatrixSeparators(rawInput);
    // Mode 1: Parentheses format, e.g., "(01)04601234567890(21)ABC1234567890(91)ABCD(92)XYZ..."
    const parenRegex = /\((\d{2,4})\)([^()]+)/g;
    let parenMatch = null;
    let foundParens = false;
    while (true) {
        parenMatch = parenRegex.exec(normalized);
        if (!parenMatch)
            break;
        foundParens = true;
        const ai = parenMatch[1];
        const val = parenMatch[2].trim();
        parsedAIs[ai] = val;
    }
    // Mode 2: Standard GS1 DataMatrix with Group Separators
    if (!foundParens) {
        let cursor = 0;
        const len = normalized.length;
        while (cursor < len) {
            if (normalized[cursor] === GS1_GROUP_SEPARATOR) {
                cursor++;
                continue;
            }
            // AI (01): GTIN - exactly 14 digits
            if (normalized.startsWith("01", cursor) &&
                /^\d{14}/.test(normalized.slice(cursor + 2, cursor + 16))) {
                parsedAIs["01"] = normalized.slice(cursor + 2, cursor + 16);
                cursor += 16;
                continue;
            }
            // AI (17): Expiration Date - exactly 6 digits YYMMDD
            if (normalized.startsWith("17", cursor) &&
                /^\d{6}/.test(normalized.slice(cursor + 2, cursor + 8))) {
                parsedAIs["17"] = normalized.slice(cursor + 2, cursor + 8);
                cursor += 8;
                continue;
            }
            // AI (21): Serial Number - variable length (up to 13 chars standard for MDLP)
            if (normalized.startsWith("21", cursor)) {
                cursor += 2;
                let end = normalized.indexOf(GS1_GROUP_SEPARATOR, cursor);
                if (end === -1) {
                    const next91 = normalized.indexOf("91", cursor);
                    if (cursor + 13 <= len && (next91 === cursor + 13 || end === -1)) {
                        end = cursor + 13;
                    }
                    else if (next91 !== -1) {
                        end = next91;
                    }
                    else {
                        end = len;
                    }
                }
                parsedAIs["21"] = normalized.slice(cursor, end);
                cursor = end;
                continue;
            }
            // AI (91): Crypto Key - exactly 4 characters
            if (normalized.startsWith("91", cursor)) {
                cursor += 2;
                let end = normalized.indexOf(GS1_GROUP_SEPARATOR, cursor);
                if (end === -1 || end > cursor + 4) {
                    end = Math.min(cursor + 4, len);
                }
                parsedAIs["91"] = normalized.slice(cursor, end);
                cursor = end;
                continue;
            }
            // AI (92): Crypto Signature - 44 characters (Base64)
            if (normalized.startsWith("92", cursor)) {
                cursor += 2;
                let end = normalized.indexOf(GS1_GROUP_SEPARATOR, cursor);
                if (end === -1) {
                    end = Math.min(cursor + 44, len);
                }
                parsedAIs["92"] = normalized.slice(cursor, end);
                cursor = end;
                continue;
            }
            // AI (10): Lot / Batch Number - variable length up to 20 chars
            if (normalized.startsWith("10", cursor)) {
                cursor += 2;
                let end = normalized.indexOf(GS1_GROUP_SEPARATOR, cursor);
                if (end === -1) {
                    end = Math.min(cursor + 20, len);
                }
                parsedAIs["10"] = normalized.slice(cursor, end);
                cursor = end;
                continue;
            }
            // AI (240): Additional Identification
            if (normalized.startsWith("240", cursor)) {
                cursor += 3;
                let end = normalized.indexOf(GS1_GROUP_SEPARATOR, cursor);
                if (end === -1)
                    end = len;
                parsedAIs["240"] = normalized.slice(cursor, end);
                cursor = end;
                continue;
            }
            // Fallback: advance cursor by 1 if unparsed character
            cursor++;
        }
    }
    // Mode 3: Plain concatenated 85-char Fixed Layout Fallback
    if (!parsedAIs["01"] || !parsedAIs["21"]) {
        const cleanFixed = normalized.replace(new RegExp(GS1_GROUP_SEPARATOR, "g"), "");
        if (cleanFixed.length >= 85 && cleanFixed.startsWith("01")) {
            const candidateGtin = cleanFixed.slice(2, 16);
            if (/^\d{14}$/.test(candidateGtin) && cleanFixed.slice(16, 18) === "21") {
                parsedAIs["01"] = candidateGtin;
                parsedAIs["21"] = cleanFixed.slice(18, 31);
                if (cleanFixed.slice(31, 33) === "91") {
                    parsedAIs["91"] = cleanFixed.slice(33, 37);
                    if (cleanFixed.slice(37, 39) === "92") {
                        parsedAIs["92"] = cleanFixed.slice(39, 83);
                    }
                }
            }
        }
    }
    // Extraction and Field Validation
    const gtin = parsedAIs["01"] ?? "";
    const serialNumber = parsedAIs["21"] ?? "";
    const cryptoKey = parsedAIs["91"] ?? "";
    const cryptoSignature = parsedAIs["92"] ?? "";
    const expirationDateRaw = parsedAIs["17"] ?? null;
    const series = parsedAIs["10"] ?? null;
    const lot = series;
    // SGTIN: GTIN (14 digits) + Serial Number
    const sgtin = gtin && serialNumber ? `${gtin}${serialNumber}` : "";
    // 1. GTIN validation
    let isValidGtin = false;
    if (!gtin) {
        errors.push("Отсутствует обязательный идентификатор (01) GTIN.");
    }
    else if (!/^\d{14}$/.test(gtin)) {
        errors.push(`Неверный формат GTIN: "${gtin}". Должно быть 14 цифр.`);
    }
    else {
        isValidGtin = isValidGtinChecksum(gtin);
        if (!isValidGtin) {
            errors.push(`Неверная контрольная сумма GTIN (Modulo 10 checksum mismatch) для "${gtin}".`);
        }
    }
    // 2. Serial Number validation
    if (!serialNumber) {
        errors.push("Отсутствует обязательный идентификатор (21) серийного номера.");
    }
    else if (serialNumber.length < 5 || serialNumber.length > 20) {
        warnings.push(`Нестандартная длина серийного номера (${serialNumber.length} симв.). Для МДЛП стандартно 13 симв.`);
    }
    // 3. Crypto key & signature validation
    if (!cryptoKey) {
        warnings.push("Отсутствует криптоключ проверки (AI 91). Возможен сбой считывания.");
    }
    else if (cryptoKey.length !== 4) {
        warnings.push(`Нестандартная длина криптоключа AI (91): ${cryptoKey.length} симв. (ожидалось 4).`);
    }
    if (!cryptoSignature) {
        warnings.push("Отсутствует криптохвост/подпись (AI 92). Требуется проверка источника.");
    }
    else if (cryptoSignature.length !== 44) {
        warnings.push(`Нестандартная длина подписи AI (92): ${cryptoSignature.length} симв. (ожидалось 44).`);
    }
    // 4. Expiration date
    const expiryResult = parseMdlpExpirationDate(expirationDateRaw, referenceDate);
    if (expiryResult.error) {
        warnings.push(expiryResult.error);
    }
    if (expiryResult.isExpired) {
        warnings.push(`Внимание! Срок годности препарата истек: ${expiryResult.isoDate}. Запрещено к списанию.`);
    }
    else if (expiryResult.isExpiringSoon) {
        warnings.push(`Предупреждение: Срок годности истекает менее чем через 90 дней (${expiryResult.isoDate}).`);
    }
    // 5. Drug recognition
    const recognizedDrug = gtin ? recognizeDentalMedication(gtin) : null;
    const isValid = errors.length === 0 && isValidGtin && Boolean(serialNumber);
    return {
        rawBarcode: rawInput,
        gtin,
        serialNumber,
        cryptoKey,
        cryptoSignature,
        sgtin,
        expirationDate: expiryResult.isoDate,
        expirationDateRaw,
        series,
        lot,
        isValidGtinChecksum: isValidGtin,
        isExpired: expiryResult.isExpired,
        daysUntilExpiration: expiryResult.daysUntilExpiration,
        isExpiringSoon: expiryResult.isExpiringSoon,
        recognizedDrug,
        parsedAIs,
        errors,
        warnings,
        isValid,
    };
}
/**
 * Returns a human-friendly formatted representation of a GS1 DataMatrix string.
 */
export function formatDataMatrixForDisplay(barcode) {
    const parsed = parseMdlpDataMatrix(barcode);
    if (!parsed.isValid)
        return barcode;
    const parts = [];
    if (parsed.gtin)
        parts.push(`(01)${parsed.gtin}`);
    if (parsed.serialNumber)
        parts.push(`(21)${parsed.serialNumber}`);
    if (parsed.expirationDateRaw)
        parts.push(`(17)${parsed.expirationDateRaw}`);
    if (parsed.series)
        parts.push(`(10)${parsed.series}`);
    if (parsed.cryptoKey)
        parts.push(`(91)${parsed.cryptoKey}`);
    if (parsed.cryptoSignature)
        parts.push(`(92)${parsed.cryptoSignature.slice(0, 8)}...`);
    return parts.join(" ");
}
/**
 * Gracefully parses a GS1 DataMatrix barcode without throwing unhandled exceptions.
 * Returns a typed Result pattern with the parsed metadata and diagnostic errors.
 */
export function safeParseMdlpDataMatrix(rawInput, referenceDate = new Date()) {
    try {
        const parsed = parseMdlpDataMatrix(rawInput, referenceDate);
        if (parsed.isValid) {
            return { success: true, data: parsed };
        }
        const mainError = parsed.errors[0] || "Невалидный штрихкод маркировки";
        return {
            success: false,
            data: parsed,
            error: mainError,
            errors: parsed.errors,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Неизвестная ошибка разбора штрихкода";
        const fallbackData = {
            rawBarcode: typeof rawInput === "string" ? rawInput : "",
            gtin: "",
            serialNumber: "",
            cryptoKey: "",
            cryptoSignature: "",
            sgtin: "",
            expirationDate: null,
            expirationDateRaw: null,
            series: null,
            lot: null,
            isValidGtinChecksum: false,
            isExpired: false,
            daysUntilExpiration: null,
            isExpiringSoon: false,
            recognizedDrug: null,
            parsedAIs: {},
            errors: [message],
            warnings: [],
            isValid: false,
        };
        return {
            success: false,
            data: fallbackData,
            error: message,
            errors: [message],
        };
    }
}
export const parseGs1DataMatrix = parseMdlpDataMatrix;
