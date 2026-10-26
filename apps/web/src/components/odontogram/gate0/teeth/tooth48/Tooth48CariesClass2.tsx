import type React from "react";
import { TOOTH48_CARIES_GEOMETRY } from "./tooth48CariesGeometry";
import type { CariesDepth, CariesType } from "../../tooth46PresetTypes";

export interface Tooth48CariesClass2Props {
	cariesType: CariesType;
	lesionFill: string;
	necroticFill: string;
	haloStroke: string;
	cariesDepth?: CariesDepth | undefined;
	isDark?: boolean | undefined;
}

/**
 * Class II Proximal Caries for Tooth 48: M, D, MO, DO, and MOD with 4 depth levels.
 * Mandate 8b <= 120 lines.
 */
export const Tooth48CariesClass2: React.FC<Tooth48CariesClass2Props> = ({
	cariesType,
	lesionFill,
	necroticFill,
	haloStroke,
	cariesDepth,
	isDark = false,
}) => {
	const sp = TOOTH48_CARIES_GEOMETRY;
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
			{!isDestructive && (
				<>
					{hasM && (
						<g id="tooth48-caries-class2-m">
							<path d={sp.class2M.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={sp.class2M.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={sp.class2M.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</g>
					)}
					{hasD && (
						<g id="tooth48-caries-class2-d">
							<path d={sp.class2D.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={sp.class2D.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={sp.class2D.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</g>
					)}
					{hasMO && (
						<g id="tooth48-caries-class2-mo">
							<path d={sp.class2Mo.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={sp.class2Mo.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={sp.class2Mo.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</g>
					)}
					{hasDO && (
						<g id="tooth48-caries-class2-do">
							<path d={sp.class2Do.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={sp.class2Do.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={sp.class2Do.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</g>
					)}
					{hasMOD && (
						<g id="tooth48-caries-class2-mod-isthmus">
							<path d={sp.class2ModBridge.halo} fill="url(#dente-caries-demin)" stroke={isSuperficial ? "#1c1917" : haloStroke} strokeWidth={isSuperficial ? "1.0" : "0.5"} />
							{!isSuperficial && <path d={sp.class2ModBridge.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.9)" strokeWidth="0.6" />}
							{isProfunda && <path d={sp.class2ModBridge.necrotic} fill={necroticFill} stroke="#0c0a09" />}
						</g>
					)}
				</>
			)}

			{isDestructive && (
				<g id="tooth48-caries-destructive">
					<path d={dest.fractureMargin} fill="none" stroke="rgba(120, 53, 15, 0.95)" strokeWidth="2.2" strokeLinecap="round" />
					<path d={dest.fractureMargin} fill="none" stroke="#0c0a09" strokeWidth="1.0" strokeLinecap="round" />
					{dest.fractureSteps.map((s, idx) => (
						<path key={`step-${idx}`} d={s} fill="none" stroke={isDark ? "#f1f5f9" : "#ffffff"} strokeWidth="0.85" strokeLinecap="round" />
					))}
				</g>
			)}
		</>
	);
};
