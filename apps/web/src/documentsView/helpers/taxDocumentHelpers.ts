import type {
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm,
	TaxDeductionApplicationRelationship,
} from "@dental/shared";
import { defaultUiPreferences } from "../../utils/preferencesUtils";

export const taxApplicationRelationshipOptions: Array<{
	value: TaxDeductionApplicationRelationship;
	label: string;
}> = [
	{ value: "self", label: "Пациент сам" },
	{ value: "spouse", label: "Супруг / супруга" },
	{ value: "parent", label: "Родитель" },
	{ value: "child", label: "Ребенок" },
	{ value: "ward", label: "Подопечный" },
];

export const taxApplicationFormOptions: Array<{
	value: TaxDeductionApplicationForm;
	label: string;
}> = [
	{ value: "knd_1151156", label: "Справка для налогового вычета (с 2024)" },
	{ value: "legacy_2021_2023", label: "Старая справка, оплаты 2021-2023" },
];

export const taxApplicationDeliveryChannelOptions: Array<{
	value: TaxDeductionApplicationDeliveryChannel;
	label: string;
}> = [
	{ value: "paper", label: "Бумажно в клинике" },
	{ value: "pdf", label: "PDF после подписи" },
	{ value: "secure_link", label: "Защищенная ссылка" },
	{ value: "email", label: "Email" },
	{ value: "portal", label: "Личный кабинет" },
	{ value: "other", label: "Иной канал" },
];

export function isTaxDocumentYearPreference(value: unknown): value is number {
	if (!Number.isInteger(value)) return false;
	const year = value as number;
	return year >= 2021 && year <= 2100;
}

export function isTaxApplicationFormPreference(
	value: unknown,
): value is TaxDeductionApplicationForm {
	return taxApplicationFormOptions.some((opt) => opt.value === value);
}

export function isTaxApplicationDeliveryChannelPreference(
	value: unknown,
): value is TaxDeductionApplicationDeliveryChannel {
	return taxApplicationDeliveryChannelOptions.some((opt) => opt.value === value);
}

export function normalizeTaxApplicationRelationship(
	value: string | null | undefined,
): TaxDeductionApplicationRelationship | null {
	const normalized = value?.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е").replace(/[\s_-]+/g, " ") ?? "";
	if (!normalized) return null;
	if (["self", "patient", "пациент", "сам пациент", "сама пациентка", "налогоплательщик"].includes(normalized)) return "self";
	if (["spouse", "husband", "wife", "супруг", "супруга", "муж", "жена"].includes(normalized)) return "spouse";
	if (["parent", "father", "mother", "родитель", "отец", "мать", "папа", "мама"].includes(normalized)) return "parent";
	if (["child", "son", "daughter", "ребенок", "сын", "дочь", "усыновленный", "усыновленная"].includes(normalized)) return "child";
	if (["ward", "подопечный", "подопечная", "опекаемый", "опекаемая"].includes(normalized)) return "ward";
	return null;
}

export function normalizedTaxApplicationRelationshipSelect(
	value: unknown,
): TaxDeductionApplicationRelationship {
	return taxApplicationRelationshipOptions.some((opt) => opt.value === value)
		? (value as TaxDeductionApplicationRelationship)
		: "self";
}

export function normalizedTaxApplicationForm(
	value: unknown,
): TaxDeductionApplicationForm {
	return isTaxApplicationFormPreference(value)
		? value
		: defaultUiPreferences.taxApplicationForm;
}

export function normalizedTaxApplicationDeliveryChannel(
	value: unknown,
): TaxDeductionApplicationDeliveryChannel {
	return isTaxApplicationDeliveryChannelPreference(value)
		? value
		: defaultUiPreferences.taxApplicationDeliveryChannel;
}
