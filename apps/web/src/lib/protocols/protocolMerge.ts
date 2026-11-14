import { synthesizeProtocolFromOrder804nService } from "@dental/shared";
import type {
	DiaryState,
	ClinicalProtocolSoap,
	MergeSoapOptions,
} from "./protocolTypes.js";
import { normalizeFdiToothList } from "./fdiAnatomy.js";
import { ICD10_DICTIONARY } from "../icd10.js";

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

/**
 * Код МКБ-10 из текста диагноза ЭМК.
 */
export function icd10CodeFromDiagnosisText(diagnosis: string): string {
	const trimmed = diagnosis.trim();
	if (!trimmed) return "";
	const exact = trimmed.match(/^([A-TV-Z]\d{2}(?:\.\d{1,4})?)$/i);
	const exactCode = exact?.[1];
	if (exactCode) return exactCode.toUpperCase();
	const leading = trimmed.match(/^([A-TV-Z]\d{2}(?:\.\d{1,4})?)\b/i);
	const leadingCode = leading?.[1];
	if (leadingCode) return leadingCode.toUpperCase();
	const embedded = trimmed.match(/\b([A-TV-Z]\d{2}(?:\.\d{1,4})?)\b/i);
	const embeddedCode = embedded?.[1];
	return embeddedCode ? embeddedCode.toUpperCase() : "";
}

/** Зуб по FDI (постоянные 11–48, молочные 51–85) из текста диагноза ЭМК, если указан. */
export function fdiToothFromText(text: string): string {
	const m = text.trim().match(/\b([1-4][1-8]|[5-8][1-5])\b/);
	const tooth = m?.[1];
	return tooth ?? "";
}

/**
 * SOAP-поля дневника из формы ЭМК приёма (visits / visitNoteForm).
 */
export function soapPrefillFromVisitNote(form: {
	complaint?: string | null;
	anamnesis?: string | null;
	objectiveStatus?: string | null;
	diagnosis?: string | null;
	treatmentPlan?: string | null;
}): Partial<DiaryState> {
	const complaint = (form.complaint ?? "").trim();
	const anamnesis = (form.anamnesis ?? "").trim();
	const sParts: string[] = [];
	if (complaint) sParts.push(complaint);
	if (anamnesis && anamnesis !== complaint) sParts.push(anamnesis);

	const out: Partial<DiaryState> = {};
	if (sParts.length > 0) out.anamnesis = sParts.join("\n");

	const objective = (form.objectiveStatus ?? "").trim();
	if (objective) out.statusLocalis = objective;

	const plan = (form.treatmentPlan ?? "").trim();
	if (plan) out.treatmentDescription = plan;

	const diagnosis = (form.diagnosis ?? "").trim();
	const icd = icd10CodeFromDiagnosisText(diagnosis);
	if (icd) out.diagnosisIcd10 = icd;
	const tooth = fdiToothFromText(diagnosis);
	if (tooth) out.diagnosisTooth = tooth;

	return out;
}

/**
 * Разделяет один абзац анамнеза по знакам препинания или семантическим маркерам.
 */
export function splitSingleParagraphAnamnesis(
	text: string,
	currentComplaint?: string,
	currentAnamnesis?: string,
): { complaint: string; anamnesis: string } {
	const cComp = (currentComplaint ?? "").trim();
	const cAnam = (currentAnamnesis ?? "").trim();

	const match = text.match(/^([^.!?]+[.!?]+)\s+([\s\S]+)$/);
	if (match) {
		const firstSentence = (match[1] ?? "").trim();
		const rest = (match[2] ?? "").trim();
		if (firstSentence && rest) {
			return {
				complaint: firstSentence,
				anamnesis: rest,
			};
		}
	}

	const isAnamnesisOnly =
		/\b(соматическ|хроническ|здоров|аллерг|анамнез|ранее)\b/i.test(text);

	if (isAnamnesisOnly && cComp) {
		return { complaint: cComp, anamnesis: text };
	}
	if (isAnamnesisOnly && !cComp) {
		return { complaint: "", anamnesis: text };
	}

	return {
		complaint: text,
		anamnesis: cAnam,
	};
}

/**
 * Разделяет поле `anamnesis` дневника (где жалобы и анамнез объединены)
 * обратно на `complaint` (жалобы) и `anamnesis` (анамнез) для формы ЭМК приёма.
 */
export function splitDiaryAnamnesis(
	text: string,
	currentComplaint?: string,
	currentAnamnesis?: string,
): { complaint: string; anamnesis: string } {
	const trimmed = (text ?? "").trim();
	if (!trimmed) {
		return { complaint: "", anamnesis: "" };
	}

	const cComp = (currentComplaint ?? "").trim();
	const cAnam = (currentAnamnesis ?? "").trim();

	if (cComp && cAnam) {
		if (trimmed === `${cComp}\n${cAnam}`) {
			return { complaint: cComp, anamnesis: cAnam };
		}
		if (trimmed === cComp) {
			return { complaint: cComp, anamnesis: cAnam };
		}
		if (trimmed === cAnam) {
			return { complaint: cComp, anamnesis: cAnam };
		}
		if (trimmed.startsWith(cComp)) {
			const remainder = trimmed
				.slice(cComp.length)
				.replace(/^[\n\r\s,;.]+/, "")
				.trim();
			return { complaint: cComp, anamnesis: remainder || cAnam };
		}
	}

	if (trimmed.includes("\n")) {
		const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
		if (lines.length >= 2) {
			return {
				complaint: lines[0] ?? "",
				anamnesis: lines.slice(1).join("\n"),
			};
		}
		if (lines.length === 1) {
			return splitSingleParagraphAnamnesis(lines[0] ?? "", cComp, cAnam);
		}
	}

	return splitSingleParagraphAnamnesis(trimmed, cComp, cAnam);
}

/**
 * Преобразует поля формы ЭМК приёма (visits / visitNoteForm) в структуру дневника.
 */
export function soapDiaryFromVisitNote(form: {
	complaint?: string | null;
	anamnesis?: string | null;
	objectiveStatus?: string | null;
	diagnosis?: string | null;
	treatmentPlan?: string | null;
}): Partial<DiaryState> {
	const complaint = (form.complaint ?? "").trim();
	const anamnesis = (form.anamnesis ?? "").trim();
	const sParts: string[] = [];
	if (complaint) sParts.push(complaint);
	if (anamnesis && anamnesis !== complaint) sParts.push(anamnesis);

	const out: Partial<DiaryState> = {
		anamnesis: sParts.join("\n"),
		statusLocalis: (form.objectiveStatus ?? "").trim(),
		treatmentDescription: (form.treatmentPlan ?? "").trim(),
	};

	const diagnosis = (form.diagnosis ?? "").trim();
	const icd = icd10CodeFromDiagnosisText(diagnosis);
	if (icd) out.diagnosisIcd10 = icd;
	const tooth = fdiToothFromText(diagnosis);
	if (tooth) out.diagnosisTooth = tooth;

	return out;
}

/**
 * Преобразует состояние дневника (SOAP) в поля формы ЭМК приёма (visits / visitNoteForm).
 */
export function visitNoteFromSoapDiary(
	diary: DiaryState,
	currentForm?: Partial<
		Record<
			| "complaint"
			| "anamnesis"
			| "objectiveStatus"
			| "diagnosis"
			| "treatmentPlan",
			string
		>
	>,
): {
	complaint: string;
	anamnesis: string;
	objectiveStatus: string;
	diagnosis: string;
	treatmentPlan: string;
} {
	const currentComplaint = currentForm?.complaint ?? "";
	const currentAnamnesis = currentForm?.anamnesis ?? "";
	const { complaint, anamnesis } = splitDiaryAnamnesis(
		diary.anamnesis ?? "",
		currentComplaint,
		currentAnamnesis,
	);

	const objectiveStatus = (diary.statusLocalis ?? "").trim();
	const treatmentPlan = (diary.treatmentDescription ?? "").trim();

	let diagnosis = (currentForm?.diagnosis ?? "").trim();
	const icd = (diary.diagnosisIcd10 ?? "").trim().toUpperCase();
	const tooth = (diary.diagnosisTooth ?? "").trim();

	if (icd) {
		const existingIcd = icd10CodeFromDiagnosisText(diagnosis);
		if (!diagnosis || existingIcd !== icd) {
			const icdEntry = (ICD10_DICTIONARY ?? []).find(
				(entry) => entry.code === icd,
			);
			const label = icdEntry?.label ? ` ${icdEntry.label}` : "";
			diagnosis = tooth ? `${icd}${label} (зуб ${tooth})` : `${icd}${label}`;
		} else if (tooth && !diagnosis.includes(tooth)) {
			diagnosis = `${diagnosis} (зуб ${tooth})`;
		}
	} else if (!diagnosis && tooth) {
		diagnosis = `Зуб ${tooth}`;
	}

	return {
		complaint,
		anamnesis,
		objectiveStatus,
		diagnosis,
		treatmentPlan,
	};
}
