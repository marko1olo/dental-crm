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
			{/* Cervical Class V Lesion at Labial Gingival Margin */}
			<g id="tooth43-caries-cervical">
				<path
					d="M 38.0,64.0 C 42.0,61.0 58.0,61.0 62.0,64.0 C 60.5,69.5 56.0,71.5 50.0,71.5 C 44.0,71.5 39.5,69.5 38.0,64.0 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.6"
				/>
				<circle cx="48.0" cy="66.5" r="2.2" fill={necroticFill} />
				<circle cx="53.0" cy="66.0" r="1.6" fill={necroticFill} />
			</g>

			{/* Mesial Proximal Contact Demineralization (Class III) */}
			<g id="tooth43-caries-contact">
				<path
					d="M 16.0,38.0 C 18.0,38.0 20.0,41.0 19.5,44.0 C 19.0,47.0 17.0,49.0 15.0,48.0 C 14.0,45.0 14.5,40.0 16.0,38.0 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.5"
				/>
				<circle cx="16.5" cy="43.5" r="1.3" fill={necroticFill} />
			</g>
		</g>
	);
};
