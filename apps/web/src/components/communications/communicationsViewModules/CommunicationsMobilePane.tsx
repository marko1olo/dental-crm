import { MobileCommunicationsMessenger } from "../MobileCommunicationsMessenger";
import type { CommunicationsViewControllerResult } from "./useCommunicationsViewController";

export function CommunicationsMobilePane({
	ctrl,
}: {
	ctrl: CommunicationsViewControllerResult;
}) {
	return (
		<div
			className="mobile-communications-container"
			style={{ width: "100%", maxWidth: "100vw", overflowX: "clip" }}
			data-testid="communications-view"
		>
			<MobileCommunicationsMessenger
				dashboard={
					ctrl.dashboard
						? {
								...ctrl.dashboard,
								communicationTasks: ctrl.effectiveTasks,
								communicationEvents: ctrl.effectiveEvents ?? [],
							}
						: undefined
				}
				onGoToSchedule={ctrl.onGoToSchedule}
				completeCommunicationTask={ctrl.completeCommunicationTask}
				communicationNote={ctrl.communicationNote}
				onCommunicationNoteChange={ctrl.onCommunicationNoteChange}
				communicationSavingTaskId={ctrl.communicationSavingTaskId}
				openCommunicationTaskDocumentWorkflow={
					ctrl.openCommunicationTaskDocumentWorkflow
				}
				communicationChannelLabels={ctrl.communicationChannelLabels}
				communicationPriorityLabels={ctrl.communicationPriorityLabels}
				communicationIntentLabels={ctrl.communicationIntentLabels}
				communicationStatusLabels={ctrl.communicationStatusLabels}
				documentKindsForCommunicationTask={
					ctrl.documentKindsForCommunicationTask
				}
				documentLabels={ctrl.documentLabels}
				staffRoleLabels={ctrl.staffRoleLabels}
				formatDateTime={ctrl.formatDateTime}
			/>
		</div>
	);
}
