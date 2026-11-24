import React from "react";
import type {
	ToothClinicalFinding,
	ToothSurfaceCode,
} from "./pediatricTeethTypes";
import { isPrimaryTooth, type ResorptionStagePercent } from "@dental/shared";

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
		<div className="mt-3 pt-2.5 border-t border-[var(--line)] flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between" data-testid="pediatric-active-tooth-toolbar">
			<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center min-w-0">
				<span className="text-[11px] font-semibold text-[var(--ink-muted)] shrink-0">Зуб {activeTooth}:</span>
				{onToothFindingChange && (
					<div className="flex flex-wrap items-center gap-1.5" data-testid="active-tooth-findings-group">
						{FINDINGS.map((st) => (
							<button
								key={st.id}
								type="button"
								onClick={() => onToothFindingChange(activeTooth, st.id)}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-medium transition cursor-pointer select-none touch-manipulation active:scale-95 flex items-center justify-center shrink-0 ${
									currentFinding === st.id
										? "bg-[var(--primary)] text-white shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
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
					<details className="group/surfaces relative rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-xs shrink-0" data-testid="pediatric-surfaces-disclosure">
						<summary className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] list-none">
							<span>Поверхности</span>
							<span className="text-[8px] text-[var(--ink-muted)] transition-transform group-open/surfaces:rotate-180">▼</span>
						</summary>
						<div className="flex flex-wrap items-center gap-1 pt-1.5 pb-0.5" data-testid="active-tooth-surfaces-group">
							{(["O", "V", "L", "M", "D"] as const).map((sf) => {
								const isSelected = (toothSurfaces?.[activeTooth] || []).includes(sf);
								return (
									<button
										key={sf}
										type="button"
										onClick={() => onSurfaceToggle(activeTooth, sf)}
										className={`min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 px-2 rounded-lg text-xs font-mono font-medium border cursor-pointer inline-flex items-center justify-center active:scale-95 transition-colors ${
											isSelected ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--paper-soft)] text-[var(--ink-muted)] border-[var(--line)] hover:bg-[var(--paper-strong)]"
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
						<span className="text-[11px] font-semibold text-[var(--ink-muted)] mr-0.5">Резорбция:</span>
						{([0, 25, 50, 75, 100] as const).map((r) => {
							const isCurrent = (resorptionStages?.[activeTooth] ?? 0) === r;
							return (
								<button
									key={r}
									type="button"
									onClick={() => onResorptionChange(activeTooth, r)}
									className={`min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 px-2 rounded-lg text-xs font-mono font-medium border cursor-pointer inline-flex items-center justify-center active:scale-95 transition-colors ${
										isCurrent ? "bg-[var(--danger)] text-white border-[var(--danger)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
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
