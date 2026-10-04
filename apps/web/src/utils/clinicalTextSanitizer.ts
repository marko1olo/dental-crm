/**
 * CLINICAL TEXT SANITIZER & MULTI-TOOTH INTEGRITY ENGINE (Form 043/u & Mandates 8b, 8e, 8n)
 *
 * 1. Multi-tooth diagnosis merger:
 *    Formats diagnoses by tooth: `[Зуб 16: K02.1 Кариес дентина]`, `[Зуб 17: K04.0 Острый пульпит]`.
 *    Preserves existing teeth when adding or modifying diagnoses.
 *    Updates in-place if a tooth diagnosis changes without duplicating the tooth.
 *
 * 2. Physiological norm contradiction sanitizer:
 *    When pathology is applied, removes mutually exclusive phrases such as
 *    «Зубной ряд интактен», «Зубы интактны», «Патологии твердых тканей не выявлено», «Кариозных полостей не обнаружено»
 *    while preserving general mucous membrane status.
 *    Replaces default Norm diagnosis (Z01.2) when pathology is introduced.
 *
 * 3. Multi-tooth objective status & treatment plan merger:
 *    Cleanly segments observations and treatments per tooth (`Зуб 16: ...\n\nЗуб 17: ...`).
 */

export interface ToothDiagnosisEntry {
	toothNumber: number;
	diagnosis: string;
	icd10?: string | undefined;
	cavity?: string | undefined;
}

/** Список фраз физиологической нормы, противоречащих наличию кариеса, пульпита или удаления */
const CONTRADICTORY_NORM_PHRASES: readonly RegExp[] = [
	/Зубной ряд интактен[.,;]?/gi,
	/Зубные ряды интактны[.,;]?/gi,
	/Зубы интактны[.,;]?/gi,
	/патологии твердых тканей не выявлено[.,;]?/gi,
	/патологии не выявлено[.,;]?/gi,
	/кариозных полостей не обнаружено[.,;]?/gi,
	/признаков воспаления и кариозного процесса нет[.,;]?/gi,
	/зубы устойчивы, интактны[.,;]?/gi,
	/полость рта санирована[.,;]?/gi,
];

/**
 * Очищает клинический текст от взаимоисключающих утверждений о «норме»,
 * если в протокол добавляется патология зуба (кариес, пульпит, периодонтит, удаление).
 */
export function sanitizeClinicalNormContradictions(
	existingText: string | undefined | null,
	hasPathology: boolean = true,
): string {
	if (!existingText || typeof existingText !== "string") return "";
	let cleaned = existingText.trim();
	if (!cleaned || !hasPathology) return cleaned;

	for (const pattern of CONTRADICTORY_NORM_PHRASES) {
		cleaned = cleaned.replace(pattern, "").trim();
	}

	// Если есть жалобы на боль, убираем фразу "Жалоб нет"
	if (/бол|ныть|отек|реакци/i.test(cleaned)) {
		cleaned = cleaned.replace(/жалоб\s+нет[.,;]?/gi, "").trim();
	}

	// Убираем двойные точки, двойные запятые и лишние пробелы, оставшиеся после вырезания
	cleaned = cleaned
		.replace(/\s{2,}/g, " ")
		.replace(/\s+([.,;:])/g, "$1")
		.replace(/([.,;:])\1+/g, "$1")
		.replace(/^\s*[.,;:]\s*/g, "")
		.replace(/\n\s*\n\s*\n/g, "\n\n")
		.trim();

	return cleaned;
}

/**
 * Форматирует клинический диагноз зуба в стандартизированный вид:
 * `[Зуб XX: <диагноз>]` или `[Зуб XX: <диагноз> (MOD)]`
 */
export function formatToothDiagnosis(
	toothNumber: number,
	rawDiagnosis: string,
	cavity?: string,
): string {
	let cleanDiag = (rawDiagnosis || "").trim();

	// Убираем внешние скобки если уже есть [Зуб XX: ...]
	const match = cleanDiag.match(/^\[Зуб\s+\d+:\s*(.*)\]$/i);
	if (match && match[1]) {
		cleanDiag = match[1].trim();
	}

	// Убираем префикс «зуба XX» если он уже есть в тексте
	cleanDiag = cleanDiag.replace(new RegExp(`\\s*зуба\\s+${toothNumber}`, "gi"), "").trim();
	cleanDiag = cleanDiag.replace(new RegExp(`\\s*\\(зуб\\s+${toothNumber}\\)`, "gi"), "").trim();

	// Добавляем полость (MOD, MO, OD и др.) если указана и еще не содержится в тексте
	if (cavity && cavity.trim()) {
		const normCavity = cavity.trim().toUpperCase();
		if (!cleanDiag.toUpperCase().includes(normCavity)) {
			cleanDiag = `${cleanDiag} (${normCavity})`;
		}
	}

	return `[Зуб ${toothNumber}: ${cleanDiag}]`;
}

export type MultiToothDiagnosesResult = Map<number, string> & {
	toothEntries: Map<number, string>;
	generalDiagnoses: string[];
};

/**
 * Разбирает строку диагнозов на структурированные элементы по зубам и общие диагнозы.
 * Возвращает расширенный Map, поддерживающий map.size, map.get(), а также .toothEntries и .generalDiagnoses.
 */
export function parseMultiToothDiagnoses(
	diagnosisString: string | undefined | null,
): MultiToothDiagnosesResult {
	const toothEntries = new Map<number, string>();
	const generalDiagnoses: string[] = [];

	if (diagnosisString && typeof diagnosisString === "string") {
		// Регулярное выражение для поиска блоков [Зуб XX: ...]
		const bracketRegex = /\[Зуб\s+(\d+):\s*([^\]]+)\]/gi;
		let match: RegExpExecArray | null;
		let foundAnyBracket = false;

		while ((match = bracketRegex.exec(diagnosisString)) !== null) {
			foundAnyBracket = true;
			const rawTooth = match[1];
			const rawDiag = match[2];
			if (rawTooth && rawDiag) {
				const toothNum = Number.parseInt(rawTooth, 10);
				const diagContent = rawDiag.trim();
				toothEntries.set(toothNum, diagContent);
			}
		}

		// Если скобочных записей не было, пробуем разобрать стандартные разделители (;, \n)
		if (!foundAnyBracket) {
			const parts = diagnosisString.split(/[;\n]+/).map((p) => p.trim()).filter(Boolean);
			for (const part of parts) {
				const toothMatch = part.match(/(?:зуб|зуба|#)\s*(\d{2})/i);
				if (toothMatch && toothMatch[1]) {
					const num = Number.parseInt(toothMatch[1], 10);
					let cleanedPart = part
						.replace(new RegExp(`\\s*\\(?зуб(?:а)?\\s*${num}\\)?[:\\s]*`, "gi"), "")
						.trim();
					cleanedPart = cleanedPart.replace(/^\[|\]$/g, "").trim();
					toothEntries.set(num, cleanedPart);
				} else if (part.trim()) {
					if (!/Z01\.2/i.test(part)) {
						generalDiagnoses.push(part.trim());
					}
				}
			}
		}
	}

	const result = toothEntries as MultiToothDiagnosesResult;
	result.toothEntries = toothEntries;
	result.generalDiagnoses = generalDiagnoses;
	return result;
}

/**
 * Объединяет новый диагноз зуба с существующими диагнозами карты приёма:
 * - Если диагноз для зуба уже был — обновляет его на месте.
 * - Если диагноз для другого зуба — аккуратно дописывает через `; `.
 * - Если в диагнозе была только норма Z01.2 — заменяет её на конкретный зуб.
 * - Форматирует результат в виде: `[Зуб 16: K02.1 Кариес дентина (MOD)]; [Зуб 17: K04.0 Острый пульпит]`
 */
export function mergeMultiToothDiagnoses(
	currentDiagnoses: string | undefined | null,
	newEntry:
		| {
				toothNumber?: number | null | undefined;
				diagnosis: string;
				icd10?: string | undefined;
				cavity?: string | undefined;
		  }
		| string,
): string {
	const rawCurrent = (currentDiagnoses || "").trim();

	// Если пришла просто строка без зуба
	if (typeof newEntry === "string") {
		const trimmed = newEntry.trim();
		if (!trimmed) return rawCurrent;
		if (!rawCurrent || /Z01\.2/i.test(rawCurrent)) {
			return trimmed;
		}
		if (rawCurrent.includes(trimmed)) return rawCurrent;
		return `${rawCurrent}; ${trimmed}`;
	}

	const { toothNumber, diagnosis, icd10, cavity } = newEntry;
	const cleanDiagText = (diagnosis || "").trim();
	if (!cleanDiagText) return rawCurrent;

	// Если зуб не указан — ведем себя как общий диагноз
	if (!toothNumber || toothNumber < 11 || toothNumber > 85) {
		if (!rawCurrent || /Z01\.2/i.test(rawCurrent)) {
			return cleanDiagText;
		}
		if (rawCurrent.includes(cleanDiagText)) return rawCurrent;
		return `${rawCurrent}; ${cleanDiagText}`;
	}

	const { toothEntries, generalDiagnoses } = parseMultiToothDiagnoses(rawCurrent);

	// Очищаем текст диагноза зуба от возможных внутренних тегов [Зуб X: ...]
	let pureDiag = cleanDiagText.replace(/^\[Зуб\s+\d+:\s*(.*)\]$/i, "$1").trim();
	pureDiag = pureDiag.replace(new RegExp(`\\s*зуба\\s+${toothNumber}`, "gi"), "").trim();
	pureDiag = pureDiag.replace(new RegExp(`\\s*\\(зуб\\s+${toothNumber}\\)`, "gi"), "").trim();

	// Если передан отдельный icd10 и он отсутствует в названии диагноза — добавляем
	if (icd10 && !pureDiag.includes(icd10)) {
		pureDiag = `${icd10} ${pureDiag}`.trim();
	}

	// Полость по Блэку
	if (cavity && cavity.trim()) {
		const cUpper = cavity.trim().toUpperCase();
		if (!pureDiag.toUpperCase().includes(cUpper)) {
			pureDiag = `${pureDiag} (${cUpper})`;
		}
	}

	// Обновляем или добавляем зуб
	toothEntries.set(toothNumber, pureDiag);

	// Собираем обратно
	const formattedList: string[] = [];

	// Сортируем зубы по номеру FDI для идеального клинического порядка
	const sortedTeeth = Array.from(toothEntries.keys()).sort((a, b) => a - b);
	for (const tooth of sortedTeeth) {
		const diag = toothEntries.get(tooth)!;
		formattedList.push(`[Зуб ${tooth}: ${diag}]`);
	}

	// Добавляем общие диагнозы (без Z01.2, так как есть патология)
	for (const gen of generalDiagnoses) {
		if (gen && !/Z01\.2/i.test(gen)) {
			formattedList.push(gen);
		}
	}

	return formattedList.join("; ");
}

export type ToothSectionEntry = {
	toothNumber?: number | null | undefined;
	content: string;
};

/**
 * Объединяет объективный статус (status localis) нескольких зубов,
 * удаляя противоречия с нормой («Зубной ряд интактен») и аккуратно структурируя записи по зубам.
 */
export function mergeMultiToothObjective(
	currentObjective: string | undefined | null,
	newTextOrEntry: string | ToothSectionEntry | undefined | null,
	toothNumberParam?: number | null,
): string {
	let nextText = "";
	let toothNumber = toothNumberParam;

	if (typeof newTextOrEntry === "object" && newTextOrEntry !== null) {
		nextText = newTextOrEntry.content || "";
		if (newTextOrEntry.toothNumber) {
			toothNumber = newTextOrEntry.toothNumber;
		}
	} else if (typeof newTextOrEntry === "string") {
		nextText = newTextOrEntry;
	}

	const nextTrimmed = (nextText || "").trim();
	if (!nextTrimmed) return (currentObjective || "").trim();

	// Очищаем текущий текст от противоречий с нормой
	let base = sanitizeClinicalNormContradictions(currentObjective, true);

	if (!base) {
		if (toothNumber && !nextTrimmed.startsWith(`Зуб ${toothNumber}:`)) {
			return `Зуб ${toothNumber}: ${nextTrimmed}`;
		}
		return nextTrimmed;
	}

	// Если уже содержит ровно этот текст — не дублируем
	if (base.includes(nextTrimmed)) {
		return base;
	}

	const toothPrefix = toothNumber ? `Зуб ${toothNumber}:` : "";
	const blockToAdd =
		toothNumber && !nextTrimmed.startsWith(toothPrefix)
			? `${toothPrefix} ${nextTrimmed}`
			: nextTrimmed;

	// Если указан номер зуба, проверяем, есть ли уже блок для этого зуба
	if (toothNumber && toothNumber >= 11 && toothNumber <= 85) {
		const toothMarker = `Зуб ${toothNumber}:`;
		if (base.includes(toothMarker)) {
			const toothRegex = new RegExp(`(?:^|\\n\\n)(${toothMarker}[^\\n]*(?:\\n(?!Зуб \\d+:)[^\\n]*)*)`, "i");
			const match = base.match(toothRegex);
			if (match && match[1]) {
				return base.replace(match[1], blockToAdd).trim();
			}
		}
	}

	return `${base}\n\n${blockToAdd}`.trim();
}

/**
 * Объединяет план лечения нескольких зубов:
 * - Если запись для зуба уже есть — обновляет её.
 * - Если для нового зуба — аккуратно добавляет.
 */
export function mergeMultiToothTreatmentPlan(
	currentPlan: string | undefined | null,
	newPlanOrEntry: string | ToothSectionEntry | undefined | null,
	toothNumberParam?: number | null,
): string {
	let nextPlan = "";
	let toothNumber = toothNumberParam;

	if (typeof newPlanOrEntry === "object" && newPlanOrEntry !== null) {
		nextPlan = newPlanOrEntry.content || "";
		if (newPlanOrEntry.toothNumber) {
			toothNumber = newPlanOrEntry.toothNumber;
		}
	} else if (typeof newPlanOrEntry === "string") {
		nextPlan = newPlanOrEntry;
	}

	const nextTrimmed = (nextPlan || "").trim();
	if (!nextTrimmed) return (currentPlan || "").trim();

	const base = (currentPlan || "").trim();
	const toothPrefix = toothNumber ? `Зуб ${toothNumber}:` : "";
	const blockToAdd =
		toothNumber && !nextTrimmed.startsWith(toothPrefix)
			? `${toothPrefix} ${nextTrimmed}`
			: nextTrimmed;

	if (!base) return blockToAdd;
	if (base.includes(blockToAdd)) return base;

	// Если указан зуб и блок уже существует
	if (toothNumber && toothNumber >= 11 && toothNumber <= 85) {
		const toothMarker = `Зуб ${toothNumber}:`;
		if (base.includes(toothMarker)) {
			const toothRegex = new RegExp(`(?:^|\\n\\n)(${toothMarker}[^\\n]*(?:\\n(?!Зуб \\d+:)[^\\n]*)*)`, "i");
			const match = base.match(toothRegex);
			if (match && match[1]) {
				return base.replace(match[1], blockToAdd).trim();
			}
		}
	}

	return `${base}\n\n${blockToAdd}`.trim();
}

/**
 * Санитизирует всю форму визита VisitNoteForm:
 * устраняет противоречия между нормой и патологиями по всем зубам.
 */
export function sanitizeVisitNoteFormFields<T extends Record<string, any>>(form: T): T {
	if (!form) return form;

	const hasSpecificTeeth =
		Boolean(form.diagnosis && /(?:\[)?Зуб\s+\d+:/i.test(form.diagnosis)) ||
		Boolean(form.objectiveStatus && /Зуб\s+\d+:/i.test(form.objectiveStatus)) ||
		Boolean(form.complaint && /Зуб\s+\d+:/i.test(form.complaint));

	let cleanComplaint = form.complaint || "";
	let cleanObjective = form.objectiveStatus || "";

	if (hasSpecificTeeth) {
		cleanComplaint = sanitizeClinicalNormContradictions(cleanComplaint, true);
		cleanObjective = sanitizeClinicalNormContradictions(cleanObjective, true);
	}

	return {
		...form,
		complaint: cleanComplaint,
		objectiveStatus: cleanObjective,
	};
}
