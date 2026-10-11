import { lazy, Suspense } from "react";
import { MobileCommunicationsMessenger } from "../MobileCommunicationsMessenger";
import type { CommunicationsViewControllerResult } from "./useCommunicationsViewController";

const PatientRecallsHubModal = lazy(() =>
	import("../../recalls/PatientRecallsHubModal").then((module) => ({
		default: module.PatientRecallsHubModal,
	})),
);

const PatientOmnichannelHubModal = lazy(() =>
	import("../../messaging/PatientOmnichannelHubModal").then((module) => ({
		default: module.PatientOmnichannelHubModal,
	})),
);

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
						: ({
								communicationTasks: ctrl.effectiveTasks,
								communicationEvents: ctrl.effectiveEvents ?? [],
							} as any)
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
			{ctrl.isRecallsHubOpen && (
				<Suspense fallback={null}>
					<PatientRecallsHubModal
						isOpen={ctrl.isRecallsHubOpen}
						onClose={() => ctrl.setIsRecallsHubOpen(false)}
					/>
				</Suspense>
			)}
			{ctrl.isOmnichannelHubOpen && (
				<Suspense fallback={null}>
					<PatientOmnichannelHubModal
						isOpen={ctrl.isOmnichannelHubOpen}
						onClose={() => ctrl.setIsOmnichannelHubOpen(false)}
						portal={true}
					/>
				</Suspense>
			)}
		</div>
	);
}
