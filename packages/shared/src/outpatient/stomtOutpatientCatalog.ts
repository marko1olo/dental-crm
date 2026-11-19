import { STOMX_KEY_CLINICAL_PROTOCOLS } from "./stomtProtocolsData.js";
import { STOMX_ALL_448_TEMPLATES_INDEX } from "./stomtTemplatesIndex.js";

/**
 * 5 базовых клинических специальностей стоматологического приема
 */
export type OutpatientSpecialty =
	| "therapy"
	| "orthopedics"
	| "surgery"
	| "implantology"
	| "periodontics";

/**
 * Метаданные специальности
 */
export interface OutpatientSpecialtyMeta {
	readonly id: OutpatientSpecialty;
	readonly label: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly defaultMkbGroup: string;
	readonly iconName: string;
}

export const CLINICAL_OUTPATIENT_SPECIALTIES: readonly OutpatientSpecialtyMeta[] = [
	{
		id: "therapy",
		label: "Терапевтическая стоматология",
		shortLabel: "Терапия",
		description:
			"Лечение кариеса, пульпита, периодонтита, эстетические реставрации, отбеливание",
		defaultMkbGroup: "K02, K04",
		iconName: "Stethoscope",
	},
	{
		id: "orthopedics",
		label: "Ортопедическая стоматология",
		shortLabel: "Ортопедия",
		description:
			"Вкладки, виниры Emax, коронки из диоксида циркония и металлокерамики, съемные протезы",
		defaultMkbGroup: "K02, K08",
		iconName: "Crown",
	},
	{
		id: "surgery",
		label: "Хирургическая стоматология",
		shortLabel: "Хирургия",
		description:
			"Удаление зубов, альвеолит, перикоронит, периостит, абсцессы, резекция верхушек корней",
		defaultMkbGroup: "K01, K04.7, K10, K12",
		iconName: "Scissors",
	},
	{
		id: "implantology",
		label: "Дентальная имплантология",
		shortLabel: "Имплантация",
		description:
			"Установка имплантатов, открытый и закрытый синус-лифтинг, костная пластика, формирователи",
		defaultMkbGroup: "K08.1, K08.8",
		iconName: "Flame",
	},
	{
		id: "periodontics",
		label: "Пародонтология и профилактика",
		shortLabel: "Пародонтология",
		description:
			"Гингивит, пародонтит, пародонтоз, закрытый и открытый кюретаж, гингивэктомия",
		defaultMkbGroup: "K05",
		iconName: "HeartPulse",
	},
];

/** @deprecated Use CLINICAL_OUTPATIENT_SPECIALTIES per Mandate 8x */
export const STOMX_SPECIALTIES = CLINICAL_OUTPATIENT_SPECIALTIES;

/**
 * Структурированный клинический протокол приема (SOAP)
 */
export interface OutpatientProtocolTemplate {
	readonly id: string;
	readonly stomxId?: number | undefined;
	readonly name: string;
	readonly specialty: OutpatientSpecialty;
	readonly subcategory: string;
	readonly mkbCode: string;
	readonly mkbName: string;
	readonly complaint: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly diagnosis: string;
	readonly treatmentProtocol: string;
	readonly recommendations: string;
	readonly defaultTooth?: number | undefined;
	readonly tags?: readonly string[] | undefined;
	readonly fullText?: string | undefined;
}

/**
 * Метаданные шаблона из 448 позиций StomX
 */
export interface StomxOutpatientTemplateMetadata {
	readonly id: number;
	readonly categoryId: number;
	readonly name: string;
	readonly categoryName: string;
	readonly specialty: OutpatientSpecialty;
	readonly mkbCode: string;
	readonly order: number;
}

/** Алиас для обратной совместимости */
export type StomxTemplateMetadata = StomxOutpatientTemplateMetadata;
export type OutpatientTemplateMetadata = StomxOutpatientTemplateMetadata;

/**
 * Узел дерева рубрик шаблонов StomX
 */
export interface StomxCategoryTreeItem {
	readonly id: number;
	readonly name: string;
	readonly children?: readonly StomxCategoryTreeItem[] | undefined;
}

import {
	type PopulateTemplateParams,
	populateOutpatientTemplateText,
} from "../clinical/soap/templateInterpolator.js";

export type { PopulateTemplateParams };
export { populateOutpatientTemplateText };

/**
 * Собирает целостный дневник амбулаторного приема (SOAP) из протокола с подстановкой параметров
 */
export function formatFullSoapFromProtocol(
	protocol: OutpatientProtocolTemplate,
	params: PopulateTemplateParams = {},
): string {
	const toothNumber = params.toothNumber ?? protocol.defaultTooth;
	const populatedComplaint = populateOutpatientTemplateText(
		protocol.complaint,
		{
			toothNumber,
			surfaces: params.surfaces,
		},
	);
	const populatedAnamnesis = populateOutpatientTemplateText(
		protocol.anamnesis,
		{
			toothNumber,
			surfaces: params.surfaces,
		},
	);
	const populatedObjective = populateOutpatientTemplateText(
		protocol.objectiveStatus,
		{
			toothNumber,
			surfaces: params.surfaces,
		},
	);
	const populatedDiagnosis = populateOutpatientTemplateText(
		protocol.diagnosis,
		{
			toothNumber,
			surfaces: params.surfaces,
		},
	);
	const populatedTreatment = populateOutpatientTemplateText(
		protocol.treatmentProtocol,
		{
			toothNumber,
			surfaces: params.surfaces,
		},
	);
	const populatedRecommendations = populateOutpatientTemplateText(
		protocol.recommendations,
		{
			toothNumber,
			surfaces: params.surfaces,
		},
	);

	const toothHeader = toothNumber ? `[Зуб ${toothNumber}] ` : "";

	return [
		`=== ${toothHeader}${protocol.name} (${protocol.mkbCode}) ===`,
		`Жалобы: ${populatedComplaint}`,
		`Анамнез: ${populatedAnamnesis}`,
		`Объективный статус: ${populatedObjective}`,
		`Диагноз: ${populatedDiagnosis}`,
		`Протокол лечения: ${populatedTreatment}`,
		`Рекомендации: ${populatedRecommendations}`,
	].join("\n\n");
}

/**
 * Получить структурированные протоколы по специальности
 */
export function getProtocolsBySpecialty(
	specialty: OutpatientSpecialty,
): readonly OutpatientProtocolTemplate[] {
	return STOMX_KEY_CLINICAL_PROTOCOLS.filter((p) => p.specialty === specialty);
}

/**
 * Поиск по ключевым клиническим протоколам (название, подкатегория, диагноз, теги)
 */
export function searchOutpatientProtocols(
	query: string,
	specialty?: OutpatientSpecialty,
): readonly OutpatientProtocolTemplate[] {
	const normalized = query.trim().toLowerCase();
	return STOMX_KEY_CLINICAL_PROTOCOLS.filter((p) => {
		if (specialty && p.specialty !== specialty) return false;
		if (!normalized) return true;

		return (
			p.name.toLowerCase().includes(normalized) ||
			p.subcategory.toLowerCase().includes(normalized) ||
			p.mkbCode.toLowerCase().includes(normalized) ||
			p.mkbName.toLowerCase().includes(normalized) ||
			p.tags?.some((tag) => tag.toLowerCase().includes(normalized))
		);
	});
}

/**
 * Поиск по полному индексу 448 шаблонов StomX Drop
 */
export function searchAll448Templates(
	query: string,
	specialty?: OutpatientSpecialty,
): readonly StomxOutpatientTemplateMetadata[] {
	const normalized = query.trim().toLowerCase();
	return STOMX_ALL_448_TEMPLATES_INDEX.filter((t) => {
		if (specialty && t.specialty !== specialty) return false;
		if (!normalized) return true;

		return (
			t.name.toLowerCase().includes(normalized) ||
			t.categoryName.toLowerCase().includes(normalized) ||
			t.mkbCode.toLowerCase().includes(normalized)
		);
	});
}

/**
 * Поиск ключевого протокола по ID
 */
export function findProtocolById(
	id: string | number,
): OutpatientProtocolTemplate | undefined {
	return STOMX_KEY_CLINICAL_PROTOCOLS.find(
		(p) => p.id === id || (typeof id === "number" && p.stomxId === id),
	);
}

// Реэкспорт всех каталогов и дерева рубрик
export { STOMX_KEY_CLINICAL_PROTOCOLS } from "./stomtProtocolsData.js";
export {
	CANONICAL_OUTPATIENT_TEMPLATES_INDEX,
	OUTPATIENT_CATEGORY_TREE,
	STOMX_ALL_448_TEMPLATES_INDEX,
	STOMX_OUTPATIENT_CATEGORY_TREE,
} from "./stomtTemplatesIndex.js";
