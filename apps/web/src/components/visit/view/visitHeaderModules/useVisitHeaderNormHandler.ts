import { showToast } from "../../../GlobalToast";
import type { VisitNoteFormExtended } from "../VisitViewProps";

export function useVisitHeaderNormHandler(
	handleApplySomaticNormQuick: () => void,
	updateVisitNoteField?: ((field: string, value: string) => void) | undefined,
	visitNoteForm?: VisitNoteFormExtended | undefined,
) {
	return () => {
		handleApplySomaticNormQuick();
		if (typeof updateVisitNoteField === "function") {
			if (!visitNoteForm?.diagnosis) {
				updateVisitNoteField("diagnosis", "Z01.2 Стоматологическое обследование (Здоров)");
			}
			if (!visitNoteForm?.complaint && !(visitNoteForm as any)?.complaints) {
				updateVisitNoteField("complaint", "Жалоб на момент осмотра активно не предъявляет.");
				updateVisitNoteField("complaints", "Жалоб на момент осмотра активно не предъявляет.");
			}
			if (!visitNoteForm?.treatmentPlan && !(visitNoteForm as any)?.treatment) {
				const plan = "Осмотр полости рта проведен, патологий не выявлено. Полость рта здорова, гигиена удовлетворительная.";
				updateVisitNoteField("treatmentPlan", plan);
				updateVisitNoteField("treatment", plan);
			}
		}
		showToast("ЭМК заполнена нормой: пациент здоров", "success");
	};
}
