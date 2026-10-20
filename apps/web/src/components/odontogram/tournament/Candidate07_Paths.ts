/**
 * Candidate07_Paths.ts — DENTALPRO EVOLUTION V3 (Tournament Competitor #7)
 * Pure TypeScript vector paths, theme palettes, and geometry constants.
 * Mandate 8b: High-precision anatomical curves with zero JSX in .ts file.
 */

// ============================================================================
// 1. COLOR TOKENS & DENTALPRO EVOLUTION PALETTES
// ============================================================================

export interface DentalProTheme {
	readonly rootFill: string;
	readonly rootStroke: string;
	readonly enamelFill: string;
	readonly enamelStroke: string;
	readonly pulpGlow: string;
	readonly pulpCore: string;
	readonly cejLine: string;
	readonly accentStroke: string;
	readonly highlight: string;
	readonly shadow: string;
	readonly implantBody: string;
	readonly abutmentFill: string;
	readonly haloShockwave: string;
	readonly haloCore: string;
}

export const DP_THEMES: Record<"light" | "dark", DentalProTheme> = {
	light: {
		rootFill: "url(#dp7-root-grad-light)",
		rootStroke: "#475569",
		enamelFill: "url(#dp7-enamel-grad-light)",
		enamelStroke: "#334155",
		pulpGlow: "#DC2626",
		pulpCore: "#F59E0B",
		cejLine: "#94A3B8",
		accentStroke: "#64748B",
		highlight: "#FFFFFF",
		shadow: "rgba(15, 23, 42, 0.12)",
		implantBody: "url(#dp7-implant-grad-light)",
		abutmentFill: "url(#dp7-abutment-gold-light)",
		haloShockwave: "url(#dp7-granuloma-wave)",
		haloCore: "#FEF08A",
	},
	dark: {
		rootFill: "url(#dp7-root-grad-dark)",
		rootStroke: "#64748B",
		enamelFill: "url(#dp7-enamel-grad-dark)",
		enamelStroke: "#94A3B8",
		pulpGlow: "#EF4444",
		pulpCore: "#FBBF24",
		cejLine: "#475569",
		accentStroke: "#94A3B8",
		highlight: "#F8FAFC",
		shadow: "rgba(0, 0, 0, 0.4)",
		implantBody: "url(#dp7-implant-grad-dark)",
		abutmentFill: "url(#dp7-abutment-gold-dark)",
		haloShockwave: "url(#dp7-granuloma-wave)",
		haloCore: "#FEF08A",
	},
};

// ============================================================================
// 2. INCISOR 11 (Maxillary Central Incisor) - Golden Ratio & Pearl Enamel
// ============================================================================

export const DP_INCISOR_PATHS = {
	// Root with 1:1.618 golden ratio tapering and gentle distal inclination
	root: "M 36,84 C 38,62 44,38 51,15 C 52,13 54,13 55,15 C 57,38 62,62 64,84 C 55,80 45,80 36,84 Z",
	rootGroove: "M 50,22 C 49,42 49,64 50,78",
	cej: "M 35,84 C 44,91 56,91 65,84",
	// Pure pearl enamel crown (sharp 90° mesio-incisal angle, rounded disto-incisal angle)
	crown:
		"M 35,84 C 28,95 25,110 26,114 C 26,124 26,133 26,137 C 32,138 38,138 42,138 C 47,138 53,138 58,138 C 64,137 70,136 74,135 C 75,130 75,124 74,116 C 73,106 68,94 65,84 C 55,90 45,90 35,84 Z",
	mamelons: "M 42,138 L 42,134 M 58,138 L 58,134",
	incisalHalo: "M 28,133 C 42,135 58,135 72,131 L 73,135 C 58,138 42,138 27,137 Z",
	shine1: "M 33,96 C 31,108 31,122 34,130",
	shine2: "M 39,94 C 38,106 38,124 40,132",
};

// ============================================================================
// 3. PREMOLAR 14 (Maxillary First Premolar) - Bifurcated Roots & Endodontics
// ============================================================================

export const DP_PREMOLAR_PATHS = {
	// Bifurcated roots (buccal + palatal)
	roots:
		"M 30,80 C 32,58 33,36 36,16 C 37,14 39,14 40,16 C 43,30 46,44 49,54 C 52,44 55,32 58,18 C 59,16 61,16 62,18 C 65,36 67,58 70,80 C 58,76 42,76 30,80 Z",
	furcation: "M 46,45 Q 49,56 52,45",
	cej: "M 30,80 C 42,86 58,86 70,80",
	canalBuccal: "M 45,78 C 42,62 38,38 38,18",
	canalPalatal: "M 55,78 C 57,62 60,40 60,20",
	pulpChamber: "M 43,80 C 43,74 57,74 57,80 C 54,86 46,86 43,80 Z",
	crown:
		"M 30,80 C 24,92 23,110 26,120 C 28,128 34,138 38,140 C 42,138 46,132 50,130 C 54,132 58,134 62,134 C 68,132 72,125 74,118 C 76,108 74,92 70,80 C 60,85 40,85 30,80 Z",
	sulcus: "M 38,136 Q 50,128 62,132",
	shine: "M 32,96 C 30,108 32,124 36,134",
};

// ============================================================================
// 4. MOLAR 46 (Heavy Pathology) - 3 Powerful Roots & Fiery Periapical Halo
// ============================================================================

export const DP_MOLAR_PATHS = {
	haloCenter: { cx: 24, cy: 20 },
	// 3-root powerful anatomical architecture
	roots:
		"M 18,76 C 18,50 19,34 24,19 C 25,17 27,17 28,19 C 32,32 35,44 38,54 C 42,40 45,26 49,14 C 50,12 52,12 53,14 C 56,28 59,42 63,54 C 67,42 71,32 75,21 C 76,19 78,19 79,21 C 82,35 82,52 82,76 C 68,72 32,72 18,76 Z",
	furcationMesial: "M 35,46 Q 38,56 41,46",
	furcationDistal: "M 60,46 Q 63,56 66,46",
	cej: "M 18,76 C 38,82 62,82 82,76",
	canalMesial: "M 32,74 C 28,58 24,38 24,20",
	canalCentral: "M 50,72 L 51,16",
	canalDistal: "M 68,74 C 72,58 76,40 77,22",
	crown:
		"M 18,76 C 12,88 12,108 16,120 C 19,130 22,137 26,138 C 34,136 42,136 50,140 C 58,136 68,135 74,136 C 80,132 86,120 86,110 C 86,92 84,85 82,76 C 65,82 35,82 18,76 Z",
	fissures: "M 26,132 Q 38,124 50,128 Q 62,124 74,130 M 50,128 L 50,138",
	shine: "M 22,94 C 18,106 20,120 25,130",
};

// ============================================================================
// 5. IMPLANT (CAD/CAM Bio-Engineering) - Deep Threads & Gold TiN Abutment
// ============================================================================

export const DP_IMPLANT_PATHS = {
	body: "M 42,18 C 44,14 56,14 58,18 L 68,86 L 32,86 Z",
	flutes: "M 45,18 L 47,30 M 55,18 L 53,30",
	macroThreads: [
		{ y: 26, halfWidth: 18 },
		{ y: 34, halfWidth: 20.3 },
		{ y: 42, halfWidth: 22.6 },
		{ y: 50, halfWidth: 24.9 },
		{ y: 58, halfWidth: 27.2 },
		{ y: 66, halfWidth: 29.5 },
		{ y: 74, halfWidth: 31.8 },
	],
	microThreads: [78, 81, 84],
	collar: { x: 33, y: 86, width: 34, height: 8 },
	abutment: "M 34,94 L 28,116 L 72,116 L 66,94 Z",
	shoulder: { x: 30, y: 116, width: 40, height: 6 },
	healingCap: "M 35,122 L 35,138 L 65,138 L 65,122 Z",
	hexSocket: "50,126 56,129 56,135 50,138 44,135 44,129",
};
