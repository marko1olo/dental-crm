import type React from "react";
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
}

export const ToothStatusBadge: React.FC<ToothStatusBadgeProps> = ({
	presetId,
	layers,
	cx = 50,
	cy = 160,
	r = 8.5,
}) => {
	const badge = resolveToothStatusBadge(presetId, layers);
	const len = badge.code.length;
	const fontSize = len === 1 ? r * 0.9 : len === 2 ? r * 0.74 : r * 0.58;
	const strokeWidth = Math.max(1.0, Number((r * 0.12).toFixed(1)));

	return (
		<g id="tooth46-status-badge" data-testid="tooth-status-badge" role="status">
			<title>{badge.title}</title>
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
				letterSpacing={len >= 3 ? "-0.04em" : undefined}
				fill={badge.text}
			>
				{badge.code}
			</text>
		</g>
	);
};
