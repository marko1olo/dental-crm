import React from "react";
import { Award, Check } from "lucide-react";
import type { ClinicalMarketMaterialItem } from "@dental/shared";

export interface MaterialCardItemProps {
	readonly mat: ClinicalMarketMaterialItem;
	readonly isSelected: boolean;
	readonly onSelectMaterial: (material: ClinicalMarketMaterialItem) => void;
}

export const MaterialCardItem: React.FC<MaterialCardItemProps> = ({
	mat,
	isSelected,
	onSelectMaterial,
}) => {
	const isLeader = mat.marketRank === 1 || mat.isMarketLeader;

	return (
		<button
			type="button"
			onClick={() => onSelectMaterial(mat)}
			className={`flex items-center justify-between p-2 sm:px-2.5 sm:py-2 rounded-lg border text-left transition-all cursor-pointer ${
				isSelected
					? "border-teal-500 bg-teal-500/10 shadow-xs"
					: isLeader
						? "border-teal-500/40 bg-teal-500/5 hover:bg-teal-500/10"
						: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
			}`}
		>
			<div className="flex-1 min-w-0 mr-2">
				<div className="flex items-center gap-1.5 mb-0.5">
					<span
						className={`text-[11.5px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 shrink-0 ${
							isLeader
								? "bg-teal-600 text-white"
								: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
						}`}
					>
						{isLeader && <Award size={11} />}
						{isLeader ? "№1" : `№${mat.marketRank}`}
					</span>
					<span className="text-[13px] font-semibold text-[var(--ink)] truncate">
						{mat.brandName}
					</span>
					<span className="text-[11.5px] text-[var(--muted)] truncate">
						({mat.manufacturer})
					</span>
				</div>
				<div className="text-[12px] text-[var(--muted)] truncate">
					{mat.nameRu}
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<span className="text-[11.5px] font-bold text-teal-600 dark:text-teal-400">
					{mat.tier === "premium" ? "премиум" : mat.tier === "mainstream" ? "мейнстрим" : "бюджетный"}
				</span>
				{isSelected && <Check size={16} className="text-teal-600 dark:text-teal-400" />}
			</div>
		</button>
	);
};
