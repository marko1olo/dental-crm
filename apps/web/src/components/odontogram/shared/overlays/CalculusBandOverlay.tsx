import type React from "react";
import { DENTE_SHADER_IDS } from "../defs/shaderConstants";
import type { CalculusBandProps } from "../types/calculusTypes";

/**
 * Universal Periodontal Calculus Band Overlay.
 * Renders chalky limestone supragingival calculus and dense dark subgingival deposits.
 * Mandate 8b <= 120 lines.
 */
export const CalculusBandOverlay: React.FC<CalculusBandProps> = ({
	supraPath,
	subPath,
	cejCurve,
	severity = "moderate",
	className,
}) => {
	const s = DENTE_SHADER_IDS;
	const depositOpacity =
		severity === "mild" ? "0.75" : severity === "severe" ? "1.0" : "0.90";

	return (
		<g
			id="dente-calculus-band"
			data-calculus-severity={severity}
			opacity={depositOpacity}
			className={className}
		>
			{/* Anatomical CEJ Guide (Passive) */}
			{cejCurve && (
				<path
					d={cejCurve}
					fill="none"
					stroke="rgba(148, 163, 184, 0.20)"
					strokeWidth="0.4"
					strokeDasharray="1 1"
				/>
			)}

			{/* Supragingival Chalky Mineral Deposits */}
			{supraPath && (
				<path
					d={supraPath}
					fill={`url(#${s.calculusSupra})`}
					stroke="rgba(180, 83, 9, 0.55)"
					strokeWidth="0.5"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}

			{/* Subgingival Serumal Dense Dark Calculus */}
			{subPath && (
				<path
					d={subPath}
					fill={`url(#${s.calculusSub})`}
					stroke="#1c1917"
					strokeWidth="0.5"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
