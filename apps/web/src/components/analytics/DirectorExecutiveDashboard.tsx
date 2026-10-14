/**
 * apps/web/src/components/analytics/DirectorExecutiveDashboard.tsx
 * Полномасштабный Рабочий стол Генерального директора клиники (Фича #29 — Фасад).
 */

import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { ExecutiveDashboardPayload, ExecutivePeriod } from "@dental/shared";
import { AlertTriangle, Filter, Layers, RefreshCw } from "lucide-react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { getDemoExecutiveAnalytics, isDemoShowcaseMode } from "../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { ExecutiveDashboard } from "./ExecutiveDashboard";
import { ExecutiveFunnelMetrics } from "./ExecutiveFunnelMetrics";
import { ExecutivePnlWidget } from "./ExecutivePnlWidget";
import { DesktopExecutiveEmptyStateBanner } from "./executiveModules/ExecutiveChairUtilizationChart";
import { DesktopExecutiveTelemetryBar } from "./executiveModules/ExecutiveDoctorPerformanceTable";
import { DesktopExecutiveKpiCards } from "./executiveModules/ExecutiveKpiSummaryCards";
import {
	buildEmptyExecutivePayload,
	type DirectorExecutiveDashboardProps,
} from "./executiveModules/executiveAnalyticsTypes";
import "./executiveDashboard.css";

export type { DirectorExecutiveDashboardProps };

const FinancialAnalyticsModal = lazy(() =>
	import("./FinancialAnalyticsModal").then((m) => ({ default: m.FinancialAnalyticsModal })),
);

export const DirectorExecutiveDashboard: React.FC<DirectorExecutiveDashboardProps> = ({
	initialPeriod = "month",
	period: controlledPeriod,
	onPeriodChange,
	hideHeaderToolbar = false,
	onNavigateToSection,
	onOpenFinancialAnalytics,
}) => {
	const [internalPeriod, setInternalPeriod] = useState<ExecutivePeriod>(initialPeriod);
	const period = controlledPeriod ?? internalPeriod;
	const isMobile = useIsMobile(768);
	const [isInternalPnlOpen, setIsInternalPnlOpen] = useState(false);

	const handleOpenPnl = useCallback(() => {
		if (onOpenFinancialAnalytics) onOpenFinancialAnalytics();
		else if (onNavigateToSection) onNavigateToSection("financial_analytics");
		else setIsInternalPnlOpen(true);
	}, [onOpenFinancialAnalytics, onNavigateToSection]);

	const handlePeriodSelect = useCallback(
		(p: ExecutivePeriod) => (onPeriodChange ? onPeriodChange(p) : setInternalPeriod(p)),
		[onPeriodChange],
	);

	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [payload, setPayload] = useState<ExecutiveDashboardPayload | null>(null);

	const loadDashboard = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			if (isDemoShowcaseMode()) {
				setPayload(getDemoExecutiveAnalytics(period));
				setLoading(false);
				return;
			}

			const res = await fetch(`/api/analytics/executive?period=${period}`, {
				headers: {
					...denteAdminSecretRequestHeaders(),
					Accept: "application/json",
				},
			});

			if (res.ok) {
				const json = await res.json();
				if (json.success && json.data) {
					setPayload(json.data);
					setLoading(false);
					return;
				}
			}

			setPayload(buildEmptyExecutivePayload(period));
		} catch {
			setPayload(buildEmptyExecutivePayload(period));
		} finally {
			setLoading(false);
		}
	}, [period]);

	useEffect(() => {
		loadDashboard();
	}, [loadDashboard]);

	if (isMobile) {
		return (
			<ExecutiveDashboard
				period={period as any}
				onPeriodChange={(p) => {
					handlePeriodSelect(p as ExecutivePeriod);
				}}
				onNavigateToSection={onNavigateToSection}
			/>
		);
	}

	if (loading && !payload) {
		return (
			<div className="executive-dashboard" style={{ padding: "3rem", textAlign: "center" }}>
				<RefreshCw className="animate-spin" size={32} style={{ margin: "0 auto 1rem", color: "var(--teal, #0d9488)" }} />
				<div style={{ fontSize: "1.125rem", fontWeight: 600 }}>Загрузка рабочего стола директора...</div>
				<div style={{ color: "var(--muted, #64748b)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
					Формирование сквозной воронки и показателей P&amp;L
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
					<div style={{ color: "var(--muted, #64748b)", margin: "0.5rem 0 1.5rem" }}>{error || "Проверьте сетевое подключение и обновите страницу"}</div>
					<button type="button" className="executive-refresh-btn" onClick={loadDashboard}>
						<RefreshCw size={16} /> Повторить попытку
					</button>
				</div>
			</div>
		);
	}

	const { kpis, funnelStages, departments } = payload;

	return (
		<div className="executive-dashboard" role="main" aria-label="Рабочий стол Генерального директора">
			{/* ВЕРХНЯЯ ПАНЕЛЬ УПРАВЛЕНИЯ */}
			{!hideHeaderToolbar && (
				<header className="executive-header">
					<div className="executive-header-info">
						<div className="executive-title-row">
							<h1 className="executive-title">Рабочий стол Генерального директора</h1>
						</div>
						<p className="executive-subtitle" title="Сквозная конверсия первичных пациентов, план/факт P&L отделений и операционная эффективность">
							Сквозная конверсия первичных пациентов, план/факт P&amp;L отделений и операционная эффективность
						</p>
					</div>

					<div className="executive-controls">
						<div className="executive-period-toggle" role="group" aria-label="Период отчета">
							{(["day", "week", "month", "quarter", "year"] as const).map((p) => (
								<button
									key={p}
									type="button"
									className={`executive-period-btn ${period === p ? "active" : ""}`}
									onClick={() => handlePeriodSelect(p)}
								>
									{p === "day" ? "День" : p === "week" ? "Неделя" : p === "month" ? "Месяц" : p === "quarter" ? "Квартал" : "Год"}
								</button>
							))}
						</div>

						<button
							type="button"
							className="executive-refresh-btn"
							onClick={loadDashboard}
							disabled={loading}
							aria-label="Обновить показатели дашборда"
						>
							<RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
							<span>Обновить</span>
						</button>
					</div>
				</header>
			)}

			{/* ЧЕСТНОЕ ПУСТОЕ СОСТОЯНИЕ И СЕБЕСТОИМОСТЬ КРЕСЛО-ЧАСА */}
			<DesktopExecutiveEmptyStateBanner
				isEmpty={payload.isEmpty}
				period={period}
				kpis={kpis}
				onSelectPeriod={handlePeriodSelect}
				onNavigateToSection={onNavigateToSection}
			/>

			{/* 5 ДОМИНАНТНЫХ KPI КАРТОЧЕК (TIER 1) */}
			<DesktopExecutiveKpiCards
				kpis={kpis}
				onOpenPnl={handleOpenPnl}
				onNavigateToSection={onNavigateToSection}
			/>

			{/* ОСНОВНОЙ РАБОЧИЙ ГРИД (TIER 2) */}
			<div className="executive-content-grid">
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
			</div>

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
