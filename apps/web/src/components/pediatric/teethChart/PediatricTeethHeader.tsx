import React from "react";
import { ShieldCheck } from "lucide-react";
import { ToothDeciduous } from "../../icons/DentalIcons";
import type { PediatricDentitionMode } from "./pediatricTeethTypes";

interface PediatricTeethHeaderProps {
	readonly mode: PediatricDentitionMode;
	readonly onModeChange?: ((mode: PediatricDentitionMode) => void) | undefined;
	readonly onSetAllHealthy?: (() => void) | undefined;
	readonly onApplyMixedDentitionPreset?: (() => void) | undefined;
}

export const PediatricTeethHeader: React.FC<PediatricTeethHeaderProps> = ({
	mode,
	onModeChange,
	onSetAllHealthy,
	onApplyMixedDentitionPreset,
}) => {
	const isMixed = mode === "mixed";
	const isPermanent = mode === "permanent";

	return (
		<div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2.5">
			<div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)]">
					Зубная формула (FDI):
				</span>
				<span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-xs font-bold font-mono text-teal-700 dark:text-teal-300">
					{isPermanent ? "Подростки (32)" : isMixed ? "Сменный (24)" : "Молочный (20)"}
				</span>
			</div>

			<div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5">
				<div role="group" aria-label="Режим детского прикуса" className="inline-flex rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-0.5 gap-1 shrink-0" data-testid="pediatric-dentition-mode-toggle">
					<button
						type="button"
						onClick={() => onModeChange?.("primary")}
						className={`min-h-[44px] sm:min-h-[32px] sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
							mode === "primary" ? "bg-teal-600 text-white shadow-xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="btn-mode-primary"
						data-legacy-testid="mode-primary-btn"
					>
						Молочный (51–85)
					</button>
					<button
						type="button"
						onClick={() => onModeChange?.("mixed")}
						className={`min-h-[44px] sm:min-h-[32px] sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
							mode === "mixed" ? "bg-sky-600 text-white shadow-xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="btn-mode-mixed"
						data-legacy-testid="mode-mixed-btn"
					>
						Сменный (+ 16, 26, 36, 46)
					</button>
					<button
						type="button"
						onClick={() => onModeChange?.("permanent")}
						className={`min-h-[44px] sm:min-h-[32px] sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
							mode === "permanent" ? "bg-indigo-600 text-white shadow-xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid="mode-permanent-btn"
					>
						Подростки (11–48)
					</button>
				</div>

				{onSetAllHealthy && (
					<button type="button" onClick={onSetAllHealthy} className="min-h-[44px] sm:min-h-[32px] sm:h-7 px-2 rounded-lg border border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0" data-testid="pediatric-all-healthy-btn">
						<ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
						<span>Все интактны</span>
					</button>
				)}

				{onApplyMixedDentitionPreset && (
					<button type="button" onClick={onApplyMixedDentitionPreset} className="min-h-[44px] sm:min-h-[32px] sm:h-7 px-2 rounded-lg border border-sky-500/30 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0" data-testid="pediatric-mixed-preset-btn">
						<ToothDeciduous className="h-3.5 w-3.5 text-sky-600 shrink-0" />
						<span>Смена резцов</span>
					</button>
				)}
			</div>
		</div>
	);
};
