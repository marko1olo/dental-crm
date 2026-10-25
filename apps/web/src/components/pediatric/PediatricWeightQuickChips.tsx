import React, { useCallback } from "react";
import { Scale } from "lucide-react";

export interface PediatricWeightQuickChipsProps {
	readonly weightKg: number;
	readonly onWeightChange: (weight: number) => void;
	readonly patientAgeYears?: number | undefined;
	readonly className?: string | undefined;
}

export const PEDIATRIC_WEIGHT_PRESETS = [
	{ label: "12–15 кг", weight: 14 },
	{ label: "16–20 кг", weight: 18 },
	{ label: "21–25 кг", weight: 23 },
	{ label: "26–30 кг", weight: 28 },
] as const;

export const PediatricWeightQuickChips: React.FC<PediatricWeightQuickChipsProps> = ({
	weightKg,
	onWeightChange,
	patientAgeYears,
	className = "",
}) => {
	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const val = Number.parseFloat(e.target.value);
			if (!Number.isNaN(val) && val > 0) onWeightChange(val);
		},
		[onWeightChange],
	);

	return (
		<div className={`flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2.5 ${className}`.trim()}>
			<div className="flex items-center gap-2">
				<div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400 shrink-0">
					<Scale className="h-4 w-4" />
				</div>
				<div>
					<h4 className="text-xs sm:text-sm font-black text-[var(--ink,#0f172a)]">
						Вес ребенка: <span className="text-teal-600 dark:text-teal-400">{weightKg} кг</span>
						{typeof patientAgeYears === "number" && (
							<span className="text-[11px] font-normal text-[var(--muted,#64748b)] ml-1">({patientAgeYears} лет)</span>
						)}
					</h4>
					<p className="text-[10px] text-[var(--muted,#64748b)]">1-клик выбор весовой категории для дозировки</p>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-1.5">
				{PEDIATRIC_WEIGHT_PRESETS.map((preset) => {
					const isActive = Math.abs(weightKg - preset.weight) <= 2;
					return (
						<button
							key={preset.label}
							type="button"
							onClick={() => onWeightChange(preset.weight)}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 rounded-lg border text-xs font-bold transition cursor-pointer active:scale-95 ${
								isActive
									? "border-teal-500 bg-teal-500/15 text-teal-900 dark:text-teal-200 ring-1 ring-teal-500/30"
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)]"
							}`}
							data-testid={`btn-weight-preset-${preset.weight}`}
						>
							{preset.label}
						</button>
					);
				})}
				<div className="flex items-center gap-1 ml-1">
					<input
						id="pediatric-weight-input"
						type="number"
						min={5}
						max={100}
						value={weightKg}
						onChange={handleInputChange}
						className="min-h-[44px] sm:min-h-[32px] w-16 px-2 text-xs font-bold text-center rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] focus:outline-hidden focus:ring-1 focus:ring-teal-500"
						title="Точный вес ребенка в кг"
						data-testid="pediatric-weight-input"
					/>
					<span className="text-xs font-semibold text-[var(--muted,#64748b)]">кг</span>
				</div>
			</div>
		</div>
	);
};

export default PediatricWeightQuickChips;
