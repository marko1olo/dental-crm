/**
 * apps/web/src/components/lab/studioModal/LabFdiTeethSelector.tsx
 *
 * DENTE Dental CRM — Dental Lab Studio FDI Teeth Picker.
 * Quick 2-jaw FDI tooth selection (upper & lower) with 0-scroll layout.
 * Mandate 8b modular design, Mandate 8e chairside doctor autonomy.
 */

import React from "react";

// Зубы FDI, разбитые по челюстям для отображения в 2 строки без скролла
export const UPPER_JAW_TEETH = [17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27];
export const LOWER_JAW_TEETH = [47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37];

export interface LabFdiTeethSelectorProps {
	readonly selectedTeeth: number[];
	readonly onToggleTooth: (tooth: number) => void;
}

export const LabFdiTeethSelector: React.FC<LabFdiTeethSelectorProps> = ({
	selectedTeeth,
	onToggleTooth,
}) => {
	return (
		<div className="shrink-0 space-y-1">
			<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink)]">
				<span>Зубы FDI:</span>
				<span className="text-[var(--teal)] font-bold">
					{selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "16 (дефолт)"}
				</span>
			</div>

			<div className="p-1 bg-[var(--paper)] rounded-xl border border-[var(--line)] space-y-1">
				{/* Верхняя челюсть */}
				<div className="grid grid-cols-14 gap-0.5">
					{UPPER_JAW_TEETH.map((tooth) => {
						const isSel = selectedTeeth.includes(tooth);
						return (
							<button
								key={tooth}
								type="button"
								data-testid={`tooth-chip-${tooth}`}
								onClick={() => onToggleTooth(tooth)}
								className={`h-7 rounded text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
									isSel
										? "bg-[var(--teal)] text-white shadow-xs"
										: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)]"
								}`}
							>
								{tooth}
							</button>
						);
					})}
				</div>
				{/* Нижняя челюсть */}
				<div className="grid grid-cols-14 gap-0.5">
					{LOWER_JAW_TEETH.map((tooth) => {
						const isSel = selectedTeeth.includes(tooth);
						return (
							<button
								key={tooth}
								type="button"
								data-testid={`tooth-chip-${tooth}`}
								onClick={() => onToggleTooth(tooth)}
								className={`h-7 rounded text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
									isSel
										? "bg-[var(--teal)] text-white shadow-xs"
										: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)]"
								}`}
							>
								{tooth}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default LabFdiTeethSelector;
