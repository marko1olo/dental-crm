import type React from "react";
import { DENTE_SHADER_IDS } from "../../shared/defs/shaderConstants";
import { TOOTH32_GEOMETRY } from "./tooth32GeometryConstants";

export interface Tooth32RootProps {
	showGrooves?: boolean | undefined;
	showCej?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Tooth 32 / 42 Root Component — Mandibular Lateral Incisor
 * Longer, stouter root with distal apical curvature and bilateral sulcus longitudinalis.
 * Wheeler's Dental Anatomy Ch. 9. Mandate 8b <= 120 lines.
 */
export const Tooth32Root: React.FC<Tooth32RootProps> = ({
	showGrooves = true,
	showCej = true,
	isDark = false,
	className,
}) => {
	const s = DENTE_SHADER_IDS;
	const stroke = isDark
		? "rgba(148, 163, 184, 0.65)"
		: "rgba(71, 85, 105, 0.45)";
	const grooveStroke = isDark
		? "rgba(100, 116, 139, 0.45)"
		: "rgba(100, 116, 139, 0.30)";
	const cejStroke = isDark
		? "rgba(226, 232, 240, 0.65)"
		: "rgba(51, 65, 85, 0.50)";

	return (
		<g id="tooth32-root-group" className={className}>
			{/* Monolithic Root with Distal Apical Bow */}
			<path
				id="tooth32-root-monolith"
				d={TOOTH32_GEOMETRY.rootMonolithPath}
				fill={`url(#${s.rootDentin})`}
				stroke={stroke}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Sulcus Longitudinalis 3D Shadow Trough */}
			{showGrooves && (
				<path
					id="tooth32-sulcus-shadow"
					d={TOOTH32_GEOMETRY.sulcusShadowTrough}
					fill={`url(#${s.rootSulcusShadow})`}
				/>
			)}

			{/* Developmental Groove Centerline and Convex Columns */}
			{showGrooves && (
				<g id="tooth32-sulcus-grooves">
					<path
						id="tooth32-sulcus-longitudinalis"
						d={TOOTH32_GEOMETRY.sulcusLongitudinalisCenter}
						stroke={grooveStroke}
						strokeWidth="0.75"
						strokeDasharray="3,1.5"
						fill="none"
					/>
					<path
						d={TOOTH32_GEOMETRY.mesialRootRidge}
						stroke="rgba(255, 255, 255, 0.35)"
						strokeWidth="0.6"
						fill="none"
					/>
					<path
						d={TOOTH32_GEOMETRY.distalRootRidge}
						stroke="rgba(255, 255, 255, 0.25)"
						strokeWidth="0.6"
						fill="none"
					/>
				</g>
			)}

			{/* Cervical Margin (CEJ) */}
			{showCej && (
				<path
					id="tooth32-cej-line"
					d={TOOTH32_GEOMETRY.cejCurve}
					stroke={cejStroke}
					strokeWidth="0.9"
					fill="none"
				/>
			)}
		</g>
	);
};
