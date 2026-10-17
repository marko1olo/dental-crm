import React from "react";
import type {
	ToothClinicalFinding,
	ToothSurfaceCode,
} from "./pediatricTeethTypes";
import type { ResorptionStagePercent } from "../../odontogram/pediatricDentitionEngine";
import { isPrimaryTooth } from "../../odontogram/pediatricDentitionEngine";

interface PediatricActiveToothToolbarProps {
	readonly activeTooth: number;
	readonly toothFindings: Readonly<Record<number, ToothClinicalFinding>>;
	readonly onToothFindingChange?: ((tooth: number, finding: ToothClinicalFinding) => void) | undefined;
	readonly toothSurfaces?: Readonly<Record<number, readonly ToothSurfaceCode[]>> | undefined;
	readonly onSurfaceToggle?: ((tooth: number, surface: ToothSurfaceCode) => void) | undefined;
	readonly resorptionStages?: Readonly<Record<number, ResorptionStagePercent>> | undefined;
	readonly onResorptionChange?: ((tooth: number, stage: ResorptionStagePercent) => void) | undefined;
}

const FINDINGS: readonly { id: ToothClinicalFinding; label: string }[] = [
	{ id: "Healthy", label: "Здоров" },
	{ id: "Caries", label: "Кариес" },
	{ id: "Filled", label: "Пломба" },
	{ id: "EndoTreated", label: "Пульпотомия" },
	{ id: "Watch", label: "Фтор" },
	{ id: "Crown", label: "Коронка" },
	{ id: "Extracted", label: "Удалён" },
];

export const PediatricActiveToothToolbar: React.FC<PediatricActiveToothToolbarProps> = ({
	activeTooth,
	toothFindings,
	onToothFindingChange,
	toothSurfaces,
	onSurfaceToggle,
	resorptionStages,
	onResorptionChange,
}) => {
	const currentFinding = toothFindings[activeTooth] ?? "Healthy";

	return (
		<div className="mt-3 pt-2.5 border-t border-[var(--line,#e2e8f0)] flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between" data-testid="pediatric-active-tooth-toolbar">
			<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center min-w-0">
				<span className="text-[11px] font-black uppercase text-[var(--muted,#64748b)] shrink-0">Зуб {activeTooth}:</span>
				{onToothFindingChange && (
					<div className="flex flex-wrap items-center gap-1.5" data-testid="active-tooth-findings-group">
						{FINDINGS.map((st) => (
							<button
								key={st.id}
								type="button"
								onClick={() => onToothFindingChange(activeTooth, st.id)}
								className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer select-none active:scale-95 flex items-center justify-center shrink-0 ${
									currentFinding === st.id
										? "bg-teal-600 text-white shadow-xs"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								data-testid={`active-tooth-finding-${st.id}`}
							>
								{st.label}
							</button>
						))}
					</div>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{onSurfaceToggle && (
					<details className="group/surfaces relative rounded-xl sm:rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] px-2.5 py-1 text-xs shrink-0" data-testid="pediatric-surfaces-disclosure">
						<summary className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] list-none">
							<span>Поверхности</span>
							<span className="text-[8px] text-[var(--muted,#64748b)] transition-transform group-open/surfaces:rotate-180">▼</span>
						</summary>
						<div className="flex flex-wrap items-center gap-1 pt-1.5 pb-0.5" data-testid="active-tooth-surfaces-group">
							{(["O", "V", "L", "M", "D"] as const).map((sf) => {
								const isSelected = (toothSurfaces?.[activeTooth] || []).includes(sf);
								return (
									<button
										key={sf}
										type="button"
										onClick={() => onSurfaceToggle(activeTooth, sf)}
										className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-5 px-2 rounded text-xs font-mono border cursor-pointer ${
											isSelected ? "bg-zinc-700 text-white" : "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"
										}`}
										data-testid={`active-tooth-surface-${sf}`}
									>
										{sf}
									</button>
								);
							})}
						</div>
					</details>
				)}

				{isPrimaryTooth(activeTooth) && onResorptionChange && (
					<div className="flex items-center gap-1 shrink-0" data-testid="active-tooth-resorption-group">
						<span className="text-[11px] font-black uppercase text-[var(--muted,#64748b)] mr-0.5">Резорбция:</span>
						{([0, 25, 50, 75, 100] as const).map((r) => {
							const isCurrent = (resorptionStages?.[activeTooth] ?? 0) === r;
							return (
								<button
									key={r}
									type="button"
									onClick={() => onResorptionChange(activeTooth, r)}
									className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-6 px-2 rounded-xl sm:rounded text-xs font-mono font-bold border cursor-pointer ${
										isCurrent ? "bg-rose-600 text-white border-rose-600 shadow-xs" : "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)]"
									}`}
									data-testid={`active-tooth-resorption-${r}`}
								>
									{r}%
								</button>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};
