import { z } from "zod";

// ------------------------------------------------------------------------------------------------
// CARIOGRAM RISK CLASSIFIER (3-STATE CLINICAL RISK MODEL)
// ------------------------------------------------------------------------------------------------

/**
 * Simplified 3-State Cariogram Clinical Risk Assessment.
 * 1-click selection: "low" | "moderate" | "high".
 */
export const cariogramRiskLevelSchema = z.enum(["low", "moderate", "high"]);
export type CariogramRiskLevel = z.infer<typeof cariogramRiskLevelSchema>;

export const cariogramInputSchema = z.object({
	cariesRiskLevel: cariogramRiskLevelSchema.optional().default("low"),
});

export type CariogramInput = z.infer<typeof cariogramInputSchema>;

export type CariogramRiskCategory =
	| "very_low"
	| "low"
	| "moderate"
	| "high"
	| "very_high";

export interface CariogramSectorBreakdown {
	readonly actualChanceOfAvoidingCaries: number; // 0..100% (Green Sector)
	readonly dietSectorPercent: number; // Dark Blue
	readonly bacteriaSectorPercent: number; // Red
	readonly susceptibilitySectorPercent: number; // Light Blue
	readonly circumstancesSectorPercent: number; // Yellow
}

export interface CariogramResult {
	readonly chanceOfAvoidingCariesPercent: number; // 0..100%
	readonly riskCategory: CariogramRiskCategory;
	readonly riskCategoryNameRu: string;
	readonly riskCategoryDescriptionRu: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
	readonly sectors: CariogramSectorBreakdown;
	readonly dominantRiskFactorRu: string;
	readonly preventiveProgram: {
		readonly hygieneRecallIntervalMonths: number;
		readonly professionalHygieneRu: string;
		readonly fluorideVarnishProtocolRu: string;
		readonly homeCareProtocolRu: string;
		readonly dietaryGuidanceRu: string;
		readonly fissureSealingIndicationRu: string;
	};
}

/**
 * Calculates the Cariogram caries risk and chance of avoiding caries per 3-state clinical model.
 */
export function calculateCariogramRisk(rawInput: Partial<CariogramInput> = {}): CariogramResult {
	const input = cariogramInputSchema.parse(rawInput);
	const riskLevel: "low" | "moderate" | "high" = input.cariesRiskLevel ?? "low";

	if (riskLevel === "low") {
		return {
			chanceOfAvoidingCariesPercent: 85,
			riskCategory: "low",
			riskCategoryNameRu: "Низкий риск кариеса (85%)",
			riskCategoryDescriptionRu: "Благоприятная клиническая картина, высокая естественная резистентность эмали.",
			badgeColor: "#10b981",
			badgeBg: "rgba(16, 185, 129, 0.15)",
			sectors: {
				actualChanceOfAvoidingCaries: 85,
				dietSectorPercent: 5,
				bacteriaSectorPercent: 4,
				susceptibilitySectorPercent: 3,
				circumstancesSectorPercent: 3,
			},
			dominantRiskFactorRu: "Факторы риска компенсированы",
			preventiveProgram: {
				hygieneRecallIntervalMonths: 6,
				professionalHygieneRu: "Профессиональная гигиена полости рта 1 раз в 6 месяцев.",
				fluorideVarnishProtocolRu: "Фторирование эмали фторлаком 2 раза в год после профгигиены.",
				homeCareProtocolRu: "Чистка зубов 2 раза в день фторсодержащей зубной пастой (1000-1450 ppm F-), флосс.",
				dietaryGuidanceRu: "Сбалансированное питание, ограничение легкоусвояемых углеводов перед сном.",
				fissureSealingIndicationRu: "Неинвазивная герметизация фиссур прорезавшихся постоянных моляров силантом.",
			},
		};
	}

	if (riskLevel === "moderate") {
		return {
			chanceOfAvoidingCariesPercent: 55,
			riskCategory: "moderate",
			riskCategoryNameRu: "Умеренный риск кариеса (55%)",
			riskCategoryDescriptionRu: "Средняя вероятность деминерализации эмали. Требуется коррекция гигиены и фторпрофилактика.",
			badgeColor: "#f59e0b",
			badgeBg: "rgba(245, 158, 11, 0.15)",
			sectors: {
				actualChanceOfAvoidingCaries: 55,
				dietSectorPercent: 15,
				bacteriaSectorPercent: 15,
				susceptibilitySectorPercent: 8,
				circumstancesSectorPercent: 7,
			},
			dominantRiskFactorRu: "Недостаточная гигиена и кариесогенная диета",
			preventiveProgram: {
				hygieneRecallIntervalMonths: 4,
				professionalHygieneRu: "Профессиональная гигиена полости рта каждые 4 месяца с контролем индекса гигиены.",
				fluorideVarnishProtocolRu: "Аппликации фторлака 5% NaF (Duraphat / Clinpro) 3-4 раза в год + реминерализующий гель.",
				homeCareProtocolRu: "Звуковая зубная щетка, паста с аминофторидом 1450 ppm F-, флосс ежедневно.",
				dietaryGuidanceRu: "Ограничение сладких перекусов и напитков между приемами пищи, ксилит.",
				fissureSealingIndicationRu: "Обязательная герметизация фиссур моляров и премоляров светоотверждаемым силантом.",
			},
		};
	}

	// High risk
	return {
		chanceOfAvoidingCariesPercent: 20,
		riskCategory: "high",
		riskCategoryNameRu: "Высокий риск кариеса (20%)",
		riskCategoryDescriptionRu: "Высокая кариесогенная нагрузка, активное образование новых очагов деминерализации.",
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.15)",
		sectors: {
			actualChanceOfAvoidingCaries: 20,
			dietSectorPercent: 30,
			bacteriaSectorPercent: 25,
			susceptibilitySectorPercent: 15,
			circumstancesSectorPercent: 10,
		},
		dominantRiskFactorRu: "Высокая кариесогенная нагрузка и множественный кариес в анамнезе",
		preventiveProgram: {
			hygieneRecallIntervalMonths: 2,
			professionalHygieneRu: "Комплексная профессиональная гигиена AirFlow + ультразвук каждые 2-3 месяца.",
			fluorideVarnishProtocolRu: "Интенсивный курс фторлака 5% NaF 4 раза в год + GC Tooth Mousse ежедневно дома.",
			homeCareProtocolRu: "Контролируемая родителями чистка зубов, паста 1450 ppm, ополаскиватель с ксилитом 0.05%.",
			dietaryGuidanceRu: "Строгий запрет сахаросодержащих напитков и липких сладостей, консультация гастроэнтеролога.",
			fissureSealingIndicationRu: "Немедленная герметизация всех интактных фиссур силантом с выделением фтора.",
		},
	};
}
