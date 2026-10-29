import React from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import {
	PERIO_PATHOLOGY_PRESETS,
	type PerioPathologyPreset,
} from "../../../../lib/clinicalProtocols";

export interface PerioPillWithDropdownProps {
	readonly perioMenuRef: React.RefObject<HTMLDivElement | null>;
	readonly showPerioPathologyMenu: boolean;
	readonly setShowPerioPathologyMenu: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handleInsertPerioStatus: () => void;
	readonly handleApplyPerioPathology: (preset: PerioPathologyPreset) => void;
}

export const PerioPillWithDropdown: React.FC<PerioPillWithDropdownProps> = ({
	perioMenuRef,
	showPerioPathologyMenu,
	setShowPerioPathologyMenu,
	handleInsertPerioStatus,
	handleApplyPerioPathology,
}) => {
	return (
		<div
			className="relative inline-flex items-center rounded-lg bg-[var(--paper)] border border-[var(--line)] shadow-xs shrink-0"
			ref={perioMenuRef}
		>
			<button
				type="button"
				onClick={handleInsertPerioStatus}
				className="clinical-diary__btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors"
				title="Вставить физиологическую норму пародонта (десна бледно-розовая, плотная, карманов нет)"
				id="insert-perio-norm-btn"
				data-testid="insert-perio-norm-btn"
				data-legacy-testid="insert-perio-043-btn"
			>
				<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
				<span className="whitespace-nowrap">Пародонт в норме</span>
			</button>
			<button
				type="button"
				onClick={() => setShowPerioPathologyMenu((v) => !v)}
				className="clinical-diary__btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors"
				title="Выбрать протокол патологии пародонта (гингивит, пародонтит K05.3, абсцесс, рецессия)"
				data-testid="perio-pathology-menu-btn"
				aria-expanded={showPerioPathologyMenu}
			>
				<span className="whitespace-nowrap">Патология</span>
				<ChevronDown
					className={`w-3.5 h-3.5 transition-transform ${showPerioPathologyMenu ? "rotate-180" : ""}`}
				/>
			</button>

			{showPerioPathologyMenu && (
				<div
					className="absolute top-full left-0 mt-1.5 w-80 sm:w-96 rounded-xl bg-[var(--paper-strong,#0f172a)] border border-[var(--line-strong,#334155)] shadow-2xl z-[100] py-1.5 overflow-hidden backdrop-blur-xl"
					role="menu"
					aria-label="Пресеты патологий пародонта"
				>
					<div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[var(--line,#334155)] flex items-center justify-between">
						<span>Патологии пародонта (МКБ-10)</span>
						<span className="text-[10px] text-teal-400">В дневник</span>
					</div>
					<div className="max-h-80 overflow-y-auto py-1 divide-y divide-[var(--line-subtle,#1e293b)]">
						{PERIO_PATHOLOGY_PRESETS.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => handleApplyPerioPathology(preset)}
								className="w-full text-left px-3 py-2 hover:bg-rose-500/10 text-[var(--ink,#f8fafc)] hover:text-rose-200 transition-colors flex flex-col gap-0.5 group cursor-pointer"
								role="menuitem"
								data-testid={`perio-preset-${preset.id}`}
							>
								<div className="flex items-center justify-between gap-2">
									<span className="text-xs font-bold text-slate-100 group-hover:text-rose-300">
										{preset.label}
									</span>
									<span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shrink-0">
										{preset.badge}
									</span>
								</div>
								<p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
									{preset.statusLocalis}
								</p>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
