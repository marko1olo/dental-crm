import type {
	FurcationGrade,
	FurcationMarkerSvg,
	ToothConfig,
	ToothGeometryType,
} from "./types.js";
import {
	LOWER_CANINE_SURFACES,
	LOWER_INCISOR_SURFACES,
	LOWER_MOLAR_SURFACES,
	LOWER_PREMOLAR_SURFACES,
	PEDIATRIC_LOWER_CANINE_SURFACES,
	PEDIATRIC_LOWER_INCISOR_SURFACES,
	PEDIATRIC_LOWER_MOLAR_SURFACES,
	PEDIATRIC_UPPER_CANINE_SURFACES,
	PEDIATRIC_UPPER_INCISOR_SURFACES,
	PEDIATRIC_UPPER_MOLAR_SURFACES,
	UPPER_CANINE_SURFACES,
	UPPER_CENTRAL_INCISOR_SURFACES,
	UPPER_LATERAL_INCISOR_SURFACES,
	UPPER_MOLAR_SURFACES,
	UPPER_PREMOLAR_SURFACES,
} from "./surfacePolygons.js";

/**
 * Generate SVG marker path and styling for furcation involvement (Grade I..IV).
 */
export function getFurcationMarkerSvg(
	grade: FurcationGrade,
	x: number,
	y: number,
	isTop: boolean,
	size = 7,
): FurcationMarkerSvg | null {
	if (grade <= 0) return null;

	const tipY = isTop ? y - size : y + size;
	const baseY = isTop ? y + size * 0.5 : y - size * 0.5;
	const leftX = x - size * 0.9;
	const rightX = x + size * 0.9;

	switch (grade) {
		case 1:
			// Grade I: Incipient involvement — open chevron / triangle pointing toward apex
			return {
				path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY}`,
				fill: "none",
				stroke: "#f59e0b",
				strokeWidth: 1.8,
				labelRu: "Фуркация I ст. (начальная, зонд < 3 мм)",
			};
		case 2:
			// Grade II: Cul-de-sac / partial involvement — outline triangle
			return {
				path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY} Z`,
				fill: "rgba(245, 158, 11, 0.25)",
				stroke: "#f59e0b",
				strokeWidth: 2,
				labelRu: "Фуркация II ст. (частичная/тупиковая, зонд > 3 мм)",
			};
		case 3:
			// Grade III: Through-and-through penetration — solid filled warning triangle
			return {
				path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY} Z`,
				fill: "#ef4444",
				stroke: "#991b1b",
				strokeWidth: 2,
				labelRu: "Фуркация III ст. (сквозной дефект бифуркации)",
			};
		case 4:
			// Grade IV: Through-and-through with gingival recession — filled diamond with alert stroke
			return {
				path: `M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`,
				fill: "#dc2626",
				stroke: "#7f1d1d",
				strokeWidth: 2.2,
				labelRu: "Фуркация IV ст. (сквозная с обнажением рецессией)",
			};
		default:
			return null;
	}
}

export const TOOTH_GEOMETRY = {
	UPPER_CENTRAL_INCISOR: {
		root: "M 35 85 C 33 60, 36 28, 50 10 C 64 28, 67 60, 65 85 Z",
		crown:
			"M 35 85 C 28 96, 22 122, 30 144 C 32 147, 48 147, 50 146 C 52 147, 68 147, 70 144 C 78 122, 72 96, 65 85 Q 50 81 35 85 Z",
		canals: "M 50 118 C 50 90, 50 45, 50 10",
		apex: [{ x: 50, y: 10 }],
		core: "M 42 85 L 44 115 Q 50 120 56 115 L 58 85 Z",
		boneCrest: {
			normal: "M 22 76 Q 50 72 78 76",
			mild: "M 22 66 Q 50 62 78 66",
			moderate: "M 22 52 Q 50 48 78 52",
			severe: "M 22 34 Q 50 30 78 34",
		},
		touchTargetMinPx: 44,
		surfaces: UPPER_CENTRAL_INCISOR_SURFACES,
	},

	UPPER_LATERAL_INCISOR: {
		root: "M 38 85 C 36 60, 39 30, 50 12 C 58 30, 64 60, 62 85 Z",
		crown:
			"M 38 85 C 32 96, 28 120, 36 142 C 40 145, 60 145, 64 142 C 72 120, 68 96, 62 85 Q 50 81 38 85 Z",
		fissures: "M 50 129 L 50 138",
		core: "M 42 85 L 44 115 Q 50 120 56 115 L 58 85 Z",
		canals: "M 50 118 C 50 88, 48 45, 50 12",
		apex: [{ x: 50, y: 12 }],
		boneCrest: {
			normal: "M 24 76 Q 50 72 76 76",
			mild: "M 24 66 Q 50 62 76 66",
			moderate: "M 24 52 Q 50 48 76 52",
			severe: "M 24 34 Q 50 30 76 34",
		},
		touchTargetMinPx: 44,
		surfaces: UPPER_LATERAL_INCISOR_SURFACES,
	},

	UPPER_CANINE: {
		root: "M 33 85 C 30 55, 36 28, 50 4 C 64 28, 70 55, 67 85 Z",
		crown:
			"M 33 85 C 26 100, 16 122, 50 148 C 84 122, 74 100, 67 85 Q 50 80 33 85 Z",
		core: "M 42 85 L 44 115 Q 50 120 56 115 L 58 85 Z",
		canals: "M 50 122 C 50 85, 50 40, 50 4",
		apex: [{ x: 50, y: 4 }],
		boneCrest: {
			normal: "M 22 76 Q 50 71 78 76",
			mild: "M 22 65 Q 50 60 78 65",
			moderate: "M 22 50 Q 50 45 78 50",
			severe: "M 22 30 Q 50 25 78 30",
		},
		touchTargetMinPx: 44,
		surfaces: UPPER_CANINE_SURFACES,
	},

	UPPER_PREMOLAR: {
		root: "M 32 84 C 28 66, 28 42, 34 16 C 40 32, 46 48, 50 56 C 54 48, 60 32, 66 16 C 72 42, 72 66, 68 84 Z",
		crown:
			"M 32 84 C 22 98, 16 130, 42 142 Q 50 137, 58 142 C 84 130, 78 98, 68 84 Q 50 80 32 84 Z",
		canals: "M 38 92 C 34 72, 34 44, 34 18 M 62 92 C 66 72, 66 44, 66 18",
		core: "M 38 85 L 40 110 Q 50 115 60 110 L 62 85 Z",
		apex: [
			{ x: 34, y: 18 },
			{ x: 66, y: 18 },
		],
		furcations: [
			{
				id: "B_P_Furcation",
				nameRu: "Бифуркация верхнего премоляра",
				position: { x: 50, y: 56 },
				type: "bifurcation",
			},
		],
		boneCrest: {
			normal: "M 20 76 Q 50 71 80 76",
			mild: "M 20 66 Q 50 62 80 66",
			moderate: "M 20 54 Q 50 50 80 54",
			severe: "M 20 36 Q 50 32 80 36",
		},
		touchTargetMinPx: 44,
		surfaces: UPPER_PREMOLAR_SURFACES,
	},

	UPPER_MOLAR: {
		root: "M 16 85 C 12 66, 16 40, 24 20 C 30 28, 34 46, 36 58 C 42 42, 46 22, 50 10 C 54 22, 58 42, 64 58 C 66 46, 70 28, 76 24 C 84 40, 88 66, 84 85 Z",
		crown:
			"M 16 85 C 10 98, 8 132, 25 142 C 34 148, 48 145, 50 138 C 52 145, 66 148, 75 142 C 92 132, 90 98, 84 85 Q 50 81 16 85 Z",
		canals:
			"M 36 94 C 32 78, 24 50, 24 20 M 50 94 C 50 72, 50 38, 50 10 M 64 94 C 68 78, 76 50, 76 24",
		apex: [
			{ x: 24, y: 20 },
			{ x: 50, y: 10 },
			{ x: 76, y: 24 },
		],
		furcations: [
			{
				id: "MB_DB_Buccal",
				nameRu: "Щечная трифуркация",
				position: { x: 50, y: 58 },
				type: "trifurcation_buccal",
			},
			{
				id: "MB_P_Mesial",
				nameRu: "Медиально-нёбная фуркация",
				position: { x: 36, y: 60 },
				type: "trifurcation_mesial",
			},
			{
				id: "DB_P_Distal",
				nameRu: "Дистально-нёбная фуркация",
				position: { x: 64, y: 60 },
				type: "trifurcation_distal",
			},
		],
		boneCrest: {
			normal: "M 12 76 Q 50 72 88 76",
			mild: "M 12 68 Q 50 64 88 68",
			moderate: "M 12 56 Q 50 52 88 56",
			severe: "M 12 40 Q 50 36 88 40",
		},
		touchTargetMinPx: 44,
		core: "M 30 85 L 35 110 Q 55 115 75 110 L 80 85 Z",
		fissures: "M 28 126 Q 50 134 72 126 M 50 110 L 50 136 M 36 112 Q 50 118 64 112",
		surfaces: UPPER_MOLAR_SURFACES,
	},

	LOWER_INCISOR: {
		root: "M 28 76 C 28 98, 38 124, 50 148 C 62 124, 72 98, 72 76 Z",
		crown:
			"M 28 76 C 22 62, 20 28, 26 16 C 38 14, 62 14, 74 16 C 80 28, 78 62, 72 76 Q 50 80 28 76 Z",
		fissures: "M 34 20 L 66 20",
		canals: "M 50 70 C 50 92, 50 122, 50 148",
		core: "M 44 75 L 46 45 Q 50 40 54 45 L 56 75 Z",
		apex: [{ x: 50, y: 148 }],
		boneCrest: {
			normal: "M 24 84 Q 50 88 76 84",
			mild: "M 24 94 Q 50 98 76 94",
			moderate: "M 24 108 Q 50 112 76 108",
			severe: "M 24 126 Q 50 130 76 126",
		},
		touchTargetMinPx: 44,
		surfaces: LOWER_INCISOR_SURFACES,
	},

	LOWER_CANINE: {
		root: "M 26 76 C 24 98, 36 126, 50 152 C 64 126, 76 98, 74 76 Z",
		crown:
			"M 26 76 C 20 62, 18 34, 50 12 C 82 34, 80 62, 74 76 Q 50 80 26 76 Z",
		canals: "M 50 70 C 50 94, 50 126, 50 152",
		core: "M 44 75 L 46 45 Q 50 40 54 45 L 56 75 Z",
		apex: [{ x: 50, y: 152 }],
		boneCrest: {
			normal: "M 22 84 Q 50 89 78 84",
			mild: "M 22 95 Q 50 100 78 95",
			moderate: "M 22 110 Q 50 115 78 110",
			severe: "M 22 130 Q 50 135 78 130",
		},
		touchTargetMinPx: 44,
		surfaces: LOWER_CANINE_SURFACES,
	},

	LOWER_PREMOLAR: {
		root: "M 24 75 C 24 96, 36 124, 50 146 C 64 124, 76 96, 76 75 Z",
		crown:
			"M 24 75 C 18 63, 18 29, 34 17 C 44 13, 56 13, 66 17 C 82 29, 82 63, 76 75 Q 50 79 24 75 Z",
		canals: "M 50 68 C 50 90, 50 120, 50 146",
		core: "M 38 75 L 40 50 Q 50 45 60 50 L 62 75 Z",
		apex: [{ x: 50, y: 146 }],
		boneCrest: {
			normal: "M 20 84 Q 50 88 80 84",
			mild: "M 20 94 Q 50 98 80 94",
			moderate: "M 20 108 Q 50 112 80 108",
			severe: "M 20 126 Q 50 130 80 126",
		},
		touchTargetMinPx: 44,
		surfaces: LOWER_PREMOLAR_SURFACES,
	},

	LOWER_MOLAR: {
		root: "M 16 75 C 12 95, 18 122, 26 146 C 34 134, 42 118, 50 102 C 58 118, 66 134, 74 144 C 82 122, 88 95, 84 75 Z",
		crown:
			"M 16 75 C 10 62, 8 28, 25 18 C 34 12, 48 15, 50 22 C 52 15, 66 12, 75 18 C 92 28, 90 62, 84 75 Q 50 79 16 75 Z",
		fissures: "M 28 34 Q 50 26 72 34 M 50 50 L 50 24 M 36 48 Q 50 42 64 48",
		core: "M 25 80 L 30 55 Q 50 50 70 55 L 75 80 Z",
		canals:
			"M 32 66 C 28 86, 26 116, 26 144 M 68 66 C 70 86, 74 116, 74 142",
		apex: [
			{ x: 26, y: 144 },
			{ x: 74, y: 142 },
		],
		furcations: [
			{
				id: "M_D_Bifurcation_Buccal",
				nameRu: "Щечная бифуркация нижнего моляра",
				position: { x: 50, y: 102 },
				type: "bifurcation",
			},
			{
				id: "M_D_Bifurcation_Lingual",
				nameRu: "Язычная бифуркация нижнего моляра",
				position: { x: 50, y: 104 },
				type: "bifurcation",
			},
		],
		boneCrest: {
			normal: "M 12 84 Q 50 88 88 84",
			mild: "M 12 92 Q 50 96 88 92",
			moderate: "M 12 104 Q 50 108 88 104",
			severe: "M 12 122 Q 50 126 88 122",
		},
		touchTargetMinPx: 44,
		surfaces: LOWER_MOLAR_SURFACES,
	},

	PEDIATRIC_UPPER_INCISOR: {
		root: "M 35 85 C 33 72, 42 50, 50 36 C 58 50, 67 72, 65 85 Z",
		crown:
			"M 35 85 C 30 95, 22 125, 32 145 C 40 148, 60 148, 68 145 C 72 125, 75 95, 65 85 Q 50 82 35 85 Z",
		canals: "M 50 120 C 50 90, 50 65, 50 40",
		apex: [{ x: 50, y: 36 }],
		boneCrest: {
			normal: "M 24 78 Q 50 74 76 78",
			mild: "M 24 68 Q 50 64 76 68",
			moderate: "M 24 56 Q 50 52 76 56",
			severe: "M 24 44 Q 50 40 76 44",
		},
		touchTargetMinPx: 44,
		surfaces: PEDIATRIC_UPPER_INCISOR_SURFACES,
	},

	PEDIATRIC_UPPER_CANINE: {
		root: "M 35 85 C 33 68, 42 46, 50 32 C 58 46, 67 68, 65 85 Z",
		crown:
			"M 35 85 C 30 105, 15 125, 53 148 C 65 135, 90 115, 65 85 Q 50 80 35 85 Z",
		canals: "M 50 125 C 50 90, 50 60, 50 36",
		apex: [{ x: 50, y: 32 }],
		boneCrest: {
			normal: "M 24 78 Q 50 74 76 78",
			mild: "M 24 68 Q 50 64 76 68",
			moderate: "M 24 54 Q 50 50 76 54",
			severe: "M 24 40 Q 50 36 76 40",
		},
		touchTargetMinPx: 44,
		surfaces: PEDIATRIC_UPPER_CANINE_SURFACES,
	},

	PEDIATRIC_UPPER_MOLAR: {
		root: "M 18 84 C 10 64, 10 38, 16 18 C 24 30, 32 48, 36 66 C 42 48, 46 28, 50 14 C 54 28, 58 48, 64 66 C 68 48, 76 30, 84 18 C 90 38, 90 64, 82 84 Z",
		crown:
			"M 18 84 C 12 96, 10 128, 28 138 C 36 142, 48 140, 50 134 C 52 140, 64 142, 72 138 C 90 128, 88 96, 82 84 Q 50 80 18 84 Z",
		canals:
			"M 36 92 C 30 70, 20 44, 16 18 M 50 92 C 50 70, 50 38, 50 14 M 64 92 C 70 70, 80 44, 84 18",
		apex: [
			{ x: 16, y: 18 },
			{ x: 50, y: 14 },
			{ x: 84, y: 18 },
		],
		furcations: [
			{
				id: "Pediatric_Trifurcation",
				nameRu: "Дивергирующая трифуркация молочного моляра",
				position: { x: 50, y: 66 },
				type: "trifurcation_buccal",
			},
		],
		boneCrest: {
			normal: "M 14 76 Q 50 72 86 76",
			mild: "M 14 66 Q 50 62 86 66",
			moderate: "M 14 54 Q 50 50 86 54",
			severe: "M 14 38 Q 50 34 86 38",
		},
		touchTargetMinPx: 44,
		surfaces: PEDIATRIC_UPPER_MOLAR_SURFACES,
	},

	PEDIATRIC_LOWER_INCISOR: {
		root: "M 40 75 C 38 90, 42 110, 50 125 C 58 110, 62 90, 60 75 Z",
		crown:
			"M 40 75 C 36 60, 36 35, 40 25 C 45 22, 55 22, 60 25 C 64 35, 64 60, 60 75 Q 50 78 40 75 Z",
		canals: "M 50 55 C 50 75, 50 95, 50 120",
		apex: [{ x: 50, y: 125 }],
		boneCrest: {
			normal: "M 28 82 Q 50 86 72 82",
			mild: "M 28 92 Q 50 96 72 92",
			moderate: "M 28 104 Q 50 108 72 104",
			severe: "M 28 116 Q 50 120 72 116",
		},
		touchTargetMinPx: 44,
		surfaces: PEDIATRIC_LOWER_INCISOR_SURFACES,
	},

	PEDIATRIC_LOWER_CANINE: {
		root: "M 35 72 C 33 90, 40 110, 50 128 C 60 110, 67 90, 65 72 Z",
		crown:
			"M 35 72 C 30 55, 35 30, 50 12 C 65 30, 70 55, 65 72 Q 50 75 35 72 Z",
		canals: "M 50 55 C 50 75, 50 98, 50 128",
		apex: [{ x: 50, y: 128 }],
		boneCrest: {
			normal: "M 26 80 Q 50 85 74 80",
			mild: "M 26 90 Q 50 95 74 90",
			moderate: "M 26 104 Q 50 109 74 104",
			severe: "M 26 118 Q 50 123 74 118",
		},
		touchTargetMinPx: 44,
		surfaces: PEDIATRIC_LOWER_CANINE_SURFACES,
	},

	PEDIATRIC_LOWER_MOLAR: {
		root: "M 18 76 C 10 96, 10 122, 16 142 C 26 130, 36 110, 50 90 C 64 110, 74 130, 84 142 C 90 122, 90 96, 82 76 Z",
		crown:
			"M 18 76 C 12 64, 10 32, 28 22 C 36 18, 48 20, 50 26 C 52 20, 64 18, 72 22 C 90 32, 88 64, 82 76 Q 50 80 18 76 Z",
		canals:
			"M 36 68 C 28 88, 20 116, 16 142 M 64 68 C 72 88, 80 116, 84 142",
		apex: [
			{ x: 16, y: 142 },
			{ x: 84, y: 142 },
		],
		furcations: [
			{
				id: "Pediatric_Bifurcation",
				nameRu: "Дивергирующая бифуркация нижнего молочного моляра",
				position: { x: 50, y: 90 },
				type: "bifurcation",
			},
		],
		boneCrest: {
			normal: "M 14 84 Q 50 88 86 84",
			mild: "M 14 94 Q 50 98 86 94",
			moderate: "M 14 106 Q 50 110 86 106",
			severe: "M 14 122 Q 50 126 86 122",
		},
		touchTargetMinPx: 44,
		surfaces: PEDIATRIC_LOWER_MOLAR_SURFACES,
	},
} satisfies Record<string, ToothGeometryType>;

export const getToothPath = (toothId: number): ToothGeometryType => {
	const quadrant = Math.floor(toothId / 10);
	const index = toothId % 10;
	const isPediatric = quadrant >= 5;

	if (quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6) {
		if (index === 1 || index === 2)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_UPPER_INCISOR
				: index === 1
					? TOOTH_GEOMETRY.UPPER_CENTRAL_INCISOR
					: TOOTH_GEOMETRY.UPPER_LATERAL_INCISOR;
		if (index === 3)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_UPPER_CANINE
				: TOOTH_GEOMETRY.UPPER_CANINE;
		if (index <= 5)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_UPPER_MOLAR
				: TOOTH_GEOMETRY.UPPER_PREMOLAR;
		return TOOTH_GEOMETRY.UPPER_MOLAR;
	} else {
		if (index <= 2)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_LOWER_INCISOR
				: TOOTH_GEOMETRY.LOWER_INCISOR;
		if (index === 3)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_LOWER_CANINE
				: TOOTH_GEOMETRY.LOWER_CANINE;
		if (index <= 5)
			return isPediatric
				? TOOTH_GEOMETRY.PEDIATRIC_LOWER_MOLAR
				: TOOTH_GEOMETRY.LOWER_PREMOLAR;
		return TOOTH_GEOMETRY.LOWER_MOLAR;
	}
};

export const getToothConfig = (toothId: number): ToothConfig => {
	const num = toothId % 10;
	const quadrant = Math.floor(toothId / 10);
	// Scaled dimensions with sterile touch targets >= 44px
	if (num <= 2)
		return {
			width: "66px",
			height: "150px",
			viewX: 20,
			viewWidth: 60,
			viewHeight: 150,
			touchTargetMinPx: 44,
		};
	if (num === 3)
		return {
			width: "74px",
			height: "150px",
			viewX: 15,
			viewWidth: 75,
			viewHeight: 150,
			touchTargetMinPx: 44,
		};
	if (num <= 5 && quadrant < 5)
		return {
			width: "78px",
			height: "150px",
			viewX: 12.5,
			viewWidth: 75,
			viewHeight: 150,
			touchTargetMinPx: 44,
		};
	return {
		width: "98px",
		height: "150px",
		viewX: 0,
		viewWidth: 100,
		viewHeight: 150,
		touchTargetMinPx: 44,
	};
};
