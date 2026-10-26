import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { Tooth44CariesClass2 } from "./Tooth44CariesClass2";
import { TOOTH44_CARIES_GEOMETRY } from "./tooth44CariesGeometry";

export interface Tooth44CariesOverlayProps {
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Fissure, Proximal & Cervical Caries Spectrum for Tooth 44
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth44CariesOverlay: React.FC<Tooth44CariesOverlayProps> = ({
	cariesType = "class1",
	cariesDepth = "media",
	chronicity = "acute",
	isDark = false,
	className,
}) => {
	const g = TOOTH44_CARIES_GEOMETRY;
	const isChronic = chronicity === "chronic";
	const lesionFill = isChronic ? "url(#dente-caries-chronic)" : "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const haloStroke = isDark ? "rgba(245, 158, 11, 0.70)" : "rgba(180, 83, 9, 0.85)";
	const isSuperficial = cariesDepth === "superficial";
	const isProfunda = cariesDepth === "profunda" || (!cariesDepth && cariesDepth !== "media" && cariesDepth !== "superficial" && cariesDepth !== "destructive");
	const isDestructive = cariesDepth === "destructive";

	return (
		<g
			id="tooth44-caries-overlay"
			data-caries-type={cariesType}
			data-caries-depth={cariesDepth}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth44-crown-clip)"
		>
			{/* Class I Snake-Eyes Occlusal Pits across Crista Transversa */}
			{cariesType === "class1" && (
				<g id="tooth44-caries-class1">
					{!isDestructive ? (
						<>
							<path d={g.class1.mesial.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={g.class1.mesial.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={g.class1.mesial.profunda} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
							<path d={g.class1.distal.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={g.class1.distal.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={g.class1.distal.profunda} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
						</>
					) : (
						<g id="tooth44-caries-class1-destructive">
							<path d={g.destructive.fractureMargin} fill="none" stroke="rgba(120, 53, 15, 0.95)" strokeWidth="2.2" strokeLinecap="round" />
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
				<Tooth44CariesClass2
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
				<g id="tooth44-caries-cervical">
					{!isDestructive ? (
						<>
							<path d={g.class5.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={g.class5.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={g.class5.profunda} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
						</>
					) : (
						<g id="tooth44-caries-c5-destructive">
							<path d={g.class5.fractureMargin} fill="none" stroke="rgba(120, 53, 15, 0.95)" strokeWidth="2.2" strokeLinecap="round" />
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
