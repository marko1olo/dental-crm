import type React from "react";
import { TOOTH11_GEOMETRY } from "./tooth11GeometryConstants";

export interface Tooth11RootProps {
	isDark?: boolean | undefined;
	showCej?: boolean | undefined;
	showGroove?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Maxillary Central Incisor (FDI 11) Root Component
 * Single massive conical root tapering to rounded apex, straight trajectory.
 * Wheeler's Dental Anatomy Ch. 8, Mandate 8b <= 120 lines.
 */
export const Tooth11Root: React.FC<Tooth11RootProps> = ({
	isDark = false,
	showCej = true,
	showGroove = true,
}) => {
	const g = TOOTH11_GEOMETRY;
	const stroke = isDark
		? "rgba(203, 213, 225, 0.65)"
		: "rgba(71, 85, 105, 0.40)";
	const cejStroke = isDark
		? "rgba(148, 163, 184, 0.70)"
		: "rgba(100, 116, 139, 0.55)";

	return (
		<g id="tooth11-root-group">
			<path
				id="tooth11-root-monolith"
				d={g.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
			/>
			{showGroove && (
				<path
					id="tooth11-root-groove"
					d={g.rootGroove}
					fill="none"
					stroke={isDark ? "rgba(100, 116, 139, 0.35)" : "rgba(148, 163, 184, 0.30)"}
					strokeWidth="0.7"
					strokeLinecap="round"
				/>
			)}
			{showCej && (
				<path
					id="tooth11-cej-curve"
					d={g.cejCurve}
					fill="none"
					stroke={cejStroke}
					strokeWidth="0.8"
					strokeLinecap="round"
				/>
			)}
		</g>
	);
};
