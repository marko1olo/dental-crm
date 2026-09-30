/**
 * DENTE Dental CRM — Anatomical Adult Dentition SVG Geometries
 *
 * SVG geometries, roots, canals, and periodontal markers for 32 permanent teeth.
 */

import type { AnatomicalTemplateData } from "./anatomicalGeometriesTypes";

// --- 1. ВЕРХНИЕ МОЛЯРЫ (16, 17, 18, 26, 27, 28) ---
// 3 мощных удлиненных корня: MB (Медиально-щечный), DB (Дистально-щечный), P (Нёбный - самый длинный)
export const UPPER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 16 96 C 10 110, 8 138, 24 148 C 34 153, 48 150, 50 142 C 52 150, 66 153, 76 148 C 92 138, 90 110, 84 96 Q 50 92 16 96 Z",
	root:
		"M 16 96 C 11 72, 14 38, 22 14 C 28 22, 34 46, 36 66 C 42 46, 46 22, 50 6 C 54 22, 58 46, 64 66 C 66 46, 72 22, 78 18 C 86 38, 89 72, 84 96 Z",
	cej: "M 16 96 Q 50 92 84 96",
	fissures: "M 28 132 Q 50 140 72 132 M 50 118 L 50 142 M 36 122 Q 50 126 64 122",
	pulpChamber: "M 28 126 C 26 116, 32 102, 36 96 C 42 90, 58 90, 64 96 C 68 102, 74 116, 72 126 C 66 130, 56 122, 50 126 C 44 122, 34 130, 28 126 Z",
	canals: [
		{
			id: "MB1",
			nameRu: "Медиально-щечный 1 (MB1)",
			path: "M 36 104 C 32 82, 22 46, 22 14",
			apex: { x: 22, y: 14 },
			defaultLengthMm: 21.0,
		},
		{
			id: "MB2",
			nameRu: "Медиально-щечный 2 (MB2)",
			path: "M 40 104 C 36 82, 27 48, 26 20",
			apex: { x: 26, y: 20 },
			defaultLengthMm: 20.5,
		},
		{
			id: "P",
			nameRu: "Нёбный (Palatal)",
			path: "M 50 104 C 50 74, 50 36, 50 6",
			apex: { x: 50, y: 6 },
			defaultLengthMm: 22.0,
		},
		{
			id: "DB",
			nameRu: "Дистально-щечный (DB)",
			path: "M 64 104 C 68 82, 78 48, 78 18",
			apex: { x: 78, y: 18 },
			defaultLengthMm: 20.0,
		},
	],
	apexHalos: [
		{ x: 22, y: 14 },
		{ x: 50, y: 6 },
		{ x: 78, y: 18 },
	],
	periodontal: {
		boneCrestNormal: "M 12 86 Q 50 82 88 86",
		boneResorptionMild: "M 12 76 Q 50 72 88 76",
		boneResorptionModerate: "M 12 62 Q 50 58 88 62",
		boneResorptionSevere: "M 12 44 Q 50 40 88 44",
		furcationSites: [
			{
				id: "MB_DB_Buccal",
				nameRu: "Щечная трифуркация",
				position: { x: 50, y: 66 },
				type: "trifurcation_buccal" as const,
			},
			{
				id: "MB_P_Mesial",
				nameRu: "Медиально-нёбная фуркация",
				position: { x: 36, y: 68 },
				type: "trifurcation_mesial" as const,
			},
			{
				id: "DB_P_Distal",
				nameRu: "Дистально-нёбная фуркация",
				position: { x: 64, y: 68 },
				type: "trifurcation_distal" as const,
			},
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

// --- 2. ВЕРХНИЕ ПРЕМОЛЯРЫ (14, 15, 24, 25) ---
// 14/24 имеют 2 стройных корня (щечный и небный с выраженной бифуркацией)
export const UPPER_PREMOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 22 96 C 16 108, 16 136, 32 146 C 42 150, 58 150, 68 146 C 84 136, 84 108, 78 96 Q 50 92 22 96 Z",
	root:
		"M 22 96 C 19 74, 24 44, 32 12 C 38 26, 46 48, 50 62 C 54 48, 62 26, 68 12 C 76 44, 81 74, 78 96 Z",
	cej: "M 22 96 Q 50 92 78 96",
	fissures: "M 34 130 Q 50 134 66 130 M 50 120 L 50 140",
	pulpChamber: "M 36 122 C 34 114, 38 102, 42 96 C 46 92, 54 92, 58 96 C 62 102, 66 114, 64 122 C 58 126, 54 118, 50 122 C 46 118, 42 126, 36 122 Z",
	canals: [
		{
			id: "B",
			nameRu: "Щечный (Buccal)",
			path: "M 40 102 C 36 76, 32 40, 32 14",
			apex: { x: 32, y: 14 },
			defaultLengthMm: 21.5,
		},
		{
			id: "P",
			nameRu: "Нёбный (Palatal)",
			path: "M 60 102 C 64 76, 68 40, 68 14",
			apex: { x: 68, y: 14 },
			defaultLengthMm: 21.5,
		},
	],
	apexHalos: [
		{ x: 32, y: 14 },
		{ x: 68, y: 14 },
	],
	periodontal: {
		boneCrestNormal: "M 20 86 Q 50 81 80 86",
		boneResorptionMild: "M 20 74 Q 50 70 80 74",
		boneResorptionModerate: "M 20 60 Q 50 56 80 60",
		boneResorptionSevere: "M 20 42 Q 50 38 80 42",
		furcationSites: [
			{
				id: "B_P_Bifurcation",
				nameRu: "Бифуркация верхнего премоляра",
				position: { x: 50, y: 62 },
				type: "bifurcation" as const,
			},
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

// --- 3. ВЕРХНИЕ КЛЫКИ (13, 23) ---
// Мощнейший удлиненный одиночный корень, выраженный рвущий бугор
export const UPPER_CANINE_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 26 96 C 20 110, 18 134, 50 154 C 82 134, 80 110, 74 96 Q 50 92 26 96 Z",
	root: "M 26 96 C 23 72, 34 32, 50 4 C 66 32, 77 72, 74 96 Z",
	cej: "M 26 96 Q 50 92 74 96",
	fissures: "M 50 120 L 50 150",
	pulpChamber: "M 42 124 C 40 114, 42 100, 46 72 C 48 40, 49 14, 50 4 C 51 14, 52 40, 54 72 C 58 100, 60 114, 58 124 C 54 132, 46 132, 42 124 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Основной корневой канал",
			path: "M 50 120 C 50 88, 50 44, 50 4",
			apex: { x: 50, y: 4 },
			defaultLengthMm: 26.0,
		},
	],
	apexHalos: [{ x: 50, y: 4 }],
	periodontal: {
		boneCrestNormal: "M 22 86 Q 50 81 78 86",
		boneResorptionMild: "M 22 74 Q 50 69 78 74",
		boneResorptionModerate: "M 22 58 Q 50 53 78 58",
		boneResorptionSevere: "M 22 36 Q 50 31 78 36",
		furcationSites: [],
	},
	surfaces: {
		O: "M 38 124 Q 50 128 62 124 L 50 154 Z",
		V: "M 26 96 C 38 93, 62 93, 74 96 L 62 124 Q 50 128 38 124 Z",
		L: "M 38 124 L 50 154 L 62 124 Q 50 136 38 124 Z",
		M: "M 26 96 L 38 124 L 50 154 C 28 138, 22 114, 26 96 Z",
		D: "M 74 96 C 78 114, 72 138, 50 154 L 62 124 Z",
		C: "M 26 96 Q 50 92 74 96 L 68 108 Q 50 104 32 108 Z",
	},
	viewBox: { x: 12, y: 0, width: 76, height: 160 },
	standardWidthPx: 68,
	standardHeightPx: 150,
};

// --- 4. ВЕРХНИЕ РЕЗЦЫ (11, 21, 12, 22) ---
// Лопатообразная коронка, прямой режущий край, длинный стройный конусовидный корень
export const UPPER_INCISOR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 26 96 C 20 110, 18 138, 24 150 C 36 153, 64 153, 76 150 C 82 138, 80 110, 74 96 Q 50 92 26 96 Z",
	root: "M 26 96 C 25 70, 36 36, 50 10 C 64 36, 75 70, 74 96 Z",
	cej: "M 26 96 Q 50 92 74 96",
	fissures: "M 34 146 L 66 146",
	pulpChamber: "M 40 122 C 38 114, 40 100, 46 72 C 48 44, 49 20, 50 10 C 51 20, 52 44, 54 72 C 60 100, 62 114, 60 122 C 56 126, 44 126, 40 122 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный канал",
			path: "M 50 120 C 50 88, 50 44, 50 10",
			apex: { x: 50, y: 10 },
			defaultLengthMm: 22.5,
		},
	],
	apexHalos: [{ x: 50, y: 10 }],
	periodontal: {
		boneCrestNormal: "M 22 86 Q 50 82 78 86",
		boneResorptionMild: "M 22 74 Q 50 70 78 74",
		boneResorptionModerate: "M 22 60 Q 50 56 78 60",
		boneResorptionSevere: "M 22 40 Q 50 36 78 40",
		furcationSites: [],
	},
	surfaces: {
		O: "M 32 136 L 68 136 L 76 150 L 24 150 Z",
		V: "M 26 96 C 38 93, 62 93, 74 96 L 68 136 L 32 136 Z",
		L: "M 32 136 L 68 136 L 60 148 L 40 148 Z",
		M: "M 26 96 L 32 136 L 24 150 C 18 136, 20 110, 26 96 Z",
		D: "M 74 96 C 80 110, 82 136, 76 150 L 68 136 Z",
		C: "M 26 96 Q 50 92 74 96 L 68 108 Q 50 104 32 108 Z",
	},
	viewBox: { x: 12, y: 0, width: 76, height: 160 },
	standardWidthPx: 64,
	standardHeightPx: 150,
};

// --- 5. НИЖНИЕ МОЛЯРЫ (36, 37, 38, 46, 47, 48) ---
// 2 мощных изогнутых корня: M (Медиальный) и D (Дистальный)
export const LOWER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 16 64 C 10 50, 8 22, 24 12 C 34 7, 48 10, 50 18 C 52 10, 66 7, 76 12 C 92 22, 90 50, 84 64 Q 50 68 16 64 Z",
	root:
		"M 16 64 C 11 88, 14 124, 22 154 C 28 142, 38 120, 50 96 C 62 120, 72 142, 78 150 C 86 124, 89 88, 84 64 Z",
	cej: "M 16 64 Q 50 68 84 64",
	fissures: "M 28 28 Q 50 20 72 28 M 50 42 L 50 18 M 36 38 Q 50 32 64 38",
	pulpChamber: "M 28 34 C 26 44, 32 58, 36 64 C 42 70, 58 70, 64 64 C 68 58, 74 44, 72 34 C 66 30, 56 38, 50 34 C 44 38, 34 30, 28 34 Z",
	canals: [
		{
			id: "MB",
			nameRu: "Медиально-щечный (MB)",
			path: "M 32 56 C 26 84, 18 122, 18 152",
			apex: { x: 18, y: 152 },
			defaultLengthMm: 21.0,
		},
		{
			id: "ML",
			nameRu: "Медиально-язычный (ML)",
			path: "M 42 56 C 40 84, 32 120, 28 146",
			apex: { x: 28, y: 146 },
			defaultLengthMm: 21.0,
		},
		{
			id: "D",
			nameRu: "Дистальный (Distal)",
			path: "M 66 56 C 70 84, 78 120, 78 148",
			apex: { x: 78, y: 148 },
			defaultLengthMm: 21.5,
		},
	],
	apexHalos: [
		{ x: 20, y: 150 },
		{ x: 78, y: 148 },
	],
	periodontal: {
		boneCrestNormal: "M 12 74 Q 50 78 88 74",
		boneResorptionMild: "M 12 84 Q 50 88 88 84",
		boneResorptionModerate: "M 12 98 Q 50 102 88 98",
		boneResorptionSevere: "M 12 118 Q 50 122 88 118",
		furcationSites: [
			{
				id: "M_D_Bifurcation_Buccal",
				nameRu: "Щечная бифуркация нижнего моляра",
				position: { x: 50, y: 96 },
				type: "bifurcation" as const,
			},
			{
				id: "M_D_Bifurcation_Lingual",
				nameRu: "Язычная бифуркация нижнего моляра",
				position: { x: 50, y: 98 },
				type: "bifurcation" as const,
			},
		],
	},
	surfaces: {
		O: "M 30 38 Q 50 32 70 38 L 66 18 Q 50 14 34 18 Z",
		V: "M 16 64 C 32 67, 68 67, 84 64 L 70 38 Q 50 32 30 38 Z",
		L: "M 34 18 Q 50 14 66 18 L 76 12 C 66 7, 34 7, 24 12 Z",
		M: "M 16 64 L 30 38 L 34 18 L 24 12 C 10 22, 10 50, 16 64 Z",
		D: "M 84 64 C 90 50, 90 22, 76 12 L 66 18 L 70 38 Z",
		C: "M 16 64 Q 50 68 84 64 L 78 52 Q 50 56 22 52 Z",
	},
	viewBox: { x: 0, y: 0, width: 100, height: 160 },
	standardWidthPx: 88,
	standardHeightPx: 150,
};

// --- 6. НИЖНИЕ ПРЕМОЛЯРЫ (34, 35, 44, 45) ---
// Одиночный крепкий длинный корень, выраженный щечный бугор
export const LOWER_PREMOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 24 64 C 18 52, 18 22, 34 12 C 44 8, 56 8, 66 12 C 82 22, 82 52, 76 64 Q 50 68 24 64 Z",
	root: "M 24 64 C 23 88, 35 124, 50 154 C 65 124, 77 88, 76 64 Z",
	cej: "M 24 64 Q 50 68 76 64",
	fissures: "M 36 30 Q 50 26 64 30 M 50 40 L 50 20",
	pulpChamber: "M 42 36 C 40 46, 42 60, 46 88 C 48 116, 49 140, 50 154 C 51 140, 52 116, 54 88 C 58 60, 60 46, 58 36 C 54 28, 46 28, 42 36 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Основной корневой канал",
			path: "M 50 40 C 50 72, 50 116, 50 154",
			apex: { x: 50, y: 154 },
			defaultLengthMm: 22.0,
		},
	],
	apexHalos: [{ x: 50, y: 154 }],
	periodontal: {
		boneCrestNormal: "M 20 74 Q 50 78 80 74",
		boneResorptionMild: "M 20 86 Q 50 90 80 86",
		boneResorptionModerate: "M 20 102 Q 50 106 80 102",
		boneResorptionSevere: "M 20 122 Q 50 126 80 122",
		furcationSites: [],
	},
	surfaces: {
		O: "M 36 38 Q 50 34 64 38 L 60 20 Q 50 16 40 20 Z",
		V: "M 24 64 C 36 67, 64 67, 76 64 L 64 38 Q 50 34 36 38 Z",
		L: "M 40 20 Q 50 16 60 20 L 66 12 C 56 8, 44 8, 34 12 Z",
		M: "M 24 64 L 36 38 L 40 20 L 34 12 C 18 22, 18 52, 24 64 Z",
		D: "M 76 64 C 82 52, 82 22, 66 12 L 60 20 L 64 38 Z",
		C: "M 24 64 Q 50 68 76 64 L 70 52 Q 50 56 30 52 Z",
	},
	viewBox: { x: 10, y: 0, width: 80, height: 160 },
	standardWidthPx: 72,
	standardHeightPx: 150,
};

// --- 7. НИЖНИЕ КЛЫКИ (33, 43) ---
export const LOWER_CANINE_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 26 64 C 20 50, 18 26, 50 8 C 82 26, 80 50, 74 64 Q 50 68 26 64 Z",
	root: "M 26 64 C 23 88, 34 126, 50 156 C 66 126, 77 88, 74 64 Z",
	cej: "M 26 64 Q 50 68 74 64",
	fissures: "M 50 42 L 50 12",
	pulpChamber: "M 42 36 C 40 46, 42 60, 46 88 C 48 120, 49 146, 50 156 C 51 146, 52 120, 54 88 C 58 60, 60 46, 58 36 C 54 28, 46 28, 42 36 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Основной канал клыка",
			path: "M 50 40 C 50 72, 50 118, 50 156",
			apex: { x: 50, y: 156 },
			defaultLengthMm: 25.5,
		},
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

// --- 8. НИЖНИЕ РЕЗЦЫ (31, 32, 41, 42) ---
// Тонкие, сжатые с боков корни
export const LOWER_INCISOR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 28 64 C 22 50, 20 22, 26 12 C 38 10, 62 10, 74 12 C 80 22, 78 50, 72 64 Q 50 68 28 64 Z",
	root: "M 28 64 C 27 88, 38 122, 50 152 C 62 122, 73 88, 72 64 Z",
	cej: "M 28 64 Q 50 68 72 64",
	fissures: "M 34 16 L 66 16",
	pulpChamber: "M 42 38 C 40 46, 42 60, 46 88 C 48 116, 49 140, 50 152 C 51 140, 52 116, 54 88 C 58 60, 60 46, 58 38 C 54 32, 46 32, 42 38 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный канал",
			path: "M 50 40 C 50 72, 50 114, 50 152",
			apex: { x: 50, y: 152 },
			defaultLengthMm: 20.5,
		},
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

/**
 * Все 32 постоянных зуба взрослого человека (FDI).
 */
export const ADULT_UPPER_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;

export const ADULT_LOWER_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;
