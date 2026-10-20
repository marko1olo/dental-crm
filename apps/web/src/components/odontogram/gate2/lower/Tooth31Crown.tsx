import type React from "react";
import { DENTE_SHADER_IDS } from "../../shared/defs/shaderConstants";
import { TOOTH31_GEOMETRY } from "./tooth31GeometryConstants";

export interface Tooth31CrownProps {
	showMamelons?: boolean | undefined;
	isWorn?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Tooth 31 / 41 Crown Component — Mandibular Central Incisor
 * Symmetrical chisel crown, 3 distinct mamelons, labial developmental grooves.
 * Wheeler's Dental Anatomy Ch. 9. Mandate 8b <= 120 lines.
 */
export const Tooth31Crown: React.FC<Tooth31CrownProps> = ({
	showMamelons = true,
	isWorn = false,
	isDark = false,
	className,
}) => {
	const s = DENTE_SHADER_IDS;
	const stroke = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.45)";
	const grooveStroke = isDark
		? "rgba(148, 163, 184, 0.35)"
		: "rgba(100, 116, 139, 0.28)";

	const activePath = isWorn
		? TOOTH31_GEOMETRY.crownWornFlatPath
		: TOOTH31_GEOMETRY.crownMonolithPath;

	return (
		<g id="tooth31-crown-group" className={className}>
			{/* Monolithic Enamel Crown Base */}
			<path
				id="tooth31-crown-base"
				d={activePath}
				fill={`url(#${s.enamelPorcelain})`}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Subtle Lingual Fossa Ambient Shading */}
			<path
				d={TOOTH31_GEOMETRY.lingualFossa}
				fill={`url(#${s.fossaShadow})`}
				opacity="0.30"
			/>

			{/* Subtle Lingual Cingulum */}
			<path
				d={TOOTH31_GEOMETRY.lingualCingulum}
				fill="rgba(255, 255, 255, 0.40)"
				stroke={grooveStroke}
				strokeWidth="0.5"
			/>

			{/* Labial Cervical Ridge Convexity */}
			<path
				d={TOOTH31_GEOMETRY.labialCervicalRidge}
				stroke={`url(#${s.cervicalRidge})`}
				strokeWidth="1.2"
				fill="none"
				opacity="0.75"
			/>

			{/* Labial Developmental Grooves */}
			<path
				d={TOOTH31_GEOMETRY.labialGrooveMesial}
				stroke={grooveStroke}
				strokeWidth="0.6"
				strokeDasharray="2,1.5"
				fill="none"
			/>
			<path
				d={TOOTH31_GEOMETRY.labialGrooveDistal}
				stroke={grooveStroke}
				strokeWidth="0.6"
				strokeDasharray="2,1.5"
				fill="none"
			/>

			{/* 3 Mamelon Edge Scallops (unworn teeth) */}
			{showMamelons && !isWorn && (
				<path
					id="tooth31-mamelons"
					d={TOOTH31_GEOMETRY.mamelonPath}
					stroke={stroke}
					strokeWidth="0.85"
					fill="none"
					strokeLinecap="round"
				/>
			)}
		</g>
	);
};
