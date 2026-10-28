import type {
	TaxDeductionApplicationForm as TaxDeductionApplicationFormKind,
	TaxDeductionApplicationRelationship,
} from "@dental/shared";
import { isDateInputValue } from "../../AppHelpers";
import { validateRussianInn } from "./taxCertificateEngine";

/**
 * taxApplicationGuiding.ts
 *
 * Soft Guiding & Safe Defaults Engine for Tax Deduction Application (Mandates 8e, 8n).
 * Печать заявления и выдача справки НИКОГДА не блокируются:
 * незаполненные поля заявитель может дописать от руки на распечатанном бланке.
 */

export interface TaxApplicationGuideItem {
	field: string;
	label: string;
	hint: string;
	isSoftGuide?: boolean | undefined;
}

export type TaxApplicationBlocker = TaxApplicationGuideItem;

export interface TaxApplicationGuidanceReview {
	requiredCount: number;
	blockers: TaxApplicationGuideItem[];
	canPrint: boolean;
	canSign: boolean;
	disabled: false;
	isSoftGuiding: boolean;
}

export type TaxApplicationBlockersReview = TaxApplicationGuidanceReview;

export interface TaxApplicationGuideInput {
	taxpayerFullName: string;
	taxpayerInn: string;
	taxpayerBirthDate: string;
	taxpayerIdentityDocument: string;
	relationship: TaxDeductionApplicationRelationship;
	form: TaxDeductionApplicationFormKind;
	authorityDocument: string;
	contact: string;
	duplicateWarningAccepted: boolean;
}

export type TaxApplicationBlockersInput = TaxApplicationGuideInput;

export const TAX_APPLICATION_SAFE_DEFAULTS = {
	taxpayerFullName: "Пациент клиники",
	taxpayerInn: "",
	taxpayerBirthDate: "«___» _________ _____ г.",
	taxpayerIdentityDocument: "Паспорт гражданина РФ",
	relationship: "self" as const,
	form: "knd_1151156" as const,
	authorityDocument: "",
	contact: "По контактам в карточке пациента",
	duplicateWarningAccepted: true,
} as const;

export function resolveTaxApplicationSafeDefaults(
	input: Partial<TaxApplicationGuideInput>,
): TaxApplicationGuideInput {
	return {
		taxpayerFullName: String(input.taxpayerFullName ?? "").trim() || TAX_APPLICATION_SAFE_DEFAULTS.taxpayerFullName,
		taxpayerInn: String(input.taxpayerInn ?? "").trim() || TAX_APPLICATION_SAFE_DEFAULTS.taxpayerInn,
		taxpayerBirthDate: String(input.taxpayerBirthDate ?? "").trim() || TAX_APPLICATION_SAFE_DEFAULTS.taxpayerBirthDate,
		taxpayerIdentityDocument: String(input.taxpayerIdentityDocument ?? "").trim() || TAX_APPLICATION_SAFE_DEFAULTS.taxpayerIdentityDocument,
		relationship: input.relationship ?? TAX_APPLICATION_SAFE_DEFAULTS.relationship,
		form: input.form ?? TAX_APPLICATION_SAFE_DEFAULTS.form,
		authorityDocument: String(input.authorityDocument ?? "").trim() || TAX_APPLICATION_SAFE_DEFAULTS.authorityDocument,
		contact: String(input.contact ?? "").trim() || TAX_APPLICATION_SAFE_DEFAULTS.contact,
		duplicateWarningAccepted: input.duplicateWarningAccepted ?? TAX_APPLICATION_SAFE_DEFAULTS.duplicateWarningAccepted,
	};
}

function digitsOf(value: string): string {
	return String(value ?? "").replace(/[^\d]/g, "");
}

function innHint(input: TaxApplicationGuideInput): string | null {
	const digits = digitsOf(input.taxpayerInn);
	const isLegacy = input.form === "legacy_2021_2023";
	if (digits.length === 0) {
		return isLegacy ? "для старой справки 2021-2023 ИНН обязателен (10 или 12 цифр)" : null;
	}
	if (input.form === "knd_1151156" && digits.length !== 12) {
		return `в ИНН ${digits.length} цифр, для КНД 1151156 нужно ровно 12 цифр (или оставьте пустым)`;
	}
	if (digits.length !== 10 && digits.length !== 12) {
		return `в ИНН ${digits.length} цифр, а нужно 12 у человека или 10 у организации`;
	}
	const val = validateRussianInn(digits);
	return val.isValid ? null : (val.errorMessageRu || "неверная контрольная сумма ИНН");
}

export function taxApplicationGuidanceReview(
	input: TaxApplicationGuideInput,
): TaxApplicationGuidanceReview {
	const inn = innHint(input);
	const checks: Array<TaxApplicationGuideItem & { ok: boolean }> = [
		{ field: "taxApplicationTaxpayerFullName", label: "Заявитель / налогоплательщик", hint: "рекомендуется указать ФИО (можно вписать на бланке)", isSoftGuide: true, ok: String(input.taxpayerFullName ?? "").trim() !== "" },
		{ field: "taxApplicationTaxpayerInn", label: "ИНН", hint: inn ?? "", isSoftGuide: true, ok: inn === null },
		{ field: "taxApplicationTaxpayerBirthDate", label: "Дата рождения", hint: "рекомендуется выбрать дату рождения", isSoftGuide: true, ok: isDateInputValue(String(input.taxpayerBirthDate ?? "")) },
		{ field: "taxApplicationTaxpayerIdentityDocument", label: "Документ заявителя", hint: "рекомендуется указать серию и номер паспорта", isSoftGuide: true, ok: String(input.taxpayerIdentityDocument ?? "").trim() !== "" },
		{ field: "taxApplicationAuthorityDocument", label: "Полномочия представителя", hint: "документ о полномочиях", isSoftGuide: true, ok: input.relationship === "self" || String(input.authorityDocument ?? "").trim() !== "" },
		{ field: "taxApplicationContact", label: "Кому сообщить о готовности", hint: "рекомендуется указать телефон для связи", isSoftGuide: true, ok: String(input.contact ?? "").trim() !== "" },
		{ field: "taxApplicationDuplicateWarningAccepted", label: "Проверка повторной справки", hint: "отметка", isSoftGuide: true, ok: input.duplicateWarningAccepted },
	];

	return {
		requiredCount: checks.length,
		blockers: checks.filter((c) => !c.ok).map(({ field, label, hint, isSoftGuide }) => ({ field, label, hint, isSoftGuide })),
		canPrint: true,
		canSign: true,
		disabled: false,
		isSoftGuiding: true,
	};
}

export const taxApplicationBlockersReview = taxApplicationGuidanceReview;
