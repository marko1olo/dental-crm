import type React from "react";
import { Layers, PackageCheck, X, Zap } from "lucide-react";
import type { ShiftBatchMode } from "./types.js";

export interface ShiftBatchModalHeaderProps {
	readonly activeMode: ShiftBatchMode;
	readonly setActiveMode: (mode: ShiftBatchMode) => void;
	readonly onClose: () => void;
	readonly isBlocked: boolean;
}

export const ShiftBatchModalHeader: React.FC<ShiftBatchModalHeaderProps> = ({
	activeMode,
	setActiveMode,
	onClose,
	isBlocked,
}) => {
	return (
		<div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
					<PackageCheck className="w-5 h-5" />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h2 id="shift-deduction-title" className="text-base font-bold truncate">
							Списание расходников за смену
						</h2>
						<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-200 shrink-0">
							1 клик по нормам процедур • Мягкий овердрафт
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] truncate">
						Старшая медсестра / Врач • Списание без созыва комиссии в 1 клик
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)] select-none shrink-0">
					<button
						type="button"
						onClick={() => setActiveMode("shift")}
						className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
							activeMode === "shift"
								? "bg-teal-600 text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-mode-shift"
					>
						<PackageCheck className="w-3.5 h-3.5 shrink-0" />
						<span>За смену</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMode("packages")}
						className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
							activeMode === "packages"
								? "bg-teal-600 text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-mode-packages"
					>
						<Zap className="w-3.5 h-3.5 shrink-0" />
						<span>Клинические пакеты</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveMode("procedure")}
						className={`h-9 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
							activeMode === "procedure"
								? "bg-teal-600 text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-mode-procedure"
					>
						<Layers className="w-3.5 h-3.5 shrink-0" />
						<span>По процедуре</span>
					</button>
				</div>

				<button
					type="button"
					onClick={onClose}
					disabled={isBlocked}
					className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
					aria-label="Закрыть"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
};
