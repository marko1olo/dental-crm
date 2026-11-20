import React from "react";
import { ShieldCheck } from "lucide-react";
import { ToothDeciduous } from "../../icons/DentalIcons";
import type { PediatricDentitionMode } from "./pediatricTeethTypes";

interface PediatricTeethHeaderProps {
	readonly mode: PediatricDentitionMode;
	readonly onModeChange?: ((mode: PediatricDentitionMode) => void) | undefined;
	readonly onSetAllHealthy?: (() => void) | undefined;
	readonly onApplyMixedDentitionPreset?: (() => void) | undefined;
	readonly onApplyPhysiologicalResorption?: (() => void) | undefined;
}

export const PediatricTeethHeader: React.FC<PediatricTeethHeaderProps> = ({
	mode,
	onModeChange,
	onSetAllHealthy,
	onApplyMixedDentitionPreset,
	onApplyPhysiologicalResorption,
}) => {
	const isMixed = mode === "mixed";
	const isPermanent = mode === "permanent";

	return (
		<div className="mb-3 flex flex-col gap-2.5 border-b border-[var(--line)] pb-2.5">
			<div className="flex flex-wrap items-center justify-between gap-2 min-w-0 w-full">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-xs font-semibold text-[var(--ink-muted)]">
						Зубная формула (FDI):
					</span>
					<span className="rounded-md bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2 py-0.5 text-xs font-semibold font-mono text-[var(--primary)]">
						{isPermanent ? "Подростки (32)" : isMixed ? "Сменный (24)" : "Молочный (20)"}
					</span>
				</div>

				<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
					{onSetAllHealthy && (
						<button
							type="button"
							onClick={onSetAllHealthy}
							className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg border border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success-ink)] text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0 transition hover:opacity-90"
							data-testid="pediatric-all-healthy-btn"
						>
							<ShieldCheck className="h-3.5 w-3.5 text-[var(--success-ink)] shrink-0" />
							<span>Все интактны</span>
						</button>
					)}

					{onApplyPhysiologicalResorption && (
						<button
							type="button"
							onClick={onApplyPhysiologicalResorption}
							className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0 touch-manipulation select-none active:scale-95 transition"
							title="Физиологическая смена зубов по возрасту и резорбция корней (K08.8)"
							aria-label="Смена корней (K08.8)"
							data-testid="pediatric-resorption-norm-btn"
						>
							<ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
							<span>Смена корней</span>
						</button>
					)}

					{onApplyMixedDentitionPreset && (
						<button
							type="button"
							onClick={onApplyMixedDentitionPreset}
							className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0 transition"
							data-testid="pediatric-mixed-preset-btn"
						>
							<ToothDeciduous className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
							<span>Смена резцов</span>
						</button>
					)}
				</div>
			</div>

			<div className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar py-0.5">
				<div role="group" aria-label="Режим детского прикуса" className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-1 gap-1 shrink-0 w-full sm:w-auto" data-testid="pediatric-dentition-mode-toggle">
					<button
						type="button"
						onClick={() => onModeChange?.("primary")}
						className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg text-xs font-medium transition cursor-pointer touch-manipulation flex items-center justify-center whitespace-nowrap ${
							mode === "primary" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="btn-mode-primary"
						data-legacy-testid="mode-primary-btn"
					>
						Молочный (51–85)
					</button>
					<button
						type="button"
						onClick={() => onModeChange?.("mixed")}
						className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg text-xs font-medium transition cursor-pointer touch-manipulation flex items-center justify-center whitespace-nowrap ${
							mode === "mixed" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="btn-mode-mixed"
						data-legacy-testid="mode-mixed-btn"
					>
						Сменный (+ 16, 26, 36, 46)
					</button>
					<button
						type="button"
						onClick={() => onModeChange?.("permanent")}
						className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg text-xs font-medium transition cursor-pointer touch-manipulation flex items-center justify-center whitespace-nowrap ${
							mode === "permanent" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="mode-permanent-btn"
					>
						Подростки (11–48)
					</button>
				</div>
			</div>
		</div>
	);
};
