/**
 * apps/web/src/components/analytics/clinicDashboard/index.tsx
 *
 * Мастер-координатор дашборда аналитики клиники (Layer 5).
 * Объединяет все доменные слои (KPI, загрузка кресел, выработка врачей, P&L)
 * и реэкспортирует публичный API модуля.
 */

import React from "react";
import {
	Activity,
	AlertCircle,
	Coins,
	Download,
	PieChart,
	RefreshCw,
	TrendingUp,
	Users,
} from "lucide-react";
import "../clinicAnalyticsDashboard.css";

import type {
	AnalyticsPeriodChoice,
	AnalyticsTabChoice,
	ClinicAnalyticsDashboardProps,
} from "./types.js";
import { useClinicAnalyticsData } from "./useClinicAnalyticsData.js";
import { AnalyticsKpiCardsGrid } from "./AnalyticsKpiCardsGrid.js";
import { AnalyticsChairUtilizationSection } from "./AnalyticsChairUtilizationSection.js";
import { AnalyticsDoctorProductivityTable } from "./AnalyticsDoctorProductivityTable.js";
import { AnalyticsRevenueChartSection } from "./AnalyticsRevenueChartSection.js";

export * from "./types.js";
export * from "./useClinicAnalyticsData.js";
export * from "./AnalyticsKpiCardsGrid.js";
export * from "./AnalyticsChairUtilizationSection.js";
export * from "./AnalyticsDoctorProductivityTable.js";
export * from "./AnalyticsRevenueChartSection.js";

export const ClinicAnalyticsDashboard: React.FC<ClinicAnalyticsDashboardProps> = (props) => {
	const {
		period,
		setPeriod,
		activeTab,
		setActiveTab,
		isLoading,
		error,
		periodLabel,
		financialSummary,
		chairSummary,
		doctorSummary,
		loadLiveData,
		handleExportCsv,
	} = useClinicAnalyticsData(props);

	return (
		<div className="cad-container" role="region" aria-label="Дашборд аналитики клиники">
			{/* ─── ШАПКА ДАШБОРДА И ТУЛБАР (1 СТРОКА) ──────────────────────────────── */}
			<header className="cad-header">
				<div className="cad-title-group">
					<div className="cad-title-icon">
						<TrendingUp size={20} aria-hidden="true" />
					</div>
					<div>
						<h2 className="cad-title">Аналитика и загрузка клиники</h2>
						<p className="cad-subtitle">
							Реальные фискальные оплаты, утилизация кресел с санобработкой и выработка врачей
						</p>
					</div>
				</div>

				<div className="cad-toolbar">
					{/* Вкладки разделов */}
					<div className="dente-segmented-bar" role="tablist" aria-label="Разделы аналитики">
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "overview"}
							className={`dente-segmented-item ${activeTab === "overview" ? "active" : ""}`}
							data-active={activeTab === "overview"}
							onClick={() => setActiveTab("overview")}
						>
							<PieChart size={14} /> <span>Сводка</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "finances"}
							className={`dente-segmented-item ${activeTab === "finances" ? "active" : ""}`}
							data-active={activeTab === "finances"}
							onClick={() => setActiveTab("finances")}
						>
							<Coins size={14} /> <span>Финансы</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "chairs"}
							className={`dente-segmented-item ${activeTab === "chairs" ? "active" : ""}`}
							data-active={activeTab === "chairs"}
							onClick={() => setActiveTab("chairs")}
						>
							<Activity size={14} /> <span>Кресла</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "doctors"}
							className={`dente-segmented-item ${activeTab === "doctors" ? "active" : ""}`}
							data-active={activeTab === "doctors"}
							onClick={() => setActiveTab("doctors")}
						>
							<Users size={14} /> <span>Врачи</span>
						</button>
					</div>

					{/* Селектор периода [ Сегодня | Неделя | Месяц | Квартал | Год ] */}
					<div className="dente-segmented-bar" role="group" aria-label="Период аналитики">
						<button
							type="button"
							className={`dente-segmented-item ${period === "day" ? "active" : ""}`}
							data-active={period === "day"}
							onClick={() => setPeriod("day")}
						>
							Сегодня
						</button>
						<button
							type="button"
							className={`dente-segmented-item ${period === "week" ? "active" : ""}`}
							data-active={period === "week"}
							onClick={() => setPeriod("week")}
						>
							Неделя
						</button>
						<button
							type="button"
							className={`dente-segmented-item ${period === "month" ? "active" : ""}`}
							data-active={period === "month"}
							onClick={() => setPeriod("month")}
						>
							Месяц
						</button>
						<button
							type="button"
							className={`dente-segmented-item ${period === "quarter" ? "active" : ""}`}
							data-active={period === "quarter"}
							onClick={() => setPeriod("quarter")}
						>
							Квартал
						</button>
						<button
							type="button"
							className={`dente-segmented-item ${period === "year" ? "active" : ""}`}
							data-active={period === "year"}
							onClick={() => setPeriod("year")}
						>
							Год
						</button>
					</div>

					{/* Кнопки действий (Стандарт DENTE: высота 32px, шрифт 13px, скругление 8px) */}
					<button
						type="button"
						className="secondary-button h-8 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
						onClick={handleExportCsv}
						title="Экспорт аналитического отчета в Excel / CSV"
						data-testid="cad-export-excel-btn"
					>
						<Download size={14} />
						<span>Экспорт в Excel</span>
					</button>

					<button
						type="button"
						className="secondary-button h-8 w-8 min-w-[32px] min-h-[32px] p-0 rounded-lg inline-flex items-center justify-center cursor-pointer shadow-xs"
						onClick={loadLiveData}
						disabled={isLoading}
						title="Обновить данные из базы"
						aria-label="Обновить данные аналитики"
						data-testid="cad-refresh-btn"
					>
						<RefreshCw size={14} className={isLoading ? "animate-spin text-[var(--teal)]" : ""} />
					</button>
				</div>
			</header>

			{/* Сообщение об ошибке */}
			{error && (
				<div className="cad-panel" style={{ borderColor: "var(--err-fg, #ef4444)", padding: "0.75rem 1rem" }}>
					<div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--err-fg, #ef4444)" }}>
						<AlertCircle size={16} />
						<span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{error}</span>
					</div>
				</div>
			)}

			{/* 4 ДОМИНАНТНЫХ ФИНАНСОВЫХ И ОПЕРАЦИОННЫХ KPI (TIER 1) */}
			<AnalyticsKpiCardsGrid
				financialSummary={financialSummary}
				chairSummary={chairSummary}
				periodLabel={periodLabel}
			/>

			{/* СОДЕРЖИМОЕ ВКЛАДОК */}

			{/* 1. ВКЛАДКА: СВОДКА ИЛИ КРЕСЛА */}
			{(activeTab === "overview" || activeTab === "chairs") && (
				<AnalyticsChairUtilizationSection chairSummary={chairSummary} />
			)}

			{/* 2. ВКЛАДКА: СВОДКА ИЛИ ВРАЧИ */}
			{(activeTab === "overview" || activeTab === "doctors") && (
				<AnalyticsDoctorProductivityTable doctorSummary={doctorSummary} />
			)}

			{/* 3. ВКЛАДКА: СВОДКА ИЛИ ФИНАНСЫ */}
			{(activeTab === "overview" || activeTab === "finances") && (
				<AnalyticsRevenueChartSection
					financialSummary={financialSummary}
					periodLabel={periodLabel}
				/>
			)}
		</div>
	);
};
