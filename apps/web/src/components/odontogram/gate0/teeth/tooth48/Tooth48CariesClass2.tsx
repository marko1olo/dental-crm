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
	cariesDepth,
}) => {
	const sp = TOOTH48_CARIES_GEOMETRY;
	const isSuperficial = cariesDepth === "superficial";
	const isProfunda = cariesDepth === "profunda";
	const isDestructive = cariesDepth === "destructive";
	const deminStroke = "rgba(217, 119, 6, 0.75)";

	const isM = cariesType === "class2_m";
	const isD = cariesType === "class2_d";
	const isMO = cariesType === "class2_mo";
	const isDO = cariesType === "class2_do";
	const isMOD = cariesType === "class2_mod";

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
					{isM && (
						<g id="tooth48-caries-class2-m">
							<path d={sp.class2M.halo} fill="url(#dente-caries-demin)" stroke={deminStroke} strokeWidth="0.8" />
							{!isSuperficial && <path d={sp.class2M.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.8" />}
							{isProfunda && <path d={sp.class2M.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.7" />}
						</g>
					)}
					{isD && (
						<g id="tooth48-caries-class2-d">
							<path d={sp.class2D.halo} fill="url(#dente-caries-demin)" stroke={deminStroke} strokeWidth="0.8" />
							{!isSuperficial && <path d={sp.class2D.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.8" />}
							{isProfunda && <path d={sp.class2D.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.7" />}
						</g>
					)}
					{isMO && (
						<g id="tooth48-caries-class2-mo">
							<path d={sp.class2Mo.halo} fill="url(#dente-caries-demin)" stroke={deminStroke} strokeWidth="0.8" />
							{!isSuperficial && <path d={sp.class2Mo.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.8" />}
							{isProfunda && <path d={sp.class2Mo.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.7" />}
						</g>
					)}
					{isDO && (
						<g id="tooth48-caries-class2-do">
							<path d={sp.class2Do.halo} fill="url(#dente-caries-demin)" stroke={deminStroke} strokeWidth="0.8" />
							{!isSuperficial && <path d={sp.class2Do.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.8" />}
							{isProfunda && <path d={sp.class2Do.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.7" />}
						</g>
					)}
					{isMOD && (
						<g id="tooth48-caries-class2-mod">
							<path d={sp.class2Mod.halo} fill="url(#dente-caries-demin)" stroke={deminStroke} strokeWidth="0.8" />
							{!isSuperficial && <path d={sp.class2Mod.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.8" />}
							{isProfunda && <path d={sp.class2Mod.necrotic} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.7" />}
						</g>
					)}
				</>
			)}

			{isDestructive && (
				<g id="tooth48-caries-destructive">
					<path d={dest.fractureMargin} fill="none" stroke="rgba(154, 52, 18, 0.95)" strokeWidth="2.4" strokeLinecap="round" />
					<path d={dest.fractureMargin} fill="none" stroke="#0c0a09" strokeWidth="1.2" strokeLinecap="round" />
					{dest.fractureSteps.map((s, idx) => (
						<path key={`step-${idx}`} d={s} fill="none" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />
					))}
				</g>
			)}
		</>
	);
};
