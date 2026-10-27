/**
 * apps/web/src/components/visit/clinicalCatalog/clinicalProtocolsData.ts
 *
 * Каталог 1 142 клинических чанков и сгруппированных процедур СтАР.
 */

import rawChunksData from "./protocols1142Data.json";
import type {
	ClinicalChunk1142,
	GroupedClinicalProcedure,
	SpecialtyCategoryKey,
	SpecialtyCategoryMeta,
} from "./clinicalProtocolsTypes";

export const ALL_CLINICAL_CHUNKS_1142: readonly ClinicalChunk1142[] =
	rawChunksData as readonly ClinicalChunk1142[];

export const SPECIALTY_CATEGORIES_META: readonly SpecialtyCategoryMeta[] = [
	{ key: "all", label: "Все шаблоны и протоколы", shortLabel: "Все", count: 1142 },
	{ key: "therapy", label: "Терапия (кариес, пульпит, периодонтит)", shortLabel: "Терапия", count: 104 },
	{ key: "surgery", label: "Хирургия и имплантация", shortLabel: "Хирургия", count: 141 },
	{ key: "orthopedics", label: "Ортопедия (протезирование)", shortLabel: "Ортопедия", count: 127 },
	{ key: "pediatric", label: "Детская стоматология", shortLabel: "Детство", count: 85 },
	{ key: "hygiene", label: "Гигиена и профилактика", shortLabel: "Гигиена", count: 30 },
	{ key: "bleaching", label: "Отбеливание зубов", shortLabel: "Отбеливание", count: 17 },
	{ key: "periodontics", label: "Пародонтология", shortLabel: "Пародонтология", count: 6 },
	{ key: "icd10", label: "Диагнозы МКБ-10 и клинические ситуации", shortLabel: "МКБ-10", count: 628 },
	{ key: "comprehensive", label: "Комплексные карты приёма", shortLabel: "Комплексные", count: 4 },
];

function matchIcd10ForName(nameLower: string): string | undefined {
	if (nameLower.includes("кариес дентина")) return "K02.1 Кариес дентина";
	if (nameLower.includes("кариес эмали")) return "K02.0 Кариес эмали";
	if (nameLower.includes("кариес цемента")) return "K02.2 Кариес цемента";
	if (nameLower.includes("пульпит")) return "K04.0 Пульпит";
	if (nameLower.includes("периодонтит")) return "K04.5 Хронический апикальный периодонтит";
	if (nameLower.includes("имплантация") || nameLower.includes("имплант")) return "K08.1 Потеря зубов вследствие несчастного случая, удаления";
	if (nameLower.includes("удаление")) return "K04.8 Другие и неуточненные болезни пульпы и периапикальных тканей";
	if (nameLower.includes("гигиен")) return "K05.0 Острый гингивит";
	if (nameLower.includes("отбеливание")) return "K03.6 Отложения [наросты] на зубах";
	return undefined;
}

function buildGroupedProcedures(): GroupedClinicalProcedure[] {
	const map = new Map<string, {
		procedureName: string;
		categoryKey: SpecialtyCategoryKey;
		categoryName: string;
		complaints?: ClinicalChunk1142;
		anamnesis?: ClinicalChunk1142;
		objective?: ClinicalChunk1142;
		treatment?: ClinicalChunk1142;
		recommendations?: ClinicalChunk1142;
		fullTemplate?: ClinicalChunk1142;
		chunks: ClinicalChunk1142[];
	}>();

	for (const chunk of ALL_CLINICAL_CHUNKS_1142) {
		if (chunk.chunkType === "diagnosis") continue;
		const normProcName = chunk.procedureName.trim();
		const key = `${chunk.categoryKey}:${normProcName.toLowerCase()}`;
		if (!map.has(key)) {
			map.set(key, { procedureName: normProcName, categoryKey: chunk.categoryKey, categoryName: chunk.categoryName, chunks: [] });
		}
		const item = map.get(key)!;
		item.chunks.push(chunk);
		if (chunk.chunkType === "complaints") item.complaints = chunk;
		else if (chunk.chunkType === "anamnesis") item.anamnesis = chunk;
		else if (chunk.chunkType === "objective") item.objective = chunk;
		else if (chunk.chunkType === "treatment") item.treatment = chunk;
		else if (chunk.chunkType === "recommendations") item.recommendations = chunk;
		else if (chunk.chunkType === "full") item.fullTemplate = chunk;
	}

	const result: GroupedClinicalProcedure[] = [];
	let idCounter = 1;
	for (const [, val] of map.entries()) {
		const matchedIcd = matchIcd10ForName(val.procedureName.toLowerCase());
		result.push({
			id: `proc-${idCounter++}`,
			procedureName: val.procedureName,
			categoryKey: val.categoryKey,
			categoryName: val.categoryName,
			totalChunks: val.chunks.length,
			...(val.complaints ? { complaints: val.complaints } : {}),
			...(val.anamnesis ? { anamnesis: val.anamnesis } : {}),
			...(val.objective ? { objective: val.objective } : {}),
			...(val.treatment ? { treatment: val.treatment } : {}),
			...(val.recommendations ? { recommendations: val.recommendations } : {}),
			...(val.fullTemplate ? { fullTemplate: val.fullTemplate } : {}),
			...(matchedIcd ? { matchedIcd10: matchedIcd } : {}),
		});
	}
	return result;
}

export const GROUPED_CLINICAL_PROCEDURES: readonly GroupedClinicalProcedure[] =
	buildGroupedProcedures();
