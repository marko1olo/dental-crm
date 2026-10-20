import type React from "react";
import { DENTE_SHADER_IDS } from "../../shared/defs/shaderConstants";
import type { LowerIncisorAbfractionOverlayProps } from "./overlayTypes";

/**
 * Mandibular Incisor Cervical Abfraction Wedge Defect Overlay
 * Non-carious cervical lesion with V-shaped enamel notch, sclerotic dentin floor,
 * and biomechanical stress apex line at the cervical margin (CEJ).
 * Mandate 8b <= 120 lines.
 */
export const LowerIncisorAbfractionOverlay: React.FC<
	LowerIncisorAbfractionOverlayProps
> = ({ toothNumber = 31, isDark = false, className }) => {
	const s = DENTE_SHADER_IDS;
	const isLateral = toothNumber === 32 || toothNumber === 42;
	const xMid = isLateral ? 50 : 50;
	const yCej = isLateral ? 68 : 67;

	// V-shaped notch path at labial cervical zone
	const notchPath =
		`M ${xMid - 10},${yCej - 4} ` +
		`L ${xMid},${yCej + 3} ` +
		`L ${xMid + 10},${yCej - 4} ` +
		`Q ${xMid},${yCej - 1} ${xMid - 10},${yCej - 4} Z`;

	// Sclerotic dentin floor
	const dentinFloorPath =
		`M ${xMid - 7},${yCej - 2} ` +
		`L ${xMid},${yCej + 2} ` +
		`L ${xMid + 7},${yCej - 2} Z`;

	// Biomechanical stress concentration apex line
	const stressApexLine = `M ${xMid - 6},${yCej + 1} L ${xMid + 6},${yCej + 1}`;

	return (
		<g
			id={`tooth-${toothNumber}-abfraction-wedge`}
			data-surface="labial-cervical"
			className={className}
		>
			{/* V-Shaped Cervical Enamel Notch */}
			<path
				id="abfraction-notch"
				d={notchPath}
				fill={`url(#${s.abfractionDentin})`}
				stroke={isDark ? "rgba(217, 119, 6, 0.85)" : "rgba(180, 83, 9, 0.75)"}
				strokeWidth="0.7"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Sclerotic Dentin Floor */}
			<path
				id="abfraction-sclerotic-floor"
				d={dentinFloorPath}
				fill="#b45309"
				opacity="0.45"
				stroke="none"
			/>

			{/* Biomechanical Stress Concentration Apex Line */}
			<path
				id="abfraction-stress-line"
				d={stressApexLine}
				stroke={isDark ? "#fef08a" : "rgba(120, 53, 15, 0.90)"}
				strokeWidth="0.65"
				strokeLinecap="round"
				fill="none"
			/>
		</g>
	);
};
