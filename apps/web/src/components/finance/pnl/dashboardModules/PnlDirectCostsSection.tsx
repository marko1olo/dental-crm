import type React from "react";
import { TrendingDown } from "lucide-react";
import type { ManagerialPnlReport } from "@dental/shared";

export interface PnlDirectCostsSectionProps {
	readonly report: ManagerialPnlReport;
}

export const PnlDirectCostsSection: React.FC<PnlDirectCostsSectionProps> = ({ report }) => {
	return (
		<div className="pnl-section-block">
			<h3 className="pnl-section-title">
				<TrendingDown size={15} className="text-red-600" />
				<span>3. Расходы клиники по статьям ({report.statutoryExpenses.length})</span>
			</h3>
			<div className="pnl-table-wrapper">
				<table className="pnl-table">
					<thead>
						<tr>
							<th>№</th>
							<th>Статья расхода</th>
							<th>Категория затрат</th>
							<th>Сумма расхода (₽)</th>
							<th>Доля в расходах</th>
						</tr>
					</thead>
					<tbody>
						{report.statutoryExpenses.map((exp) => (
							<tr key={exp.reasonId}>
								<td className="font-mono font-bold text-slate-500">{exp.reasonId}</td>
								<td>
									<span className="font-semibold text-slate-800 dark:text-slate-100">
										{exp.titleRu}
									</span>
									{exp.isLocked && (
										<span className="pnl-tag-locked">Системная</span>
									)}
								</td>
								<td>
									{exp.costNature === "direct_cogs" && (
										<span className="pnl-tag-cogs">Прямая себестоимость (COGS)</span>
									)}
									{exp.costNature === "opex" && (
										<span className="pnl-tag-opex">Операционные расходы (OPEX)</span>
									)}
									{exp.costNature === "taxes" && (
										<span className="pnl-tag-taxes">Налоги и сборы</span>
									)}
								</td>
								<td className="font-semibold">{exp.amountRub.toLocaleString("ru-RU")} ₽</td>
								<td>{exp.shareOfExpensesPct}%</td>
							</tr>
						))}
						<tr className="total-row">
							<td colSpan={3}>ИТОГО РАСХОДОВ КЛИНИКИ</td>
							<td>{report.totalExpensesRub.toLocaleString("ru-RU")} ₽</td>
							<td>100%</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
};
