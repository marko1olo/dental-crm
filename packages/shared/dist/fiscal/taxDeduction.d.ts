/**
 * DENTE Dental CRM — Tax Deduction Engine (Справка для налогового вычета КНД 1151156 & Реестр ФНС КНД 1184043).
 *
 * Fully compliant with:
 * - Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156 / 1184043, Формат 5.01)
 * - Приказ Минздрава России от 13.10.2017 № 804н (Номенклатура медицинских услуг)
 * - Постановление Правительства РФ от 08.04.2020 № 458 (Перечень дорогостоящих видов лечения)
 * - Налоговый кодекс РФ (ст. 219 НК РФ: годовой лимит 150 000 ₽ для Кода 01 с 2024 года, без ограничений для Кода 02)
 */
import { type QrSvgOptions } from "./qrGenerator.js";
/**
 * Нормативные константы регламента ФНС России № ЕА-7-11/824@
 */
export declare const FNS_ORDER_824_NAME = "\u041F\u0440\u0438\u043A\u0430\u0437 \u0424\u041D\u0421 \u0420\u043E\u0441\u0441\u0438\u0438 \u043E\u0442 08.11.2023 \u2116 \u0415\u0410-7-11/824@";
export declare const KND_CERTIFICATE_FORM = "1151156";
export declare const KND_REGISTRY_ELECTRONIC_FORMAT = "1184043";
export declare const FNS_FORMAT_VERSION_501 = "5.01";
/**
 * Годовой лимит социального налогового вычета по обычному лечению (Код 01)
 * - С 01.01.2024: 150 000 ₽ (ст. 219 НК РФ в ред. Федерального закона от 28.04.2023 № 159-ФЗ)
 * - До 01.01.2024: 120 000 ₽
 */
export declare const ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 = 150000;
export declare const ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024 = 120000;
export declare const ANNUAL_TAX_DEDUCTION_LIMIT_RUB = 150000;
/**
 * Коды родства налогоплательщика и пациента по Приказу ФНС № ЕА-7-11/824@ (КНД 1151156).
 */
export type TaxDeductionRelationship = "patient" | "spouse" | "parent" | "child";
export declare const TAX_DEDUCTION_RELATIONSHIP_MAP: Record<TaxDeductionRelationship, {
    code: string;
    labelRu: string;
    shortLabelRu: string;
    samePatientFlag: "1" | "0";
}>;
/**
 * Валидация 10-значного (ЮЛ) и 12-значного (ФЛ/ИП) российского ИНН по контрольным суммам ФНС.
 */
export declare function validateRussianInn(inn: unknown): {
    isValid: boolean;
    errorMessageRu?: string;
};
/**
 * Валидация 9-значного КПП российской организации.
 */
export declare function validateRussianKpp(kpp: string): {
    isValid: boolean;
    errorMessageRu?: string;
};
/**
 * Валидация 13-значного ОГРН юридического лица или 15-значного ОГРНИП.
 */
export declare function validateRussianOgrn(ogrn: string): {
    isValid: boolean;
    errorMessageRu?: string;
};
/**
 * Валидация 11-значного СНИЛС по контрольным суммам ПФР / СФР.
 */
export declare function validateRussianSnils(snils: string): {
    isValid: boolean;
    normalized?: string;
    errorMessageRu?: string;
};
/**
 * Валидация паспортных данных РФ (серия 4 цифры, номер 6 цифр).
 */
export declare function validateRussianPassport(docNumber: string): {
    isValid: boolean;
    normalized?: string;
    errorMessageRu?: string;
};
/**
 * Номенклатура Минздрава 804н — Коды дорогостоящих медицинских услуг (Код 02)
 * согласно Перечню Постановления Правительства РФ от 08.04.2020 № 458.
 */
export declare const EXPENSIVE_TREATMENT_804N_CODES: readonly string[];
/**
 * Определение кода медицинской услуги для налогового вычета (Код 01 vs Код 02)
 * по Номенклатуре Минздрава 804н и клиническому наименованию процедуры.
 */
export declare function resolveTaxDeductionCategoryShared(code804n?: string, serviceName?: string): "1" | "2";
export interface TaxDeductionPaymentItem {
    readonly id: string;
    readonly dateIso: string;
    readonly receiptNumber: string;
    readonly fiscalDocumentNumber: string;
    readonly fiscalSign: string;
    readonly serviceName: string;
    readonly code804n?: string | undefined;
    readonly amountRub: number;
    readonly taxCode?: "1" | "2" | undefined;
}
export interface TaxDeductionYearSummary {
    readonly taxYear: number;
    readonly code01Rub: number;
    readonly code01Kopecks: number;
    readonly code02Rub: number;
    readonly code02Kopecks: number;
    readonly totalRub: number;
    readonly totalKopecks: number;
    readonly receiptsCount: number;
    readonly code01StatutoryLimitRub: number;
    readonly code01EligibleRub: number;
    readonly refund13EstimateRub: number;
    readonly refund15EstimateRub: number;
}
export interface TaxDeductionCalculationResult {
    readonly yearsSummary: readonly TaxDeductionYearSummary[];
    readonly grandTotalCode01Rub: number;
    readonly grandTotalCode01Kopecks: number;
    readonly grandTotalCode02Rub: number;
    readonly grandTotalCode02Kopecks: number;
    readonly grandTotalRub: number;
    readonly grandTotalKopecks: number;
    readonly grandTotalRefund13Rub: number;
    readonly grandTotalRefund15Rub: number;
    readonly totalReceiptsCount: number;
    readonly totalAmountInWordsRu: string;
}
/**
 * Расчет сумм по годам и категориям вычета (Код 01 / Код 02) с копеечной точностью.
 */
export declare function calculateTaxDeductionSummary(payments: readonly TaxDeductionPaymentItem[]): TaxDeductionCalculationResult;
/**
 * Перевод суммы в копейках в официальную сумму прописью на русском языке.
 * Пример: 15432050 -> "Сто пятьдесят четыре тысячи триста двадцать рублей 50 копеек"
 */
export declare function amountToWordsRu(kopecks: number): string;
export interface TaxDeductionClinicParams {
    readonly legalName: string;
    readonly inn: string;
    readonly kpp?: string | undefined;
    readonly ogrn?: string | undefined;
    readonly licenseNumber?: string | undefined;
    readonly licenseDate?: string | undefined;
    readonly address: string;
    readonly chiefDoctorName?: string | undefined;
    readonly isSoleProprietor?: boolean | undefined;
}
export interface TaxDeductionPersonParams {
    readonly fullName: string;
    readonly inn?: string | undefined;
    readonly birthDate?: string | undefined;
    readonly identityDocumentSeries?: string | undefined;
    readonly identityDocumentNumber?: string | undefined;
    readonly identityDocumentIssuedBy?: string | undefined;
    readonly identityDocumentIssueDate?: string | undefined;
    readonly subdivisionCode?: string | undefined;
    readonly snils?: string | undefined;
}
export interface TaxDeductionCertificateParams {
    readonly certificateNumber: string;
    readonly issueDateIso: string;
    readonly taxYear: number;
    readonly taxOfficeCode?: string | undefined;
    readonly clinic: TaxDeductionClinicParams;
    readonly payer: TaxDeductionPersonParams & {
        readonly relationship: TaxDeductionRelationship;
    };
    readonly patient: TaxDeductionPersonParams;
    readonly payments: readonly TaxDeductionPaymentItem[];
    readonly signer?: {
        readonly signerType?: "1" | "2" | undefined;
        readonly fullName?: string | undefined;
        readonly authorityDoc?: string | undefined;
    } | undefined;
}
export interface TaxDeductionBatchParams {
    readonly batchId?: string | undefined;
    readonly taxYear: number;
    readonly taxOfficeCode: string;
    readonly clinic: TaxDeductionClinicParams;
    readonly certificates: readonly TaxDeductionCertificateParams[];
    readonly signer?: {
        readonly signerType?: "1" | "2" | undefined;
        readonly fullName?: string | undefined;
        readonly authorityDoc?: string | undefined;
    } | undefined;
}
/**
 * Генерация верификационного QR-кода для справки КНД 1151156 (Приказ 824@).
 * Содержит верификационный URL или структурированный payload для проверки налоговым инспектором.
 */
export declare function generateTaxCertificateQrPayload(params: TaxDeductionCertificateParams): string;
/**
 * Генерация SVG строки QR-кода верификации справки КНД 1151156.
 */
export declare function generateTaxCertificateQrSvg(params: TaxDeductionCertificateParams, options?: QrSvgOptions): string;
/**
 * Генерация base64 Data-URI QR-кода верификации справки КНД 1151156.
 */
export declare function generateTaxCertificateQrDataUri(params: TaxDeductionCertificateParams, options?: QrSvgOptions): string;
/**
 * Генерация официального XML-файла реестра сведений для прямой отправки в ФНС по ТКС
 * (Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@, КНД 1184043, Формат 5.01).
 */
export declare function generateFnsTaxDeductionXml(params: TaxDeductionCertificateParams): {
    fileName: string;
    fileId: string;
    xmlContent: string;
};
/**
 * Генерация пакетного XML-реестра сведений по нескольким справкам для прямой загрузки через ТКС
 * (Контур.Экстерн, СБИС, 1С-Отчетность, Такском, Калуга Астрал).
 */
export declare function generateFnsTaxDeductionBatchXml(batch: TaxDeductionBatchParams): {
    fileName: string;
    fileId: string;
    certificatesCount: number;
    xmlContent: string;
};
