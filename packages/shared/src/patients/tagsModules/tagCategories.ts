import {
	type PatientTagCategory,
	type PatientTagCode,
	type PatientTagMeta,
	PATIENT_TAG_CATEGORIES,
	PATIENT_TAGS_CATALOG,
} from "./tagDefinitions.js";

export interface PatientTagCategoryMeta {
	readonly category: PatientTagCategory;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly badgeTone: "rose" | "amber" | "sky" | "slate";
}

export const PATIENT_TAG_CATEGORY_METAS: readonly PatientTagCategoryMeta[] = [
	{
		category: "clinical",
		titleRu: "Клинические особенности",
		descriptionRu: "Аллергии, острая боль, соматические противопоказания, особые условия лечения",
		badgeTone: "rose",
	},
	{
		category: "administrative",
		titleRu: "Сервис и сопровождение",
		descriptionRu: "VIP-статус, конфликтность, риск неявки, кураторское сопровождение",
		badgeTone: "amber",
	},
	{
		category: "financial",
		titleRu: "Финансы и страхование",
		descriptionRu: "ДМС, рассрочка, дебиторская задолженность, семейный баланс",
		badgeTone: "sky",
	},
	{
		category: "social",
		titleRu: "Социальные категории",
		descriptionRu: "Пенсионеры, льготники, коллеги-медработники, маломобильные пациенты",
		badgeTone: "slate",
	},
];

export function getTagsByCategory(category: PatientTagCategory): PatientTagMeta[] {
	return PATIENT_TAGS_CATALOG.filter((tag) => tag.category === category);
}

export function getCriticalAlertTags(): PatientTagMeta[] {
	return PATIENT_TAGS_CATALOG.filter((tag) => tag.isRedAlert);
}

export function getClinicalTags(): PatientTagMeta[] {
	return getTagsByCategory("clinical");
}

export function getAdministrativeTags(): PatientTagMeta[] {
	return getTagsByCategory("administrative");
}

export function getFinancialTags(): PatientTagMeta[] {
	return getTagsByCategory("financial");
}

export function getSocialTags(): PatientTagMeta[] {
	return getTagsByCategory("social");
}

export function isClinicalCategory(category: string): category is PatientTagCategory {
	return (PATIENT_TAG_CATEGORIES as readonly string[]).includes(category);
}
