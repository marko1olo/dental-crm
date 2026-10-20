import type React from "react";
import { TOOTH12_GEOMETRY } from "./tooth12GeometryConstants";

export interface Tooth12RootProps {
	isDark?: boolean | undefined;
	showCej?: boolean | undefined;
	showGroove?: boolean | undefined;
}

/**
 * DENTE Dental CRM — Maxillary Lateral Incisor (FDI 12) Root Component
 * Slender conical root with distal apical curve.
 * Wheeler's Dental Anatomy Ch. 8, Mandate 8b <= 120 lines.
 */
export const Tooth12Root: React.FC<Tooth12RootProps> = ({
	isDark = false,
	showCej = true,
	showGroove = true,
}) => {
	const g = TOOTH12_GEOMETRY;
	const stroke = isDark
		? "rgba(203, 213, 225, 0.65)"
		: "rgba(71, 85, 105, 0.40)";
	const cejStroke = isDark
		? "rgba(148, 163, 184, 0.70)"
		: "rgba(100, 116, 139, 0.55)";

	return (
		<g id="tooth12-root-group">
			<path
				id="tooth12-root-monolith"
				d={g.rootMonolithPath}
				fill="url(#dente-root-dentin)"
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
			/>
			{showGroove && (
				<path
					id="tooth12-root-groove"
					d={g.rootGroove}
					fill="none"
					stroke={isDark ? "rgba(100, 116, 139, 0.35)" : "rgba(148, 163, 184, 0.30)"}
					strokeWidth="0.65"
					strokeLinecap="round"
				/>
			)}
			{showCej && (
				<path
					id="tooth12-cej-curve"
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
