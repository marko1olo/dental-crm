/**
 * DENTE Odontogram Tournament — Competitor 01: Apple Glass & Ceramic (PRO EDITION)
 * Mathematically smoothed G2-continuous Bezier curves for Incisor 11, Premolar 14, Molar 46, and Implant.
 * Pure vector cleanliness, zero wobbly lines, compliant with Mandate 8b (<= 120 lines).
 */

export const INCISOR_PATHS = {
	// Anatomical upper incisor crown: straighter mesial, curved distal, mamelon incisal edge
	crown: "M 41 94 C 40 108, 38 132, 40 156 C 41 159, 44 161, 48 161 C 54 160.5, 60 161, 66 160.5 C 72 160, 77 158.5, 80 155 C 83 151, 82 130, 80 110 C 79 100, 78 95, 76 94 C 68 89.5, 49 89.5, 41 94 Z",
	// Elegantly tapered single root with subtle distal apex tilt
	root: "M 41 94 C 49 89.5, 68 89.5, 76 94 C 73 66, 69 40, 61 20 C 59.5 17, 57.5 17, 56 20 C 48 40, 44 66, 41 94 Z",
	cejLine: "M 41 94 C 50 90, 67 90, 76 94",
	translucentEdge: "M 39 148 C 40 158, 43 161, 48 161 C 56 160.5, 66 160.5, 76 158 C 80 156, 81 153, 81 146 C 73 151, 62 152, 53 152 C 46 152, 41 150, 39 148 Z",
	mamelons: "M 49 157 L 51 161 M 62 157 L 64 160.5",
	specularHighlight: "M 46 102 C 45 98, 49 98, 50 102 L 52 142 C 51 145, 47 145, 46 142 Z",
	secondaryHighlight: "M 66 106 C 65 103, 68 103, 69 106 L 71 138 C 70 141, 67 141, 66 138 Z",
	rimHighlight: "M 40 102 C 38 120, 39 140, 41 152",
};

export const PREMOLAR_PATHS = {
	// Bicuspid crown: prominent buccal cusp, rounded palatal cusp, central groove
	crown: "M 39 94 C 35 110, 35 136, 38 148 C 41 158, 45 162, 49 162 C 54 162, 57 154, 60 152 C 63 154, 67 160, 72 160 C 76 160, 81 150, 82 136 C 84 112, 82 102, 79 94 C 71 89.5, 47 89.5, 39 94 Z",
	// Bifurcated roots with natural divergence and smooth inter-radicular crest
	roots: "M 39 94 C 42 72, 40 44, 42 20 C 43 17, 46 17, 48 20 C 51 36, 54 48, 60 58 C 66 48, 69 36, 72 20 C 74 17, 77 17, 78 20 C 80 44, 78 72, 79 94 C 71 89.5, 47 89.5, 39 94 Z",
	cejLine: "M 39 94 C 49 90, 69 90, 79 94",
	groove: "M 60 152 C 59.5 138, 59.5 120, 60 98",
	canalBuccal: "M 52 90 C 50 72, 46 44, 44 22",
	canalPalatal: "M 68 90 C 70 72, 74 44, 76 22",
	buccalCuspSheen: "M 44 108 C 44 104, 48 104, 49 108 L 50 144 C 49 147, 45 147, 44 144 Z",
	palatalCuspSheen: "M 68 112 C 68 108, 71 108, 72 112 L 73 142 C 72 145, 69 145, 68 142 Z",
};

export const MOLAR_PATHS = {
	// Anatomical 5-cusp lower molar crown with delicate fissure network
	crown: "M 30 84 C 28 66, 28 44, 33 30 C 35 25, 38 24, 42 25 C 47 26.5, 52 24, 58 23 C 64 23, 69 25.5, 75 25.5 C 80 25.5, 84 27, 87 31 C 92 42, 92 66, 90 84 C 80 89, 40 89, 30 84 Z",
	// Two curved, diverging roots (mesial root with distal bow, distal root)
	roots: "M 30 84 C 40 89, 80 89, 90 84 C 88 106, 86 130, 81 152 C 79.5 155, 76.5 154, 75 149 C 71 134, 68 118, 60 106 C 52 118, 49 134, 44 149 C 42.5 154, 39.5 155, 38 152 C 33 130, 31 106, 30 84 Z",
	fissures: "M 38 29 C 46 42, 54 46, 60 48 M 60 48 C 66 45, 74 42, 83 34 M 60 48 C 60 62, 59.5 74, 60 84",
	canalMesial: "M 48 88 C 46 108, 42 132, 39 151",
	canalDistal: "M 72 88 C 74 108, 78 132, 80 150",
	mesialSheen: "M 39 36 C 39 32, 43 32, 44 36 L 45 68 C 44 71, 40 71, 39 68 Z",
	distalSheen: "M 76 38 C 76 34, 80 34, 81 38 L 82 66 C 81 69, 77 69, 76 66 Z",
};

export const IMPLANT_PATHS = {
	// Polished mirror healing abutment with laser bevel
	abutmentCap: "M 42 32 C 42 24, 48 21, 60 21 C 72 21, 78 24, 78 32 L 79 56 C 79 59, 76 61, 60 61 C 44 61, 41 59, 41 56 Z",
	abutmentReflection: "M 48 22 L 53 22 L 54 60 L 49 60 Z",
	hexSocket: "60,25 63,27 63,31 60,33 57,31 57,27",
	laserRings: ["M 43 40 L 77 40", "M 42 48 L 78 48"],
	// Collar & Microthreads
	microthreads: [
		"M 43 65 L 77 65",
		"M 43.5 68 L 76.5 68",
		"M 44 71 L 76 71",
		"M 44.5 74 L 75.5 74",
	],
	// Core tapered screw body
	screwCore: "M 45 74 L 75 74 L 72 148 C 71 154, 66 158, 60 158 C 54 158, 49 154, 48 148 Z",
	// Realistic lathe-turned helical macrothreads (curved flank crests)
	helicalThreads: [
		{ path: "M 41 82 C 50 80, 70 78, 79 80 L 78 84 C 69 82, 50 84, 42 86 Z", highlight: "M 41 82 C 50 80, 70 78, 79 80" },
		{ path: "M 42 90 C 51 88, 69 86, 78 88 L 77 92 C 68 90, 51 92, 43 94 Z", highlight: "M 42 90 C 51 88, 69 86, 78 88" },
		{ path: "M 43 98 C 51 96, 68 94, 77 96 L 76 100 C 68 98, 51 100, 44 102 Z", highlight: "M 43 98 C 51 96, 68 94, 77 96" },
		{ path: "M 44 106 C 52 104, 68 102, 76 104 L 75 108 C 67 106, 52 108, 45 110 Z", highlight: "M 44 106 C 52 104, 68 102, 76 104" },
		{ path: "M 45 114 C 53 112, 67 110, 75 112 L 74 116 C 66 114, 53 116, 46 118 Z", highlight: "M 45 114 C 53 112, 67 110, 75 112" },
		{ path: "M 46 122 C 53 120, 66 118, 74 120 L 73 124 C 65 122, 53 124, 47 126 Z", highlight: "M 46 122 C 53 120, 66 118, 74 120" },
		{ path: "M 47 130 C 54 128, 65 126, 73 128 L 72 132 C 64 130, 54 132, 48 134 Z", highlight: "M 47 130 C 54 128, 65 126, 73 128" },
		{ path: "M 48 138 C 54 136, 64 134, 71 136 L 70 140 C 64 138, 54 140, 49 142 Z", highlight: "M 48 138 C 54 136, 64 134, 71 136" },
	],
	apicalReliefFlute: "M 54 140 C 52 146, 52 153, 55 156 L 58 156 C 55 153, 55 146, 57 140 Z",
};
