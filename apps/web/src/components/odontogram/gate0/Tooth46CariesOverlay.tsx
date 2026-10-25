import type React from "react";
import { Tooth46CariesClass1 } from "./Tooth46CariesClass1";
import { Tooth46CariesClass2 } from "./Tooth46CariesClass2";
import { TOOTH46_CARIES_SPECTRUM_GEOMETRY } from "./Tooth46CariesSpectrumGeometry";
import type { CariesChronicity, CariesDepth, CariesType } from "./tooth46PresetTypes";

export interface Tooth46CariesOverlayProps {
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	showBuccalPit?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Biological Caries Spectrum for Tooth 46
 * Class I, Class II (MO, DO, MOD), Class V, White Spot, Acute & Chronic.
 * Mandate 8b <= 120 lines.
 */
export const Tooth46CariesOverlay: React.FC<Tooth46CariesOverlayProps> = ({
	cariesType = "class1",
	cariesDepth = "media",
	chronicity = "acute",
	isDark = false,
	showBuccalPit = true,
	className,
}) => {
	const sp = TOOTH46_CARIES_SPECTRUM_GEOMETRY;
	const isChronic = chronicity === "chronic";
	const lesionFill = isChronic
		? "url(#dente-caries-chronic)"
		: "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const haloStroke = isDark
		? "rgba(254, 243, 199, 0.35)"
		: "rgba(254, 243, 199, 0.55)";
	const isSuperficial = cariesDepth === "superficial";
	const showNecrotic = cariesDepth === "profunda" || cariesDepth === "destructive" || !cariesDepth;

	return (
		<g
			id="tooth46-biological-caries"
			data-caries-type={cariesType}
			data-caries-depth={cariesDepth}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth46-crown-clip)"
		>
			{cariesType === "white_spot" && (
				<g id="tooth46-caries-white-spot">
					<path
						d={sp.whiteSpot.halo}
						fill="url(#dente-caries-white-spot)"
						stroke="rgba(255, 255, 255, 0.75)"
						strokeWidth="0.5"
					/>
					<path d={sp.whiteSpot.core} fill="#ffffff" fillOpacity="0.80" />
				</g>
			)}

			{cariesType === "class5" && (
				<g id="tooth46-caries-class5">
					<path
						d={sp.class5.halo}
						fill="url(#dente-caries-demin)"
						stroke={haloStroke}
						strokeWidth="0.5"
					/>
					{!isSuperficial && (
						<path
							d={sp.class5.crater}
							fill={lesionFill}
							stroke="rgba(120, 53, 15, 0.85)"
							strokeWidth="0.5"
						/>
					)}
					{showNecrotic && <path d={sp.class5.necrotic} fill={necroticFill} stroke="#1c1917" />}
				</g>
			)}

			{(cariesType === "class2_mo" ||
				cariesType === "class2_do" ||
				cariesType === "class2_mod") && (
				<Tooth46CariesClass2
					cariesType={cariesType}
					cariesDepth={cariesDepth}
					lesionFill={lesionFill}
					necroticFill={necroticFill}
					haloStroke={haloStroke}
				/>
			)}

			{cariesType === "class1" && (
				<Tooth46CariesClass1
					cariesDepth={cariesDepth}
					lesionFill={lesionFill}
					necroticFill={necroticFill}
					haloStroke={haloStroke}
					isDark={isDark}
					showBuccalPit={showBuccalPit}
				/>
			)}
		</g>
	);
};
