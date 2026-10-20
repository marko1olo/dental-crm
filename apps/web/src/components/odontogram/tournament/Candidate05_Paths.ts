/**
 * DENTE Odontogram Tournament — Candidate #5: HIGH-TECH CYBER-CLINIC
 * Pure vector Bezier curves, cybernetic luminescence, and surgical precision.
 */

export const CYBER_VIEWBOX = "0 0 100 160";

// ---------------------------------------------------------------------------
// 1. INCISOR 11 (Резец 11: чистая геометрия, мамелоны, неоновое ребро)
// ---------------------------------------------------------------------------
export const INCISOR_PATHS = {
	// Root (Apex at y=16, CEJ at y=78)
	root: "M 50 16 C 42 22, 36 44, 34 78 C 42 83, 58 83, 66 78 C 64 44, 58 22, 50 16 Z",
	rootCanal: "M 50 20 L 50 76",
	rootHighlight: "M 46 26 C 41 38, 38 56, 37 74",
	cejLine: "M 34 78 C 42 84, 58 84, 66 78",
	// Crown (CEJ at y=78 to Incisal edge at y=146)
	crown: "M 34 78 C 29 96, 24 122, 24 144 C 33 147, 43 147.5, 50 147 C 57 147.5, 67 147, 76 144 C 76 122, 71 96, 66 78 C 58 84, 42 84, 34 78 Z",
	// Developmental mamelons / facets
	mamelonGroove1: "M 41 120 L 41 146",
	mamelonGroove2: "M 59 120 L 59 146",
	// Incisal bevel facet
	incisalFacet: "M 25 142 C 34 145, 66 145, 75 142 L 76 144 C 67 147, 33 147, 24 144 Z",
	// Specular highlight crest
	specularHighlight: "M 30 86 C 27 106, 26 128, 27 140",
	innerFacet: "M 35 88 C 32 108, 32 130, 36 140 L 64 140 C 68 130, 68 108, 65 88 Z",
};

// ---------------------------------------------------------------------------
// 2. PREMOLAR 14 (Премоляр 14: бифуркация, люминесцентные каналы)
// ---------------------------------------------------------------------------
export const PREMOLAR_PATHS = {
	// Bifurcated roots (Buccal left, Palatal right)
	roots: "M 34 18 C 30 26, 28 50, 31 78 C 38 82, 62 82, 69 78 C 72 50, 70 26, 66 18 C 61 24, 58 40, 50 48 C 42 40, 39 24, 34 18 Z",
	bifurcationNotch: "M 50 48 C 46 36, 42 24, 34 18 M 50 48 C 54 36, 58 24, 66 18",
	// Glowing Endodontic Canals (Neon coral)
	canalBuccal: "M 35 22 C 33 34, 37 54, 46 86",
	canalPalatal: "M 65 22 C 67 34, 63 54, 54 86",
	pulpChamber: "M 44 86 C 42 92, 43 98, 50 100 C 57 98, 58 92, 56 86 Z",
	// High-contrast crown with 2 cusps
	crown: "M 31 78 C 24 92, 22 118, 26 138 C 34 146, 44 147, 50 140 C 56 147, 66 146, 74 138 C 78 118, 76 92, 69 78 C 62 82, 38 82, 31 78 Z",
	centralGroove: "M 50 100 L 50 138",
	cuspRidgeBuccal: "M 34 102 C 30 118, 30 132, 36 142",
	cuspRidgePalatal: "M 66 102 C 70 118, 70 132, 64 142",
};

// ---------------------------------------------------------------------------
// 3. MOLAR 46 (Моляр 46: 3 канала, периапикальное пламя патологии)
// ---------------------------------------------------------------------------
export const MOLAR_PATHS = {
	// Crown at top (y=22..74), 5 distinct cusps
	crown: "M 20 74 C 18 56, 17 38, 22 28 C 30 24, 38 29, 44 26 C 50 23, 56 27, 64 24 C 72 26, 78 23, 82 30 C 85 40, 83 58, 80 74 C 70 78, 30 78, 20 74 Z",
	crownGrooves: "M 34 30 C 36 44, 44 54, 50 56 C 56 54, 64 44, 66 30 M 50 56 L 50 74",
	cuspHighlights: "M 24 32 C 26 40, 32 46, 38 46 M 62 46 C 68 46, 74 40, 76 32",
	// Roots bifurcated pointing down (y=74..142)
	roots: "M 20 74 C 18 96, 22 124, 27 141 C 33 142, 38 136, 41 122 C 45 106, 47 94, 50 90 C 53 94, 55 106, 59 122 C 62 136, 67 142, 73 141 C 78 124, 82 96, 80 74 C 70 78, 30 78, 20 74 Z",
	furcationGutter: "M 50 90 L 50 78",
	// Large pulp chamber & 3 luminescent canals
	pulpChamber: "M 32 64 C 32 58, 68 58, 68 64 C 68 70, 32 70, 32 64 Z",
	canalMesiobuccal: "M 36 68 C 34 86, 30 114, 26 138",
	canalMesiolingual: "M 42 68 C 40 88, 36 116, 31 138",
	canalDistal: "M 62 68 C 64 88, 69 116, 72 138",
	// Periapical Pathology Flame / Halo at Mesial & Distal Apices
	pathologyHaloMesial: "M 28 141 C 18 135, 14 145, 20 154 C 26 161, 36 158, 38 150 C 40 144, 34 136, 28 141 Z",
	pathologyFlameCore: "M 28 143 C 22 140, 20 148, 24 153 C 28 157, 34 155, 34 149 C 34 145, 31 141, 28 143 Z",
	pathologyRays: "M 28 137 L 28 133 M 18 142 L 13 141 M 19 152 L 14 156 M 29 159 L 30 164 M 38 154 L 43 158 M 38 143 L 43 139",
};

// ---------------------------------------------------------------------------
// 4. CAD/CAM IMPLANT (Имплант: темный оксидированный титан, неон-насечки)
// ---------------------------------------------------------------------------
export const IMPLANT_PATHS = {
	// Polished Mirror Chrome Healing Cap (Gingival Former) at y=20..38
	formerCap: "M 34 26 C 34 22, 66 22, 66 26 L 68 36 C 68 38, 32 38, 32 36 Z",
	formerHex: "M 46 25 L 54 25 L 57 28 L 54 31 L 46 31 L 43 28 Z",
	formerHighlight: "M 36 25 L 36 36 M 52 24 L 52 37",
	formerBevel: "M 30 36 L 70 36 L 68 42 L 32 42 Z",
	// Dark Oxidized Titanium Fixture Body (y=42..146)
	fixtureBody: "M 32 42 L 68 42 L 64 138 C 64 146, 36 146, 36 138 Z",
	apicalDome: "M 36 138 C 36 147, 64 147, 64 138 Z",
	// Apical cutting flute (vent groove)
	apicalFlute: "M 50 146 L 46 130 L 54 130 Z",
	// Micro-grooves at the neck collar (Laser-Lok)
	collarGrooves: [
		{ y: 45, x1: 33, x2: 67 },
		{ y: 48, x1: 33.5, x2: 66.5 },
		{ y: 51, x1: 34, x2: 66 },
	],
	// Self-Tapping Helical Thread Ridges (Progressive pitch)
	threads: [
		{ y: 58, x1: 32, x2: 68, depth: 2 },
		{ y: 68, x1: 32.5, x2: 67.5, depth: 2.2 },
		{ y: 78, x1: 33, x2: 67, depth: 2.4 },
		{ y: 88, x1: 33.5, x2: 66.5, depth: 2.5 },
		{ y: 98, x1: 34, x2: 66, depth: 2.5 },
		{ y: 108, x1: 34.5, x2: 65.5, depth: 2.6 },
		{ y: 118, x1: 35, x2: 65, depth: 2.6 },
		{ y: 128, x1: 35.5, x2: 64.5, depth: 2.4 },
	],
	// Depth Calibration Laser Markings (mm)
	depthMarks: [
		{ y: 78, label: "8mm", x: 74 },
		{ y: 98, label: "10mm", x: 74 },
		{ y: 118, label: "12mm", x: 74 },
	],
};

// ---------------------------------------------------------------------------
// THEME COLOR PALETTES (CYBER-CLINIC HIGH CONTRAST)
// ---------------------------------------------------------------------------
export const CYBER_PALETTES = {
	dark: {
		bg: "#0d131f",
		enamelGradStart: "#2a3b53",
		enamelGradEnd: "#141d2b",
		enamelStroke: "#38bdf8",
		dentinFill: "#1e293b",
		neonGlow: "#00f5ff",
		canalPulse: "#ff2d75",
		canalCore: "#fff0f5",
		flameHalo: "#f59e0b",
		flameCore: "#ef4444",
		titaniumStart: "#1e293b",
		titaniumEnd: "#0b0f17",
		titaniumHighlight: "#00f5ff",
		chromeStart: "#f8fafc",
		chromeEnd: "#64748b",
		gridLines: "#1e293b",
		hudText: "#38bdf8",
	},
	light: {
		bg: "#f8fafc",
		enamelGradStart: "#ffffff",
		enamelGradEnd: "#dbeafe",
		enamelStroke: "#0284c7",
		dentinFill: "#f1f5f9",
		neonGlow: "#0284c7",
		canalPulse: "#e11d48",
		canalCore: "#ffffff",
		flameHalo: "#d97706",
		flameCore: "#dc2626",
		titaniumStart: "#334155",
		titaniumEnd: "#0f172a",
		titaniumHighlight: "#0284c7",
		chromeStart: "#ffffff",
		chromeEnd: "#94a3b8",
		gridLines: "#e2e8f0",
		hudText: "#0369a1",
	},
};


