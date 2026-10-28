import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH14_CARIES_GEOMETRY } from "./tooth14CariesGeometry";

export interface Tooth14CariesOverlayProps {
	cariesType?: CariesType | "class1" | "class2" | "class5" | "white_spot" | "destructive" | undefined;
	cariesDepth?: CariesDepth | "superficial" | "superficialis" | "media" | "profunda" | "destructive" | undefined;
	cariesSurface?: "mesial" | "distal" | "M" | "D" | undefined;
	chronicity?: CariesChronicity | "acute" | "chronic" | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Natural Caries Pathology Overlay for Upper First Premolar 14.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth14CariesOverlay: React.FC<Tooth14CariesOverlayProps> = ({
	cariesType = "class1",
	cariesDepth = "media",
	cariesSurface,
	chronicity = "acute",
	isDark = false,
	className,
}) => {
	const g = TOOTH14_CARIES_GEOMETRY;
	const isChronic = chronicity === "chronic";
	const lesionFill = isChronic ? "url(#dente-caries-chronic)" : "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const haloStroke = isDark ? "rgba(245, 158, 11, 0.70)" : "rgba(180, 83, 9, 0.85)";
	const deminStroke = isDark ? "rgba(253, 224, 71, 0.80)" : "rgba(217, 119, 6, 0.85)";
	const isSuper = cariesDepth === "superficial" || cariesDepth === "superficialis";
	const isProfunda = cariesDepth === "profunda";
	const isDestruct = cariesDepth === "destructive" || cariesType === "destructive";

	const isMO = cariesType === "class2_mo";
	const isDO = cariesType === "class2_do";
	const isMOD = cariesType === "class2_mod";
	const hasM = isMO || isMOD || cariesType === "class2_m" || cariesSurface === "M" || cariesSurface === "mesial" ||
		(!cariesSurface && (cariesType === "class2" || isMOD));
	const hasD = isDO || isMOD || cariesType === "class2_d" || cariesSurface === "D" || cariesSurface === "distal" ||
		(!cariesSurface && (cariesType === "class2" || isMOD));

	return (
		<g id="tooth14-caries-overlay" {...(className ? { className } : {})}>
			{cariesType === "white_spot" && (
				<g id="tooth14-caries-white-spot">
					<path d={g.whiteSpot.halo} fill="url(#dente-caries-white-spot)" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="0.5" />
					<path d={g.whiteSpot.core} fill="#ffffff" fillOpacity="0.80" />
				</g>
			)}
			{isDestruct && (
				<g id="tooth14-caries-destructive">
					<path d={g.destructive.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.95)" strokeWidth="1.2" />
					<path d={g.destructive.border} fill="none" stroke="#0c0a09" strokeWidth="1.2" strokeLinecap="round" />
					{g.destructive.steps.map((s, i) => (
						<path key={i} d={s} fill="none" stroke={isDark ? "#f1f5f9" : "#ffffff"} strokeWidth="0.8" strokeLinecap="round" />
					))}
				</g>
			)}
			{!isDestruct && (cariesType === "class1" || isMO || isDO || isMOD) && (
				<g id="tooth14-caries-class1">
					<path d={isProfunda ? g.class1.profunda.halo : isSuper ? g.class1.superficial.halo : g.class1.media.halo} fill={isSuper ? "url(#dente-caries-demin)" : "url(#dente-caries-halo-14)"} stroke={isSuper ? deminStroke : haloStroke} strokeWidth="0.5" />
					{!isSuper && <path d={isProfunda ? g.class1.profunda.core : g.class1.media.core} fill={lesionFill} stroke="rgba(69, 26, 3, 0.90)" strokeWidth="0.75" />}
					{isProfunda && <path d={g.class1.profunda.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
					{isMOD && <path d={g.class2.modBridge.core} fill={lesionFill} stroke="rgba(69, 26, 3, 0.75)" strokeWidth="0.6" />}
				</g>
			)}
			{!isDestruct && (cariesType?.startsWith("class2") || cariesType === "class3") && (
				<g id="tooth14-caries-class2">
					{hasM && (
						<g id="tooth14-c2-mesial">
							<path d={g.class2.mesial.halo} fill={isSuper ? "url(#dente-caries-demin)" : "url(#dente-caries-halo-14)"} stroke={isSuper ? deminStroke : haloStroke} strokeWidth="0.5" />
							{!isSuper && <path d={g.class2.mesial.core} fill={lesionFill} stroke="rgba(69, 26, 3, 0.90)" strokeWidth="0.75" />}
							{isProfunda && <path d={g.class2.mesial.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
						</g>
					)}
					{hasD && (
						<g id="tooth14-c2-distal">
							<path d={g.class2.distal.halo} fill={isSuper ? "url(#dente-caries-demin)" : "url(#dente-caries-halo-14)"} stroke={isSuper ? deminStroke : haloStroke} strokeWidth="0.5" />
							{!isSuper && <path d={g.class2.distal.core} fill={lesionFill} stroke="rgba(69, 26, 3, 0.90)" strokeWidth="0.75" />}
							{isProfunda && <path d={g.class2.distal.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
						</g>
					)}
				</g>
			)}
			{!isDestruct && cariesType === "class5" && (
				<g id="tooth14-caries-class5">
					<path d={isProfunda ? g.class5.profunda.halo : isSuper ? g.class5.superficial.halo : g.class5.media.halo} fill={isSuper ? "url(#dente-caries-demin)" : "url(#dente-caries-halo-14)"} stroke={isSuper ? deminStroke : haloStroke} strokeWidth="0.5" />
					{!isSuper && <path d={isProfunda ? g.class5.profunda.core : g.class5.media.core} fill={lesionFill} stroke="rgba(69, 26, 3, 0.90)" strokeWidth="0.75" />}
					{isProfunda && <path d={g.class5.profunda.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
				</g>
			)}
		</g>
	);
};
