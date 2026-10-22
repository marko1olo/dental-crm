import { EmptyState } from "../../EmptyState";
import { CommunicationEventRow } from "../CommunicationEventRow";

export function CommunicationsJournalAside({
	journal,
	journalSlice,
	onShowMoreJournal,
	communicationChannelLabels,
	communicationStatusLabels,
	formatDateTime,
}: {
	journal: any;
	journalSlice: any;
	onShowMoreJournal: () => void;
	communicationChannelLabels: any;
	communicationStatusLabels: any;
	formatDateTime: (val: string) => string;
}) {
	return (
		<aside className="communication-side">
			<section aria-label="Журнал связи">
				<div className="panel-heading">
					<h3>Журнал связи</h3>
					<span className={journal.totalPillClass}>{journal.totalLabel}</span>
				</div>
				{journal.undeliveredLabel && (
					<p className="text-xs font-semibold text-[var(--bad-fg,#b42318)] mb-2" role="alert">
						{journal.undeliveredLabel} — пациенты этого не получили. Причина отказа по каждому сообщению видна в «Отправке сообщений», раздел «Журнал отправки».
					</p>
				)}
				{journal.pendingLabel && (
					<p className="text-xs text-[var(--muted)] mb-2">{journal.pendingLabel}.</p>
				)}
				{journal.phase === "failed" ? (
					<div role="alert" className="p-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900">
						<div className="font-semibold">{journal.title}.</div>
						<div className="mt-0.5">{journal.hint}</div>
					</div>
				) : journal.phase === "empty" ? (
					<EmptyState title={journal.title} description={journal.hint} className="my-2 py-6" />
				) : (
					<div className="template-list">
						{journalSlice.visibleItems?.map((event: any) => (
							<CommunicationEventRow
								key={event.id} event={event} formatDateTime={formatDateTime}
								communicationChannelLabels={communicationChannelLabels}
								communicationStatusLabels={communicationStatusLabels}
							/>
						))}
						{journalSlice.hasMore && (
							<div className="flex justify-center p-2">
								<button
									type="button" data-testid="btn-communications-journal-show-more" onClick={onShowMoreJournal}
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
	);
}
