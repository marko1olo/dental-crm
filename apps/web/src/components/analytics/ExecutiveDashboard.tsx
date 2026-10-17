/**
 * apps/web/src/components/analytics/ExecutiveDashboard.tsx
 *
 * СУВЕРЕННЫЙ МОБИЛЬНЫЙ ДАШБОРД АНАЛИТИКИ И KPI (APPLE FITNESS & HEALTH HIG — ФАСАД).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ExecutiveDashboardPayload, ExecutivePeriod } from "@dental/shared";
import { Download, Printer, RefreshCw } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { getDemoExecutiveAnalytics, isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";
import { buildRfc4180Csv, triggerCsvDownload } from "../reports/reportsCsvExport";
import { MobileExecutiveKpiTiles } from "./executiveModules/ExecutiveChairUtilizationChart";
import {
	buildTopDoctorsPerformanceRows,
	MobileExecutiveDoctorsAndFunnels,
} from "./executiveModules/ExecutiveDoctorPerformanceTable";
import { MobileExecutiveKpiCards } from "./executiveModules/ExecutiveKpiSummaryCards";
import {
	buildEmptyExecutivePayload,
	computePeriodMetricsFromPayload,
	type ExecutiveDashboardProps,
	type MobileAnalyticsPeriod,
} from "./executiveModules/executiveAnalyticsTypes";
import "./executiveDashboard.css";

export type { ExecutiveDashboardProps, MobileAnalyticsPeriod };

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
	initialPeriod = "month",
	period: controlledPeriod,
	onPeriodChange,
	onNavigateToSection,
	hideBottomBar = false,
}) => {
	const [internalPeriod, setInternalPeriod] = useState<MobileAnalyticsPeriod>(initialPeriod);
	const activePeriod = controlledPeriod ?? internalPeriod;

	const handlePeriodSelect = useCallback(
		(p: MobileAnalyticsPeriod) => {
			if (onPeriodChange) {
				onPeriodChange(p);
			} else {
				setInternalPeriod(p);
			}
		},
		[onPeriodChange],
	);

	const [loading, setLoading] = useState<boolean>(false);
	const [payload, setPayload] = useState<ExecutiveDashboardPayload | null>(null);
	const [doctorsReport, setDoctorsReport] = useState<any[]>([]);

	const apiPeriod: ExecutivePeriod = activePeriod as ExecutivePeriod;

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			if (isDemoShowcaseMode()) {
				setPayload(getDemoExecutiveAnalytics(apiPeriod));
				setLoading(false);
				return;
			}

			const [res, docRes] = await Promise.all([
				fetch(`/api/analytics/executive?period=${apiPeriod}`, {
					headers: {
						...denteAdminSecretRequestHeaders(),
						Accept: "application/json",
					},
				}),
				fetch(`/api/reports/doctors?period=${apiPeriod}`, {
					headers: {
						...denteAdminSecretRequestHeaders(),
						Accept: "application/json",
					},
				}).catch(() => null),
			]);

			if (res.ok) {
				const json = await res.json();
				if (json.success && json.data) {
					setPayload(json.data);
				} else {
					setPayload(buildEmptyExecutivePayload(apiPeriod));
				}
			} else {
				setPayload(buildEmptyExecutivePayload(apiPeriod));
			}

			if (docRes && docRes.ok) {
				const docJson = await docRes.json();
				if (Array.isArray(docJson?.doctors)) {
					setDoctorsReport(docJson.doctors);
				} else if (Array.isArray(docJson?.rows)) {
					setDoctorsReport(docJson.rows);
				}
			}
		} catch (err) {
			console.error("Failed to load executive analytics:", err);
			if (isDemoShowcaseMode()) {
				setPayload(getDemoExecutiveAnalytics(apiPeriod));
			} else {
				setPayload(buildEmptyExecutivePayload(apiPeriod));
			}
		} finally {
			setLoading(false);
		}
	}, [apiPeriod]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const periodMetrics = useMemo(
		() => computePeriodMetricsFromPayload(payload),
		[payload],
	);

	const handleExportCsv = useCallback(() => {
		const pb = periodMetrics.paymentBreakdown;
		const csvRows: (string | number)[][] = [
			["Показатель", "Значение", "Период"],
			["Выручка факт", periodMetrics.revenueFormatted, activePeriod],
			["Выручка план", periodMetrics.revenuePlanFormatted, activePeriod],
			["Выполнение плана", `${periodMetrics.revenuePercent}%`, activePeriod],
			["Чистая прибыль", periodMetrics.netProfit, activePeriod],
			["Рентабельность", `${periodMetrics.netMarginPercent}%`, activePeriod],
			["Загрузка кресел", `${periodMetrics.occupancyPercent}%`, activePeriod],
			["Себестоимость кресло-часа", periodMetrics.chairHourlyCostFormatted, activePeriod],
			["Средний чек", periodMetrics.averageCheck, activePeriod],
			["Первичные пациенты", periodMetrics.primaryPatients, activePeriod],
			["Повторные пациенты", periodMetrics.repeatPatients, activePeriod],
			["Оплата наличными (касса)", pb ? `${pb.cashFormatted} (${pb.cashPercent}%)` : "—", activePeriod],
			["Оплата картой / ДМС", pb ? `${pb.cardFormatted} (${pb.cardPercent}%)` : "—", activePeriod],
			["Оплата СБП QR", pb ? `${pb.sbpFormatted} (${pb.sbpPercent}%)` : "—", activePeriod],
		];

		const csvContent = buildRfc4180Csv(csvRows);
		triggerCsvDownload(
			csvContent,
			`dente_analytics_${activePeriod}_${new Date().toISOString().slice(0, 10)}.csv`,
		);
		showToast(`Сводный отчет за период «${activePeriod}» успешно сохранен в CSV`, "success");
	}, [periodMetrics, activePeriod]);

	const handlePrintPdf = useCallback(() => {
		if (typeof window !== "undefined") {
			window.print();
		}
	}, []);

	const topDoctors = useMemo(() => {
		if (payload?.topDoctors && payload.topDoctors.length > 0) {
			return payload.topDoctors;
		}
		return buildTopDoctorsPerformanceRows(doctorsReport, activePeriod, isDemoShowcaseMode());
	}, [payload?.topDoctors, doctorsReport, activePeriod]);

	const periodOptions: { key: MobileAnalyticsPeriod; label: string }[] = [
		{ key: "day", label: "День" },
		{ key: "week", label: "Неделя" },
		{ key: "month", label: "Месяц" },
		{ key: "quarter", label: "Квартал" },
	];

	return (
		<div
			className="mobile-exec-dashboard"
			role="main"
			aria-label="Мобильный рабочий стол Генерального директора"
			data-testid="mobile-executive-dashboard"
		>
			{/* 1. ТАКТИЛЬНЫЙ SEGMENTED CONTROL ПЕРИОДОВ (APPLE HIG >= 44PX) */}
			<div className="mobile-exec-segmented-wrap" role="region" aria-label="Выбор периода аналитики">
				<div className="mobile-exec-segmented" role="radiogroup">
					{periodOptions.map((opt) => (
						<button
							key={opt.key}
							type="button"
							role="radio"
							aria-checked={activePeriod === opt.key}
							className={`mobile-exec-segmented-btn ${activePeriod === opt.key ? "active" : ""}`}
							onClick={() => handlePeriodSelect(opt.key)}
							data-testid={`period-btn-${opt.key}`}
						>
							{opt.label}
						</button>
					))}
				</div>
			</div>

			{/* 2. ПРАГМАТИЧНЫЕ ФИНАНСОВЫЕ KPI И РАСПРЕДЕЛЕНИЕ ОПЛАТ */}
			<MobileExecutiveKpiTiles
				periodMetrics={periodMetrics}
				kpis={payload?.kpis}
				onNavigateToSection={onNavigateToSection}
			/>

			{/* 3. 4 ДОМИНАНТНЫЕ KPI-КАРТОЧКИ */}
			<MobileExecutiveKpiCards
				periodMetrics={periodMetrics}
				totalChairsCount={payload?.kpis.totalChairsCount ?? 1}
				onNavigateToSection={onNavigateToSection}
			/>

			{/* 4-6. ТОП ВРАЧЕЙ, НАПРАВЛЕНИЯ И 8-ЭТАПНАЯ ВОРОНКА */}
			<MobileExecutiveDoctorsAndFunnels topDoctors={topDoctors} payload={payload} />

			{/* 7. ФИКСИРОВАННЫЙ BOTTOM BAR В NATURAL THUMB ZONE (APPLE HIG) */}
			{!hideBottomBar && (
				<nav className="mobile-exec-bottom-bar" aria-label="Действия с отчетом аналитики">
					<button
						type="button"
						className="mobile-exec-btn-primary"
						onClick={handleExportCsv}
						data-testid="btn-mobile-export-report"
					>
						<Download size={18} aria-hidden="true" />
						<span>Экспорт отчета (Excel / CSV)</span>
					</button>

					<button
						type="button"
						className="mobile-exec-btn-secondary"
						onClick={handlePrintPdf}
						title="Печать или сохранение в PDF"
						aria-label="Печать отчета в PDF"
						data-testid="btn-mobile-print-report"
					>
						<Printer size={18} aria-hidden="true" />
					</button>

					<button
						type="button"
						className="mobile-exec-btn-secondary"
						onClick={loadData}
						disabled={loading}
						title="Обновить показатели"
						aria-label="Обновить показатели"
						data-testid="btn-mobile-refresh-report"
					>
						<RefreshCw size={18} className={loading ? "animate-spin text-[var(--teal)]" : ""} aria-hidden="true" />
					</button>
				</nav>
			)}
		</div>
	);
};
