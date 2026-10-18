import React from "react";
import type { ExecutiveKpisSummary } from "@dental/shared";
import { Activity, Users } from "lucide-react";
import { computeChairEconomicsSummary } from "./executiveAnalyticsTypes";

export interface DesktopExecutiveTelemetryBarProps {
	readonly kpis: ExecutiveKpisSummary;
}

export const DesktopExecutiveTelemetryBar: React.FC<DesktopExecutiveTelemetryBarProps> = ({
	kpis,
}) => {
	const chairEcon = computeChairEconomicsSummary(kpis);

	return (
		<footer className="executive-telemetry-bar" aria-label="Операционная телеметрия">
			<div className="telemetry-item">
				<Users size={15} aria-hidden="true" />
				<span>Активных врачей:</span>
				<span className="telemetry-val">{kpis.activeDoctorsCount ?? 0}</span>
			</div>

			<div className="telemetry-item">
				<Activity size={15} aria-hidden="true" />
				<span>Завершено визитов:</span>
				<span className="telemetry-val">{kpis.totalCompletedVisits ?? 0}</span>
			</div>

			<div className="telemetry-item">
				<span>Первичные / Повторные:</span>
				<span className="telemetry-val">
					{kpis.primaryPatientsCount ?? 0} ({kpis.primaryPatientsPercent ?? 0}%) / {kpis.repeatPatientsCount ?? 0}
				</span>
			</div>

			<div className="telemetry-item">
				<span>Средний чек:</span>
				<span className="telemetry-val">{kpis.averageCheckFormatted || "0 ₽"}</span>
			</div>

			<div className="telemetry-item">
				<span>Себестоимость кресло-часа:</span>
				<span className="telemetry-val">{chairEcon.chairHourlyCostRub.toLocaleString("ru-RU")} ₽/ч</span>
			</div>

			<div className="telemetry-item">
				<span>Потери от неявок (No-Show):</span>
				<span className="telemetry-val">{chairEcon.noShowLostRevenueRub.toLocaleString("ru-RU")} ₽</span>
			</div>

			<div className="telemetry-item">
				<span>Маркетинговый бюджет:</span>
				<span className="telemetry-val">{kpis.totalMarketingSpendFormatted || "0 ₽"}</span>
			</div>
		</footer>
	);
};
