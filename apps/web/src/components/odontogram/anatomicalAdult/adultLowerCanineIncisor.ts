/**
 * DENTE Dental CRM — Adult Lower Canine & Incisor Geometries
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { AnatomicalTemplateData } from "../anatomicalGeometriesTypes";

export const LOWER_CANINE_GEOMETRY: AnatomicalTemplateData = {
	crown: "M 26 64 C 20 50, 18 26, 50 8 C 82 26, 80 50, 74 64 Q 50 68 26 64 Z",
	root: "M 26 64 C 23 88, 34 126, 50 156 C 66 126, 77 88, 74 64 Z",
	cej: "M 26 64 Q 50 68 74 64",
	fissures: "M 50 42 L 50 12",
	pulpChamber: "M 42 36 C 40 46, 42 60, 46 88 C 48 120, 49 146, 50 156 C 51 146, 52 120, 54 88 C 58 60, 60 46, 58 36 C 54 28, 46 28, 42 36 Z",
	canals: [
		{ id: "Main", nameRu: "Основной канал клыка", path: "M 50 40 C 50 72, 50 118, 50 156", apex: { x: 50, y: 156 }, defaultLengthMm: 25.5 },
	],
	apexHalos: [{ x: 50, y: 156 }],
	periodontal: {
		boneCrestNormal: "M 22 74 Q 50 79 78 74",
		boneResorptionMild: "M 22 86 Q 50 91 78 86",
		boneResorptionModerate: "M 22 104 Q 50 109 78 104",
		boneResorptionSevere: "M 22 126 Q 50 131 78 126",
		furcationSites: [],
	},
	surfaces: {
		O: "M 38 38 Q 50 34 62 38 L 50 8 Z",
		V: "M 26 64 C 38 67, 62 67, 74 64 L 62 38 Q 50 34 38 38 Z",
		L: "M 38 38 L 50 8 L 62 38 Q 50 24 38 38 Z",
		M: "M 26 64 L 38 38 L 50 8 C 28 22, 22 46, 26 64 Z",
		D: "M 74 64 C 78 46, 72 22, 50 8 L 62 38 Z",
		C: "M 26 64 Q 50 68 74 64 L 68 52 Q 50 56 32 52 Z",
	},
	viewBox: { x: 12, y: 0, width: 76, height: 160 },
	standardWidthPx: 68,
	standardHeightPx: 150,
};

export const LOWER_INCISOR_GEOMETRY: AnatomicalTemplateData = {
	crown: "M 28 64 C 22 50, 20 22, 26 12 C 38 10, 62 10, 74 12 C 80 22, 78 50, 72 64 Q 50 68 28 64 Z",
	root: "M 28 64 C 27 88, 38 122, 50 152 C 62 122, 73 88, 72 64 Z",
	cej: "M 28 64 Q 50 68 72 64",
	fissures: "M 34 16 L 66 16",
	pulpChamber: "M 42 38 C 40 46, 42 60, 46 88 C 48 116, 49 140, 50 152 C 51 140, 52 116, 54 88 C 58 60, 60 46, 58 38 C 54 32, 46 32, 42 38 Z",
	canals: [
		{ id: "Main", nameRu: "Центральный канал", path: "M 50 40 C 50 72, 50 114, 50 152", apex: { x: 50, y: 152 }, defaultLengthMm: 20.5 },
	],
	apexHalos: [{ x: 50, y: 152 }],
	periodontal: {
		boneCrestNormal: "M 24 74 Q 50 78 76 74",
		boneResorptionMild: "M 24 86 Q 50 90 76 86",
		boneResorptionModerate: "M 24 102 Q 50 106 76 102",
		boneResorptionSevere: "M 24 122 Q 50 126 76 122",
		furcationSites: [],
	},
	surfaces: {
		O: "M 32 24 L 68 24 L 74 12 L 26 12 Z",
		V: "M 28 64 C 38 67, 62 67, 72 64 L 68 24 L 32 24 Z",
		L: "M 32 24 L 68 24 L 60 14 L 40 14 Z",
		M: "M 28 64 L 32 24 L 26 12 C 20 24, 22 50, 28 64 Z",
		D: "M 72 64 C 78 50, 80 24, 74 12 L 68 24 Z",
		C: "M 28 64 Q 50 68 72 64 L 68 52 Q 50 56 32 52 Z",
	},
	viewBox: { x: 12, y: 0, width: 76, height: 160 },
	standardWidthPx: 60,
	standardHeightPx: 150,
};
