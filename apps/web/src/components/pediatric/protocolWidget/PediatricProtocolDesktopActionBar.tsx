import React from "react";
import { Award, Coins, FileText, Printer } from "lucide-react";
import type { PediatricServiceItem } from "./types";

export interface PediatricProtocolDesktopActionBarProps {
	readonly onInsertToClinicalNote?: () => void;
	/** @deprecated Использовать onInsertToClinicalNote */
	readonly onInsertToForm043?: () => void;
	readonly onAddServicesToInvoice: () => void;
	readonly onOpenMemoModal: () => void;
	readonly onOpenDiplomaModal: () => void;
	readonly servicesCount: number;
	readonly diagnosisIcd10: string;
	readonly primaryService?: PediatricServiceItem | undefined;
}

export const PediatricProtocolDesktopActionBar: React.FC<PediatricProtocolDesktopActionBarProps> = ({
	onInsertToClinicalNote,
	onInsertToForm043,
	onAddServicesToInvoice,
	onOpenMemoModal,
	onOpenDiplomaModal,
	servicesCount,
	diagnosisIcd10,
	primaryService,
}) => {
	const handleApply = onInsertToClinicalNote || onInsertToForm043 || (() => {});

	return (
		<div className="hidden md:flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[var(--line,#e2e8f0)] min-w-0">
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={handleApply}
					className="inline-flex min-h-[48px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-700 active:scale-95 cursor-pointer touch-manipulation"
					data-testid="pediatric-btn-apply-clinical-note"
					title="Внести протокол в медицинскую карту приёма"
					aria-label="Внести в дневник визита"
				>
					<FileText className="h-4 w-4 shrink-0" />
					<span>Внести в карту</span>
				</button>

				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="inline-flex min-h-[48px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs sm:text-sm font-extrabold text-teal-800 transition hover:bg-teal-100 active:scale-95 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 cursor-pointer touch-manipulation"
					data-testid="pediatric-btn-add-invoice"
				>
					<Coins className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<span>В смету ({servicesCount})</span>
				</button>

				<button
					type="button"
					onClick={onOpenMemoModal}
					className="inline-flex min-h-[48px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50/80 px-3.5 py-2 text-xs sm:text-sm font-extrabold text-purple-900 transition hover:bg-purple-100 active:scale-95 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/60 cursor-pointer touch-manipulation"
					data-testid="pediatric-btn-open-memo"
				>
					<Printer className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
					<span>Памятка родителям</span>
				</button>

				<button
					type="button"
					onClick={onOpenDiplomaModal}
					className="inline-flex min-h-[48px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs sm:text-sm font-extrabold text-amber-900 transition hover:bg-amber-100 active:scale-95 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/60 cursor-pointer touch-manipulation"
					data-testid="pediatric-btn-open-diploma"
				>
					<Award className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
					<span>Диплом за храбрость</span>
				</button>
			</div>

			<div className="text-right min-w-0">
				<div className="text-xs font-mono font-bold text-[var(--ink,#0f172a)] truncate">
					{diagnosisIcd10}
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)] truncate max-w-[260px]">
					{primaryService?.code} • {primaryService?.nameRu}
				</div>
			</div>
		</div>
	);
};
