/**
 * Candidate 08: Multi-Layer SVG Shader — Paths, Defs & Theme Palettes
 * Clean vector gradients and subtle lighting effects without GPU-choking simulation filters.
 */

import React from "react";

export const C08_INCISOR_PATHS = {
	root: "M 38 78 C 36 60, 42 32, 49 18 C 50 16, 51 16, 52 18 C 59 32, 65 60, 63 78 C 57 81, 44 81, 38 78 Z",
	rootCanal: "M 50 24 C 49.5 45, 50.5 65, 50 82",
	crown: "M 38 78 C 35 95, 33 118, 33 138 C 33 142, 35 143, 38 143 C 44 143, 47 141.5, 50 141.5 C 53 141.5, 56 143, 62 143 C 65 143, 67 141, 67 137 C 67 118, 65 95, 63 78 C 55 81.5, 46 81.5, 38 78 Z",
	middlePlate: "M 42 86 C 41 106, 40 126, 42 137 C 46 138, 54 138, 58 137 C 60 126, 59 106, 58 86 C 53 87.5, 47 87.5, 42 86 Z",
	mamelonLeft: "M 43 96 C 43 110, 42 128, 42 138",
	mamelonRight: "M 57 96 C 57 110, 58 128, 58 138",
	incisalHalo: "M 34 135 Q 50 137 66 135 L 67 138 Q 50 142.5 33 139 Z",
	cervicalLine: "M 38 78 Q 50 83 63 78",
};

export const C08_PREMOLAR_PATHS = {
	buccalRoot: "M 36 78 C 33 58, 32 32, 35 18 C 37 18, 38 20, 41 34 C 44 48, 47 64, 48 78 Z",
	palatalRoot: "M 52 78 C 53 64, 56 48, 59 34 C 62 20, 63 18, 65 18 C 68 32, 67 58, 64 78 Z",
	furcationGap: "M 44 46 C 48 50, 52 50, 56 46 C 54 60, 52 72, 50 78 Z",
	buccalCanal: "M 36 24 Q 38 52 44 80",
	palatalCanal: "M 64 24 Q 62 52 56 80",
	pulpChamber: "M 44 80 C 42 90, 40 98, 42 105 C 44 101, 48 95, 50 95 C 52 95, 56 101, 58 105 C 60 98, 58 90, 56 80 Z",
	crown: "M 36 78 C 31 92, 30 112, 34 130 C 37 141, 44 144, 47 144 C 49 144, 49.5 141, 50 141 C 50.5 141, 51 144, 53 144 C 56 144, 63 141, 66 130 C 70 112, 69 92, 64 78 C 55 81, 45 81, 36 78 Z",
	buccalCuspPlate: "M 36 96 C 34 114, 38 130, 46 138 C 47 130, 46 112, 43 96 Z",
	palatalCuspPlate: "M 57 96 C 54 112, 53 130, 54 138 C 62 130, 66 114, 64 96 Z",
	fissureGroove: "M 47 132 C 49 122, 51 122, 53 132",
	cervicalLine: "M 36 78 Q 50 82 64 78",
};

export const C08_MOLAR_PATHS = {
	crown: "M 28 72 C 26 56, 26 38, 31 28 C 35 21, 42 20, 48 22 C 50 23, 51 23, 53 22 C 58 20, 66 21, 70 28 C 74 38, 74 56, 72 72 C 60 70, 40 70, 28 72 Z",
	mesialRoot: "M 28 72 C 28 92, 30 118, 34 138 C 35 140, 37 140, 38 138 C 42 118, 44 95, 43 76 Z",
	distalRoot: "M 57 76 C 56 95, 58 118, 62 134 C 64 136, 66 136, 67 134 C 71 118, 72 92, 72 72 Z",
	furcationArc: "M 43 76 C 47 88, 53 88, 57 76",
	mesialCanal: "M 40 70 C 37 86, 35 110, 36 135",
	distalCanal: "M 58 70 C 60 86, 63 110, 64 131",
	pulpChamber: "M 36 62 C 34 52, 42 46, 50 46 C 58 46, 66 52, 64 62 Z",
	fissures: {
		centralToBuccal: "M 50 36 L 50 22",
		centralToLingual: "M 50 36 L 51 52",
		centralToMesial: "M 50 36 C 42 34, 37 32, 33 34",
		centralToDistal: "M 50 36 C 58 34, 63 32, 67 34",
	},
	cervicalLine: "M 28 72 Q 50 74 72 72",
};

export const C08_IMPLANT_PATHS = {
	healingCap: "M 34 26 C 34 22, 40 20, 50 20 C 60 20, 66 22, 66 26 L 67 42 L 33 42 Z",
	healingCapHex: "46,24 54,24 57,27 54,30 46,30 43,27",
	collar: "M 33 42 L 67 42 L 67 54 L 33 54 Z",
	fixtureBody: "M 33 54 L 38 135 C 42 144, 58 144, 62 135 L 67 54 Z",
	fluteVent: "M 44 125 L 50 142 L 56 125",
	threads: [
		{ y1: 62, y2: 64, w: 34 },
		{ y1: 73, y2: 75, w: 33 },
		{ y1: 84, y2: 86, w: 32 },
		{ y1: 95, y2: 97, w: 30 },
		{ y1: 106, y2: 108, w: 28 },
		{ y1: 117, y2: 119, w: 26 },
		{ y1: 128, y2: 130, w: 23 },
	],
};

export function getC08Colors(theme: "light" | "dark" = "light") {
	const isDark = theme === "dark";
	return {
		isDark,
		crownFill: isDark ? "url(#c08-enamel-dark)" : "url(#c08-enamel-light)",
		rootFill: isDark ? "url(#c08-root-dark)" : "url(#c08-root-light)",
		pulpFill: isDark ? "#f43f5e" : "#e11d48",
		pulpStroke: isDark ? "#fb7185" : "#be123c",
		stroke: isDark ? "#475569" : "#64748b",
		strokeSubtle: isDark ? "#334155" : "#cbd5e1",
		fissure: isDark ? "#1e293b" : "#78350f",
		titaniumFill: isDark ? "url(#c08-ti-dark)" : "url(#c08-ti-light)",
		titaniumStroke: isDark ? "#475569" : "#334155",
		chromeFill: isDark ? "url(#c08-chrome-dark)" : "url(#c08-chrome-light)",
		haloColor: isDark ? "#ff2e54" : "#ef4444",
		haloBg: isDark ? "rgba(255, 46, 84, 0.25)" : "rgba(239, 68, 68, 0.2)",
	};
}

export const Candidate08ShaderDefs: React.FC = () => (
	<defs>
		{/* 1. Incisor Vestibular Subtle Depth */}
		<filter id="c08-incisor-specular" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
			<feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.12" />
		</filter>

		{/* 2. Premolar Cusp Relief */}
		<filter id="c08-premolar-relief" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
			<feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.12" />
		</filter>

		{/* 3. Molar Occlusal Cusps Relief */}
		<filter id="c08-molar-specular" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
			<feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.12" />
		</filter>

		{/* 4. Granuloma Inflammatory Radiant Halo */}
		<filter id="c08-granuloma-glow" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
			<feGaussianBlur stdDeviation="2.5" result="blur" />
			<feMerge>
				<feMergeNode in="blur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>

		{/* 5. Titanium Fixture Metallic Shadow */}
		<filter id="c08-titanium-specular" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
			<feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.15" />
		</filter>

		{/* 6. Chrome Mirror Highlight */}
		<filter id="c08-mirror-chrome" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
			<feDropShadow dx="0" dy="0.8" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.15" />
		</filter>

		{/* Enamel Gradients */}
		<linearGradient id="c08-enamel-light" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#ffffff" />
			<stop offset="45%" stopColor="#fdfbf7" />
			<stop offset="85%" stopColor="#f4ede1" />
			<stop offset="100%" stopColor="#e8dcce" />
		</linearGradient>
		<linearGradient id="c08-enamel-dark" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stopColor="#f1f5f9" />
			<stop offset="40%" stopColor="#cbd5e1" />
			<stop offset="85%" stopColor="#94a3b8" />
			<stop offset="100%" stopColor="#64748b" />
		</linearGradient>

		{/* Root Cementum Gradients */}
		<linearGradient id="c08-root-light" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stopColor="#fbf7ee" />
			<stop offset="60%" stopColor="#f0e2cd" />
			<stop offset="100%" stopColor="#dfcca8" />
		</linearGradient>
		<linearGradient id="c08-root-dark" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stopColor="#475569" />
			<stop offset="60%" stopColor="#334155" />
			<stop offset="100%" stopColor="#1e293b" />
		</linearGradient>

		{/* Titanium Gradients */}
		<linearGradient id="c08-ti-light" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#475569" />
			<stop offset="35%" stopColor="#94a3b8" />
			<stop offset="55%" stopColor="#f1f5f9" />
			<stop offset="80%" stopColor="#64748b" />
			<stop offset="100%" stopColor="#334155" />
		</linearGradient>
		<linearGradient id="c08-ti-dark" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#1e293b" />
			<stop offset="35%" stopColor="#475569" />
			<stop offset="55%" stopColor="#94a3b8" />
			<stop offset="80%" stopColor="#334155" />
			<stop offset="100%" stopColor="#0f172a" />
		</linearGradient>

		{/* Chrome Mirror Gradients */}
		<linearGradient id="c08-chrome-light" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#64748b" />
			<stop offset="25%" stopColor="#cbd5e1" />
			<stop offset="50%" stopColor="#ffffff" />
			<stop offset="75%" stopColor="#94a3b8" />
			<stop offset="100%" stopColor="#475569" />
		</linearGradient>
		<linearGradient id="c08-chrome-dark" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stopColor="#334155" />
			<stop offset="25%" stopColor="#64748b" />
			<stop offset="50%" stopColor="#f8fafc" />
			<stop offset="75%" stopColor="#475569" />
			<stop offset="100%" stopColor="#1e293b" />
		</linearGradient>
	</defs>
);
