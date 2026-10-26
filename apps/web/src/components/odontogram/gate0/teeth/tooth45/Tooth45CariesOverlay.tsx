import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { Tooth45CariesClass2 } from "./Tooth45CariesClass2";
import { TOOTH45_CARIES_GEOMETRY } from "./tooth45CariesGeometry";

export interface Tooth45CariesOverlayProps {
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Y-Fissure, Proximal & Cervical Caries Spectrum for Tooth 45
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth45CariesOverlay: React.FC<Tooth45CariesOverlayProps> = ({
	cariesType = "class1",
	cariesDepth = "media",
	chronicity = "acute",
	isDark = false,
	className,
}) => {
	const g = TOOTH45_CARIES_GEOMETRY;
	const isChronic = chronicity === "chronic";
	const lesionFill = isChronic ? "url(#dente-caries-chronic)" : "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const haloStroke = isDark ? "rgba(245, 158, 11, 0.70)" : "rgba(180, 83, 9, 0.85)";
	const isSuperficial = cariesDepth === "superficial";
	const isProfunda = cariesDepth === "profunda" || (!cariesDepth && cariesDepth !== "media" && cariesDepth !== "superficial" && cariesDepth !== "destructive");
	const isDestructive = cariesDepth === "destructive";
	const deminStroke = isDark ? "rgba(253, 224, 71, 0.80)" : "rgba(217, 119, 6, 0.85)";

	return (
		<g
			id="tooth45-caries-overlay"
			data-caries-type={cariesType}
			data-caries-depth={cariesDepth}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth45-crown-clip)"
		>
			{/* Class I Y-Pattern Cavity */}
			{cariesType === "class1" && (
				<g id="tooth45-caries-class1">
					{!isDestructive ? (
						<>
							<path d={g.class1.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth={isSuperficial ? "0.8" : "0.5"} />
							{!isSuperficial && <path d={g.class1.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.6" />}
							{isProfunda && <path d={g.class1.profunda} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
						</>
					) : (
						<g id="tooth45-caries-class1-destructive">
							<path d={g.destructive.fractureMargin} fill="none" stroke="rgba(154, 52, 18, 0.95)" strokeWidth="2.2" strokeLinecap="round" />
							<path d={g.destructive.fractureMargin} fill="none" stroke="#0c0a09" strokeWidth="1.0" strokeLinecap="round" />
							{g.destructive.fractureSteps.map((s, idx) => (
								<path key={`c1-s-${idx}`} d={s} fill="none" stroke={isDark ? "#f1f5f9" : "#ffffff"} strokeWidth="0.85" strokeLinecap="round" />
							))}
						</g>
					)}
				</g>
			)}

			{/* Class II Proximal Lesions (M, D, MO, DO, MOD) */}
			{Boolean(cariesType?.startsWith("class2")) && (
				<Tooth45CariesClass2
					cariesType={cariesType as CariesType}
					cariesDepth={cariesDepth}
					lesionFill={lesionFill}
					necroticFill={necroticFill}
					haloStroke={haloStroke}
					isDark={isDark}
				/>
			)}

			{/* Class V Cervical Cavity at CEJ */}
			{cariesType === "class5" && (
				<g id="tooth45-caries-cervical">
					{!isDestructive ? (
						<>
							<path d={g.class5.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth={isSuperficial ? "0.8" : "0.5"} />
							{!isSuperficial && <path d={g.class5.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.6" />}
							{isProfunda && <path d={g.class5.profunda} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
						</>
					) : (
						<g id="tooth45-caries-c5-destructive">
							<path d={g.class5.fractureMargin} fill="none" stroke="rgba(154, 52, 18, 0.95)" strokeWidth="2.2" strokeLinecap="round" />
							<path d={g.class5.fractureMargin} fill="none" stroke="#0c0a09" strokeWidth="1.0" strokeLinecap="round" />
							{g.class5.fractureSteps.map((s, idx) => (
								<path key={`c5-s-${idx}`} d={s} fill="none" stroke={isDark ? "#f1f5f9" : "#ffffff"} strokeWidth="0.85" strokeLinecap="round" />
							))}
						</g>
					)}
				</g>
			)}
		</g>
	);
};
