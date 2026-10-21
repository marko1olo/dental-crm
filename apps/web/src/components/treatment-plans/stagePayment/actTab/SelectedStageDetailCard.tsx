import React from "react";
import { formatKopecksRu } from "@dental/shared";
import type { MilestoneStage } from "../stagePaymentEngine.js";

export interface SelectedStageDetailCardProps {
	readonly stage: MilestoneStage;
}

export const SelectedStageDetailCard: React.FC<SelectedStageDetailCardProps> = ({ stage }) => {
	const directExpensesTotal =
		stage.directExpensesKopecks.labKopecks +
		stage.directExpensesKopecks.materialsKopecks +
		stage.directExpensesKopecks.otherKopecks;

	return (
		<div className="rounded-xl border border-[var(--line-subtle)] bg-[var(--paper-soft)] p-4 text-xs flex flex-col gap-3">
			<div className="flex justify-between items-center">
				<span className="font-bold text-sm text-[var(--ink)]">
					{stage.title}
				</span>
				<span className="font-extrabold text-sm text-[var(--teal,var(--brand-primary))]">
					{formatKopecksRu(stage.totalKopecks)}
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[var(--muted,#64748b)]">
				<div>
					<span>Внесено аванса: </span>
					<strong className="text-[var(--ink,#0f172a)]">
						{formatKopecksRu(stage.advancePaidKopecks)}
					</strong>
				</div>
				<div>
					<span>Зарезервировано в эскроу: </span>
					<strong className="text-[var(--teal,var(--brand-primary))]">
						{formatKopecksRu(stage.escrowLockedKopecks)}
					</strong>
				</div>
				<div>
					<span>Прямые затраты (Lab/BOM): </span>
					<strong className="text-[var(--ink,#0f172a)]">
						{formatKopecksRu(directExpensesTotal)}
					</strong>
				</div>
			</div>

			<div className="border-t border-[var(--border,#cbd5e1)] pt-2 text-[11px] text-[var(--muted,#64748b)]">
				При подписании Акта средства из эскроу ({formatKopecksRu(stage.escrowLockedKopecks)}) переводятся в признанную выручку клиники, а гарантийные обязательства вступают в силу.
			</div>
		</div>
	);
};
