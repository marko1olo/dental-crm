import React from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { MobileExecutiveKpiTiles } from "./ExecutiveChairUtilizationChart";
import { MobileExecutiveDoctorsAndFunnels } from "./ExecutiveDoctorPerformanceTable";
import { MobileExecutiveKpiCards } from "./ExecutiveKpiSummaryCards";
import type { TopDoctorPerformanceRow } from "./executiveAnalyticsTypes";
import type { UseExecutiveDashboardDataResult } from "./useExecutiveDashboardData";

export interface MobileExecutiveViewProps {
	readonly data: UseExecutiveDashboardDataResult;
	readonly topDoctors: TopDoctorPerformanceRow[];
	readonly toolbar: React.ReactNode;
	readonly hideBottomBar?: boolean | undefined;
	readonly onNavigateToSection?: ((s: string) => void) | undefined;
	readonly onPrintPdf: () => void;
}

export function MobileExecutiveView({
	data,
	topDoctors,
	toolbar,
	hideBottomBar,
	onNavigateToSection,
	onPrintPdf,
}: MobileExecutiveViewProps) {
	return (
		<div
			className="mobile-exec-dashboard"
			role="main"
			aria-label="Мобильный рабочий стол Генерального директора"
			data-testid="mobile-executive-dashboard"
		>
			{toolbar}

			{/* 3 доминантные KPI-карточки */}
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
						onClick={onPrintPdf}
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
		</div>
	);
}
