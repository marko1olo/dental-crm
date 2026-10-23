import React from "react";
import type { CariesChronicity, CariesType } from "../../tooth46PresetTypes";

export interface Tooth41CariesOverlayProps {
	cariesType?: CariesType | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Proximal Contact & Cervical Caries for Tooth 41 (Mandibular Central Incisor)
 * Symmetrical chisel crown (38px) with proximal contact lesion & cervical demineralization.
 * Mandate 8b <= 120 lines.
 */
export const Tooth41CariesOverlay: React.FC<Tooth41CariesOverlayProps> = ({
	cariesType = "class3",
	chronicity = "acute",
	isDark = false,
	className,
}) => {
	const isChronic = chronicity === "chronic";
	const lesionFill = isChronic
		? "url(#dente-caries-chronic)"
		: "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const haloStroke = isDark
		? "rgba(254, 243, 199, 0.35)"
		: "rgba(254, 243, 199, 0.55)";

	return (
		<g
			id="tooth41-caries-overlay"
			data-caries-type={cariesType}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth41-crown-clip)"
		>
			{/* Proximal Contact Lesion (Class III on Mesial Border, X=32..37) */}
			<g id="tooth41-caries-mesial-contact">
				<path
					d="M 32.5,34.0 C 35.5,34.0 37.5,37.0 37.0,41.0 C 36.5,45.0 34.5,47.0 31.5,46.5 C 31.0,42.0 31.0,37.0 32.5,34.0 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<circle cx="34.0" cy="40.5" r="1.5" fill={necroticFill} />
			</g>

			{/* Cervical Class V Lesion near Gingival Margin (X=42..58) */}
			<g id="tooth41-caries-cervical">
				<path
					d="M 42.0,61.5 C 45.0,59.0 55.0,59.0 58.0,61.5 C 57.0,66.5 54.0,68.5 50.0,68.5 C 46.0,68.5 43.0,66.5 42.0,61.5 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<circle cx="50.0" cy="64.0" r="1.6" fill={necroticFill} />
			</g>
		</g>
	);
};
