/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS TAX DEDUCTION STATUTORY SCHEMA SPECIFICATION (ПРИКАЗ ФНС № ЕА-7-11/824@)
 * Form KND 1151156 / Electronic XML Format KND 1184043 (UT_SVOPLMEDUSL 5.01)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Statutory references:
 * - Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@
 * - XSD-схема ФНС: UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd (Версия 5.01)
 * - Налоговый кодекс РФ (ст. 219 НК РФ: социальный налоговый вычет за медицинские услуги)
 * - Постановление Правительства РФ от 08.04.2020 № 458 (Перечень дорогостоящих видов лечения)
 */

import { z } from "zod";
import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	FNS_FORMAT_VERSION_501,
	FNS_ORDER_824_NAME,
	KND_CERTIFICATE_FORM,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionRelationship,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianSnils,
} from "../fiscal/taxDeduction.js";

export {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	FNS_FORMAT_VERSION_501,
	FNS_ORDER_824_NAME,
	KND_CERTIFICATE_FORM,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionRelationship,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianSnils,
};

/** Нормативные константы регламента ФНС РФ */
export const KND_1151156 = KND_CERTIFICATE_FORM; // 1151156 Бумажная форма справки
export const KND_1184043 = KND_REGISTRY_ELECTRONIC_FORMAT; // 1184043 Электронный формат XML (UT_SVOPLMEDUSL)
export const FNS_XSD_VERSION_501 = FNS_FORMAT_VERSION_501; // 5.01
export const FNS_NOTICE_NUMBER_MAX_LENGTH = 12;

/**
 * Лимиты социального налогового вычета по ст. 219 НК РФ:
 * - С 01.01.2024: 150 000 ₽ / 15 000 000 копеек (Федеральный закон от 28.04.2023 № 159-ФЗ)
 * - До 01.01.2024: 120 000 ₽ / 12 000 000 копеек
 * - Ставка НДФЛ: 13% (базовая), 15% (доходы свыше 5 млн ₽ / ст. 224 НК РФ)
 */
export const NDFL_LIMITS = {
	CODE_1_MAX_EXPENSE_FROM_2024: 150000,
	CODE_1_MAX_EXPENSE_FROM_2024_KOPECKS: 15000000,
	CODE_1_MAX_EXPENSE_LEGACY: 120000,
	CODE_1_MAX_EXPENSE_LEGACY_KOPECKS: 12000000,
	TAX_RATE: 0.13,
	HIGH_INCOME_TAX_RATE: 0.15,
} as const;

/** Поддерживаемые налоговые периоды */
export const SUPPORTED_TAX_YEARS = [2024, 2025, 2026, 2027] as const;
export type SupportedTaxYear = (typeof SUPPORTED_TAX_YEARS)[number];

/** Справочник кодов документов, удостоверяющих личность налогоплательщика / пациента */
export const FNS_IDENTITY_DOC_TYPES = [
	{ code: "21", label: "Паспорт гражданина Российской Федерации" },
	{ code: "03", label: "Свидетельство о рождении" },
	{ code: "07", label: "Военный билет" },
	{ code: "10", label: "Паспорт иностранного гражданина" },
	{ code: "12", label: "Вид на жительство в Российской Федерации" },
	{ code: "14", label: "Временное удостоверение личности гражданина РФ" },
	{ code: "91", label: "Иные документы, признаваемые в РФ" },
] as const;

export type FnsIdentityDocCode = (typeof FNS_IDENTITY_DOC_TYPES)[number]["code"];

/** Степень родства пациента к налогоплательщику (Приказ № ЕА-7-11/824@) */
export const FNS_KINSHIP_PRESETS = {
	"1": {
		code: "1" as const,
		label: "1 — Сам налогоплательщик (пациент и плательщик одно лицо)",
		shortLabel: "Лично (сам пациент)",
		samePatientFlag: "1" as const,
		requiresKinshipDoc: false,
	},
	"2": {
		code: "2" as const,
		label: "2 — Супруг (супруга) налогоплательщика",
		shortLabel: "Супруг(а)",
		samePatientFlag: "0" as const,
		requiresKinshipDoc: true,
	},
	"3": {
		code: "3" as const,
		label: "3 — Родитель (мать / отец) налогоплательщика",
		shortLabel: "Родитель",
		samePatientFlag: "0" as const,
		requiresKinshipDoc: true,
	},
	"4": {
		code: "4" as const,
		label: "4 — Ребенок / подопечный (до 18 лет, или до 24 лет при очном обучении)",
		shortLabel: "Ребенок / Подопечный",
		samePatientFlag: "0" as const,
		requiresKinshipDoc: true,
	},
	"5": {
		code: "5" as const,
		label: "5 — Подопечный / брат / сестра (в установленных законом случаях)",
		shortLabel: "Подопечный",
		samePatientFlag: "0" as const,
		requiresKinshipDoc: true,
	},
} as const;

export type FnsKinshipCode = keyof typeof FNS_KINSHIP_PRESETS;

/** Коды медицинских услуг для социального вычета */
export const FNS_SERVICE_CODE_PRESETS = {
	"1": {
		code: "1" as const,
		title: "Код 1 — Обычные медицинские услуги (лечение, гигиена, терапия)",
		description: "Терапевтическая стоматология, эндодонтия, ортодонтия, профгигиена. Лимит базы 150 000 ₽.",
		hasLimit: true,
	},
	"2": {
		code: "2" as const,
		title: "Код 2 — Дорогостоящее лечение (Постановление Правительства РФ № 458)",
		description: "Дентальная имплантация, костная пластика, синус-лифтинг, сложное челюстно-лицевое протезирование. Без ограничений суммы вычета.",
		hasLimit: false,
	},
} as const;

export type FnsServiceDeductionCode = keyof typeof FNS_SERVICE_CODE_PRESETS;

/* ═══════════════════════════════════════════════════════════════════════════
 * ZOD СХЕМЫ СТРОГОГО КОНТРАКТА ДАННЫХ
 * ═══════════════════════════════════════════════════════════════════════════ */

export const fnsFullNameSchema = z.object({
	family: z.string().min(1, "Фамилия обязательна"),
	given: z.string().min(1, "Имя обязательно"),
	patronymic: z.string().optional().nullable(),
});

export const fnsIdentityDocumentSchema = z.object({
	docTypeCode: z.string().default("21"),
	seriesAndNumber: z.string().min(1, "Серия и номер документа обязательны"),
	issueDate: z.string().optional().nullable(),
	issuedBy: z.string().optional().nullable(),
	subdivisionCode: z.string().optional().nullable(),
});

export const fnsClinicSchema = z.object({
	inn: z.string().min(10).max(12),
	kpp: z.string().optional().nullable(),
	ogrn: z.string().min(13).max(15),
	name: z.string().default("ООО СТОМАТОЛОГИЯ ДЕНТЕ"),
	isIndividualEntrepreneur: z.boolean().optional(),
	ipFullName: fnsFullNameSchema.optional().nullable(),
	license: z
		.object({
			number: z.string(),
			date: z.string(),
			issuer: z.string().optional().nullable(),
		})
		.optional()
		.nullable(),
	directorName: z.string().optional().nullable(),
	directorSnils: z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
});

export const fnsPersonSchema = z.object({
	fullName: fnsFullNameSchema,
	inn: z.string().optional().nullable(),
	snils: z.string().optional().nullable(),
	birthDate: z.string().min(1, "Дата рождения обязательна"),
	identityDocument: fnsIdentityDocumentSchema.optional().nullable(),
});

export const fnsPatientSchema = z.object({
	patientKinshipCode: z.enum(["1", "2", "3", "4", "5"]).default("1"),
	fullName: fnsFullNameSchema.optional().nullable(),
	inn: z.string().optional().nullable(),
	snils: z.string().optional().nullable(),
	birthDate: z.string().optional().nullable(),
	identityDocument: fnsIdentityDocumentSchema.optional().nullable(),
});

export const fnsExpensesSchema = z.object({
	code1AmountRub: z.number().nonnegative().optional().nullable(),
	code2AmountRub: z.number().nonnegative().optional().nullable(),
	code1AmountKopecks: z.number().int().nonnegative().optional().nullable(),
	code2AmountKopecks: z.number().int().nonnegative().optional().nullable(),
});

export const fnsSignatorySchema = z.object({
	signatoryRole: z.enum(["1", "2"]).default("1"), // 1 = Руководитель/ИП, 2 = Уполномоченный представитель
	fullName: fnsFullNameSchema,
	snils: z.string().optional().nullable(),
	powerOfAttorneyNumber: z.string().optional().nullable(),
});

export const fnsFiscalReceiptItemSchema = z.object({
	id: z.string(),
	receiptNumber: z.string(),
	fiscalDocumentNumber: z.string().optional().nullable(),
	receiptDate: z.string(),
	serviceName: z.string(),
	deductionCode: z.enum(["1", "2"]),
	amountRub: z.number().positive(),
	amountKopecks: z.number().int().positive().optional().nullable(),
});

export const fnsTaxPayloadSchema = z.object({
	documentNumber: z.string().min(1, "Номер справки обязателен"),
	documentDate: z.union([z.string(), z.date()]),
	taxYear: z.union([z.number(), z.string()]),
	taxInspectionCode: z.string().length(4).default("7701"),
	certificateKind: z.enum(["1", "2", "3"]).default("1"), // 1 = Первичная, 2 = Корректирующая, 3 = Аннулирующая
	correctionNumber: z.number().int().nonnegative().default(0),
	filePrefix: z.enum(["NO_MEDOPL", "UT_SVOPLMEDUSL"]).optional().nullable(),
	softwareVersion: z.string().optional().nullable(),
	clinic: fnsClinicSchema,
	payer: fnsPersonSchema,
	patient: fnsPatientSchema,
	expenses: fnsExpensesSchema,
	signatory: fnsSignatorySchema.optional().nullable(),
	receipts: z.array(fnsFiscalReceiptItemSchema).optional().nullable(),
});

/* ═══════════════════════════════════════════════════════════════════════════
 * ТИПЫ ДЛЯ TYPESCRIPT
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface FnsFullName {
	family: string;
	given: string;
	patronymic?: string | null | undefined;
}

export interface FnsIdentityDocument {
	docTypeCode?: string | null | undefined;
	seriesAndNumber: string;
	issueDate?: string | null | undefined;
	issuedBy?: string | null | undefined;
	subdivisionCode?: string | null | undefined;
}

export interface FnsClinicInfo {
	inn: string;
	kpp?: string | null | undefined;
	ogrn: string;
	name?: string | null | undefined;
	isIndividualEntrepreneur?: boolean | undefined;
	ipFullName?: FnsFullName | null | undefined;
	license?: {
		number: string;
		date: string;
		issuer?: string | null | undefined;
	} | null | undefined;
	directorName?: string | null | undefined;
	directorSnils?: string | null | undefined;
	phone?: string | null | undefined;
}

export interface FnsPersonInfo {
	fullName: FnsFullName;
	inn?: string | null | undefined;
	snils?: string | null | undefined;
	birthDate: string;
	identityDocument?: FnsIdentityDocument | null | undefined;
}

export type FnsPayerInfo = FnsPersonInfo;

export interface FnsPatientInfo {
	patientKinshipCode: FnsKinshipCode;
	fullName?: FnsFullName | null | undefined;
	inn?: string | null | undefined;
	snils?: string | null | undefined;
	birthDate?: string | null | undefined;
	identityDocument?: FnsIdentityDocument | null | undefined;
}

export interface FnsExpensesInfo {
	code1AmountRub?: number | null | undefined;
	code2AmountRub?: number | null | undefined;
	code1AmountKopecks?: number | null | undefined;
	code2AmountKopecks?: number | null | undefined;
}

export interface FnsSignatoryInfo {
	signatoryRole: "1" | "2";
	fullName: FnsFullName;
	snils?: string | null | undefined;
	powerOfAttorneyNumber?: string | null | undefined;
}

export interface FnsFiscalReceiptItem {
	id: string;
	receiptNumber: string;
	fiscalDocumentNumber?: string | null | undefined;
	receiptDate: string;
	serviceName: string;
	deductionCode: FnsServiceDeductionCode;
	amountRub: number;
	amountKopecks?: number | null | undefined;
}

export interface FnsTaxPayload {
	documentNumber: string;
	documentDate: string | Date;
	taxYear: number | string;
	taxInspectionCode?: string | null | undefined;
	certificateKind?: "1" | "2" | "3" | null | undefined;
	correctionNumber?: number | null | undefined;
	filePrefix?: "NO_MEDOPL" | "UT_SVOPLMEDUSL" | string | null | undefined;
	softwareVersion?: string | null | undefined;
	clinic: FnsClinicInfo;
	payer: FnsPersonInfo;
	patient: FnsPatientInfo;
	expenses: FnsExpensesInfo;
	signatory?: FnsSignatoryInfo | null | undefined;
	receipts?: FnsFiscalReceiptItem[] | null | undefined;
}

export interface FnsPreflightIssue {
	field: string;
	message: string;
	severity: "error" | "warning";
}
