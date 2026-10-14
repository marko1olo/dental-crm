import React from "react";
import type { ExecutiveKpisSummary, ExecutivePeriod } from "@dental/shared";
import { Activity, AlertTriangle, Calendar, CalendarPlus, CreditCard } from "lucide-react";
import {
	computeChairEconomicsSummary,
	type ExecutivePeriodComputedMetrics,
} from "./executiveAnalyticsTypes";

export interface MobileExecutiveFitnessRingsProps {
	readonly periodMetrics: ExecutivePeriodComputedMetrics;
	readonly kpis?: ExecutiveKpisSummary | null | undefined;
}

export const MobileExecutiveFitnessRings: React.FC<MobileExecutiveFitnessRingsProps> = ({
	periodMetrics,
	kpis,
}) => {
	const ring1Percent = Math.min(100, Math.max(0, Number.isFinite(periodMetrics.revenuePercent) ? Math.round(periodMetrics.revenuePercent) : 0));
	const ring2Percent = Math.min(100, Math.max(0, Number.isFinite(periodMetrics.occupancyPercent) ? Math.round(periodMetrics.occupancyPercent) : 0));
	const ring3Percent = Math.min(100, Math.max(0, Number.isFinite(kpis?.leadToSanitationConversionPercent) ? Math.round(kpis?.leadToSanitationConversionPercent ?? 0) : 0));

	// Длины окружностей: 2 * PI * r (r=64 -> 402.12, r=50 -> 314.16, r=36 -> 226.19)
	const c1 = 402.12;
	const c2 = 314.16;
	const c3 = 226.19;

	const offset1 = Math.max(0, Math.min(c1, c1 - (c1 * ring1Percent) / 100));
	const offset2 = Math.max(0, Math.min(c2, c2 - (c2 * ring2Percent) / 100));
	const offset3 = Math.max(0, Math.min(c3, c3 - (c3 * ring3Percent) / 100));

	const totalChairsCount = kpis?.totalChairsCount ?? 1;
	const totalSanitationCount = kpis?.totalSanitationCount ?? 0;

	return (
		<section className="mobile-exec-rings-card" aria-label="Кольца активности клиники">
			<div className="mobile-exec-rings-header">
				<span className="mobile-exec-rings-title">Активность клиники</span>
				<span className="mobile-exec-badge-health">
					<Activity size={12} aria-hidden="true" />
					Пульс клиники
				</span>
			</div>

			<div className="mobile-exec-rings-layout">
				{/* Тройное концентрическое кольцо Apple Fitness (SVG) */}
				<div className="mobile-exec-rings-svg-wrap">
					<svg
						className="mobile-exec-rings-svg"
						viewBox="0 0 160 160"
						width="130"
						height="130"
						aria-label={`Кольца активности: Выручка ${ring1Percent}%, Загрузка ${ring2Percent}%, Санация ${ring3Percent}%`}
						role="img"
					>
						<circle cx="80" cy="80" r="64" className="ring-track ring-track-revenue" />
						<circle cx="80" cy="80" r="50" className="ring-track ring-track-occupancy" />
						<circle cx="80" cy="80" r="36" className="ring-track ring-track-sanitation" />

						<circle
							cx="80"
							cy="80"
							r="64"
							className="ring-fill ring-fill-revenue"
							strokeDasharray={c1}
							strokeDashoffset={offset1}
						/>
						<circle
							cx="80"
							cy="80"
							r="50"
							className="ring-fill ring-fill-occupancy"
							strokeDasharray={c2}
							strokeDashoffset={offset2}
						/>
						<circle
							cx="80"
							cy="80"
							r="36"
							className="ring-fill ring-fill-sanitation"
							strokeDasharray={c3}
							strokeDashoffset={offset3}
						/>
					</svg>
				</div>

				{/* Легенда колец Apple Fitness */}
				<div className="mobile-exec-rings-legend">
					<div className="rings-legend-item">
						<span className="rings-legend-dot dot-revenue" />
						<div className="rings-legend-text">
							<div className="rings-legend-row">
								<span className="rings-legend-name">Выручка</span>
								<span className="rings-legend-pct">{ring1Percent}%</span>
							</div>
							<div className="rings-legend-val">{periodMetrics.revenueFormatted}</div>
						</div>
					</div>

					<div className="rings-legend-item">
						<span className="rings-legend-dot dot-occupancy" />
						<div className="rings-legend-text">
							<div className="rings-legend-row">
								<span className="rings-legend-name">Загрузка</span>
								<span className="rings-legend-pct">{ring2Percent}%</span>
							</div>
							<div className="rings-legend-val">
								{totalChairsCount} {totalChairsCount === 1 ? "кресло" : "кресла"} • {periodMetrics.chairEffectiveHourlyYieldFormatted}
							</div>
						</div>
					</div>

					<div className="rings-legend-item">
						<span className="rings-legend-dot dot-sanitation" />
						<div className="rings-legend-text">
							<div className="rings-legend-row">
								<span className="rings-legend-name">Санация</span>
								<span className="rings-legend-pct">{ring3Percent}%</span>
							</div>
							<div className="rings-legend-val">
								{totalSanitationCount} завершённых планов
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export interface DesktopExecutiveEmptyStateBannerProps {
	readonly isEmpty: boolean;
	readonly period: ExecutivePeriod;
	readonly kpis: ExecutiveKpisSummary;
	readonly onSelectPeriod: (p: ExecutivePeriod) => void;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export const DesktopExecutiveEmptyStateBanner: React.FC<DesktopExecutiveEmptyStateBannerProps> = ({
	isEmpty,
	period,
	kpis,
	onSelectPeriod,
	onNavigateToSection,
}) => {
	const econ = computeChairEconomicsSummary(kpis);

	if (!isEmpty) return null;

	return (
		<div
			className="executive-panel"
			role="status"
			style={{
				padding: "1rem 1.25rem",
				marginBottom: "1rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "1rem",
				borderLeft: "4px solid var(--teal, #0d9488)",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
				<AlertTriangle size={20} style={{ color: "var(--teal, #0d9488)", flexShrink: 0 }} aria-hidden="true" />
				<div>
					<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
						За выбранный период записей и оплат пока нет
					</div>
					<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Выберите другой период или оформите приём в расписании для расчёта сквозной воронки (базовая ставка кресла: {econ.chairHourlyCostRub.toLocaleString("ru-RU")} ₽/ч)
					</div>
				</div>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
				<button
					type="button"
					className="executive-primary-action-btn"
					onClick={() => {
						if (onNavigateToSection) {
							onNavigateToSection("schedule");
						} else if (typeof window !== "undefined") {
							window.location.hash = "#schedule";
						}
					}}
					title="Записать пациента на приём"
				>
					<CalendarPlus size={14} aria-hidden="true" />
					<span>Записать пациента</span>
				</button>
				<button
					type="button"
					className="executive-refresh-btn"
					onClick={() => {
						if (onNavigateToSection) {
							onNavigateToSection("shift");
						} else if (typeof window !== "undefined") {
							window.location.hash = "#shift";
						}
					}}
					title="Открыть смену или перейти в кассу"
				>
					<CreditCard size={14} aria-hidden="true" />
					<span>Перейти в кассу</span>
				</button>
				{period !== "month" && (
					<button
						type="button"
						className="executive-refresh-btn"
						onClick={() => onSelectPeriod("month")}
					>
						<Calendar size={14} aria-hidden="true" />
						<span>Показать за месяц</span>
					</button>
				)}
			</div>
		</div>
	);
};
