import { z } from "zod";

// ------------------------------------------------------------------------------------------------
// ROOT RESORPTION STAGES (0%, 25%, 50%, 75%, 100%)
// ------------------------------------------------------------------------------------------------

export const resorptionStagePercentSchema = z.union([
	z.literal(0),
	z.literal(25),
	z.literal(50),
	z.literal(75),
	z.literal(100),
]);

export type ResorptionStagePercent = z.infer<typeof resorptionStagePercentSchema>;

export interface ResorptionStageDefinition {
	readonly stage: ResorptionStagePercent;
	readonly code: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly clinicalSignRu: string;
	readonly rootLengthRemainingRatio: number; // 1.0 down to 0.0
	readonly expectedMobilityDegree: 0 | 1 | 2 | 3;
	readonly badgeColor: string;
	readonly badgeBg: string;
}

export const RESORPTION_STAGE_DEFINITIONS: Readonly<Record<ResorptionStagePercent, ResorptionStageDefinition>> = {
	0: {
		stage: 0,
		code: "resorption_0",
		nameRu: "0% — Полный корень (Интактный)",
		descriptionRu: "Физиологическая резорбция корня отсутствует, длина корня сохранена на 100%.",
		clinicalSignRu: "Зуб неподвижен, признаков начала смены нет.",
		rootLengthRemainingRatio: 1.0,
		expectedMobilityDegree: 0,
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
	},
	25: {
		stage: 25,
		code: "resorption_25",
		nameRu: "25% — Начальная апикальная резорбция",
		descriptionRu: "Рассасывание апикальной трети корня под давлением зачатка постоянного зуба.",
		clinicalSignRu: "Сглаживание верхушки корня на рентгенограмме, физиологическая подвижность 0 ст.",
		rootLengthRemainingRatio: 0.75,
		expectedMobilityDegree: 0,
		badgeColor: "#3b82f6",
		badgeBg: "rgba(59, 130, 246, 0.12)",
	},
	50: {
		stage: 50,
		code: "resorption_50",
		nameRu: "50% — Резорбция половины корня",
		descriptionRu: "Рассасывание корня на 1/2 длины. Зачаток постоянного зуба приближается к бифуркации.",
		clinicalSignRu: "Легкая физиологическая подвижность I степени.",
		rootLengthRemainingRatio: 0.5,
		expectedMobilityDegree: 1,
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
	},
	75: {
		stage: 75,
		code: "resorption_75",
		nameRu: "75% — Субтотальная резорбция",
		descriptionRu: "Сохранена лишь пришеечная четверть корня. Зачаток постоянного зуба готов к прорезыванию.",
		clinicalSignRu: "Подвижность II степени, близкая смена зуба в течение 1-3 месяцев.",
		rootLengthRemainingRatio: 0.25,
		expectedMobilityDegree: 2,
		badgeColor: "#ea580c",
		badgeBg: "rgba(234, 88, 12, 0.15)",
	},
	100: {
		stage: 100,
		code: "resorption_100",
		nameRu: "100% — Полная резорбция / Эксфолиация",
		descriptionRu: "Корень полностью рассосался, коронка удерживается только десневой манжеткой либо выпала.",
		clinicalSignRu: "Подвижность III степени либо зуб эксфолиирован, прорезывание постоянного зуба.",
		rootLengthRemainingRatio: 0.0,
		expectedMobilityDegree: 3,
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.15)",
	},
};
