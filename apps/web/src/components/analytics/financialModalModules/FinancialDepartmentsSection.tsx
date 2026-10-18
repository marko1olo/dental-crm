import React from "react";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import type { ExecutiveDepartmentData } from "./financialPnlTypes";

export interface FinancialDepartmentsSectionProps {
	readonly isDeptsExpanded: boolean;
	readonly onToggleDepts: () => void;
	readonly departments: ExecutiveDepartmentData[];
	readonly totalCompletedVisits: number;
}

export const FinancialDepartmentsSection: React.FC<FinancialDepartmentsSectionProps> = ({
	isDeptsExpanded,
	onToggleDepts,
	departments,
	totalCompletedVisits,
}) => {
	return (
		<section className="fin-analytics-panel" data-testid="panel-departments">
			<div className="fin-analytics-panel-header">
				<h3 className="fin-analytics-panel-title">
					<Building2 size={16} color="var(--teal)" />
					<span>План и факт выручки по 5 отделениям клиники</span>
				</h3>
				<button
					type="button"
					onClick={onToggleDepts}
					className="secondary-button fin-analytics-toggle-btn"
					aria-expanded={isDeptsExpanded}
					data-testid="toggle-depts-btn"
				>
					{isDeptsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					<span>{isDeptsExpanded ? "Скрыть отделения" : "Показать аналитику отделений"}</span>
				</button>
			</div>

			{!isDeptsExpanded && (
				<div className="fin-analytics-compact-strip" data-testid="depts-compact-strip">
					<span style={{ color: "var(--muted)" }}>
						5 направлений: Терапия • Ортопедия • Хирургия • Ортодонтия • Детство. Всего визитов:{" "}
						<strong>{totalCompletedVisits}</strong>.
					</span>
					<button
						type="button"
						onClick={onToggleDepts}
						className="secondary-button fin-analytics-toggle-btn"
						style={{ fontSize: 11, height: 26, minHeight: 26 }}
					>
						Развернуть показатели отделений →
					</button>
				</div>
			)}

			{isDeptsExpanded && (
				<div className="fin-analytics-table-wrap" data-testid="depts-table-expanded">
					<table className="fin-analytics-table">
						<thead>
							<tr>
								<th>Отделение</th>
								<th style={{ textAlign: "right" }}>План (₽)</th>
								<th style={{ textAlign: "right" }}>Факт (₽)</th>
								<th style={{ textAlign: "center" }}>Выполнение</th>
								<th style={{ textAlign: "center" }}>Визиты</th>
								<th style={{ textAlign: "center" }}>Пациенты</th>
								<th style={{ textAlign: "right" }}>Ср. чек (₽)</th>
								<th style={{ textAlign: "center" }}>Доля (%)</th>
							</tr>
						</thead>
						<tbody>
							{departments.length === 0 ? (
								<tr>
									<td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: 16 }}>
										Нет данных по отделениям за выбранный период
									</td>
								</tr>
							) : (
								departments.map((d) => {
									const deptTitle = d.titleRu || d.shortTitleRu || d.departmentNameRu || d.departmentKey;
									const avgBillStr =
										d.averageCheckFormatted ||
										`${Math.round((d.averageCheckRub ?? ((d.averageCheckKopecks ?? d.averageBillKopecks ?? 0) / 100))).toLocaleString("ru-RU")} ₽`;
									const sharePct = d.shareOfTotalRevenuePercent ?? d.revenueSharePercent ?? 0;

									return (
										<tr key={d.departmentKey}>
											<td style={{ fontWeight: 600 }}>{deptTitle}</td>
											<td style={{ textAlign: "right", fontFamily: "monospace" }}>
												{Math.round(d.planRevenueKopecks / 100).toLocaleString("ru-RU")} ₽
											</td>
											<td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
												{Math.round(d.factRevenueKopecks / 100).toLocaleString("ru-RU")} ₽
											</td>
											<td style={{ textAlign: "center", fontWeight: 700, color: "var(--teal)" }}>
												{d.planFulfillmentPercent}%
											</td>
											<td style={{ textAlign: "center" }}>{d.completedVisitsCount}</td>
											<td style={{ textAlign: "center" }}>{d.uniquePatientsCount}</td>
											<td style={{ textAlign: "right", fontFamily: "monospace" }}>{avgBillStr}</td>
											<td style={{ textAlign: "center", fontWeight: 600 }}>{sharePct}%</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
};
export default FinancialDepartmentsSection;
