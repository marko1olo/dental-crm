import type React from "react";
import type { CohortRetentionReport } from "./patientRecallEngine";

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
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "12px",
				}}
			>
				<div>
					<h3 style={{ margin: 0, fontSize: "1.0625rem", color: "var(--rm-text-main)" }}>
						Когортная аналитика возвращаемости и LTV recall-пациентов
					</h3>
					<p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--rm-text-muted)" }}>
						Группировка пациентов по периодам визитов и оценка эффективности повторного привлечения
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

			<div className="recall-table-wrap">
				<table className="recall-table">
					<thead>
						<tr>
							<th scope="col">Когорта (Период)</th>
							<th scope="col">Пациентов</th>
							<th scope="col">Пора звать</th>
							<th scope="col">Приглашены</th>
							<th scope="col">Записались</th>
							<th scope="col">Пришли</th>
							<th scope="col">Отказ</th>
							<th scope="col">Retention Rate %</th>
							<th scope="col">Конверсия %</th>
							<th scope="col">Средний LTV</th>
							<th scope="col">Выручка визитов</th>
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
								<td style={{ color: "var(--rm-success)", fontWeight: 700 }}>
									{cohort.completedCount}
								</td>
								<td style={{ color: "var(--rm-danger)" }}>{cohort.declinedCount}</td>
								<td>
									<span className="recall-badge recall-badge--upcoming" style={{ fontWeight: 800 }}>
										{cohort.retentionRatePercent}%
									</span>
								</td>
								<td>
									<span className="recall-badge recall-badge--completed">
										{cohort.conversionRatePercent}%
									</span>
								</td>
								<td>{cohort.averageLtvRub.toLocaleString("ru-RU")} ₽</td>
								<td style={{ fontWeight: 700, color: "var(--rm-text-main)" }}>
									{cohort.totalRevenueRub.toLocaleString("ru-RU")} ₽
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Cohort Summary Footer Cards */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
					gap: "12px",
					marginTop: "16px",
				}}
			>
				<div className="recall-metric-card recall-metric-card--success">
					<span className="recall-metric-label">Общая возвращаемость (Retention)</span>
					<div className="recall-metric-value-row">
						<span className="recall-metric-value">{cohortReport.overallRetentionRatePercent}%</span>
					</div>
				</div>

				<div className="recall-metric-card recall-metric-card--primary">
					<span className="recall-metric-label">Общая конверсия реестра</span>
					<div className="recall-metric-value-row">
						<span className="recall-metric-value">{cohortReport.overallConversionRatePercent}%</span>
					</div>
				</div>

				<div className="recall-metric-card">
					<span className="recall-metric-label">Выручка от повторных визитов</span>
					<div className="recall-metric-value-row">
						<span className="recall-metric-value">
							{cohortReport.totalRecallRevenueRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				<div className="recall-metric-card recall-metric-card--danger">
					<span className="recall-metric-label">Упущенная выгода (не дошли)</span>
					<div className="recall-metric-value-row">
						<span className="recall-metric-value">
							{cohortReport.totalLostRevenueRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>
			</div>
		</main>
	);
};
