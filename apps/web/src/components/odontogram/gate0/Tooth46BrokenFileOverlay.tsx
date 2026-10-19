import type React from "react";
import { TOOTH46_ENDO_PATHOLOGY_GEOMETRY } from "./Tooth46EndoPathologyGeometry";

export interface Tooth46BrokenFileOverlayProps {
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Separated endodontic instrument (сломанный файл NiTi) in mesial root canal.
 * Features tungsten/silver flutes, apical curvature, fracture point, and warning outline.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth46BrokenFileOverlay: React.FC<
	Tooth46BrokenFileOverlayProps
> = ({ isDark = false, className }) => {
	const bf = TOOTH46_ENDO_PATHOLOGY_GEOMETRY.brokenFile;
	const outlineColor = isDark
		? "rgba(251, 191, 36, 0.95)"
		: "rgba(217, 119, 6, 0.95)";

	return (
		<g
			id="tooth46-broken-file-overlay"
			data-testid="tooth46-broken-file"
			className={className}
		>
			{/* High-visibility amber clinical alert outline */}
			<path
				d={bf.warningOutline}
				fill="none"
				stroke={outlineColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Metallic NiTi Instrument Core Body */}
			<path
				d={bf.shaft}
				fill="url(#dente-niti-metal)"
				stroke="#334155"
				strokeWidth="0.4"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Jagged Coronal Fracture Horizon */}
			<path
				d={bf.fractureLine}
				fill="none"
				stroke="#ef4444"
				strokeWidth="0.7"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
			{/* Spiral Flute Cutting Edges */}
			{bf.flutes.map((flute) => (
				<path
					key={`flute-${flute.slice(0, 12)}`}
					d={flute}
					fill="none"
					stroke="#ffffff"
					strokeWidth="0.5"
					strokeOpacity="0.85"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			))}
		</g>
	);
};
