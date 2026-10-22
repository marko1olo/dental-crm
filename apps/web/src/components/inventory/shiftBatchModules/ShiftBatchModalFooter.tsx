import type React from "react";
import { CheckCircle2, Loader2, PackageCheck } from "lucide-react";
import type { ShiftBatchMode, ShiftSummaryData } from "./types.js";

export interface ShiftBatchModalFooterProps {
	readonly activeMode: ShiftBatchMode;
	readonly summaryData: ShiftSummaryData | null;
	readonly isSubmitting: boolean;
	readonly isLoading: boolean;
	readonly isBlocked: boolean;
	readonly onClose: () => void;
	readonly onExecuteShiftDeduction: () => void;
	readonly onConfirmProcedureDeduction: () => void;
}

export const ShiftBatchModalFooter: React.FC<ShiftBatchModalFooterProps> = ({
	activeMode,
	summaryData,
	isSubmitting,
	isLoading,
	isBlocked,
	onClose,
	onExecuteShiftDeduction,
	onConfirmProcedureDeduction,
}) => {
	return (
		<div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
			<div className="text-xs text-[var(--muted)] text-center sm:text-left min-w-0 flex-1 truncate">
				{activeMode === "shift" && (
					summaryData?.isAlreadyDeducted ? (
						<span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
							<CheckCircle2 className="w-3.5 h-3.5 inline shrink-0" /> Смена за сегодня уже списана
						</span>
					) : (
						<span>Списание расходников за смену в 1 клик • Мягкий овердрафт активен</span>
					)
				)}
				{activeMode === "packages" && (
					<span>Выберите пакет и нажмите кнопку списания • Мгновенное списание</span>
				)}
				{activeMode === "procedure" && (
					<span>Списание набора материалов для текущего клинического визита</span>
				)}
			</div>

			<div className="flex items-center gap-2 shrink-0 justify-end">
				<button
					type="button"
					onClick={onClose}
					disabled={false}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
				>
					Закрыть
				</button>

				{activeMode === "shift" && (
					<button
						type="button"
						onClick={onExecuteShiftDeduction}
						disabled={isSubmitting}
						data-testid="btn-confirm-shift-batch-deduction"
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 sm:px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer transition-all active:scale-98 disabled:opacity-50 whitespace-nowrap shrink-0"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin shrink-0" />
								<span>Списание...</span>
							</>
						) : (
							<>
								<PackageCheck className="w-4 h-4 shrink-0" />
								<span>
									Списать расходники за смену ({summaryData?.shiftStats?.completedVisitsCount ?? 0} визитов)
								</span>
							</>
						)}
					</button>
				)}

				{activeMode === "procedure" && (
					<button
						type="button"
						onClick={onConfirmProcedureDeduction}
						disabled={isSubmitting}
						data-testid="btn-confirm-procedure-deduction"
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 sm:px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer transition-all active:scale-98 disabled:opacity-50 whitespace-nowrap shrink-0"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin shrink-0" />
								<span>Списание...</span>
							</>
						) : (
							<>
								<CheckCircle2 className="w-4 h-4 shrink-0" />
								<span>Списать материалы по процедуре</span>
							</>
						)}
					</button>
				)}
			</div>
		</div>
	);
};
