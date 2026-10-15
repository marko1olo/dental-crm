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
		<div className="anesthesia-quick-drugs-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" role="group" aria-label="Выбор местного анестетика">
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
						className={`anesthesia-quick-drug-chip flex items-center justify-between p-2.5 min-h-[44px] rounded-lg border text-left cursor-pointer transition-all shadow-2xs touch-manipulation active:scale-98 ${
							isSelected
								? "selected bg-[var(--teal-surface)] border-2 border-[var(--teal)] font-bold text-[var(--ink)] ring-1 ring-[var(--teal)]"
								: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] font-bold"
						} ${isAllergyRisky ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100" : isSulfiteRisky ? "opacity-85 border-amber-500/80" : ""}`}
						title={drug.subLabelRu}
					>
						<span className="text-xs leading-snug font-bold whitespace-normal">
							{drug.labelRu}
						</span>
						<div className="flex items-center gap-1 shrink-0 ml-1.5">
							{isAllergyRisky && (
								<span className="px-1.5 py-0.5 rounded text-[10px] font-black border border-rose-500 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 whitespace-nowrap">
									Аллергия!
								</span>
							)}
							{isCardioSuggested && (
								<span className="px-1.5 py-0.5 rounded text-[10px] font-black border border-emerald-600/40 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 whitespace-nowrap">
									ССЗ выбор
								</span>
							)}
							{isSulfiteRisky && !isAllergyRisky && (
								<span className="px-1.5 py-0.5 rounded text-[10px] font-black border border-amber-500/50 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 whitespace-nowrap">
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
