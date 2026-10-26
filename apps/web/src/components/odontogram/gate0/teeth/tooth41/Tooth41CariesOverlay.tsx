import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH41_CARIES_GEOMETRY } from "./tooth41CariesGeometry";

export interface Tooth41CariesOverlayProps {
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Proximal Contact, Cervical & Incisal Fracture Caries for Tooth 41
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth41CariesOverlay: React.FC<Tooth41CariesOverlayProps> = ({
	cariesType = "class3",
	cariesDepth = "media",
	chronicity = "acute",
	isDark = false,
	className,
}) => {
	const g = TOOTH41_CARIES_GEOMETRY;
	const isChronic = chronicity === "chronic";
	const lesionFill = isChronic ? "url(#dente-caries-chronic)" : "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const haloStroke = isDark ? "rgba(245, 158, 11, 0.70)" : "rgba(180, 83, 9, 0.85)";
	const isSuperficial = cariesDepth === "superficial";
	const isProfunda = cariesDepth === "profunda" || cariesDepth === "destructive";
	const isClass4 = cariesType === "class4" || cariesDepth === "destructive";

	return (
		<g
			id="tooth41-caries-overlay"
			data-caries-type={cariesType}
			data-caries-depth={cariesDepth}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth41-crown-clip)"
		>
			{/* Class IV Incisal Fracture (Destructive incisal notch) */}
			{isClass4 && (
				<g id="tooth41-caries-class4">
					<path d={g.class4.halo} fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.5" />
					{!isSuperficial && (
						<path d={g.class4.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.85)" strokeWidth="0.55" />
					)}
					{isProfunda && (
						<path d={g.class4.profunda} fill={necroticFill} stroke="rgba(28, 25, 23, 0.95)" strokeWidth="0.5" />
					)}
					{g.class4.fractureSteps.map((s, idx) => (
						<path key={`step-${idx}`} d={s} fill="none" stroke={isDark ? "#f1f5f9" : "#ffffff"} strokeWidth="0.75" strokeLinecap="round" />
					))}
				</g>
			)}

			{/* Class III Proximal Contact Cavity */}
			{!isClass4 && cariesType !== "class5" && (
				<g id="tooth41-caries-mesial-contact">
					<path d={g.class3.halo} fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.5" />
					{!isSuperficial && (
						<path d={g.class3.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.75)" strokeWidth="0.5" />
					)}
					{isProfunda && (
						<path d={g.class3.profunda} fill={necroticFill} stroke="rgba(12, 10, 9, 0.9)" strokeWidth="0.5" />
					)}
				</g>
			)}

			{/* Class V Cervical Cavity */}
			{!isClass4 && (cariesType === "class5" || cariesType === "class1") && (
				<g id="tooth41-caries-cervical">
					<path d={g.class5.halo} fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.55" />
					{!isSuperficial && (
						<path d={g.class5.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.75)" strokeWidth="0.5" />
					)}
					{isProfunda && (
						<path d={g.class5.profunda} fill={necroticFill} stroke="rgba(12, 10, 9, 0.9)" strokeWidth="0.5" />
					)}
				</g>
			)}
		</g>
	);
};
