import React from "react";
import { Award, ChevronDown, ChevronUp, Sparkles, Zap } from "lucide-react";
import { ToothDeciduous } from "../../icons/DentalIcons";
import type { FranklExpressItem } from "./types";

export * from "./PediatricProtocolDesktopActionBar";

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
	const compactAnatomicalName = React.useMemo(() => {
		return anatomicalToothName
			.replace("Верхний правый ", "В/П ").replace("Верхний левый ", "В/Л ")
			.replace("Нижний левый ", "Н/Л ").replace("Нижний правый ", "Н/П ")
			.replace("первый постоянный моляр", "1-й моляр").replace("второй постоянный моляр", "2-й моляр")
			.replace("первый моляр", "1-й моляр").replace("второй моляр", "2-й моляр")
			.replace("центральный резец", "центр. резец").replace("боковой резец", "бок. резец");
	}, [anatomicalToothName]);

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
						<span className="sm:hidden">{compactAnatomicalName}</span>
						<span className="hidden sm:inline">{anatomicalToothName}</span>
					</h2>
				</div>
			</div>

			<div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar max-w-full py-0.5">
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

				<button
					type="button"
					onClick={onToggleDetailsAccordion}
					className="min-h-[48px] sm:min-h-0 sm:h-8 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] text-xs font-semibold transition flex items-center gap-1 cursor-pointer shrink-0 touch-manipulation"
					title="Показать / скрыть подробности протокола"
					data-testid="pediatric-details-accordion-btn"
				>
					<span className="hidden md:inline">Параметры</span>
					{showDetailsAccordion ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
				</button>
			</div>
		</div>
	);
};
