import type React from "react";
import { Frown, Meh, Smile, Sparkles } from "lucide-react";
import {
	type FranklRating,
	type FranklRatingDefinition,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
} from "../../odontogram/pediatricDentitionEngine";

export {
	type FranklRating,
	type FranklRatingDefinition,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
};

export interface FranklBehaviorBadgeProps {
	readonly rating?: FranklRating | undefined;
	readonly onChange?: ((rating: FranklRating) => void) | undefined;
	readonly onQuickSelect?: ((rating: FranklRating, note?: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly showStrategies?: boolean | undefined;
	readonly compact?: boolean | undefined;
	readonly toolbar?: boolean | undefined;
	readonly className?: string | undefined;
}

export const FRANKL_RATINGS: readonly FranklRating[] = [1, 2, 3, 4];

export function getFranklVectorIcon(
	rating: FranklRating,
): React.ComponentType<{ className?: string }> {
	switch (rating) {
		case 1:
			return Frown;
		case 2:
			return Meh;
		case 3:
			return Smile;
		case 4:
			return Sparkles;
		default:
			return Smile;
	}
}
