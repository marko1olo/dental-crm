import React from "react";
import { TOOTH46_ENDO_PATHOLOGY_GEOMETRY } from "./Tooth46EndoPathologyGeometry";

export interface Tooth46BrokenFileOverlayProps {
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Separated endodontic instrument (сломанный файл NiTi) in mesial root canal.
 * Features helical spiral flutes, torsional fracture point, and specular ridge.
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
			<path
				d={bf.warningOutline}
				fill="none"
				stroke={outlineColor}
				strokeWidth="0.8"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<path
				d={bf.shaft}
				fill="url(#dente-niti-metal)"
				stroke="#334155"
				strokeWidth="0.45"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<path
				d={bf.fractureLine}
				fill="none"
				stroke="#ef4444"
				strokeWidth="0.75"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<path
				d={bf.microHelicalRidge}
				fill="none"
				stroke="#ffffff"
				strokeWidth="0.35"
				strokeOpacity="0.8"
				vectorEffect="non-scaling-stroke"
			/>
			{bf.flutes.map((flute, idx) => (
				<path
					key={`flute-${flute.slice(0, 14)}`}
					id={`flute-${idx}`}
					d={flute}
					data-component="broken-file-flute"
					fill="none"
					stroke="#ffffff"
					strokeWidth="0.5"
					strokeOpacity="0.9"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			))}
		</g>
	);
};
