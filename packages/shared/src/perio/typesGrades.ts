/**
 * packages/shared/src/perio/typesGrades.ts
 *
 * Furcation and mobility clinical classification constants.
 * Mandate 8b: File <= 120 lines.
 */

import type { FurcationGrade, MobilityGrade } from "./typesTeeth.js";

export interface FurcationGradeDetail {
	readonly grade: FurcationGrade;
	readonly codeRu: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly symbol: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
}

export const FURCATION_GRADES: Record<number, FurcationGradeDetail> = {
	0: {
		grade: 0,
		codeRu: "0",
		nameRu: "Норма (0 ст.)",
		descriptionRu: "Фуркационный дефект отсутствует, межкорневая перегородка интактна",
		symbol: "—",
		badgeColor: "#64748b",
		badgeBg: "rgba(100, 116, 139, 0.12)",
	},
	1: {
		grade: 1,
		codeRu: "I",
		nameRu: "Начальная (I ст.)",
		descriptionRu: "Горизонтальное проникновение зонда Наберса до 3 мм в область бифуркации/трифуркации",
		symbol: "△",
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
	},
	2: {
		grade: 2,
		codeRu: "II",
		nameRu: "Частичная (II ст.)",
		descriptionRu: "Зонд Наберса проникает более чем на 3 мм вглубь, но не проходит насквозь",
		symbol: "▲",
		badgeColor: "#f97316",
		badgeBg: "rgba(249, 115, 22, 0.18)",
	},
	3: {
		grade: 3,
		codeRu: "III",
		nameRu: "Сквозная (III ст.)",
		descriptionRu: "Сквозной дефект: зонд свободно проходит между корнями с вестибулярной на оральную сторону",
		symbol: "▲",
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.2)",
	},
	4: {
		grade: 4,
		codeRu: "IV",
		nameRu: "Сквозная с рецессией (IV ст.)",
		descriptionRu: "Сквозной дефект фуркации с обнажением бифуркации вследствие рецессии десны",
		symbol: "◆",
		badgeColor: "#dc2626",
		badgeBg: "rgba(220, 38, 38, 0.25)",
	},
};

export interface MobilityGradeDetail {
	readonly grade: MobilityGrade;
	readonly codeRu: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
}

export const MOBILITY_GRADES: Record<number, MobilityGradeDetail> = {
	0: {
		grade: 0,
		codeRu: "0",
		nameRu: "Физиологическая (0)",
		descriptionRu: "Физиологическая подвижность зуба в пределах связочного аппарата (< 0.2 мм)",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
	},
	1: {
		grade: 1,
		codeRu: "I",
		nameRu: "I степень (до 1 мм)",
		descriptionRu: "Горизонтальная патологическая подвижность коронки зуба до 1 мм в вестибуло-оральном направлении",
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
	},
	2: {
		grade: 2,
		codeRu: "II",
		nameRu: "II степень (> 1 мм)",
		descriptionRu: "Горизонтальная подвижность более 1 мм в вестибуло-оральном и медио-дистальном направлениях",
		badgeColor: "#f97316",
		badgeBg: "rgba(249, 115, 22, 0.18)",
	},
	3: {
		grade: 3,
		codeRu: "III",
		nameRu: "III степень (вертикальная)",
		descriptionRu: "Тяжелая подвижность во всех направлениях, включая вертикальное осевое погружение",
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.25)",
	},
};
