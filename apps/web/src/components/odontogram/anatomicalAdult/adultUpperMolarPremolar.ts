/**
 * DENTE Dental CRM — Adult Upper Molar & Premolar Geometries
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { AnatomicalTemplateData } from "../anatomicalGeometriesTypes";

export const UPPER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown: "M 16 96 C 10 110, 8 138, 24 148 C 34 153, 48 150, 50 142 C 52 150, 66 153, 76 148 C 92 138, 90 110, 84 96 Q 50 92 16 96 Z",
	root: "M 16 96 C 11 72, 14 38, 22 14 C 28 22, 34 46, 36 66 C 42 46, 46 22, 50 6 C 54 22, 58 46, 64 66 C 66 46, 72 22, 78 18 C 86 38, 89 72, 84 96 Z",
	cej: "M 16 96 Q 50 92 84 96",
	fissures: "M 28 132 Q 50 140 72 132 M 50 118 L 50 142 M 36 122 Q 50 126 64 122",
	pulpChamber: "M 28 126 C 26 116, 32 102, 36 96 C 42 90, 58 90, 64 96 C 68 102, 74 116, 72 126 C 66 130, 56 122, 50 126 C 44 122, 34 130, 28 126 Z",
	canals: [
		{ id: "MB1", nameRu: "Медиально-щечный 1 (MB1)", path: "M 36 104 C 32 82, 22 46, 22 14", apex: { x: 22, y: 14 }, defaultLengthMm: 21.0 },
		{ id: "MB2", nameRu: "Медиально-щечный 2 (MB2)", path: "M 40 104 C 36 82, 27 48, 26 20", apex: { x: 26, y: 20 }, defaultLengthMm: 20.5 },
		{ id: "P", nameRu: "Нёбный (Palatal)", path: "M 50 104 C 50 74, 50 36, 50 6", apex: { x: 50, y: 6 }, defaultLengthMm: 22.0 },
		{ id: "DB", nameRu: "Дистально-щечный (DB)", path: "M 64 104 C 68 82, 78 48, 78 18", apex: { x: 78, y: 18 }, defaultLengthMm: 20.0 },
	],
	apexHalos: [{ x: 22, y: 14 }, { x: 50, y: 6 }, { x: 78, y: 18 }],
	periodontal: {
		boneCrestNormal: "M 12 86 Q 50 82 88 86",
		boneResorptionMild: "M 12 76 Q 50 72 88 76",
		boneResorptionModerate: "M 12 62 Q 50 58 88 62",
		boneResorptionSevere: "M 12 44 Q 50 40 88 44",
		furcationSites: [
			{ id: "MB_DB_Buccal", nameRu: "Щечная трифуркация", position: { x: 50, y: 66 }, type: "trifurcation_buccal" as const },
			{ id: "MB_P_Mesial", nameRu: "Медиально-нёбная фуркация", position: { x: 36, y: 68 }, type: "trifurcation_mesial" as const },
			{ id: "DB_P_Distal", nameRu: "Дистально-нёбная фуркация", position: { x: 64, y: 68 }, type: "trifurcation_distal" as const },
		],
	},
	surfaces: {
		O: "M 30 122 Q 50 128 70 122 L 66 142 Q 50 146 34 142 Z",
		V: "M 16 96 C 32 93, 68 93, 84 96 L 70 122 Q 50 128 30 122 Z",
		L: "M 34 142 Q 50 146 66 142 L 76 148 C 66 153, 34 153, 24 148 Z",
		M: "M 16 96 L 30 122 L 34 142 L 24 148 C 10 138, 10 110, 16 96 Z",
		D: "M 84 96 C 90 110, 90 138, 76 148 L 66 142 L 70 122 Z",
		C: "M 16 96 Q 50 92 84 96 L 78 108 Q 50 104 22 108 Z",
	},
	viewBox: { x: 0, y: 0, width: 100, height: 160 },
	standardWidthPx: 88,
	standardHeightPx: 150,
};

export const UPPER_PREMOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown: "M 22 96 C 16 108, 16 136, 32 146 C 42 150, 58 150, 68 146 C 84 136, 84 108, 78 96 Q 50 92 22 96 Z",
	root: "M 22 96 C 19 74, 24 44, 32 12 C 38 26, 46 48, 50 62 C 54 48, 62 26, 68 12 C 76 44, 81 74, 78 96 Z",
	cej: "M 22 96 Q 50 92 78 96",
	fissures: "M 34 130 Q 50 134 66 130 M 50 120 L 50 140",
	pulpChamber: "M 36 122 C 34 114, 38 102, 42 96 C 46 92, 54 92, 58 96 C 62 102, 66 114, 64 122 C 58 126, 54 118, 50 122 C 46 118, 42 126, 36 122 Z",
	canals: [
		{ id: "B", nameRu: "Щечный (Buccal)", path: "M 40 102 C 36 76, 32 40, 32 14", apex: { x: 32, y: 14 }, defaultLengthMm: 21.5 },
		{ id: "P", nameRu: "Нёбный (Palatal)", path: "M 60 102 C 64 76, 68 40, 68 14", apex: { x: 68, y: 14 }, defaultLengthMm: 21.5 },
	],
	apexHalos: [{ x: 32, y: 14 }, { x: 68, y: 14 }],
	periodontal: {
		boneCrestNormal: "M 20 86 Q 50 81 80 86",
		boneResorptionMild: "M 20 74 Q 50 70 80 74",
		boneResorptionModerate: "M 20 60 Q 50 56 80 60",
		boneResorptionSevere: "M 20 42 Q 50 38 80 42",
		furcationSites: [
			{ id: "B_P_Bifurcation", nameRu: "Бифуркация верхнего премоляра", position: { x: 50, y: 62 }, type: "bifurcation" as const },
		],
	},
	surfaces: {
		O: "M 34 122 Q 50 126 66 122 L 62 138 Q 50 142 38 138 Z",
		V: "M 22 96 C 36 93, 64 93, 78 96 L 66 122 Q 50 126 34 122 Z",
		L: "M 38 138 Q 50 142 62 138 L 68 146 C 58 150, 42 150, 32 146 Z",
		M: "M 22 96 L 34 122 L 38 138 L 32 146 C 16 136, 16 108, 22 96 Z",
		D: "M 78 96 C 84 108, 84 136, 68 146 L 62 138 L 66 122 Z",
		C: "M 22 96 Q 50 92 78 96 L 74 108 Q 50 104 26 108 Z",
	},
	viewBox: { x: 10, y: 0, width: 80, height: 160 },
	standardWidthPx: 72,
	standardHeightPx: 150,
};
