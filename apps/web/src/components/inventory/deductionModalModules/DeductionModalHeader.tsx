import { Package, X } from "lucide-react";
import React from "react";

export interface DeductionModalHeaderProps {
	readonly procedureTitle: string;
	readonly toothNumber?: number | undefined | null;
	readonly onClose: () => void;
}

export const DeductionModalHeader: React.FC<DeductionModalHeaderProps> = ({
	procedureTitle,
	toothNumber,
	onClose,
}) => (
	<div className="p-3.5 sm:p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-start justify-between gap-3 shrink-0">
		<div className="flex items-center gap-2.5 min-w-0">
			<div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
				<Package size={18} />
			</div>
			<div className="min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] leading-tight">
						Расходные материалы приёма
					</h3>
					<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
						Списание по протоколу
					</span>
				</div>
				<p className="text-xs text-[var(--muted)] mt-0.5 truncate">
					{procedureTitle}
					{toothNumber ? ` • Зуб ${toothNumber}` : ""}
				</p>
			</div>
		</div>
		<button
			type="button"
			onClick={onClose}
			className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
			aria-label="Закрыть"
			data-testid="btn-close-deduction-modal"
		>
			<X size={16} />
		</button>
	</div>
);
