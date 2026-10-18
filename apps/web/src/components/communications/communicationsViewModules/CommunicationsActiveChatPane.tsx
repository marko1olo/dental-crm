import { lazy, Suspense } from "react";
import { CommunicationsChatFooterInput } from "./CommunicationsChatFooterInput";
import { CommunicationsConversationsList } from "./CommunicationsConversationsList";
import type { CommunicationsViewControllerResult } from "./useCommunicationsViewController";

export type CommunicationsActiveChatPaneProps = {
	ctrl: CommunicationsViewControllerResult;
};

const OmnichannelOperatorDesk = lazy(() =>
	import("../../chat/OmnichannelOperatorDesk").then((module) => ({
		default: module.OmnichannelOperatorDesk,
	})),
);

const StaffMessengerPanel = lazy(() =>
	import("../StaffMessengerPanel").then((module) => ({
		default: module.StaffMessengerPanel,
	})),
);

const WhatsAppChatPanel = lazy(() =>
	import("../../chat/WhatsAppChatPanel").then((module) => ({
		default: module.WhatsAppChatPanel,
	})),
);

const PatientNotificationCenter = lazy(() =>
	import("../../notifications/PatientNotificationCenter").then((module) => ({
		default: module.PatientNotificationCenter,
	})),
);

export function CommunicationsActiveChatPane({
	ctrl,
}: CommunicationsActiveChatPaneProps) {
	return (
		<>
			{ctrl.activeSection === "bot_inbox" && (
				<div className="mb-5">
					<Suspense fallback={null}>
						<OmnichannelOperatorDesk />
					</Suspense>
				</div>
			)}

			{ctrl.activeSection === "staff_chat" && (
				<div className="h-[780px] mb-5 w-full max-w-full min-w-0">
					<Suspense fallback={null}>
						<StaffMessengerPanel />
					</Suspense>
				</div>
			)}

			{ctrl.activeSection === "chat" && (
				<div className="h-[750px] mb-5">
					<Suspense fallback={null}>
						<WhatsAppChatPanel />
					</Suspense>
				</div>
			)}

			{ctrl.activeSection === "notifications" && (
				<div className="h-[750px] mb-5">
					<Suspense fallback={null}>
						<PatientNotificationCenter />
					</Suspense>
				</div>
			)}

			{ctrl.activeSection === "tasks" && (
				<>
					{ctrl.effectiveTasks.length || ctrl.closingNoteArmed ? (
						<CommunicationsChatFooterInput
							communicationNote={ctrl.communicationNote}
							onCommunicationNoteChange={ctrl.onCommunicationNoteChange}
							closingNoteArmed={ctrl.closingNoteArmed}
							communicationNoteInputId={ctrl.communicationNoteInputId}
							communicationNoteDescriptionId={
								ctrl.communicationNoteDescriptionId
							}
						/>
					) : null}

					<CommunicationsConversationsList
						dashboard={ctrl.dashboard}
						clinicMode={ctrl.clinicMode}
						effectiveTasks={ctrl.effectiveTasks}
						tasksSlice={ctrl.tasksSlice}
						onShowMoreTasks={() => ctrl.setTasksLimit((prev) => prev + 30)}
						journal={ctrl.journal}
						journalSlice={ctrl.journalSlice}
						onShowMoreJournal={() => ctrl.setJournalLimit((prev) => prev + 40)}
						communicationSummaryHasNumbers={
							ctrl.communicationSummaryHasNumbers
						}
						communicationChannelLabels={ctrl.communicationChannelLabels}
						communicationDocumentTaskActionLabels={
							ctrl.communicationDocumentTaskActionLabels
						}
						communicationIntentLabels={ctrl.communicationIntentLabels}
						communicationPriorityLabels={ctrl.communicationPriorityLabels}
						communicationSavingTaskId={ctrl.communicationSavingTaskId}
						communicationStatusLabels={ctrl.communicationStatusLabels}
						completeCommunicationTask={ctrl.completeCommunicationTask}
						documentKindsForCommunicationTask={
							ctrl.documentKindsForCommunicationTask
						}
						documentLabels={ctrl.documentLabels}
						formatDateTime={ctrl.formatDateTime}
						onGoToSchedule={ctrl.onGoToSchedule}
						openCommunicationTaskDocumentWorkflow={
							ctrl.openCommunicationTaskDocumentWorkflow
						}
						staffRoleLabels={ctrl.staffRoleLabels}
						communicationNoteDescriptionId={
							ctrl.communicationNoteDescriptionId
						}
					/>
				</>
			)}
		</>
	);
}
