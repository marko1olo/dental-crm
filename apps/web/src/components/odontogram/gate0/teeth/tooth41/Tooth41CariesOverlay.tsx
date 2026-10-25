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

			{/* Cervical Class V Lesion directly on Labial CEJ Margin */}
			<g id="tooth41-caries-cervical">
				<path
					d="M 40.0,71.0 C 44.0,72.5 56.0,72.5 60.0,71.0 C 58.5,66.5 55.0,65.0 50.0,65.0 C 45.0,65.0 41.5,66.5 40.0,71.0 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<circle cx="50.0" cy="68.0" r="1.4" fill={necroticFill} />
			</g>
		</g>
	);
};
