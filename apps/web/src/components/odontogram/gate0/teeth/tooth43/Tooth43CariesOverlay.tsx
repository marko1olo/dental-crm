import type React from "react";
import type { CariesChronicity, CariesType } from "../../tooth46PresetTypes";

export interface Tooth43CariesOverlayProps {
	cariesType?: CariesType | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Cervical & Contact Caries for Tooth 43 (Mandibular Canine)
 * Class V cervical lesion near gingival margin + sub-contact enamel demineralization.
 * Mandate 8b <= 120 lines.
 */
export const Tooth43CariesOverlay: React.FC<Tooth43CariesOverlayProps> = ({
	cariesType = "class5",
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
			id="tooth43-caries-overlay"
			data-caries-type={cariesType}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth43-crown-clip)"
		>
			{/* Cervical Class V Lesion directly on Labial CEJ Margin */}
			<g id="tooth43-caries-cervical">
				<path
					d="M 37.0,74.5 C 43.0,75.8 57.0,75.8 63.0,74.5 C 61.5,70.0 57.0,68.5 50.0,68.5 C 43.0,68.5 38.5,70.0 37.0,74.5 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.6"
				/>
				<circle cx="50.0" cy="72.0" r="1.6" fill={necroticFill} />
			</g>

			{/* Mesial Proximal Contact Demineralization (Class III on border) */}
			<g id="tooth43-caries-contact">
				<path
					d="M 23.5,42.0 C 26.5,42.0 27.5,45.5 27.0,48.5 C 26.5,51.5 24.5,53.0 22.8,53.0 C 22.0,49.0 22.5,45.0 23.5,42.0 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.5"
				/>
				<circle cx="24.5" cy="47.0" r="1.2" fill={necroticFill} />
			</g>
		</g>
	);
};
