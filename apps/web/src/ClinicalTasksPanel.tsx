/**
 * Клинические задачи передачи между этапами лечения (Layer 5 Facade, <= 80 строк).
 * Мандат 8b: типы -> пресеты -> движок -> хуки -> UI-подкомпоненты -> фасад.
 */
import React from "react";
import type { ClinicalTasksPanelProps } from "./components/tasks/clinicalTasksTypes";
import { ClinicalTasksTable } from "./components/tasks/ClinicalTasksTable";
import { useClinicalTasksState } from "./components/tasks/panelModules/useClinicalTasksState";
import { ClinicalTasksHeader } from "./components/tasks/panelModules/ClinicalTasksHeader";
import { ClinicalTasksNotice } from "./components/tasks/panelModules/ClinicalTasksNotice";
import { ClinicalTasksPresetsBar } from "./components/tasks/panelModules/ClinicalTasksPresetsBar";
import { ClinicalPhaseCompletionForm } from "./components/tasks/panelModules/ClinicalPhaseCompletionForm";
import { ClinicalTasksFilterStrip } from "./components/tasks/panelModules/ClinicalTasksFilterStrip";
import { ClinicalTasksClosedAccordion } from "./components/tasks/panelModules/ClinicalTasksClosedAccordion";

export * from "./components/tasks/clinicalTasksTypes";
export * from "./components/tasks/clinicalTasksPresets";
export * from "./components/tasks/ClinicalTasksTable";

export const ClinicalTasksPanel: React.FC<ClinicalTasksPanelProps> = ({ patientId, assignedDoctorId = null, treatmentPlanId = null }) => {
	const state = useClinicalTasksState({ patientId, assignedDoctorId, treatmentPlanId });
	if (!patientId) return null;

	return (
		<section className="panel ops-panel" data-testid="clinical-tasks-panel">
			<ClinicalTasksHeader openTasksCount={state.tasks !== null ? state.openTasks.length : null} />
			<ClinicalTasksNotice error={state.error} loading={state.loading} actionError={state.actionError} actionNotice={state.actionNotice} isTasksNull={state.tasks === null} onRetry={() => void state.load()} />
			<ClinicalTasksPresetsBar onCreatePresetTask={state.createPresetTask} />
			<ClinicalPhaseCompletionForm notes={state.notes} onNotesChange={state.setNotes} submittingPhase={state.submittingPhase} onCompletePhase={state.completePhase} customTaskTypes={state.customTaskTypes} />
			{state.tasks !== null && state.tasks.length > 0 ? (
				<ClinicalTasksFilterStrip filterStatus={state.filterStatus} onSelectFilterStatus={state.setFilterStatus} openCount={state.openTasks.length} closedCount={state.closedTasks.length} totalCount={state.tasks.length} />
			) : null}
			{state.tasks !== null && state.visibleTasks.length === 0 && !state.error ? (
				<p className="ops-note">
					{state.filterStatus === "completed" ? "Выполненных задач передачи у этого пациента пока нет." : "Открытых задач передачи у этого пациента нет. Когда этап будет завершён кнопкой выше — задача появится здесь и у следующего врача."}
				</p>
			) : null}
			<ClinicalTasksTable visibleTasks={state.visibleTasks} completingTaskId={state.completingTaskId} onCompleteTask={state.handleCompleteTask} patientId={patientId} assignedDoctorId={assignedDoctorId} onAddTask={state.handleAddTask} />
			<ClinicalTasksClosedAccordion closedTasks={state.closedTasks} />
		</section>
	);
};

export default ClinicalTasksPanel;
