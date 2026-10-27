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
							<path d="M 40,106 C 45,103 53,103 58,108 C 53,113 45,113 40,106 Z" fill="url(#dente-caries-demin)" stroke={isSuperficial ? deminStroke : haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 42,107 C 45,105 51,105 55,108 C 51,111 45,111 42,107 Z" fill={lesionFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="0.5" />}
							{isProfunda && <circle cx={48} cy={109} r="2.0" fill={necroticFill} stroke="#0c0a09" strokeWidth="0.4" />}
						</>
					) : (
						<g id="tooth18-caries-c1-destruct">
							<path d="M 36,104 C 44,102 54,102 62,106 C 66,116 58,126 48,126 C 38,126 32,116 36,104 Z" fill={necroticFill} stroke="rgba(154, 52, 18, 0.95)" strokeWidth="1.2" />
						</g>
					)}
				</g>
			)}

			{/* Class II: Proximal (M, D, MO, DO, MOD) */}
			{Boolean(cariesType?.startsWith("class2")) && (
				<g id="tooth18-caries-class2">
					{(cariesType === "class2_m" || cariesType === "class2_mo" || cariesType === "class2_mod") && (
						<g id="tooth18-caries-c2-mesial">
							<path d="M 18,105 C 16,111 17,119 20,123 C 23,121 24,112 21,106 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 18.5,108 C 17,112 18,117 20,120 C 22,118 22.5,113 20.5,108 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={19.5} cy={113} r="1.6" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_d" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<g id="tooth18-caries-c2-distal">
							<path d="M 82,103 C 84,109 83,117 80,122 C 77,120 77,110 79,104 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
							{!isSuperficial && <path d="M 81.5,106 C 83,110 82,115 80,119 C 78,117 78,111 79.5,106 Z" fill={lesionFill} />}
							{isProfunda && <circle cx={80.5} cy={112} r="1.6" fill={necroticFill} />}
						</g>
					)}
					{(cariesType === "class2_mo" || cariesType === "class2_do" || cariesType === "class2_mod") && (
						<path d="M 28,108 C 38,106 60,108 70,110" stroke={lesionFill} strokeWidth="2.0" strokeLinecap="round" fill="none" />
					)}
				</g>
			)}

			{/* Class V: Cervical Notch near CEJ */}
			{cariesType === "class5" && (
				<g id="tooth18-caries-class5">
					<path d="M 24,76 C 36,73 62,73 76,76 C 71,81 29,81 24,76 Z" fill="url(#dente-caries-demin)" stroke={haloStroke} strokeWidth="0.6" />
					{!isSuperficial && <path d="M 30,76.5 C 40,74.5 59,74.5 69,76.5 C 65,79.5 35,79.5 30,76.5 Z" fill={lesionFill} />}
					{isProfunda && <path d="M 38,76.8 C 45,75.5 54,75.5 61,76.8 C 58,78.5 41,78.5 38,76.8 Z" fill={necroticFill} />}
				</g>
			)}
		</g>
	);
};
