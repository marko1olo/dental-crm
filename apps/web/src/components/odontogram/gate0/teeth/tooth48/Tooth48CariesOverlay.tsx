import type React from "react";
import type { CariesChronicity, CariesType } from "../../tooth46PresetTypes";

export interface Tooth48CariesOverlayProps {
	cariesType?: CariesType | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Crenulated Caries for Tooth 48 (Third Mandibular Molar)
 * Multiple small dendritic pit spots along the wrinkled occlusal table.
 * Mandate 8b <= 120 lines.
 */
export const Tooth48CariesOverlay: React.FC<Tooth48CariesOverlayProps> = ({
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
			id="tooth48-caries-overlay"
			data-caries-type={cariesType}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth48-crown-clip)"
		>
			<g id="tooth48-caries-crenulated">
				{/* 1. Demineralized undermined enamel halo */}
				<path
					d="M 28,21 C 34,19.5 42,20 48,20 C 52,17.5 56,17.5 58,19 C 64,20 70,20.5 73,22 C 71,24.5 66,24.5 62,24 C 60,26.5 58,28.5 54,29 C 51,26.5 48,25 43,26 C 39,28 35,27.5 32,25.5 C 30,24 28,23 28,21 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				{/* 2. Softened pigmented dentin cavity body with tissue excavation */}
				<path
					d="M 32,21.8 C 38,21 44,21.5 49,21.2 C 53,19 55,19 56,20.5 C 61,21.2 66,21.5 69,22.8 C 67,24 63,23.8 60,23.5 C 57,25.8 55,27 52.5,27.2 C 50.5,25.2 47,24.2 43,25 C 39,26.5 36,25.8 33.5,24.2 C 32,23.2 31.5,22.5 32,21.8 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				{/* 3. Deep necrotic cavitated floor (tissue breakdown into dentin) */}
				<path
					d="M 45,21.8 C 48,20.8 52,20.8 54,21.5 C 56,22.8 54,24.8 52,25.2 C 48.5,25.8 45.5,24.5 44.5,23 C 44,22.2 44.5,22 45,21.8 Z M 34,22.2 C 37,21.8 39,22.5 38.5,23.8 C 36.5,24.5 34.5,23.8 34,22.2 Z M 62,22.5 C 65,22.2 67,22.8 66.5,23.8 C 64.5,24.2 62.5,23.8 62,22.5 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>
		</g>
	);
};
