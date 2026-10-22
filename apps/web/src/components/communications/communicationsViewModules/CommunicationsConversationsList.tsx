import { hasCapability } from "../../../lib/clinicCapabilities";
import { EmptyState } from "../../EmptyState";
import { CampaignPanel } from "../CampaignPanel";
import { CommunicationTaskCard } from "../CommunicationTaskCard";
import { MessageDeliveryConsole } from "../MessageDeliveryConsole";
import { CommunicationsJournalAside } from "./CommunicationsJournalAside";
import { CommunicationsSummaryGrid } from "./CommunicationsSummaryGrid";
import type { CommunicationsConversationsListProps } from "./types";

export function CommunicationsConversationsList({
	dashboard, clinicMode, tasksSlice, onShowMoreTasks,
	journal, journalSlice, onShowMoreJournal,
	communicationSummaryHasNumbers, communicationChannelLabels,
	communicationDocumentTaskActionLabels, communicationIntentLabels,
	communicationPriorityLabels, communicationSavingTaskId,
	communicationStatusLabels, completeCommunicationTask,
	documentKindsForCommunicationTask, documentLabels, formatDateTime,
	onGoToSchedule, openCommunicationTaskDocumentWorkflow,
	staffRoleLabels, communicationNoteDescriptionId,
}: CommunicationsConversationsListProps) {
	return (
		<>
			{communicationSummaryHasNumbers && (
				<CommunicationsSummaryGrid summary={dashboard?.communicationSummary} />
			)}

			<div className="communication-layout mb-5">
				<section className="communication-task-list" aria-label="Очередь связи">
					{(tasksSlice.visibleItems ?? []).length ? (
						<>
							{(tasksSlice.visibleItems ?? []).map((task) => (
								<CommunicationTaskCard
									key={task.id} task={task}
									communicationChannelLabels={communicationChannelLabels}
									communicationDocumentTaskActionLabels={communicationDocumentTaskActionLabels}
									communicationIntentLabels={communicationIntentLabels}
									communicationPriorityLabels={communicationPriorityLabels}
									communicationSavingTaskId={communicationSavingTaskId}
									communicationStatusLabels={communicationStatusLabels}
									completionNoteDescriptionId={communicationNoteDescriptionId}
									completeCommunicationTask={completeCommunicationTask}
									documentKinds={documentKindsForCommunicationTask(task)}
									documentLabels={documentLabels} formatDateTime={formatDateTime}
									openCommunicationTaskDocumentWorkflow={openCommunicationTaskDocumentWorkflow}
									staffRoleLabels={staffRoleLabels} appointments={dashboard?.appointments}
								/>
							))}
							{tasksSlice.hasMore && (
								<div className="flex justify-center p-3">
									<button
										type="button" data-testid="btn-communications-tasks-show-more" onClick={onShowMoreTasks}
										className="min-h-[44px] sm:min-h-[34px] px-4 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all shadow-xs"
									>
										Показать ещё 30 задач (показано {tasksSlice.visibleItems.length} из {tasksSlice.totalCount})
									</button>
								</div>
							)}
						</>
					) : (
						<EmptyState
							title="Очередь связи пуста"
							description="Когда появятся подтверждения, запросы документов или инструкции после приема, они отобразятся здесь."
							action={<button className="primary-button" type="button" onClick={onGoToSchedule}>Открыть расписание</button>}
							className="my-4 py-8"
						/>
					)}
				</section>

				<CommunicationsJournalAside
					journal={journal} journalSlice={journalSlice} onShowMoreJournal={onShowMoreJournal}
					communicationChannelLabels={communicationChannelLabels}
					communicationStatusLabels={communicationStatusLabels} formatDateTime={formatDateTime}
				/>
			</div>

			<MessageDeliveryConsole />
			{hasCapability(clinicMode as any, "massCampaigns") ? <CampaignPanel /> : null}
		</>
	);
}
