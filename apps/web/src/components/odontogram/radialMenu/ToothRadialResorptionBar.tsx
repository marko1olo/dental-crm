import { AlertTriangle } from "lucide-react";
import type React from "react";
import type { ToothState } from "../ToothChart";

export interface ToothRadialResorptionBarProps {
	readonly isPrimary: boolean;
	readonly iropz?: number | undefined;
	readonly currentState?: ToothState | undefined;
	readonly onSelectState: (state: ToothState, surfaces?: readonly string[], subType?: string) => void;
	readonly onClose: () => void;
}

export const ToothRadialResorptionBar: React.FC<ToothRadialResorptionBarProps> = ({
	isPrimary,
	iropz,
	currentState,
	onSelectState,
	onClose,
}) => {
	const showIropz = Boolean(iropz && iropz > 0.6) || currentState === "Pulpitis" || currentState === "Periodontitis";

	return (
		<>
			{isPrimary && (
				<div className="flex flex-col gap-1 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="flex items-center justify-between">
						<span className="text-[10px] uppercase font-black text-purple-600 dark:text-purple-400">
							Резорбция корней:
						</span>
						<span className="text-[10px] text-[var(--muted)]">0–100%</span>
					</div>
					<div className="grid grid-cols-4 gap-1.5 w-full">
						<button
							type="button"
							onClick={() => { onSelectState(currentState ?? "Healthy", undefined, "resorption_1"); onClose(); }}
							className="min-h-[36px] px-2 py-1 rounded-lg text-[11px] font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 text-center flex items-center justify-center shadow-xs"
							title="Резорбция I степени (25%) — сохраняет диагноз коронки"
						>
							Рез I
						</button>
						<button
							type="button"
							onClick={() => { onSelectState(currentState ?? "Healthy", undefined, "resorption_2"); onClose(); }}
							className="min-h-[36px] px-2 py-1 rounded-lg text-[11px] font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 text-center flex items-center justify-center shadow-xs"
							title="Резорбция II степени (50%) — сохраняет диагноз коронки"
						>
							Рез II
						</button>
						<button
							type="button"
							onClick={() => { onSelectState(currentState ?? "Healthy", undefined, "resorption_3"); onClose(); }}
							className="min-h-[36px] px-2 py-1 rounded-lg text-[11px] font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 text-center flex items-center justify-center shadow-xs"
							title="Резорбция III степени (75%) — сохраняет диагноз коронки"
						>
							Рез III
						</button>
						<button
							type="button"
							onClick={() => { onSelectState("Missing", undefined, "exfoliation"); onClose(); }}
							className="min-h-[36px] px-2 py-1 rounded-lg text-[11px] font-black bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30 text-center flex items-center justify-center shadow-xs"
							title="Смена зуба / Эксфолиация (100%) — физиологическое выпадение и прорезывание постоянного"
						>
							Смена
						</button>
					</div>
				</div>
			)}
			{showIropz && (
				<div className="flex items-center gap-1.5 bg-amber-500/15 text-amber-900 dark:text-amber-200 px-2 py-1 rounded-xl border border-amber-500/30 text-[10px] font-bold">
					<AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>ИРОПЗ &gt; 0.6: Рекомендована коронка (Z51.8)</span>
				</div>
			)}
		</>
	);
};
