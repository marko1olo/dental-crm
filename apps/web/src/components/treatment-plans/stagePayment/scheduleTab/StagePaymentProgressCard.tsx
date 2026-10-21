/**
 * apps/web/src/components/treatment-plans/stagePayment/scheduleTab/StagePaymentProgressCard.tsx
 *
 * Карточка общего прогресса и сводных сумм этапов и оплат.
 */

import React from "react";
import { formatKopecksRu } from "@dental/shared";
import type { StagePaymentTotals } from "../stagePaymentEngine.js";

export interface StagePaymentProgressCardProps {
	readonly totals: StagePaymentTotals;
}

export const StagePaymentProgressCard: React.FC<StagePaymentProgressCardProps> = ({ totals }) => {
	return (
		<div className="stage-progress-card">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]">
						Прогресс закрытия комплексного плана
					</span>
					<div className="flex items-baseline gap-2 mt-0.5">
						<span className="text-2xl font-extrabold text-[var(--ink,#0f172a)]">
							{totals.progressPercent}%
						</span>
						<span className="text-xs text-[var(--muted,#64748b)]">
							(Выполнено и принято: {formatKopecksRu(totals.totalActCompletedKopecks)} из{" "}
							{formatKopecksRu(totals.grandTotalKopecks)})
						</span>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-4 text-xs">
					<div className="rounded-lg bg-[var(--paper)] border border-[var(--line)] px-3 py-1.5 shadow-xs">
						<span className="text-[var(--muted)] block">Всего оплачено:</span>
						<span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
							{formatKopecksRu(totals.totalPaidKopecks)}
						</span>
					</div>
					<div className="rounded-lg bg-[var(--paper)] border border-[var(--line)] px-3 py-1.5 shadow-xs">
						<span className="text-[var(--muted)] block">В эскроу (резерв):</span>
						<span className="font-bold text-[var(--teal,var(--brand-primary))] text-sm">
							{formatKopecksRu(totals.totalEscrowLockedKopecks)}
						</span>
					</div>
					<div className="rounded-lg bg-[var(--paper)] border border-[var(--line)] px-3 py-1.5 shadow-xs">
						<span className="text-[var(--muted)] block">Остаток к доплате:</span>
						<span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
							{formatKopecksRu(totals.remainingDueKopecks)}
						</span>
					</div>
				</div>
			</div>

			<div className="stage-progress-track">
				<div className="stage-progress-fill" style={{ width: `${totals.progressPercent}%` }} />
			</div>
		</div>
	);
};
