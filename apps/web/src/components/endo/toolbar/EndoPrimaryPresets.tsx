import React from "react";
import { Check, RotateCcw, ShieldCheck } from "lucide-react";
import { EndoFileCanal } from "../../icons/DentalIcons";

interface EndoPrimaryPresetsProps {
	readonly onApplyExpressApical: () => void;
	readonly onApplyCaOh2: () => void;
	readonly onApplyRetreatment: () => void;
	readonly onApplyPulpitis: () => void;
}

export const EndoPrimaryPresets: React.FC<EndoPrimaryPresetsProps> = ({
	onApplyExpressApical,
	onApplyCaOh2,
	onApplyRetreatment,
	onApplyPulpitis,
}) => (
	<>
		<div className="hidden xl:flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 shrink-0 mr-0.5">
			<EndoFileCanal size={14} className="shrink-0" />
			<span>Протоколы:</span>
		</div>

		{/* Preset 1: Каналы пройдены и обтурированы до апекса (ProTaper + AH Plus) */}
		<button
			type="button"
			data-testid="btn-express-apical-endo-protocol"
			onClick={onApplyExpressApical}
			className="secondary-button h-6 sm:h-7 px-2 rounded-lg text-xs font-bold border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-98"
			title="Экспресс-пресет: ProTaper Gold + AH Plus гуттаперча латерально до апекса (Apex 0.0)"
		>
			<Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
			<span className="truncate">Обтурированы (AH Plus)</span>
		</button>

		{/* Preset 2: Временная пломбировка Ca(OH)2 */}
		<button
			type="button"
			data-testid="btn-caoh2-endo-protocol"
			onClick={onApplyCaOh2}
			className="secondary-button h-6 sm:h-7 px-2 rounded-lg text-xs font-bold border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-98"
			title="Механическая и медикаментозная обработка NaOCl 3% + временная паста Ca(OH)2 (Каласепт)"
		>
			<ShieldCheck size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
			<span className="truncate">Временная Ca(OH)2</span>
		</button>

		{/* Preset 3: Распломбировка ранее леченых каналов (резорцин-формалин / фосфат-цемент) */}
		<button
			type="button"
			data-testid="btn-retreatment-resorcin-protocol"
			onClick={onApplyRetreatment}
			className="secondary-button h-6 sm:h-7 px-2 rounded-lg text-xs font-bold border border-purple-500/40 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-98"
			title="Распломбировка ранее леченых каналов (резорцин-формалин / фосфат-цемент) + паста Каласепт под повязку"
		>
			<RotateCcw size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
			<span className="truncate">Распломбировка (резорцин/цемент)</span>
		</button>

		{/* Preset 4: Эндодонтия пульпита в 1 визит */}
		<button
			type="button"
			data-testid="btn-endo-preset-pulpitis-complete"
			onClick={onApplyPulpitis}
			className="secondary-button h-6 sm:h-7 px-2 rounded-lg text-xs font-bold border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-98"
			title="Эндодонтия пульпита в 1 визит (ProTaper F2 + AH Plus)"
		>
			<Check size={13} className="text-rose-500 shrink-0" />
			<span className="truncate">Пульпит 1 визит</span>
		</button>
	</>
);
