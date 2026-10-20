/**
 * TrainingTourTargetBeacon.tsx
 *
 * Non-blocking Target Element Beacon Highlight and Directional Arrow.
 * Mandates 8d (7 Deadly Sins), 8e (Doctor Autonomy: pointerEvents none, zIndex 1049).
 */

import React from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type { QuestArrowDirection } from "./trainingTourTypes";

export interface TrainingTourTargetBeaconProps {
	readonly targetRect: DOMRect | null;
	readonly arrowDirection: QuestArrowDirection;
	readonly isActionSuccessFlash: boolean;
	readonly isActionNudge: boolean;
}

export function renderArrowIndicator(dir: QuestArrowDirection): React.ReactNode {
	switch (dir) {
		case "down":
			return <ArrowDown size={14} className="text-teal-500 animate-bounce" />;
		case "up":
			return <ArrowUp size={14} className="text-teal-500 animate-bounce" />;
		case "left":
			return <ArrowLeft size={14} className="text-teal-500 animate-pulse" />;
		case "right":
			return <ArrowRight size={14} className="text-teal-500 animate-pulse" />;
	}
}

export const TrainingTourTargetBeacon: React.FC<TrainingTourTargetBeaconProps> = React.memo(({
	targetRect,
	arrowDirection,
	isActionSuccessFlash,
	isActionNudge,
}) => {
	if (!targetRect) return null;

	return (
		<div
			data-testid="coach-mark-target-beacon"
			style={{
				position: "fixed",
				top: targetRect.top - 6,
				left: targetRect.left - 6,
				width: targetRect.width + 12,
				height: targetRect.height + 12,
				borderRadius: 12,
				border: isActionSuccessFlash
					? "3px solid var(--success, #10b981)"
					: isActionNudge
						? "3px solid var(--teal, #0d9488)"
						: "2.5px solid var(--teal, #0d9488)",
				boxShadow: isActionSuccessFlash
					? "0 0 24px rgba(16, 185, 129, 0.75)"
					: isActionNudge
						? "0 0 30px rgba(13, 148, 136, 0.9), 0 0 0 6px rgba(13, 148, 136, 0.3)"
						: "0 0 20px rgba(13, 148, 136, 0.5)",
				pointerEvents: "none",
				zIndex: 1049,
				transition: "all 0.2s ease-out",
			}}
			aria-hidden="true"
		>
			{/* Interactive Target Label Banner */}
			<div
				style={{
					position: "absolute",
					top: arrowDirection === "down" ? -28 : "auto",
					bottom: arrowDirection === "up" ? -28 : "auto",
					left: "50%",
					transform: "translateX(-50%)",
					background: "var(--teal, #0d9488)",
					color: "#ffffff",
					padding: "2px 8px",
					borderRadius: 6,
					fontSize: 10,
					fontWeight: 700,
					display: "flex",
					alignItems: "center",
					gap: 4,
					boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
					whiteSpace: "nowrap",
				}}
			>
				{renderArrowIndicator(arrowDirection)}
				<span>Кликните сюда</span>
			</div>
		</div>
	);
});

TrainingTourTargetBeacon.displayName = "TrainingTourTargetBeacon";
