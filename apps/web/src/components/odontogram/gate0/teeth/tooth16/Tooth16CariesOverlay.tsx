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
							<path d="M 38,122 C 44,120 54,120 60,124 C 54,130 44,130 38,122 Z" fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 40,123 C 44,121 52,121 56,124 C 52,128 44,128 40,123 Z" fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.5" />}
							{isProfunda && <circle cx={48} cy={125} r="2.2" fill={necroticFill} stroke="#0c0a09" strokeWidth="0.4" />}
						</>
					) : (
						<g id="tooth16-caries-c1-destruct">
							<path d="M 36,118 C 44,116 54,116 62,120 C 66,130 58,140 48,140 C 38,140 32,130 36,118 Z" fill={necroticFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="1.2" />
						</g>
					)}
				</g>
			)}

			{/* Class II: Proximal (M, D, MO, DO, MOD) */}
			{Boolean(cariesType?.startsWith("class2")) && (
				<g id="tooth16-caries-class2">
					{(cariesType === "class2_m" || cariesType === "class2_mo" || cariesType === "class2_mod") && (
						<g id="tooth16-caries-c2-mesial">
							<path d="M 14,118 C 12,124 13,134 16,138 C 20,136 21,126 18,120 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 14.5,121 C 13,125 14,132 16,135 C 18.5,133 19,127 17,122 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={15.5} cy={127} r="1.8" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_d" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<g id="tooth16-caries-c2-distal">
							<path d="M 86,114 C 88,120 87,130 84,135 C 80,133 80,122 83,116 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 85.5,117 C 87,121 86,128 84,132 C 81.5,130 81.5,123 83.5,118 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={84.5} cy={124} r="1.8" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_mo" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<path d="M 24,124 C 36,122 64,124 76,126" stroke={lesionFill} strokeWidth="2.0" strokeLinecap="round" fill="none" />
					)}
				</g>
			)}

			{/* Class V: Cervical Notch near CEJ */}
			{cariesType === "class5" && (
				<g id="tooth16-caries-class5">
					<path d="M 20,98 C 35,95 65,95 80,98 C 75,103 25,103 20,98 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
					{!isSuperficial && <path d="M 26,98.5 C 38,96.5 62,96.5 74,98.5 C 70,101.5 30,101.5 26,98.5 Z" fill={lesionFill} />}
					{isProfunda && <path d="M 34,98.8 C 42,97.5 58,97.5 66,98.8 C 63,100.5 37,100.5 34,98.8 Z" fill={necroticFill} />}
				</g>
			)}
		</g>
	);
};
