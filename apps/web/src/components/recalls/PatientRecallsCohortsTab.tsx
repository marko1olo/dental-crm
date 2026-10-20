import type React from "react";
import type { CohortRetentionReport } from "./patientRecallEngine";
import { PatientRecallsCohortsMetrics } from "./PatientRecallsCohortsMetrics";

export interface PatientRecallsCohortsTabProps {
	readonly cohortReport: CohortRetentionReport;
	readonly cohortGrouping: "month" | "quarter";
	readonly onCohortGroupingChange: (grouping: "month" | "quarter") => void;
}

export const PatientRecallsCohortsTab: React.FC<PatientRecallsCohortsTabProps> = ({
	cohortReport,
	cohortGrouping,
	onCohortGroupingChange,
}) => {
	return (
		<main className="recall-content-area" data-testid="recall-cohorts-view">
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
				<div>
					<h3 style={{ margin: 0, fontSize: "1.0625rem", color: "var(--rm-text-main)" }}>
						Профосмотры и ретеншн пациентов
					</h3>
					<p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--rm-text-muted)" }}>
						Контроль регулярных визитов и возвращаемости к лечащему врачу
					</p>
				</div>

				<div style={{ display: "flex", gap: "6px" }}>
					<button
						type="button"
						className={`recall-chip ${cohortGrouping === "month" ? "active" : ""}`}
						onClick={() => onCohortGroupingChange("month")}
					>
						По месяцам
					</button>
					<button
						type="button"
						className={`recall-chip ${cohortGrouping === "quarter" ? "active" : ""}`}
						onClick={() => onCohortGroupingChange("quarter")}
					>
						По кварталам
					</button>
				</div>
			</div>

			<PatientRecallsCohortsMetrics cohortReport={cohortReport} />

			<div className="recall-table-wrap" style={{ marginTop: "16px" }}>
				<table className="recall-table">
					<thead>
						<tr>
							<th scope="col">Период визита</th>
							<th scope="col">Всего</th>
							<th scope="col">Пора звать</th>
							<th scope="col">Приглашены</th>
							<th scope="col">Записались</th>
							<th scope="col">Дошли</th>
							<th scope="col">Конверсия %</th>
							<th scope="col">Выручка</th>
						</tr>
					</thead>
					<tbody>
						{cohortReport.cohorts.map((cohort) => (
							<tr key={cohort.cohortKey} data-testid={`cohort-row-${cohort.cohortKey}`}>
								<td style={{ fontWeight: 700 }}>{cohort.cohortLabel}</td>
								<td>{cohort.totalPatients}</td>
								<td>{cohort.dueCount}</td>
								<td>{cohort.contactedCount}</td>
								<td>{cohort.scheduledCount}</td>
								<td style={{ color: "var(--rm-success)", fontWeight: 700 }}>{cohort.completedCount}</td>
								<td>
									<span className="recall-badge recall-badge--completed">
										{cohort.conversionRatePercent}%
									</span>
								</td>
								<td style={{ fontWeight: 700, color: "var(--rm-text-main)" }}>
									{cohort.totalRevenueRub.toLocaleString("ru-RU")} ₽
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</main>
	);
};
