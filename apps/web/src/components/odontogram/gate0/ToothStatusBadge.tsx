import React from "react";
import { getStatusBadge, TOOTH_STATUS_MATRIX, type ToothStatusBadgeInfo } from "./ToothStatusBadgeMatrix";
import type { Tooth46LayerFlags } from "./tooth46Types";
import { resolveToothStatusBadge } from "./ToothStatusBadgeResolver";

export type { ToothStatusBadgeInfo };
export { TOOTH_STATUS_MATRIX, getStatusBadge, resolveToothStatusBadge };

export interface ToothStatusBadgeProps {
	presetId?: string | undefined;
	layers?: Tooth46LayerFlags | undefined;
	cx?: number | undefined;
	cy?: number | undefined;
	r?: number | undefined;
	toothNumber?: number | undefined;
	isDark?: boolean | undefined;
}

export const ToothStatusBadge: React.FC<ToothStatusBadgeProps> = ({
	presetId,
	layers,
	cx = 50,
	cy: cyProp,
	r = 8.5,
	toothNumber,
}) => {
	const badge = resolveToothStatusBadge(presetId, layers, toothNumber);
	const textContent = (badge.code === "✓" && toothNumber) ? String(toothNumber) : badge.code;
	const isHealthy = badge.code === "✓";
	const cy = cyProp ?? (r > 14 ? 194.5 : (r > 10 ? 176.0 : 160));
	const len = textContent.length;
	const fontSize =
		len === 1
			? r * 0.96
			: len === 2
				? r * 0.82
				: len === 3
					? r * 0.64
					: len === 4
						? r * 0.48
						: r * 0.40;
	const strokeWidth = Math.max(1.0, Number((r * 0.12).toFixed(1)));
	const letterSpacing = len >= 5 ? "-0.06em" : len >= 4 ? "-0.04em" : len >= 3 ? "-0.03em" : undefined;

	return (
		<g
			id={toothNumber ? `tooth-${toothNumber}-status-badge` : undefined}
			data-testid="tooth-status-badge"
			data-tooth-number={toothNumber}
			role="status"
			shapeRendering="geometricPrecision"
			opacity={isHealthy ? 0.6 : 1.0}
			className={isHealthy ? "opacity-60 transition-opacity duration-150" : "opacity-100 transition-opacity duration-150"}
		>
			<title>{toothNumber ? `${badge.title} (Зуб ${toothNumber})` : badge.title}</title>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill={badge.bg}
				stroke={badge.border}
				strokeWidth={strokeWidth}
			/>
			<text
				x={cx}
				y={cy + 0.3}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={fontSize}
				fontWeight="900"
				fontFamily="system-ui, -apple-system, sans-serif"
				letterSpacing={letterSpacing}
				fill={badge.text}
				textRendering="geometricPrecision"
			>
				{textContent}
			</text>
		</g>
	);
};
