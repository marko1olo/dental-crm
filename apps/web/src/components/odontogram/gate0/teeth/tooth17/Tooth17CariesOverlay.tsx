import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";

export interface Tooth17CariesOverlayProps {
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth17CariesOverlay: React.FC<Tooth17CariesOverlayProps> = ({
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
		<g id="tooth17-caries-overlay" data-caries-type={cariesType} data-caries-depth={cariesDepth} className={className} clipPath="url(#tooth17-crown-clip)">
			{/* Class I: Central Fossa & Fissures */}
			{(!cariesType || cariesType === "class1") && (
				<g id="tooth17-caries-class1">
					{!isDestructive ? (
						<>
							<path d="M 38,107 C 44,104 53,104 59,109 C 53,115 44,115 38,107 Z" fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 40,108 C 44,106 51,106 55,109 C 51,113 44,113 40,108 Z" fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.5" />}
							{isProfunda && <circle cx={47} cy={110} r="2.2" fill={necroticFill} stroke="#0c0a09" strokeWidth="0.4" />}
						</>
					) : (
						<g id="tooth17-caries-c1-destruct">
							<path d="M 36,104 C 44,102 54,102 62,106 C 66,116 58,126 48,126 C 38,126 32,116 36,104 Z" fill={necroticFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="1.2" />
						</g>
					)}
				</g>
			)}

			{/* Class II: Proximal (M, D, MO, DO, MOD) */}
			{Boolean(cariesType?.startsWith("class2")) && (
				<g id="tooth17-caries-class2">
					{(cariesType === "class2_m" || cariesType === "class2_mo" || cariesType === "class2_mod") && (
						<g id="tooth17-caries-c2-mesial">
							<path d="M 16,106 C 14,112 15,121 18,125 C 22,123 23,113 20,107 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 16.5,109 C 15,113 16,119 18,122 C 20.5,120 21,114 19,109 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={17.5} cy={114} r="1.8" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_d" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<g id="tooth17-caries-c2-distal">
							<path d="M 84,104 C 86,110 85,119 82,124 C 78,122 78,111 81,105 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 83.5,107 C 85,111 84,117 82,121 C 79.5,119 79.5,112 81.5,107 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={82.5} cy={113} r="1.8" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_mo" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<path d="M 26,109 C 38,107 62,109 74,111" stroke={lesionFill} strokeWidth="2.0" strokeLinecap="round" fill="none" />
					)}
				</g>
			)}

			{/* Class V: Cervical Notch near CEJ */}
			{cariesType === "class5" && (
				<g id="tooth17-caries-class5">
					<path d="M 22,76 C 36,73 64,73 78,76 C 73,81 27,81 22,76 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
					{!isSuperficial && <path d="M 28,76.5 C 39,74.5 61,74.5 72,76.5 C 68,79.5 32,79.5 28,76.5 Z" fill={lesionFill} />}
					{isProfunda && <path d="M 36,76.8 C 43,75.5 57,75.5 64,76.8 C 61,78.5 39,78.5 36,76.8 Z" fill={necroticFill} />}
				</g>
			)}
		</g>
	);
};
