import React from "react";
import { TOOTH46_CARIES_DESTRUCTIVE_GEOMETRY } from "./Tooth46CariesDestructiveGeometry";
import { TOOTH46_CARIES_GEOMETRY } from "./Tooth46CariesGeometry";
import type { CariesDepth } from "./tooth46PresetTypes";

export interface Tooth46CariesClass1Props {
	lesionFill: string;
	necroticFill: string;
	haloStroke: string;
	cariesDepth?: CariesDepth | undefined;
	isDark?: boolean;
	showBuccalPit?: boolean;
	isDestructive?: boolean;
}

/**
 * Class I Fissure Caries & Foramen Caecum lesion
 * Mandate 8b <= 120 lines.
 */
export const Tooth46CariesClass1: React.FC<Tooth46CariesClass1Props> = ({
	lesionFill,
	necroticFill,
	haloStroke,
	cariesDepth,
	isDark = false,
	showBuccalPit = true,
	isDestructive = false,
}) => {
	const c1 = TOOTH46_CARIES_GEOMETRY;
	const isSuperficial = cariesDepth === "superficial";
	const isDestruct = isDestructive || cariesDepth === "destructive";
	const isProfunda = cariesDepth === "profunda";
	const destr = TOOTH46_CARIES_DESTRUCTIVE_GEOMETRY.destructive;

	const deminStroke = isDark ? "rgba(253, 224, 71, 0.80)" : "rgba(217, 119, 6, 0.85)";

	return (
		<g id="tooth46-caries-class1">
			{/* Non-destructive depths: superficial, media, profunda */}
			{!isDestruct && (
				<>
					<path d={c1.demineralizedHalo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth={isSuperficial ? "0.8" : "0.6"} />
					{!isSuperficial && (
						<path d={c1.dendriticCariesPath} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.8" />
					)}
					{isProfunda && (
						<path d={c1.necroticCore} fill={necroticFill} stroke="rgba(12, 10, 9, 0.98)" strokeWidth="0.8" />
					)}
					<path
						d={c1.buccalGrooveTrace} fill="none"
						stroke={isSuperficial ? deminStroke : isDark ? "rgba(120, 53, 15, 0.70)" : "rgba(146, 64, 14, 0.80)"}
						strokeWidth={isSuperficial ? "0.8" : "0.7"} strokeLinecap="round"
					/>
					{showBuccalPit && (
						<g id="tooth46-buccal-caecum">
							<path d={c1.buccalPitCavity.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth="0.5" />
							{!isSuperficial && <path d={c1.buccalPitCavity.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={c1.buccalPitCavity.necroticCenter} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
						</g>
					)}
				</>
			)}

			{/* Destructive Stage 4: exposed necrotic dentin crater + enamel fracture margin */}
			{isDestruct && (
				<g id="tooth46-caries-class1-destructive">
					<path d={TOOTH46_CARIES_DESTRUCTIVE_GEOMETRY.destructiveCutout} fill={lesionFill} stroke="rgba(120, 53, 15, 0.95)" strokeWidth="0.8" />
					<path d={destr.fractureMargin} fill="none" stroke="#0c0a09" strokeWidth="1.2" strokeLinecap="round" />
					{destr.fractureSteps.map((s, idx) => (
						<path key={`c1-step-${idx}`} d={s} fill="none" stroke={isDark ? "#f1f5f9" : "#ffffff"} strokeWidth="0.85" strokeLinecap="round" />
					))}
				</g>
			)}
		</g>
	);
};
