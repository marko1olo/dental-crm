/**
 * DENTE Dental CRM — 32-Tooth Mockup Status Circle Badge
 * Renders circular badge with dynamic font scaling & WCAG AAA contrast (Mandate 8b <= 120 lines).
 */

import React from "react";
import { resolveToothStatusBadge } from "../ToothStatusBadge";

export interface ArchToothBadgeProps {
	readonly presetId: string;
	readonly radius: number;
	readonly onClick?: () => void;
	readonly className?: string;
}

export const ArchToothBadge: React.FC<ArchToothBadgeProps> = ({
	presetId,
	radius,
	onClick,
	className = "",
}) => {
	const badge = resolveToothStatusBadge(presetId);
	const diameter = Math.round(radius * 2);
	const len = badge.code.length;
	// Proportional font sizing for crisp legibility inside circle
	const fontSize = len === 1 ? radius * 0.96 : len === 2 ? radius * 0.78 : radius * 0.60;
	const strokeWidth = Math.max(1.2, Number((radius * 0.11).toFixed(1)));

	return (
		<button
			type="button"
			onClick={onClick}
			title={`${badge.code}: ${badge.title}`}
			aria-label={`Статус: ${badge.code} (${badge.title})`}
			className={`inline-flex items-center justify-center p-0 rounded-full transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer shrink-0 ${className}`}
			style={{ width: `${diameter}px`, height: `${diameter}px` }}
		>
			<svg
				width={diameter}
				height={diameter}
				viewBox={`0 0 ${diameter} ${diameter}`}
				className="overflow-visible select-none pointer-events-none"
			>
				<circle
					cx={radius}
					cy={radius}
					r={radius - strokeWidth / 2}
					fill={badge.bg}
					stroke={badge.border}
					strokeWidth={strokeWidth}
				/>
				<text
					x={radius}
					y={radius + 0.5}
					textAnchor="middle"
					dominantBaseline="central"
					fontSize={fontSize}
					fontWeight="900"
					fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
					letterSpacing={len >= 3 ? "-0.04em" : undefined}
					fill={badge.text}
				>
					{badge.code}
				</text>
			</svg>
		</button>
	);
};
