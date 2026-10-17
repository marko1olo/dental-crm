import { countLabel } from "../../../lib/russianPlural";
import { hasCapability } from "../../../lib/clinicCapabilities";
import { EmptyState } from "../../EmptyState";
import { CampaignPanel } from "../CampaignPanel";
import { CommunicationEventRow } from "../CommunicationEventRow";
import { CommunicationTaskCard } from "../CommunicationTaskCard";
import { MessageDeliveryConsole } from "../MessageDeliveryConsole";
import type { CommunicationsConversationsListProps } from "./types";

export function CommunicationsConversationsList({
	dashboard,
	clinicMode,
	tasksSlice,
	onShowMoreTasks,
	journal,
	journalSlice,
	onShowMoreJournal,
	communicationSummaryHasNumbers,
	communicationChannelLabels,
	communicationDocumentTaskActionLabels,
	communicationIntentLabels,
	communicationPriorityLabels,
	communicationSavingTaskId,
	communicationStatusLabels,
	completeCommunicationTask,
	documentKindsForCommunicationTask,
	documentLabels,
	formatDateTime,
	onGoToSchedule,
	openCommunicationTaskDocumentWorkflow,
	staffRoleLabels,
	communicationNoteDescriptionId,
}: CommunicationsConversationsListProps) {
	return (
		<>
			{communicationSummaryHasNumbers ? (
				<section
					className="communications-summary-grid"
					aria-label="Сводка связи"
				>
					<article
						className={
							dashboard?.communicationSummary?.urgentTasks
								? "communication-urgent"
								: ""
						}
					>
						<span>Открыто</span>
						<strong>{dashboard?.communicationSummary?.openTasks ?? 0}</strong>
						<p>
							{countLabel(
								dashboard?.communicationSummary?.urgentTasks ?? 0,
								"срочная",
								"срочные",
								"срочных",
							)}
						</p>
					</article>
					<article>
						<span>Сегодня</span>
						<strong>{dashboard?.communicationSummary?.dueToday ?? 0}</strong>
						<p>
							{countLabel(
								dashboard?.communicationSummary?.overdue ?? 0,
								"просрочена",
								"просрочены",
								"просрочено",
							)}
						</p>
					</article>
					<article>
						<span>Подтверждения</span>
						<strong>
							{dashboard?.communicationSummary?.appointmentConfirmations ?? 0}
						</strong>
						<p>записи и первичные визиты</p>
					</article>
					<article>
						<span>После приема</span>
						<strong>
							{dashboard?.communicationSummary?.postVisitInstructions ?? 0}
						</strong>
						<p>инструкции пациентам</p>
					</article>
				</section>
			) : null}

			<div className="communication-layout mb-5">
				<section className="communication-task-list" aria-label="Очередь связи">
					{(tasksSlice.visibleItems ?? []).length ? (
						<>
							{(tasksSlice.visibleItems ?? []).map((task) => (
								<CommunicationTaskCard
									communicationChannelLabels={communicationChannelLabels}
									communicationDocumentTaskActionLabels={
										communicationDocumentTaskActionLabels
									}
									communicationIntentLabels={communicationIntentLabels}
									communicationPriorityLabels={communicationPriorityLabels}
									communicationSavingTaskId={communicationSavingTaskId}
									communicationStatusLabels={communicationStatusLabels}
									completionNoteDescriptionId={communicationNoteDescriptionId}
									completeCommunicationTask={completeCommunicationTask}
									documentKinds={documentKindsForCommunicationTask(task)}
									documentLabels={documentLabels}
									formatDateTime={formatDateTime}
									key={task.id}
									openCommunicationTaskDocumentWorkflow={
										openCommunicationTaskDocumentWorkflow
									}
									staffRoleLabels={staffRoleLabels}
									task={task}
									appointments={dashboard.appointments}
								/>
							))}
							{tasksSlice.hasMore && (
								<div className="flex justify-center p-3">
									<button
										type="button"
										data-testid="btn-communications-tasks-show-more"
										onClick={onShowMoreTasks}
										className="min-h-[44px] sm:min-h-[34px] px-4 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all shadow-xs"
									>
										Показать ещё 30 задач (показано{" "}
										{tasksSlice.visibleItems.length} из{" "}
										{tasksSlice.totalCount})
									</button>
								</div>
							)}
						</>
					) : (
						<EmptyState
							title="Очередь связи пуста"
							description="Когда появятся подтверждения, запросы документов или инструкции после приема, они отобразятся здесь."
							action={
								<button
									className="primary-button"
									type="button"
									onClick={onGoToSchedule}
								>
									Открыть расписание
								</button>
							}
							className="my-4 py-8"
						/>
					)}
				</section>

				<aside className="communication-side">
					<section aria-label="Журнал связи">
						<div className="panel-heading">
							<h3>Журнал связи</h3>
							<span className={journal.totalPillClass}>
								{journal.totalLabel}
							</span>
						</div>
						{journal.undeliveredLabel ? (
							<p
								className="text-xs font-semibold text-[var(--bad-fg,#b42318)] mb-2"
								role="alert"
							>
								{journal.undeliveredLabel} — пациенты этого не получили.
								Причина отказа по каждому сообщению видна в «Отправке
								сообщений», раздел «Журнал отправки».
							</p>
						) : null}
						{journal.pendingLabel ? (
							<p className="text-xs text-[var(--muted)] mb-2">
								{journal.pendingLabel}.
							</p>
						) : null}
						{journal.phase === "failed" ? (
							<div
								role="alert"
								className="p-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900"
							>
								<div className="font-semibold">{journal.title}.</div>
								<div className="mt-0.5">{journal.hint}</div>
							</div>
						) : journal.phase === "empty" ? (
							<EmptyState
								title={journal.title}
								description={journal.hint}
								className="my-2 py-6"
							/>
						) : (
							<div className="template-list">
								{journalSlice.visibleItems?.map((event) => (
									<CommunicationEventRow
										communicationChannelLabels={communicationChannelLabels}
										communicationStatusLabels={communicationStatusLabels}
										event={event}
										formatDateTime={formatDateTime}
										key={event.id}
									/>
								))}
								{journalSlice.hasMore && (
									<div className="flex justify-center p-2">
										<button
											type="button"
											data-testid="btn-communications-journal-show-more"
											onClick={onShowMoreJournal}
											className="min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-all"
										>
											Показать ещё 40 записей
										</button>
									</div>
								)}
							</div>
						)}
					</section>
				</aside>
			</div>

			<MessageDeliveryConsole />
			{hasCapability(clinicMode as any, "massCampaigns") ? <CampaignPanel /> : null}
		</>
	);
}
