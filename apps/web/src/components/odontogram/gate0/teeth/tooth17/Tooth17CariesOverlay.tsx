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
							<path d="M 39,122 C 45,120 53,120 59,124 C 53,130 45,130 39,122 Z" fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 41,123 C 45,121 51,121 55,124 C 51,128 45,128 41,123 Z" fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.5" />}
							{isProfunda && <circle cx={48} cy={125} r="2.0" fill={necroticFill} stroke="#0c0a09" strokeWidth="0.4" />}
						</>
					) : (
						<g id="tooth17-caries-c1-destruct">
							<path d="M 38,118 C 45,116 53,116 60,120 C 64,130 57,139 48,139 C 39,139 34,130 38,118 Z" fill={necroticFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="1.2" />
						</g>
					)}
				</g>
			)}

			{/* Class II: Proximal (M, D, MO, DO, MOD) */}
			{Boolean(cariesType?.startsWith("class2")) && (
				<g id="tooth17-caries-class2">
					{(cariesType === "class2_m" || cariesType === "class2_mo" || cariesType === "class2_mod") && (
						<g id="tooth17-caries-c2-mesial">
							<path d="M 16,118 C 14,124 15,133 18,137 C 21,135 22,126 19,120 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 16.5,121 C 15,125 16,131 18,134 C 20,132 20.5,127 18.5,122 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={17.5} cy={126} r="1.7" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_d" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<g id="tooth17-caries-c2-distal">
							<path d="M 83,115 C 85,121 84,130 81,134 C 77,132 77,122 80,117 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 82.5,118 C 84,122 83,128 81,131 C 78.5,129 78.5,123 80.5,119 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={81.5} cy={124} r="1.7" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_mo" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<path d="M 25,124 C 36,122 62,124 73,126" stroke={lesionFill} strokeWidth="1.9" strokeLinecap="round" fill="none" />
					)}
				</g>
			)}

			{/* Class V: Cervical Notch near CEJ */}
			{cariesType === "class5" && (
				<g id="tooth17-caries-class5">
					<path d="M 22,98 C 36,95 64,95 78,98 C 73,103 27,103 22,98 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
					{!isSuperficial && <path d="M 28,98.5 C 39,96.5 61,96.5 72,98.5 C 68,101.5 32,101.5 28,98.5 Z" fill={lesionFill} />}
					{isProfunda && <path d="M 36,98.8 C 43,97.5 57,97.5 64,98.8 C 61,100.5 39,100.5 36,98.8 Z" fill={necroticFill} />}
				</g>
			)}
		</g>
	);
};
