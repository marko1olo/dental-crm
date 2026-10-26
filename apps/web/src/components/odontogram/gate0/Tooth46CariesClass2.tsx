import type React from "react";
import { TOOTH46_CARIES_SPECTRUM_GEOMETRY } from "./Tooth46CariesSpectrumGeometry";
import type { CariesDepth, CariesType } from "./tooth46PresetTypes";

export interface Tooth46CariesClass2Props {
	cariesType: CariesType;
	lesionFill: string;
	necroticFill: string;
	haloStroke: string;
	cariesDepth?: CariesDepth | undefined;
}

/**
 * Class II Proximal Box Caries: M, D, MO, DO, and MOD with 4-5 depth levels.
 * Mandate 8b <= 120 lines.
 */
export const Tooth46CariesClass2: React.FC<Tooth46CariesClass2Props> = ({
	cariesType,
	lesionFill,
	necroticFill,
	haloStroke,
	cariesDepth,
}) => {
	const sp = TOOTH46_CARIES_SPECTRUM_GEOMETRY;
	const isSuperficial = cariesDepth === "superficial";
	const isProfunda = cariesDepth === "profunda" || (!cariesDepth && cariesDepth !== "media" && cariesDepth !== "superficial" && cariesDepth !== "destructive");
	const isDestructive = cariesDepth === "destructive";

	const isM = cariesType === "class2_m";
	const isD = cariesType === "class2_d";
	const isMO = cariesType === "class2_mo";
	const isDO = cariesType === "class2_do";
	const isMOD = cariesType === "class2_mod";

	const hasM = isM;
	const hasD = isD;
	const hasMO = isMO || isMOD;
	const hasDO = isDO || isMOD;
	const hasMOD = isMOD;

	const dest = isMOD
		? sp.destructiveMOD
		: isMO
		? sp.destructiveMO
		: isDO
		? sp.destructiveDO
		: isM
		? sp.destructiveM
		: isD
		? sp.destructiveD
		: sp.destructive;

	return (
		<>
			{/* Non-destructive Stage 1..3 */}
			{!isDestructive && (
				<>
					{hasM && (
						<g id="tooth46-caries-class2-m">
							<path d={sp.class2M.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={sp.class2M.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={sp.class2M.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</g>
					)}
					{hasD && (
						<g id="tooth46-caries-class2-d">
							<path d={sp.class2D.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={sp.class2D.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={sp.class2D.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</g>
					)}
					{hasMO && (
						<g id="tooth46-caries-class2-mo">
							<path d={sp.class2Mo.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={sp.class2Mo.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={sp.class2Mo.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</g>
					)}
					{hasDO && (
						<g id="tooth46-caries-class2-do">
							<path d={sp.class2Do.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={sp.class2Do.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={sp.class2Do.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</g>
					)}
					{hasMOD && (
						<g id="tooth46-caries-class2-mod-isthmus">
							<path d={sp.class2ModBridge.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={sp.class2ModBridge.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={sp.class2ModBridge.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</g>
					)}
				</>
			)}

			{/* Destructive Stage 4: physical cutout into transparency, NO filled blob over void! */}
			{isDestructive && (
				<g id="tooth46-caries-destructive">
					<path d={dest.fractureMargin} fill="none" stroke="rgba(120, 53, 15, 0.95)" strokeWidth="2.2" strokeLinecap="round" />
					<path d={dest.fractureMargin} fill="none" stroke="#0c0a09" strokeWidth="1.0" strokeLinecap="round" />
					{dest.fractureSteps.map((s, idx) => (
						<path key={`step-${idx}`} d={s} fill="none" stroke="#ffffff" strokeWidth="0.85" strokeLinecap="round" />
					))}
				</g>
			)}
		</>
	);
};
