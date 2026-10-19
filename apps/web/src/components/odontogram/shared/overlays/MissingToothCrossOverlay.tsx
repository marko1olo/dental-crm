import type React from "react";
import type { MissingToothCrossProps } from "../types/missingToothTypes";

/**
 * Universal Surgical Extraction / Missing Tooth Overlay.
 * Renders clinical red extraction cross (X) and faint phantom ghost root contour.
 * Mandate 8b <= 120 lines.
 */
export const MissingToothCrossOverlay: React.FC<MissingToothCrossProps> = ({
	crossLine1,
	crossLine2,
	ghostRootPath,
	bounds,
	strokeWidth = 2.5,
	color = "#ef4444",
	className,
}) => {
	// Derive diagonal cross lines from bounds if explicit paths omitted
	const d1 =
		crossLine1 ??
		(bounds
			? `M ${bounds.x + 8},${bounds.y + 12} L ${bounds.x + bounds.width - 8},${bounds.y + bounds.height - 12}`
			: "M 15,20 L 85,140");

	const d2 =
		crossLine2 ??
		(bounds
			? `M ${bounds.x + bounds.width - 8},${bounds.y + 12} L ${bounds.x + 8},${bounds.y + bounds.height - 12}`
			: "M 85,20 L 15,140");

	return (
		<g
			id="dente-missing-tooth-cross"
			data-missing-tooth="true"
			className={className}
		>
			{/* Phantom Ghost Root Outline */}
			{ghostRootPath && (
				<path
					d={ghostRootPath}
					fill="none"
					stroke="rgba(148, 163, 184, 0.40)"
					strokeWidth="1.0"
					strokeDasharray="3 3"
					opacity="0.25"
				/>
			)}

			{/* Surgical Red Extraction Cross */}
			<path
				d={d1}
				fill="none"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
			<path
				d={d2}
				fill="none"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</g>
	);
};
