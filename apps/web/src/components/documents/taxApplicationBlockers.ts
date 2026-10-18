import type {
	TaxDeductionApplicationForm as TaxDeductionApplicationFormKind,
	TaxDeductionApplicationRelationship,
} from "@dental/shared";
import { isDateInputValue } from "../../AppHelpers";
import { validateRussianInn } from "./taxCertificateEngine";

export interface TaxApplicationBlocker {
	field: string;
	label: string;
	hint: string;
}

export interface TaxApplicationBlockersReview {
	requiredCount: number;
	blockers: TaxApplicationBlocker[];
}

export interface TaxApplicationBlockersInput {
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

function digitsOf(value: string): string {
	return String(value ?? "").replace(/[^\d]/g, "");
}

function innHint(input: TaxApplicationBlockersInput): string | null {
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

export function taxApplicationBlockersReview(
	input: TaxApplicationBlockersInput,
): TaxApplicationBlockersReview {
	const inn = innHint(input);
	const checks: Array<TaxApplicationBlocker & { ok: boolean }> = [
		{ field: "taxApplicationTaxpayerFullName", label: "Заявитель / налогоплательщик", hint: "впишите ФИО", ok: String(input.taxpayerFullName ?? "").trim() !== "" },
		{ field: "taxApplicationTaxpayerInn", label: "ИНН", hint: inn ?? "", ok: inn === null },
		{ field: "taxApplicationTaxpayerBirthDate", label: "Дата рождения", hint: "выберите дату рождения", ok: isDateInputValue(String(input.taxpayerBirthDate ?? "")) },
		{ field: "taxApplicationTaxpayerIdentityDocument", label: "Документ заявителя", hint: "серия и номер паспорта", ok: String(input.taxpayerIdentityDocument ?? "").trim() !== "" },
		{ field: "taxApplicationAuthorityDocument", label: "Полномочия представителя", hint: "документ о полномочиях", ok: input.relationship === "self" || String(input.authorityDocument ?? "").trim() !== "" },
		{ field: "taxApplicationContact", label: "Кому сообщить о готовности", hint: "телефон для связи", ok: String(input.contact ?? "").trim() !== "" },
		{ field: "taxApplicationDuplicateWarningAccepted", label: "Проверка повторной справки", hint: "отметка", ok: input.duplicateWarningAccepted },
	];

	return {
		requiredCount: checks.length,
		blockers: checks.filter((c) => !c.ok).map(({ field, label, hint }) => ({ field, label, hint })),
	};
}
