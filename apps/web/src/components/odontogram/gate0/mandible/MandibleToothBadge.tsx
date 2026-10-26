/**
 * DENTE Dental CRM — Mandible Tooth Status Badge
 * Mounts canonical ToothStatusBadge SVG with Apple HIG touch target (Mandate 8b <= 120 lines).
 */

import React from "react";
import { ToothStatusBadge } from "../ToothStatusBadge";
import type { Tooth46LayerFlags } from "../tooth46Types";

export interface MandibleToothBadgeProps {
	readonly toothNumber: number;
	readonly layers?: Tooth46LayerFlags | undefined;
	readonly presetId?: string | undefined;
	readonly radius?: number | undefined;
	readonly onClick?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export const MandibleToothBadge: React.FC<MandibleToothBadgeProps> = ({
	toothNumber,
	layers,
	presetId,
	radius = 18.5,
	onClick,
	className = "",
}) => {
	const diameter = Math.round(radius * 2);

	return (
		<button
			type="button"
			onClick={onClick}
			data-testid={`mandible-tooth-badge-${toothNumber}`}
			aria-label={`Статус зуба ${toothNumber}`}
			className={`relative inline-flex items-center justify-center p-0 rounded-full transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer shrink-0 touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] ${className}`}
		>
			<svg
				width={diameter}
				height={diameter}
				viewBox={`0 0 ${diameter} ${diameter}`}
				className="overflow-visible select-none pointer-events-none"
			>
				<ToothStatusBadge
					cx={radius}
					cy={radius}
					r={radius}
					layers={layers}
					presetId={presetId}
					toothNumber={toothNumber}
				/>
			</svg>
		</button>
	);
};
