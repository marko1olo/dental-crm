/**
 * DENTE Dental CRM — Monolithic Anatomical Sculpture for Upper Molar 1 (FDI 16 / 26)
 * Wheeler's Dental Anatomy (11th Ed., Ch. 11) 2.5D projection (17.5° tilt).
 * Features: Rhomboid crown, Crista Obliqua, Tuberculum Carabelli, 3 roots, 4 canals.
 * All coordinates mapped to SVG ViewBox "0 0 100 160" (Mandate 8b <= 120 lines).
 */

import {
	TOOTH16_ENDO_CANALS,
	TOOTH16_PERIAPICAL_ANCHORS,
} from "./tooth16EndoConstants";

export interface Tooth16CuspDef {
	id: "ML" | "MB" | "DB" | "DL" | "Carabelli";
	nameRu: string;
	apex: { x: number; y: number };
	ridgePath: string;
}

export const TOOTH16_GEOMETRY = {
	viewBox: "0 0 100 160",
	aspectRatio: "100 / 160",
	cejCurve: "M 14,96 C 34,92 66,92 86,96",
	// Rhomboid crown silhouette with Carabelli prominence on mesiopalatal line
	crownMonolithPath:
		"M 14,96 C 11,106 10,122 12,132 C 14,136 17,140 20,144 " +
		"C 23,148 28,152 34,154 C 44,155 52,152 58,150 C 64,152 72,152 78,148 " +
		"C 84,144 87,138 88,128 C 89,118 88,106 86,96 C 66,92 34,92 14,96 Z",
	// Carabelli tubercle prominence contour
	carabelliCuspPath:
		"M 14,128 C 11,134 12,142 16,146 C 20,149 25,148 28,144 C 23,142 19,136 18,130 Z",
	carabelliGroove: "M 16,128 C 18,135 22,142 27,144",
	// Three divergent roots: MB (curved), Palatal (longest/straight), DB (conical)
	rootMonolithPath:
		"M 14,96 C 11,70 12,38 18,14 C 23,14 26,24 29,42 C 32,56 36,66 40,68 " +
		"C 44,46 47,24 50,8 C 53,24 56,46 60,68 C 64,66 68,56 71,42 " +
		"C 74,24 77,18 82,18 C 87,38 88,70 86,96 Z",
	palatalRootCenter: "M 50,8 C 50,30 50,56 50,72",
	mbSulcusLongitudinalis: "M 20,18 C 22,38 26,62 30,78",
	dbSulcusLongitudinalis: "M 80,22 C 78,40 76,62 72,78",
	trifurcationBuccal: { x: 50, y: 64 },
	trifurcationShadowPath:
		"M 40,68 C 46,62 50,60 50,60 C 50,60 54,62 60,68 C 55,65 45,65 40,68 Z",
	palatalApex: { x: 50, y: 8 },
	mbApex: { x: 18, y: 14 },
	dbApex: { x: 82, y: 18 },
	// Crista Obliqua (Oblique Ridge) running from ML cusp to DB cusp
	cristaObliquaRidge: "M 36,138 C 46,133 56,129 66,126",
	cristaObliquaShadow: "M 37,140 C 47,135 57,131 67,128",
	// Occlusal central & distal basins
	centralBasinPath:
		"M 26,120 C 34,116 44,116 52,118 C 50,126 44,130 36,132 C 28,130 24,124 26,120 Z",
	distalBasinPath:
		"M 56,132 C 64,128 72,126 78,130 C 76,136 70,140 62,142 C 58,138 56,134 56,132 Z",
	fissures: {
		centralPit: { x: 42, y: 124 },
		distalPit: { x: 68, y: 134 },
		sulcusCentralis: "M 26,120 C 34,123 42,124 50,122",
		sulcusDistopalatalis: "M 50,122 C 58,128 66,134 72,144",
		sulcusBuccalis: "M 42,124 C 41,114 42,104 44,98",
	},
	cusps: [
		{
			id: "ML",
			nameRu: "Мезиально-нёбный (ML)",
			apex: { x: 36, y: 144 },
			ridgePath: "M 36,144 C 38,138 42,130 46,124",
		},
		{
			id: "MB",
			nameRu: "Мезиально-щечный (MB)",
			apex: { x: 26, y: 122 },
			ridgePath: "M 26,122 C 32,123 38,124 42,124",
		},
		{
			id: "DB",
			nameRu: "Дистально-щечный (DB)",
			apex: { x: 68, y: 124 },
			ridgePath: "M 68,124 C 62,125 56,126 50,122",
		},
		{
			id: "DL",
			nameRu: "Дистально-нёбный (DL)",
			apex: { x: 68, y: 144 },
			ridgePath: "M 68,144 C 64,138 60,132 56,132",
		},
		{
			id: "Carabelli",
			nameRu: "Бугорок Карабелли",
			apex: { x: 18, y: 138 },
			ridgePath: "M 18,138 C 22,141 26,143 30,143",
		},
	] as readonly Tooth16CuspDef[],
	endoCanals: TOOTH16_ENDO_CANALS,
	periapicalAnchors: TOOTH16_PERIAPICAL_ANCHORS,
} as const;
