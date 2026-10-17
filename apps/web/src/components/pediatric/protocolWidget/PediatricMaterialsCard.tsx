import React from "react";
import { Check } from "lucide-react";
import type { PediatricProtocolDefinition } from "./types";

interface PediatricMaterialsCardProps {
	readonly activePreset: PediatricProtocolDefinition;
	readonly selectedMaterial: string;
	readonly onSelectMaterial: (mat: string) => void;
}

export const PediatricMaterialsCard: React.FC<PediatricMaterialsCardProps> = ({
	activePreset,
	selectedMaterial,
	onSelectMaterial,
}) => {
	return (
		<div>
			<div className="mb-1.5 flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
					Препарат / Материал протокола:
				</span>
				<span className="text-xs font-semibold text-[var(--muted,#64748b)] truncate">
					{selectedMaterial}
				</span>
			</div>
			<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
				{activePreset.materials.map((mat) => {
					const isSelected = selectedMaterial === mat;
					return (
						<button
							key={mat}
							type="button"
							onClick={() => onSelectMaterial(mat)}
							className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-medium border text-left transition truncate cursor-pointer flex items-center justify-between gap-2 ${
								isSelected
									? "border-teal-600 bg-teal-50 font-bold text-teal-900 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-200 ring-1 ring-teal-500/20"
									: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
							}`}
							data-testid={`pediatric-material-btn-${mat.replace(/\s+/g, "_")}`}
						>
							<span className="truncate">{mat}</span>
							{isSelected && (
								<Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
};
