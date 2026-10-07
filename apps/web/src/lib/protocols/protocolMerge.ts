import { synthesizeProtocolFromOrder804nService } from "@dental/shared";
import type {
	DiaryState,
	ClinicalProtocolSoap,
	MergeSoapOptions,
} from "./protocolTypes.js";
import { normalizeFdiToothList } from "./fdiAnatomy.js";

/**
 * Неразрушающее слияние (Non-Destructive Merge) данных SOAP-дневника.
 */
export function mergeSoapDiaryState(
	existing: DiaryState,
	incoming: Partial<DiaryState> | ClinicalProtocolSoap,
	options?: MergeSoapOptions,
): DiaryState {
	const strategy = options?.strategy ?? "smart_append";
	const deduplicate = options?.deduplicate ?? true;

	if (strategy === "replace") {
		return {
			anamnesis: incoming.anamnesis ?? existing.anamnesis,
			statusLocalis: incoming.statusLocalis ?? existing.statusLocalis,
			diagnosisIcd10: incoming.diagnosisIcd10 ?? existing.diagnosisIcd10,
			diagnosisTooth: incoming.diagnosisTooth
				? normalizeFdiToothList(incoming.diagnosisTooth)
				: existing.diagnosisTooth,
			treatmentDescription:
				incoming.treatmentDescription ?? existing.treatmentDescription,
			complications: incoming.complications ?? existing.complications,
			comorbidities: incoming.comorbidities ?? existing.comorbidities,
		};
	}

	const mergeText = (current: string, next?: string | null): string => {
		const curTrim = (current ?? "").trim();
		const nextTrim = (next ?? "").trim();
		if (!nextTrim) return curTrim;
		if (!curTrim) return nextTrim;

		if (strategy === "fill_blanks_only") {
			return curTrim;
		}

		// smart_append
		if (deduplicate && curTrim.includes(nextTrim)) {
			return curTrim;
		}

		return `${curTrim}\n\n${nextTrim}`;
	};

	// Слияние списка зубов по FDI
	const mergeTeeth = (
		currentTooth: string,
		nextTooth?: string | null,
	): string => {
		const curTrim = (currentTooth ?? "").trim();
		const nextTrim = (nextTooth ?? "").trim();
		if (!nextTrim) return curTrim;
		if (!curTrim) return normalizeFdiToothList(nextTrim);
		return normalizeFdiToothList(`${curTrim}, ${nextTrim}`);
	};

	// Слияние МКБ-10
	const mergeIcd10 = (currentIcd: string, nextIcd?: string | null): string => {
		const curTrim = (currentIcd ?? "").trim();
		const nextTrim = (nextIcd ?? "").trim();
		if (!curTrim) return nextTrim;
		if (!nextTrim) return curTrim;
		if (strategy === "fill_blanks_only") return curTrim;
		// Если текущий код был нормой Z01, а пришла патология — вытесняем норму патологией
		if (curTrim.toUpperCase().startsWith("Z01") && !nextTrim.toUpperCase().startsWith("Z01")) {
			return nextTrim;
		}
		// Объединяем уникальные коды МКБ через точку с запятой
		const existingCodes = curTrim.split(/[;,]/).map((c) => c.trim()).filter(Boolean);
		const newCodes = nextTrim.split(/[;,]/).map((c) => c.trim()).filter(Boolean);
		const allCodes = Array.from(new Set([...existingCodes, ...newCodes]));
		return allCodes.join("; ");
	};

	return {
		anamnesis: mergeText(existing.anamnesis, incoming.anamnesis),
		statusLocalis: mergeText(existing.statusLocalis, incoming.statusLocalis),
		diagnosisIcd10: mergeIcd10(
			existing.diagnosisIcd10,
			incoming.diagnosisIcd10,
		),
		diagnosisTooth: mergeTeeth(
			existing.diagnosisTooth,
			incoming.diagnosisTooth,
		),
		treatmentDescription: mergeText(
			existing.treatmentDescription,
			incoming.treatmentDescription,
		),
		complications: mergeText(existing.complications, incoming.complications),
		comorbidities: mergeText(existing.comorbidities, incoming.comorbidities),
	};
}

/**
 * 100% неразрушающее применение услуги Номенклатуры 804н к SOAP-дневнику врача.
 * Гарантирует сохранение ранее введенного врачом текста (жалобы, статус, сопутствующие патологии).
 */
export function applyOrder804nServiceToSoapDiary(
	current: DiaryState,
	code804n: string,
	toothNumber?: number | string,
): DiaryState {
	const def = synthesizeProtocolFromOrder804nService(
		code804n,
		toothNumber !== undefined ? { toothNumber } : undefined,
	);

	const currentAnamnesis = (current.anamnesis ?? "").trim();
	const nextAnamnesis = currentAnamnesis || def.defaultSubjective || "";

	const currentStatus = (current.statusLocalis ?? "").trim();
	const nextStatus = currentStatus || def.defaultStatusLocalis || "";

	const currentTreatment = (current.treatmentDescription ?? "").trim();
	let nextTreatment = currentTreatment;
	if (def.protocolStepRu && !currentTreatment.includes(def.protocolStepRu)) {
		nextTreatment = currentTreatment
			? `${currentTreatment}\n\n${def.protocolStepRu}`
			: def.protocolStepRu;
	}

	const currentIcd = (current.diagnosisIcd10 ?? "").trim();
	const nextIcd = currentIcd || def.primaryIcd10;

	const currentTooth = (current.diagnosisTooth ?? "").trim();
	const nextTooth = toothNumber
		? (currentTooth ? normalizeFdiToothList(`${currentTooth}, ${toothNumber}`) : String(toothNumber))
		: currentTooth;

	return {
		anamnesis: nextAnamnesis,
		statusLocalis: nextStatus,
		diagnosisIcd10: nextIcd,
		diagnosisTooth: nextTooth,
		treatmentDescription: nextTreatment,
		complications: current.complications ?? "",
		comorbidities: current.comorbidities ?? "",
	};
}

/**
 * Неразрушающее добавление клинической рекомендации в поле лечения и рекомендаций (P).
 */
export function appendRecommendationToSoap(
	diary: DiaryState,
	recommendationText: string,
): DiaryState {
	const cur = ((diary as any).treatmentPlan || diary.treatmentDescription || "").trim();
	const recTrim = (recommendationText ?? "").trim();
	if (!recTrim) return diary;
	if (cur.includes(recTrim)) return diary;

	const hasRecSection =
		cur.includes("Рекомендации:") || cur.includes("Рекомендовано:");
	let nextTreatment = cur;
	if (!cur) {
		nextTreatment = `Рекомендации:\n- ${recTrim}`;
	} else if (hasRecSection) {
		nextTreatment = `${cur}\n- ${recTrim}`;
	} else {
		nextTreatment = `${cur}\n\nРекомендации:\n- ${recTrim}`;
	}

	return {
		...diary,
		treatmentDescription: nextTreatment,
	};
}
