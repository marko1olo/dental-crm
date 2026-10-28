import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH11_CARIES_GEOMETRY } from "./tooth11CariesGeometry";

export interface Tooth11CariesOverlayProps {
	cariesType?: CariesType | "class1" | "class2" | "class3" | "class4" | "class5" | "white_spot" | "destructive" | undefined;
	cariesDepth?: CariesDepth | "superficial" | "superficialis" | "media" | "profunda" | "destructive" | undefined;
	cariesSurface?: "mesial" | "distal" | "M" | "D" | undefined;
	chronicity?: CariesChronicity | "acute" | "chronic" | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Facial/Labial Caries Overlay for Upper Central Incisor 11.
 * Anterior aspect: Class II/III (approximal), Class IV (incisal angle), Class V (cervical CEJ), White Spot, Destructive.
 * Zero fake lingual pits on vestibular view. Mandate 8b <= 120 lines.
 */
export const Tooth11CariesOverlay: React.FC<Tooth11CariesOverlayProps> = ({
	cariesType = "class2",
	cariesDepth = "media",
	cariesSurface,
	chronicity = "acute",
	isDark = false,
	className,
}) => {
	const g = TOOTH11_CARIES_GEOMETRY;
	const isChronic = chronicity === "chronic";
	const lesionFill = isChronic ? "url(#dente-caries-chronic)" : "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const haloStroke = isDark ? "rgba(245, 158, 11, 0.70)" : "rgba(180, 83, 9, 0.85)";
	const deminStroke = isDark ? "rgba(253, 224, 71, 0.80)" : "rgba(217, 119, 6, 0.85)";
	const isSuper = cariesDepth === "superficial" || cariesDepth === "superficialis";
	const isProfunda = cariesDepth === "profunda";
	const isDestruct = cariesDepth === "destructive" || cariesType === "destructive";

	const isClass4 = cariesType === "class4";
	const isClass5 = cariesType === "class5";
	const isWhiteSpot = cariesType === "white_spot";
	const isClass2or3 = !isClass4 && !isClass5 && !isWhiteSpot && !isDestruct;

	const hasM = cariesType === "class2_m" || cariesType === "class2_mo" || cariesType === "class2_mod" ||
		cariesSurface === "M" || cariesSurface === "mesial" ||
		(!cariesSurface && isClass2or3);
	const hasD = cariesType === "class2_d" || cariesType === "class2_do" || cariesType === "class2_mod" ||
		cariesSurface === "D" || cariesSurface === "distal";

	return (
		<g id="tooth11-caries-overlay" {...(className ? { className } : {})}>
			{isWhiteSpot && (
				<g id="tooth11-caries-white-spot">
					<path d={g.whiteSpot.halo} fill="url(#dente-caries-white-spot)" stroke="rgba(255, 255, 255, 0.75)" strokeWidth="0.5" />
					<path d={g.whiteSpot.core} fill="#ffffff" fillOpacity="0.80" />
				</g>
			)}
			{isDestruct && (
				<g id="tooth11-caries-destructive">
					<path d={g.destructive.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.95)" strokeWidth="1.2" />
					<path d={g.destructive.border} fill="none" stroke="#0c0a09" strokeWidth="1.2" strokeLinecap="round" />
					{g.destructive.steps.map((s, i) => (
						<path key={i} d={s} fill="none" stroke={isDark ? "#f1f5f9" : "#ffffff"} strokeWidth="0.8" strokeLinecap="round" />
					))}
				</g>
			)}
			{cariesType === "class1" && (
				<g id="tooth11-caries-class1">
					<path d={g.class2.mesial.halo} fill={isSuper ? "url(#dente-caries-demin)" : "url(#dente-caries-halo-11)"} stroke={isSuper ? deminStroke : haloStroke} strokeWidth="0.5" />
					{!isSuper && <path d={g.class2.mesial.core} fill={lesionFill} stroke="rgba(69, 26, 3, 0.90)" strokeWidth="0.75" />}
					{isProfunda && <path d={g.class2.mesial.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
				</g>
			)}
			{isClass2or3 && cariesType !== "class1" && (
				<g id="tooth11-caries-class2">
					{hasM && (
						<g id="tooth11-c2-mesial">
							<path d={g.class2.mesial.halo} fill={isSuper ? "url(#dente-caries-demin)" : "url(#dente-caries-halo-11)"} stroke={isSuper ? deminStroke : haloStroke} strokeWidth="0.5" />
							{!isSuper && <path d={g.class2.mesial.core} fill={lesionFill} stroke="rgba(69, 26, 3, 0.90)" strokeWidth="0.75" />}
							{isProfunda && <path d={g.class2.mesial.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
						</g>
					)}
					{hasD && (
						<g id="tooth11-c2-distal">
							<path d={g.class2.distal.halo} fill={isSuper ? "url(#dente-caries-demin)" : "url(#dente-caries-halo-11)"} stroke={isSuper ? deminStroke : haloStroke} strokeWidth="0.5" />
							{!isSuper && <path d={g.class2.distal.core} fill={lesionFill} stroke="rgba(69, 26, 3, 0.90)" strokeWidth="0.75" />}
							{isProfunda && <path d={g.class2.distal.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
						</g>
					)}
				</g>
			)}
			{isClass4 && (
				<g id="tooth11-caries-class4">
					<path d={g.class4.angleDefect.halo} fill={isSuper ? "url(#dente-caries-demin)" : "url(#dente-caries-halo-11)"} stroke={isSuper ? deminStroke : haloStroke} strokeWidth="0.5" />
					{!isSuper && <path d={g.class4.angleDefect.core} fill={lesionFill} stroke="rgba(69, 26, 3, 0.90)" strokeWidth="0.75" />}
					{isProfunda && <path d={g.class4.angleDefect.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
				</g>
			)}
			{isClass5 && (
				<g id="tooth11-caries-class5">
					<path d={isProfunda ? g.class5.profunda.halo : isSuper ? g.class5.superficial.halo : g.class5.media.halo} fill={isSuper ? "url(#dente-caries-demin)" : "url(#dente-caries-halo-11)"} stroke={isSuper ? deminStroke : haloStroke} strokeWidth="0.5" />
					{!isSuper && <path d={isProfunda ? g.class5.profunda.crater : g.class5.media.crater} fill={lesionFill} stroke="rgba(69, 26, 3, 0.90)" strokeWidth="0.75" />}
					{isProfunda && <path d={g.class5.profunda.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
				</g>
			)}
		</g>
	);
};
