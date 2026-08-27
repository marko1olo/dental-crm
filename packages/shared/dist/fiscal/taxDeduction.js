/**
 * DENTE Dental CRM — Tax Deduction Engine (Справка для налогового вычета КНД 1151156 & Реестр ФНС КНД 1184043).
 *
 * Fully compliant with:
 * - Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156 / 1184043, Формат 5.01)
 * - Приказ Минздрава России от 13.10.2017 № 804н (Номенклатура медицинских услуг)
 * - Постановление Правительства РФ от 08.04.2020 № 458 (Перечень дорогостоящих видов лечения)
 * - Налоговый кодекс РФ (ст. 219 НК РФ: годовой лимит 150 000 ₽ для Кода 01 с 2024 года, без ограничений для Кода 02)
 */
import { generateQrCodeSvg, generateQrCodeDataUri } from "./qrGenerator.js";
import { escapeXml } from "../cda/c14n.js";
import { kopecksToRub } from "./kopecksArithmetic.js";
/**
 * Нормативные константы регламента ФНС России № ЕА-7-11/824@
 */
export const FNS_ORDER_824_NAME = "Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@";
export const KND_CERTIFICATE_FORM = "1151156";
export const KND_REGISTRY_ELECTRONIC_FORMAT = "1184043";
export const FNS_FORMAT_VERSION_501 = "5.01";
/**
 * Годовой лимит социального налогового вычета по обычному лечению (Код 01)
 * - С 01.01.2024: 150 000 ₽ (ст. 219 НК РФ в ред. Федерального закона от 28.04.2023 № 159-ФЗ)
 * - До 01.01.2024: 120 000 ₽
 */
export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 = 150000;
export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024 = 120000;
export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024;
export const TAX_DEDUCTION_RELATIONSHIP_MAP = {
    patient: {
        code: "1",
        labelRu: "Пациент (сам налогоплательщик)",
        shortLabelRu: "Лично (пациент)",
        samePatientFlag: "1",
    },
    spouse: {
        code: "2",
        labelRu: "Супруг / Супруга налогоплательщика",
        shortLabelRu: "Супруг(а)",
        samePatientFlag: "0",
    },
    parent: {
        code: "3",
        labelRu: "Родитель (мать / отец) налогоплательщика",
        shortLabelRu: "Родитель",
        samePatientFlag: "0",
    },
    child: {
        code: "4",
        labelRu: "Ребенок / подопечный (до 18/24 лет при очном обучении)",
        shortLabelRu: "Ребенок",
        samePatientFlag: "0",
    },
};
/**
 * Валидация 10-значного (ЮЛ) и 12-значного (ФЛ/ИП) российского ИНН по контрольным суммам ФНС.
 */
export function validateRussianInn(inn) {
    if (!inn || typeof inn !== "string") {
        return { isValid: false, errorMessageRu: "ИНН не указан" };
    }
    const cleaned = inn.trim().replace(/[\s\-_]/g, "");
    if (!/^\d+$/.test(cleaned)) {
        return { isValid: false, errorMessageRu: "ИНН должен состоять только из цифр" };
    }
    // Запрет на фиктивные ИНН из всех нулей
    if (/^0+$/.test(cleaned)) {
        return { isValid: false, errorMessageRu: "ИНН не может состоять только из нулей" };
    }
    // 10-значный ИНН (Юридические лица)
    if (cleaned.length === 10) {
        const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
        const checkDigit = weights.reduce((sum, w, i) => sum + w * Number.parseInt(cleaned[i], 10), 0) % 11 % 10;
        const isValid = checkDigit === Number.parseInt(cleaned[9], 10);
        return isValid
            ? { isValid: true }
            : { isValid: false, errorMessageRu: "Неверная контрольная сумма 10-значного ИНН организации" };
    }
    // 12-значный ИНН (Физические лица / ИП)
    if (cleaned.length === 12) {
        const weights11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
        const checkDigit11 = weights11.reduce((sum, w, i) => sum + w * Number.parseInt(cleaned[i], 10), 0) % 11 % 10;
        const weights12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
        const checkDigit12 = weights12.reduce((sum, w, i) => sum + w * Number.parseInt(cleaned[i], 10), 0) % 11 % 10;
        const isValid = checkDigit11 === Number.parseInt(cleaned[10], 10) &&
            checkDigit12 === Number.parseInt(cleaned[11], 10);
        return isValid
            ? { isValid: true }
            : { isValid: false, errorMessageRu: "Неверная контрольная сумма 12-значного ИНН налогоплательщика" };
    }
    return { isValid: false, errorMessageRu: "ИНН должен содержать 10 цифр (для клиники) или 12 цифр (для физлица)" };
}
/**
 * Валидация 9-значного КПП российской организации.
 */
export function validateRussianKpp(kpp) {
    const trimmed = kpp.trim();
    if (!trimmed) {
        return { isValid: false, errorMessageRu: "КПП не указан" };
    }
    if (!/^[0-9]{4}[0-9A-Z]{2}[0-9]{3}$/.test(trimmed)) {
        return { isValid: false, errorMessageRu: "КПП должен содержать 9 символов формата 770101001" };
    }
    return { isValid: true };
}
/**
 * Валидация 13-значного ОГРН юридического лица или 15-значного ОГРНИП.
 */
export function validateRussianOgrn(ogrn) {
    const clean = ogrn.replace(/\D/g, "");
    if (clean.length === 13) {
        // ОГРН ЮЛ: остаток от деления 12-значного числа на 11, младший разряд равен 13-й цифре
        const num12 = BigInt(clean.slice(0, 12));
        const checkDigit = Number(num12 % 11n % 10n);
        const isValid = checkDigit === Number(clean[12]);
        return isValid
            ? { isValid: true }
            : { isValid: false, errorMessageRu: "Неверная контрольная сумма 13-значного ОГРН организации" };
    }
    if (clean.length === 15) {
        // ОГРНИП: остаток от деления 14-значного числа на 13, младший разряд равен 15-й цифре
        const num14 = BigInt(clean.slice(0, 14));
        const checkDigit = Number(num14 % 13n % 10n);
        const isValid = checkDigit === Number(clean[14]);
        return isValid
            ? { isValid: true }
            : { isValid: false, errorMessageRu: "Неверная контрольная сумма 15-значного ОГРНИП" };
    }
    return { isValid: false, errorMessageRu: "ОГРН должен содержать 13 цифр (ЮЛ) или 15 цифр (ОГРНИП)" };
}
/**
 * Валидация 11-значного СНИЛС по контрольным суммам ПФР / СФР.
 */
export function validateRussianSnils(snils) {
    const clean = snils.replace(/\D/g, "");
    if (clean.length !== 11) {
        return { isValid: false, errorMessageRu: "СНИЛС должен содержать 11 цифр (XXX-XXX-XXX YY)" };
    }
    // СНИЛС до 001-001-998 не проверяется по контрольной сумме
    const num = Number.parseInt(clean.slice(0, 9), 10);
    if (num <= 1001998) {
        const norm = `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)} ${clean.slice(9)}`;
        return { isValid: true, normalized: norm };
    }
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += Number.parseInt(clean[i], 10) * (9 - i);
    }
    let checkDigit = 0;
    if (sum < 100) {
        checkDigit = sum;
    }
    else if (sum === 100 || sum === 101) {
        checkDigit = 0;
    }
    else {
        const rem = sum % 101;
        checkDigit = rem === 100 || rem === 101 ? 0 : rem;
    }
    const expectedCheck = Number.parseInt(clean.slice(9), 10);
    if (checkDigit === expectedCheck) {
        const norm = `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)} ${clean.slice(9)}`;
        return { isValid: true, normalized: norm };
    }
    return { isValid: false, errorMessageRu: "Неверная контрольная сумма СНИЛС" };
}
/**
 * Валидация паспортных данных РФ (серия 4 цифры, номер 6 цифр).
 */
export function validateRussianPassport(docNumber) {
    const clean = docNumber.replace(/\D/g, "");
    if (clean.length === 10) {
        const series = clean.slice(0, 4);
        const number = clean.slice(4);
        return { isValid: true, normalized: `${series} ${number}` };
    }
    if (clean.length === 0) {
        return { isValid: false, errorMessageRu: "Паспортные данные не указаны" };
    }
    return { isValid: false, errorMessageRu: "Серия и номер паспорта РФ должны содержать 10 цифр (4 серия + 6 номер)" };
}
/**
 * Номенклатура Минздрава 804н — Коды дорогостоящих медицинских услуг (Код 02)
 * согласно Перечню Постановления Правительства РФ от 08.04.2020 № 458.
 */
export const EXPENSIVE_TREATMENT_804N_CODES = [
    // Дентальная имплантация
    "A16.07.054", // Внутрикостная дентальная имплантация
    "A16.07.054.001", // Внутрикостная дентальная имплантация системы имплантатов
    "A16.07.054.002", // Установка мини-имплантата ортодонтического
    "A16.07.054.003", // Базальная имплантация
    "A16.07.054.004", // Скуловая имплантация (Zygoma)
    "A16.07.054.005", // Установка формирователя десны
    "A16.07.054.006", // Установка индивидуального абатмента
    // Костная пластика и остеопластика челюстно-лицевой области
    "A16.07.041", // Костная пластика челюстно-лицевой области
    "A16.07.041.001", // Костная пластика с использованием титановых сеток и мембран
    "A16.07.041.002", // Синус-лифтинг (субантральная аугментация, закрытый)
    "A16.07.041.003", // Синус-лифтинг (открытый)
    // Пластика альвеолярного отростка
    "A16.07.040", // Пластика альвеолярного отростка
    "A16.07.040.001", // Аугментация альвеолярного гребня костным блоком
    "A16.07.040.002", // Пластика мягких тканей в области дентального имплантата
    // Реконструктивные операции на альвеолярной дуге и челюстях
    "A16.07.055", // Реконструктивные операции на альвеолярной дуге
    "A16.07.055.001", // Остеотомия и реконструкция верхней/нижней челюсти
    "A16.07.055.002", // Реконструкция альвеолярного отростка с остеотомией
    "A16.07.096", // Расщепление альвеолярного гребня (split-crest)
    "A16.07.097", // Транспозиция нижнелуночкового нерва при имплантации
];
/**
 * Определение кода медицинской услуги для налогового вычета (Код 01 vs Код 02)
 * по Номенклатуре Минздрава 804н и клиническому наименованию процедуры.
 */
export function resolveTaxDeductionCategoryShared(code804n, serviceName) {
    if (code804n) {
        const trimmedCode = code804n.trim();
        if (EXPENSIVE_TREATMENT_804N_CODES.includes(trimmedCode)) {
            return "2";
        }
        // Проверка по префиксам имплантации/костной пластики
        if (trimmedCode.startsWith("A16.07.054") ||
            trimmedCode.startsWith("A16.07.041") ||
            trimmedCode.startsWith("A16.07.055") ||
            trimmedCode.startsWith("A16.07.096")) {
            return "2";
        }
    }
    if (serviceName) {
        const lower = serviceName.toLowerCase();
        if (lower.includes("имплант") ||
            lower.includes("имплантат") ||
            lower.includes("имплантац") ||
            lower.includes("синус-лифтинг") ||
            lower.includes("синуслифтинг") ||
            lower.includes("субантральн") ||
            lower.includes("костная пластика") ||
            lower.includes("остеопластик") ||
            lower.includes("аугментация") ||
            lower.includes("расщепление гребня") ||
            lower.includes("реконструкция челюсти") ||
            lower.includes("костный трансплантат") ||
            lower.includes("костный блок") ||
            lower.includes("мембрана bio-gide") ||
            lower.includes("bio-oss") ||
            lower.includes("all-on-4") ||
            lower.includes("all-on-6") ||
            lower.includes("all-on-x") ||
            lower.includes("trefoil") ||
            lower.includes("zygoma") ||
            lower.includes("скулов")) {
            return "2";
        }
    }
    return "1";
}
/**
 * Расчет сумм по годам и категориям вычета (Код 01 / Код 02) с копеечной точностью.
 */
export function calculateTaxDeductionSummary(payments) {
    const yearMap = new Map();
    for (const p of payments) {
        const year = new Date(p.dateIso).getFullYear();
        const cat = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
        const amountKop = Number.isFinite(p.amountRub) ? Math.max(0, Math.round(p.amountRub * 100)) : 0;
        const current = yearMap.get(year) || { code01Kop: 0, code02Kop: 0, count: 0 };
        if (cat === "2") {
            current.code02Kop += amountKop;
        }
        else {
            current.code01Kop += amountKop;
        }
        current.count += 1;
        yearMap.set(year, current);
    }
    const yearsSummary = Array.from(yearMap.entries())
        .sort(([yA], [yB]) => yB - yA)
        .map(([taxYear, data]) => {
        const code01Rub = kopecksToRub(data.code01Kop);
        const code02Rub = kopecksToRub(data.code02Kop);
        const totalKopecks = data.code01Kop + data.code02Kop;
        const totalRub = kopecksToRub(totalKopecks);
        // Лимит социального вычета: 150 000 ₽ с 2024 года, 120 000 ₽ до 2024 года
        const statutoryLimit = taxYear >= 2024 ? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 : ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;
        const code01Eligible = Math.min(code01Rub, statutoryLimit);
        // Расчетный возврат 13% и 15% (по Коду 01 с лимитом, по Коду 02 без ограничений)
        const refund13 = Math.round((code01Eligible * 0.13 + code02Rub * 0.13) * 100) / 100;
        const refund15 = Math.round((code01Eligible * 0.15 + code02Rub * 0.15) * 100) / 100;
        return {
            taxYear,
            code01Rub,
            code01Kopecks: data.code01Kop,
            code02Rub,
            code02Kopecks: data.code02Kop,
            totalRub,
            totalKopecks,
            receiptsCount: data.count,
            code01StatutoryLimitRub: statutoryLimit,
            code01EligibleRub: code01Eligible,
            refund13EstimateRub: refund13,
            refund15EstimateRub: refund15,
        };
    });
    let grandTotalCode01Kopecks = 0;
    let grandTotalCode02Kopecks = 0;
    let grandTotalRefund13Rub = 0;
    let grandTotalRefund15Rub = 0;
    let totalReceiptsCount = 0;
    for (const y of yearsSummary) {
        grandTotalCode01Kopecks += y.code01Kopecks;
        grandTotalCode02Kopecks += y.code02Kopecks;
        grandTotalRefund13Rub += y.refund13EstimateRub;
        grandTotalRefund15Rub += y.refund15EstimateRub;
        totalReceiptsCount += y.receiptsCount;
    }
    const grandTotalKopecks = grandTotalCode01Kopecks + grandTotalCode02Kopecks;
    return {
        yearsSummary,
        grandTotalCode01Rub: kopecksToRub(grandTotalCode01Kopecks),
        grandTotalCode01Kopecks,
        grandTotalCode02Rub: kopecksToRub(grandTotalCode02Kopecks),
        grandTotalCode02Kopecks,
        grandTotalRub: kopecksToRub(grandTotalKopecks),
        grandTotalKopecks,
        grandTotalRefund13Rub: Math.round(grandTotalRefund13Rub * 100) / 100,
        grandTotalRefund15Rub: Math.round(grandTotalRefund15Rub * 100) / 100,
        totalReceiptsCount,
        totalAmountInWordsRu: amountToWordsRu(grandTotalKopecks),
    };
}
/**
 * Перевод суммы в копейках в официальную сумму прописью на русском языке.
 * Пример: 15432050 -> "Сто пятьдесят четыре тысячи триста двадцать рублей 50 копеек"
 */
export function amountToWordsRu(kopecks) {
    if (kopecks <= 0 || !Number.isFinite(kopecks))
        return "Ноль рублей 00 копеек";
    const rub = Math.floor(kopecks / 100);
    const kop = Math.abs(kopecks % 100);
    const unitsM = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
    const unitsF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
    const teens = [
        "десять",
        "одиннадцать",
        "двенадцать",
        "тринадцать",
        "четырнадцать",
        "пятнадцать",
        "шестнадцать",
        "семнадцать",
        "восемнадцать",
        "девятнадцать",
    ];
    const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
    const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];
    function tripletToWords(n, isFemale) {
        const h = Math.floor(n / 100);
        const rem = n % 100;
        const t = Math.floor(rem / 10);
        const u = rem % 10;
        const parts = [];
        if (h > 0)
            parts.push(hundreds[h]);
        if (rem >= 10 && rem <= 19) {
            parts.push(teens[rem - 10]);
        }
        else {
            if (t > 0)
                parts.push(tens[t]);
            if (u > 0)
                parts.push(isFemale ? unitsF[u] : unitsM[u]);
        }
        return parts.join(" ");
    }
    function getDeclension(n, form1, form2, form5) {
        const rem100 = Math.abs(n) % 100;
        const rem10 = rem100 % 10;
        if (rem100 >= 11 && rem100 <= 19)
            return form5;
        if (rem10 === 1)
            return form1;
        if (rem10 >= 2 && rem10 <= 4)
            return form2;
        return form5;
    }
    const parts = [];
    // Миллионы
    const millions = Math.floor(rub / 1000000);
    if (millions > 0) {
        const mStr = tripletToWords(millions, false);
        const decl = getDeclension(millions, "миллион", "миллиона", "миллионов");
        parts.push(`${mStr} ${decl}`);
    }
    // Тысячи
    const thousands = Math.floor((rub % 1000000) / 1000);
    if (thousands > 0) {
        const thStr = tripletToWords(thousands, true);
        const decl = getDeclension(thousands, "тысяча", "тысячи", "тысяч");
        parts.push(`${thStr} ${decl}`);
    }
    // Единицы рублей
    const unitsRub = rub % 1000;
    if (unitsRub > 0) {
        const uStr = tripletToWords(unitsRub, false);
        const decl = getDeclension(unitsRub, "рубль", "рубля", "рублей");
        parts.push(`${uStr} ${decl}`);
    }
    else if (parts.length === 0) {
        parts.push("ноль рублей");
    }
    else {
        const decl = getDeclension(rub, "рубль", "рубля", "рублей");
        parts.push(decl);
    }
    const rubText = parts.join(" ").trim();
    const capitalizedRub = rubText.charAt(0).toUpperCase() + rubText.slice(1);
    const kopStr = kop.toString().padStart(2, "0");
    const kopDecl = getDeclension(kop, "копейка", "копейки", "копеек");
    return `${capitalizedRub} ${kopStr} ${kopDecl}`;
}
/**
 * Генерация верификационного QR-кода для справки КНД 1151156 (Приказ 824@).
 * Содержит верификационный URL или структурированный payload для проверки налоговым инспектором.
 */
export function generateTaxCertificateQrPayload(params) {
    const summary = calculateTaxDeductionSummary(params.payments);
    const targetYear = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
        code01Kopecks: 0,
        code02Kopecks: 0,
        totalKopecks: 0,
    };
    const code01Str = (targetYear.code01Kopecks / 100).toFixed(2);
    const code02Str = (targetYear.code02Kopecks / 100).toFixed(2);
    const totalStr = (targetYear.totalKopecks / 100).toFixed(2);
    const issueDate = params.issueDateIso.slice(0, 10);
    // Официальный верификационный URI для налогового инспектора и ЛК ФНС
    return `https://lkfl2.nalog.ru/lkfl/deduction/verify?knd=1151156&inn=${encodeURIComponent(params.clinic.inn)}&cert=${encodeURIComponent(params.certificateNumber)}&date=${issueDate}&year=${params.taxYear}&payerInn=${encodeURIComponent(params.payer.inn || "")}&c1=${code01Str}&c2=${code02Str}&sum=${totalStr}`;
}
/**
 * Генерация SVG строки QR-кода верификации справки КНД 1151156.
 */
export function generateTaxCertificateQrSvg(params, options = {}) {
    const payload = generateTaxCertificateQrPayload(params);
    return generateQrCodeSvg(payload, {
        size: options.size ?? 120,
        margin: options.margin ?? 2,
        title: options.title ?? `Справка КНД 1151156 № ${params.certificateNumber}`,
        ...options,
    });
}
/**
 * Генерация base64 Data-URI QR-кода верификации справки КНД 1151156.
 */
export function generateTaxCertificateQrDataUri(params, options = {}) {
    const payload = generateTaxCertificateQrPayload(params);
    return generateQrCodeDataUri(payload, {
        size: options.size ?? 120,
        margin: options.margin ?? 2,
        ...options,
    });
}
/**
 * Генерация официального XML-файла реестра сведений для прямой отправки в ФНС по ТКС
 * (Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@, КНД 1184043, Формат 5.01).
 */
export function generateFnsTaxDeductionXml(params) {
    const summary = calculateTaxDeductionSummary(params.payments);
    const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
        code01Rub: 0,
        code01Kopecks: 0,
        code02Rub: 0,
        code02Kopecks: 0,
        totalRub: 0,
        totalKopecks: 0,
    };
    const relationshipInfo = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship];
    const samePatientFlag = relationshipInfo.samePatientFlag;
    const taxOfficeCode = (params.taxOfficeCode || "7701").trim();
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.random().toString(36).slice(2, 10).toUpperCase();
    // Формат ИдФайл по Приказу 824@: VO_SPRRECH_КодНО_ИНН_ГГГГММДД_GUID
    const safeTaxOffice = taxOfficeCode.replace(/[^A-Za-z0-9]/g, "");
    const safeInn = String(params.clinic.inn || "").replace(/[^0-9]/g, "");
    const safeKpp = params.clinic.kpp ? `_${String(params.clinic.kpp).replace(/[^A-Za-z0-9]/g, "")}` : "";
    const clinicId = `${safeInn}${safeKpp}`;
    const fileId = `VO_SPRRECH_${safeTaxOffice}_${clinicId}_${dateStamp}_${randomSuffix}`;
    const fileName = `${fileId}.xml`;
    const code01Str = (targetYearSummary.code01Kopecks / 100).toFixed(2);
    const code02Str = (targetYearSummary.code02Kopecks / 100).toFixed(2);
    const totalStr = (targetYearSummary.totalKopecks / 100).toFixed(2);
    const issueDateFormatted = formatDateToRussian(params.issueDateIso);
    const payerBirthDateFormatted = params.payer.birthDate ? formatDateToRussian(params.payer.birthDate) : "";
    const patientBirthDateFormatted = params.patient.birthDate ? formatDateToRussian(params.patient.birthDate) : "";
    const signerType = params.signer?.signerType || "1";
    const signerName = params.signer?.fullName || params.clinic.chiefDoctorName || "Главный врач";
    // Чеки по 54-ФЗ за отчетный год
    const yearPayments = params.payments.filter((p) => new Date(p.dateIso).getFullYear() === params.taxYear);
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${escapeXml(fileId)}" ВерсПрог="DENTE Dental CRM 2.0" ВерсФорм="${escapeXml(FNS_FORMAT_VERSION_501)}">
  <Документ КНД="${escapeXml(KND_REGISTRY_ELECTRONIC_FORMAT)}" КодНО="${escapeXml(taxOfficeCode)}" ОтчГод="${escapeXml(String(params.taxYear))}" НомКорр="0" ПоПруч="1">
    <СвНП ИННЮЛ="${escapeXml(params.clinic.inn)}" КПП="${escapeXml(params.clinic.kpp || "770101001")}" НаимОрг="${escapeXml(params.clinic.legalName)}" ОГРН="${escapeXml(params.clinic.ogrn || "")}">
      <Лицензия Номер="${escapeXml(params.clinic.licenseNumber || "")}" Дата="${escapeXml(params.clinic.licenseDate || "")}" />
    </СвНП>
    <Подписант ПрПодп="${escapeXml(signerType)}" ФИО="${escapeXml(signerName)}"${params.signer?.authorityDoc ? ` ДокумПодтв="${escapeXml(params.signer.authorityDoc)}"` : ""} />
    <СведРасхУсл НомерСвед="${escapeXml(params.certificateNumber)}" ДатаСвед="${escapeXml(issueDateFormatted)}" НомКорр="0" ПрПациент="${escapeXml(samePatientFlag)}">
      <НППлатМедУсл ФИО="${escapeXml(params.payer.fullName)}"${params.payer.inn ? ` ИННФЛ="${escapeXml(params.payer.inn)}"` : ""}${payerBirthDateFormatted ? ` ДатаРожд="${escapeXml(payerBirthDateFormatted)}"` : ""}>
        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml((params.payer.identityDocumentSeries || "") + " " + (params.payer.identityDocumentNumber || "")).trim()}" />
      </НППлатМедУсл>
      ${samePatientFlag === "0"
        ? `<Пациент ФИО="${escapeXml(params.patient.fullName)}"${patientBirthDateFormatted ? ` ДатаРожд="${escapeXml(patientBirthDateFormatted)}"` : ""}${params.patient.inn ? ` ИННФЛ="${escapeXml(params.patient.inn)}"` : ""} КодРодств="${escapeXml(relationshipInfo.code)}" />`
        : ""}
      <СуммаРасх ${targetYearSummary.code01Kopecks > 0 ? `СуммаКод1="${code01Str}"` : ""} ${targetYearSummary.code02Kopecks > 0 ? `СуммаКод2="${code02Str}"` : ""} СуммаВсего="${totalStr}">
        ${yearPayments
        .map((pay, idx) => `<ТаблРасх НомЧек="${idx + 1}" НомФД="${escapeXml(pay.fiscalDocumentNumber || String(idx + 1))}" ФПД="${escapeXml(pay.fiscalSign || "")}" ДатаВремяЧек="${escapeXml(pay.dateIso.slice(0, 10))}" СуммаЧек="${pay.amountRub.toFixed(2)}" КодУсл="${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}" />`)
        .join("\n        ")}
      </СуммаРасх>
    </СведРасхУсл>
  </Документ>
</Файл>`;
    return { fileName, fileId, xmlContent };
}
/**
 * Генерация пакетного XML-реестра сведений по нескольким справкам для прямой загрузки через ТКС
 * (Контур.Экстерн, СБИС, 1С-Отчетность, Такском, Калуга Астрал).
 */
export function generateFnsTaxDeductionBatchXml(batch) {
    const taxOfficeCode = (batch.taxOfficeCode || "7701").trim();
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.random().toString(36).slice(2, 10).toUpperCase();
    const safeTaxOffice = taxOfficeCode.replace(/[^A-Za-z0-9]/g, "");
    const safeInn = String(batch.clinic.inn || "").replace(/[^0-9]/g, "");
    const safeKpp = batch.clinic.kpp ? `_${String(batch.clinic.kpp).replace(/[^A-Za-z0-9]/g, "")}` : "";
    const clinicId = `${safeInn}${safeKpp}`;
    const fileId = `VO_SPRRECH_${safeTaxOffice}_${clinicId}_${dateStamp}_${randomSuffix}`;
    const fileName = `${fileId}.xml`;
    const signerType = batch.signer?.signerType || "1";
    const signerName = batch.signer?.fullName || batch.clinic.chiefDoctorName || "Главный врач";
    const recordsXml = batch.certificates
        .map((cert) => {
        const summary = calculateTaxDeductionSummary(cert.payments);
        const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === batch.taxYear) || {
            code01Rub: 0,
            code01Kopecks: 0,
            code02Rub: 0,
            code02Kopecks: 0,
            totalRub: 0,
            totalKopecks: 0,
        };
        const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[cert.payer.relationship];
        const code01Str = (targetYearSummary.code01Kopecks / 100).toFixed(2);
        const code02Str = (targetYearSummary.code02Kopecks / 100).toFixed(2);
        const totalStr = (targetYearSummary.totalKopecks / 100).toFixed(2);
        const issueDateFormatted = formatDateToRussian(cert.issueDateIso);
        const payerBday = cert.payer.birthDate ? formatDateToRussian(cert.payer.birthDate) : "";
        const patientBday = cert.patient.birthDate ? formatDateToRussian(cert.patient.birthDate) : "";
        const yearPayments = cert.payments.filter((p) => new Date(p.dateIso).getFullYear() === batch.taxYear);
        return `    <СведРасхУсл НомерСвед="${escapeXml(cert.certificateNumber)}" ДатаСвед="${escapeXml(issueDateFormatted)}" НомКорр="0" ПрПациент="${escapeXml(rel.samePatientFlag)}">
      <НППлатМедУсл ФИО="${escapeXml(cert.payer.fullName)}"${cert.payer.inn ? ` ИННФЛ="${escapeXml(cert.payer.inn)}"` : ""}${payerBday ? ` ДатаРожд="${escapeXml(payerBday)}"` : ""}>
        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml((cert.payer.identityDocumentSeries || "") + " " + (cert.payer.identityDocumentNumber || "")).trim()}" />
      </НППлатМедУсл>
      ${rel.samePatientFlag === "0"
            ? `<Пациент ФИО="${escapeXml(cert.patient.fullName)}"${patientBday ? ` ДатаРожд="${escapeXml(patientBday)}"` : ""}${cert.patient.inn ? ` ИННФЛ="${escapeXml(cert.patient.inn)}"` : ""} КодРодств="${escapeXml(rel.code)}" />`
            : ""}
      <СуммаРасх ${targetYearSummary.code01Kopecks > 0 ? `СуммаКод1="${code01Str}"` : ""} ${targetYearSummary.code02Kopecks > 0 ? `СуммаКод2="${code02Str}"` : ""} СуммаВсего="${totalStr}">
        ${yearPayments
            .map((pay, idx) => `<ТаблРасх НомЧек="${idx + 1}" НомФД="${escapeXml(pay.fiscalDocumentNumber || String(idx + 1))}" ФПД="${escapeXml(pay.fiscalSign || "")}" ДатаВремяЧек="${escapeXml(pay.dateIso.slice(0, 10))}" СуммаЧек="${pay.amountRub.toFixed(2)}" КодУсл="${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}" />`)
            .join("\n        ")}
      </СуммаРасх>
    </СведРасхУсл>`;
    })
        .join("\n");
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${escapeXml(fileId)}" ВерсПрог="DENTE Dental CRM 2.0" ВерсФорм="${escapeXml(FNS_FORMAT_VERSION_501)}">
  <Документ КНД="${escapeXml(KND_REGISTRY_ELECTRONIC_FORMAT)}" КодНО="${escapeXml(taxOfficeCode)}" ОтчГод="${escapeXml(String(batch.taxYear))}" НомКорр="0" ПоПруч="1">
    <СвНП ИННЮЛ="${escapeXml(batch.clinic.inn)}" КПП="${escapeXml(batch.clinic.kpp || "770101001")}" НаимОрг="${escapeXml(batch.clinic.legalName)}" ОГРН="${escapeXml(batch.clinic.ogrn || "")}">
      <Лицензия Номер="${escapeXml(batch.clinic.licenseNumber || "")}" Дата="${escapeXml(batch.clinic.licenseDate || "")}" />
    </СвНП>
    <Подписант ПрПодп="${escapeXml(signerType)}" ФИО="${escapeXml(signerName)}"${batch.signer?.authorityDoc ? ` ДокумПодтв="${escapeXml(batch.signer.authorityDoc)}"` : ""} />
${recordsXml}
  </Документ>
</Файл>`;
    return {
        fileName,
        fileId,
        certificatesCount: batch.certificates.length,
        xmlContent,
    };
}
function formatDateToRussian(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime()))
        return isoString.slice(0, 10);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear().toString();
    return `${day}.${month}.${year}`;
}
