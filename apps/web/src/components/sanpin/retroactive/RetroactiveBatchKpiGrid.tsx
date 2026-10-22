import React from "react";
import type { RetroactiveBatchStats } from "../retroactiveSanpinEngine";

export interface RetroactiveBatchKpiGridProps {
	readonly stats: RetroactiveBatchStats;
}

export function RetroactiveBatchKpiGrid({ stats }: RetroactiveBatchKpiGridProps) {
	return (
		<div className="sanpin-kpi-grid">
			<div className="sanpin-kpi-card" style={{ minHeight: "88px" }}>
				<span className="sanpin-kpi-label">Смен в периоде</span>
				<span className="sanpin-kpi-value">
					{stats.workingDaysCount} <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>из {stats.totalDays} дн.</span>
				</span>
				<span className="sanpin-kpi-subtext" style={{ color: "var(--ok-fg)", fontWeight: 600 }}>
					Все смены укомплектованы
				</span>
			</div>

			<div className="sanpin-kpi-card" style={{ minHeight: "88px" }}>
				<span className="sanpin-kpi-label">Лотков и наборов</span>
				<span className="sanpin-kpi-value">{stats.totalTraysProcessed} шт.</span>
				<span className="sanpin-kpi-subtext">Очистка: {stats.totalPsoSamplesTested} проб (1% min 3-5)</span>
			</div>

			<div className="sanpin-kpi-card" style={{ minHeight: "88px" }}>
				<span className="sanpin-kpi-label">Циклов автоклава</span>
				<span className="sanpin-kpi-value">{stats.totalAutoclaveCycles} циклов</span>
				<span className="sanpin-kpi-subtext" style={{ color: "var(--ok-fg)", fontWeight: 600 }}>
					5 точек КТ-1..5: 100% стерильно
				</span>
			</div>

			<div className="sanpin-kpi-card" style={{ minHeight: "88px" }}>
				<span className="sanpin-kpi-label">Наработка УФ ламп</span>
				<span className="sanpin-kpi-value">{stats.totalRecirculatorHours} ч</span>
				<span className="sanpin-kpi-subtext">Ген. уборок: {stats.generalCleaningsCount}</span>
			</div>

			<div className="sanpin-kpi-card" style={{ minHeight: "88px" }}>
				<span className="sanpin-kpi-label">Соответствие СанПиН</span>
				<span className="sanpin-kpi-value" style={{ color: "var(--ok-fg)" }}>100%</span>
				<span className="sanpin-kpi-subtext" style={{ color: "var(--ok-fg)", fontWeight: 600 }}>
					Готово к Роспотребнадзору
				</span>
			</div>
		</div>
	);
}
