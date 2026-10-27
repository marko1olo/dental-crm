import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";

export interface Tooth16CariesOverlayProps {
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth16CariesOverlay: React.FC<Tooth16CariesOverlayProps> = ({
	cariesType = "class1",
	cariesDepth = "media",
	chronicity = "acute",
	isDark = false,
	className,
}) => {
	const isChronic = chronicity === "chronic";
	const lesionFill = isChronic ? "url(#dente-caries-chronic)" : "url(#dente-caries-lesion)";
	const necroticFill = isChronic ? "#0c0a09" : "url(#dente-caries-necrotic)";
	const haloStroke = isDark ? "rgba(245, 158, 11, 0.70)" : "rgba(180, 83, 9, 0.85)";
	const isSuperficial = cariesDepth === "superficial";
	const isProfunda = cariesDepth === "profunda";
	const isDestructive = cariesDepth === "destructive";
	const deminStroke = isDark ? "rgba(253, 224, 71, 0.80)" : "rgba(217, 119, 6, 0.85)";

	return (
		<g id="tooth16-caries-overlay" data-caries-type={cariesType} data-caries-depth={cariesDepth} className={className} clipPath="url(#tooth16-crown-clip)">
			{/* Class I: Central Fossa & Fissures */}
			{(!cariesType || cariesType === "class1") && (
				<g id="tooth16-caries-class1">
					{!isDestructive ? (
						<>
							<path d="M 38,108 C 44,105 54,105 60,110 C 54,116 44,116 38,108 Z" fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 40,109 C 44,107 52,107 56,110 C 52,114 44,114 40,109 Z" fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.5" />}
							{isProfunda && <circle cx={48} cy={111} r="2.2" fill={necroticFill} stroke="#0c0a09" strokeWidth="0.4" />}
						</>
					) : (
						<g id="tooth16-caries-c1-destruct">
							<path d="M 36,104 C 44,102 54,102 62,106 C 66,116 58,126 48,126 C 38,126 32,116 36,104 Z" fill={necroticFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="1.2" />
						</g>
					)}
				</g>
			)}

			{/* Class II: Proximal (M, D, MO, DO, MOD) */}
			{Boolean(cariesType?.startsWith("class2")) && (
				<g id="tooth16-caries-class2">
					{(cariesType === "class2_m" || cariesType === "class2_mo" || cariesType === "class2_mod") && (
						<g id="tooth16-caries-c2-mesial">
							<path d="M 14,106 C 12,112 13,122 16,126 C 20,124 21,114 18,108 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 14.5,109 C 13,113 14,120 16,123 C 18.5,121 19,115 17,110 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={15.5} cy={115} r="1.8" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_d" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<g id="tooth16-caries-c2-distal">
							<path d="M 86,104 C 88,110 87,120 84,125 C 80,123 80,112 83,106 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 85.5,107 C 87,111 86,118 84,122 C 81.5,120 81.5,113 83.5,108 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={84.5} cy={114} r="1.8" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_mo" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<path d="M 24,110 C 36,108 64,110 76,112" stroke={lesionFill} strokeWidth="2.0" strokeLinecap="round" fill="none" />
					)}
				</g>
			)}

			{/* Class V: Cervical Notch near CEJ */}
			{cariesType === "class5" && (
				<g id="tooth16-caries-class5">
					<path d="M 20,76 C 35,73 65,73 80,76 C 75,81 25,81 20,76 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
					{!isSuperficial && <path d="M 26,76.5 C 38,74.5 62,74.5 74,76.5 C 70,79.5 30,79.5 26,76.5 Z" fill={lesionFill} />}
					{isProfunda && <path d="M 34,76.8 C 42,75.5 58,75.5 66,76.8 C 63,78.5 37,78.5 34,76.8 Z" fill={necroticFill} />}
				</g>
			)}
		</g>
	);
};
