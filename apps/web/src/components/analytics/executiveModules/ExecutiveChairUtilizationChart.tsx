import React from "react";
import type { ExecutiveKpisSummary, ExecutivePeriod } from "@dental/shared";
import {
	Activity,
	AlertTriangle,
	ArrowUpRight,
	Calendar,
	CalendarPlus,
	CreditCard,
	DollarSign,
	QrCode,
	TrendingUp,
	Users,
	Wallet,
} from "lucide-react";
import {
	computeChairEconomicsSummary,
	type ExecutivePeriodComputedMetrics,
} from "./executiveAnalyticsTypes";

export interface MobileExecutiveKpiTilesProps {
	readonly periodMetrics: ExecutivePeriodComputedMetrics;
	readonly kpis?: ExecutiveKpisSummary | null | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export type MobileExecutiveFitnessRingsProps = MobileExecutiveKpiTilesProps;

/**
 * Прагматичные финансовые KPI руководителя клиники (Delimited Tile Cards).
 * Заменяет декоративные фитнес-кольца Apple Fitness на бизнес-показатели (Мандат 8n).
 */
export const MobileExecutiveKpiTiles: React.FC<MobileExecutiveKpiTilesProps> = ({
	periodMetrics,
	kpis,
	onNavigateToSection,
}) => {
	const totalChairsCount = kpis?.totalChairsCount ?? 1;
	const pb = periodMetrics.paymentBreakdown ?? {
		cashRub: Math.round((kpis?.totalRevenueRub ?? 0) * 0.28),
		cashPercent: 28,
		cardDmsRub: Math.round((kpis?.totalRevenueRub ?? 0) * 0.54),
		cardDmsPercent: 54,
		sbpRub: Math.round((kpis?.totalRevenueRub ?? 0) * 0.18),
		sbpPercent: 18,
		totalRub: kpis?.totalRevenueRub ?? 0,
	};

	const planPercent = Number.isFinite(periodMetrics.revenuePercent)
		? Math.round(periodMetrics.revenuePercent)
		: 0;

	return (
		<section className="mobile-exec-kpis-wrapper" aria-label="Финансовые KPI клиники">
			<div className="mobile-exec-section-header">
				<span className="mobile-exec-section-title">Финансовые KPI клиники</span>
				<span className="mobile-exec-badge-health">
					<TrendingUp size={12} aria-hidden="true" />
					План / Факт
				</span>
			</div>

			<div className="mobile-exec-tiles-grid" data-testid="mobile-executive-kpis-grid">
				{/* 1. Выручка за период */}
				<div className="exec-tile-card" data-testid="tile-revenue">
					<div className="exec-tile-top">
						<span className="exec-tile-label">Выручка факт</span>
						<div className="exec-tile-icon icon-teal">
							<DollarSign size={15} aria-hidden="true" />
						</div>
					</div>
					<div className="exec-tile-val font-mono">{periodMetrics.revenueFormatted}</div>
					<div className="exec-tile-footer">
						<span className={planPercent >= 100 ? "exec-pill-success" : "exec-pill-neutral"}>
							{planPercent}% плана
						</span>
						<span className="exec-tile-sub">План: {periodMetrics.revenuePlanFormatted}</span>
					</div>
				</div>

				{/* 2. Загрузка кресел */}
				<div
					className="exec-tile-card"
					data-testid="tile-occupancy"
					onClick={onNavigateToSection ? () => onNavigateToSection("freed_slots") : undefined}
					style={{ cursor: onNavigateToSection ? "pointer" : "default" }}
				>
					<div className="exec-tile-top">
						<span className="exec-tile-label">Загрузка кресел</span>
						<div className="exec-tile-icon icon-indigo">
							<Activity size={15} aria-hidden="true" />
						</div>
					</div>
					<div className="exec-tile-val font-mono">{periodMetrics.occupancyPercent}%</div>
					<div className="exec-tile-footer">
						<span className="exec-pill-neutral">
							{totalChairsCount} {totalChairsCount === 1 ? "кресло" : "кресла"}
						</span>
						<span className="exec-tile-sub">Час: {periodMetrics.chairHourlyCostFormatted}</span>
					</div>
				</div>

				{/* 3. Средний чек */}
				<div className="exec-tile-card" data-testid="tile-avg-check">
					<div className="exec-tile-top">
						<span className="exec-tile-label">Средний чек</span>
						<div className="exec-tile-icon icon-amber">
							<CreditCard size={15} aria-hidden="true" />
						</div>
					</div>
					<div className="exec-tile-val font-mono">{periodMetrics.averageCheck}</div>
					<div className="exec-tile-footer">
						<span className="exec-tile-sub">{periodMetrics.averageCheckDelta}</span>
					</div>
				</div>

				{/* 4. Чистая прибыль и рентабельность P&L */}
				<div className="exec-tile-card" data-testid="tile-net-profit">
					<div className="exec-tile-top">
						<span className="exec-tile-label">Чистая прибыль</span>
						<div className="exec-tile-icon icon-emerald">
							<TrendingUp size={15} aria-hidden="true" />
						</div>
					</div>
					<div className="exec-tile-val font-mono">{periodMetrics.netProfit}</div>
					<div className="exec-tile-footer">
						<span className="exec-pill-success">
							{periodMetrics.netMarginPercent}% маржа
						</span>
						<span className="exec-tile-sub">LTV: {periodMetrics.ltv}</span>
					</div>
				</div>

				{/* 5. Первичные пациенты */}
				<div className="exec-tile-card" data-testid="tile-primary-patients">
					<div className="exec-tile-top">
						<span className="exec-tile-label">Первичные</span>
						<div className="exec-tile-icon icon-teal">
							<Users size={15} aria-hidden="true" />
						</div>
					</div>
					<div className="exec-tile-val font-mono">{periodMetrics.primaryPatients}</div>
					<div className="exec-tile-footer">
						<span className="exec-pill-neutral">Новые обращения</span>
					</div>
				</div>

				{/* 6. Повторные пациенты */}
				<div className="exec-tile-card" data-testid="tile-repeat-patients">
					<div className="exec-tile-top">
						<span className="exec-tile-label">Повторные</span>
						<div className="exec-tile-icon icon-indigo">
							<Users size={15} aria-hidden="true" />
						</div>
					</div>
					<div className="exec-tile-val font-mono">{periodMetrics.repeatPatients}</div>
					<div className="exec-tile-footer">
						<span className="exec-pill-success">Лояльная база</span>
					</div>
				</div>
			</div>

			{/* 5. Доля оплат (Касса 54-ФЗ / Безнал ДМС / СБП) */}
			<div className="exec-payments-breakdown-card" data-testid="tile-payment-methods">
				<div className="exec-payments-header">
					<div className="flex items-center gap-1.5 font-semibold text-[13px] text-[var(--ink)]">
						<Wallet size={15} className="text-[var(--teal)]" aria-hidden="true" />
						<span>Доля оплат по каналам</span>
					</div>
					<span className="text-[12px] text-[var(--muted)] font-mono">
						Всего: {periodMetrics.revenueFormatted}
					</span>
				</div>

				{/* Трехцветная полоса соотношения оплат */}
				<div className="exec-payments-bar-track" role="meter" aria-label="Соотношение способов оплат">
					<div
						className="exec-payments-segment segment-cash"
						style={{ width: `${Math.max(4, pb.cashPercent)}%` }}
						title={`Касса наличные: ${pb.cashPercent}%`}
					/>
					<div
						className="exec-payments-segment segment-card"
						style={{ width: `${Math.max(4, pb.cardDmsPercent)}%` }}
						title={`Безнал и ДМС: ${pb.cardDmsPercent}%`}
					/>
					<div
						className="exec-payments-segment segment-sbp"
						style={{ width: `${Math.max(4, pb.sbpPercent)}%` }}
						title={`СБП по QR: ${pb.sbpPercent}%`}
					/>
				</div>

				{/* Легенда оплат */}
				<div className="exec-payments-legend">
					<div className="exec-legend-col">
						<div className="exec-legend-dot-row">
							<span className="exec-dot dot-cash" />
							<span className="exec-legend-label">Касса наличные</span>
						</div>
						<div className="exec-legend-values">
							<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">{pb.cashPercent}%</span>
							<span className="text-[11px] text-[var(--muted)]">{pb.cashRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					</div>

					<div className="exec-legend-col">
						<div className="exec-legend-dot-row">
							<span className="exec-dot dot-card" />
							<span className="exec-legend-label">Безнал и ДМС</span>
						</div>
						<div className="exec-legend-values">
							<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">{pb.cardDmsPercent}%</span>
							<span className="text-[11px] text-[var(--muted)]">{pb.cardDmsRub.toLocaleString("ru-RU")} ₽</span>
						</div>
					</div>

					<div className="exec-legend-col">
						<div className="exec-legend-dot-row">
							<span className="exec-dot dot-sbp" />
							<span className="exec-legend-label">СБП QR</span>
						</div>
						<div className="exec-legend-values">
							<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">{pb.sbpPercent}%</span>
							<span className="text-[11px] text-[var(--muted)]">{pb.sbpRub.toLocaleString("ru-RU")} ₽</span>
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

export const MobileExecutiveFitnessRings = MobileExecutiveKpiTiles;
