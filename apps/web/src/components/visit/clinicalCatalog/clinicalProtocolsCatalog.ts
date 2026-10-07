/**
 * apps/web/src/components/visit/clinicalCatalog/clinicalProtocolsCatalog.ts
 *
 * Промышленный каталог 1 142 клинических протоколов, дневников приёма и диагнозов МКБ-10
 * на основе реверс-инжиниринга DentalPRO / IDENT / СтАР.
 *
 * Мандаты:
 * - 8e: Автономия врача (быстрая вставка жалоб, анамнеза, статуса, протокола лечения, рекомендаций).
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
	readonly complaints?: ClinicalChunk1142 | undefined;
	readonly anamnesis?: ClinicalChunk1142 | undefined;
	readonly objective?: ClinicalChunk1142 | undefined;
	readonly treatment?: ClinicalChunk1142 | undefined;
	readonly recommendations?: ClinicalChunk1142 | undefined;
	readonly fullTemplate?: ClinicalChunk1142 | undefined;
	readonly matchedIcd10?: string | undefined;
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

		const itemObj: GroupedClinicalProcedure = {
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
		};
		result.push(itemObj);
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

export interface ClinicalProtocolMatchResult {
	readonly procedure: GroupedClinicalProcedure;
	readonly procedureId: string;
	readonly procedureName: string;
	readonly categoryKey: SpecialtyCategoryKey;
	readonly categoryName: string;
	readonly score: number;
	readonly targetTooth: number | null;
	readonly tooth: number | null;
	readonly specialtyKey: SpecialtyCategoryKey;
	readonly matchedIcd10?: string | undefined;
	readonly patch: VisitNoteFieldsPatch;
	readonly recommendedToothState: "treatment" | "done" | "missing" | "idle";
	readonly alternatives: readonly GroupedClinicalProcedure[];
}

/**
 * Извлекает валидный номер зуба по FDI (11..48, 51..85) из текста запроса врача
 */
export function extractFdiToothFromText(text: string): number | null {
	// Паттерны вида: зуб 16, зуба 24, на 36, для 46, #16, 16 зуб, 16-й зуб
	const patterns = [
		/(?:зуб[аеы]?\s*#?\s*)(\d{2})\b/i,
		/(?:на|для|област[иь]|в)\s*#?(\d{2})\b/i,
		/\b(\d{2})\s*(?:зуб[аеы]?|-?[йяе] зуб[аеы]?)\b/i,
		/#(\d{2})\b/,
		/\b([1-8][1-8])\b/,
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const num = Number(match[1]);
			if (
				(num >= 11 && num <= 18) ||
				(num >= 21 && num <= 28) ||
				(num >= 31 && num <= 38) ||
				(num >= 41 && num <= 48) ||
				(num >= 51 && num <= 55) ||
				(num >= 61 && num <= 65) ||
				(num >= 71 && num <= 75) ||
				(num >= 81 && num <= 85)
			) {
				return num;
			}
		}
	}
	return null;
}

/**
 * Интеллектуальный поиск наиболее релевантного клинического протокола из каталога 1 142.
 * Исключает переполнение контекста LLM: поиск выполняется за <2мс по индексированным SSOT чанкам.
 */
export function findBestClinicalProtocol(
	rawQuery: string,
	optionsOrTooth?: number | null | {
		specialty?: SpecialtyCategoryKey;
		toothNumber?: number | null;
		currentForm?: Record<string, any>;
	},
): ClinicalProtocolMatchResult | null {
	const text = rawQuery.trim();
	if (!text) return null;

	const options = typeof optionsOrTooth === "number"
		? { toothNumber: optionsOrTooth }
		: (optionsOrTooth ?? {});

	const targetTooth = options.toothNumber ?? extractFdiToothFromText(text);
	const lower = text.toLowerCase();

	// Очистка от стоп-слов команд врача
	const cleanPrompt = lower
		.replace(/\b(дента|пожалуйста|заполни|поставь|примени|выбери|протокол|протокола|протоколы|шаблон|шаблона|дневник|дневника|карту|карты|приёма|приема|соап|soap|зуб|зуба|зубе|зубов|на|для|в|по|с|со|области)\b/gi, " ")
		.replace(/\b\d{2}\b/g, " ")
		.replace(/[.,:;!?"'(){}[\]-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	// Определение целевой категории по ключевым словам
	let inferredCategory: SpecialtyCategoryKey = options.specialty ?? "all";
	if (inferredCategory === "all") {
		if (lower.includes("детск") || lower.includes("молочн") || lower.includes("ребен") || (targetTooth && targetTooth >= 51 && targetTooth <= 85)) {
			inferredCategory = "pediatric";
		} else if (lower.includes("удал") || lower.includes("имплант") || lower.includes("синус") || lower.includes("альвеолит") || lower.includes("резекци") || lower.includes("экзостоз") || lower.includes("пластик")) {
			inferredCategory = "surgery";
		} else if (lower.includes("коронк") || lower.includes("винир") || lower.includes("протез") || lower.includes("оттиск") || lower.includes("слепк") || lower.includes("вкладк")) {
			inferredCategory = "orthopedics";
		} else if (lower.includes("гигиен") || lower.includes("чистк") || lower.includes("air flow") || lower.includes("air-flow") || lower.includes("скейлинг") || lower.includes("фторирован")) {
			inferredCategory = "hygiene";
		} else if (lower.includes("отбеливан") || lower.includes("zoom") || lower.includes("opalescence")) {
			inferredCategory = "bleaching";
		} else if (lower.includes("пародонт") || lower.includes("гингивит") || lower.includes("десн") || lower.includes("кюретаж") || lower.includes("вектор")) {
			inferredCategory = "periodontics";
		} else if (lower.includes("кариес") || lower.includes("пульпит") || lower.includes("периодонтит") || lower.includes("эндодонт") || lower.includes("канал")) {
			inferredCategory = "therapy";
		}
	}

	// Клинические маркеры предпочтения
	const isCaries = lower.includes("кариес");
	const isDeepCaries = isCaries && (lower.includes("глубок") || lower.includes("дентин"));
	const isEnamelCaries = isCaries && (lower.includes("эмал") || lower.includes("пятн") || lower.includes("поверхност"));
	const isPulpitis = lower.includes("пульпит") || lower.includes("эндодонт") || lower.includes("депульп") || lower.includes("канал");
	const isPeriodontitis = lower.includes("периодонтит") || lower.includes("гранулем");
	const isExtraction = lower.includes("удал") || lower.includes("экстракц");
	const isRetained = isExtraction && (lower.includes("ретинир") || lower.includes("дистопир") || lower.includes("восьмер") || lower.includes("мудрост"));
	const isImplant = lower.includes("имплант") || lower.includes("имплантац");
	const isSinusLift = lower.includes("синус") || lower.includes("лифтинг");
	const isCrown = lower.includes("коронк") || lower.includes("препарирован") || lower.includes("циркон") || lower.includes("металлокерам");
	const isVeneer = lower.includes("винир");
	const isHygiene = lower.includes("гигиен") || lower.includes("чистк") || lower.includes("air flow") || lower.includes("air-flow") || lower.includes("скейлинг");
	const isBleaching = lower.includes("отбеливан");
	const isPediatric = inferredCategory === "pediatric";

	const scored: Array<{ proc: GroupedClinicalProcedure; score: number }> = [];

	for (const proc of GROUPED_CLINICAL_PROCEDURES) {
		let score = 0;
		const nameLower = proc.procedureName.toLowerCase();
		const catKey = proc.categoryKey;

		// 1. Совпадение категории
		if (inferredCategory !== "all" && catKey === inferredCategory) {
			score += 30;
		}

		// 2. Специфические клинические правила высшего приоритета
		if (isRetained && nameLower.includes("ретинированного")) score += 150;
		if (isExtraction && !isRetained && nameLower === "удаление зуба") score += 120;
		if (isSinusLift && nameLower.includes("синус-лифтинг")) score += 150;
		if (isImplant && !nameLower.includes("удаление") && (nameLower === "имплантация" || nameLower.includes("имплантация"))) score += 120;
		if (isDeepCaries && nameLower === "кариес дентина") score += 140;
		if (isEnamelCaries && nameLower === "кариес эмали") score += 140;
		if (isCaries && !isDeepCaries && !isEnamelCaries && nameLower === "кариес дентина") score += 100;
		if (isPulpitis && (nameLower === "пульпит" || nameLower === "пульпит мол.зуба" || nameLower.startsWith("пульпит"))) score += 130;
		if (isPeriodontitis && (nameLower === "периодонтит" || nameLower === "периодонтит мол.зуба" || nameLower.startsWith("периодонтит"))) score += 130;
		if (isCrown && nameLower.includes("коронку на своих зубах")) score += 130;
		if (isCrown && nameLower.includes("коронки на имплантах") && isImplant) score += 140;
		if (isVeneer && nameLower.includes("виниры")) score += 140;
		if (isHygiene && (nameLower === "профессиональная гигиена" || nameLower === "проф.гигиена")) score += 140;
		if (isBleaching && nameLower.includes("отбеливание")) score += 130;

		if (isPediatric && catKey === "pediatric") {
			score += 50;
			if (isCaries && nameLower.includes("кариес")) score += 60;
			if (isPulpitis && nameLower.includes("пульпит")) score += 60;
		}

		// 3. Совпадение ключевых слов очищенного запроса
		const promptTokens = cleanPrompt.split(/\s+/).filter((t) => t.length >= 3);
		for (const token of promptTokens) {
			if (nameLower.includes(token)) score += 25;
			if (proc.matchedIcd10 && proc.matchedIcd10.toLowerCase().includes(token)) score += 20;
			if (proc.treatment?.text.toLowerCase().includes(token)) score += 10;
			if (proc.complaints?.text.toLowerCase().includes(token)) score += 5;
		}

		if (score > 0) {
			scored.push({ proc, score });
		}
	}

	scored.sort((a, b) => b.score - a.score);

	const best = scored[0];
	if (!best || best.score <= 0) {
		// Фоллбек на базовый кариес дентина
		const fallback = GROUPED_CLINICAL_PROCEDURES.find((p) => p.procedureName.toLowerCase().includes("кариес дентина")) || GROUPED_CLINICAL_PROCEDURES[0];
		if (!fallback) return null;
		const patch = buildProcedureVisitNotePatch(fallback, options.currentForm, targetTooth);
		return {
			procedure: fallback,
			procedureId: fallback.id,
			procedureName: fallback.procedureName,
			categoryKey: fallback.categoryKey,
			categoryName: fallback.categoryName,
			score: 10,
			targetTooth,
			tooth: targetTooth,
			specialtyKey: fallback.categoryKey,
			...(fallback.matchedIcd10 ? { matchedIcd10: fallback.matchedIcd10 } : {}),
			patch,
			recommendedToothState: "treatment",
			alternatives: GROUPED_CLINICAL_PROCEDURES.slice(1, 4),
		};
	}

	const alternatives = scored.slice(1, 4).map((s) => s.proc);
	const patch = buildProcedureVisitNotePatch(best.proc, options.currentForm, targetTooth);

	// Определение рекомендованного статуса одонтограммы
	let recommendedToothState: "treatment" | "done" | "missing" | "idle" = "treatment";
	const bestName = best.proc.procedureName.toLowerCase();
	const bestCat = best.proc.categoryKey;

	if (bestCat === "surgery" && (bestName.includes("удаление") || bestName.includes("ретинир"))) {
		recommendedToothState = "missing";
	} else if (bestCat === "orthopedics" || bestName.includes("имплант") || bestName.includes("коронк") || bestName.includes("винир") || bestName.includes("пломб")) {
		recommendedToothState = "done";
	} else if (bestCat === "hygiene" || bestCat === "bleaching" || bestName.includes("осмотр") || bestName.includes("норма")) {
		recommendedToothState = "idle";
	} else {
		recommendedToothState = "treatment";
	}

	return {
		procedure: best.proc,
		procedureId: best.proc.id,
		procedureName: best.proc.procedureName,
		categoryKey: best.proc.categoryKey,
		categoryName: best.proc.categoryName,
		score: best.score,
		targetTooth,
		tooth: targetTooth,
		specialtyKey: best.proc.categoryKey,
		...(best.proc.matchedIcd10 ? { matchedIcd10: best.proc.matchedIcd10 } : {}),
		patch,
		recommendedToothState,
		alternatives,
	};
}
