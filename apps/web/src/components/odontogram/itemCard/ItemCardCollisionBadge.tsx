import type React from "react";
import { AlertTriangle } from "lucide-react";
import type { PlanItemCollision } from "../treatmentEstimatorPricing";

export interface ItemCardCollisionBadgeProps {
	readonly collision?: PlanItemCollision | null | undefined;
	readonly toothNumber?: number | undefined;
}

export const ItemCardCollisionBadge: React.FC<ItemCardCollisionBadgeProps> = ({
	collision,
	toothNumber,
}) => {
	if (!collision) return null;

	return (
		<div
			className="mt-1.5 flex items-center gap-1.5 p-2 rounded-md bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs font-semibold"
			data-testid={`card-collision-badge-${toothNumber}`}
		>
			<AlertTriangle size={13} className="text-amber-600 shrink-0" />
			<span className="truncate">{collision.messageRu}</span>
		</div>
	);
};
