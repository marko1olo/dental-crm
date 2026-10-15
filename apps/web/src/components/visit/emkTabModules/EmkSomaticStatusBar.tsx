import React from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { SOMATIC_QUICK_CHIPS, type SomaticQuickChip } from "@dental/shared";

export interface EmkSomaticStatusBarProps {
	isNormActive: boolean;
	handleOneClickNorm: () => void;
	currentAnamnesis: string;
	handleToggleSomaticChip: (chip: SomaticQuickChip) => void;
}

export function EmkSomaticStatusBar({
	isNormActive,
	handleOneClickNorm,
	currentAnamnesis,
	handleToggleSomaticChip,
}: EmkSomaticStatusBarProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="flex items-center gap-1.5 min-w-0">
				<ShieldCheck
					size={14}
					className={
						isNormActive
							? "text-emerald-600 dark:text-emerald-400 shrink-0"
							: "text-[var(--teal)] shrink-0"
					}
				/>
				<span className="text-xs font-bold text-[var(--ink)]">
					Соматический статус:
				</span>
				{isNormActive && (
					<span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
						(Норма)
					</span>
				)}
				<button
					type="button"
					onClick={handleOneClickNorm}
					className="sr-only"
					aria-hidden="true"
					tabIndex={-1}
					data-testid="btn-emk-somatic-norm-preset"
				>
					Норма
				</button>
			</div>

			<div
				className="flex flex-wrap items-center gap-1"
				role="group"
				aria-label="Быстрые отметки соматического анамнеза"
			>
				{SOMATIC_QUICK_CHIPS.slice(0, 5).map((chip) => {
					const isSelected = currentAnamnesis
						.toLowerCase()
						.includes(chip.label.toLowerCase());
					return (
						<button
							key={chip.id}
							type="button"
							onClick={() => handleToggleSomaticChip(chip)}
							className={`min-h-[26px] h-[26px] px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
								isSelected
									? chip.riskLevel === "critical"
										? "bg-rose-600 text-white border-rose-700 shadow-2xs"
										: "bg-amber-600 text-white border-amber-700 shadow-2xs"
									: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] text-[var(--ink)] border-[var(--line)] shadow-2xs"
							}`}
							data-testid={`emk-somatic-chip-${chip.id}`}
							title={chip.label}
						>
							{isSelected && <AlertCircle size={11} className="shrink-0" />}
							<span>{chip.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
