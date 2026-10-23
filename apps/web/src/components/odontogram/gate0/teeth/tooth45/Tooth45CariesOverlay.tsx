import type React from "react";
import type { CariesChronicity, CariesType } from "../../tooth46PresetTypes";

export interface Tooth45CariesOverlayProps {
	cariesType?: CariesType | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Fissure Caries for Tooth 45 (Second Mandibular Premolar)
 * Classical Y-fissure central pit caries and lingual groove extension on 50px crown.
 * Mandate 8b <= 120 lines.
 */
export const Tooth45CariesOverlay: React.FC<Tooth45CariesOverlayProps> = ({
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
			id="tooth45-caries-overlay"
			data-caries-type={cariesType}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth45-crown-clip)"
		>
			{/* Central Pit Lesion of the Y-fissure */}
			<g id="tooth45-caries-central-pit">
				<path
					d="M 49.5,20.5 C 52.5,20.5 54.0,22.5 53.5,25.0 C 53.0,27.5 50.5,28.5 48.0,28.0 C 45.5,27.5 45.0,25.0 45.5,22.5 C 46.5,21.0 48.0,20.5 49.5,20.5 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				<circle cx="49.5" cy="24.0" r="1.6" fill={necroticFill} />
			</g>

			{/* Lingual Stem Fissure Infiltration (down Y-stem to Y=29) */}
			<g id="tooth45-caries-stem">
				<path
					d="M 48.5,24.5 L 48.5,29.5 C 48.5,30.5 50.5,30.5 50.5,29.5 L 50.5,24.5 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.5"
				/>
			</g>
		</g>
	);
};
