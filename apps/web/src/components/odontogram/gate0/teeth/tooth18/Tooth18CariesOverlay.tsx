import React from "react";
import type { CariesChronicity, CariesDepth, CariesType } from "../../tooth46PresetTypes";

export interface Tooth18CariesOverlayProps {
	cariesType?: CariesType | undefined;
	cariesDepth?: CariesDepth | undefined;
	chronicity?: CariesChronicity | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth18CariesOverlay: React.FC<Tooth18CariesOverlayProps> = ({
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
		<g id="tooth18-caries-overlay" data-caries-type={cariesType} data-caries-depth={cariesDepth} className={className} clipPath="url(#tooth18-crown-clip)">
			{/* Class I: Central Fossa & Fissures */}
			{(!cariesType || cariesType === "class1") && (
				<g id="tooth18-caries-class1">
					{!isDestructive ? (
						<>
							<path d="M 40,123 C 46,121 54,121 59,125 C 53,131 46,131 40,123 Z" fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 42,124 C 46,122 52,122 56,125 C 52,129 46,129 42,124 Z" fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.5" />}
							{isProfunda && <circle cx={49} cy={126} r="2.0" fill={necroticFill} stroke="#0c0a09" strokeWidth="0.4" />}
						</>
					) : (
						<g id="tooth18-caries-c1-destruct">
							<path d="M 40,118 C 47,116 55,116 62,120 C 65,130 58,138 49,138 C 41,138 36,130 40,118 Z" fill={necroticFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="1.2" />
						</g>
					)}
				</g>
			)}

			{/* Class II: Proximal (M, D, MO, DO, MOD) */}
			{Boolean(cariesType?.startsWith("class2")) && (
				<g id="tooth18-caries-class2">
					{(cariesType === "class2_m" || cariesType === "class2_mo" || cariesType === "class2_mod") && (
						<g id="tooth18-caries-c2-mesial">
							<path d="M 18,118 C 16,124 17,133 20,137 C 23,135 24,126 21,120 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 18.5,121 C 17,125 18,131 20,134 C 22,132 22.5,127 20.5,122 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={19.5} cy={126} r="1.6" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_d" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<g id="tooth18-caries-c2-distal">
							<path d="M 80,116 C 82,122 81,130 78,134 C 74,132 74,122 77,117 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 79.5,119 C 81,123 80,128 78,131 C 75.5,129 75.5,123 77.5,119 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={78.5} cy={124} r="1.6" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_mo" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<path d="M 27,124 C 38,122 60,124 70,126" stroke={lesionFill} strokeWidth="1.9" strokeLinecap="round" fill="none" />
					)}
				</g>
			)}

			{/* Class V: Cervical Notch near CEJ */}
			{cariesType === "class5" && (
				<g id="tooth18-caries-class5">
					<path d="M 24,98 C 38,95 62,95 76,98 C 71,103 29,103 24,98 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
					{!isSuperficial && <path d="M 30,98.5 C 40,96.5 60,96.5 70,98.5 C 66,101.5 34,101.5 30,98.5 Z" fill={lesionFill} />}
					{isProfunda && <path d="M 38,98.8 C 44,97.5 56,97.5 62,98.8 C 59,100.5 41,100.5 38,98.8 Z" fill={necroticFill} />}
				</g>
			)}
		</g>
	);
};
