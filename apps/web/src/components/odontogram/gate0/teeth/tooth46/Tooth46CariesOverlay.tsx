import React from "react";
import { Tooth46CariesClass1 } from "../../Tooth46CariesClass1";
import { Tooth46CariesClass2 } from "../../Tooth46CariesClass2";
import { TOOTH46_CARIES_SPECTRUM_GEOMETRY } from "../../Tooth46CariesSpectrumGeometry";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";

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
		? "rgba(245, 158, 11, 0.70)"
		: "rgba(180, 83, 9, 0.85)";
	const isSuperficial = cariesDepth === "superficial";
	const showNecrotic = cariesDepth === "profunda";

	const deminStroke = isDark ? "rgba(253, 224, 71, 0.80)" : "rgba(217, 119, 6, 0.85)";

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
					{cariesDepth !== "destructive" ? (
						<>
							<path d={sp.class5.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth={isSuperficial ? "0.8" : "0.5"} />
							{!isSuperficial && (
								<path d={sp.class5.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.6" />
							)}
							{showNecrotic && <path d={sp.class5.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</>
					) : (
						<g id="tooth46-caries-class5-destructive">
							<path d={sp.class5.fractureMargin} fill="none" stroke="rgba(120, 53, 15, 0.95)" strokeWidth="2.2" strokeLinecap="round" />
							<path d={sp.class5.fractureMargin} fill="none" stroke="#0c0a09" strokeWidth="1.0" strokeLinecap="round" />
							{sp.class5.fractureSteps.map((s, idx) => (
								<path key={`c5-s-${idx}`} d={s} fill="none" stroke={isDark ? "#f1f5f9" : "#ffffff"} strokeWidth="0.85" />
							))}
						</g>
					)}
				</g>
			)}

			{Boolean(cariesType?.startsWith("class2")) && (
				<Tooth46CariesClass2
					cariesType={cariesType as CariesType}
					cariesDepth={cariesDepth}
					lesionFill={lesionFill}
					necroticFill={necroticFill}
					haloStroke={haloStroke}
				/>
			)}

			{(cariesType === "class1" || cariesType === "destructive") && (
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
