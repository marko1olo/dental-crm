import React from "react";
import { Check } from "lucide-react";
import type { ComprehensivePlanVariant, PlanTierCode } from "../planPresentationPresets";

export interface ComparatorCardProps {
	tierKey: PlanTierCode;
	variant: ComprehensivePlanVariant;
	isSelected: boolean;
	onSelect: (tier: PlanTierCode) => void;
}

export const ComparatorCard: React.FC<ComparatorCardProps> = ({
	tierKey,
	variant: v,
	isSelected,
	onSelect,
}) => {
	return (
		<div
			className={`plan-card ${isSelected ? "selected" : ""}`}
			onClick={() => onSelect(tierKey)}
			data-testid={`plan-card-${tierKey}`}
		>
			<span className={`plan-card-badge ${v.badgeType}`}>
				{v.badgeText}
			</span>

			<div>
				<h3 className="plan-card-title">{v.title}</h3>
				<p style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)", margin: "2px 0 0 0" }}>
					{v.implantSystem}
				</p>
			</div>

			<div className="plan-card-cost">
				<span>{v.totalCostRub.toLocaleString("ru-RU")} ₽</span>
				<span className="plan-card-cost-sub">
					/ {v.totalVisitsCount} виз. ({v.totalDurationWeeks} нед.)
				</span>
			</div>

			<div className="plan-metric-group">
				<div>
					<div className="plan-metric-row">
						<span>Эстетический индекс:</span>
						<strong>{v.aestheticScore} / 10</strong>
					</div>
					<div className="plan-metric-bar-bg">
						<div
							className="plan-metric-bar-fill"
							style={{ width: `${v.aestheticScore * 10}%` }}
						/>
					</div>
				</div>

				<div style={{ marginTop: "2px" }}>
					<div className="plan-metric-row">
						<span>Прогноз службы:</span>
						<strong>{v.estimatedServiceLifeYears} лет (гарантия {v.warrantyYears} г.)</strong>
					</div>
					<div className="plan-metric-bar-bg">
						<div
							className="plan-metric-bar-fill"
							style={{ width: `${Math.min(100, (v.estimatedServiceLifeYears / 25) * 100)}%` }}
						/>
					</div>
				</div>

				<div style={{ marginTop: "2px" }}>
					<div className="plan-metric-row">
						<span>Стоимость за 1 год службы:</span>
						<strong style={{ color: "var(--plan-primary)" }}>
							{Math.round(v.totalCostRub / v.estimatedServiceLifeYears).toLocaleString("ru-RU")} ₽/год
						</strong>
					</div>
				</div>
			</div>

			<ul className="plan-feature-list">
				{v.keyAdvantages.slice(0, 3).map((adv, idx) => (
					<li key={idx} className="plan-feature-item">
						<Check size={14} className="plan-feature-icon" />
						<span>{adv}</span>
					</li>
				))}
			</ul>

			<button
				type="button"
				className={isSelected ? "plan-action-btn-primary" : "plan-action-btn-secondary"}
				style={{ marginTop: "auto", width: "100%" }}
				onClick={(e) => {
					e.stopPropagation();
					onSelect(tierKey);
				}}
			>
				{isSelected ? (
					<>
						<Check size={14} />
						<span>Выбранный вариант</span>
					</>
				) : (
					<span>Выбрать этот план</span>
				)}
			</button>
		</div>
	);
};
