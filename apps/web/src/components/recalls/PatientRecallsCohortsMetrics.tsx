import type React from "react";
import type { CohortRetentionReport } from "./patientRecallEngine";

export interface PatientRecallsCohortsMetricsProps {
	readonly cohortReport: CohortRetentionReport;
}

export const PatientRecallsCohortsMetrics: React.FC<PatientRecallsCohortsMetricsProps> = ({ cohortReport }) => {
	const totalPatients = cohortReport.cohorts.reduce((acc, c) => acc + c.totalPatients, 0);
	const totalContacted = cohortReport.cohorts.reduce((acc, c) => acc + c.contactedCount, 0);
	const totalCompleted = cohortReport.cohorts.reduce((acc, c) => acc + c.completedCount, 0);

	return (
		<div
			className="recall-metrics-grid"
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
				gap: "12px",
				marginTop: "16px",
			}}
			data-testid="cohorts-3kpi-summary"
		>
			<div className="recall-metric-card recall-metric-card--primary">
				<span className="recall-metric-label">Всего на профосмотре</span>
				<div className="recall-metric-value-row">
					<span className="recall-metric-value">{totalPatients}</span>
					<span className="recall-metric-subtext">пациентов</span>
				</div>
			</div>

			<div className="recall-metric-card recall-metric-card--warning">
				<span className="recall-metric-label">Приглашено в этом месяце</span>
				<div className="recall-metric-value-row">
					<span className="recall-metric-value">{totalContacted}</span>
					<span className="recall-metric-subtext">контактов</span>
				</div>
			</div>

			<div className="recall-metric-card recall-metric-card--success">
				<span className="recall-metric-label">Дошли до кресла (Конверсия %)</span>
				<div className="recall-metric-value-row">
					<span className="recall-metric-value">
						{totalCompleted} <span style={{ fontSize: "1rem", fontWeight: 600 }}>({cohortReport.overallConversionRatePercent}%)</span>
					</span>
				</div>
			</div>
		</div>
	);
};
