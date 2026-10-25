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
			{/* Proximal Contact Cavity (Class III with tissue loss on Mesial Border, X=32..37) */}
			<g id="tooth41-caries-mesial-contact">
				<path
					d="M 31.5,33.0 C 35.5,33.5 37.5,37.0 37.0,41.5 C 36.5,45.5 34.5,47.5 31.5,47.5 C 31.0,42.5 31.0,37.5 31.5,33.0 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.5"
				/>
				<path
					d="M 31.5,34.5 C 34.5,35.0 36.0,38.0 35.8,41.2 C 35.2,44.5 33.8,46.0 31.5,46.0 C 31.2,42.0 31.2,38.0 31.5,34.5 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				<path
					d="M 31.5,37.5 C 33.2,38.0 34.2,39.5 34.0,41.5 C 33.8,43.2 32.8,44.0 31.5,44.0 C 31.3,41.8 31.3,39.5 31.5,37.5 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>

			{/* Cervical Class V Cavity with depth directly on Labial CEJ Margin */}
			<g id="tooth41-caries-cervical">
				<path
					d="M 38.0,71.0 C 43.0,73.0 57.0,73.0 62.0,71.0 C 60.2,65.2 56.0,63.8 50.0,63.8 C 44.0,63.8 39.8,65.2 38.0,71.0 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<path
					d="M 40.0,70.8 C 44.0,72.2 56.0,72.2 60.0,70.8 C 58.5,66.5 55.0,65.0 50.0,65.0 C 45.0,65.0 41.5,66.5 40.0,70.8 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				<path
					d="M 43.5,70.5 C 46.8,71.5 53.2,71.5 56.5,70.5 C 55.5,67.2 53.2,66.2 50.0,66.2 C 46.8,66.2 44.5,67.2 43.5,70.5 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>
		</g>
	);
};
