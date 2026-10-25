import type React from "react";
import type { CariesChronicity, CariesType } from "../../tooth46PresetTypes";

export interface Tooth47CariesOverlayProps {
	cariesType?: CariesType | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Cruciform (+) Fissure Caries for Tooth 47 (Second Mandibular Molar)
 * Follows central cruciform pit dividing the 4 cusps.
 * Mandate 8b <= 120 lines.
 */
export const Tooth47CariesOverlay: React.FC<Tooth47CariesOverlayProps> = ({
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
			id="tooth47-caries-overlay"
			data-caries-type={cariesType}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth47-crown-clip)"
		>
			<g id="tooth47-caries-cruciform">
				{/* 1. Demineralized undermined enamel halo following offset 47 anatomy */}
				<path
					d="M 28,21 C 35,19.8 42,20.2 47,20 C 49,17.5 53,17.5 55,19 C 62,20 69,20.5 72,21.8 C 70,24.2 65,24 61,23.5 C 59,26 57,28.5 53.5,29 C 50.5,26.5 47,25 43,26 C 39.5,28 36,27.5 33,25 C 30.5,23.5 28.5,22.5 28,21 Z"
					fill="url(#dente-caries-demin)"
					stroke={haloStroke}
					strokeWidth="0.55"
				/>
				{/* 2. Softened dentin cavitation crater */}
				<path
					d="M 32,21.6 C 38,20.8 44,21.2 48,20.8 C 51,18.8 54,18.8 55,20.2 C 60,21 65,21.2 68,22.2 C 66,23.8 62,23.5 59,23 C 56.5,25.5 54.5,26.8 52,27 C 49.5,25 46,24.2 42,25 C 38.5,26.5 35.5,25.5 33.5,24 C 32,23 31.5,22.2 32,21.6 Z"
					fill={lesionFill}
					stroke="rgba(120, 53, 15, 0.75)"
					strokeWidth="0.5"
				/>
				{/* 3. Deep necrotic floor (cavitated tissue destruction into dentin) */}
				<path
					d="M 45,21.5 C 48,20.5 52,20.5 54,21.2 C 55.5,22.5 54,24.5 52,25 C 48.5,25.5 45.5,24.2 44.5,22.8 C 44,22 44.5,21.8 45,21.5 Z M 35,22 C 38,21.5 40,22.2 39.5,23.5 C 37.5,24.2 35.5,23.5 35,22 Z M 61,22.2 C 64,21.8 66,22.5 65.5,23.5 C 63.5,24 61.5,23.5 61,22.2 Z"
					fill={necroticFill}
					stroke="rgba(12, 10, 9, 0.9)"
					strokeWidth="0.5"
				/>
			</g>
		</g>
	);
};
