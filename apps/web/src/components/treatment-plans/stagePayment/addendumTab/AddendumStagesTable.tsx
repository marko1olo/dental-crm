import React from "react";
import { formatKopecksRu } from "@dental/shared";
import { getStagePresetByKind } from "../stagePaymentPresets.js";
import type { MilestoneStage, StagePaymentTotals } from "../stagePaymentEngine.js";

export interface AddendumStagesTableProps {
	readonly stages: readonly MilestoneStage[];
	readonly totals: StagePaymentTotals;
}

export const AddendumStagesTable: React.FC<AddendumStagesTableProps> = ({
	stages,
	totals,
}) => {
	return (
		<table className="contract-addendum-table">
			<thead>
				<tr>
					<th>№</th>
					<th>Наименование этапа лечения</th>
					<th>Сумма (руб.)</th>
					<th>Аванс (%)</th>
					<th>Сумма аванса (руб.)</th>
					<th>Окончательный расчет (руб.)</th>
				</tr>
			</thead>
			<tbody>
				{stages.map((stg) => (
					<tr key={stg.id}>
						<td>{stg.stageNumber}</td>
						<td>{stg.title}</td>
						<td>{formatKopecksRu(stg.totalKopecks)}</td>
						<td>{getStagePresetByKind(stg.kind).defaultAdvancePercent}%</td>
						<td>{formatKopecksRu(stg.advanceRequiredKopecks)}</td>
						<td>{formatKopecksRu(Math.max(0, stg.totalKopecks - stg.advanceRequiredKopecks))}</td>
					</tr>
				))}
				<tr className="font-bold bg-[var(--paper-soft)] text-[var(--ink)]">
					<td colSpan={2}>ИТОГО ПО ВСЕМ ЭТАПАМ:</td>
					<td>{formatKopecksRu(totals.grandTotalKopecks)}</td>
					<td>-</td>
					<td>{formatKopecksRu(totals.totalAdvanceRequiredKopecks)}</td>
					<td>{formatKopecksRu(totals.grandTotalKopecks - totals.totalAdvanceRequiredKopecks)}</td>
				</tr>
			</tbody>
		</table>
	);
};
