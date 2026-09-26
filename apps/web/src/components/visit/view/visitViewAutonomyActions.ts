import { showToast } from "../../GlobalToast";

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
}: {
	updateVisitNoteField?: (field: string, val: string) => void;
	visitNoteForm?: { anamnesis?: string; objectiveInspection?: string; objectiveStatus?: string } | null;
	showToastFn?: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}) {
	const normText =
		"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.";
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
	showToastFn("Применена норма: соматически здоров (1 клик)", "success");
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
}: {
	updateVisitNoteField?: (field: string, val: string) => void;
	visitNoteForm?: { treatment?: string } | null;
	showToastFn?: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}) {
	const anesthesiaText = "Анестезия: инфильтрационная / проводниковая Sol. Articaini 4% с эпинефрином 1:100 000 — 1.7 мл (Артикаин). Анестезия наступила через 3 минуты, глубокая, достаточная для безболезненного вмешательства. Без осложнений.";
	if (typeof updateVisitNoteField === "function") {
		const current = visitNoteForm?.treatment || "";
		updateVisitNoteField(
			"treatment",
			current ? `${current}\n\n${anesthesiaText}` : anesthesiaText,
		);
	}
	showToastFn("Добавлена стандартная анестезия: Sol. Articaini 4% (1 клик)", "success");
	return { executed: true, anesthesiaText };
}
