import React from "react";
import { Percent } from "lucide-react";
import { formatKopecksToRubExact } from "../roadmapPriceHelpers.js";

export interface RoadmapHeroProgressCardProps {
	readonly planTitle: string;
	readonly planNumber: string;
	readonly curatingDoctorName: string;
	readonly patientFullName: string;
	readonly progressPercent: number;
	readonly grandTotalKopecks: number;
	readonly completedTotalKopecks: number;
	readonly remainingTotalKopecks: number;
}

export const RoadmapHeroProgressCard: React.FC<RoadmapHeroProgressCardProps> = ({
	planTitle,
	planNumber,
	curatingDoctorName,
	patientFullName,
	progressPercent,
	grandTotalKopecks,
	completedTotalKopecks,
	remainingTotalKopecks,
}) => {
	return (
		<div className="roadmap-hero" data-testid="roadmap-hero">
			<div className="roadmap-header-row">
				<div>
					<div className="text-xs font-semibold text-[var(--brand,#0d9488)] uppercase tracking-wider">
						{planNumber} • Куратор: {curatingDoctorName}
					</div>
					<h3 className="roadmap-title">{planTitle}</h3>
					<div className="roadmap-subtitle">Пациент: {patientFullName}</div>
				</div>

				<div className="roadmap-percent-pill" data-testid="roadmap-percent-pill">
					<Percent className="w-3.5 h-3.5" />
					<span>{progressPercent}% выполнено</span>
				</div>
			</div>

			{/* Progress bar */}
			<div className="roadmap-progress-bar-bg">
				<div
					className="roadmap-progress-bar-fill"
					style={{ width: `${progressPercent}%` }}
					data-testid="roadmap-progress-bar-fill"
				/>
			</div>

			{/* Financial Metrics in Exact Rubles & Kopecks */}
			<div className="roadmap-metrics-grid">
				<div className="roadmap-metric-card">
					<div className="roadmap-metric-label">Общая стоимость плана</div>
					<div className="roadmap-metric-value" data-testid="metric-total-cost">
						{formatKopecksToRubExact(grandTotalKopecks)} ₽
					</div>
				</div>

				<div className="roadmap-metric-card">
					<div className="roadmap-metric-label">Оплачено и выполнено</div>
					<div className="roadmap-metric-value text-emerald-400" data-testid="metric-completed-cost">
						{formatKopecksToRubExact(completedTotalKopecks)} ₽
					</div>
				</div>

				<div className="roadmap-metric-card">
					<div className="roadmap-metric-label">Остаток к оплате</div>
					<div className="roadmap-metric-value text-amber-400" data-testid="metric-remaining-cost">
						{formatKopecksToRubExact(remainingTotalKopecks)} ₽
					</div>
				</div>
			</div>
		</div>
	);
};
