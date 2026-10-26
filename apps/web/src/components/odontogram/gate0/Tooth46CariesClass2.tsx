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
 * Class II Proximal Box Caries: MO, DO, and MOD
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
	const showNecrotic = cariesDepth === "profunda" || cariesDepth === "destructive" || !cariesDepth;

	return (
		<>
			{(cariesType === "class2_mo" || cariesType === "class2_mod") && (
				<g id="tooth46-caries-class2-mo">
					<path d={sp.class2Mo.halo} fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.5" />
					{!isSuperficial && (
						<path d={sp.class2Mo.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.85)" strokeWidth="0.5" />
					)}
					{showNecrotic && <path d={sp.class2Mo.necrotic} fill={necroticFill} stroke="#1c1917" />}
				</g>
			)}

			{(cariesType === "class2_do" || cariesType === "class2_mod") && (
				<g id="tooth46-caries-class2-do">
					<path d={sp.class2Do.halo} fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.5" />
					{!isSuperficial && (
						<path d={sp.class2Do.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.85)" strokeWidth="0.5" />
					)}
					{showNecrotic && <path d={sp.class2Do.necrotic} fill={necroticFill} stroke="#1c1917" />}
				</g>
			)}

			{cariesType === "class2_mod" && (
				<g id="tooth46-caries-class2-mod-isthmus">
					<path d={sp.class2ModBridge.halo} fill="url(#dente-caries-demin)" />
					{!isSuperficial && <path d={sp.class2ModBridge.crater} fill={lesionFill} />}
					{showNecrotic && <path d={sp.class2ModBridge.necrotic} fill={necroticFill} />}
				</g>
			)}

			{cariesDepth === "destructive" && (
				<g id="tooth46-caries-destructive">
					<path d={sp.destructive.halo} fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.5" />
					<path d={sp.destructive.crater} fill={lesionFill} stroke="rgba(120, 53, 15, 0.85)" strokeWidth="0.55" />
					<path d={sp.destructive.profunda} fill={necroticFill} stroke="rgba(28, 25, 23, 0.95)" strokeWidth="0.5" />
					{sp.destructive.fractureSteps.map((s, idx) => (
						<path key={`step-${idx}`} d={s} fill="none" stroke="#ffffff" strokeWidth="0.75" strokeLinecap="round" />
					))}
				</g>
			)}
		</>
	);
};
