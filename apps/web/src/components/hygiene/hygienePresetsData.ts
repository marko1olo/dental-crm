/**
 * hygienePresetsData.ts — Клинические шаблоны и пресеты протоколов гигиены и пародонтологии
 * для Формы 043/у и номенклатуры 804н (Мандаты 8e, 8i, 8k, 8n).
 */

import {
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	CLINICAL_PERIO_NORM_SUMMARY_RU,
	CLINICAL_PRO_HYGIENE_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	createClinicalPerioNormProtocolText,
	createClinicalProHygieneProtocolText,
	createDeepFluoridationProtocolText,
	createPerioAntisepticProtocolText,
	createToothMousseProtocolText,
	HYGIENE_EXPRESS_SERVICES,
	type CombinedHygieneReport,
	type ExtendedToothAssessment,
} from "@dental/shared";

export {
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	CLINICAL_PERIO_NORM_SUMMARY_RU,
	CLINICAL_PRO_HYGIENE_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	createClinicalPerioNormProtocolText,
	createClinicalProHygieneProtocolText,
	createDeepFluoridationProtocolText,
	createPerioAntisepticProtocolText,
	createToothMousseProtocolText,
	HYGIENE_EXPRESS_SERVICES,
};

/**
 * 1. Идеальная гигиена / Норма (OHI-S = 0.0, SBI = 0, BOP = 0%)
 */
export const EXPRESS_HYGIENE_NORM_ASSESSMENTS: Record<number, ExtendedToothAssessment> = {
	16: { toothNumber: 16, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
	11: { toothNumber: 11, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
	26: { toothNumber: 26, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
	46: { toothNumber: 46, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
	31: { toothNumber: 31, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
	36: { toothNumber: 36, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
};

/**
 * 2. Удовлетворительная гигиена (OHI-S = 0.8: мягкий налет до 1/3 коронки)
 */
export const EXPRESS_HYGIENE_FAIR_ASSESSMENTS: Record<number, ExtendedToothAssessment> = {
	16: { toothNumber: 16, debrisScore: 1, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	11: { toothNumber: 11, debrisScore: 1, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	26: { toothNumber: 26, debrisScore: 1, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	46: { toothNumber: 46, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
	31: { toothNumber: 31, debrisScore: 1, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	36: { toothNumber: 36, debrisScore: 1, calculusScore: 0, pmaScore: 0, kpiScore: 0, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
};

/**
 * 3. Неудовлетворительная гигиена (OHI-S = 1.8: наддесневой зубной камень и плотный налет)
 */
export const EXPRESS_HYGIENE_POOR_ASSESSMENTS: Record<number, ExtendedToothAssessment> = {
	16: { toothNumber: 16, debrisScore: 1, calculusScore: 1, pmaScore: 1, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	11: { toothNumber: 11, debrisScore: 1, calculusScore: 1, pmaScore: 1, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	26: { toothNumber: 26, debrisScore: 1, calculusScore: 1, pmaScore: 1, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	46: { toothNumber: 46, debrisScore: 1, calculusScore: 0, pmaScore: 1, kpiScore: 1, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	31: { toothNumber: 31, debrisScore: 1, calculusScore: 1, pmaScore: 1, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	36: { toothNumber: 36, debrisScore: 1, calculusScore: 1, pmaScore: 1, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
};

/**
 * 4. Тяжелая гигиена (OHI-S = 2.6: генерализованный поддесневой камень + кровоточивость)
 */
export const EXPRESS_HYGIENE_SEVERE_ASSESSMENTS: Record<number, ExtendedToothAssessment> = {
	16: { toothNumber: 16, debrisScore: 2, calculusScore: 2, pmaScore: 2, kpiScore: 3, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	11: { toothNumber: 11, debrisScore: 1, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	26: { toothNumber: 26, debrisScore: 2, calculusScore: 2, pmaScore: 2, kpiScore: 3, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	46: { toothNumber: 46, debrisScore: 1, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	31: { toothNumber: 31, debrisScore: 1, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	36: { toothNumber: 36, debrisScore: 1, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
};

export const CATARRHAL_GINGIVITIS_ASSESSMENTS: Record<number, ExtendedToothAssessment> = {
	16: { toothNumber: 16, debrisScore: 1, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	11: { toothNumber: 11, debrisScore: 2, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	26: { toothNumber: 26, debrisScore: 1, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	46: { toothNumber: 46, debrisScore: 1, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	31: { toothNumber: 31, debrisScore: 2, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	36: { toothNumber: 36, debrisScore: 1, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
};

export function createExpressHygieneFairProtocolText(rep: CombinedHygieneReport): string {
	return (
		"• Экспресс-оценка гигиены полости рта: Удовлетворительный уровень гигиены.\n" +
		"• Status localis: Мягкий зубной налет покрывает до 1/3 коронковой части индексных зубов. Зубной камень визуально не определяется. Десна бледно-розовая, плотная, зубодесневое прикрепление сохранено.\n" +
		`• Клинические индексы: ${rep.ohiS.ratingText}, ${rep.pma.ratingText}, ${rep.kpi.ratingText}.\n` +
		"• Назначено: Контролируемая гигиена полости рта, полировка зубов пастой Cleanic, коррекция техники чистки зубов и подбор ершиков."
	);
}

export function createExpressHygienePoorProtocolText(rep: CombinedHygieneReport): string {
	return (
		"• Экспресс-оценка гигиены полости рта: Неудовлетворительный уровень гигиены.\n" +
		"• Status localis: Визуализируются обильные наддесневые зубные отложения в пришеечной области (преимущественно язычная поверхность фронтальных зубов н/ч и щечная верхних моляров). Умеренная гиперемия маргинальной десны.\n" +
		`• Клинические индексы: ${rep.ohiS.ratingText}, ${rep.pma.ratingText}, ${rep.kpi.ratingText}.\n` +
		"• Назначено: Комплексная профессиональная гигиена полости рта (УЗ скейлинг + Air-Flow + полировка), глубокое фторирование."
	);
}

export function createExpressHygieneSevereProtocolText(rep: CombinedHygieneReport): string {
	return (
		"• Экспресс-оценка гигиены полости рта: Тяжелый уровень гигиенических нарушений (генерализованные зубные отложения).\n" +
		"• Status localis: Обильный над- и поддесневой зубной камень, плотный пигментированный налет курильщика/чайный налет. Маргинальная десна цианотична, отечна, кровоточивость при легком зондировании десневой борозды (BOP > 30%).\n" +
		`• Клинические индексы: ${rep.ohiS.ratingText}, ${rep.pma.ratingText}, ${rep.kpi.ratingText}.\n` +
		"• Назначено: Комплексная профессиональная гигиена (УЗ пьезо-скейлинг + субгингивальная обработка Air-Flow Perio порошком глицина), антисептическая обработка десны, выдача карты домашнего ухода."
	);
}

export const MILD_PERIODONTITIS_ASSESSMENTS: Record<number, ExtendedToothAssessment> = {
	16: { toothNumber: 16, debrisScore: 1, calculusScore: 2, pmaScore: 2, kpiScore: 3, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	11: { toothNumber: 11, debrisScore: 1, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	26: { toothNumber: 26, debrisScore: 1, calculusScore: 2, pmaScore: 2, kpiScore: 3, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	46: { toothNumber: 46, debrisScore: 2, calculusScore: 2, pmaScore: 2, kpiScore: 3, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	31: { toothNumber: 31, debrisScore: 1, calculusScore: 1, pmaScore: 2, kpiScore: 2, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
	36: { toothNumber: 36, debrisScore: 2, calculusScore: 2, pmaScore: 2, kpiScore: 3, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
};

export const MODERATE_PERIODONTITIS_ASSESSMENTS: Record<number, ExtendedToothAssessment> = {
	16: { toothNumber: 16, debrisScore: 2, calculusScore: 2, pmaScore: 3, kpiScore: 3, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	11: { toothNumber: 11, debrisScore: 2, calculusScore: 2, pmaScore: 3, kpiScore: 3, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	26: { toothNumber: 26, debrisScore: 2, calculusScore: 2, pmaScore: 3, kpiScore: 3, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	46: { toothNumber: 46, debrisScore: 2, calculusScore: 2, pmaScore: 3, kpiScore: 3, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	31: { toothNumber: 31, debrisScore: 2, calculusScore: 2, pmaScore: 3, kpiScore: 3, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	36: { toothNumber: 36, debrisScore: 2, calculusScore: 2, pmaScore: 3, kpiScore: 3, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
};

export const SEVERE_PERIODONTITIS_ASSESSMENTS: Record<number, ExtendedToothAssessment> = {
	16: { toothNumber: 16, debrisScore: 3, calculusScore: 3, pmaScore: 3, kpiScore: 4, silnessScore: 3, fedorovScore: 5, phpScore: 5 },
	11: { toothNumber: 11, debrisScore: 2, calculusScore: 2, pmaScore: 3, kpiScore: 4, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	26: { toothNumber: 26, debrisScore: 3, calculusScore: 3, pmaScore: 3, kpiScore: 4, silnessScore: 3, fedorovScore: 5, phpScore: 5 },
	46: { toothNumber: 46, debrisScore: 3, calculusScore: 3, pmaScore: 3, kpiScore: 4, silnessScore: 3, fedorovScore: 5, phpScore: 5 },
	31: { toothNumber: 31, debrisScore: 2, calculusScore: 3, pmaScore: 3, kpiScore: 4, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
	36: { toothNumber: 36, debrisScore: 3, calculusScore: 3, pmaScore: 3, kpiScore: 4, silnessScore: 3, fedorovScore: 5, phpScore: 5 },
};

export function createCatarrhalGingivitisProtocolText(rep: CombinedHygieneReport): string {
	return (
		"• Экспресс-оценка гигиены и пародонта: Хронический катаральный гингивит (K05.1).\n" +
		"• Status localis: Отек десневых сосочков, гиперемия и цианоз маргинального края десны, кровоточивость при зондировании (BOP+). Патологических пародонтальных карманов нет (глубина бороздок до 3 мм за счет отека десны). Определяются наддесневые зубные отложения и мягкий зубной налет.\n" +
		`• Клинические индексы: ${rep.ohiS.ratingText}, ${rep.pma.ratingText}, ${rep.kpi.ratingText}.\n` +
		"• Рекомендовано: Профессиональная гигиена полости рта (УЗ + AirFlow), противовоспалительная терапия, аппликации дентального геля."
	);
}

export function createMildPeriodontitisProtocolText(rep: CombinedHygieneReport): string {
	return (
		"• Экспресс-оценка гигиены и пародонта: Хронический генерализованный пародонтит легкой степени тяжести (K05.3).\n" +
		"• Status localis: Десна умеренно гиперемирована, пастозна, с цианотичным оттенком. Глубина пародонтальных карманов 3-4 мм, преимущественно в межзубных промежутках, кровоточивость при зондировании (BOP+). Рецессия десны до 1 мм, умеренное количество над- и поддесневого зубного камня, патологическая подвижность зубов отсутствует (0 ст.). На рентгенограмме/КЛКТ: деструкция кортикальной пластинки и вершин межальвеолярных перегородок до 1/3 длины корней.\n" +
		`• Клинические индексы: ${rep.ohiS.ratingText}, ${rep.pma.ratingText}, ${rep.kpi.ratingText}.\n` +
		"• Рекомендовано: Профессиональная гигиена полости рта (ультразвуковое удаление отложений + субгингивальная обработка), закрытый кюретаж карманов, антисептическая обработка десны, обучение гигиене."
	);
}

export function createModeratePeriodontitisProtocolText(rep: CombinedHygieneReport): string {
	return (
		"• Экспресс-оценка гигиены и пародонта: Хронический генерализованный пародонтит средней степени тяжести (K05.3).\n" +
		"• Status localis: Десна застойно гиперемирована с цианотичным оттенком, сосочки деформированы. Глубина пародонтальных карманов 4-5 мм с серозным экссудатом, рецессия десны 1-2 мм, обильный под- и наддесневой зубной камень, патологическая подвижность I ст. На рентгенограмме/КЛКТ: резорбция костной ткани межальвеолярных перегородок от 1/3 до 1/2 длины корней.\n" +
		`• Клинические индексы: ${rep.ohiS.ratingText}, ${rep.pma.ratingText}, ${rep.kpi.ratingText}.\n` +
		"• Рекомендовано: Комплексная пародонтальная терапия, поддесневой кюретаж, антимикробная обработка карманов, шинирование по показаниям."
	);
}

export function createSeverePeriodontitisProtocolText(rep: CombinedHygieneReport): string {
	return (
		"• Экспресс-оценка гигиены и пародонта: Хронический генерализованный пародонтит тяжёлой степени (K05.32).\n" +
		"• Status localis: Десна застойно цианотична, выраженная кровоточивость сосочков (BOP > 50%). Глубокие пародонтальные карманы от 6 до 8 мм с серозно-гнойным экссудатом, рецессия десны 2-4 мм с обнажением фуркаций корней (фуркационные дефекты II класса). Обильный над- и поддесневой зубной камень, патологическая подвижность зубов II-III ст., веерообразное расхождение резцов. На рентгенограмме/КЛКТ: диффузная деструкция костной ткани межальвеолярных перегородок более 1/2 длины корней.\n" +
		`• Клинические индексы: ${rep.ohiS.ratingText}, ${rep.pma.ratingText}, ${rep.kpi.ratingText}.\n` +
		"• Рекомендовано: Неотложная противовоспалительная санация пародонта, антисептическое орошение карманов хлоргексидином 0.05%, эвакуация гнойного экссудата. Временное экстракоронарное шинирование подвижных зубов (A16.07.019). Системная противовоспалительная терапия, консультация хирурга-пародонтолога (лоскутные операции / удаление безнадежных зубов)."
	);
}

export const PRO_HYGIENE_SERVICE = {
	code: "A16.07.051",
	name: CLINICAL_PRO_HYGIENE_SUMMARY_RU,
	price: 5500,
	quantity: 1,
	category: "hygiene",
};

export const DEEP_FLUORIDATION_SERVICE = {
	code: "A11.07.012",
	name: CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	price: 1800,
	quantity: 1,
	category: "hygiene",
};

export const TOOTH_MOUSSE_SERVICE = {
	code: "A11.07.010",
	name: CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	price: 1500,
	quantity: 1,
	category: "hygiene",
};

export const PERIO_ANTISEPTIC_SERVICE = {
	code: "A16.07.053",
	name: CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	price: 1200,
	quantity: 1,
	category: "hygiene",
};
