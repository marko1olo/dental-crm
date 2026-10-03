import { showToast } from "../../GlobalToast";
import {
	parseSafetyProfileFromText,
	isSomaticProfilePhysiologicalNorm,
	isNegativeAllergyStatement,
} from "../../patients/safetyMath";
import { formatSafetyProfileToDiaryText } from "../../patients/patientSafetyEvaluation";

export async function executePolishTranscriptAutonomy({
	hasVisitTranscriptText,
	setTranscript,
	updateVisitNoteField,
	visitNoteForm,
	polishTranscript,
	showToastFn = showToast,
}: {
	hasVisitTranscriptText: boolean;
	setTranscript?: (val: string) => void;
	updateVisitNoteField?: (field: string, val: string) => void;
	visitNoteForm?: { anamnesis?: string; objectiveInspection?: string; objectiveStatus?: string } | null;
	polishTranscript?: () => Promise<void> | void;
	showToastFn?: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}) {
	if (!hasVisitTranscriptText) {
		const standardClinicalDraft =
			"Осмотр полости рта проведен. Слизистая оболочка розовая, влажная. Соматически здоров";
		if (typeof setTranscript === "function") {
			setTranscript(standardClinicalDraft);
		}
		if (typeof updateVisitNoteField === "function") {
			const currentObj = visitNoteForm?.objectiveInspection || (visitNoteForm as any)?.objectiveStatus || "";
			if (!currentObj) {
				const objNorm = "Слизистая оболочка полости рта бледно-розовая, влажная, без патологических изменений. Зубные ряды интактны.";
				updateVisitNoteField("objectiveInspection", objNorm);
				updateVisitNoteField("objectiveStatus", objNorm);
			}
			const currentAnamnesis = visitNoteForm?.anamnesis || "";
			if (!currentAnamnesis) {
				updateVisitNoteField(
					"anamnesis",
					"Соматически здоров. Аллергологический и соматический анамнез не отягощен.",
				);
			}
		}
		showToastFn("Подставлен стандартный клинический осмотр (норма)", "info");
		return { executed: true, populatedNorm: true };
	}
	if (typeof polishTranscript === "function") {
		await polishTranscript();
		return { executed: true, populatedNorm: false };
	}
	return { executed: false, populatedNorm: false };
}

export function executeApplySomaticNormAutonomy({
	updateVisitNoteField,
	visitNoteForm,
	showToastFn = showToast,
	activePatient,
}: {
	updateVisitNoteField?: (field: string, val: string) => void;
	visitNoteForm?: { anamnesis?: string; objectiveInspection?: string; objectiveStatus?: string } | null;
	showToastFn?: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient?: any;
}) {
	const rawAllergies = activePatient?.allergies || "";
	const allergyText = Array.isArray(rawAllergies) ? rawAllergies.join(", ") : String(rawAllergies);
	const somaticText = `${activePatient?.somaticNotes || ""} ${activePatient?.concomitantDiseases || ""}`.trim();
	const combinedText = `${allergyText} ${somaticText}`.trim();

	const safety = parseSafetyProfileFromText(combinedText);
	const isClean = isSomaticProfilePhysiologicalNorm(safety) && isNegativeAllergyStatement(allergyText);

	let normText =
		"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.";
	let toastMessage = "Применена норма: соматически здоров (1 клик)";

	if (!isClean && combinedText) {
		const formattedDiary = formatSafetyProfileToDiaryText(safety);
		normText = `${formattedDiary} Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает.`;
		toastMessage = "Подставлен анамнез с учетом соматического статуса пациента (1 клик)";
	}

	const objNorm =
		"Слизистая оболочка полости рта бледно-розовая, влажная, без патологических изменений. Зубные ряды интактны.";
	if (typeof updateVisitNoteField === "function") {
		updateVisitNoteField("anamnesis", normText);
		const currentObj = visitNoteForm?.objectiveInspection || (visitNoteForm as any)?.objectiveStatus || "";
		if (!currentObj) {
			updateVisitNoteField("objectiveInspection", objNorm);
			updateVisitNoteField("objectiveStatus", objNorm);
		}
	}
	if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							anamnesis: normText,
							statusLocalis: objNorm,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch {
			// ignore in SSR or test environments
		}
	}
	showToastFn(toastMessage, "success");
	return { executed: true, normText };
}

export function executeApplyHygienePresetAutonomy({
	updateVisitNoteField,
	visitNoteForm,
	showToastFn = showToast,
}: {
	updateVisitNoteField?: (field: string, val: string) => void;
	visitNoteForm?: {
		complaints?: string;
		objectiveInspection?: string;
		treatment?: string;
		recommendations?: string;
		diagnosis?: string;
	} | null;
	showToastFn?: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}) {
	if (typeof updateVisitNoteField === "function") {
		if (!visitNoteForm?.diagnosis) {
			updateVisitNoteField("diagnosis", "K03.6 Отложения [наросты] на зубах (зубной камень, пигментированный налёт)");
		}
		if (!visitNoteForm?.complaints) {
			updateVisitNoteField("complaints", "Жалобы на наличие мягкого и твёрдого зубного налёта, шероховатость зубов, косметический дефект.");
		}
		const hygieneObj = "Индекс гигиены OHI-S = 1.8. Обильный пигментированный налёт и наддесневой зубной камень во фронтальном отделе нижней челюсти. Слизистая десны умеренно гиперемирована в области десневых сосочков.";
		if (!visitNoteForm?.objectiveInspection) {
			updateVisitNoteField("objectiveInspection", hygieneObj);
		}
		const hygieneTreatment = "Проведена комплексная профессиональная гигиена полости рта: ультразвуковое удаление над- и поддесневых зубных отложений (скалер Woodpecker), воздушно-абразивная полировка Air-Flow (порошок на основе глицина), полировка пастой Kerr Cleanic. Антисептическая обработка десневого края 0.05% раствором хлоргексидина. Глубокое фторирование эмали фторлаком Bifluorid 12.";
		const currentTreatment = visitNoteForm?.treatment || "";
		updateVisitNoteField("treatment", currentTreatment ? `${currentTreatment}\n\n${hygieneTreatment}` : hygieneTreatment);

		const hygieneRec = "Щадящая чистка зубов мягкой щёткой в течение 2 дней. Исключить красящие продукты (кофе, чай, ягоды) на 48 часов. Контрольный осмотр через 6 месяцев.";
		if (!visitNoteForm?.recommendations) {
			updateVisitNoteField("recommendations", hygieneRec);
		}
	}
	showToastFn("Применён протокол: Профгигиена выполнена (1 клик)", "success");
	return { executed: true };
}

export function executeApplyAnesthesiaPresetAutonomy({
	updateVisitNoteField,
	visitNoteForm,
	showToastFn = showToast,
	activePatient,
}: {
	updateVisitNoteField?: (field: string, val: string) => void;
	visitNoteForm?: { treatment?: string } | null;
	showToastFn?: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
	// biome-ignore lint/suspicious/noExplicitAny: patient
	activePatient?: any;
}) {
	const rawAllergies = activePatient?.allergies || "";
	const allergyText = Array.isArray(rawAllergies) ? rawAllergies.join(", ") : String(rawAllergies);
	const somaticText = `${activePatient?.somaticNotes || ""} ${activePatient?.concomitantDiseases || ""}`.trim();
	const combinedText = `${allergyText} ${somaticText}`.toLowerCase();
	const safety = parseSafetyProfileFromText(combinedText);

	let anesthesiaText =
		"Анестезия: инфильтрационная / проводниковая Sol. Articaini 4% с эпинефрином 1:100 000 — 1.7 мл (Артикаин). Анестезия наступила через 3 минуты, глубокая, достаточная для безболезненного вмешательства. Без осложнений.";
	let toastMessage = "Добавлена стандартная анестезия: Sol. Articaini 4% (1 клик)";

	if (
		safety.hasHypertension ||
		safety.hasCardiovascularDisease ||
		safety.hasIhd ||
		safety.hasArrhythmia ||
		combinedText.includes("гипертон") ||
		combinedText.includes("давлен") ||
		combinedText.includes("ибс")
	) {
		anesthesiaText =
			"Анестезия (кардио-протокол): инфильтрационная / проводниковая Sol. Mepivacaini 3% без вазоконстриктора (Скандонест) — 1.7 мл. Анестезия наступила через 3 минуты, гемодинамика стабильная, АД и пульс в норме. Без осложнений.";
		toastMessage = "Добавлена кардио-безопасная анестезия: Sol. Mepivacaini 3% plain (1 клик)";
	} else if (
		safety.hasArticaineAllergy ||
		safety.hasSulfiteAllergy ||
		combinedText.includes("артикаин") ||
		combinedText.includes("ультракаин") ||
		combinedText.includes("сульфит")
	) {
		anesthesiaText =
			"Анестезия (гипоаллергенный протокол): Sol. Mepivacaini 3% без вазоконстриктора и без сульфитных консервантов (Скандонест) — 1.7 мл. Без признаков аллергических реакций.";
		toastMessage = "Добавлена гипоаллергенная анестезия: Sol. Mepivacaini 3% (1 клик)";
	} else if (
		(safety.pregnancyTrimester && safety.pregnancyTrimester !== "none") ||
		combinedText.includes("беременн") ||
		combinedText.includes("лактац") ||
		combinedText.includes("триместр")
	) {
		anesthesiaText =
			"Анестезия (гестационный протокол): инфильтрационная Sol. Articaini 4% с минимальным содержанием эпинефрина 1:200 000 — 1.7 мл. Без осложнений.";
		toastMessage = "Добавлена безопасная анестезия для беременных: Sol. Articaini 1:200 000 (1 клик)";
	}

	if (typeof updateVisitNoteField === "function") {
		const current = visitNoteForm?.treatment || "";
		updateVisitNoteField(
			"treatment",
			current ? `${current}\n\n${anesthesiaText}` : anesthesiaText,
		);
	}
	showToastFn(toastMessage, "success");
	return { executed: true, anesthesiaText };
}
