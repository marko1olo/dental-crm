import type React from "react";
import { DENTE_SHADER_IDS } from "../defs/shaderConstants";
import type { AbfractionWedgeProps } from "../types/abfractionTypes";

/**
 * Universal Non-Carious Cervical Wedge Defect (Abfraction / V-Notch).
 * Renders sclerotic dentin floor and stress concentration apex line at CEJ.
 * Mandate 8b <= 120 lines.
 */
export const AbfractionWedgeOverlay: React.FC<AbfractionWedgeProps> = ({
	notchPath,
	dentinFloorPath,
	stressApexLine,
	surface = "buccal",
	className,
}) => {
	const s = DENTE_SHADER_IDS;

	return (
		<g
			id="dente-abfraction-wedge-defect"
			data-surface={surface}
			className={className}
		>
			{/* V-Shaped Cervical Enamel Notch */}
			<path
				d={notchPath}
				fill={`url(#${s.abfractionDentin})`}
				stroke="rgba(180, 83, 9, 0.60)"
				strokeWidth="0.6"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>

			{/* Polished Sclerotic Dentin Floor */}
			{dentinFloorPath && (
				<path d={dentinFloorPath} fill="#b08968" opacity="0.35" stroke="none" />
			)}

			{/* Microstructural Biomechanical Stress Apex Line */}
			{stressApexLine && (
				<path
					d={stressApexLine}
					fill="none"
					stroke="rgba(120, 53, 15, 0.85)"
					strokeWidth="0.5"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
		</g>
	);
};
