import React from "react";
import { PackageCheck, Printer, Zap } from "lucide-react";
import type { WriteoffActiveTab } from "./batchWriteoffTypes.js";

interface BatchWriteoffFooterProps {
	readonly activeTab: WriteoffActiveTab;
	readonly onPrintAct: () => void;
	readonly onClose: () => void;
	readonly isSubmitting: boolean;
	readonly submittingPackageId: string | null;
	readonly onExecuteShiftWriteoff: () => Promise<void>;
	readonly onPackageClick: (pkgId: any) => Promise<void>;
}

export const BatchWriteoffFooter: React.FC<BatchWriteoffFooterProps> = ({
	activeTab,
	onPrintAct,
	onClose,
	isSubmitting,
	submittingPackageId,
	onExecuteShiftWriteoff,
	onPackageClick,
}) => {
	const isBusy = isSubmitting || Boolean(submittingPackageId);

	return (
		<div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 flex flex-wrap items-center justify-between gap-3">
			<button
				type="button"
				onClick={onPrintAct}
				className="h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]/10 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
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
					disabled={isBusy}
					className="h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-semibold transition cursor-pointer"
				>
					Отмена
				</button>

				{activeTab === "shift" && (
					<button
						type="button"
						onClick={onExecuteShiftWriteoff}
						disabled={isSubmitting}
						className="h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-[var(--primary)] text-white hover:brightness-110 active:scale-95 font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
						data-testid="btn-confirm-shift-writeoff"
					>
						<Zap size={15} />
						<span>{isSubmitting ? "Списание..." : "✓ Списать расходники смены"}</span>
					</button>
				)}

				{activeTab === "packages" && (
					<button
						type="button"
						onClick={() => onPackageClick("anesthesia_package")}
						disabled={Boolean(submittingPackageId)}
						className="h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-[var(--primary)] text-white hover:brightness-110 active:scale-95 font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
						data-testid="btn-confirm-primary-package"
					>
						<PackageCheck size={15} />
						<span>{submittingPackageId ? "Списание..." : "✓ Списать выбранный пакет"}</span>
					</button>
				)}

				{activeTab === "procedure" && (
					<button
						type="button"
						onClick={onExecuteShiftWriteoff}
						disabled={isSubmitting}
						className="h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-[var(--primary)] text-white hover:brightness-110 active:scale-95 font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
						data-testid="btn-confirm-procedure-writeoff"
					>
						<PackageCheck size={15} />
						<span>{isSubmitting ? "Списание..." : "✓ Списать материалы приёма"}</span>
					</button>
				)}
			</div>
		</div>
	);
};
