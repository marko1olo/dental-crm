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
			{/* Mesial Fossa Lesion (Fossa Mesialis X=39..44) */}
			<g id="tooth44-caries-fossa-mesial">
				<path
					d="M 39.5,20.0 C 42.5,20.0 44.5,22.0 44.0,24.5 C 43.5,27.0 41.0,28.0 38.5,27.5 C 36.0,27.0 35.0,24.5 36.0,22.0 C 37.0,20.5 38.0,20.0 39.5,20.0 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<circle cx="39.0" cy="23.5" r="1.6" fill={necroticFill} />
			</g>

			{/* Distal Fossa Lesion (Fossa Distalis X=57..62) across crista transversa */}
			<g id="tooth44-caries-fossa-distal">
				<path
					d="M 60.5,20.5 C 63.0,20.5 65.0,22.5 64.5,24.5 C 64.0,26.5 62.0,27.5 59.5,27.0 C 57.5,26.5 56.5,24.5 57.0,22.5 C 58.0,21.0 59.0,20.5 60.5,20.5 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<circle cx="60.0" cy="23.5" r="1.5" fill={necroticFill} />
			</g>
		</g>
	);
};
