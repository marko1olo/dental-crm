import React from "react";
import {
	PRIMARY_ANESTHETIC_DRUGS,
	type AnestheticDrugSelectorProps,
} from "./types";

export function AnestheticDrugSelector({
	selectedDrugId,
	onSelectDrug,
	isCardioRisk,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasLidocaineAllergy = false,
	hasArticaineAllergy = false,
	disabled = false,
}: AnestheticDrugSelectorProps) {
	return (
		<div className="anesthesia-quick-drugs-grid" role="group" aria-label="Выбор местного анестетика">
			{PRIMARY_ANESTHETIC_DRUGS.map((drug) => {
				const isSelected = selectedDrugId === drug.id;
				const isCardioSuggested = isCardioRisk && drug.isAdrenalineFree;
				const isSulfiteRisky = (hasSulfiteAllergy || hasBronchialAsthma) && !drug.isAdrenalineFree;
				const isLidocaineAllergic = hasLidocaineAllergy && drug.id.startsWith("lidocaine");
				const isArticaineAllergic = hasArticaineAllergy && (drug.id.startsWith("articaine") || drug.id.startsWith("septanest"));
				const isAllergyRisky = isLidocaineAllergic || isArticaineAllergic;

				return (
					<button
						key={drug.id}
						type="button"
						disabled={disabled}
						onClick={() => onSelectDrug(drug.id)}
						className={`anesthesia-quick-drug-chip ${isSelected ? "selected" : ""} ${isAllergyRisky ? "border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-100" : isSulfiteRisky ? "opacity-75 border-amber-400" : ""}`}
						title={drug.subLabelRu}
					>
						<span className="text-xs leading-snug font-bold whitespace-normal">
							{drug.labelRu}
						</span>
						<div className="flex items-center gap-1 shrink-0 ml-1.5">
							{isAllergyRisky && (
								<span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-600/20 text-rose-700 dark:text-rose-300 whitespace-nowrap">
									Аллергия!
								</span>
							)}
							{isCardioSuggested && (
								<span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
									ССЗ выбор
								</span>
							)}
							{isSulfiteRisky && !isAllergyRisky && (
								<span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 whitespace-nowrap">
									Сульфиты!
								</span>
							)}
						</div>
					</button>
				);
			})}
		</div>
	);
}
