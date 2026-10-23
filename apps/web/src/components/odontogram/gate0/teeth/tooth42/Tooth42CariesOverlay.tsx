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
			{/* Proximal Contact Lesion (Class III on Distal Border X=65..70) */}
			<g id="tooth42-caries-distal-contact">
				<path
					d="M 69.5,34.0 C 67.0,34.0 65.5,37.0 66.0,41.0 C 66.5,44.5 68.0,46.5 70.0,46.5 C 70.5,42.0 70.5,37.0 69.5,34.0 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<circle cx="68.0" cy="40.5" r="1.3" fill={necroticFill} />
			</g>

			{/* Cervical Class V Lesion near Gingival Margin (X=41..59) */}
			<g id="tooth42-caries-cervical">
				<path
					d="M 41.0,62.0 C 44.0,59.5 56.0,59.5 59.0,62.0 C 58.0,67.0 54.5,69.0 50.0,69.0 C 45.5,69.0 42.0,67.0 41.0,62.0 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<circle cx="49.0" cy="64.5" r="1.5" fill={necroticFill} />
			</g>
		</g>
	);
};
