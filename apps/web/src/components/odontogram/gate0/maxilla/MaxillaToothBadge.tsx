/**
 * DENTE Dental CRM — Maxilla Tooth Status Badge
 * Mounts canonical ToothStatusBadge SVG with Apple HIG touch target (Mandate 8b <= 120 lines).
 */

import type React from "react";
import { ToothStatusBadge } from "../ToothStatusBadge";
import type { Tooth46LayerFlags } from "../tooth46Types";
import { resolveToothStatusBadge } from "../ToothStatusBadgeResolver";

export interface MaxillaToothBadgeProps {
	readonly toothNumber: number;
	readonly layers?: Tooth46LayerFlags | undefined;
	readonly presetId?: string | undefined;
	readonly radius?: number | undefined;
	readonly onClick?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export const MaxillaToothBadge: React.FC<MaxillaToothBadgeProps> = ({
	toothNumber,
	layers,
	presetId,
	radius = 14,
	onClick,
	className = "",
}) => {
	const diameter = Math.round(radius * 2);
	const badge = resolveToothStatusBadge(presetId, layers, toothNumber);
	const isIntact = badge.code === "✓";

	return (
		<button
			type="button"
			onClick={onClick}
			data-testid={`maxilla-tooth-badge-${toothNumber}`}
			aria-label={`Статус верхнего зуба ${toothNumber}`}
			className={`relative inline-flex items-center justify-center p-0 rounded-full transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer shrink-0 touch-manipulation min-w-[32px] min-h-[32px] ${
				isIntact
					? "opacity-60 hover:opacity-100"
					: "opacity-100 shadow-sm"
			} ${className}`}
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
