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
					className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-4 py-2.5 text-sm font-medium text-white shadow-xs transition active:scale-98 cursor-pointer touch-manipulation"
					data-testid="therapy-btn-apply-diary"
				>
					<FileText className="h-4 w-4 shrink-0" />
					<span>Внести в дневник</span>
				</button>

				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] px-3.5 py-2.5 text-sm font-medium transition active:scale-98 cursor-pointer touch-manipulation"
					data-testid="therapy-btn-add-invoice"
				>
					<Coins className="h-4 w-4 text-[var(--primary)] shrink-0" />
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
