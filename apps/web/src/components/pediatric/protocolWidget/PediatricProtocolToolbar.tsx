import React from "react";
import {
	Award,
	ChevronDown,
	ChevronUp,
	Coins,
	FileText,
	Printer,
	Sparkles,
	Zap,
} from "lucide-react";
import { ToothDeciduous } from "../../icons/DentalIcons";
import type { FranklExpressItem, PediatricServiceItem } from "./types";

export interface PediatricProtocolTopBarProps {
	readonly currentTooth: number;
	readonly anatomicalToothName: string;
	readonly activeFrankl: FranklExpressItem;
	readonly showDetailsAccordion: boolean;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly onApplyAdaptationVisit: () => void;
	readonly onOpenDiplomaModal: () => void;
	readonly onCycleFrankl: () => void;
	readonly onToggleDetailsAccordion: () => void;
}

export const PediatricProtocolTopBar: React.FC<PediatricProtocolTopBarProps> = ({
	currentTooth,
	anatomicalToothName,
	activeFrankl,
	showDetailsAccordion,
	onApplyPhysiologicalNorm,
	onApplyAdaptationVisit,
	onOpenDiplomaModal,
	onCycleFrankl,
	onToggleDetailsAccordion,
}) => {
	return (
		<div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2.5 min-h-[36px]">
			<div className="flex items-center gap-2 min-w-0">
				<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
					<ToothDeciduous className="h-4 w-4" />
				</div>
				<div className="flex items-center gap-1.5 min-w-0">
					<span className="text-[11px] font-black uppercase tracking-wider text-[var(--muted,#64748b)] hidden sm:inline shrink-0">
						Детский приём у кресла:
					</span>
					<span className="inline-flex items-center gap-1 rounded-md bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-xs font-mono font-bold text-teal-700 dark:text-teal-300 shrink-0">
						Зуб {currentTooth}
					</span>
					<h2 className="text-xs sm:text-base font-extrabold text-[var(--ink,#0f172a)] truncate">
						{anatomicalToothName}
					</h2>
				</div>
			</div>

			<div className="flex items-center gap-1.5 shrink-0">
				{/* 1-Клик физиологическая норма временного прикуса (Мандат 8e) */}
				<button
					type="button"
					onClick={onApplyPhysiologicalNorm}
					className="min-h-[48px] sm:min-h-0 sm:h-8 px-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0 touch-manipulation"
					title="Временный прикус интактен / физиологическая стираемость / тремы и диастемы"
					data-testid="pediatric-one-click-norm-btn"
				>
					<Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span className="hidden sm:inline">Норма прикуса</span>
					<span className="sm:hidden">Норма</span>
				</button>

				{/* Адаптационный визит без сверления */}
				<button
					type="button"
					onClick={onApplyAdaptationVisit}
					className="min-h-[48px] sm:min-h-0 sm:h-8 px-2.5 rounded-lg border border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-200 hover:bg-sky-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0 touch-manipulation"
					title="Адаптационный визит без сверления (Tell-Show-Do, игра, подарок)"
					data-testid="pediatric-one-click-adaptation-btn"
				>
					<Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
					<span className="hidden sm:inline">Адаптация</span>
					<span className="sm:hidden">Адаптация</span>
				</button>

				{/* Диплом за храбрость (печать грамоты маленькому пациенту) */}
				<button
					type="button"
					onClick={onOpenDiplomaModal}
					className="min-h-[48px] sm:min-h-0 sm:h-8 px-2.5 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0 touch-manipulation"
					title="Диплом за храбрость маленькому пациенту (печать грамоты)"
					data-testid="pediatric-toolbar-diploma-btn"
				>
					<Award className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
					<span className="hidden sm:inline">Диплом за храбрость</span>
					<span className="sm:hidden">Диплом</span>
				</button>

				{/* Индикатор выбранного поведения по Франклу (1-клик смена) */}
				<button
					type="button"
					onClick={onCycleFrankl}
					className={`inline-flex min-h-[48px] sm:min-h-0 sm:h-8 items-center gap-1 rounded-lg border px-2 text-xs font-bold ${activeFrankl.badgeClass} shrink-0 cursor-pointer transition active:scale-95`}
					title={`Шкала Франкла: ${activeFrankl.titleRu}. Нажмите для быстрой смены`}
					data-testid="frankl-status-indicator"
				>
					<activeFrankl.icon className="h-3.5 w-3.5 shrink-0" />
					<span className="font-mono">Франкл {activeFrankl.symbol}</span>
				</button>

				{/* Кнопка спойлера расширенных параметров */}
				<button
					type="button"
					onClick={onToggleDetailsAccordion}
					className="min-h-[48px] sm:min-h-0 sm:h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] text-xs font-semibold transition flex items-center gap-1 cursor-pointer shrink-0 touch-manipulation"
					title="Показать / скрыть подробности протокола"
					data-testid="pediatric-details-accordion-btn"
				>
					<span className="hidden md:inline">Параметры</span>
					{showDetailsAccordion ? (
						<ChevronUp className="h-3.5 w-3.5" />
					) : (
						<ChevronDown className="h-3.5 w-3.5" />
					)}
				</button>
			</div>
		</div>
	);
};

export interface PediatricProtocolDesktopActionBarProps {
	readonly onInsertToForm043: () => void;
	readonly onAddServicesToInvoice: () => void;
	readonly onOpenMemoModal: () => void;
	readonly onOpenDiplomaModal: () => void;
	readonly servicesCount: number;
	readonly diagnosisIcd10: string;
	readonly primaryService?: PediatricServiceItem | undefined;
}

export const PediatricProtocolDesktopActionBar: React.FC<
	PediatricProtocolDesktopActionBarProps
> = ({
	onInsertToForm043,
	onAddServicesToInvoice,
	onOpenMemoModal,
	onOpenDiplomaModal,
	servicesCount,
	diagnosisIcd10,
	primaryService,
}) => {
	return (
		<div className="hidden md:flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[var(--line,#e2e8f0)] min-w-0">
			<div className="flex flex-wrap items-center gap-2">
				{/* Кнопка 1-клик в карту */}
				<button
					type="button"
					onClick={onInsertToForm043}
					className="inline-flex min-h-[48px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-700 active:scale-95 cursor-pointer touch-manipulation"
					data-testid="pediatric-btn-apply-043"
					title="Внести протокол в медицинскую карту (043/у)"
					aria-label="Внести в 043/у"
				>
					<FileText className="h-4 w-4 shrink-0" />
					<span>Внести в карту</span>
				</button>

				{/* Кнопка 1-клик в смету */}
				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="inline-flex min-h-[48px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs sm:text-sm font-extrabold text-teal-800 transition hover:bg-teal-100 active:scale-95 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 cursor-pointer touch-manipulation"
					data-testid="pediatric-btn-add-invoice"
				>
					<Coins className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<span>В смету ({servicesCount})</span>
				</button>

				{/* Кнопка «Памятка родителям после приёма» */}
				<button
					type="button"
					onClick={onOpenMemoModal}
					className="inline-flex min-h-[48px] sm:min-h-0 sm:h-9 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50/80 px-3.5 py-2 text-xs sm:text-sm font-extrabold text-purple-900 transition hover:bg-purple-100 active:scale-95 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/60 cursor-pointer touch-manipulation"
					data-testid="pediatric-btn-open-memo"
				>
					<Printer className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
					<span>Памятка родителям</span>
				</button>

				{/* Кнопка «Диплом за храбрость» */}
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
