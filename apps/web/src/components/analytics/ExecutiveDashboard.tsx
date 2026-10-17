/**
 * apps/web/src/components/analytics/ExecutiveDashboard.tsx
 *
 * ЕДИНЫЙ КАНОНИЧЕСКИЙ ДАШБОРД РУКОВОДИТЕЛЯ КЛИНИКИ (ФИЧА #29 — P&L КОКПИТ).
 * Суверенно обслуживает как мобильный (Apple iOS HIG), так и десктопный (Apple macOS HIG) контуры.
 */

import React, { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Download, Printer, RefreshCw, Sparkles } from "lucide-react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { DesktopExecutiveView } from "./executiveModules/DesktopExecutiveView";
import { MobileExecutiveKpiTiles } from "./executiveModules/ExecutiveChairUtilizationChart";
import {
	buildTopDoctorsPerformanceRows,
	MobileExecutiveDoctorsAndFunnels,
} from "./executiveModules/ExecutiveDoctorPerformanceTable";
import { MobileExecutiveKpiCards } from "./executiveModules/ExecutiveKpiSummaryCards";
import {
	type ExecutiveDashboardProps,
	type MobileAnalyticsPeriod,
	type TopDoctorPerformanceRow,
} from "./executiveModules/executiveAnalyticsTypes";
import { useExecutiveDashboardData } from "./executiveModules/useExecutiveDashboardData";
import "./executiveDashboard.css";

const FinancialAnalyticsModal = lazy(() =>
	import("./FinancialAnalyticsModal").then((m) => ({ default: m.FinancialAnalyticsModal })),
);

export const CANONICAL_PERIOD_OPTIONS: readonly {
	readonly key: MobileAnalyticsPeriod;
	readonly label: string;
}[] = [
	{ key: "day", label: "Сегодня" },
	{ key: "yesterday", label: "Вчера" },
	{ key: "week", label: "Неделя" },
	{ key: "month", label: "Месяц" },
	{ key: "quarter", label: "Квартал" },
	{ key: "year", label: "Год" },
] as const;

export type { ExecutiveDashboardProps, MobileAnalyticsPeriod };

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = (props) => {
	const {
		onNavigateToSection,
		onOpenFinancialAnalytics,
		hideBottomBar = false,
		hideHeaderToolbar = false,
	} = props;

	const isMobile = useIsMobile(768);
	const data = useExecutiveDashboardData(props);

	const [isPnlModalOpen, setIsPnlModalOpen] = useState(false);

	const handleOpenPnl = useCallback(() => {
		if (onOpenFinancialAnalytics) {
			onOpenFinancialAnalytics();
		} else if (onNavigateToSection) {
			onNavigateToSection("financial_analytics");
		} else {
			setIsPnlModalOpen(true);
		}
	}, [onOpenFinancialAnalytics, onNavigateToSection]);

	const handlePrintPdf = useCallback(() => {
		if (typeof window !== "undefined") {
			window.print();
		}
	}, []);

	const topDoctors: TopDoctorPerformanceRow[] = useMemo(() => {
		if (data.payload?.topDoctors && data.payload.topDoctors.length > 0) {
			return data.payload.topDoctors.map((doc, idx) => {
				const initials = doc.name
					.split(" ")
					.filter(Boolean)
					.map((w: string) => w[0])
					.slice(0, 2)
					.join("")
					.toUpperCase();
				return {
					id: doc.doctorUserId || `doc-${idx}`,
					name: doc.name,
					specialty: doc.specialty || "Стоматолог",
					initials: initials || "ВК",
					billed: doc.revenueFormatted,
					averageCheckFormatted: doc.averageCheckFormatted,
					visits: doc.visitsCount,
					attendance: `${doc.attendancePercent}%`,
					complexPlansShare: doc.complexPlansShare || "65%",
					rank: idx + 1,
					badgeColor: "var(--teal, #0d9488)",
				};
			});
		}
		return buildTopDoctorsPerformanceRows([], data.period, isDemoShowcaseMode());
	}, [data.payload?.topDoctors, data.period]);

	const renderCanonicalToolbar = () => {
		if (hideHeaderToolbar) return null;

		return (
			<header
				className="executive-canonical-toolbar"
				role="toolbar"
				aria-label="Панель периода и действий аналитики"
			>
				<div
					className="executive-period-chips"
					role="radiogroup"
					aria-label="Выбор периода аналитики"
				>
					{CANONICAL_PERIOD_OPTIONS.map((opt) => (
						<button
							key={opt.key}
							type="button"
							role="radio"
							aria-checked={data.period === opt.key}
							className={`secondary-button ${data.period === opt.key ? "active" : ""}`}
							onClick={() => data.setPeriod(opt.key)}
							data-testid={`period-btn-${opt.key}`}
						>
							{opt.label}
						</button>
					))}
				</div>

				<div className="executive-toolbar-actions" role="group" aria-label="Действия">
					<button
						type="button"
						className="secondary-button"
						onClick={data.handleExportCsv}
						title="Экспорт в Excel / CSV"
						data-testid="desktop-export-btn"
					>
						<Download size={14} aria-hidden="true" />
						<span className="hidden sm:inline">Экспорт в Excel / CSV</span>
					</button>

					<button
						type="button"
						className="primary-button"
						onClick={handleOpenPnl}
						title="Открыть финансовую аналитику P&L"
						data-testid="desktop-open-pnl-btn"
					>
						<Sparkles size={14} aria-hidden="true" />
						<span>P&amp;L калькулятор</span>
					</button>

					<button
						type="button"
						className="secondary-button"
						onClick={data.reload}
						disabled={data.loading}
						title="Обновить показатели дашборда"
						aria-label="Обновить показатели дашборда"
						data-testid="desktop-refresh-btn"
					>
						<RefreshCw
							size={14}
							className={data.loading ? "animate-spin text-[var(--teal)]" : ""}
							aria-hidden="true"
						/>
					</button>
				</div>
			</header>
		);
	};

	if (isMobile) {
		return (
			<div
				className="mobile-exec-dashboard"
				role="main"
				aria-label="Мобильный рабочий стол Генерального директора"
				data-testid="mobile-executive-dashboard"
			>
				{renderCanonicalToolbar()}

				{/* 3 доминантные KPI-карточки (Выручка, Начислено врачам, Загрузка кресел) */}
				<MobileExecutiveKpiCards
					periodMetrics={data.periodMetrics}
					totalChairsCount={data.payload?.kpis.totalChairsCount ?? 1}
					onNavigateToSection={onNavigateToSection}
				/>

				{/* Прагматичные финансовые KPI и распределение оплат */}
				<MobileExecutiveKpiTiles
					periodMetrics={data.periodMetrics}
					kpis={data.payload?.kpis}
					onNavigateToSection={onNavigateToSection}
				/>

				{/* Топ врачей, направления и 8-этапная воронка */}
				<MobileExecutiveDoctorsAndFunnels topDoctors={topDoctors} payload={data.payload} />

				{/* Фиксированный bottom bar в Natural Thumb Zone */}
				{!hideBottomBar && (
					<nav className="mobile-exec-bottom-bar" aria-label="Действия с отчетом аналитики">
						<button
							type="button"
							className="primary-button mobile-exec-btn-primary"
							onClick={data.handleExportCsv}
							data-testid="btn-mobile-export-report"
						>
							<Download size={18} aria-hidden="true" />
							<span>Экспорт в Excel / CSV</span>
						</button>

						<button
							type="button"
							className="secondary-button mobile-exec-btn-secondary"
							onClick={handlePrintPdf}
							title="Печать или сохранение в PDF"
							aria-label="Печать отчета в PDF"
							data-testid="btn-mobile-print-report"
						>
							<Printer size={18} aria-hidden="true" />
						</button>

						<button
							type="button"
							className="secondary-button mobile-exec-btn-secondary"
							onClick={data.reload}
							disabled={data.loading}
							title="Обновить показатели"
							aria-label="Обновить показатели"
							data-testid="btn-mobile-refresh-report"
						>
							<RefreshCw
								size={18}
								className={data.loading ? "animate-spin text-[var(--teal)]" : ""}
								aria-hidden="true"
							/>
						</button>
					</nav>
				)}

				{isPnlModalOpen && (
					<Suspense fallback={null}>
						<FinancialAnalyticsModal
							isOpen={isPnlModalOpen}
							onClose={() => setIsPnlModalOpen(false)}
						/>
					</Suspense>
				)}
			</div>
		);
	}

	return (
		<div className="executive-dashboard-desktop-wrapper">
			{renderCanonicalToolbar()}

			<DesktopExecutiveView
				{...data}
				hideHeaderToolbar={true}
				onNavigateToSection={onNavigateToSection}
				onOpenFinancialAnalytics={handleOpenPnl}
			/>

			{isPnlModalOpen && (
				<Suspense fallback={null}>
					<FinancialAnalyticsModal
						isOpen={isPnlModalOpen}
						onClose={() => setIsPnlModalOpen(false)}
					/>
				</Suspense>
			)}
		</div>
	);
};
