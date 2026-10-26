import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH45_CARIES_GEOMETRY } from "./tooth45CariesGeometry";

export interface Tooth45CariesOverlayProps {
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Y-Fissure, Destructive & Cervical Caries for Tooth 45 (Second Premolar)
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
	const isProfunda = cariesDepth === "profunda" || cariesDepth === "destructive";
	const isDestructive = cariesDepth === "destructive" || cariesType === "class2_do" || cariesType === "class2_mod";

	return (
		<g
			id="tooth45-caries-overlay"
			data-caries-type={cariesType}
			data-caries-depth={cariesDepth}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth45-crown-clip)"
		>
			{/* Destructive Cavitation (Collapse of Distal Marginal Ridge & Lingual Cusp) */}
			{isDestructive && (
				<g id="tooth45-caries-destructive">
					<path d={g.destructive.halo} fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.5" />
					{!isSuperficial && (
						<path d={g.destructive.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.85)" strokeWidth="0.55" />
					)}
					{isProfunda && (
						<path d={g.destructive.profunda} fill={necroticFill} stroke="rgba(28, 25, 23, 0.95)" strokeWidth="0.5" />
					)}
					{g.destructive.fractureSteps.map((s, idx) => (
						<path key={`step-${idx}`} d={s} fill="none" stroke={isDark ? "#f1f5f9" : "#ffffff"} strokeWidth="0.75" strokeLinecap="round" />
					))}
				</g>
			)}

			{/* Class I Y-Pattern Cavity */}
			{!isDestructive && cariesType !== "class5" && (
				<g id="tooth45-caries-class1">
					<path d={g.class1.halo} fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.5" />
					{!isSuperficial && (
						<path d={g.class1.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.75)" strokeWidth="0.5" />
					)}
					{isProfunda && (
						<path d={g.class1.profunda} fill={necroticFill} stroke="rgba(12, 10, 9, 0.9)" strokeWidth="0.5" />
					)}
				</g>
			)}

			{/* Class V Cervical Cavity */}
			{cariesType === "class5" && (
				<g id="tooth45-caries-cervical">
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
