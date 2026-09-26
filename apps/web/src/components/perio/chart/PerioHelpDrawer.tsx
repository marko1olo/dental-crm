import { X, Zap } from "lucide-react";
import React from "react";

export interface PerioHelpDrawerProps {
	readonly isHelpOpen: boolean;
	readonly onCloseHelp: () => void;
}

export const PerioHelpDrawer: React.FC<PerioHelpDrawerProps> = React.memo(({
	isHelpOpen,
	onCloseHelp,
}) => {
	if (!isHelpOpen) return null;

	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-teal-500/30 text-xs text-[var(--ink)] flex flex-col gap-2.5 animate-in fade-in duration-150 shadow-xs">
			<div className="flex items-center justify-between font-bold text-teal-400 pb-1 border-b border-[var(--line)]/50">
				<span className="flex items-center gap-1.5">
					<Zap size={14} />
					Быстрый клавиатурный ввод зондирования:
				</span>
				<button
					type="button"
					onClick={onCloseHelp}
					className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer touch-manipulation"
					aria-label="Закрыть справку"
				>
					<X size={16} />
				</button>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
				<div>
					<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-teal-400 font-bold">
						1..9, 0
					</kbd>{" "}
					<span className="text-[var(--muted)]">
						— глубина кармана 1..10 мм + авто-переход
					</span>
				</div>
				<div>
					<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-teal-400 font-bold">
						Shift + 1 / 2
					</kbd>{" "}
					<span className="text-[var(--muted)]">
						— глубокие карманы 11 мм и 12 мм
					</span>
				</div>
				<div>
					<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-rose-400 font-bold">
						B / Пробел
					</kbd>{" "}
					<span className="text-[var(--muted)]">
						— вкл/выкл кровоточивость (BOP)
					</span>
				</div>
				<div>
					<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-emerald-400 font-bold">
						Shift + N
					</kbd>{" "}
					<span className="text-[var(--muted)]">
						— 1-клик «Пародонт интактен / норма»
					</span>
				</div>
				<div>
					<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-amber-400 font-bold">
						P
					</kbd>{" "}
					<span className="text-[var(--muted)]">
						— вкл/выкл зубной налет (Plaque)
					</span>
				</div>
				<div>
					<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-indigo-400 font-bold">
						S
					</kbd>{" "}
					<span className="text-[var(--muted)]">— нагноение (Suppuration)</span>
				</div>
				<div>
					<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-emerald-400 font-bold">
						M
					</kbd>{" "}
					<span className="text-[var(--muted)]">
						— подвижность по Miller (0..III ст.)
					</span>
				</div>
				<div>
					<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-emerald-400 font-bold">
						F
					</kbd>{" "}
					<span className="text-[var(--muted)]">
						— фуркация по Hamp (I..IV класс)
					</span>
				</div>
				<div>
					<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-[var(--ink)] font-bold">
						Стрелки / Tab / Enter
					</kbd>{" "}
					<span className="text-[var(--muted)]">— навигация по точкам</span>
				</div>
				<div>
					<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-[var(--ink)] font-bold">
						Esc
					</kbd>{" "}
					<span className="text-[var(--muted)]">— снять фокус с точки</span>
				</div>
			</div>
		</div>
	);
});

PerioHelpDrawer.displayName = "PerioHelpDrawer";
