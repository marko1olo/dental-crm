import { FileText, PenTool, Printer, Save, ShieldCheck } from "lucide-react";
import type React from "react";
import type { EstimatorTopBarProps } from "./estimatorUiTypes";

export const TreatmentEstimatorTopBar: React.FC<EstimatorTopBarProps> = ({
	plannerTab,
	setPlannerTab,
	signatureUrl,
	onPaperConfirm,
	onDirectPrint,
	onOpenSignModal,
	onSavePlan,
	isSaving,
	unpricedWarning,
}) => {
	return (
		<div
			className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)]"
			style={{ padding: "12px 16px", gap: "12px" }}
		>
			<div className="flex flex-wrap items-center gap-3 min-w-0" style={{ gap: "12px" }}>
				<h2 className="flex items-center gap-2 text-base font-bold truncate whitespace-nowrap" style={{ gap: "8px" }}>
					<FileText size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="truncate">План лечения</span>
				</h2>
				<div className="flex items-center gap-1 bg-[var(--paper)] border border-[var(--line)] p-1 rounded-lg text-xs font-bold flex-wrap" style={{ padding: "3px", gap: "4px" }}>
					<button
						type="button"
						onClick={() => setPlannerTab("comprehensive_804n")}
						style={{ padding: "5px 12px", borderRadius: "6px", ...(plannerTab === "comprehensive_804n" ? { backgroundColor: "#0d9488", color: "#ffffff" } : { color: "var(--muted)" }) }}
						className={`px-3 py-1.5 min-h-[44px] sm:min-h-[30px] sm:h-[30px] inline-flex items-center justify-center rounded-md transition-all cursor-pointer touch-manipulation ${plannerTab === "comprehensive_804n" ? "bg-teal-600 text-white shadow-xs font-black" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"}`}
						aria-label="3 Варианта плана"
					>
						3 Варианта плана
					</button>
					<button
						type="button"
						onClick={() => setPlannerTab("manual_lines")}
						style={{ padding: "5px 12px", borderRadius: "6px", ...(plannerTab === "manual_lines" ? { backgroundColor: "#0d9488", color: "#ffffff" } : { color: "var(--muted)" }) }}
						className={`px-3 py-1.5 min-h-[44px] sm:min-h-[30px] sm:h-[30px] inline-flex items-center justify-center rounded-md transition-all cursor-pointer touch-manipulation ${plannerTab === "manual_lines" ? "bg-teal-600 text-white shadow-xs font-black" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"}`}
					>
						Построчная смета
					</button>
				</div>
			</div>
			<div className="flex gap-2 flex-wrap sm:flex-nowrap shrink-0" style={{ gap: "8px" }}>
				{signatureUrl && (
					<span className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100/50 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full border border-emerald-200/50 dark:border-emerald-500/30 flex items-center" style={{ padding: "4px 10px" }}>
						ПОДПИСАНО
					</span>
				)}
				<button
					type="button"
					onClick={onPaperConfirm}
					style={{ padding: "6px 12px", gap: "6px" }}
					className="dente-filter-chip flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[34px] sm:h-[34px] text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
					title="Пациент подписал распечатанную смету — подтвердить"
					data-testid="estimator-paper-confirm-btn"
				>
					<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>На бумаге</span>
				</button>
				<button
					type="button"
					onClick={onDirectPrint}
					style={{ padding: "6px 12px", gap: "6px" }}
					className="dente-filter-chip flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[34px] sm:h-[34px] text-xs font-bold text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] rounded-lg hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					title="Распечатать смету плана лечения для согласования с пациентом"
					data-testid="estimator-direct-print-btn"
				>
					<Printer size={14} className="shrink-0" />
					<span>Печать сметы</span>
				</button>
				<button
					type="button"
					onClick={onOpenSignModal}
					disabled={false}
					title={unpricedWarning ?? "Подписать план у пациента"}
					style={{ padding: "6px 12px", gap: "6px" }}
					className="dente-filter-chip flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[34px] sm:h-[34px] text-xs font-bold text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] rounded-lg hover:bg-[var(--paper-soft)] transition-colors touch-manipulation cursor-pointer"
					data-testid="estimator-open-sign-modal-btn"
				>
					<PenTool size={14} className="shrink-0" />
					<span>Подписать</span>
				</button>
				<button
					type="button"
					onClick={onSavePlan}
					disabled={isSaving}
					title={unpricedWarning ?? "Сохранить план лечения"}
					style={{ padding: "6px 14px", gap: "6px", backgroundColor: "#0d9488", color: "#ffffff", borderColor: "#0f766e" }}
					className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[44px] sm:min-h-[34px] sm:h-[34px] text-xs font-bold text-white bg-teal-600 border border-teal-500 rounded-lg shadow-xs hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation cursor-pointer"
				>
					<Save size={14} className="shrink-0" />
					<span>{isSaving ? "Сохранение..." : "Сохранить"}</span>
				</button>
			</div>
		</div>
	);
};
