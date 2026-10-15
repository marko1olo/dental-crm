/**
 * apps/web/src/components/analytics/executiveModules/DesktopExecutiveView.tsx
 *
 * Десктопное представление Рабочего стола Генерального директора (Apple macOS HIG).
 * Включает:
 *  - Однострочный тулбар (32-36px)
 *  - 4 доминантные KPI карточки (Тир 1)
 *  - P&L сводку и структуру выручки по 5 отделениям
 *  - Загрузку кресел с таблицей tabular-nums и расчетом стоимости 1 часа простоя
 *  - Топ врачей по Net Revenue
 *  - Топ процедур по Номенклатуре 804н
 *  - 8-этапную сквозную воронку первичных пациентов
 *  - Нижнюю телеметрию (Тир 3)
 */

import React, { lazy, Suspense, useCallback, useState } from "react";
import type { ExecutivePeriod } from "@dental/shared";
import {
	Activity,
	AlertTriangle,
	Calendar,
	CheckCircle2,
	ChevronRight,
	Download,
	FileText,
	Filter,
	Layers,
	RefreshCw,
	Sparkles,
	TrendingUp,
	Trophy,
	Users,
} from "lucide-react";
import { ExecutiveFunnelMetrics } from "../ExecutiveFunnelMetrics";
import { ExecutivePnlWidget } from "../ExecutivePnlWidget";
import { DesktopExecutiveEmptyStateBanner } from "./ExecutiveChairUtilizationChart";
import { DesktopExecutiveTelemetryBar } from "./ExecutiveDoctorPerformanceTable";
import { DesktopExecutiveKpiCards } from "./ExecutiveKpiSummaryCards";
import type { UseExecutiveDashboardDataResult } from "./useExecutiveDashboardData";

const FinancialAnalyticsModal = lazy(() =>
	import("../FinancialAnalyticsModal").then((m) => ({ default: m.FinancialAnalyticsModal })),
);

export interface DesktopExecutiveViewProps extends UseExecutiveDashboardDataResult {
	readonly hideHeaderToolbar?: boolean | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
	readonly onOpenFinancialAnalytics?: (() => void) | undefined;
}

export const DesktopExecutiveView: React.FC<DesktopExecutiveViewProps> = ({
	period,
	setPeriod,
	loading,
	error,
	payload,
	chairsData,
	reload,
	handleExportCsv,
	hideHeaderToolbar = false,
	onNavigateToSection,
	onOpenFinancialAnalytics,
}) => {
	const [isInternalPnlOpen, setIsInternalPnlOpen] = useState(false);

	const handleOpenPnl = useCallback(() => {
		if (onOpenFinancialAnalytics) {
			onOpenFinancialAnalytics();
		} else if (onNavigateToSection) {
			onNavigateToSection("financial_analytics");
		} else {
			setIsInternalPnlOpen(true);
		}
	}, [onOpenFinancialAnalytics, onNavigateToSection]);

	if (loading && !payload) {
		return (
			<div className="executive-dashboard" style={{ padding: "3rem", textAlign: "center" }}>
				<RefreshCw
					className="animate-spin"
					size={32}
					style={{ margin: "0 auto 1rem", color: "var(--teal, #0d9488)" }}
				/>
				<div style={{ fontSize: "1.125rem", fontWeight: 600 }}>Загрузка рабочего стола директора...</div>
				<div style={{ color: "var(--muted, #64748b)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
					Формирование показателей выручки, P&amp;L и загрузки кресел
				</div>
			</div>
		);
	}

	if (!payload) {
		return (
			<div className="executive-dashboard" style={{ padding: "2rem" }}>
				<div className="executive-panel" style={{ textAlign: "center" }}>
					<AlertTriangle size={36} style={{ color: "var(--err-fg, #ef4444)", margin: "0 auto 1rem" }} />
					<div style={{ fontSize: "1.125rem", fontWeight: 700 }}>Не удалось сформировать дашборд</div>
					<div style={{ color: "var(--muted, #64748b)", margin: "0.5rem 0 1.5rem" }}>
						{error || "Проверьте сетевое подключение и обновите страницу"}
					</div>
					<button type="button" className="executive-refresh-btn" onClick={reload}>
						<RefreshCw size={16} /> Повторить попытку
					</button>
				</div>
			</div>
		);
	}

	const { kpis, funnelStages, departments, topDoctors = [], topProcedures = [] } = payload;
	const chairCostRub = chairsData?.chairHourlyCostRub ?? 1850;
	const chairOccupancy = chairsData?.chairOccupancyRatePercent ?? kpis.chairOccupancyRatePercent ?? 0;
	const chairItems = chairsData?.chairUtilizationJson ?? [];

	return (
		<div className="executive-dashboard" role="main" aria-label="Рабочий стол Генерального директора">
			{/* ВЕРХНЯЯ ПАНЕЛЬ УПРАВЛЕНИЯ (MACOS HIG 32-36PX) */}
			{!hideHeaderToolbar && (
				<header className="executive-header">
					<div className="executive-header-info">
						<div className="executive-title-row">
							<h1 className="executive-title">Рабочий стол Генерального директора</h1>
							<span className="executive-badge-feature">P&amp;L Кокпит</span>
						</div>
						<p
							className="executive-subtitle"
							title="Сквозная конверсия первичных пациентов, план/факт P&L отделений и операционная эффективность"
						>
							Сквозная выручка по 54-ФЗ, себестоимость кресло-часа и рентабельность отделений
						</p>
					</div>

					<div className="executive-controls">
						<div className="executive-period-toggle" role="group" aria-label="Период отчета">
							{(["day", "week", "month", "quarter", "year"] as const).map((p) => (
								<button
									key={p}
									type="button"
									className={`executive-period-btn ${period === p ? "active" : ""}`}
									onClick={() => setPeriod(p)}
								>
									{p === "day"
										? "День"
										: p === "week"
											? "Неделя"
											: p === "month"
												? "Месяц"
												: p === "quarter"
													? "Квартал"
													: "Год"}
								</button>
							))}
						</div>

						<button
							type="button"
							className="secondary-button h-8 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
							onClick={handleExportCsv}
							title="Экспорт аналитического отчета в Excel / CSV"
						>
							<Download size={14} />
							<span>В Excel</span>
						</button>

						<button
							type="button"
							className="executive-refresh-btn"
							onClick={reload}
							disabled={loading}
							aria-label="Обновить показатели дашборда"
						>
							<RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
							<span>Обновить</span>
						</button>
					</div>
				</header>
			)}

			{/* ЧЕСТНОЕ ПУСТОЕ СОСТОЯНИЕ */}
			<DesktopExecutiveEmptyStateBanner
				isEmpty={payload.isEmpty}
				period={period}
				kpis={kpis}
				onSelectPeriod={setPeriod}
				onNavigateToSection={onNavigateToSection}
			/>

			{/* 4 ДОМИНАНТНЫЕ KPI КАРТОЧКИ (TIER 1) */}
			<DesktopExecutiveKpiCards
				kpis={kpis}
				onOpenPnl={handleOpenPnl}
				onNavigateToSection={onNavigateToSection}
			/>

			{/* ГРИД 1: СВОДКА P&L И ЗАГРУЗКА КРЕСЕЛ (TIER 2) */}
			<div className="executive-content-grid">
				{/* 1. СТРУКТУРА P&L ОТДЕЛЕНИЙ */}
				<section className="executive-panel" aria-label="План/факт выручки по отделениям">
					<div className="executive-panel-header">
						<h2 className="executive-panel-title">
							<Layers size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
							План / факт выручки по 5 отделениям
						</h2>
						<span className="executive-panel-badge">Структура P&amp;L</span>
					</div>

					<ExecutivePnlWidget
						departments={departments}
						totalRevenueFormatted={kpis.totalRevenueFormatted}
						totalPlanFormatted={kpis.totalRevenuePlanFormatted}
						overallFulfillmentPercent={kpis.overallPlanFulfillmentPercent}
						onOpenPnl={handleOpenPnl}
					/>
				</section>

				{/* 2. ЗАГРУЗКА КРЕСЕЛ И СЕБЕСТОИМОСТЬ ПРОСТОЯ */}
				<section className="executive-panel" aria-label="Загрузка стоматологических кресел">
					<div className="executive-panel-header">
						<h2 className="executive-panel-title">
							<Activity size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
							Загрузка кресел и стоимость простоя
						</h2>
						<span className="executive-panel-badge">
							Простой: {chairCostRub.toLocaleString("ru-RU")} ₽/ч
						</span>
					</div>

					<div className="executive-chair-table-wrap">
						{chairItems.length > 0 ? (
							<table className="executive-table tabular-nums" aria-label="Таблица загрузки кресел">
								<thead>
									<tr>
										<th>Кресло / Кабинет</th>
										<th style={{ textAlign: "right" }}>Занято</th>
										<th style={{ textAlign: "right" }}>Доступно</th>
										<th style={{ textAlign: "center" }}>Загрузка</th>
										<th style={{ textAlign: "right" }}>Упущенный простой</th>
									</tr>
								</thead>
								<tbody>
									{chairItems.map((c) => {
										const occHours = Math.round((c.occupiedMinutes / 60) * 10) / 10;
										const availHours = Math.round((c.availableMinutes / 60) * 10) / 10;
										const idleHours = Math.max(0, availHours - occHours);
										const idleLostRub = Math.round(idleHours * chairCostRub);

										return (
											<tr key={c.chairId || c.name}>
												<td>
													<div className="font-semibold text-[13px] flex items-center gap-2">
														<span
															className="w-2.5 h-2.5 rounded-full inline-block"
															style={{ backgroundColor: c.fill || "var(--teal, #0d9488)" }}
														/>
														{c.name}
													</div>
												</td>
												<td style={{ textAlign: "right" }}>{occHours} ч</td>
												<td style={{ textAlign: "right" }}>{availHours} ч</td>
												<td style={{ textAlign: "center" }}>
													<div className="chair-table-progress-cell">
														<span className="text-[12px] font-semibold">{c.utilizationPercent}%</span>
														<div className="chair-table-bar-track">
															<div
																className="chair-table-bar-fill"
																style={{
																	width: `${Math.min(100, c.utilizationPercent)}%`,
																	backgroundColor: c.fill || "var(--teal, #0d9488)",
																}}
															/>
														</div>
													</div>
												</td>
												<td style={{ textAlign: "right", color: idleLostRub > 0 ? "var(--err-fg, #ef4444)" : "var(--muted)" }}>
													{idleLostRub.toLocaleString("ru-RU")} ₽
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						) : (
							<div className="chair-empty-state">
								<Activity size={24} style={{ color: "var(--teal)", margin: "0 auto 0.5rem" }} />
								<div>Кресла настроены: {kpis.totalChairsCount} шт.</div>
								<div className="text-[12px] text-[var(--muted)] mt-1">
									Средняя полезная загрузка: {chairOccupancy}% (норма 65–80%)
								</div>
							</div>
						)}
					</div>
				</section>
			</div>

			{/* ГРИД 2: ТОП ВРАЧЕЙ И ТОП ПРОЦЕДУР ПО 804Н (TIER 2) */}
			<div className="executive-content-grid">
				{/* 1. ТОП ВРАЧЕЙ ПО NET REVENUE */}
				<section className="executive-panel" aria-label="Топ врачей по реальной выручке">
					<div className="executive-panel-header">
						<h2 className="executive-panel-title">
							<Trophy size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
							Топ врачей по Net Revenue
						</h2>
						<span className="executive-panel-badge">{topDoctors.length} спец.</span>
					</div>

					<div className="executive-table-wrap">
						{topDoctors.length > 0 ? (
							<table className="executive-table tabular-nums" aria-label="Таблица топа врачей">
								<thead>
									<tr>
										<th style={{ width: "36px" }}>#</th>
										<th>Врач</th>
										<th>Специальность</th>
										<th style={{ textAlign: "right" }}>Выручка</th>
										<th style={{ textAlign: "center" }}>Визиты</th>
										<th style={{ textAlign: "center" }}>Явка</th>
										<th style={{ textAlign: "right" }}>Ср. чек</th>
									</tr>
								</thead>
								<tbody>
									{topDoctors.map((doc) => (
										<tr key={doc.id}>
											<td>
												<span className={`rank-badge rank-${doc.rank}`}>{doc.rank}</span>
											</td>
											<td>
												<div className="font-semibold text-[13px]">{doc.name}</div>
											</td>
											<td className="text-[12px] text-[var(--muted)]">{doc.specialty}</td>
											<td style={{ textAlign: "right", fontWeight: 700 }} className="text-[var(--teal)]">
												{doc.revenueFormatted}
											</td>
											<td style={{ textAlign: "center" }}>{doc.visitsCount}</td>
											<td style={{ textAlign: "center" }}>
												<span className="kpi-pill-mini kpi-badge-success">{doc.attendancePercent}%</span>
											</td>
											<td style={{ textAlign: "right" }}>{doc.averageCheckFormatted}</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<div className="chair-empty-state">
								<Users size={24} style={{ color: "var(--teal)", margin: "0 auto 0.5rem" }} />
								<div>Выработка врачей формируется по закрытым сменам и оплатам 54-ФЗ</div>
							</div>
						)}
					</div>
				</section>

				{/* 2. ТОП ПРОЦЕДУР ПО 804Н */}
				<section className="executive-panel" aria-label="Топ процедур по номенклатуре 804н">
					<div className="executive-panel-header">
						<h2 className="executive-panel-title">
							<FileText size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
							Топ процедур Номенклатуры 804н
						</h2>
						<span className="executive-panel-badge">{topProcedures.length} услуг</span>
					</div>

					<div className="executive-table-wrap">
						{topProcedures.length > 0 ? (
							<table className="executive-table tabular-nums" aria-label="Таблица топа процедур">
								<thead>
									<tr>
										<th style={{ width: "36px" }}>#</th>
										<th>Процедура / Услуга</th>
										<th>Отделение</th>
										<th style={{ textAlign: "center" }}>Оказано</th>
										<th style={{ textAlign: "right" }}>Сумма</th>
										<th style={{ textAlign: "right" }}>Доля</th>
									</tr>
								</thead>
								<tbody>
									{topProcedures.map((proc, idx) => (
										<tr key={proc.id}>
											<td>
												<span className="rank-badge rank-other">{idx + 1}</span>
											</td>
											<td>
												<div className="font-semibold text-[13px] line-clamp-1">{proc.name}</div>
											</td>
											<td className="text-[12px] text-[var(--muted)]">{proc.category}</td>
											<td style={{ textAlign: "center" }}>{proc.count} шт.</td>
											<td style={{ textAlign: "right", fontWeight: 700 }} className="text-[var(--teal)]">
												{proc.revenueFormatted}
											</td>
											<td style={{ textAlign: "right" }}>
												<span className="kpi-pill-mini kpi-badge-neutral">{proc.sharePercent}%</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<div className="chair-empty-state">
								<FileText size={24} style={{ color: "var(--teal)", margin: "0 auto 0.5rem" }} />
								<div>Топ услуг появится после проведения манипуляций в картах 043/у</div>
							</div>
						)}
					</div>
				</section>
			</div>

			{/* ГРИД 3: СКВОЗНАЯ 8-ЭТАПНАЯ ВОРОНКА ПЕРВИЧНЫХ ПАЦИЕНТОВ */}
			<section className="executive-panel" aria-label="Сквозная воронка первичных пациентов">
				<div className="executive-panel-header">
					<h2 className="executive-panel-title">
						<Filter size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
						Сквозная воронка первичных пациентов
					</h2>
					<span className="executive-panel-badge">8 этапов конверсии</span>
				</div>

				<ExecutiveFunnelMetrics stages={funnelStages} />
			</section>

			{/* НИЖНЯЯ ОПЕРАЦИОННАЯ ТЕЛЕМЕТРИЯ (TIER 3) */}
			<DesktopExecutiveTelemetryBar kpis={kpis} />

			{isInternalPnlOpen && (
				<Suspense fallback={null}>
					<FinancialAnalyticsModal
						isOpen={isInternalPnlOpen}
						onClose={() => setIsInternalPnlOpen(false)}
						initialPeriod={period === "day" || (period as string) === "week" ? "month" : (period as any)}
					/>
				</Suspense>
			)}
		</div>
	);
};
