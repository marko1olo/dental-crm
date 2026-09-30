import type { PanelSubject } from "../../../lib/panelStateText";
import { ICD10_DICTIONARY } from "../../../lib/icd10";

export interface DiaryState {
	anamnesis: string;
	statusLocalis: string;
	diagnosisIcd10: string;
	diagnosisTooth: string;
	treatmentDescription: string;
	complications: string;
	comorbidities: string;
}

export const EMPTY_DIARY: DiaryState = {
	anamnesis: "",
	statusLocalis: "",
	diagnosisIcd10: "",
	diagnosisTooth: "",
	treatmentDescription: "",
	complications: "",
	comorbidities: "",
};

/**
 * Код МКБ-10 из текста диагноза ЭМК.
 * В visitNoteForm.diagnosis лежит свободный текст («Кариес 36»), а в дневнике
 * 043/у поле A — код. Подставляем код только когда он явно есть в строке;
 * произвольный текст в diagnosisIcd10 не кладём.
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
 * SOAP-поля дневника 043/у из формы ЭМК приёма (visits / visitNoteForm).
 *
 * Два хранилища: visits.complaint|anamnesis|… (ЭМК) и visit_diaries.* (SOAP).
 * Когда дневника ещё нет, врач уже мог заполнить ЭМК — без prefill он
 * перепечатывает то же самое в S/O/A/P. Возвращаем только непустые поля.
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

	// Разделение по первому предложению
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

	// Если предложение только одно или нет знаков препинания:
	// Проверяем, содержит ли оно характерные маркеры соматики/анамнеза
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
 * Разделяет поле `anamnesis` дневника 043/у (где жалобы и анамнез объединены)
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

	// Случай 1: точное совпадение со склеенным ранее текстом (жалобы + \n + анамнез)
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

	// Случай 2: текст содержит перевод строки \n
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

	// Случай 3: один абзац без переносов строк (например, стандартная норма в 1 клик)
	return splitSingleParagraphAnamnesis(trimmed, cComp, cAnam);
}

/**
 * Преобразует поля формы ЭМК приёма (visits / visitNoteForm) в структуру дневника 043/у.
 * Поддерживает очистку полей при удалении текста врачом.
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
 * Преобразует состояние дневника 043/у (SOAP) в поля формы ЭМК приёма (visits / visitNoteForm).
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

	// Разрешение диагноза
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

export function computeStoreSig(form: {
	complaint?: string | null;
	anamnesis?: string | null;
	objectiveStatus?: string | null;
	diagnosis?: string | null;
	treatmentPlan?: string | null;
}): string {
	return [
		(form.complaint ?? "").trim(),
		(form.anamnesis ?? "").trim(),
		(form.objectiveStatus ?? "").trim(),
		(form.diagnosis ?? "").trim(),
		(form.treatmentPlan ?? "").trim(),
	].join("|||");
}

export function computeDiarySig(diary: DiaryState): string {
	return [
		(diary.anamnesis ?? "").trim(),
		(diary.statusLocalis ?? "").trim(),
		(diary.diagnosisIcd10 ?? "").trim(),
		(diary.diagnosisTooth ?? "").trim(),
		(diary.treatmentDescription ?? "").trim(),
	].join("|||");
}

export type DiaryLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "empty" }
	| { readonly phase: "ready" }
	| { readonly phase: "failed"; readonly status: number | null };

export const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DIARY_SUBJECT: PanelSubject = {
	notLoadedTitle: "Дневник не синхронизирован",
	accusative: "дневник приёма",
	emptyTitle: "Дневник приёма ещё не заполнен",
	emptyHint:
		"Заполните разделы S, O, A, P и нажмите «Сохранить черновик» — дальше запись сохраняется сама каждые 30 секунд.",
	failureConsequence:
		"Проверьте подключение и нажмите «Обновить». Черновик сохранён локально.",
};

export function jsonObjectOrNull(rawBody: string): Record<string, unknown> | null {
	const trimmed = rawBody.trim();
	if (!trimmed) return null;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return typeof parsed === "object" &&
			parsed !== null &&
			!Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

export type DiaryRevision = DiaryRevisionRow;
export type DiaryRevisionRow = {
	id: string;
	revisedAt: string | null;
	revisionReason: string | null;
	previousAnamnesis: string | null;
	previousStatusLocalis: string | null;
	previousDiagnosisIcd10: string | null;
	previousDiagnosisTooth: string | null;
	previousTreatmentDescription: string | null;
	previousComplications: string | null;
	previousComorbidities: string | null;
	previousInstrumentTrayBarcode: string | null;
	revisedByUserId: string | null;
	revisedByFullName: string | null;
};

export function asDiaryRevisionRow(raw: unknown): DiaryRevisionRow | null {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
	const o = raw as Record<string, unknown>;
	if (typeof o.id !== "string" || !o.id) return null;
	const strOrNull = (v: unknown): string | null =>
		typeof v === "string" ? v : v == null ? null : String(v);
	return {
		id: o.id,
		revisedAt: strOrNull(o.revisedAt),
		revisionReason: strOrNull(o.revisionReason),
		previousAnamnesis: strOrNull(o.previousAnamnesis),
		previousStatusLocalis: strOrNull(o.previousStatusLocalis),
		previousDiagnosisIcd10: strOrNull(o.previousDiagnosisIcd10),
		previousDiagnosisTooth: strOrNull(o.previousDiagnosisTooth),
		previousTreatmentDescription: strOrNull(o.previousTreatmentDescription),
		previousComplications: strOrNull(o.previousComplications),
		previousComorbidities: strOrNull(o.previousComorbidities),
		previousInstrumentTrayBarcode: strOrNull(o.previousInstrumentTrayBarcode),
		revisedByUserId: strOrNull(o.revisedByUserId),
		revisedByFullName: strOrNull(o.revisedByFullName),
	};
}
