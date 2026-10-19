import type React from "react";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";

export interface Tooth16RootsProps {
	showGrooves?: boolean;
	showCej?: boolean;
	isDark?: boolean;
}

/**
 * DENTE Dental CRM — 3 Roots Component for Upper Molars 16 / 26
 * Trifurcation system: Palatal root (longest), MB root (curved), DB root (conical).
 * Compliant with Mandate 8b <= 120 lines.
 */
export const Tooth16Roots: React.FC<Tooth16RootsProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
}) => {
	const stroke = isDark
		? "rgba(148, 163, 184, 0.65)"
		: "rgba(71, 85, 105, 0.45)";
	const grooveStroke = isDark
		? "rgba(100, 116, 139, 0.40)"
		: "rgba(100, 116, 139, 0.25)";
	const cejStroke = isDark
		? "rgba(226, 232, 240, 0.65)"
		: "rgba(51, 65, 85, 0.50)";

	return (
		<g id="tooth16-roots-group">
			{/* Monolithic 3-root silhouette */}
			<path
				id="tooth16-root-monolith"
				d={TOOTH16_GEOMETRY.rootMonolithPath}
				fill="url(#dente16-root-body)"
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Palatal Root central columnar volume projection */}
			<path
				id="tooth16-palatal-root-body"
				d="M 43,68 C 45,46 47,24 50,8 C 53,24 55,46 57,68 Z"
				fill="url(#dente16-palatal-root)"
				opacity="0.9"
			/>

			{/* Trifurcation ambient occlusion crotch shadow */}
			<path
				id="tooth16-trifurcation-shadow"
				d={TOOTH16_GEOMETRY.trifurcationShadowPath}
				fill={isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(30, 41, 59, 0.55)"}
			/>

			{/* Developmental grooves & sulcus longitudinalis */}
			{showGrooves && (
				<g id="tooth16-root-grooves">
					<path
						d={TOOTH16_GEOMETRY.mbSulcusLongitudinalis}
						stroke={grooveStroke}
						strokeWidth="0.8"
						strokeDasharray="2,1.5"
						fill="none"
					/>
					<path
						d={TOOTH16_GEOMETRY.dbSulcusLongitudinalis}
						stroke={grooveStroke}
						strokeWidth="0.7"
						strokeDasharray="2,1.5"
						fill="none"
					/>
					<path
						d={TOOTH16_GEOMETRY.palatalRootCenter}
						stroke={grooveStroke}
						strokeWidth="0.6"
						fill="none"
					/>
				</g>
			)}

			{/* Cervical line (CEJ) */}
			{showCej && (
				<path
					id="tooth16-cej-line"
					d={TOOTH16_GEOMETRY.cejCurve}
					stroke={cejStroke}
					strokeWidth="0.9"
					strokeDasharray="none"
					fill="none"
				/>
			)}
		</g>
	);
};
