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
				{/* Ровно ОДНА Primary CTA кнопка (Мандат 8am): 36px на десктопе */}
				<button
					type="button"
					onClick={handleApply}
					className="inline-flex min-h-[44px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-700 active:scale-95 cursor-pointer touch-manipulation select-none"
					data-testid="pediatric-btn-apply-clinical-note"
					title="Внести протокол в медицинскую карту приёма"
					aria-label="Внести в дневник визита"
				>
					<FileText className="h-4 w-4 shrink-0 text-white" />
					<span>Внести в карту</span>
				</button>

				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="inline-flex min-h-[44px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] px-3 py-2 text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] transition active:scale-95 cursor-pointer touch-manipulation select-none"
					data-testid="pediatric-btn-add-invoice"
					title="Добавить услуги протокола в смету"
				>
					<Coins className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<span>В смету ({servicesCount})</span>
				</button>

				<button
					type="button"
					onClick={onOpenMemoModal}
					className="inline-flex min-h-[44px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] px-3.5 py-2 text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] transition active:scale-95 cursor-pointer touch-manipulation select-none"
					data-testid="pediatric-btn-open-memo"
					title="Печать памятки родителям по уходу"
				>
					<Printer className="h-4 w-4 text-[var(--muted,#64748b)] shrink-0" />
					<span>Памятка родителям</span>
				</button>

				<button
					type="button"
					onClick={onOpenDiplomaModal}
					className="inline-flex min-h-[44px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] px-3.5 py-2 text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] transition active:scale-95 cursor-pointer touch-manipulation select-none"
					data-testid="pediatric-btn-open-diploma"
					title="Печать диплома за храбрость маленькому пациенту"
				>
					<Award className="h-4 w-4 text-[var(--muted,#64748b)] shrink-0" />
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
