import React from "react";
import { CheckCircle2, Loader2, PackageCheck, Printer, Zap } from "lucide-react";
import type { ShiftSummaryData, WriteoffActiveTab } from "./batchWriteoffTypes.js";

interface BatchWriteoffFooterProps {
	readonly activeTab: WriteoffActiveTab;
	readonly onPrintAct: () => void;
	readonly onClose: () => void;
	readonly isSubmitting: boolean;
	readonly submittingPackageId: string | null;
	readonly summaryData?: ShiftSummaryData | null;
	readonly onExecuteShiftWriteoff: () => Promise<void>;
	readonly onConfirmProcedureDeduction: () => Promise<void>;
	readonly onPackageClick: (pkgId: any) => Promise<void>;
}

export const BatchWriteoffFooter: React.FC<BatchWriteoffFooterProps> = ({
	activeTab,
	onPrintAct,
	onClose,
	isSubmitting,
	submittingPackageId,
	summaryData,
	onExecuteShiftWriteoff,
	onConfirmProcedureDeduction,
	onPackageClick,
}) => {
	const completedVisits = summaryData?.shiftStats?.completedVisitsCount ?? 6;

	return (
		<div className="px-4 py-3 sm:px-5 sm:py-3.5 pb-[max(14px,env(safe-area-inset-bottom,14px))] border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 flex flex-wrap items-center justify-between gap-3">
			<button
				type="button"
				onClick={onPrintAct}
				className="h-9 min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]/10 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
				title="Печать акта списания материалов"
				data-testid="btn-print-writeoff-act"
			>
				<Printer size={15} />
				<span>Печать акта списания</span>
			</button>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onClose}
					className="h-9 min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold transition cursor-pointer"
				>
					Закрыть
				</button>

				{activeTab === "shift" && (
					<button
						type="button"
						onClick={onExecuteShiftWriteoff}
						disabled={false}
						className="h-9 min-h-[36px] px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] active:scale-98 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
						data-testid="btn-confirm-shift-batch-deduction"
					>
						{isSubmitting ? (
							<>
								<Loader2 size={15} className="animate-spin" />
								<span>Списание...</span>
							</>
						) : (
							<>
								<PackageCheck size={15} />
								<span>Списать расходники за смену ({completedVisits} визитов)</span>
							</>
						)}
					</button>
				)}

				{activeTab === "packages" && (
					<button
						type="button"
						onClick={() => onPackageClick("anesthesia_package")}
						disabled={false}
						className="h-9 min-h-[36px] px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] active:scale-98 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
						data-testid="btn-confirm-primary-package"
					>
						{submittingPackageId ? (
							<>
								<Loader2 size={15} className="animate-spin" />
								<span>Списание...</span>
							</>
						) : (
							<>
								<Zap size={15} />
								<span>Списать выбранный пакет</span>
							</>
						)}
					</button>
				)}

				{activeTab === "procedure" && (
					<button
						type="button"
						onClick={onConfirmProcedureDeduction}
						disabled={false}
						className="h-9 min-h-[36px] px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] active:scale-98 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
						data-testid="btn-confirm-procedure-deduction"
					>
						{isSubmitting ? (
							<>
								<Loader2 size={15} className="animate-spin" />
								<span>Списание...</span>
							</>
						) : (
							<>
								<CheckCircle2 size={15} />
								<span>Списать материалы приёма</span>
							</>
						)}
					</button>
				)}
			</div>
		</div>
	);
};
