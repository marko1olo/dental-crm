import type React from "react";
import { DENTE_SHADER_IDS } from "../../shared/defs/shaderConstants";
import { TOOTH32_GEOMETRY } from "./tooth32GeometryConstants";

export interface Tooth32CrownProps {
	showMamelons?: boolean | undefined;
	isWorn?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Tooth 32 / 42 Crown Component — Mandibular Lateral Incisor
 * Wider crown, distoincisal cervical slope, rounded distoincisal angle, distal twist.
 * Wheeler's Dental Anatomy Ch. 9. Mandate 8b <= 120 lines.
 */
export const Tooth32Crown: React.FC<Tooth32CrownProps> = ({
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
		? TOOTH32_GEOMETRY.crownWornFlatPath
		: TOOTH32_GEOMETRY.crownMonolithPath;

	return (
		<g id="tooth32-crown-group" className={className}>
			{/* Monolithic Enamel Crown Base */}
			<path
				id="tooth32-crown-base"
				d={activePath}
				fill={`url(#${s.enamelPorcelain})`}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Lingual Fossa Ambient Shading */}
			<path
				d={TOOTH32_GEOMETRY.lingualFossa}
				fill={`url(#${s.fossaShadow})`}
				opacity="0.30"
			/>

			{/* Lingual Cingulum */}
			<path
				d={TOOTH32_GEOMETRY.lingualCingulum}
				fill="rgba(255, 255, 255, 0.40)"
				stroke={grooveStroke}
				strokeWidth="0.5"
			/>

			{/* Labial Cervical Ridge Convexity */}
			<path
				d={TOOTH32_GEOMETRY.labialCervicalRidge}
				stroke={`url(#${s.cervicalRidge})`}
				strokeWidth="1.2"
				fill="none"
				opacity="0.75"
			/>

			{/* Labial Developmental Grooves */}
			<path
				d={TOOTH32_GEOMETRY.labialGrooveMesial}
				stroke={grooveStroke}
				strokeWidth="0.6"
				strokeDasharray="2,1.5"
				fill="none"
			/>
			<path
				d={TOOTH32_GEOMETRY.labialGrooveDistal}
				stroke={grooveStroke}
				strokeWidth="0.6"
				strokeDasharray="2,1.5"
				fill="none"
			/>

			{/* 3 Mamelon Edge Scallops along Distal Slope */}
			{showMamelons && !isWorn && (
				<path
					id="tooth32-mamelons"
					d={TOOTH32_GEOMETRY.mamelonPath}
					stroke={stroke}
					strokeWidth="0.85"
					fill="none"
					strokeLinecap="round"
				/>
			)}
		</g>
	);
};
