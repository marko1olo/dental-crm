/**
 * Candidate 02: Frank Netter Anatomical Atlas — Vector Paths & SVG Renderers
 * Handcrafted semi-3D anatomical illustrations with classical medical atlas shading,
 * organic dentin warmth, Sharpey's fibers, gutta-percha endodontics, dramatic periapical granuloma,
 * and SLA titanium implant biomechanics.
 */

import React from "react";

interface SvgProps {
	readonly isDark: boolean;
	readonly className?: string;
}

// ============================================================================
// 1. INCISOR 11 (Резец 11 — Интактный)
// ============================================================================
export const NetterIncisorSvg: React.FC<SvgProps> = ({ isDark, className = "" }) => {
	const ink = isDark ? "#EAD7C5" : "#3E2723";
	const inkLight = isDark ? "#A89886" : "#6D4C41";
	const hatch = isDark ? "#C5B39F" : "#8D6E63";

	return (
		<svg
			viewBox="0 0 110 160"
			className={`w-[100px] h-[150px] overflow-visible ${className}`}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Резец 11 — Анатомический атлас Неттера"
		>
			<defs>
				{/* Enamel Gradient */}
				<linearGradient id="c02-inc-enamel" x1="55" y1="90" x2="55" y2="152" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#D4B988" : "#E2BA6D"} />
					<stop offset="25%" stopColor={isDark ? "#E8DCB8" : "#F4EBD9"} />
					<stop offset="70%" stopColor={isDark ? "#F5EFE6" : "#FAF7F2"} />
					<stop offset="92%" stopColor={isDark ? "#D8E6E7" : "#E0F2FE"} />
					<stop offset="100%" stopColor={isDark ? "#B0C4C8" : "#BAE6FD"} />
				</linearGradient>

				{/* Root Cementum Gradient */}
				<linearGradient id="c02-inc-root" x1="55" y1="14" x2="55" y2="92" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#9A7B56" : "#BFA07A"} />
					<stop offset="50%" stopColor={isDark ? "#8A6D4B" : "#D2B48C"} />
					<stop offset="85%" stopColor={isDark ? "#785836" : "#C19A6B"} />
					<stop offset="100%" stopColor={isDark ? "#624424" : "#A67C52"} />
				</linearGradient>

				{/* Cervical Dentin Warmth */}
				<radialGradient id="c02-inc-cervical-glow" cx="55" cy="95" r="28" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#EAB308" : "#F59E0B"} stopOpacity="0.45" />
					<stop offset="60%" stopColor={isDark ? "#D97706" : "#D97706"} stopOpacity="0.15" />
					<stop offset="100%" stopColor={isDark ? "#B45309" : "#B45309"} stopOpacity="0" />
				</radialGradient>

				{/* Soft Drop Shadow Filter for 3D Volume */}
				<filter id="c02-inc-shadow" x="-10%" y="-10%" width="120%" height="120%">
					<feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor={isDark ? "#000" : "#451A03"} floodOpacity="0.25" />
				</filter>
			</defs>

			<g filter="url(#c02-inc-shadow)">
				{/* 1. ROOT BODY */}
				<path
					d="M 55,14 C 50,28 45,50 43,74 C 42,82 42,89 42,92 C 48,87 62,87 68,92 C 68,89 67,80 66,72 C 63,48 59,26 55,14 Z"
					fill="url(#c02-inc-root)"
					stroke={ink}
					strokeWidth="1.3"
					strokeLinejoin="round"
				/>

				{/* Root Developmental Depression (Anatomical Longitudinal Groove) */}
				<path
					d="M 54,24 C 52,45 52,68 53,86"
					stroke={isDark ? "#5C4028" : "#8C5828"}
					strokeWidth="1.8"
					strokeLinecap="round"
					opacity="0.4"
				/>
				<path
					d="M 55.5,24 C 53.5,45 53.5,68 54.5,86"
					stroke={isDark ? "#DFD0B8" : "#FFF8ED"}
					strokeWidth="1"
					strokeLinecap="round"
					opacity="0.5"
				/>

				{/* Netter Cementum Engraving Hatching (Sharpey's Fibers) */}
				<g stroke={hatch} strokeWidth="0.75" strokeLinecap="round" opacity="0.6">
					<line x1="45" y1="42" x2="50" y2="44" />
					<line x1="44" y1="52" x2="50" y2="54" />
					<line x1="43" y1="64" x2="50" y2="66" />
					<line x1="43" y1="76" x2="51" y2="78" />
					<line x1="64" y1="38" x2="59" y2="40" />
					<line x1="65" y1="50" x2="58" y2="52" />
					<line x1="66" y1="62" x2="58" y2="64" />
					<line x1="66" y1="74" x2="57" y2="76" />
				</g>

				{/* 2. CROWN BODY */}
				<path
					d="M 42,92 C 40,105 37,122 34,142 C 33.5,147 34,151 37,151.5 C 43,152 47,151 51,151.2 C 55,151.4 59,152 64,151.5 C 69,151 72,149 74,145 C 76,134 74,115 71,102 C 70,97 69,93 68,92 C 61,86 49,86 42,92 Z"
					fill="url(#c02-inc-enamel)"
					stroke={ink}
					strokeWidth="1.3"
					strokeLinejoin="round"
				/>

				{/* Warm Cervical Dentin Glow */}
				<path
					d="M 42,92 C 40,102 43,114 55,116 C 67,114 70,102 68,92 C 61,86 49,86 42,92 Z"
					fill="url(#c02-inc-cervical-glow)"
				/>

				{/* Scalloped Cementoenamel Junction (CEJ) Contour */}
				<path
					d="M 42,92 C 49,86 61,86 68,92"
					stroke={isDark ? "#F59E0B" : "#9A3412"}
					strokeWidth="1.4"
					strokeLinecap="round"
				/>

				{/* Incisal Translucent Enamel Halo Band */}
				<path
					d="M 35,144 C 40,147 48,146 55,146 C 62,146 68,145 73,141 L 74,145 C 72,149 69,151 64,151.5 C 59,152 55,151.4 51,151.2 C 47,151 43,152 37,151.5 C 34.5,151 34.2,147.5 35,144 Z"
					fill={isDark ? "#38BDF8" : "#BAE6FD"}
					opacity="0.4"
				/>

				{/* Labial Developmental Grooves (3 Lobes Anatomy) */}
				<path
					d="M 45,147 C 46,132 47,116 48,100"
					stroke={inkLight}
					strokeWidth="0.85"
					strokeLinecap="round"
					opacity="0.4"
				/>
				<path
					d="M 62,147 C 61,132 60,116 59,100"
					stroke={inkLight}
					strokeWidth="0.85"
					strokeLinecap="round"
					opacity="0.4"
				/>

				{/* Netter Mamelon Ridges on Incisal Edge */}
				<circle cx="43" cy="150" r="1.2" fill={isDark ? "#FFF" : "#F5EBE1"} opacity="0.8" />
				<circle cx="55" cy="150.2" r="1.3" fill={isDark ? "#FFF" : "#F5EBE1"} opacity="0.8" />
				<circle cx="67" cy="148.5" r="1.2" fill={isDark ? "#FFF" : "#F5EBE1"} opacity="0.8" />

				{/* Specular Glaze Highlight along Central Lobe */}
				<path
					d="M 54,98 C 55,112 55,128 54,142"
					stroke="#FFFFFF"
					strokeWidth="1.6"
					strokeLinecap="round"
					opacity={isDark ? "0.35" : "0.65"}
				/>
			</g>
		</svg>
	);
};

// ============================================================================
// 2. PREMOLAR 14 (Премоляр 14 — Эндодонтия и бифуркация)
// ============================================================================
export const NetterPremolarSvg: React.FC<SvgProps> = ({ isDark, className = "" }) => {
	const ink = isDark ? "#EAD7C5" : "#3E2723";
	const inkLight = isDark ? "#A89886" : "#6D4C41";
	const hatch = isDark ? "#C5B39F" : "#8D6E63";

	return (
		<svg
			viewBox="0 0 110 160"
			className={`w-[100px] h-[150px] overflow-visible ${className}`}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Премоляр 14 — Анатомический атлас Неттера"
		>
			<defs>
				<linearGradient id="c02-pm-enamel" x1="55" y1="86" x2="55" y2="154" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#D4B988" : "#E2BA6D"} />
					<stop offset="30%" stopColor={isDark ? "#E8DCB8" : "#F4EBD9"} />
					<stop offset="80%" stopColor={isDark ? "#FAF6F0" : "#FCFBF8"} />
					<stop offset="100%" stopColor={isDark ? "#E2E8F0" : "#EDF2F7"} />
				</linearGradient>

				<linearGradient id="c02-pm-root-pal" x1="42" y1="14" x2="42" y2="88" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#9A7B56" : "#BFA07A"} />
					<stop offset="60%" stopColor={isDark ? "#8A6D4B" : "#D2B48C"} />
					<stop offset="100%" stopColor={isDark ? "#624424" : "#A67C52"} />
				</linearGradient>

				<linearGradient id="c02-pm-root-buc" x1="68" y1="18" x2="68" y2="88" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#9A7B56" : "#BFA07A"} />
					<stop offset="60%" stopColor={isDark ? "#8A6D4B" : "#D2B48C"} />
					<stop offset="100%" stopColor={isDark ? "#624424" : "#A67C52"} />
				</linearGradient>

				{/* Gutta-Percha Core Gradient */}
				<linearGradient id="c02-pm-gp" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stopColor="#FB7185" />
					<stop offset="50%" stopColor="#E11D48" />
					<stop offset="100%" stopColor="#BE123C" />
				</linearGradient>

				<filter id="c02-pm-shadow" x="-10%" y="-10%" width="120%" height="120%">
					<feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor={isDark ? "#000" : "#451A03"} floodOpacity="0.25" />
				</filter>
			</defs>

			<g filter="url(#c02-pm-shadow)">
				{/* 1. BIFURCATED ROOTS */}
				{/* Palatal Root (Left) */}
				<path
					d="M 42,14 C 38,30 36,52 36,75 C 36,80 37,85 38,88 C 45,84 52,84 55,87 C 54,75 52,65 52,58 C 50,45 46,28 42,14 Z"
					fill="url(#c02-pm-root-pal)"
					stroke={ink}
					strokeWidth="1.2"
					strokeLinejoin="round"
				/>

				{/* Buccal Root (Right) */}
				<path
					d="M 68,18 C 72,32 74,54 74,75 C 74,80 73,85 72,88 C 65,84 58,84 55,87 C 56,75 58,65 58,58 C 60,45 64,30 68,18 Z"
					fill="url(#c02-pm-root-buc)"
					stroke={ink}
					strokeWidth="1.2"
					strokeLinejoin="round"
				/>

				{/* Furcation Shadow Arch */}
				<path
					d="M 52,58 C 53.5,65 55,70 55,87 C 55,70 56.5,65 58,58 C 56,53 54,53 52,58 Z"
					fill={isDark ? "#382414" : "#6B3F1D"}
					opacity="0.6"
				/>

				{/* Netter Root Hatching */}
				<g stroke={hatch} strokeWidth="0.75" strokeLinecap="round" opacity="0.55">
					<line x1="39" y1="36" x2="44" y2="38" />
					<line x1="38" y1="48" x2="45" y2="50" />
					<line x1="38" y1="62" x2="46" y2="64" />
					<line x1="71" y1="38" x2="65" y2="40" />
					<line x1="72" y1="50" x2="65" y2="52" />
					<line x1="72" y1="64" x2="64" y2="66" />
				</g>

				{/* 2. ENDODONTIC CANALS (Translucent / Cutaway Anatomy) */}
				{/* Palatal Canal */}
				<path
					d="M 42,16 Q 44,48 46,78 L 47,82"
					stroke="#F59E0B"
					strokeWidth="3.2"
					strokeLinecap="round"
				/>
				<path
					d="M 42,16 Q 44,48 46,78 L 47,82"
					stroke="url(#c02-pm-gp)"
					strokeWidth="2.1"
					strokeLinecap="round"
				/>

				{/* Buccal Canal */}
				<path
					d="M 68,20 Q 64,50 62,78 L 61,82"
					stroke="#F59E0B"
					strokeWidth="3.2"
					strokeLinecap="round"
				/>
				<path
					d="M 68,20 Q 64,50 62,78 L 61,82"
					stroke="url(#c02-pm-gp)"
					strokeWidth="2.1"
					strokeLinecap="round"
				/>

				{/* Coronal Pulp Chamber & Horns */}
				<path
					d="M 45,82 C 43,88 44,95 44,98 C 45,95 52,90 54,90 C 56,90 63,95 64,102 C 64,95 65,88 63,82 Z"
					fill="#BE123C"
					stroke="#F59E0B"
					strokeWidth="0.8"
				/>

				{/* 3. CROWN BODY (Two Cusps & Fissures) */}
				<path
					d="M 38,88 C 34,98 31,114 32,126 C 33,138 38,146 43,147 C 48,148 51,142 54,138 C 57,142 61,152 68,154 C 74,154 78,142 78,130 C 78,116 75,98 72,88 C 64,83 46,83 38,88 Z"
					fill="url(#c02-pm-enamel)"
					stroke={ink}
					strokeWidth="1.3"
					strokeLinejoin="round"
				/>

				{/* Scalloped CEJ */}
				<path
					d="M 38,88 C 46,83 64,83 72,88"
					stroke={isDark ? "#F59E0B" : "#9A3412"}
					strokeWidth="1.3"
					strokeLinecap="round"
				/>

				{/* Occlusal Fissures & Triangular Ridges */}
				<path
					d="M 54,138 C 53,124 54,108 54,96"
					stroke={inkLight}
					strokeWidth="1.2"
					strokeLinecap="round"
				/>
				<path
					d="M 43,147 C 47,142 50,140 54,138"
					stroke={inkLight}
					strokeWidth="0.9"
					strokeLinecap="round"
				/>
				<path
					d="M 68,154 C 63,146 59,141 54,138"
					stroke={inkLight}
					strokeWidth="1"
					strokeLinecap="round"
				/>

				{/* Cusp Specular Highlights */}
				<circle cx="43" cy="144" r="1.5" fill="#FFFFFF" opacity={isDark ? "0.4" : "0.7"} />
				<circle cx="68" cy="150" r="1.8" fill="#FFFFFF" opacity={isDark ? "0.4" : "0.7"} />
			</g>
		</svg>
	);
};

// ============================================================================
// 3. MOLAR 46 (Моляр 46 — 3 корня, каналы и гранулема)
// ============================================================================
export const NetterMolarSvg: React.FC<SvgProps> = ({ isDark, className = "" }) => {
	const ink = isDark ? "#EAD7C5" : "#3E2723";
	const inkLight = isDark ? "#A89886" : "#6D4C41";
	const hatch = isDark ? "#C5B39F" : "#8D6E63";

	return (
		<svg
			viewBox="0 0 110 160"
			className={`w-[100px] h-[150px] overflow-visible ${className}`}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Моляр 46 — Анатомический атлас Неттера"
		>
			<defs>
				<linearGradient id="c02-mo-enamel" x1="55" y1="84" x2="55" y2="156" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#D4B988" : "#E2BA6D"} />
					<stop offset="25%" stopColor={isDark ? "#E8DCB8" : "#F4EBD9"} />
					<stop offset="80%" stopColor={isDark ? "#FAF6F0" : "#FCFBF8"} />
					<stop offset="100%" stopColor={isDark ? "#E2E8F0" : "#EDF2F7"} />
				</linearGradient>

				<linearGradient id="c02-mo-root" x1="55" y1="20" x2="55" y2="86" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#9A7B56" : "#BFA07A"} />
					<stop offset="60%" stopColor={isDark ? "#8A6D4B" : "#D2B48C"} />
					<stop offset="100%" stopColor={isDark ? "#624424" : "#A67C52"} />
				</linearGradient>

				{/* Granuloma Multi-Stage Gradient */}
				<radialGradient id="c02-granuloma-core" cx="33" cy="22" r="14" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor="#F87171" />
					<stop offset="45%" stopColor="#EF4444" />
					<stop offset="75%" stopColor="#B91C1C" />
					<stop offset="100%" stopColor="#7F1D1D" stopOpacity="0.8" />
				</radialGradient>

				<radialGradient id="c02-granuloma-halo" cx="33" cy="22" r="20" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#DC2626" : "#B91C1C"} stopOpacity="0.4" />
					<stop offset="70%" stopColor={isDark ? "#7F1D1D" : "#78350F"} stopOpacity="0.25" />
					<stop offset="100%" stopColor={isDark ? "#000" : "#451A03"} stopOpacity="0" />
				</radialGradient>

				<filter id="c02-mo-shadow" x="-10%" y="-10%" width="120%" height="120%">
					<feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor={isDark ? "#000" : "#451A03"} floodOpacity="0.25" />
				</filter>
			</defs>

			<g filter="url(#c02-mo-shadow)">
				{/* 1. DRAMATIC PERIAPICAL GRANULOMA AT MESIAL APEX */}
				{/* Osteolytic Bone Resorption Halo */}
				<circle cx="33" cy="22" r="18" fill="url(#c02-granuloma-halo)" />

				{/* Inflammatory Hyperemic Granulation Capsule */}
				<path
					d="M 33,9 C 23,9 18,17 19,27 C 20,35 27,39 35,38 C 43,37 47,31 46,21 C 45,12 41,9 33,9 Z"
					fill="url(#c02-granuloma-core)"
					stroke="#991B1B"
					strokeWidth="1.1"
					strokeDasharray="2.5 1"
				/>

				{/* Granulation Stippled Macrophages & Capillary Dots */}
				<circle cx="28" cy="18" r="1.3" fill="#FCA5A5" opacity="0.9" />
				<circle cx="35" cy="16" r="1.5" fill="#FECACA" opacity="0.9" />
				<circle cx="32" cy="24" r="1.8" fill="#FEE2E2" opacity="0.95" />
				<circle cx="26" cy="26" r="1.2" fill="#F87171" opacity="0.8" />
				<circle cx="39" cy="24" r="1.4" fill="#F87171" opacity="0.8" />

				{/* 2. THREE DIVERGENT ROOTS */}
				{/* Mesial Root (Left — enters granuloma) */}
				<path
					d="M 33,22 C 29,36 26,56 26,76 C 26,80 27,84 28,86 C 36,83 45,83 49,86 C 47,74 44,60 41,45 C 38,32 35,24 33,22 Z"
					fill="url(#c02-mo-root)"
					stroke={ink}
					strokeWidth="1.2"
					strokeLinejoin="round"
				/>

				{/* Palatal / Middle Slender Root */}
				<path
					d="M 55,16 C 52,30 51,50 51,68 C 53,68 57,68 59,68 C 59,50 58,30 55,16 Z"
					fill="url(#c02-mo-root)"
					stroke={ink}
					strokeWidth="1"
					strokeLinejoin="round"
				/>

				{/* Distal Root (Right) */}
				<path
					d="M 78,25 C 82,38 84,58 84,76 C 84,80 83,84 82,86 C 74,83 65,83 61,86 C 63,74 66,60 69,45 C 72,32 76,26 78,25 Z"
					fill="url(#c02-mo-root)"
					stroke={ink}
					strokeWidth="1.2"
					strokeLinejoin="round"
				/>

				{/* Furcation Arches */}
				<path
					d="M 45,66 C 48,72 52,78 55,85 C 58,78 62,72 65,66"
					stroke={isDark ? "#382414" : "#6B3F1D"}
					strokeWidth="1.5"
					fill="none"
				/>

				{/* Netter Root Hatching */}
				<g stroke={hatch} strokeWidth="0.75" strokeLinecap="round" opacity="0.5">
					<line x1="28" y1="45" x2="35" y2="47" />
					<line x1="27" y1="60" x2="35" y2="62" />
					<line x1="82" y1="45" x2="75" y2="47" />
					<line x1="83" y1="60" x2="75" y2="62" />
				</g>

				{/* 3. ENDODONTIC CANALS */}
				{/* Mesial Canal (infected/active) */}
				<path d="M 33,22 Q 36,52 42,80" stroke="#F59E0B" strokeWidth="2.8" strokeLinecap="round" />
				<path d="M 33,22 Q 36,52 42,80" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" />

				{/* Middle Canal */}
				<path d="M 55,18 L 55,78" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
				<path d="M 55,18 L 55,78" stroke="#BE123C" strokeWidth="1.4" strokeLinecap="round" />

				{/* Distal Canal */}
				<path d="M 78,25 Q 74,52 68,80" stroke="#F59E0B" strokeWidth="2.8" strokeLinecap="round" />
				<path d="M 78,25 Q 74,52 68,80" stroke="#BE123C" strokeWidth="1.8" strokeLinecap="round" />

				{/* 4. CROWN BODY (5 Anatomical Cusps) */}
				<path
					d="M 28,86 C 24,96 20,112 21,126 C 22,138 27,148 33,150 C 39,152 45,147 48,143 C 51,146 56,152 62,152 C 68,152 73,146 76,142 C 80,147 85,150 90,146 C 94,142 94,128 93,116 C 92,102 88,92 82,86 C 70,81 40,81 28,86 Z"
					fill="url(#c02-mo-enamel)"
					stroke={ink}
					strokeWidth="1.3"
					strokeLinejoin="round"
				/>

				{/* Scalloped CEJ */}
				<path
					d="M 28,86 C 42,81 68,81 82,86"
					stroke={isDark ? "#F59E0B" : "#9A3412"}
					strokeWidth="1.3"
					strokeLinecap="round"
				/>

				{/* Complex Fissure Pattern (Netter Anatomical Y-Groove) */}
				<path d="M 48,143 C 48,126 52,112 55,98" stroke={inkLight} strokeWidth="1.2" strokeLinecap="round" />
				<path d="M 76,142 C 72,128 66,114 55,98" stroke={inkLight} strokeWidth="1.2" strokeLinecap="round" />
				<path d="M 33,150 C 40,145 44,144 48,143" stroke={inkLight} strokeWidth="0.9" strokeLinecap="round" />
				<path d="M 62,152 C 60,146 56,144 48,143" stroke={inkLight} strokeWidth="0.9" strokeLinecap="round" />

				{/* Cusp Specular Glistening Dots */}
				<circle cx="33" cy="146" r="1.4" fill="#FFFFFF" opacity={isDark ? "0.4" : "0.7"} />
				<circle cx="62" cy="148" r="1.6" fill="#FFFFFF" opacity={isDark ? "0.4" : "0.7"} />
				<circle cx="90" cy="142" r="1.4" fill="#FFFFFF" opacity={isDark ? "0.4" : "0.7"} />
			</g>
		</svg>
	);
};

// ============================================================================
// 4. IMPLANT (Винтовой имплант SLA с формирователем десны)
// ============================================================================
export const NetterImplantSvg: React.FC<SvgProps> = ({ isDark, className = "" }) => {
	const ink = isDark ? "#E2E8F0" : "#1E293B";
	const inkMuted = isDark ? "#94A3B8" : "#475569";

	return (
		<svg
			viewBox="0 0 110 160"
			className={`w-[100px] h-[150px] overflow-visible ${className}`}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Имплант с формирователем десны — Анатомический атлас Неттера"
		>
			<defs>
				{/* Polished Titanium Abutment Gradient */}
				<linearGradient id="c02-imp-abutment" x1="40" y1="20" x2="70" y2="48" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#475569" : "#CBD5E1"} />
					<stop offset="25%" stopColor={isDark ? "#94A3B8" : "#F8FAFC"} />
					<stop offset="50%" stopColor={isDark ? "#334155" : "#94A3B8"} />
					<stop offset="75%" stopColor={isDark ? "#CBD5E1" : "#FFFFFF"} />
					<stop offset="100%" stopColor={isDark ? "#1E293B" : "#64748B"} />
				</linearGradient>

				{/* SLA Matte Titanium Body Gradient */}
				<linearGradient id="c02-imp-body" x1="38" y1="52" x2="72" y2="152" gradientUnits="userSpaceOnUse">
					<stop offset="0%" stopColor={isDark ? "#334155" : "#64748B"} />
					<stop offset="30%" stopColor={isDark ? "#64748B" : "#94A3B8"} />
					<stop offset="50%" stopColor={isDark ? "#94A3B8" : "#CBD5E1"} />
					<stop offset="70%" stopColor={isDark ? "#475569" : "#64748B"} />
					<stop offset="100%" stopColor={isDark ? "#1E293B" : "#334155"} />
				</linearGradient>

				<filter id="c02-imp-shadow" x="-10%" y="-10%" width="120%" height="120%">
					<feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor={isDark ? "#000" : "#0F172A"} floodOpacity="0.3" />
				</filter>
			</defs>

			<g filter="url(#c02-imp-shadow)">
				{/* 1. HEALING ABUTMENT (Формирователь десны) */}
				{/* Abutment Collar / Platform */}
				<path
					d="M 40,22 L 70,22 C 72,22 74,24 74,26 L 70,48 C 66,50 44,50 40,48 L 36,26 C 36,24 38,22 40,22 Z"
					fill="url(#c02-imp-abutment)"
					stroke={ink}
					strokeWidth="1.2"
					strokeLinejoin="round"
				/>

				{/* Hex Driver Access Socket (Шестигранник 1.27мм) */}
				<polygon
					points="55,24 61,27 61,33 55,36 49,33 49,27"
					fill={isDark ? "#0F172A" : "#1E293B"}
					stroke={inkMuted}
					strokeWidth="0.8"
				/>
				<circle cx="55" cy="30" r="1.5" fill={isDark ? "#334155" : "#64748B"} />

				{/* Laser Engraving Brand & Diameter Spec */}
				<text
					x="55"
					y="44"
					textAnchor="middle"
					fontSize="5"
					fontFamily="monospace"
					fontWeight="bold"
					fill={isDark ? "#CBD5E1" : "#334155"}
					letterSpacing="0.5"
				>
					Ø4.5 SLA
				</text>

				{/* Scalloped Mucosal Gingiva Line */}
				<path
					d="M 32,48 Q 55,54 78,48"
					stroke={isDark ? "#FB7185" : "#E11D48"}
					strokeWidth="1.4"
					strokeLinecap="round"
					opacity="0.85"
				/>

				{/* 2. TITANIUM IMPLANT FIXTURE BODY */}
				{/* Micro-Threads Zone at Neck */}
				<g stroke={ink} strokeWidth="1" strokeLinecap="round">
					<line x1="42" y1="52" x2="68" y2="52" />
					<line x1="42.5" y1="55" x2="67.5" y2="55" />
					<line x1="43" y1="58" x2="67" y2="58" />
					<line x1="43.5" y1="61" x2="66.5" y2="61" />
				</g>

				{/* Progressive Helical Macro-Threads (8 Threads with Osseointegration Flanges) */}
				<g fill="url(#c02-imp-body)" stroke={ink} strokeWidth="1.1">
					{/* Thread 1 */}
					<path d="M 41,64 L 69,67 L 66,71 L 44,68 Z" />
					{/* Thread 2 */}
					<path d="M 42,73 L 68,76 L 65,80 L 45,77 Z" />
					{/* Thread 3 */}
					<path d="M 43,82 L 67,85 L 64,89 L 46,86 Z" />
					{/* Thread 4 */}
					<path d="M 44,91 L 66,94 L 63,98 L 47,95 Z" />
					{/* Thread 5 */}
					<path d="M 45,100 L 65,103 L 62,107 L 48,104 Z" />
					{/* Thread 6 */}
					<path d="M 46,109 L 64,112 L 61,116 L 49,113 Z" />
					{/* Thread 7 */}
					<path d="M 47,118 L 63,121 L 60,125 L 50,122 Z" />
					{/* Thread 8 */}
					<path d="M 48,127 L 62,130 L 59,134 L 51,131 Z" />
				</g>

				{/* Thread Upper Specular Highlights */}
				<g stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" opacity={isDark ? "0.35" : "0.6"}>
					<line x1="42" y1="64" x2="68" y2="67" />
					<line x1="43" y1="73" x2="67" y2="76" />
					<line x1="44" y1="82" x2="66" y2="85" />
					<line x1="45" y1="91" x2="65" y2="94" />
					<line x1="46" y1="100" x2="64" y2="103" />
					<line x1="47" y1="109" x2="63" y2="112" />
					<line x1="48" y1="118" x2="62" y2="121" />
				</g>

				{/* Apical Self-Tapping Cutting Flute Notches */}
				<path
					d="M 50,125 C 48,133 48,142 51,146 L 53,144 C 51,139 51,131 52,125 Z"
					fill={isDark ? "#0F172A" : "#1E293B"}
				/>
				<path
					d="M 60,125 C 62,133 62,142 59,146 L 57,144 C 59,139 59,131 58,125 Z"
					fill={isDark ? "#0F172A" : "#1E293B"}
				/>

				{/* Rounded Apical Dome & Venting Port */}
				<path
					d="M 51,146 C 51,152 59,152 59,146 Z"
					fill="url(#c02-imp-body)"
					stroke={ink}
					strokeWidth="1.1"
				/>
				<circle cx="55" cy="148" r="1.3" fill={isDark ? "#0F172A" : "#1E293B"} />

				{/* Trabecular Bone Osseointegration Markings */}
				<g stroke={isDark ? "#C5B39F" : "#A67C52"} strokeWidth="0.7" opacity="0.45">
					<circle cx="36" cy="70" r="1" />
					<circle cx="35" cy="85" r="1.2" />
					<circle cx="37" cy="102" r="1" />
					<circle cx="38" cy="120" r="1.1" />
					<circle cx="74" cy="72" r="1" />
					<circle cx="75" cy="88" r="1.2" />
					<circle cx="73" cy="105" r="1" />
					<circle cx="72" cy="122" r="1.1" />
				</g>
			</g>
		</svg>
	);
};
