/**
 * Candidate10_Paths.tsx — DENTE SIGNATURE MASTER SVG PATHS & DEFS
 * Vector geometry, anatomical curves, and cinema-grade lighting shaders for Candidate #10.
 */

import React from "react";

// ============================================================================
// SVG FILTERS & SHADER DEFS (Pearl Enamel, Coral Endo, Fiery Granuloma, SLA Titanium)
// ============================================================================

export const Candidate10Defs: React.FC<{ theme: "light" | "dark" }> = ({ theme }) => {
	const isDark = theme === "dark";

	return (
		<defs>
			{/* Pearlescent Enamel Gradient (Noble pearl with opalescent incisal sheen) */}
			<linearGradient id="c10-enamel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor={isDark ? "#ffffff" : "#ffffff"} stopOpacity={1} />
				<stop offset="35%" stopColor={isDark ? "#e2e8f0" : "#fdfbf7"} stopOpacity={1} />
				<stop offset="70%" stopColor={isDark ? "#cbd5e1" : "#f4efe6"} stopOpacity={1} />
				<stop offset="100%" stopColor={isDark ? "#94a3b8" : "#e5dfd3"} stopOpacity={1} />
			</linearGradient>

			{/* Translucent Opalescent Incisal Halo */}
			<linearGradient id="c10-incisal-halo" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor={isDark ? "#38bdf8" : "#93c5fd"} stopOpacity={0} />
				<stop offset="100%" stopColor={isDark ? "#38bdf8" : "#60a5fa"} stopOpacity={isDark ? 0.35 : 0.25} />
			</linearGradient>

			{/* Natural Anatomical Cementum (Warm organic ivory bone tone) */}
			<linearGradient id="c10-cementum-grad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor={isDark ? "#64748b" : "#eddcc8"} />
				<stop offset="30%" stopColor={isDark ? "#94a3b8" : "#fbf4eb"} />
				<stop offset="70%" stopColor={isDark ? "#64748b" : "#e4cfb7"} />
				<stop offset="100%" stopColor={isDark ? "#475569" : "#d2b99c"} />
			</linearGradient>

			{/* Coral Gutta-Percha Endo Gradient (Lustrous clinical pink-coral with condensation glow) */}
			<linearGradient id="c10-guttapercha-grad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#e11d48" />
				<stop offset="45%" stopColor="#fb7185" />
				<stop offset="70%" stopColor="#f43f5e" />
				<stop offset="100%" stopColor="#be123c" />
			</linearGradient>

			{/* Golden Sealer Line */}
			<linearGradient id="c10-sealer-grad" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
				<stop offset="100%" stopColor="#d97706" stopOpacity={0.7} />
			</linearGradient>

			{/* Fiery Periapical Granuloma Radial Halo (Cinematic osteolytic flame) */}
			<radialGradient id="c10-granuloma-radial" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#fef08a" stopOpacity={1} />
				<stop offset="25%" stopColor="#fbbf24" stopOpacity={0.95} />
				<stop offset="55%" stopColor="#f97316" stopOpacity={0.8} />
				<stop offset="85%" stopColor="#ef4444" stopOpacity={0.4} />
				<stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
			</radialGradient>

			{/* Granuloma Outer Ambient Flare */}
			<radialGradient id="c10-granuloma-flare" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="#ef4444" stopOpacity={isDark ? 0.6 : 0.45} />
				<stop offset="60%" stopColor="#ea580c" stopOpacity={isDark ? 0.3 : 0.2} />
				<stop offset="100%" stopColor="#b91c1c" stopOpacity={0} />
			</radialGradient>

			{/* Titanium SLA Matte Screwed Fixture Gradient */}
			<linearGradient id="c10-titanium-sla" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor={isDark ? "#1e293b" : "#475569"} />
				<stop offset="25%" stopColor={isDark ? "#475569" : "#94a3b8"} />
				<stop offset="50%" stopColor={isDark ? "#94a3b8" : "#e2e8f0"} />
				<stop offset="75%" stopColor={isDark ? "#334155" : "#64748b"} />
				<stop offset="100%" stopColor={isDark ? "#0f172a" : "#334155"} />
			</linearGradient>

			{/* Mirror Healing Abutment Specular Gradient (Polished Grade 5 Titanium) */}
			<linearGradient id="c10-mirror-abutment" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor={isDark ? "#334155" : "#64748b"} />
				<stop offset="20%" stopColor={isDark ? "#94a3b8" : "#cbd5e1"} />
				<stop offset="40%" stopColor={isDark ? "#ffffff" : "#ffffff"} />
				<stop offset="65%" stopColor={isDark ? "#cbd5e1" : "#e2e8f0"} />
				<stop offset="85%" stopColor={isDark ? "#475569" : "#94a3b8"} />
				<stop offset="100%" stopColor={isDark ? "#1e293b" : "#475569"} />
			</linearGradient>

			{/* Golden Abutment Collar Accent */}
			<linearGradient id="c10-gold-collar" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#b45309" />
				<stop offset="50%" stopColor="#fbbf24" />
				<stop offset="100%" stopColor="#92400e" />
			</linearGradient>

			{/* Soft Glow Filter for Periapical Halo */}
			<filter id="c10-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="3.5" result="blur" />
				<feComposite in="SourceGraphic" in2="blur" operator="over" />
			</filter>
		</defs>
	);
};

// ============================================================================
// 1. INCISOR 11 PATHS (Noble Pearl, Mamelon Microrelief, Opalescent Halo)
// ============================================================================

export const C10_INCISOR = {
	root: "M 32 74 C 34 50, 42 26, 48 14 C 49.5 12, 53 12, 54 14 C 60 26, 66 50, 68 74 Z",
	rootRidge: "M 51 14 C 52 35, 52 55, 50 74",
	cejLine: "M 29 74 Q 50 68 71 74",
	crown:
		"M 29 74 C 23 88, 22 115, 24 142 C 29 145, 36 146, 42 144 C 47 146, 54 146, 59 144 C 65 146, 72 145, 76 141 C 78 116, 77 88, 71 74 Z",
	specularHighlight: "M 28 82 C 26 98, 26 122, 28 138 C 30 138, 31 98, 30 82 Z",
	mamelonGroove1: "M 42 110 C 42 125, 41 138, 42 144",
	mamelonGroove2: "M 59 110 C 59 125, 60 138, 59 144",
	incisalHalo: "M 25 137 C 38 141, 62 141, 75 136 L 76 141 C 72 145, 29 145, 24 142 Z",
};

// ============================================================================
// 2. PREMOLAR 14 PATHS (Bifurcated Dual Roots, Endodontic Coral Gutta-Percha)
// ============================================================================

export const C10_PREMOLAR = {
	roots:
		"M 30 74 C 31 56, 32 32, 34 16 C 35.5 13, 38.5 13, 39.5 16 C 42 30, 46 44, 50 48 C 54 44, 58 32, 60.5 18 C 61.5 15, 64.5 15, 66 18 C 68 32, 69 56, 70 74 Z",
	furcationShadow: "M 50 48 C 50 56, 49.5 66, 50 74",
	crown:
		"M 30 74 C 22 88, 20 112, 24 136 C 28 144, 34 145, 40 142 C 45 136, 55 136, 60 141 C 66 144, 72 143, 76 135 C 80 112, 78 88, 70 74 Z",
	occlusalFissure: "M 40 142 C 48 135, 52 135, 60 141",
	cuspRidgeLeft: "M 32 82 C 30 102, 34 126, 38 140",
	cuspRidgeRight: "M 68 82 C 70 102, 66 126, 62 139",
	pulpChamber: "M 43 76 C 43 68, 57 68, 57 76 C 57 84, 43 84, 43 76 Z",
	canalBuccal:
		"M 45 74 C 44 58, 40 38, 37 19 C 36.5 18, 37.5 18, 38 19 C 41 38, 46 58, 48 74 Z",
	canalPalatal:
		"M 52 74 C 54 58, 59 40, 63 21 C 63.5 20, 64.5 20, 64 21 C 61 40, 56 58, 55 74 Z",
};

// ============================================================================
// 3. MOLAR 46 PATHS (Divergent Roots, Translucent Pulp, Fiery Periapical Halo)
// ============================================================================

export const C10_MOLAR = {
	roots:
		"M 20 74 C 22 52, 25 32, 28 20 C 30 16, 34 16, 35 20 C 38 34, 45 52, 55 58 C 65 52, 72 36, 75 22 C 76 18, 80 18, 82 22 C 85 34, 88 52, 90 74 Z",
	furcationArch: "M 47 62 C 55 56, 55 56, 63 62",
	crown:
		"M 20 74 C 12 88, 11 112, 14 136 C 18 144, 26 146, 34 143 C 40 146, 48 147, 56 144 C 64 147, 72 145, 80 142 C 86 145, 92 142, 96 134 C 99 112, 98 88, 90 74 Z",
	fissureMain: "M 34 143 C 44 136, 66 136, 80 142",
	fissureBranch1: "M 56 144 C 56 134, 55 120, 55 106",
	fissureBranch2: "M 38 124 C 46 128, 64 128, 72 124",
	pulpChamber: "M 38 82 C 38 72, 72 72, 72 82 C 72 94, 38 94, 38 82 Z",
	canalMesial: "M 42 78 C 38 56, 33 36, 31.5 22 C 32.5 22, 33.5 22, 35 36 C 39 56, 44 78, 44 78 Z",
	canalDistal: "M 66 78 C 71 58, 76 38, 78.5 24 C 79.5 24, 80.5 24, 79 38 C 75 58, 68 78, 68 78 Z",
	granulomaMesialCenter: { cx: 31, cy: 19, r: 16 },
	granulomaDistalCenter: { cx: 78, cy: 21, r: 15 },
	granulomaCoronaMesial:
		"M 31 5 C 38 6, 45 12, 45 20 C 45 26, 40 33, 31 33 C 22 33, 17 26, 17 19 C 17 12, 24 5, 31 5 Z",
	granulomaCoronaDistal:
		"M 78 8 C 85 9, 91 14, 91 22 C 91 28, 86 34, 78 34 C 70 34, 65 28, 65 21 C 65 14, 71 8, 78 8 Z",
};

// ============================================================================
// 4. IMPLANT PATHS (SLA Titanium Threaded Fixture, Microthreads, Mirror Abutment)
// ============================================================================

export const C10_IMPLANT = {
	fixtureBody: "M 32 76 L 39 20 C 43 14, 57 14, 61 20 L 68 76 Z",
	threads: [
		{ yLeft: 26, yRight: 28, xLeft: 38, xRight: 62 },
		{ yLeft: 34, yRight: 36, xLeft: 37, xRight: 63 },
		{ yLeft: 42, yRight: 44, xLeft: 36, xRight: 64 },
		{ yLeft: 50, yRight: 52, xLeft: 35, xRight: 65 },
		{ yLeft: 58, yRight: 60, xLeft: 34, xRight: 66 },
		{ yLeft: 66, yRight: 68, xLeft: 33, xRight: 67 },
		{ yLeft: 72, yRight: 74, xLeft: 32, xRight: 68 },
	],
	apicalFlute: "M 46 16 L 50 28 L 54 16",
	microthreads: [74, 75.5, 77],
	collar: "M 31 76 L 69 76 L 71 84 L 29 84 Z",
	goldRing: "M 29 84 L 71 84 L 71 88 L 29 88 Z",
	healingDome: "M 29 88 C 24 104, 25 124, 34 136 C 42 144, 58 144, 66 136 C 75 124, 76 104, 71 88 Z",
	mirrorReflection: "M 34 94 C 30 108, 32 124, 38 132 C 41 126, 39 104, 42 94 Z",
	driverSlotHex: "M 45 116 L 55 116 L 60 122 L 55 128 L 45 128 L 40 122 Z",
	driverSlotLine: "M 42 122 L 58 122",
};
