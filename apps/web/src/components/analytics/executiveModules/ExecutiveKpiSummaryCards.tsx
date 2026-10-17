import React from "react";
import type { ExecutiveKpisSummary } from "@dental/shared";
import {
	Activity,
	ArrowUpRight,
	CheckCircle2,
	Coins,
	CreditCard,
	Filter,
	Sparkles,
	TrendingUp,
	UserCheck,
	Wallet,
} from "lucide-react";
import {
	computeChairEconomicsSummary,
	formatRublesClean,
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
		<section className="mobile-exec-kpi-grid" aria-label="3 ключевые цифры соло-врача и клиники (Мандат 8n)">
			{/* KPI 1: Выручка за период (Касса + Безнал + СБП) */}
			<div className="mobile-exec-kpi-card" data-testid="kpi-card-revenue">
				<div className="kpi-card-top">
					<span className="kpi-card-label">Выручка за период</span>
					<div className="kpi-card-icon-wrap icon-teal">
						<Coins size={16} aria-hidden="true" />
					</div>
				</div>
				<div className="kpi-card-value font-mono text-[28px] sm:text-[32px] font-bold">
					{periodMetrics.revenueFormatted}
				</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-success">
						<ArrowUpRight size={12} aria-hidden="true" />
						{periodMetrics.revenueDelta}
					</span>
					<span className="kpi-card-sub">
						План: {periodMetrics.revenuePlanFormatted}
					</span>
				</div>
			</div>

			{/* KPI 2: Начислено врачам / Чистый доход к выплате */}
			<div
				className="mobile-exec-kpi-card"
				data-testid="kpi-card-net-profit"
				onClick={onNavigateToSection ? () => onNavigateToSection("financial_analytics") : undefined}
			>
				<div className="kpi-card-top">
					<span className="kpi-card-label">Доход к выплате (ФОТ)</span>
					<div className="kpi-card-icon-wrap icon-teal">
						<Wallet size={16} aria-hidden="true" />
					</div>
				</div>
				<div className="kpi-card-value font-mono text-[28px] sm:text-[32px] font-bold text-[var(--ok-fg,#10b981)]">
					{periodMetrics.doctorNetIncomeFormatted || periodMetrics.netProfit}
				</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-neutral">
						<Sparkles size={11} aria-hidden="true" />
						P&amp;L отчет
					</span>
					<span className="kpi-card-sub">
						Прибыль клиники: {periodMetrics.netProfit}
					</span>
				</div>
			</div>

			{/* KPI 3: Загрузка кресел клиники (%) */}
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
					<div className="kpi-card-value font-mono text-[28px] sm:text-[32px] font-bold">
						{periodMetrics.occupancyPercent}%
					</div>
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
					<span className="kpi-card-sub">
						{totalChairsCount} кресел • {periodMetrics.chairHourlyCostFormatted}
					</span>
				</div>
			</div>

			{/* Второстепенные плитки среднего чека и первичных */}
			<div className="mobile-exec-kpi-card" data-testid="kpi-card-average-check">
				<div className="kpi-card-top">
					<span className="kpi-card-label">Средний чек</span>
					<div className="kpi-card-icon-wrap icon-teal">
						<CreditCard size={16} aria-hidden="true" />
					</div>
				</div>
				<div className="kpi-card-value font-mono text-[22px] font-bold">{periodMetrics.averageCheck}</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-success">{periodMetrics.averageCheckDelta}</span>
					<span className="kpi-card-sub">LTV: {periodMetrics.ltv}</span>
				</div>
			</div>

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
				<div className="kpi-card-value font-mono text-[22px] font-bold">{periodMetrics.primaryPatients} пац.</div>
				<div className="kpi-card-footer">
					<span className="kpi-badge-success">{periodMetrics.primaryDelta}</span>
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

	const doctorIncomeDisplay = kpis.doctorNetIncomeRub && kpis.doctorNetIncomeRub > 0
		? formatRublesClean(kpis.doctorNetIncomeRub)
		: formatRublesClean(kpis.doctorPayrollFormatted || Math.round((kpis.totalRevenueRub ?? 0) * 0.28));

	return (
		<div className="space-y-3" role="region" aria-label="3 ключевые цифры соло-врача и аналитика клиники">
			{/* ВЕРХНИЙ БЛОК: 3 ГЛАВНЫЕ ЦИФРЫ (МАНДАТ 8n СОЛО-ВРАЧ И КЛИНИКА) */}
			<section
				className="grid grid-cols-1 md:grid-cols-3 gap-3"
				aria-label="3 ключевые карточки KPI"
			>
				{/* 1. Выручка за период (План / Факт, касса + безнал + СБП) */}
				<div
					className="executive-kpi-card"
					style={{ "--card-accent": "var(--teal, #0d9488)" } as React.CSSProperties}
					data-testid="kpi-card-revenue"
				>
					<div>
						<div className="executive-kpi-header">
							<span className="executive-kpi-label" title="Сколько заработано за период (Касса + безнал + СБП)">
								1. Выручка за период
							</span>
							<div className="executive-kpi-icon-wrap executive-kpi-icon-teal">
								<Coins size={18} aria-hidden="true" />
							</div>
						</div>
						<div className="executive-kpi-main-val font-mono text-[28px] font-bold text-[var(--ink,#0f172a)]">
							{formatRublesClean(kpis.totalRevenueRub ?? kpis.totalRevenueFormatted)}
						</div>
					</div>
					<div className="executive-kpi-subtext">
						<span>План: {formatRublesClean(kpis.totalRevenuePlanFormatted)}</span>
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
					{kpis.paymentBreakdown && (
						<div className="mt-2 pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
							<span>Касса: {kpis.paymentBreakdown.cashPercent}%</span>
							<span>Безнал: {kpis.paymentBreakdown.cardDmsPercent}%</span>
							<span>СБП: {kpis.paymentBreakdown.sbpPercent}%</span>
						</div>
					)}
				</div>

				{/* 2. Начислено врачам / Чистый доход к выплате */}
				<div
					className="executive-kpi-card"
					style={{
						"--card-accent": "var(--ok-fg, #10b981)",
						cursor: "pointer",
					} as React.CSSProperties}
					onClick={onOpenPnl}
					title="Нажмите для открытия подробного P&L калькулятора клиники"
					data-testid="kpi-card-net-profit"
				>
					<div>
						<div className="executive-kpi-header">
							<span className="executive-kpi-label" title="Чистый доход врача к выплате из кассы (минус прямые расходы)">
								2. Доход врача к выплате
							</span>
							<div className="executive-kpi-icon-wrap executive-kpi-icon-teal">
								<Wallet size={18} aria-hidden="true" />
							</div>
						</div>
						<div
							className="executive-kpi-main-val font-mono text-[28px] font-bold"
							style={{ color: "var(--ok-fg, #10b981)" }}
						>
							{doctorIncomeDisplay}
						</div>
					</div>
					<div className="executive-kpi-subtext">
						<span>ФОТ: 28% выручки</span>
						<span className="executive-pill executive-pill-success">
							<Sparkles size={11} aria-hidden="true" />
							P&amp;L расчет
						</span>
					</div>
					<div className="mt-2 pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
						<span>Чистая прибыль клиники:</span>
						<strong style={{ color: (kpis.netProfitKopecks ?? 0) >= 0 ? "var(--ink,#0f172a)" : "var(--err-fg,#ef4444)" }}>
							{formatRublesClean(kpis.netProfitFormatted)}
						</strong>
					</div>
				</div>

				{/* 3. Загрузка кресел клиники (%) */}
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
							<span className="executive-kpi-label" title="Коэффициент полезной загрузки кресел клиники">
								3. Загрузка кресла (%)
							</span>
							<div className="executive-kpi-icon-wrap executive-kpi-icon-teal">
								<Activity size={18} aria-hidden="true" />
							</div>
						</div>
						<div className="executive-kpi-main-val font-mono text-[28px] font-bold">
							{kpis.chairOccupancyRatePercent ?? 0}%
						</div>
					</div>
					<div className="executive-kpi-subtext">
						<span>Кресел: {kpis.totalChairsCount ?? 1} шт.</span>
						<span className={`executive-pill ${(kpis.cancellationRatePercent ?? 0) > 15 ? "executive-pill-warning" : "executive-pill-neutral"}`}>
							Отмены: {kpis.cancellationRatePercent ?? 0}%
						</span>
					</div>
					<div className="mt-2 pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-[11px] text-[var(--muted,#64748b)]">
						<span>Стоимость простоя:</span>
						<span style={{ color: "var(--err-fg, #ef4444)", fontWeight: 600 }}>
							{chairEcon.chairHourlyCostRub.toLocaleString("ru-RU")} ₽/ч
						</span>
					</div>
				</div>
			</section>

			{/* ВТОРОСТЕПЕННАЯ ПОЛОСА МЕТРИК СЕТИ / БЭК-ОФИСА (1 СТРОКА БЕЗ МАТРЁШКИ) */}
			<div
				className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[12px] text-[var(--muted,#64748b)]"
				aria-label="Вспомогательные показатели эффективности"
			>
				<div className="flex items-center gap-4 flex-wrap">
					<span>
						Ср. чек: <strong className="text-[var(--ink,#0f172a)] font-mono">{formatRublesClean(kpis.averageCheckFormatted)}</strong>
					</span>
					<span>
						Первичные: <strong className="text-[var(--ink,#0f172a)] font-mono">{kpis.primaryPatientsCount ?? 0} пац.</strong>
					</span>
					<span>
						LTV: <strong className="text-[var(--ink,#0f172a)] font-mono">{formatRublesClean(kpis.patientLtvFormatted)}</strong>
					</span>
					<span>
						Конверсия в санацию: <strong className="text-[var(--ink,#0f172a)] font-mono">{kpis.leadToSanitationConversionPercent ?? 0}%</strong>
					</span>
				</div>
				<button
					type="button"
					className="secondary-button text-[12px] py-1 px-2.5 h-7"
					onClick={onOpenPnl}
					title="Открыть полный P&L отчет"
				>
					<Sparkles size={12} className="text-[var(--teal,#0d9488)]" />
					<span>P&amp;L отчет</span>
				</button>
			</div>
		</div>
	);
};
