/**
 * apps/web/src/components/visit/clinicalCatalog/clinicalProtocolsCatalog.ts
 *
 * Промышленный каталог 1 142 клинических протоколов, дневников приёма и диагнозов МКБ-10
 * на основе реверс-инжиниринга DentalPRO / IDENT / СтАР.
 *
 * Мандаты:
 * - 8e: Автономия врача (1-клик вставка жалоб, анамнеза, статуса, протокола лечения, рекомендаций).
 * - 8y: Тотальный запрет на советский канцелярский шифр «043/у» — строго «Карта приёма», «Дневник приёма».
 * - 8s: Промышленная полнота данных (все 1 142 чанка) без урезанных заглушек.
 */

import rawChunksData from "./protocols1142Data.json";

export type ChunkType =
	| "complaints"
	| "anamnesis"
	| "objective"
	| "treatment"
	| "recommendations"
	| "full"
	| "diagnosis"
	| "other";

export type SpecialtyCategoryKey =
	| "all"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "pediatric"
	| "hygiene"
	| "bleaching"
	| "periodontics"
	| "icd10"
	| "comprehensive";

export interface ClinicalChunk1142 {
	readonly id: number;
	readonly name: string;
	readonly categoryName: string;
	readonly categoryKey: SpecialtyCategoryKey;
	readonly categoryId: number;
	readonly chunkType: ChunkType;
	readonly procedureName: string;
	readonly text: string;
	readonly icd10?: string;
}

export interface GroupedClinicalProcedure {
	readonly id: string;
	readonly procedureName: string;
	readonly categoryKey: SpecialtyCategoryKey;
	readonly categoryName: string;
	readonly complaints?: ClinicalChunk1142;
	readonly anamnesis?: ClinicalChunk1142;
	readonly objective?: ClinicalChunk1142;
	readonly treatment?: ClinicalChunk1142;
	readonly recommendations?: ClinicalChunk1142;
	readonly fullTemplate?: ClinicalChunk1142;
	readonly matchedIcd10?: string;
	readonly totalChunks: number;
}

export interface SpecialtyCategoryMeta {
	readonly key: SpecialtyCategoryKey;
	readonly label: string;
	readonly shortLabel: string;
	readonly count: number;
}

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

/**
 * Кэш сгруппированных клинических процедур (по базовому имени процедуры)
 */
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
			map.set(key, {
				procedureName: normProcName,
				categoryKey: chunk.categoryKey,
				categoryName: chunk.categoryName,
				chunks: [],
			});
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
		// Поиск подходящего МКБ-10 кода по совпадению названия
		const nameLower = val.procedureName.toLowerCase();
		let matchedIcd: string | undefined;

		if (nameLower.includes("кариес дентина")) matchedIcd = "K02.1 Кариес дентина";
		else if (nameLower.includes("кариес эмали")) matchedIcd = "K02.0 Кариес эмали";
		else if (nameLower.includes("кариес цемента")) matchedIcd = "K02.2 Кариес цемента";
		else if (nameLower.includes("пульпит")) matchedIcd = "K04.0 Пульпит";
		else if (nameLower.includes("периодонтит")) matchedIcd = "K04.5 Хронический апикальный периодонтит";
		else if (nameLower.includes("имплантация") || nameLower.includes("имплант")) matchedIcd = "K08.1 Потеря зубов вследствие несчастного случая, удаления";
		else if (nameLower.includes("удаление")) matchedIcd = "K04.8 Другие и неуточненные болезни пульпы и периапикальных тканей";
		else if (nameLower.includes("гигиен")) matchedIcd = "K05.0 Острый гингивит";
		else if (nameLower.includes("отбеливание")) matchedIcd = "K03.6 Отложения [наросты] на зубах";

		result.push({
			id: `proc-${idCounter++}`,
			procedureName: val.procedureName,
			categoryKey: val.categoryKey,
			categoryName: val.categoryName,
			complaints: val.complaints,
			anamnesis: val.anamnesis,
			objective: val.objective,
			treatment: val.treatment,
			recommendations: val.recommendations,
			fullTemplate: val.fullTemplate,
			matchedIcd10: matchedIcd,
			totalChunks: val.chunks.length,
		});
	}

	return result;
}

export const GROUPED_CLINICAL_PROCEDURES: readonly GroupedClinicalProcedure[] =
	buildGroupedProcedures();

/**
 * Поиск по 1 142 клиническим чанкам
 */
export function searchClinicalChunks(
	query: string,
	categoryKey: SpecialtyCategoryKey = "all",
	chunkType?: ChunkType,
): readonly ClinicalChunk1142[] {
	const q = query.trim().toLowerCase();
	let pool = ALL_CLINICAL_CHUNKS_1142;

	if (categoryKey !== "all") {
		pool = pool.filter((c) => c.categoryKey === categoryKey);
	}

	if (chunkType) {
		pool = pool.filter((c) => c.chunkType === chunkType);
	}

	if (!q) {
		return pool;
	}

	return pool.filter((c) => {
		return (
			c.name.toLowerCase().includes(q) ||
			c.procedureName.toLowerCase().includes(q) ||
			c.text.toLowerCase().includes(q) ||
			(c.icd10 && c.icd10.toLowerCase().includes(q))
		);
	});
}

/**
 * Поиск по сгруппированным клиническим процедурам
 */
export function searchGroupedProcedures(
	query: string,
	categoryKey: SpecialtyCategoryKey = "all",
): readonly GroupedClinicalProcedure[] {
	const q = query.trim().toLowerCase();
	let pool = GROUPED_CLINICAL_PROCEDURES;

	if (categoryKey !== "all" && categoryKey !== "icd10") {
		pool = pool.filter((p) => p.categoryKey === categoryKey);
	}

	if (!q) {
		return pool;
	}

	return pool.filter((p) => {
		return (
			p.procedureName.toLowerCase().includes(q) ||
			p.categoryName.toLowerCase().includes(q) ||
			(p.matchedIcd10 && p.matchedIcd10.toLowerCase().includes(q)) ||
			(p.complaints?.text && p.complaints.text.toLowerCase().includes(q)) ||
			(p.treatment?.text && p.treatment.text.toLowerCase().includes(q)) ||
			(p.objective?.text && p.objective.text.toLowerCase().includes(q))
		);
	});
}

/**
 * Вспомогательная функция для склейки клинического текста без дублирования
 */
export function appendClinicalText(
	existing: string | undefined | null,
	addition: string,
	separator = "\n",
): string {
	const cur = (existing ?? "").trim();
	const add = addition.trim();
	if (!add) return cur;
	if (!cur) return add;
	if (cur.includes(add)) return cur;
	return `${cur}${separator}${add}`;
}

export interface VisitNoteFieldsPatch {
	complaint?: string;
	anamnesis?: string;
	objectiveStatus?: string;
	treatmentPlan?: string;
	recommendations?: string;
	diagnosis?: string;
}

/**
 * Формирует обновленные поля дневника приёма при применении всей процедуры (1-Click)
 */
export function buildProcedureVisitNotePatch(
	procedure: GroupedClinicalProcedure,
	currentForm: Record<string, any> = {},
	targetTooth?: number | null,
): VisitNoteFieldsPatch {
	const toothPrefix = targetTooth ? `Зуб ${targetTooth}: ` : "";
	const patch: VisitNoteFieldsPatch = {};

	if (procedure.complaints?.text) {
		patch.complaint = appendClinicalText(
			currentForm.complaint,
			procedure.complaints.text,
		);
	}

	if (procedure.anamnesis?.text) {
		patch.anamnesis = appendClinicalText(
			currentForm.anamnesis,
			procedure.anamnesis.text,
		);
	}

	if (procedure.objective?.text) {
		const objText = `${toothPrefix}${procedure.objective.text}`;
		patch.objectiveStatus = appendClinicalText(
			currentForm.objectiveStatus,
			objText,
		);
	}

	if (procedure.treatment?.text) {
		const treatText = `${toothPrefix}${procedure.treatment.text}`;
		patch.treatmentPlan = appendClinicalText(
			currentForm.treatmentPlan,
			treatText,
		);
	} else if (procedure.fullTemplate?.text) {
		const fullText = `${toothPrefix}${procedure.fullTemplate.text}`;
		patch.treatmentPlan = appendClinicalText(
			currentForm.treatmentPlan,
			fullText,
		);
	}

	if (procedure.recommendations?.text) {
		patch.recommendations = appendClinicalText(
			currentForm.recommendations,
			procedure.recommendations.text,
		);
	}

	if (procedure.matchedIcd10) {
		const newDiag = targetTooth
			? `${procedure.matchedIcd10} (зуб ${targetTooth})`
			: procedure.matchedIcd10;
		patch.diagnosis = appendClinicalText(
			currentForm.diagnosis,
			newDiag,
			"; ",
		);
	}

	return patch;
}

/**
 * Формирует обновление полей при применении одиночного чанка
 */
export function buildChunkVisitNotePatch(
	chunk: ClinicalChunk1142,
	currentForm: Record<string, any> = {},
	targetTooth?: number | null,
): VisitNoteFieldsPatch {
	const toothPrefix = targetTooth ? `Зуб ${targetTooth}: ` : "";
	const patch: VisitNoteFieldsPatch = {};

	switch (chunk.chunkType) {
		case "complaints":
			patch.complaint = appendClinicalText(currentForm.complaint, chunk.text);
			break;
		case "anamnesis":
			patch.anamnesis = appendClinicalText(currentForm.anamnesis, chunk.text);
			break;
		case "objective":
			patch.objectiveStatus = appendClinicalText(
				currentForm.objectiveStatus,
				`${toothPrefix}${chunk.text}`,
			);
			break;
		case "treatment":
		case "full":
			patch.treatmentPlan = appendClinicalText(
				currentForm.treatmentPlan,
				`${toothPrefix}${chunk.text}`,
			);
			break;
		case "recommendations":
			patch.recommendations = appendClinicalText(
				currentForm.recommendations,
				chunk.text,
			);
			break;
		case "diagnosis": {
			const newDiag = targetTooth
				? `${chunk.name} (зуб ${targetTooth})`
				: chunk.name;
			patch.diagnosis = appendClinicalText(currentForm.diagnosis, newDiag, "; ");
			break;
		}
		default:
			patch.treatmentPlan = appendClinicalText(
				currentForm.treatmentPlan,
				`${toothPrefix}${chunk.text}`,
			);
			break;
	}

	return patch;
}
