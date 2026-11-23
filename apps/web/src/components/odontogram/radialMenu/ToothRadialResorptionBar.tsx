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
						<span className="text-[10px] font-bold text-[var(--primary)]">
							Резорбция корней:
						</span>
						<span className="text-[10px] text-[var(--muted)]">0–100%</span>
					</div>
					<div className="grid grid-cols-4 gap-1.5 w-full">
						<button
							type="button"
							onClick={() => { onSelectState(currentState ?? "Healthy", undefined, "resorption_1"); onClose(); }}
							className="min-h-[44px] px-2 py-1 rounded-lg text-[11px] font-semibold bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--primary-soft,var(--teal-soft))] hover:text-[var(--primary)] transition-all cursor-pointer border border-[var(--line)] text-center flex items-center justify-center shadow-2xs"
							title="Резорбция I степени (25%) — сохраняет диагноз коронки"
						>
							Рез I
						</button>
						<button
							type="button"
							onClick={() => { onSelectState(currentState ?? "Healthy", undefined, "resorption_2"); onClose(); }}
							className="min-h-[44px] px-2 py-1 rounded-lg text-[11px] font-semibold bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--primary-soft,var(--teal-soft))] hover:text-[var(--primary)] transition-all cursor-pointer border border-[var(--line)] text-center flex items-center justify-center shadow-2xs"
							title="Резорбция II степени (50%) — сохраняет диагноз коронки"
						>
							Рез II
						</button>
						<button
							type="button"
							onClick={() => { onSelectState(currentState ?? "Healthy", undefined, "resorption_3"); onClose(); }}
							className="min-h-[44px] px-2 py-1 rounded-lg text-[11px] font-semibold bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--primary-soft,var(--teal-soft))] hover:text-[var(--primary)] transition-all cursor-pointer border border-[var(--line)] text-center flex items-center justify-center shadow-2xs"
							title="Резорбция III степени (75%) — сохраняет диагноз коронки"
						>
							Рез III
						</button>
						<button
							type="button"
							onClick={() => { onSelectState("Missing", undefined, "exfoliation"); onClose(); }}
							className="min-h-[44px] px-2 py-1 rounded-lg text-[11px] font-semibold bg-[var(--danger-soft)] text-[var(--danger)] hover:opacity-90 transition-all cursor-pointer border border-[var(--danger-line,var(--line))] text-center flex items-center justify-center shadow-2xs"
							title="Смена зуба / Эксфолиация (100%) — физиологическое выпадение и прорезывание постоянного"
						>
							Смена
						</button>
					</div>
				</div>
			)}
			{showIropz && (
				<div className="flex items-center gap-1.5 bg-[var(--warning-soft)] text-[var(--warning-ink,var(--ink))] px-2.5 py-1.5 rounded-xl border border-[var(--warning-line,var(--line))] text-[10px] font-medium">
					<AlertTriangle size={13} className="text-[var(--warning)] shrink-0" />
					<span>ИРОПЗ &gt; 0.6: Рекомендована коронка (Z51.8)</span>
				</div>
			)}
		</>
	);
};
