/**
 * apps/web/src/components/analytics/ExecutiveDashboard.tsx
 *
 * Главный пульт руководителя DENTE CRM (SSOT Оркестратор).
 *
 * ОБЪЕДИНЯЕТ 3 КАНОНИЧЕСКИХ ЭКРАНА БЕЗ МИКРО-ШРЕДЕРА:
 * 1. ExecutiveFinancialSummary — Финансовый пульт клиники и типы оплат
 * 2. DoctorPayrollReport — Ведомость начисления зарплаты врачам (Net Revenue)
 * 3. ChairOccupancyReport — Загрузка кресел и свободные окна
 *
 * Полное соответствие Apple HIG, отсутствие слоёного пирога, единый дизайн-код.
 */

import React, { lazy, Suspense, useCallback, useState } from "react";
import {
	Armchair,
	Calculator,
	CreditCard,
	DollarSign,
	Download,
	FileSpreadsheet,
	Printer,
	Repeat,
	TrendingUp,
	Users,
	Wallet,
} from "lucide-react";
import { ChairOccupancyReport } from "./ChairOccupancyReport";
import { DoctorPayrollReport } from "./DoctorPayrollReport";
import { ExecutiveFinancialSummary } from "./ExecutiveFinancialSummary";
import { ExecutiveReceivablesPanel } from "./ExecutiveReceivablesPanel";
import { RebookingConversionPanel } from "./RebookingConversionPanel";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";
import { useAppStore } from "../../store/appStore";
import { useSettingsStore } from "../../store/settingsStore";
import { showToast } from "../GlobalToast";
import {
	generateManagerReportsCsv,
	type ManagerReportsDataBundle,
	triggerCsvDownload,
} from "./analyticsCsvUtils";
import {
	CANONICAL_PERIOD_OPTIONS,
	type ExecutiveDashboardProps,
	type MobileAnalyticsPeriod,
} from "./executiveTypes";

const ManagerialPnlDashboardModal = lazy(() =>
	import("../finance/pnl/ManagerialPnlDashboardModal").then((m) => ({
		default: m.ManagerialPnlDashboardModal,
	})),
);

export { CANONICAL_PERIOD_OPTIONS };
export type { ExecutiveDashboardProps, MobileAnalyticsPeriod };

export type ExecutiveActiveTab = "financial" | "payroll" | "chairs" | "rebooking" | "receivables";

export function resolveExecutiveDashboardVisibility(params: {
	readonly clinicMode: ReturnType<typeof useSettingsStore.getState>["clinicMode"] | string;
	readonly selectedWorkspaceRole: string;
	readonly hasPayrollModule: boolean;
	readonly hasMultipleChairs: boolean;
}) {
	const isSoloDoctor = params.clinicMode === "solo_doctor";
	const showPayrollTab =
		params.hasPayrollModule &&
		!isSoloDoctor &&
		!["administrator", "senior_admin", "registrar", "curator"].includes(params.selectedWorkspaceRole);
	const showChairsTab = !isSoloDoctor || params.hasMultipleChairs;
	const showPnlButton =
		["owner", "manager", "accountant", "head_doctor"].includes(params.selectedWorkspaceRole) ||
		(params.selectedWorkspaceRole === "doctor" && (isSoloDoctor || params.clinicMode === "one_chair"));
	return { isSoloDoctor, showPayrollTab, showChairsTab, showPnlButton };
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = (props) => {
	const {
		period = "month",
		initialTab,
		onPeriodChange,
		onNavigateToSection,
		onOpenFinancialAnalytics,
	} = props;

	const { hasPayrollModule, hasMultipleChairs } = useWorkspaceProfile();
	const selectedWorkspaceRole = useAppStore((s) => s.selectedWorkspaceRole);
	const clinicMode = useSettingsStore((s) => s.clinicMode);
	const { showPayrollTab, showChairsTab, showPnlButton } = resolveExecutiveDashboardVisibility({
		clinicMode,
		selectedWorkspaceRole,
		hasPayrollModule,
		hasMultipleChairs,
	});

	const [activeTab, setActiveTab] = useState<ExecutiveActiveTab>(() => {
		if (initialTab && (initialTab !== "payroll" || showPayrollTab)) return initialTab;
		if (typeof window !== "undefined") {
			const savedTab = sessionStorage.getItem("dente_executive_tab") || localStorage.getItem("dente_executive_tab");
			if (
				(savedTab === "payroll" && showPayrollTab) ||
				(savedTab === "chairs" && showChairsTab) ||
				savedTab === "financial" ||
				savedTab === "rebooking" ||
				savedTab === "receivables"
			) {
				return savedTab;
			}
			const h = window.location.hash.toLowerCase();
			const s = window.location.search.toLowerCase();
			if (
				showPayrollTab &&
				(h.includes("payroll") ||
					s.includes("payroll") ||
					h.includes("payout") ||
					s.includes("payout") ||
					h.includes("salary") ||
					s.includes("salary"))
			) {
				return "payroll";
			}
			if (showChairsTab && (h.includes("chairs") || s.includes("chairs"))) {
				return "chairs";
			}
			if (h.includes("rebooking") || s.includes("rebooking") || h.includes("retention") || s.includes("retention")) {
				return "rebooking";
			}
			if (h.includes("receivables") || s.includes("receivables") || h.includes("debt")) {
				return "receivables";
			}
		}
		return "financial";
	});
	const [currentPeriod, setCurrentPeriod] = useState<string>(period);
	const [isPnlModalOpen, setIsPnlModalOpen] = useState(false);

	const handlePeriodSelect = useCallback(
		(p: string) => {
			setCurrentPeriod(p);
			if (onPeriodChange) onPeriodChange(p as MobileAnalyticsPeriod);
		},
		[onPeriodChange],
	);

	const handlePrint = useCallback(() => {
		if (typeof window !== "undefined") window.print();
	}, []);

	const handleExportCsv = useCallback(async () => {
		try {
			const [sumRes, recRes, svcRes] = await Promise.all([
				fetch(`/api/reports/summary?period=${encodeURIComponent(currentPeriod)}`, {
					headers: denteClinicalReadHeaders(),
				}),
				fetch("/api/reports/receivables", {
					headers: denteClinicalReadHeaders(),
				}),
				fetch(`/api/reports/services?period=${encodeURIComponent(currentPeriod)}`, {
					headers: denteClinicalReadHeaders(),
				}),
			]);

			const unwrapJson = async (res: Response): Promise<unknown> => {
				if (!res.ok) return null;
				const raw = (await res.json()) as unknown;
				return raw && typeof raw === "object" && "data" in raw
					? ((raw as { data?: unknown }).data ?? raw)
					: raw;
			};

			const [sumPayload, recPayload, svcPayload] = await Promise.all([
				unwrapJson(sumRes),
				unwrapJson(recRes),
				unwrapJson(svcRes),
			]);

			const sumObj = (sumPayload && typeof sumPayload === "object" ? sumPayload : null) as Record<string, unknown> | null;
			const periodObj = (sumObj?.period ?? null) as { from?: string; to?: string } | null;
			const todayIso = new Date().toISOString().slice(0, 10);
			const fromIso = periodObj?.from ? String(periodObj.from).slice(0, 10) : todayIso;
			const toIso = periodObj?.to ? String(periodObj.to).slice(0, 10) : todayIso;

			const bundle: ManagerReportsDataBundle = {
				period: { from: fromIso, to: toIso },
				summary: (sumObj as ManagerReportsDataBundle["summary"]) ?? null,
				services: (svcPayload as ManagerReportsDataBundle["services"]) ?? null,
				receivables: (recPayload as ManagerReportsDataBundle["receivables"]) ?? null,
				scheduleLoad: null,
			};
			const csv = generateManagerReportsCsv(bundle);
			const filename = `DENTE_Analytics_${fromIso}_${toIso}.csv`;
			triggerCsvDownload(csv, filename);
			showToast(`Сводный отчёт (${filename}) выгружен в CSV`, "success");
		} catch {
			showToast("Не удалось выгрузить сводный отчёт в CSV", "error");
		}
	}, [currentPeriod]);

	return (
		<div
			className="executive-dashboard-container space-y-4"
			data-testid="executive-dashboard-root"
		>
			{/* Верхний лаконичный селектор режима — адаптивная переносная строка без перекрытия и обрезания */}
			<div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm max-w-full">
				<div
					className="p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex items-center flex-nowrap gap-1 overflow-x-auto no-scrollbar max-w-full min-w-0"
					role="tablist"
					aria-label="Вкладки финансового пульта"
				>
					<button
						type="button"
						role="tab"
						data-testid="executive-tab-financial"
						aria-selected={activeTab === "financial"}
						onClick={() => setActiveTab("financial")}
						className={`min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
							activeTab === "financial"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
								: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						<CreditCard size={14} aria-hidden="true" className="shrink-0" />
						<span className="sm:hidden">Финансы</span>
						<span className="hidden sm:inline">Финансовый пульт</span>
					</button>

					{showPayrollTab && (
						<button
							type="button"
							role="tab"
							data-testid="executive-tab-payroll"
							aria-selected={activeTab === "payroll"}
							onClick={() => setActiveTab("payroll")}
							className={`min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
								activeTab === "payroll"
									? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
									: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							<Users size={14} aria-hidden="true" className="shrink-0" />
							<span className="sm:hidden">Зарплаты</span>
							<span className="hidden sm:inline">Зарплаты врачей (Net)</span>
						</button>
					)}

					{showChairsTab && (
						<button
							type="button"
							role="tab"
							data-testid="executive-tab-chairs"
							aria-selected={activeTab === "chairs"}
							onClick={() => setActiveTab("chairs")}
							className={`min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
								activeTab === "chairs"
									? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
									: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							<Armchair size={14} aria-hidden="true" className="shrink-0" />
							<span className="sm:hidden">Кресла</span>
							<span className="hidden sm:inline">Загрузка кресел</span>
						</button>
					)}

					<button
						type="button"
						role="tab"
						data-testid="executive-tab-rebooking"
						aria-selected={activeTab === "rebooking"}
						onClick={() => setActiveTab("rebooking")}
						className={`min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
							activeTab === "rebooking"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
								: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Repeat size={14} aria-hidden="true" className="shrink-0" />
						<span className="sm:hidden">Повтор</span>
						<span className="hidden sm:inline">Повторная запись</span>
					</button>

					<button
						type="button"
						role="tab"
						data-testid="executive-tab-receivables"
						aria-selected={activeTab === "receivables"}
						onClick={() => setActiveTab("receivables")}
						className={`min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
							activeTab === "receivables"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
								: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Wallet size={14} aria-hidden="true" className="shrink-0" />
						<span className="sm:hidden">Долги</span>
						<span className="hidden sm:inline">Дебиторка и авансы</span>
					</button>
				</div>

				<div className="flex items-center justify-end gap-2 shrink-0 ml-auto">
					<button
						type="button"
						onClick={() => void handleExportCsv()}
						data-testid="executive-export-csv-btn"
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--primary)] transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
						title="Выгрузить сводный отчёт в CSV (Excel)"
					>
						<Download size={13} aria-hidden="true" className="shrink-0" />
						<span className="hidden sm:inline">CSV</span>
					</button>

					<button
						type="button"
						onClick={handlePrint}
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--primary)] transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
						title="Распечатать отчёт"
					>
						<Printer size={13} aria-hidden="true" className="shrink-0" />
						<span className="hidden sm:inline">Печать</span>
					</button>

					{showPnlButton && (
						<button
							type="button"
							onClick={() => {
								if (onOpenFinancialAnalytics) onOpenFinancialAnalytics();
								else if (onNavigateToSection) onNavigateToSection("financial_analytics");
								else setIsPnlModalOpen(true);
							}}
							className="primary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 shadow-sm"
						>
							<Calculator size={13} aria-hidden="true" className="shrink-0" />
							<span>Управленческий P&amp;L</span>
						</button>
					)}
				</div>
			</div>

			{/* Контент активного экрана */}
			<div className="executive-active-view-wrapper min-h-[400px]">
				{activeTab === "financial" && (
					<ExecutiveFinancialSummary
						period={currentPeriod}
						onPeriodChange={handlePeriodSelect}
						onPrint={handlePrint}
					/>
				)}

				{activeTab === "payroll" && (
					<DoctorPayrollReport
						period={currentPeriod}
						onPeriodChange={handlePeriodSelect}
						onPrint={handlePrint}
					/>
				)}

				{activeTab === "chairs" && (
					<ChairOccupancyReport
						period={currentPeriod}
						onPeriodChange={handlePeriodSelect}
						onPrint={handlePrint}
					/>
				)}

				{activeTab === "rebooking" && (
					<RebookingConversionPanel
						period={currentPeriod}
						onPeriodChange={handlePeriodSelect}
						onPrint={handlePrint}
					/>
				)}

				{activeTab === "receivables" && (
					<ExecutiveReceivablesPanel period={currentPeriod} />
				)}
			</div>

			{isPnlModalOpen && (
				<Suspense fallback={null}>
					<ManagerialPnlDashboardModal
						isOpen={isPnlModalOpen}
						onClose={() => setIsPnlModalOpen(false)}
					/>
				</Suspense>
			)}
		</div>
	);
};
