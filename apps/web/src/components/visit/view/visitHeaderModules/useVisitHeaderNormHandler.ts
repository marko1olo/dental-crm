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
			if (!visitNoteForm?.complaint) {
				updateVisitNoteField("complaint", "Жалоб на момент осмотра активно не предъявляет.");
			}
			if (!visitNoteForm?.objectiveStatus) {
				updateVisitNoteField(
					"objectiveStatus",
					"Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена. Прикус физиологический. Зубные ряды интактны. Патологических зубодесневых карманов нет.",
				);
			}
			if (!visitNoteForm?.treatmentPlan) {
				const plan = "Осмотр полости рта проведен, патологий не выявлено. Полость рта здорова, гигиена удовлетворительная.";
				updateVisitNoteField("treatmentPlan", plan);
			}
		}
		showToast("ЭМК заполнена нормой: пациент здоров", "success");
	};
}
