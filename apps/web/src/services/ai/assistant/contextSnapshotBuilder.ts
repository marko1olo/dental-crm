/**
 * contextSnapshotBuilder.ts — Сборка актуального клинического UI-контекста из сторов CRM
 */

import { useAppStore } from "../../../store/appStore";
import { useVisitStore } from "../../../store/visitStore";
import { formatCopilotUiContextHeader } from "../../../components/copilot/CopilotContextSync";

export function buildContextSnapshot(): string {
	const appState = useAppStore.getState();
	const visitState = useVisitStore.getState();

	const view = appState.currentView || "Odontogram";
	const patientId = appState.activePatientId || null;
	const activeTooth = appState.activeTooth || null;
	const activeDoctor = "Лечащий врач";

	return formatCopilotUiContextHeader({
		view,
		patientId,
		activeTooth,
		activeDoctor,
		toothFormula: visitState.visitToothStateByCode,
		diagnosesByTooth: visitState.visitAiDiagnosesByCode,
		clinical043Context: {
			complaints: visitState.visitNoteForm.complaint,
			anamnesis: visitState.visitNoteForm.anamnesis,
			objectiveStatus: visitState.visitNoteForm.objectiveStatus,
			diagnosis: visitState.visitNoteForm.diagnosis,
			treatmentPlan: visitState.visitNoteForm.treatmentPlan,
		},
	});
}
