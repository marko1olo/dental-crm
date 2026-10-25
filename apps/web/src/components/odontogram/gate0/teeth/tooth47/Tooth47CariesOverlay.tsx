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
				<path
					d="M 46.0,17.0 C 50.0,18.0 54.0,17.0 55.0,21.0 C 59.0,21.5 64.0,22.0 63.0,24.5 C 59.0,25.0 55.0,25.0 54.0,28.5 C 50.0,28.0 46.0,28.5 45.0,25.0 C 40.0,25.0 35.0,24.5 36.0,22.0 C 40.0,21.5 45.0,21.5 46.0,17.0 Z"
					fill={lesionFill}
					stroke={haloStroke}
					strokeWidth="0.6"
				/>
				<circle cx="50.0" cy="23.0" r="2.8" fill={necroticFill} />
				<path
					d="M 40.0,23.0 L 60.0,23.0 M 50.0,18.5 L 50.0,27.5"
					stroke={necroticFill}
					strokeWidth="1.1"
					strokeLinecap="round"
				/>
			</g>
		</g>
	);
};
