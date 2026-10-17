import React from "react";
import { Check } from "lucide-react";
import {
	type FranklRating,
	FRANKL_RATINGS,
	FRANKL_SCALE_DEFINITIONS,
	getFranklVectorIcon,
} from "./franklTypes";

interface FranklRatingButtonsGridProps {
	readonly rating: FranklRating;
	readonly onChange?: ((rating: FranklRating) => void) | undefined;
}

export const FranklRatingButtonsGrid: React.FC<FranklRatingButtonsGridProps> = ({
	rating,
	onChange,
}) => {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
			{FRANKL_RATINGS.map((r) => {
				const def = FRANKL_SCALE_DEFINITIONS[r];
				const isSelected = rating === r;
				const RatingIcon = getFranklVectorIcon(r);
				return (
					<button
						key={r}
						type="button"
						onClick={() => onChange?.(r)}
						className={`min-h-[52px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none active:scale-[0.98] ${
							isSelected ? "ring-2 shadow-md scale-[1.02]" : "opacity-80 hover:opacity-100 hover:scale-[1.01] bg-[var(--paper,#ffffff)]"
						}`}
						style={{
							backgroundColor: isSelected ? def.badgeBg : undefined,
							borderColor: isSelected ? def.badgeColor : "var(--line,#e2e8f0)",
							color: isSelected ? def.badgeColor : "var(--ink,#0f172a)",
						}}
						title={def.descriptionRu}
						data-testid={`frankl-btn-${r}`}
					>
						<div className="flex items-center gap-1.5">
							<RatingIcon className="w-4 h-4 shrink-0" />
							<span className="font-mono font-black text-sm sm:text-base">{def.symbol}</span>
							{isSelected && <Check className="w-4 h-4 shrink-0" />}
						</div>
						<div className="text-xs font-bold mt-1 line-clamp-1">{def.labelRu}</div>
					</button>
				);
			})}
		</div>
	);
};
