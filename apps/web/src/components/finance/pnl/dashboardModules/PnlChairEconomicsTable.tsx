import type React from "react";
import type { ChairEconomicsSummary } from "@dental/shared";

export interface PnlChairEconomicsTableProps {
	readonly chairEconomics: ChairEconomicsSummary;
}

export const PnlChairEconomicsTable: React.FC<PnlChairEconomicsTableProps> = ({ chairEconomics }) => {
	if (chairEconomics.chairs.length === 0) return null;

	return (
		<div className="pnl-table-wrapper">
			<table className="pnl-table">
				<thead>
					<tr>
						<th>Установка / Кабинет</th>
						<th className="text-center">Часы фонда</th>
						<th className="text-center">Часы приема</th>
						<th className="text-center">Загрузка (%)</th>
						<th className="text-right">Выручка (₽)</th>
						<th className="text-right">Расход (₽)</th>
						<th className="text-right">Прибыль (₽)</th>
					</tr>
				</thead>
				<tbody>
					{chairEconomics.chairs.map((chair) => (
						<tr key={chair.chairId}>
							<td className="font-semibold text-slate-800 dark:text-slate-100">
								{chair.chairName} {chair.roomName ? `(${chair.roomName})` : ""}
							</td>
							<td className="text-center">{chair.operatingHours} ч</td>
							<td className="text-center">{chair.occupiedHours} ч</td>
							<td className="text-center">
								<span className="font-semibold">{chair.occupancyRatePct}%</span>
							</td>
							<td className="text-right font-semibold">
								{chair.revenueRub.toLocaleString("ru-RU")} ₽
							</td>
							<td className="text-right text-slate-500">
								{chair.costRub.toLocaleString("ru-RU")} ₽
							</td>
							<td
								className={`text-right font-bold ${
									chair.profitRub >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
								}`}
							>
								{chair.profitRub.toLocaleString("ru-RU")} ₽
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
