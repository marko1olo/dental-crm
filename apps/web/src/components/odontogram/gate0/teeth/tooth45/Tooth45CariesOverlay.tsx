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
			{/* Central Pit Cavitation of the Y-fissure with realistic depth */}
			<g id="tooth45-caries-central-pit">
				{/* 1. Demineralized halo expanding along Y-fissure branches */}
				<path
					d="M 41,21.5 C 45,20.5 48,20.8 50,21 C 52,20.8 55,20.5 59,21.5 C 57.5,23.5 53,24 51.5,25.5 L 51.5,30 C 51.5,31 48.5,31 48.5,30 L 48.5,25.5 C 47,24 42.5,23.5 41,21.5 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				{/* 2. Softened dentin crater */}
				<path
					d="M 44,22 C 47,21.5 49,21.8 50,22 C 51,21.8 53,21.5 56,22 C 54.5,23.8 52,24.2 51,25.5 L 51,29 C 51,29.8 49,29.8 49,29 L 49,25.5 C 48,24.2 45.5,23.8 44,22 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				{/* 3. Deep necrotic core pit (tissue loss into dentin) */}
				<path
					d="M 47.5,22.2 C 49,21.8 51,21.8 52.5,22.2 C 52.8,23.5 51.8,24.8 50.8,25.5 L 50.8,28 C 50.8,28.6 49.2,28.6 49.2,28 L 49.2,25.5 C 48.2,24.8 47.2,23.5 47.5,22.2 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>
		</g>
	);
};
