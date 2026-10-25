import React from "react";
import type { CariesChronicity, CariesType } from "../../tooth46PresetTypes";

export interface Tooth42CariesOverlayProps {
	cariesType?: CariesType | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Proximal Contact & Cervical Caries for Tooth 42 (Mandibular Lateral Incisor)
 * Distinct Class III proximal contact lesion & cervical demineralization on 42px chisel crown.
 * Mandate 8b <= 120 lines.
 */
export const Tooth42CariesOverlay: React.FC<Tooth42CariesOverlayProps> = ({
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
			id="tooth42-caries-overlay"
			data-caries-type={cariesType}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth42-crown-clip)"
		>
			{/* Proximal Contact Cavity (Class III with tissue loss on Distal Border X=65..70) */}
			<g id="tooth42-caries-distal-contact">
				<path
					d="M 70.0,33.0 C 66.0,33.5 64.5,37.0 65.0,41.5 C 65.5,45.5 67.5,47.5 70.0,47.5 C 70.5,42.5 70.5,37.5 70.0,33.0 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.5"
				/>
				<path
					d="M 70.0,34.5 C 67.0,35.0 66.0,37.8 66.2,41.2 C 66.8,44.5 68.2,46.0 70.0,46.0 C 70.3,42.0 70.3,38.0 70.0,34.5 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				<path
					d="M 70.0,37.5 C 68.2,38.0 67.5,39.5 67.8,41.5 C 68.2,43.2 69.2,44.0 70.0,44.0 C 70.2,41.8 70.2,39.5 70.0,37.5 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>

			{/* Cervical Class V Cavity with depth directly on Labial CEJ Margin */}
			<g id="tooth42-caries-cervical">
				<path
					d="M 37.0,71.5 C 42.0,73.5 58.0,73.5 63.0,71.5 C 61.2,65.5 56.5,64.0 50.0,64.0 C 43.5,64.0 38.8,65.5 37.0,71.5 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<path
					d="M 39.0,71.2 C 43.5,72.8 56.5,72.8 61.0,71.2 C 59.5,66.8 56.0,65.5 50.0,65.5 C 44.0,65.5 40.5,66.8 39.0,71.2 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				<path
					d="M 43.0,71.0 C 46.5,72.0 53.5,72.0 57.0,71.0 C 56.0,67.5 53.5,66.5 50.0,66.5 C 46.5,66.5 44.0,67.5 43.0,71.0 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>
		</g>
	);
};
