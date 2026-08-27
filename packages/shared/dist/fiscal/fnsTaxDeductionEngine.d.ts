/**
 * DENTE Dental CRM — FNS Russia Tax Deduction Engine (Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@).
 *
 * Implements:
 * 1. Форма по КНД 1151156 («Справка об оплате медицинских услуг для представления в налоговый орган»).
 * 2. Электронный формат по КНД 1184043 (Формат 5.01) для прямой отправки в ФНС через ТКС (Контур, СБИС, 1С, Такском).
 * 3. Контрольные суммы ИНН ЮЛ (10 знаков), ИНН ФЛ/ИП (12 знаков), КПП, ОГРН, СНИЛС, Паспорта РФ.
 * 4. Автоматическая классификация услуг по Номенклатуре Минздрава 804н и Постановлению Правительства № 458:
 *    - Код 01: Стандартное лечение (годовой лимит 150 000 ₽ по ст. 219 НК РФ с 01.01.2024).
 *    - Код 02: Дорогостоящее лечение (имплантация, синус-лифтинг, костная пластика) — без ограничений суммы.
 * 5. Степени родства: 1 — лично (пациент), 2 — супруг(а), 3 — родитель, 4 — ребенок (подопечный).
 * 6. Генерация динамического QR-кода верификации подлинности справки.
 */
import { amountToWordsRu, ANNUAL_TAX_DEDUCTION_LIMIT_RUB, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024, calculateTaxDeductionSummary, EXPENSIVE_TREATMENT_804N_CODES, FNS_FORMAT_VERSION_501, FNS_ORDER_824_NAME, generateFnsTaxDeductionBatchXml, generateFnsTaxDeductionXml, generateTaxCertificateQrDataUri, generateTaxCertificateQrPayload, generateTaxCertificateQrSvg, KND_CERTIFICATE_FORM, KND_REGISTRY_ELECTRONIC_FORMAT, resolveTaxDeductionCategoryShared, TAX_DEDUCTION_RELATIONSHIP_MAP, type TaxDeductionBatchParams, type TaxDeductionCalculationResult, type TaxDeductionCertificateParams, type TaxDeductionClinicParams, type TaxDeductionPaymentItem, type TaxDeductionPersonParams, type TaxDeductionRelationship, type TaxDeductionYearSummary, validateRussianInn, validateRussianKpp, validateRussianOgrn, validateRussianPassport, validateRussianSnils } from "./taxDeduction.js";
export { amountToWordsRu, ANNUAL_TAX_DEDUCTION_LIMIT_RUB, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024, calculateTaxDeductionSummary, EXPENSIVE_TREATMENT_804N_CODES, FNS_FORMAT_VERSION_501, FNS_ORDER_824_NAME, generateFnsTaxDeductionBatchXml, generateFnsTaxDeductionXml, generateTaxCertificateQrDataUri, generateTaxCertificateQrPayload, generateTaxCertificateQrSvg, KND_CERTIFICATE_FORM, KND_REGISTRY_ELECTRONIC_FORMAT, resolveTaxDeductionCategoryShared, TAX_DEDUCTION_RELATIONSHIP_MAP, type TaxDeductionBatchParams, type TaxDeductionCalculationResult, type TaxDeductionCertificateParams, type TaxDeductionClinicParams, type TaxDeductionPaymentItem, type TaxDeductionPersonParams, type TaxDeductionRelationship, type TaxDeductionYearSummary, validateRussianInn, validateRussianKpp, validateRussianOgrn, validateRussianPassport, validateRussianSnils, };
/**
 * Валидация контрольных сумм 10-значного ИНН юридического лица.
 * Веса ФНС: [2, 4, 10, 3, 5, 9, 4, 6, 8]
 * Контрольная цифра = (sum % 11) % 10
 */
export declare function validateInnLegalEntity(inn: unknown): {
    isValid: boolean;
    errorMessageRu?: string;
};
/**
 * Валидация контрольных сумм 12-значного ИНН физического лица или индивидуального предпринимателя.
 * 11-й знак: веса [7, 2, 4, 10, 3, 5, 9, 4, 6, 8] -> (sum % 11) % 10
 * 12-й знак: веса [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8] -> (sum % 11) % 10
 */
export declare function validateInnIndividual(inn: unknown): {
    isValid: boolean;
    errorMessageRu?: string;
};
/**
 * Классификация стоматологической услуги по Номенклатуре 804н и ст. 219 НК РФ:
 * Код 02: Дорогостоящее лечение (имплантация, синус-лифтинг, костная пластика, мембранная регенерация)
 * Код 01: Стандартное лечение (терапия кариеса, эндодонтия, удаление, ортопедия, гигиена).
 */
export declare function classifyTaxDeduction804n(code804n?: string, serviceName?: string): {
    categoryCode: "1" | "2";
    categoryNameRu: string;
    isExpensiveTreatment: boolean;
    hasAnnualLimit: boolean;
    statutoryLimitRub: number;
};
/**
 * Генерация официального XML-файла реестра сведений в формате NO_MEDOPL 5.01 / КНД 1184043
 * по Приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ для прямой отправки по ТКС.
 */
export declare function generateFnsNoMedoplXml(params: TaxDeductionCertificateParams): {
    fileName: string;
    fileId: string;
    xmlContent: string;
};
/**
 * Генерация официальной печатной формы Справки КНД 1151156 (формат А4)
 * по Приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ с верификационным QR-кодом.
 */
export declare function renderOfficialTaxCertificateKnd1151156Html(params: TaxDeductionCertificateParams): string;
export interface PlanServiceItemForTax {
    readonly id?: string | undefined;
    readonly code804n?: string | undefined;
    readonly serviceName?: string | undefined;
    readonly name?: string | undefined;
    readonly priceRub?: number | undefined;
    readonly priceKopecks?: number | undefined;
    readonly quantity?: number | undefined;
    readonly taxCode?: "1" | "2" | undefined;
}
export interface PlanTaxItemDeduction {
    readonly id?: string | undefined;
    readonly code804n?: string | undefined;
    readonly serviceName: string;
    readonly categoryCode: "1" | "2";
    readonly isExpensive: boolean;
    readonly totalRub: number;
    readonly totalKopecks: number;
    readonly eligibleRub: number;
    readonly eligibleKopecks: number;
    readonly refund13Rub: number;
    readonly refund13Kopecks: number;
}
export interface PlanTaxDeductionCalculation {
    readonly code01TotalRub: number;
    readonly code01TotalKopecks: number;
    readonly code01EligibleRub: number;
    readonly code01EligibleKopecks: number;
    readonly code01Refund13Rub: number;
    readonly code01Refund13Kopecks: number;
    readonly code01StatutoryLimitRub: number;
    readonly isCode01Capped: boolean;
    readonly code02TotalRub: number;
    readonly code02TotalKopecks: number;
    readonly code02EligibleRub: number;
    readonly code02EligibleKopecks: number;
    readonly code02Refund13Rub: number;
    readonly code02Refund13Kopecks: number;
    readonly grandTotalRub: number;
    readonly grandTotalKopecks: number;
    readonly grandTotalRefund13Rub: number;
    readonly grandTotalRefund13Kopecks: number;
    readonly netPriceWithRefundRub: number;
    readonly netPriceWithRefundKopecks: number;
    readonly items: readonly PlanTaxItemDeduction[];
    readonly hasCode02ExpensiveServices: boolean;
}
export interface StagedPaymentScheduleBreakdown {
    readonly totalKopecks: number;
    readonly totalRub: number;
    readonly stage1AdvanceTherapyKopecks: number;
    readonly stage1AdvanceTherapyRub: number;
    readonly stage2SurgeryImplantKopecks: number;
    readonly stage2SurgeryImplantRub: number;
    readonly stage3OrthopedicsKopecks: number;
    readonly stage3OrthopedicsRub: number;
    readonly isBalanced: boolean;
    readonly partsKopecks: readonly [number, number, number];
}
/**
 * Точный расчет возврата 13% НДФЛ по плану лечения с разделением на Код 01 (до 150 000 ₽) и Код 02 (дорогостоящее без лимита).
 */
export declare function calculatePlanTaxDeductionBreakdown(items: readonly PlanServiceItemForTax[], statutoryLimitRub?: number): PlanTaxDeductionCalculation;
/**
 * Расчет графика поэтапной оплаты (30% аванс/санация, 40% хирургия, 30% ортопедия) с точной балансировкой копеек.
 */
export declare function calculateStaged304030Schedule(totalRubOrKopecks: number, isKopecksInput?: boolean): StagedPaymentScheduleBreakdown;
