import type React from "react";
import { AlertTriangle } from "lucide-react";
import type { PlanItemCollision } from "../treatmentEstimatorPricing";

export interface EstimatorCollisionsAlertProps {
	readonly collisions?: readonly PlanItemCollision[] | undefined;
}

export const EstimatorCollisionsAlert: React.FC<EstimatorCollisionsAlertProps> = ({
	collisions,
}) => {
	if (!collisions || collisions.length === 0) return null;

	return (
		<div
			role="alert"
			className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-800"
			data-testid="plan-collisions-alert"
		>
			<AlertTriangle
				size={16}
				className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
				aria-hidden="true"
			/>
			<div className="flex-1 min-w-0 break-words">
				<div className="font-bold">
					Коллизии альтернативных планов лечения ({collisions.length}):
				</div>
				<ul className="mt-1 flex flex-col gap-1">
					{collisions.map((col) => (
						<li key={col.toothNumber}>{col.messageRu}</li>
					))}
				</ul>
			</div>
		</div>
	);
};
