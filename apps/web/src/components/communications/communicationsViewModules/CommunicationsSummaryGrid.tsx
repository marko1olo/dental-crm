import { countLabel } from "../../../lib/russianPlural";

export function CommunicationsSummaryGrid({ summary }: { summary: any }) {
	if (!summary) return null;

	return (
		<section className="communications-summary-grid" aria-label="Сводка связи">
			<article className={summary?.urgentTasks ? "communication-urgent" : ""}>
				<span>Открыто</span>
				<strong>{summary?.openTasks ?? 0}</strong>
				<p>{countLabel(summary?.urgentTasks ?? 0, "срочная", "срочные", "срочных")}</p>
			</article>
			<article>
				<span>Сегодня</span>
				<strong>{summary?.dueToday ?? 0}</strong>
				<p>{countLabel(summary?.overdue ?? 0, "просрочена", "просрочены", "просрочено")}</p>
			</article>
			<article>
				<span>Подтверждения</span>
				<strong>{summary?.appointmentConfirmations ?? 0}</strong>
				<p>записи и первичные визиты</p>
			</article>
			<article>
				<span>После приема</span>
				<strong>{summary?.postVisitInstructions ?? 0}</strong>
				<p>инструкции пациентам</p>
			</article>
		</section>
	);
}
