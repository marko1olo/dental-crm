import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";
import { TOOTH15_GEOMETRY } from "./tooth15Geometry";

export interface Tooth15CariesOverlayProps {
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Organic Fissure, Proximal & Cervical Caries Spectrum for Tooth 15
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 218".
 */
export const Tooth15CariesOverlay: React.FC<Tooth15CariesOverlayProps> = ({
	cariesType = "class1",
	cariesDepth = "media",
	chronicity = "acute",
	isDark = false,
	className,
}) => {
	const c = TOOTH15_GEOMETRY.cariesGeometry;
	const isChronic = chronicity === "chronic";
	const lesionFill = isChronic ? "url(#dente-caries-chronic)" : "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const haloStroke = isDark ? "rgba(245, 158, 11, 0.70)" : "rgba(180, 83, 9, 0.85)";
	const isSuperficial = cariesDepth === "superficial";
	const isProfunda = cariesDepth === "profunda";

	const isClass1 = cariesType === "class1";
	const isClass5 = cariesType === "class5";
	const isProximal = Boolean(cariesType?.startsWith("class2"));
	const hasMesial = isProximal && (cariesType === "class2_m" || cariesType === "class2_mo" || cariesType === "class2_mod");
	const hasDistal = isProximal && (cariesType === "class2_d" || cariesType === "class2_do" || cariesType === "class2_mod");

	return (
		<g
			id="tooth15-caries-overlay"
			data-caries-type={cariesType}
			data-caries-depth={cariesDepth}
			data-caries-chronicity={chronicity}
			className={className}
			clipPath="url(#tooth15-crown-clip)"
		>
			{/* Class I Occlusal Fissure Caries */}
			{isClass1 && (
				<g id="tooth15-caries-class1">
					<path d={c.class1.halo} fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.5" />
					{!isSuperficial && <path d={c.class1.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.6" />}
					{isProfunda && <path d={c.class1.profunda} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
				</g>
			)}

			{/* Class II Proximal Lesions (M, D, MO, DO, MOD) */}
			{isProximal && (
				<g id="tooth15-caries-class2">
					{hasMesial && (
						<g id="tooth15-caries-c2-mesial">
							<path d={c.mesialBox} fill={lesionFill} stroke={haloStroke} strokeWidth="0.6" />
							{isProfunda && <ellipse cx="27" cy="126" rx="2.5" ry="3.5" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_mo" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<path d={c.class1.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.6" />
					)}
					{hasDistal && (
						<g id="tooth15-caries-c2-distal">
							<path d={c.distalBox} fill={lesionFill} stroke={haloStroke} strokeWidth="0.6" />
							{isProfunda && <ellipse cx="71" cy="126" rx="2.5" ry="3.5" fill={necroticFill} />}
						</g>
					)}
				</g>
			)}

			{/* Class V Cervical Defect at CEJ */}
			{isClass5 && (
				<g id="tooth15-caries-class5">
					<path d={c.class5.halo} fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.5" />
					{!isSuperficial && <path d={c.class5.crater} fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.6" />}
					{isProfunda && <path d={c.class5.profunda} fill={necroticFill} stroke="#0c0a09" strokeWidth="0.5" />}
				</g>
			)}
		</g>
	);
};
