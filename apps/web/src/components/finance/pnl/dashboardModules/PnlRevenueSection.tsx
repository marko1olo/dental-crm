import type React from "react";
import { PieChart, Wallet } from "lucide-react";
import { DEPARTMENT_METADATA_RU, type ManagerialPnlReport } from "@dental/shared";

export interface PnlRevenueSectionProps {
	readonly report: ManagerialPnlReport;
}

export const PnlRevenueSection: React.FC<PnlRevenueSectionProps> = ({ report }) => {
	return (
		<div className="pnl-grid-two-col">
			{/* Направления клиники */}
			<div>
				<h3 className="pnl-section-title">
					<PieChart size={15} className="text-blue-600" />
					<span>1. Выручка по отделениям</span>
				</h3>
				<div className="pnl-table-wrapper">
					<table className="pnl-table">
						<thead>
							<tr>
								<th>Направление</th>
								<th>Выручка</th>
								<th>Доля</th>
								<th>Прямые затраты</th>
								<th>Маржа</th>
								<th>Рент.</th>
								<th>Ср. чек</th>
							</tr>
						</thead>
						<tbody>
							{report.departmentRevenue.map((dept) => {
								const color = DEPARTMENT_METADATA_RU[dept.department]?.color || "var(--teal)";
								return (
									<tr key={dept.department}>
										<td>
											<div className="font-semibold text-slate-800 dark:text-slate-100">{dept.titleRu}</div>
											<div className="pnl-progress-bar-bg">
												<div className="pnl-progress-bar-fill" style={{ width: `${dept.sharePct}%`, background: color }} />
											</div>
										</td>
										<td className="font-semibold">{dept.revenueRub.toLocaleString("ru-RU")} ₽</td>
										<td>{dept.sharePct}%</td>
										<td className="text-rose-600 dark:text-rose-400">{dept.directCostsRub.toLocaleString("ru-RU")} ₽</td>
										<td className="font-semibold text-emerald-600 dark:text-emerald-400">{dept.marginRub.toLocaleString("ru-RU")} ₽</td>
										<td className="font-semibold">{dept.marginPct}%</td>
										<td>{dept.averageBillRub.toLocaleString("ru-RU")} ₽</td>
									</tr>
								);
							})}
							<tr className="total-row">
								<td>ИТОГО ВЫРУЧКА</td>
								<td>{report.grossRevenueRub.toLocaleString("ru-RU")} ₽</td>
								<td>100%</td>
								<td className="text-rose-600 dark:text-rose-400">{report.totalCogsRub.toLocaleString("ru-RU")} ₽</td>
								<td className="text-emerald-600 dark:text-emerald-400">{report.grossProfitRub.toLocaleString("ru-RU")} ₽</td>
								<td>{report.grossMarginPct}%</td>
								<td>—</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Кассовые счета */}
			<div>
				<h3 className="pnl-section-title">
					<Wallet size={15} className="text-blue-600" />
					<span>2. Поступления по кассам ({report.cashBoxRevenue.length})</span>
				</h3>
				<div className="pnl-table-wrapper">
					<table className="pnl-table">
						<thead>
							<tr>
								<th>Кассовый счет</th>
								<th>Тип счета</th>
								<th>Поступления</th>
								<th>Доля</th>
							</tr>
						</thead>
						<tbody>
							{report.cashBoxRevenue.map((box) => (
								<tr key={box.boxId}>
									<td className="font-semibold text-slate-800 dark:text-slate-100">{box.boxName}</td>
									<td className="text-slate-500 font-mono text-xs">{box.boxType}</td>
									<td className="font-semibold">{box.revenueRub.toLocaleString("ru-RU")} ₽</td>
									<td>{box.sharePct}%</td>
								</tr>
							))}
							{report.cashBoxRevenue.length === 0 && (
								<tr>
									<td colSpan={4} className="text-center py-4 text-slate-400">
										Нет поступлений в кассах за указанный период
									</td>
								</tr>
							)}
							<tr className="total-row">
								<td>ИТОГО ПО КАССАМ</td>
								<td>—</td>
								<td>{report.grossRevenueRub.toLocaleString("ru-RU")} ₽</td>
								<td>100%</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
