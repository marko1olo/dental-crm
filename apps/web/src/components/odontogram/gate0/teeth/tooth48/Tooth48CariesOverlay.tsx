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
				<path
					d="M 46.5,19.5 C 50.0,20.0 53.5,19.5 54.0,22.0 C 58.0,22.5 62.0,22.5 61.5,24.5 C 58.0,25.0 54.5,25.0 53.5,27.5 C 50.0,27.0 46.5,27.0 45.5,25.0 C 42.0,25.0 38.0,24.5 38.5,22.5 C 42.0,22.5 45.5,22.0 46.5,19.5 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.6"
				/>
				<circle cx="50.0" cy="23.0" r="2.2" fill={necroticFill} />
				<circle cx="42.0" cy="23.0" r="1.5" fill={necroticFill} />
				<circle cx="58.0" cy="23.0" r="1.5" fill={necroticFill} />
			</g>
		</g>
	);
};
