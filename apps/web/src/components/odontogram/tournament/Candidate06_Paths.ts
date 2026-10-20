/**
 * Candidate06_Paths.ts
 * Scandinavian Bio-Minimalism Odontogram SVG Vector Paths & Bio-Tokens.
 * Hand-crafted organic Bezier curves for the DENTE Grand Tournament.
 */

// ============================================================================
// 1. BIO-MINIMALIST COLOR TOKENS (VITA Classical A2/B1 + Warm Medical Titanium)
// ============================================================================

export interface BioThemePalette {
	readonly bgCard: string;
	readonly enamelLight: string;
	readonly enamelMid: string;
	readonly enamelDark: string;
	readonly cervicalA2: string;
	readonly rootLight: string;
	readonly rootDark: string;
	readonly outline: string;
	readonly outlineSoft: string;
	readonly pulpChamber: string;
	readonly guttaPercha: string;
	readonly guttaGlow: string;
	readonly granulomaCore: string;
	readonly granulomaHalo: string;
	readonly tiSatinLight: string;
	readonly tiSatinMid: string;
	readonly tiSatinDark: string;
	readonly abutmentLight: string;
	readonly abutmentMid: string;
	readonly aoShadow: string;
}

export const BIO_PALETTE_LIGHT: BioThemePalette = {
	bgCard: "#FBFBFA",
	enamelLight: "#FFFFFF",
	enamelMid: "#F7F5EE",
	enamelDark: "#ECE7DA",
	cervicalA2: "#DECFA9",
	rootLight: "#EFE8D6",
	rootDark: "#D8CAAC",
	outline: "#695E4E",
	outlineSoft: "rgba(105, 94, 78, 0.4)",
	pulpChamber: "#DE866D",
	guttaPercha: "#D9654C",
	guttaGlow: "rgba(217, 101, 76, 0.28)",
	granulomaCore: "#D85A48",
	granulomaHalo: "rgba(224, 114, 94, 0.35)",
	tiSatinLight: "#CFD2DC",
	tiSatinMid: "#ACB0BF",
	tiSatinDark: "#7E8394",
	abutmentLight: "#E8E2D2",
	abutmentMid: "#C8BEA7",
	aoShadow: "rgba(55, 45, 35, 0.14)",
};

export const BIO_PALETTE_DARK: BioThemePalette = {
	bgCard: "#11141A",
	enamelLight: "#EBE6D8",
	enamelMid: "#CDC4AE",
	enamelDark: "#8F856F",
	cervicalA2: "#917E5B",
	rootLight: "#685F4D",
	rootDark: "#484032",
	outline: "#D1C6AF",
	outlineSoft: "rgba(209, 198, 175, 0.45)",
	pulpChamber: "#D97B62",
	guttaPercha: "#E06D53",
	guttaGlow: "rgba(224, 109, 83, 0.42)",
	granulomaCore: "#E26450",
	granulomaHalo: "rgba(226, 100, 80, 0.48)",
	tiSatinLight: "#8D92A3",
	tiSatinMid: "#5F6474",
	tiSatinDark: "#3A3D48",
	abutmentLight: "#9C9381",
	abutmentMid: "#665E4F",
	aoShadow: "rgba(0, 0, 0, 0.55)",
};

export const getBioPalette = (theme?: "light" | "dark"): BioThemePalette =>
	theme === "dark" ? BIO_PALETTE_DARK : BIO_PALETTE_LIGHT;

// ============================================================================
// 2. BEZIER VECTOR PATHS: 4 BENCHMARK TEETH
// ============================================================================

export const INCISOR_11_PATHS = {
	// Upper Central Incisor (Root UP, Crown DOWN)
	root: "M 32 70 C 33 48 39 28 49 14 C 51 11 53 11 54 14 C 61 28 66 48 68 70 Z",
	rootCanalShadow: "M 50 18 C 50 32 49 52 50 70",
	cejCurve: "M 32 70 C 40 76 60 76 68 70",
	crown: "M 32 70 C 30 88 27 118 28 140 C 28.5 143 30 145 32 145 C 38 145.5 42 144.5 48 145.5 C 53 146.2 58 145 64 145.5 C 69 145 71 143 72 138 C 73 118 71 88 68 70 Z",
	mamelonGrooveMesial: "M 38 100 C 37 116 36 132 36 144",
	mamelonGrooveDistal: "M 62 100 C 63 116 63 132 64 143",
	matteHighlight: "M 46 90 C 46 86 52 86 53 90 C 54 108 53 126 52 134 C 51 137 47 137 46 134 Z",
	cervicalShade: "M 32 70 C 42 78 58 78 68 70 C 67 85 33 85 32 70 Z",
};

export const PREMOLAR_14_PATHS = {
	// Upper First Premolar with Bifurcated Roots & Endodontic Canals
	rootBuccal: "M 31 74 C 32 55 34 35 36 16 C 37.5 13 40 13 41 16 C 44 28 47 42 49 56 C 41 62 34 68 31 74 Z",
	rootPalatal: "M 49 56 C 52 42 56 28 60 18 C 61.5 15 64 15 65 18 C 67 35 68 55 69 74 C 65 68 58 62 49 56 Z",
	cejCurve: "M 31 74 C 40 80 60 80 69 74",
	crownBackgroundPalatalCusp: "M 36 122 C 44 140 56 140 64 122 Z",
	crown: "M 31 74 C 28 88 27 108 31 126 C 34 135 42 144 50 148 C 58 144 66 135 69 126 C 73 108 72 88 69 74 Z",
	buccalCrest: "M 50 82 C 50 102 50 126 50 146",
	pulpChamber: "M 44 76 C 44 72 56 72 56 76 C 56 82 44 82 44 76 Z",
	canalBuccal: "M 47 75 C 44 60 40 40 38.5 18",
	canalPalatal: "M 53 75 C 55 60 60 40 62.5 20",
	matteHighlight: "M 47 94 C 47 90 52 90 53 94 C 53 110 52 126 51 136 C 50 138 48 138 47 136 Z",
};

export const MOLAR_46_PATHS = {
	// Lower First Molar (Roots DOWN, Crown UP, Granuloma on Mesial Apex)
	crownBackgroundLingual: "M 27 46 C 35 22 65 22 73 46 Z",
	crown: "M 25 74 C 23 56 24 40 28 30 C 31 25 35 25 38 28 C 42 32 46 32 50 26 C 53 23 57 23 60 27 C 64 32 68 31 71 27 C 74 25 76 28 75 34 C 77 46 76 60 75 74 Z",
	fissureOcclusal: "M 38 28 Q 50 34 60 27 M 50 30 L 50 50",
	fissureBuccal: "M 50 50 C 49 58 50 64 51 68",
	cejCurve: "M 25 74 C 38 70 62 70 75 74",
	cervicalBulge: "M 28 72 C 40 68 60 68 72 72",
	rootMesial: "M 25 74 C 25 96 27 120 33 140 C 34.5 143 37 143 38 140 C 42 126 45 106 48 88 C 39 82 31 78 25 74 Z",
	rootDistal: "M 52 88 C 55 106 58 124 64 136 C 65.5 139 68 139 69 136 C 73 120 74 96 75 74 C 68 78 60 82 52 88 Z",
	furcationArch: "M 48 88 C 49 84 51 84 52 88",
	furcationShadow: "M 44 87 C 49 80 51 80 56 87 C 52 94 48 94 44 87 Z",
	matteHighlight: "M 34 40 C 34 36 38 36 39 40 C 39 52 38 60 37 66 C 36 68 35 68 34 66 Z",
	granulomaOuter: "M 24 140 C 22 133 30 128 36 128 C 44 128 48 134 46 144 C 44 153 35 155 28 152 C 23 149 26 144 24 140 Z",
};

export const IMPLANT_PATHS = {
	// Biocompatible Healing Abutment + Satin-Brushed Titanium Fixture
	abutmentBevel: "M 28 24 C 38 20 62 20 72 24 C 74 26 73 28 71 29 C 61 26 39 26 29 29 C 27 28 26 26 28 24 Z",
	abutmentBody: "M 29 29 C 39 26 61 26 71 29 C 69 36 67 44 65 52 C 55 50 45 50 35 52 C 33 44 31 36 29 29 Z",
	abutmentDriverHex: "M 46 24 L 54 24 L 56 27 L 52 30 L 48 30 L 44 27 Z",
	platformLine: "M 35 52 L 65 52",
	fixtureCore: "M 35 52 L 65 52 C 64 74 61 106 58 128 C 55 137 45 137 42 128 C 39 106 36 74 35 52 Z",
	threads: [
		"M 34 68 C 44 71 56 71 66 68",
		"M 34.5 76 C 44 79 56 79 65.5 76",
		"M 35 84 C 44 87 56 87 65 84",
		"M 35.5 92 C 44 95 56 95 64.5 92",
		"M 36 100 C 44 103 56 103 64 100",
		"M 37 108 C 44 111 56 111 63 108",
		"M 38 116 C 44 118 56 118 62 116",
		"M 39 124 C 44 126 56 126 61 124",
	],
	microThreads: [
		"M 35 56 L 65 56",
		"M 35 59 L 65 59",
		"M 35 62 L 65 62",
		"M 35 65 L 65 65",
	],
	apicalReliefLeft: "M 45 122 L 45 132",
	apicalReliefRight: "M 55 122 L 55 132",
	matteHighlight: "M 48 54 L 52 54 L 51 128 L 49 128 Z",
};
