import type React from "react";
import type { CariesChronicity, CariesType } from "../../tooth46PresetTypes";

export interface Tooth44CariesOverlayProps {
	cariesType?: CariesType | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Fissure Caries for Tooth 44 (First Mandibular Premolar)
 * Mesial and Distal fossa lesions strictly separated by crista transversa on 48px crown.
 * Mandate 8b <= 120 lines.
 */
export const Tooth44CariesOverlay: React.FC<Tooth44CariesOverlayProps> = ({
	cariesType = "class1",
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
			id="tooth44-caries-overlay"
			data-caries-type={cariesType}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth44-crown-clip)"
		>
			{/* Mesial Fossa Lesion (Fossa Mesialis X=37..44) */}
			<g id="tooth44-caries-fossa-mesial">
				<path
					d="M 37.5,21.0 C 40.5,19.5 44.5,20.5 45.0,23.5 C 45.5,26.5 43.0,28.5 39.5,28.0 C 36.5,27.5 35.0,25.0 35.5,22.5 C 36.0,21.5 36.8,21.0 37.5,21.0 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<path
					d="M 38.5,22.0 C 40.5,21.0 43.0,21.8 43.2,23.8 C 43.5,25.8 41.5,27.2 39.2,26.8 C 37.2,26.2 36.2,24.5 36.8,22.8 C 37.2,22.2 37.8,22.0 38.5,22.0 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				<path
					d="M 39.0,22.8 C 40.2,22.2 41.8,22.5 42.0,23.8 C 42.2,25.0 41.0,26.0 39.5,25.8 C 38.2,25.5 37.8,24.2 38.2,23.2 C 38.5,22.8 38.8,22.8 39.0,22.8 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>

			{/* Distal Fossa Lesion (Fossa Distalis X=56..63) across crista transversa */}
			<g id="tooth44-caries-fossa-distal">
				<path
					d="M 58.5,21.0 C 61.5,19.5 65.5,20.5 65.0,23.5 C 64.5,26.5 62.0,28.0 59.0,27.5 C 56.5,27.0 55.0,24.8 55.5,22.5 C 56.0,21.5 57.5,21.0 58.5,21.0 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<path
					d="M 59.0,22.0 C 61.0,21.0 63.8,21.8 63.5,23.8 C 63.2,25.8 61.0,27.0 59.0,26.5 C 57.2,26.0 56.5,24.5 57.0,22.8 C 57.5,22.2 58.2,22.0 59.0,22.0 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				<path
					d="M 59.5,22.8 C 60.8,22.2 62.5,22.5 62.2,23.8 C 62.0,25.0 60.8,25.8 59.5,25.5 C 58.2,25.2 57.8,24.2 58.2,23.2 C 58.5,22.8 59.0,22.8 59.5,22.8 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>
		</g>
	);
};
