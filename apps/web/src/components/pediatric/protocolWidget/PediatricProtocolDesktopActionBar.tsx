import React from "react";
import { Award, Coins, FileText, Printer } from "lucide-react";
import type { PediatricServiceItem } from "./types";

export interface PediatricProtocolDesktopActionBarProps {
	readonly onInsertToClinicalNote?: () => void;
	readonly onAddServicesToInvoice: () => void;
	readonly onOpenMemoModal: () => void;
	readonly onOpenDiplomaModal: () => void;
	readonly servicesCount: number;
	readonly diagnosisIcd10: string;
	readonly primaryService?: PediatricServiceItem | undefined;
}

export const PediatricProtocolDesktopActionBar: React.FC<PediatricProtocolDesktopActionBarProps> = ({
	onInsertToClinicalNote,
	onAddServicesToInvoice,
	onOpenMemoModal,
	onOpenDiplomaModal,
	servicesCount,
	diagnosisIcd10,
	primaryService,
}) => {
	const handleApply = onInsertToClinicalNote || (() => {});

	return (
		<div className="hidden md:flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[var(--line)] min-w-0">
			<div className="flex flex-wrap items-center gap-2">
				{/* Ровно ОДНА Primary CTA кнопка (Мандат 8am): h-9 rounded-lg Desktop Standard, bg-[var(--primary)] */}
				<button
					type="button"
					onClick={handleApply}
					className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-3.5 text-sm font-medium text-white shadow-sm transition active:scale-95 cursor-pointer select-none"
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
					className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] px-3 text-sm font-medium text-[var(--ink)] transition active:scale-95 cursor-pointer select-none"
					data-testid="pediatric-btn-add-invoice"
					title="Добавить услуги протокола в смету"
				>
					<Coins className="h-4 w-4 text-[var(--primary)] shrink-0" />
					<span>В смету ({servicesCount})</span>
				</button>

				<button
					type="button"
					onClick={onOpenMemoModal}
					className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] px-3.5 text-sm font-medium text-[var(--ink)] transition active:scale-95 cursor-pointer select-none"
					data-testid="pediatric-btn-open-memo"
					title="Печать памятки родителям по уходу"
				>
					<Printer className="h-4 w-4 text-[var(--ink-muted)] shrink-0" />
					<span>Памятка родителям</span>
				</button>

				<button
					type="button"
					onClick={onOpenDiplomaModal}
					className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] px-3.5 text-sm font-medium text-[var(--ink)] transition active:scale-95 cursor-pointer select-none"
					data-testid="pediatric-btn-open-diploma"
					title="Печать диплома за храбрость маленькому пациенту"
				>
					<Award className="h-4 w-4 text-[var(--ink-muted)] shrink-0" />
					<span>Диплом за храбрость</span>
				</button>
			</div>

			<div className="text-right min-w-0">
				<div className="text-xs font-mono font-bold text-[var(--ink)] truncate">
					{diagnosisIcd10}
				</div>
				<div className="text-[11px] text-[var(--ink-muted)] truncate max-w-[260px]">
					{primaryService?.code} • {primaryService?.nameRu}
				</div>
			</div>
		</div>
	);
};
