/**
 * DENTE Dental CRM — Advanced Clinical Pathology Geometry for Tooth 46
 * 1. Resorcinol Formalin (Stain & Obliterated Canals)
 * 2. Calcium Hydroxide (Intracanal Paste & Cavit Access Seal)
 * 3. Pathological Attrition (Worn Cusps & Exposed Dentin Craters)
 * 4. Root / Furcation Perforation (Defect, Extruded Sealer, Furcation Halo)
 * 5. Canal Ledge (Middle-Third Shelf & False Pathway)
 * 6. Vertical Root Fracture (Longitudinal Hairline & Shimmer)
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH46_ADVANCED_PATHOLOGY_GEOMETRY = {
	// 1. Resorcinol-Formalin Obliterated Root Canal Traces
	resorcinol: {
		mesialCanalTrace: "M 38,82 C 34,96 28,118 23.5,146",
		distalCanalTrace: "M 62,82 C 67,98 72,120 78.5,144",
	},

	// 2. Calcium Hydroxide Ca(OH)2 Dense Intracanal Paste & Cavit Access
	calcium: {
		cavitSeal:
			"M 34,42 C 44,40 56,40 66,42 C 68,54 67,68 64,74 C 54,76 46,76 36,74 C 33,68 32,54 34,42 Z",
		cavitLine: "M 36,58 C 46,57 54,57 64,58",
		mbPaste:
			"M 37.5,82 C 34.5,96 28.5,118 23.5,145 L 25.5,145 C 30.5,118 36.5,96 39.5,82 Z",
		mlPaste:
			"M 40.5,82 C 37.5,98 32.5,120 24.5,145 L 26.5,145 C 34.5,120 39.5,98 42.5,82 Z",
		distalPaste:
			"M 59.5,82 C 64.5,98 69.5,120 77.0,143 L 79.5,143 C 72.5,120 66.5,98 62.5,82 Z",
	},

	// 3. Pathological Attrition (Flat Occlusal Plateau & 5 Exposed Dentin Facets)
	attrition: {
		plateauMask:
			"M 13.0,38 C 13.8,30 18.0,26 24,26 L 38,26 L 50,26 L 62,26 L 74,26 C 80.0,26 84.5,30 85.5,38 L 84,74 C 68,76.2 32,76.2 16,74 Z",
		facets: [
			{ id: "mb", cx: 25, cy: 26.8, rx: 4.8, ry: 2.2 },
			{ id: "db", cx: 50, cy: 26.8, rx: 5.0, ry: 2.2 },
			{ id: "d", cx: 73, cy: 27.2, rx: 4.2, ry: 2.0 },
			{ id: "ml", cx: 37, cy: 25.2, rx: 4.2, ry: 1.8 },
			{ id: "dl", cx: 63, cy: 25.2, rx: 4.2, ry: 1.8 },
		],
	},

	// 4. Root / Furcation Perforation
	perforation: {
		pulpFloorDefect: "M 47,94 L 53,94 L 52,100 C 50,102 48,101 46,99 Z",
		extrudedSealer:
			"M 47.5,99 C 45.5,103 46.5,107 50,107 C 53.5,107 54.5,103 52.5,99 Z",
		furcationHalo:
			"M 41,105 C 44,98 56,98 59,105 C 61,112 39,112 41,105 Z",
	},

	// 5. Canal Ledge (Middle Third Shelf in Mesial Canal)
	ledge: {
		canalUpper: "M 38,82 C 35,94 30.5,106 27,114 L 21.5,116",
		ledgeShelf: "M 21.5,116 L 25.0,116",
		trueLumenGhost: "M 25,116 C 24,124 23.5,136 23,147",
		instrumentStop: "M 21.5,114.5 L 25.0,114.5 L 24.5,116 L 21.5,116 Z",
	},

	// 6. Vertical Root Fracture (VRF Longitudinal Hairline)
	rootFracture: {
		mainCrack:
			"M 22.0,76 L 21.2,86 L 22.8,96 L 20.5,108 L 22.2,120 L 19.8,132 L 23.0,149",
		shimmerLine:
			"M 21.4,76 L 20.6,86 L 22.2,96 L 19.9,108 L 21.6,120 L 19.2,132 L 22.4,149",
		haloShadow:
			"M 19,86 C 18,104 16,122 20,142 C 24,142 26,122 25,104 C 24,86 21,86 19,86 Z",
	},
} as const;
