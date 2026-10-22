import React from "react";
import { Check, ChevronDown, RotateCcw, ShieldCheck } from "lucide-react";
import { EndoFileCanal } from "../../icons/DentalIcons";

interface EndoSecondaryPresetsMenuProps {
	readonly isOpen: boolean;
	readonly setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onApplyPrimaryEndo: () => void;
	readonly onApplyRetreatment: () => void;
	readonly onApplyObturation: () => void;
	readonly onApplyPulpitisObturation: () => void;
	readonly onApplyPeriodontitisDestructive: () => void;
	readonly onApplyStandardProtocol: () => void;
	readonly onResetToDefaults: () => void;
}

export const EndoSecondaryPresetsMenu: React.FC<EndoSecondaryPresetsMenuProps> = ({
	isOpen,
	setIsOpen,
	onApplyPrimaryEndo,
	onApplyRetreatment,
	onApplyObturation,
	onApplyPulpitisObturation,
	onApplyPeriodontitisDestructive,
	onApplyStandardProtocol,
	onResetToDefaults,
}) => {
	const items = [
		{ testId: "btn-endo-preset-primary", fn: onApplyPrimaryEndo, Icon: EndoFileCanal, color: "text-rose-500", label: "Первичное эндо (ProTaper + Metapex)" },
		{ testId: "btn-endo-preset-retreatment", fn: onApplyRetreatment, Icon: RotateCcw, color: "text-amber-500", label: "Повторное эндо (D-RaCe + ревизия)" },
		{ testId: "btn-endo-preset-obturation", fn: onApplyObturation, Icon: Check, color: "text-emerald-500", label: "Постоянная обтурация (GuttaCore / AH Plus)" },
		{ testId: "btn-endo-preset-pulpitis-obturation", fn: onApplyPulpitisObturation, Icon: Check, color: "text-slate-500", label: "Пульпит 2 эт. (AH Plus)" },
		{ testId: "btn-endo-preset-periodontitis-destructive", fn: onApplyPeriodontitisDestructive, Icon: ShieldCheck, color: "text-purple-500", label: "Периодонтит (Metapex 14 дн)" },
		{ testId: "btn-standard-endo-protocol", fn: onApplyStandardProtocol, Icon: EndoFileCanal, color: "text-indigo-500", label: "Стандарт (AH Plus)" },
	];

	return (
		<div className="relative shrink-0">
			<button
				type="button"
				onClick={() => setIsOpen((v) => !v)}
				className="secondary-button h-6 sm:h-7 px-1.5 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-600 border border-[var(--line,#cbd5e1)] dark:border-slate-600 flex items-center gap-1 transition-all cursor-pointer shrink-0"
				title="Другие протоколы эндодонтии (Первичное, Повторное D-RaCe, Периодонтит деструктивный...)"
			>
				<span className="text-[11px]">Другие</span>
				<ChevronDown size={12} />
			</button>

			{isOpen && (
				<div
					className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-xl shadow-xl p-1.5 space-y-1 text-xs"
					role="menu"
				>
					{items.map((it) => (
						<button
							key={it.testId}
							type="button"
							data-testid={it.testId}
							onClick={() => {
								it.fn();
								setIsOpen(false);
							}}
							className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
						>
							<it.Icon size={14} className={`${it.color} shrink-0`} />
							<span className="truncate">{it.label}</span>
						</button>
					))}
					<div className="border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 my-1" />
					<button
						type="button"
						onClick={() => {
							onResetToDefaults();
							setIsOpen(false);
						}}
						className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--muted,#64748b)] dark:text-slate-400 font-medium flex items-center gap-2 cursor-pointer"
					>
						<RotateCcw size={14} className="shrink-0" />
						<span>Сброс к анатомическому стандарту</span>
					</button>
				</div>
			)}
		</div>
	);
};
