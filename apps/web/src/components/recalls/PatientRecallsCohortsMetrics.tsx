import type React from "react";
import type { CohortRetentionReport } from "./patientRecallEngine";

export interface PatientRecallsCohortsMetricsProps {
	readonly cohortReport: CohortRetentionReport;
}

export const PatientRecallsCohortsMetrics: React.FC<PatientRecallsCohortsMetricsProps> = ({ cohortReport }) => {
	return (
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
	);
};
