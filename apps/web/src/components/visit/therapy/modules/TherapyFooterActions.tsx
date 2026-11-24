import type React from "react";
import { FileText, Coins } from "lucide-react";
import { BLACK_CAVITY_CLASS_LABELS, type BlackCavityClass } from "@dental/shared";

interface TherapyFooterActionsProps {
	onInsertToClinicalDiary: () => void;
	onAddServicesToInvoice: () => void;
	servicesCount: number;
	diagnosisIcd10: string;
	blackClass: BlackCavityClass;
}

export const TherapyFooterActions: React.FC<TherapyFooterActionsProps> = ({
	onInsertToClinicalDiary,
	onAddServicesToInvoice,
	servicesCount,
	diagnosisIcd10,
	blackClass,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[var(--line)]">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onInsertToClinicalDiary}
					className="inline-flex min-h-[44px] h-11 px-4 rounded-xl text-sm font-medium sm:min-h-0 sm:h-9 sm:px-3.5 sm:rounded-lg sm:text-sm items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-xs transition active:scale-[0.98] cursor-pointer touch-manipulation shrink-0"
					data-testid="therapy-btn-apply-diary"
				>
					<FileText className="h-4 w-4 shrink-0" />
					<span>Внести в дневник</span>
				</button>

				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="inline-flex min-h-[44px] h-11 px-4 rounded-xl text-sm font-medium sm:min-h-0 sm:h-9 sm:px-3.5 sm:rounded-lg sm:text-sm items-center justify-center gap-2 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition active:scale-[0.98] cursor-pointer touch-manipulation shrink-0"
					data-testid="therapy-btn-add-invoice"
				>
					<Coins className="h-4 w-4 shrink-0" />
					<span>В смету ({servicesCount})</span>
				</button>
			</div>

			<div className="text-right shrink-0 max-w-[340px]">
				<div className="text-xs font-mono font-bold text-[var(--ink)]">
					{diagnosisIcd10}
				</div>
				<div className="text-[11px] text-[var(--ink-muted)] whitespace-normal leading-tight">
					{BLACK_CAVITY_CLASS_LABELS[blackClass]}
				</div>
			</div>
		</div>
	);
};
