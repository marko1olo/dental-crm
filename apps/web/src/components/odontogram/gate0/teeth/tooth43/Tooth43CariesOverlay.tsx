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
			{/* Cervical Class V Cavity with depth directly on Labial CEJ Margin */}
			<g id="tooth43-caries-cervical">
				{/* 1. Demineralized undermined enamel halo */}
				<path
					d="M 34.0,74.5 C 41.0,76.2 59.0,76.2 66.0,74.5 C 64.0,68.5 58.0,67.0 50.0,67.0 C 42.0,67.0 36.0,68.5 34.0,74.5 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				{/* 2. Softened dentin cavitation crater */}
				<path
					d="M 36.5,74.2 C 42.5,75.5 57.5,75.5 63.5,74.2 C 62.0,70.0 57.0,68.5 50.0,68.5 C 43.0,68.5 38.0,70.0 36.5,74.2 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				{/* 3. Deep necrotic floor trough into dentin */}
				<path
					d="M 42.0,74.0 C 46.0,74.8 54.0,74.8 58.0,74.0 C 57.0,71.2 54.0,70.0 50.0,70.0 C 46.0,70.0 43.0,71.2 42.0,74.0 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>

			{/* Mesial Proximal Contact Cavity (Class III with tissue loss on border) */}
			<g id="tooth43-caries-contact">
				{/* 1. Undermined enamel margin */}
				<path
					d="M 23.0,41.0 C 27.5,41.5 28.5,45.5 27.5,49.5 C 26.5,52.5 24.0,53.5 22.8,53.5 C 22.2,49.0 22.4,45.0 23.0,41.0 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.5"
				/>
				{/* 2. Cavity crater */}
				<path
					d="M 23.0,42.5 C 26.5,43.0 27.0,46.0 26.2,48.5 C 25.5,51.0 23.5,52.0 22.8,52.0 C 22.4,48.5 22.6,45.5 23.0,42.5 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				{/* 3. Deep necrotic pit */}
				<path
					d="M 23.0,44.5 C 25.2,45.0 25.5,47.0 24.8,48.2 C 24.0,49.2 23.0,49.5 22.7,49.5 C 22.5,47.5 22.6,46.0 23.0,44.5 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>
		</g>
	);
};
