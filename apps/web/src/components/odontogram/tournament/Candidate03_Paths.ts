/**
 * Candidate03_Paths.ts — Neo-Isometric 2.5D Odontogram Paths & Geometry.
 *
 * Implements mathematical pseudo-3D isometric projection (4-5 deg tilt)
 * with multi-plane gradient lighting, true edge thickness, and micro-anatomy.
 *
 * Designed for Competitor #3 in DENTE Odontogram Tournament.
 */

// ============================================================================
// 1. INCISOR (Tooth 11) — 3.5 deg isometric tilt, incisal edge thickness, labial lobes
// ============================================================================

export const INCISOR_PATHS = {
	viewBox: "0 0 130 180",
	// Ground drop shadow
	shadow: "M 32 170 C 32 166, 96 166, 96 170 C 96 174, 32 174, 32 170 Z",
	// Root body (conical with cylindrical isometric shading)
	rootLeft: "M 63 20 C 58 20, 52 42, 49 68 C 47 84, 46 95, 45 106 C 56 109, 64 107, 65 107 C 65 80, 64 45, 63 20 Z",
	rootRight: "M 63 20 C 64 45, 65 80, 65 107 C 66 107, 74 106, 80 102 C 78 88, 74 65, 71 46 C 68 30, 65 20, 63 20 Z",
	// CEJ collar (cervical step with 3D bevel)
	cejCollar: "M 44 106 C 54 110, 70 108, 81 102 C 81 104, 70 111, 44 108 Z",
	// Labial crown main body
	crownBody: "M 44 107 C 44 118, 41 138, 38 155 C 44 156, 76 155, 84 153 C 87 138, 85 118, 81 103 C 69 108, 54 109, 44 107 Z",
	// Developmental vertical grooves (mesial & distal labial lobes)
	mesialGroove: "M 52 118 C 51 130, 50 144, 49 154",
	distalGroove: "M 69 116 C 70 128, 71 142, 72 153",
	// 3D Incisal Edge Thickness Facet (visible due to 4 deg tilt)
	incisalFacet: "M 38 155 C 38 155, 43 162, 53 162 C 63 162, 73 161, 84 153 C 84 154, 76 164, 65 165 C 51 166, 40 162, 38 155 Z",
	// Mamelon lobes on incisal edge
	mamelon1: "M 42 156 C 45 159, 49 159, 52 156",
	mamelon2: "M 54 156 C 58 159, 63 159, 67 155",
	mamelon3: "M 69 155 C 73 158, 78 157, 82 153",
	// Specular highlight streak along mesial line angle
	specularHighlight: "M 42 114 C 41 128, 40 144, 41 153",
};

// ============================================================================
// 2. PREMOLAR (Tooth 14) — Bifurcated roots, 3D endo canals, occlusal table in isometric
// ============================================================================

export const PREMOLAR_PATHS = {
	viewBox: "0 0 130 180",
	shadow: "M 28 170 C 28 165, 102 165, 102 170 C 102 175, 28 175, 28 170 Z",
	// Palatal Root (in isometric background)
	palatalRoot: "M 76 26 C 72 26, 73 48, 75 66 C 76 74, 78 84, 80 92 C 86 90, 88 84, 87 75 C 86 56, 83 34, 79 27 C 78 26, 77 26, 76 26 Z",
	// Buccal Root (in foreground)
	buccalRoot: "M 48 22 C 45 22, 43 38, 43 56 C 43 72, 45 84, 46 95 C 55 97, 63 94, 65 90 C 63 76, 59 58, 54 38 C 52 28, 50 22, 48 22 Z",
	// Interradicular furcation shadow
	furcationShadow: "M 57 74 C 61 70, 67 71, 71 78 C 67 86, 61 87, 57 74 Z",
	// Translucent Root Canal (Endo Gutta-percha & illuminated path)
	buccalCanal: "M 48 25 C 47 42, 47 62, 51 82 C 53 88, 56 94, 57 98",
	palatalCanal: "M 76 29 C 75 46, 76 66, 74 82 C 73 88, 71 94, 69 98",
	pulpChamber: "M 53 98 C 50 102, 53 108, 62 108 C 72 108, 74 102, 71 98 C 68 96, 56 96, 53 98 Z",
	// Crown Body (Buccal + Palatal lobes)
	crownBody: "M 43 97 C 37 106, 35 124, 38 142 C 43 154, 52 163, 56 164 C 64 163, 84 154, 88 142 C 92 126, 91 106, 85 95 C 75 97, 55 98, 43 97 Z",
	// Occlusal Table (Isometric view revealing buccal & lingual cusps + grooves)
	occlusalFacet: "M 39 138 C 45 133, 76 130, 86 136 C 88 146, 72 158, 56 163 C 44 158, 38 148, 39 138 Z",
	centralGroove: "M 45 142 C 55 146, 68 144, 79 140",
	buccalTriangularRidge: "M 56 163 L 60 146",
	palatalCuspTip: "M 74 135 C 74 133, 78 133, 79 136",
	buccalCuspTip: "M 56 164 L 56 160",
	specularHighlight: "M 42 108 C 39 122, 40 136, 44 148",
};

// ============================================================================
// 3. MOLAR (Tooth 46) — 5 cusps, Y-fissures, 3D canals, periapical granuloma with depth
// ============================================================================

export const MOLAR_PATHS = {
	viewBox: "0 0 130 180",
	shadow: "M 20 172 C 20 167, 108 167, 108 172 C 108 177, 20 177, 20 172 Z",
	// Occlusal Table (5 cusps in 3D perspective at top, Y ~ 20-55)
	occlusalRim: "M 28 42 C 28 32, 40 22, 60 21 C 80 20, 100 28, 102 38 C 104 48, 96 58, 80 60 C 58 62, 36 58, 28 42 Z",
	// 5 Cusps anatomical facets
	cuspMB: "M 29 41 C 32 30, 48 26, 52 35 C 46 41, 36 45, 29 41 Z",
	cuspDB: "M 54 36 C 60 25, 76 26, 80 36 C 72 43, 62 42, 54 36 Z",
	cuspD: "M 82 37 C 88 32, 101 34, 101 41 C 98 47, 88 47, 82 37 Z",
	cuspML: "M 40 24 C 46 18, 58 19, 58 26 C 50 28, 44 28, 40 24 Z",
	cuspDL: "M 62 23 C 74 20, 88 23, 86 30 C 78 32, 68 30, 62 23 Z",
	// Anatomical Y-Fissure system
	centralFissures: "M 36 38 C 48 39, 58 38, 68 38 M 58 38 L 56 48 M 68 38 L 78 35 M 68 38 L 74 46 M 48 39 L 46 26 M 68 38 L 68 25",
	// Crown Buccal Trunk (Y = 48-78)
	crownTrunk: "M 27 44 C 25 56, 26 68, 28 78 C 45 81, 78 81, 100 75 C 102 65, 103 52, 101 40 C 92 52, 70 56, 27 44 Z",
	buccalGroove: "M 56 48 C 55 58, 56 68, 57 74",
	// Roots (Mandibular 2 roots: Mesial & Distal)
	mesialRoot: "M 28 78 C 26 94, 25 116, 29 138 C 31 145, 36 148, 41 146 C 45 142, 47 126, 50 108 C 52 96, 53 86, 54 80 C 44 81, 34 80, 28 78 Z",
	distalRoot: "M 64 79 C 64 88, 66 102, 71 118 C 76 132, 80 142, 85 142 C 89 140, 92 130, 93 116 C 96 98, 98 84, 99 75 C 88 78, 76 79, 64 79 Z",
	furcationArch: "M 54 80 C 56 88, 60 92, 64 79 Z",
	// 3D Root Canals (Endo)
	mesialCanal: "M 50 82 C 45 98, 38 118, 35 143",
	distalCanal: "M 74 81 C 76 98, 80 118, 83 138",
	// Spatial Periapical Granuloma with volumetric depth at mesial apex
	granulomaHalo: "M 18 144 C 18 130, 52 130, 52 144 C 52 158, 18 158, 18 144 Z",
	granulomaOuter: "M 22 144 C 22 133, 48 133, 48 144 C 48 155, 22 155, 22 144 Z",
	granulomaCore: "M 26 145 C 26 137, 44 137, 44 145 C 44 153, 26 153, 26 145 Z",
	granulomaCenter: "M 32 145 C 32 141, 38 141, 38 145 C 38 149, 32 149, 32 145 Z",
};

// ============================================================================
// 4. IMPLANT — Titanium screw, healing abutment collar, internal hex socket
// ============================================================================

export const IMPLANT_PATHS = {
	viewBox: "0 0 130 180",
	shadow: "M 34 168 C 34 164, 96 164, 96 168 C 96 172, 34 172, 34 168 Z",
	// Healing Abutment Top Ellipse (Y = 16-30)
	abutmentTop: "M 32 24 C 32 16, 98 16, 98 24 C 98 32, 32 32, 32 24 Z",
	abutmentBevel: "M 36 24 C 36 18, 94 18, 94 24 C 94 30, 36 30, 36 24 Z",
	// Internal Hexagonal Socket (шестигранный шлиц в изометрии)
	hexSocketRim: "M 65 19 L 75 22 L 75 27 L 65 30 L 55 27 L 55 22 Z",
	hexSocketDepth: "M 55 22 L 55 26 L 65 29 L 75 26 L 75 22 L 65 25 Z",
	hexCentralScrew: "M 63 25 C 63 23.5, 67 23.5, 67 25 C 67 26.5, 63 26.5, 63 25 Z",
	// Healing Abutment Collar (Y = 24 to 48)
	abutmentCollar: "M 32 24 L 34 46 C 44 50, 86 50, 96 46 L 98 24 C 86 31, 44 31, 32 24 Z",
	// Platform Switching Ring / Neck (Y = 46 to 54)
	platformNeck: "M 38 46 L 40 54 C 50 56, 80 56, 90 54 L 92 46 C 82 49, 48 49, 38 46 Z",
	// Micro-threads on implant neck
	microThread1: "M 40 55 C 50 57, 80 57, 90 55",
	microThread2: "M 41 58 C 50 60, 79 60, 89 58",
	// 8 Isometric Helical Macro-Threads
	threads: [
		{ path: "M 42 63 C 52 66, 78 66, 88 63 L 87 67 C 77 70, 51 70, 41 67 Z", crest: "M 41 67 C 51 70, 77 70, 87 67" },
		{ path: "M 43 72 C 53 75, 77 75, 87 72 L 86 76 C 76 79, 52 79, 42 76 Z", crest: "M 42 76 C 52 79, 76 79, 86 76" },
		{ path: "M 44 81 C 54 84, 76 84, 86 81 L 85 85 C 75 88, 53 88, 43 85 Z", crest: "M 43 85 C 53 88, 75 88, 85 85" },
		{ path: "M 45 90 C 55 93, 75 93, 85 90 L 84 94 C 74 97, 54 97, 44 94 Z", crest: "M 44 94 C 54 97, 74 97, 84 94" },
		{ path: "M 47 99 C 56 102, 74 102, 83 99 L 82 103 C 73 106, 55 106, 46 103 Z", crest: "M 46 103 C 55 106, 73 106, 82 103" },
		{ path: "M 49 108 C 57 111, 73 111, 81 108 L 80 112 C 72 115, 56 115, 48 112 Z", crest: "M 48 112 C 56 115, 72 115, 80 112" },
		{ path: "M 51 117 C 58 120, 72 120, 79 117 L 78 121 C 71 124, 57 124, 50 121 Z", crest: "M 50 121 C 57 124, 71 124, 78 121" },
		{ path: "M 53 126 C 60 129, 70 129, 77 126 L 76 130 C 69 133, 59 133, 52 130 Z", crest: "M 52 130 C 59 133, 69 133, 76 130" },
		{ path: "M 56 135 C 61 137, 69 137, 74 135 L 73 138 C 68 140, 60 140, 55 138 Z", crest: "M 55 138 C 60 140, 68 140, 73 138" },
	],
	// Implant Tapered Core Body (behind threads)
	fixtureBody: "M 41 55 L 56 148 C 60 154, 70 154, 74 148 L 89 55 Z",
	// Apical Self-Tapping Flutes (вертикальные режущие проточки)
	fluteLeft: "M 52 132 C 53 140, 56 148, 59 152 L 61 150 C 58 144, 55 136, 54 130 Z",
	fluteRight: "M 78 132 C 77 140, 74 148, 71 152 L 69 150 C 72 144, 75 136, 76 130 Z",
	// Rounded apical tip
	apexTip: "M 59 152 C 62 156, 68 156, 71 152 Z",
};

// ============================================================================
// 5. GRADIENT & SHADING DEFINITIONS (Reusable between Light & Dark themes)
// ============================================================================

export const NEO_ISO_GRADIENTS = {
	light: {
		enamelMain: { id: "iso-enamel-light", x1: "0%", y1: "0%", x2: "100%", y2: "100%", stops: [
			{ offset: "0%", color: "#ffffff", opacity: 1 },
			{ offset: "40%", color: "#f8fafc", opacity: 1 },
			{ offset: "80%", color: "#e2e8f0", opacity: 1 },
			{ offset: "100%", color: "#cbd5e1", opacity: 1 },
		]},
		enamelFacet: { id: "iso-facet-light", x1: "0%", y1: "0%", x2: "100%", y2: "0%", stops: [
			{ offset: "0%", color: "#f1f5f9", opacity: 1 },
			{ offset: "50%", color: "#e2e8f0", opacity: 1 },
			{ offset: "100%", color: "#94a3b8", opacity: 1 },
		]},
		rootMain: { id: "iso-root-light", x1: "0%", y1: "0%", x2: "100%", y2: "0%", stops: [
			{ offset: "0%", color: "#fef9c3", opacity: 1 },
			{ offset: "45%", color: "#fef08a", opacity: 1 },
			{ offset: "85%", color: "#facc15", opacity: 0.85 },
			{ offset: "100%", color: "#ca8a04", opacity: 0.9 },
		]},
		rootShadow: { id: "iso-root-shadow-light", x1: "0%", y1: "0%", x2: "100%", y2: "0%", stops: [
			{ offset: "0%", color: "#eab308", opacity: 0.8 },
			{ offset: "100%", color: "#a16207", opacity: 0.9 },
		]},
		titaniumBright: { id: "iso-ti-bright-light", x1: "0%", y1: "0%", x2: "100%", y2: "0%", stops: [
			{ offset: "0%", color: "#f1f5f9", opacity: 1 },
			{ offset: "35%", color: "#ffffff", opacity: 1 },
			{ offset: "70%", color: "#cbd5e1", opacity: 1 },
			{ offset: "100%", color: "#64748b", opacity: 1 },
		]},
		titaniumDark: { id: "iso-ti-dark-light", x1: "0%", y1: "0%", x2: "100%", y2: "0%", stops: [
			{ offset: "0%", color: "#64748b", opacity: 1 },
			{ offset: "50%", color: "#475569", opacity: 1 },
			{ offset: "100%", color: "#1e293b", opacity: 1 },
		]},
		stroke: "#475569",
		strokeSubtle: "#94a3b8",
	},
	dark: {
		enamelMain: { id: "iso-enamel-dark", x1: "0%", y1: "0%", x2: "100%", y2: "100%", stops: [
			{ offset: "0%", color: "#f8fafc", opacity: 1 },
			{ offset: "40%", color: "#e2e8f0", opacity: 1 },
			{ offset: "80%", color: "#94a3b8", opacity: 1 },
			{ offset: "100%", color: "#475569", opacity: 1 },
		]},
		enamelFacet: { id: "iso-facet-dark", x1: "0%", y1: "0%", x2: "100%", y2: "0%", stops: [
			{ offset: "0%", color: "#94a3b8", opacity: 1 },
			{ offset: "50%", color: "#64748b", opacity: 1 },
			{ offset: "100%", color: "#334155", opacity: 1 },
		]},
		rootMain: { id: "iso-root-dark", x1: "0%", y1: "0%", x2: "100%", y2: "0%", stops: [
			{ offset: "0%", color: "#fef08a", opacity: 0.9 },
			{ offset: "45%", color: "#eab308", opacity: 0.85 },
			{ offset: "85%", color: "#ca8a04", opacity: 0.8 },
			{ offset: "100%", color: "#854d0e", opacity: 0.9 },
		]},
		rootShadow: { id: "iso-root-shadow-dark", x1: "0%", y1: "0%", x2: "100%", y2: "0%", stops: [
			{ offset: "0%", color: "#ca8a04", opacity: 0.8 },
			{ offset: "100%", color: "#713f12", opacity: 0.9 },
		]},
		titaniumBright: { id: "iso-ti-bright-dark", x1: "0%", y1: "0%", x2: "100%", y2: "0%", stops: [
			{ offset: "0%", color: "#94a3b8", opacity: 1 },
			{ offset: "35%", color: "#e2e8f0", opacity: 1 },
			{ offset: "70%", color: "#64748b", opacity: 1 },
			{ offset: "100%", color: "#334155", opacity: 1 },
		]},
		titaniumDark: { id: "iso-ti-dark-dark", x1: "0%", y1: "0%", x2: "100%", y2: "0%", stops: [
			{ offset: "0%", color: "#475569", opacity: 1 },
			{ offset: "50%", color: "#334155", opacity: 1 },
			{ offset: "100%", color: "#0f172a", opacity: 1 },
		]},
		stroke: "#94a3b8",
		strokeSubtle: "#64748b",
	},
} as const;
