import React from "react";
import type { ExecutiveKpisSummary } from "@dental/shared";
import {
	Activity,
	ArrowUpRight,
	CheckCircle2,
	Coins,
	CreditCard,
	Filter,
	TrendingUp,
	UserCheck,
} from "lucide-react";
import {
	computeChairEconomicsSummary,
	type ExecutivePeriodComputedMetrics,
} from "./executiveAnalyticsTypes";

export interface MobileExecutiveKpiCardsProps {
	readonly periodMetrics: ExecutivePeriodComputedMetrics;
	readonly totalChairsCount: number;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export const MobileExecutiveKpiCards: React.FC<MobileExecutiveKpiCardsProps> = ({
	periodMetrics,
	totalChairsCount,
	onNavigateToSection,
}) => {
	return (
		<section className="mobile-exec-kpi-grid" aria-label="Ключевые показатели клиники">
			{/* KPI 1: Выручка клиники */}
			<div className="mobile-exec-kpi-card" data-testid="kpi-card-revenue">
				<div className="kpi-card-top">
					<span className="kpi-card-label">Выручка клиники</span>
					<div className="kpi-card-icon-wrap icon-teal">
						<Coins size={16} aria-hidden="true" />
					</div>
				</div>
				<div className="kpi-card-value font-mono">{periodMetrics.revenueFormatted}</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-success">
						<ArrowUpRight size={12} aria-hidden="true" />
						{periodMetrics.revenueDelta}
					</span>
					<span className="kpi-card-sub">План: {periodMetrics.revenuePlanFormatted}</span>
				</div>
			</div>

			{/* KPI 2: Загрузка кресел клиники */}
			<div
				className="mobile-exec-kpi-card"
				onClick={onNavigateToSection ? () => onNavigateToSection("freed_slots") : undefined}
				data-testid="kpi-card-occupancy"
			>
				<div className="kpi-card-top">
					<span className="kpi-card-label">Загрузка кресел</span>
					<div className="kpi-card-icon-wrap icon-teal">
						<Activity size={16} aria-hidden="true" />
					</div>
				</div>
				<div className="kpi-card-row-value">
					<div className="kpi-card-value font-mono">{periodMetrics.occupancyPercent}%</div>
					<div className="kpi-mini-ring" aria-hidden="true">
						<svg width="28" height="28" viewBox="0 0 28 28">
							<circle cx="14" cy="14" r="11" className="ring-track ring-track-occupancy" strokeWidth="3" />
							<circle
								cx="14"
								cy="14"
								r="11"
								className="ring-fill ring-fill-occupancy"
								strokeWidth="3"
								strokeDasharray={69.1}
								strokeDashoffset={69.1 - (69.1 * periodMetrics.occupancyPercent) / 100}
							/>
						</svg>
					</div>
				</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-neutral">
						<CheckCircle2 size={11} aria-hidden="true" />
						Оптимально
					</span>
					<span className="kpi-card-sub">{totalChairsCount} кресел • {periodMetrics.chairHourlyCostFormatted}</span>
				</div>
			</div>

			{/* KPI 3: Средний чек */}
			<div className="mobile-exec-kpi-card" data-testid="kpi-card-average-check">
				<div className="kpi-card-top">
					<span className="kpi-card-label">Средний чек</span>
					<div className="kpi-card-icon-wrap icon-teal">
						<CreditCard size={16} aria-hidden="true" />
					</div>
				</div>
				<div className="kpi-card-value font-mono">{periodMetrics.averageCheck}</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-success">
						<ArrowUpRight size={12} aria-hidden="true" />
						{periodMetrics.averageCheckDelta}
					</span>
					<span className="kpi-card-sub">LTV: {periodMetrics.ltv}</span>
				</div>
			</div>

			{/* KPI 4: Первичные пациенты */}
			<div
				className="mobile-exec-kpi-card"
				onClick={onNavigateToSection ? () => onNavigateToSection("curators") : undefined}
				data-testid="kpi-card-primary-patients"
			>
				<div className="kpi-card-top">
					<span className="kpi-card-label">Первичные</span>
					<div className="kpi-card-icon-wrap icon-teal">
						<UserCheck size={16} aria-hidden="true" />
					</div>
				</div>
				<div className="kpi-card-value font-mono">{periodMetrics.primaryPatients} пац.</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-success">
						<ArrowUpRight size={12} aria-hidden="true" />
						{periodMetrics.primaryDelta}
					</span>
					<span className="kpi-card-sub">Повторные: {periodMetrics.repeatPatients}</span>
				</div>
			</div>
		</section>
	);
};

export interface DesktopExecutiveKpiCardsProps {
	readonly kpis: ExecutiveKpisSummary;
	readonly onOpenPnl: () => void;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export const DesktopExecutiveKpiCards: React.FC<DesktopExecutiveKpiCardsProps> = ({
	kpis,
	onOpenPnl,
	onNavigateToSection,
}) => {
	const chairEcon = computeChairEconomicsSummary(kpis);

	return (
		<section className="executive-kpi-grid" aria-label="Ключевые показатели эффективности клиники">
			{/* 1. Выручка клиники План / Факт */}
			<div className="executive-kpi-card" style={{ "--card-accent": "var(--teal, #0d9488)" } as React.CSSProperties}>
				<div>
					<div className="executive-kpi-header">
						<span className="executive-kpi-label" title="Выручка клиники (Факт / План)">Выручка клиники</span>
						<div className="executive-kpi-icon-wrap executive-kpi-icon-teal">
							<Coins size={18} aria-hidden="true" />
						</div>
					</div>
					<div className="executive-kpi-main-val font-mono">{kpis.totalRevenueFormatted || "0 ₽"}</div>
				</div>
				<div className="executive-kpi-subtext">
					<span>План: {kpis.totalRevenuePlanFormatted || "0 ₽"}</span>
					<span
						className={`executive-pill ${
							(kpis.overallPlanFulfillmentPercent ?? 0) >= 95
								? "executive-pill-success"
								: (kpis.overallPlanFulfillmentPercent ?? 0) >= 75
									? "executive-pill-warning"
									: "executive-pill-danger"
						}`}
					>
						{kpis.overallPlanFulfillmentPercent ?? 0}% плана
					</span>
				</div>
			</div>

			{/* 2. Чистая прибыль клиники (P&L Net Profit) */}
			<div
				className="executive-kpi-card"
				style={{
					"--card-accent": (kpis.netProfitKopecks ?? 0) >= 0 ? "var(--ok-fg, #10b981)" : "var(--err-fg, #ef4444)",
					cursor: "pointer",
				} as React.CSSProperties}
				onClick={onOpenPnl}
				title="Управленческий P&L: Нажмите для детального отчета о прибылях и убытках"
				data-testid="kpi-card-net-profit"
			>
				<div>
					<div className="executive-kpi-header">
						<span className="executive-kpi-label" title="Чистая операционная прибыль (P&L)">Чистая прибыль</span>
						<div className="executive-kpi-icon-wrap executive-kpi-icon-teal">
							<TrendingUp size={18} aria-hidden="true" />
						</div>
					</div>
					<div
						className="executive-kpi-main-val font-mono"
						style={{ color: (kpis.netProfitKopecks ?? 0) >= 0 ? "var(--ink, #0f172a)" : "var(--err-fg, #ef4444)" }}
					>
						{kpis.netProfitFormatted || "0 ₽"}
					</div>
				</div>
				<div className="executive-kpi-subtext">
					<span>Рентабельность: {kpis.netMarginPercent ?? 0}%</span>
					<span
						className={`executive-pill ${
							(kpis.netMarginPercent ?? 0) >= 20
								? "executive-pill-success"
								: (kpis.netMarginPercent ?? 0) > 0
									? "executive-pill-neutral"
									: "executive-pill-danger"
						}`}
					>
						{(kpis.netProfitKopecks ?? 0) >= 0 ? "Прибыль" : "Убыток"}
					</span>
				</div>
			</div>

			{/* 3. Загрузка кресел клиники + маржинальность кресло-часа */}
			<div
				className="executive-kpi-card"
				style={{
					"--card-accent": "var(--teal, #0d9488)",
					cursor: onNavigateToSection ? "pointer" : "default",
				} as React.CSSProperties}
				onClick={onNavigateToSection ? () => onNavigateToSection("freed_slots") : undefined}
				title={`Себестоимость кресло-часа: ${chairEcon.chairHourlyCostRub.toLocaleString("ru-RU")} ₽/ч • Потери No-Show: ${chairEcon.noShowLostRevenueRub.toLocaleString("ru-RU")} ₽`}
				data-testid="kpi-card-chair-occupancy"
			>
				<div>
					<div className="executive-kpi-header">
						<span className="executive-kpi-label" title="Загрузка кресел клиники">Загрузка кресел</span>
						<div className="executive-kpi-icon-wrap executive-kpi-icon-teal">
							<Activity size={18} aria-hidden="true" />
						</div>
					</div>
					<div className="executive-kpi-main-val font-mono">{kpis.chairOccupancyRatePercent ?? 0}%</div>
				</div>
				<div className="executive-kpi-subtext">
					<span>Кресел: {kpis.totalChairsCount ?? 1} шт.</span>
					<span className={`executive-pill ${(kpis.cancellationRatePercent ?? 0) > 15 ? "executive-pill-warning" : "executive-pill-neutral"}`}>
						Отмены: {kpis.cancellationRatePercent ?? 0}%
					</span>
				</div>
			</div>

			{/* 4. Сквозная конверсия воронки */}
			<div
				className="executive-kpi-card"
				style={{
					"--card-accent": "var(--teal, #0d9488)",
					cursor: onNavigateToSection ? "pointer" : "default",
				} as React.CSSProperties}
				onClick={onNavigateToSection ? () => onNavigateToSection("curators") : undefined}
				title={onNavigateToSection ? "Перейти в рабочее место куратора пациентов" : undefined}
			>
				<div>
					<div className="executive-kpi-header">
						<span className="executive-kpi-label" title="Конверсия воронки (Лид → Санация)">Конверсия лидов</span>
						<div className="executive-kpi-icon-wrap executive-kpi-icon-teal">
							<Filter size={18} aria-hidden="true" />
						</div>
					</div>
					<div className="executive-kpi-main-val font-mono">{kpis.leadToSanitationConversionPercent ?? 0}%</div>
				</div>
				<div className="executive-kpi-subtext">
					<span>Лидов: {kpis.totalLeadsCount ?? 0} пац.</span>
					<span className="executive-pill executive-pill-neutral">
						ИИ-скрининг: {kpis.aiDiagnosticRatePercent ?? 0}%
					</span>
				</div>
			</div>

			{/* 5. Unit-экономика (LTV vs CAC) */}
			<div
				className="executive-kpi-card"
				style={{
					"--card-accent": "var(--teal, #0d9488)",
					cursor: onNavigateToSection ? "pointer" : "default",
				} as React.CSSProperties}
				onClick={onNavigateToSection ? () => onNavigateToSection("marketing") : undefined}
				title={onNavigateToSection ? "Перейти в сквозную аналитику маркетинга" : undefined}
			>
				<div>
					<div className="executive-kpi-header">
						<span className="executive-kpi-label" title="Unit-экономика (LTV vs CAC)">LTV / CAC</span>
						<div className="executive-kpi-icon-wrap executive-kpi-icon-teal">
							<TrendingUp size={18} aria-hidden="true" />
						</div>
					</div>
					<div className="executive-kpi-main-val font-mono">{kpis.patientLtvFormatted || "0 ₽"}</div>
				</div>
				<div className="executive-kpi-subtext">
					<span>CAC: {kpis.cacFormatted || "0 ₽"}</span>
					<span
						className={`executive-pill ${
							(kpis.ltvToCacRatio ?? 0) >= 3
								? "executive-pill-success"
								: (kpis.ltvToCacRatio ?? 0) >= 1
									? "executive-pill-neutral"
									: "executive-pill-warning"
						}`}
					>
						{kpis.ltvToCacRatio ?? 0}x окупаемость
					</span>
				</div>
			</div>
		</section>
	);
};
