import { z } from "zod";
/**
 * FDI Primary Dentition Tooth Numbers (51..55, 61..65, 71..75, 81..85)
 * 20 primary teeth total:
 * - Upper Right (Q5): 55, 54, 53, 52, 51
 * - Upper Left (Q6): 61, 62, 63, 64, 65
 * - Lower Left (Q7): 71, 72, 73, 74, 75
 * - Lower Right (Q8): 85, 84, 83, 82, 81
 */
export const PRIMARY_UPPER_RIGHT = [55, 54, 53, 52, 51];
export const PRIMARY_UPPER_LEFT = [61, 62, 63, 64, 65];
export const PRIMARY_LOWER_LEFT = [71, 72, 73, 74, 75];
export const PRIMARY_LOWER_RIGHT = [85, 84, 83, 82, 81];
export const PRIMARY_UPPER_TEETH = [
    ...PRIMARY_UPPER_RIGHT,
    ...PRIMARY_UPPER_LEFT,
];
export const PRIMARY_LOWER_TEETH = [
    ...PRIMARY_LOWER_RIGHT,
    ...PRIMARY_LOWER_LEFT,
];
export const ALL_PRIMARY_TEETH = [
    ...PRIMARY_UPPER_TEETH,
    ...PRIMARY_LOWER_TEETH,
];
export const primaryToothNumberSchema = z
    .number()
    .int()
    .refine((n) => ALL_PRIMARY_TEETH.includes(n), {
    message: "Номер зуба должен соответствовать временному прикусу (51-55, 61-65, 71-75, 81-85)",
});
export function isPrimaryTooth(toothNumber) {
    return ((toothNumber >= 51 && toothNumber <= 55) ||
        (toothNumber >= 61 && toothNumber <= 65) ||
        (toothNumber >= 71 && toothNumber <= 75) ||
        (toothNumber >= 81 && toothNumber <= 85));
}
/**
 * Mapping of Primary Teeth to their permanent successors.
 */
export const PRIMARY_TO_PERMANENT_SUCCESSOR_MAP = {
    // Upper Right
    51: 11, // Central Incisor
    52: 12, // Lateral Incisor
    53: 13, // Canine
    54: 14, // First Premolar replaces First Primary Molar
    55: 15, // Second Premolar replaces Second Primary Molar
    // Upper Left
    61: 21,
    62: 22,
    63: 23,
    64: 24,
    65: 25,
    // Lower Left
    71: 31,
    72: 32,
    73: 33,
    74: 34,
    75: 35,
    // Lower Right
    81: 41,
    82: 42,
    83: 43,
    84: 44,
    85: 45,
};
export const PERMANENT_TO_PRIMARY_PREDECESSOR_MAP = {
    11: 51,
    12: 52,
    13: 53,
    14: 54,
    15: 55,
    21: 61,
    22: 62,
    23: 63,
    24: 64,
    25: 65,
    31: 71,
    32: 72,
    33: 73,
    34: 74,
    35: 75,
    41: 81,
    42: 82,
    43: 83,
    44: 84,
    45: 85,
};
/**
 * Mixed Dentition Standard Arch Presets (6–12 years)
 * Standard Mixed Top: First permanent molars (16, 26) + primary teeth (55..51, 61..65)
 * Standard Mixed Bottom: First permanent molars (46, 36) + primary teeth (85..81, 71..75)
 */
export const MIXED_DENTITION_TOP = [
    16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26,
];
export const MIXED_DENTITION_BOTTOM = [
    46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36,
];
export const ALL_MIXED_DENTITION_TEETH = [
    ...MIXED_DENTITION_TOP,
    ...MIXED_DENTITION_BOTTOM,
];
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
export const RESORPTION_STAGE_DEFINITIONS = {
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
/**
 * Normal physiological eruption and shedding timelines (WHO / Pediatric Dentistry Standard)
 */
const PHYSIOLOGICAL_ERUPTION_DATA = [
    // Lower Centrals
    { primaryFdi: 71, permanentSuccessorFdi: 31, nameRu: "Центральные резцы н/ч", resorptionStartAge: 5.0, exfoliationAge: 6.2, permanentEruptionAge: 6.5 },
    { primaryFdi: 81, permanentSuccessorFdi: 41, nameRu: "Центральные резцы н/ч", resorptionStartAge: 5.0, exfoliationAge: 6.2, permanentEruptionAge: 6.5 },
    // Upper Centrals
    { primaryFdi: 51, permanentSuccessorFdi: 11, nameRu: "Центральные резцы в/ч", resorptionStartAge: 5.5, exfoliationAge: 7.0, permanentEruptionAge: 7.3 },
    { primaryFdi: 61, permanentSuccessorFdi: 21, nameRu: "Центральные резцы в/ч", resorptionStartAge: 5.5, exfoliationAge: 7.0, permanentEruptionAge: 7.3 },
    // Lower Laterals
    { primaryFdi: 72, permanentSuccessorFdi: 32, nameRu: "Боковые резцы н/ч", resorptionStartAge: 6.0, exfoliationAge: 7.3, permanentEruptionAge: 7.5 },
    { primaryFdi: 82, permanentSuccessorFdi: 42, nameRu: "Боковые резцы н/ч", resorptionStartAge: 6.0, exfoliationAge: 7.3, permanentEruptionAge: 7.5 },
    // Upper Laterals
    { primaryFdi: 52, permanentSuccessorFdi: 12, nameRu: "Боковые резцы в/ч", resorptionStartAge: 6.5, exfoliationAge: 8.0, permanentEruptionAge: 8.2 },
    { primaryFdi: 62, permanentSuccessorFdi: 22, nameRu: "Боковые резцы в/ч", resorptionStartAge: 6.5, exfoliationAge: 8.0, permanentEruptionAge: 8.2 },
    // Lower Canines
    { primaryFdi: 73, permanentSuccessorFdi: 33, nameRu: "Клыки н/ч", resorptionStartAge: 7.5, exfoliationAge: 9.5, permanentEruptionAge: 9.8 },
    { primaryFdi: 83, permanentSuccessorFdi: 43, nameRu: "Клыки н/ч", resorptionStartAge: 7.5, exfoliationAge: 9.5, permanentEruptionAge: 9.8 },
    // First Premolars (replacing First Primary Molars)
    { primaryFdi: 54, permanentSuccessorFdi: 14, nameRu: "Первые премоляры в/ч", resorptionStartAge: 7.5, exfoliationAge: 10.0, permanentEruptionAge: 10.2 },
    { primaryFdi: 64, permanentSuccessorFdi: 24, nameRu: "Первые премоляры в/ч", resorptionStartAge: 7.5, exfoliationAge: 10.0, permanentEruptionAge: 10.2 },
    { primaryFdi: 74, permanentSuccessorFdi: 34, nameRu: "Первые премоляры н/ч", resorptionStartAge: 7.5, exfoliationAge: 10.0, permanentEruptionAge: 10.2 },
    { primaryFdi: 84, permanentSuccessorFdi: 44, nameRu: "Первые премоляры н/ч", resorptionStartAge: 7.5, exfoliationAge: 10.0, permanentEruptionAge: 10.2 },
    // Second Premolars (replacing Second Primary Molars)
    { primaryFdi: 55, permanentSuccessorFdi: 15, nameRu: "Вторые премоляры в/ч", resorptionStartAge: 8.0, exfoliationAge: 11.0, permanentEruptionAge: 11.3 },
    { primaryFdi: 65, permanentSuccessorFdi: 25, nameRu: "Вторые премоляры в/ч", resorptionStartAge: 8.0, exfoliationAge: 11.0, permanentEruptionAge: 11.3 },
    { primaryFdi: 75, permanentSuccessorFdi: 35, nameRu: "Вторые премоляры н/ч", resorptionStartAge: 8.0, exfoliationAge: 11.0, permanentEruptionAge: 11.3 },
    { primaryFdi: 85, permanentSuccessorFdi: 45, nameRu: "Вторые премоляры н/ч", resorptionStartAge: 8.0, exfoliationAge: 11.0, permanentEruptionAge: 11.3 },
    // Upper Canines
    { primaryFdi: 53, permanentSuccessorFdi: 13, nameRu: "Клыки в/ч", resorptionStartAge: 8.5, exfoliationAge: 11.5, permanentEruptionAge: 11.8 },
    { primaryFdi: 63, permanentSuccessorFdi: 23, nameRu: "Клыки в/ч", resorptionStartAge: 8.5, exfoliationAge: 11.5, permanentEruptionAge: 11.8 },
];
/**
 * Calculates expected dental status and tooth exchange at a given chronological age (6-12 years).
 */
export function calculateEruptionTimelineByAge(ageYears) {
    const clampedAge = Math.max(4, Math.min(16, ageYears));
    let stageCategory = "early_mixed";
    let stageNameRu = "Ранний сменный прикус (6–8 лет)";
    let stageDescriptionRu = "Прорезывание первых постоянных моляров (16, 26, 36, 46) и смена центральных и боковых резцов.";
    if (clampedAge < 5.8) {
        stageCategory = "primary";
        stageNameRu = "Временный прикус (до 6 лет)";
        stageDescriptionRu = "Все 20 молочных зубов интактны, формирование физиологических трем и диастем.";
    }
    else if (clampedAge >= 5.8 && clampedAge < 8.5) {
        stageCategory = "early_mixed";
        stageNameRu = "Ранний сменный прикус (6–8 лет)";
        stageDescriptionRu =
            "Первый период смены: прорезывание первых моляров («шестёрок») и резцов.";
    }
    else if (clampedAge >= 8.5 && clampedAge < 10.5) {
        stageCategory = "intermediate_mixed";
        stageNameRu = "Период относительного покоя (8.5–10 лет)";
        stageDescriptionRu =
            "Второй период смены: стабилизация окклюзии, подготовка зачатков премоляров и клыков.";
    }
    else if (clampedAge >= 10.5 && clampedAge < 12.5) {
        stageCategory = "late_mixed";
        stageNameRu = "Поздний сменный прикус (10.5–12.5 лет)";
        stageDescriptionRu =
            "Активная смена молочных моляров на премоляры и прорезывание клыков, прорезывание вторых моляров.";
    }
    else {
        stageCategory = "permanent";
        stageNameRu = "Постоянный прикус (от 12.5 лет)";
        stageDescriptionRu =
            "Все постоянные зубы прорезались (кроме зубов мудрости), верхушки корней сформированы.";
    }
    const toothStatuses = [];
    const activeExfoliatingTeeth = [];
    const activelyEruptingPermanentTeeth = [];
    const clinicalAlerts = [];
    // Upper and lower expected teeth lists
    const expectedUpper = [];
    const expectedLower = [];
    // 1. First Permanent Molars (16, 26, 36, 46) erupt at ~6 years
    const hasFirstMolars = clampedAge >= 6.0;
    // 2. Second Permanent Molars (17, 27, 37, 47) erupt at ~12 years
    const hasSecondMolars = clampedAge >= 12.0;
    // Check each primary/permanent tooth pair
    for (const pair of PHYSIOLOGICAL_ERUPTION_DATA) {
        let expectedResorption = 0;
        let status = "erupted";
        let labelRu = "В прикусе (интактный)";
        if (clampedAge < pair.resorptionStartAge) {
            expectedResorption = 0;
            status = "erupted";
            labelRu = "В прикусе, корень полный";
        }
        else if (clampedAge >= pair.resorptionStartAge && clampedAge < pair.exfoliationAge - 0.8) {
            expectedResorption = 25;
            status = "resorbing";
            labelRu = "Начальная резорбция корня (25%)";
        }
        else if (clampedAge >= pair.exfoliationAge - 0.8 && clampedAge < pair.exfoliationAge - 0.3) {
            expectedResorption = 50;
            status = "resorbing";
            labelRu = "Резорбция 1/2 корня (50%)";
        }
        else if (clampedAge >= pair.exfoliationAge - 0.3 && clampedAge < pair.exfoliationAge) {
            expectedResorption = 75;
            status = "exfoliating";
            labelRu = "Субтотальная резорбция (75%), подвижность";
            activeExfoliatingTeeth.push(pair.primaryFdi);
        }
        else if (clampedAge >= pair.exfoliationAge && clampedAge < pair.permanentEruptionAge + 0.3) {
            expectedResorption = 100;
            status = "erupting";
            labelRu = "Эксфолиация / прорезывание постоянного";
            activelyEruptingPermanentTeeth.push(pair.permanentSuccessorFdi);
        }
        else {
            expectedResorption = 100;
            status = "future_permanent";
            labelRu = "Постоянный зуб прорезался";
        }
        toothStatuses.push({
            fdiNumber: status === "future_permanent" ? pair.permanentSuccessorFdi : pair.primaryFdi,
            isPrimary: status !== "future_permanent",
            successorPermanentFdi: pair.permanentSuccessorFdi,
            predecessorPrimaryFdi: pair.primaryFdi,
            normalEruptionAgeRangeYears: [pair.exfoliationAge, pair.permanentEruptionAge],
            status,
            expectedResorptionPercent: expectedResorption,
            labelRu,
        });
    }
    // Construct upper arch:
    if (hasSecondMolars)
        expectedUpper.push(17);
    if (hasFirstMolars)
        expectedUpper.push(16);
    const upperPairs = [
        { p: 55, s: 15 },
        { p: 54, s: 14 },
        { p: 53, s: 13 },
        { p: 52, s: 12 },
        { p: 51, s: 11 },
        { p: 61, s: 21 },
        { p: 62, s: 22 },
        { p: 63, s: 23 },
        { p: 64, s: 24 },
        { p: 65, s: 25 },
    ];
    for (const { p, s } of upperPairs) {
        const st = toothStatuses.find((t) => t.predecessorPrimaryFdi === p);
        if (st?.status === "future_permanent")
            expectedUpper.push(s);
        else
            expectedUpper.push(p);
    }
    if (hasFirstMolars)
        expectedUpper.push(26);
    if (hasSecondMolars)
        expectedUpper.push(27);
    // Construct lower arch:
    if (hasSecondMolars)
        expectedLower.push(47);
    if (hasFirstMolars)
        expectedLower.push(46);
    const lowerPairs = [
        { p: 85, s: 45 },
        { p: 84, s: 44 },
        { p: 83, s: 43 },
        { p: 82, s: 42 },
        { p: 81, s: 41 },
        { p: 71, s: 31 },
        { p: 72, s: 32 },
        { p: 73, s: 33 },
        { p: 74, s: 34 },
        { p: 75, s: 35 },
    ];
    for (const { p, s } of lowerPairs) {
        const st = toothStatuses.find((t) => t.predecessorPrimaryFdi === p);
        if (st?.status === "future_permanent")
            expectedLower.push(s);
        else
            expectedLower.push(p);
    }
    if (hasFirstMolars)
        expectedLower.push(36);
    if (hasSecondMolars)
        expectedLower.push(37);
    // Clinical Recommendations & Space maintenance alerts:
    if (clampedAge >= 6.0 && clampedAge <= 8.0) {
        clinicalAlerts.push({
            type: "info",
            titleRu: "Герметизация фиссур первых моляров",
            textRu: "Показана неинвазивная герметизация фиссур прорезавшихся постоянных зубов 16, 26, 36, 46.",
        });
    }
    if (clampedAge >= 7.0 && clampedAge <= 9.0) {
        clinicalAlerts.push({
            type: "orthodontic_space_maintainer",
            titleRu: "Контроль места при ранней потере молочных моляров",
            textRu: "При преждевременном удалении зубов 54, 55, 64, 65, 74, 75, 84, 85 обязательно изготовление несъемного удерживателя пространства (кольцо с распоркой).",
        });
    }
    return {
        ageYears: clampedAge,
        dentalAgeYears: clampedAge,
        stageCategory,
        stageNameRu,
        stageDescriptionRu,
        expectedExchangeDescriptionRu: activeExfoliatingTeeth.length > 0
            ? `Активная смена молочных зубов: ${activeExfoliatingTeeth.join(", ")}`
            : activelyEruptingPermanentTeeth.length > 0
                ? `Прорезывание постоянных зубов: ${activelyEruptingPermanentTeeth.join(", ")}`
                : "Период относительной стабильности окклюзии",
        expectedUpperArchTeeth: expectedUpper,
        expectedLowerArchTeeth: expectedLower,
        toothStatuses,
        activeExfoliatingTeeth,
        activelyEruptingPermanentTeeth,
        clinicalAlerts,
    };
}
// ------------------------------------------------------------------------------------------------
// CARIOGRAM RISK CLASSIFIER (3-STATE CLINICAL RISK MODEL)
// ------------------------------------------------------------------------------------------------
/**
 * Simplified 3-State Cariogram Clinical Risk Assessment.
 * 1-click selection: "low" | "moderate" | "high".
 */
export const cariogramRiskLevelSchema = z.enum(["low", "moderate", "high"]);
export const cariogramInputSchema = z.object({
    cariesRiskLevel: cariogramRiskLevelSchema.optional().default("low"),
    // Backwards-compatible legacy fields
    dietContents: z.number().int().min(0).max(3).optional().default(1),
    dietFrequency: z.number().int().min(0).max(3).optional().default(1),
    plaqueAmount: z.number().int().min(0).max(3).optional().default(1),
    streptococcusMutans: z.number().int().min(0).max(3).optional().default(1),
    fluorideProgram: z.number().int().min(0).max(3).optional().default(1),
    salivaSecretionRate: z.number().int().min(0).max(3).optional().default(0),
    salivaBufferCapacity: z.number().int().min(0).max(2).optional().default(0),
    pastCariesExperience: z.number().int().min(0).max(3).optional().default(1),
    systemicDiseases: z.number().int().min(0).max(2).optional().default(0),
    clinicalJudgment: z.number().int().min(0).max(3).optional().default(1),
});
/**
 * Calculates the Cariogram caries risk and chance of avoiding caries per 3-state clinical model.
 */
export function calculateCariogramRisk(rawInput = {}) {
    const input = cariogramInputSchema.parse(rawInput);
    let riskLevel = input.cariesRiskLevel ?? "low";
    if (rawInput.cariesRiskLevel === undefined) {
        const highRiskSignals = (input.pastCariesExperience >= 2 ? 1 : 0) +
            (input.plaqueAmount >= 2 ? 1 : 0) +
            (input.dietFrequency >= 2 ? 1 : 0) +
            (input.fluorideProgram >= 2 ? 1 : 0);
        if (highRiskSignals >= 3 || input.pastCariesExperience >= 3) {
            riskLevel = "high";
        }
        else if (highRiskSignals >= 1) {
            riskLevel = "moderate";
        }
    }
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
/**
 * Generates a structured clinical diary text for pediatric patients (Форма 043/у — Детский протокол).
 * Includes primary teeth resorption stages, mixed dentition analysis, Cariogram risk score, Frankl behavior rating, and preventive plan.
 */
export function generatePediatricCariogramDiaryText(options) {
    const age = options?.patientAgeYears ?? 8;
    const timeline = calculateEruptionTimelineByAge(age);
    const cariogram = calculateCariogramRisk(options?.cariogramInput ?? {});
    const resorption = options?.resorptionStages ?? {};
    const teethStates = options?.teethStates ?? {};
    const frankl = options?.franklRating ? getFranklDefinition(options.franklRating) : null;
    const lines = [];
    lines.push("ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)");
    lines.push("────────────────────────────────────────────────────────────");
    // 1. Психоэмоциональный статус по Франклу (если указан)
    if (frankl) {
        lines.push("1. Психоэмоциональный статус (Шкала Франкла):");
        lines.push(`   • ${frankl.nameRu} ${frankl.emoji}`);
        lines.push(`   • Характеристика: ${frankl.descriptionRu}`);
        lines.push(`   • Примененная стратегия: ${frankl.managementStrategiesRu[0] ?? "Tell-Show-Do"}`);
        lines.push("");
    }
    lines.push(`${frankl ? "2" : "1"}. Зубной возраст и фаза сменного прикуса:`);
    lines.push(`   • Хронологический возраст: ${age} лет (расчетный зубной возраст: ${timeline.dentalAgeYears} лет)`);
    lines.push(`   • Фаза прикуса: ${timeline.stageNameRu} (${timeline.stageDescriptionRu})`);
    lines.push(`   • Ожидаемая сменяемость зубов: ${timeline.expectedExchangeDescriptionRu}`);
    lines.push("");
    // 2/3. Статус резорбции корней временных зубов (FDI)
    lines.push(`${frankl ? "3" : "2"}. Физиологическая резорбция корней временных зубов (FDI):`);
    const resorptionEntries = Object.entries(resorption)
        .map(([num, stage]) => ({ tooth: Number(num), stage }))
        .filter((e) => isPrimaryTooth(e.tooth));
    if (resorptionEntries.length > 0) {
        const formattedResorption = resorptionEntries
            .map((e) => {
            const successor = PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[e.tooth];
            const stageDef = RESORPTION_STAGE_DEFINITIONS[e.stage]?.nameRu ?? `${e.stage}%`;
            const succStr = successor ? ` (зачаток постоянного зуба #${successor})` : "";
            return `   • Зуб #${e.tooth}: резорбция ${e.stage}% — ${stageDef}${succStr}`;
        })
            .join("\n");
        lines.push(formattedResorption);
    }
    else {
        const primaryTeethActive = ALL_PRIMARY_TEETH.filter((t) => teethStates[t] && teethStates[t] !== "Missing" && teethStates[t] !== "Extracted");
        if (primaryTeethActive.length > 0) {
            lines.push(`   • Временные зубы в полости рта: ${primaryTeethActive.join(", ")}`);
            lines.push("   • Резорбция корней соответствует возрастной физиологической норме.");
        }
        else {
            lines.push("   • Резорбция корней временных зубов протекает физиологически согласно хронологическому возрасту.");
        }
    }
    lines.push("");
    // 3/4. Клиническая оценка риска кариеса
    lines.push(`${frankl ? "4" : "3"}. Клиническая оценка риска кариеса:`);
    lines.push(`   • Категория риска: ${cariogram.riskCategoryNameRu}`);
    lines.push(`   • Характеристика: ${cariogram.riskCategoryDescriptionRu}`);
    lines.push(`   • Доминирующий фактор риска: ${cariogram.dominantRiskFactorRu}`);
    lines.push("");
    // 4/5. Индивидуализированный план профилактики и ремотерапии
    lines.push(`${frankl ? "5" : "4"}. Индивидуализированная программа детской профилактики и ремотерапии:`);
    lines.push(`   • ${cariogram.preventiveProgram.professionalHygieneRu}`);
    lines.push(`   • ${cariogram.preventiveProgram.fluorideVarnishProtocolRu}`);
    lines.push(`   • ${cariogram.preventiveProgram.fissureSealingIndicationRu}`);
    lines.push(`   • ${cariogram.preventiveProgram.homeCareProtocolRu}`);
    lines.push(`   • ${cariogram.preventiveProgram.dietaryGuidanceRu}`);
    lines.push(`   • Диспансерный осмотр: через ${cariogram.preventiveProgram.hygieneRecallIntervalMonths} месяца(ев).`);
    // 5/6. Выполненные детские клинические манипуляции
    const procLines = [];
    if (options?.pulpotomy) {
        const pulp = calculatePediatricPulpotomyProtocol(options.pulpotomy);
        procLines.push(`   • Пульпотомия зуба ${pulp.toothNumber}: лечебная паста ${pulp.subBaseMaterial}, реставрация ${pulp.restorationNameRu}.`);
    }
    if (options?.fissureSealing) {
        const fiss = calculatePediatricFissureSealingProtocol(options.fissureSealing);
        procLines.push(`   • Герметизация фиссур (${fiss.teethNumbers.join(", ")}): ${fiss.methodNameRu}, материал ${fiss.material}.`);
    }
    if (options?.silvering) {
        const silv = calculatePediatricSilveringProtocol(options.silvering);
        procLines.push(`   • Серебрение (${silv.teethNumbers.join(", ")}): препарат ${silv.drug}, ${silv.applicationsCount}-я аппликация.`);
    }
    if (procLines.length > 0) {
        lines.push("");
        lines.push(`${frankl ? "6" : "5"}. Выполненные клинические манипуляции:`);
        procLines.forEach((pl) => lines.push(pl));
    }
    if (options?.customNotes) {
        lines.push("");
        lines.push(`Особые отметки: ${options.customNotes}`);
    }
    return lines.join("\n");
}
export const PEDIATRIC_ANESTHETIC_DOSAGE_LIMITS = {
    articaine4Percent: {
        drugCode: "articaine",
        nameRu: "Артикаин 4% с эпинефрином 1:200 000 (Ультракаин Д-С / Септанест)",
        concentrationPercent: 4.0,
        vasoconstrictorRatio: "1:200000",
        minAgeYears: 4,
        maxDosePerKgMg: 5.0, // 5.0 mg/kg pediatric standard for children 4-12 years
        absoluteMaxDoseMg: 500,
        carpuleVolumeMl: 1.7,
        mgPerCarpule: 68.0, // 40 mg/ml * 1.7 ml = 68 mg
        epinephrinePerCarpuleMg: 0.0085, // 0.005 mg/ml * 1.7 ml = 0.0085 mg
    },
    mepivacaine3Percent: {
        drugCode: "mepivacaine",
        nameRu: "Мепивакаин 3% без вазоконстриктора (Скандонест)",
        concentrationPercent: 3.0,
        vasoconstrictorRatio: "none",
        minAgeYears: 4,
        maxDosePerKgMg: 4.4,
        absoluteMaxDoseMg: 300,
        carpuleVolumeMl: 1.8,
        mgPerCarpule: 54.0,
        epinephrinePerCarpuleMg: 0,
    },
    lidocaine2Percent: {
        drugCode: "lidocaine",
        nameRu: "Лидокаин 2% с адреналином 1:200 000",
        concentrationPercent: 2.0,
        vasoconstrictorRatio: "1:200000",
        minAgeYears: 4,
        maxDosePerKgMg: 4.4,
        absoluteMaxDoseMg: 300,
        carpuleVolumeMl: 2.0,
        mgPerCarpule: 40.0,
        epinephrinePerCarpuleMg: 0.01,
    },
};
/**
 * Расчёт предельно допустимой дозы (MRD) анестетика для детей:
 * - Артикаин 4% с вазоконстриктором 1:200 000: максимум 5.0 мг/кг (детям от 4 лет).
 * - До 4 лет применение артикаина противопоказано.
 */
export function calculatePediatricAnestheticSafety(params) {
    const drugType = params.drugType ?? "articaine4Percent";
    const spec = PEDIATRIC_ANESTHETIC_DOSAGE_LIMITS[drugType];
    const weight = Math.max(5, Math.min(100, params.patientWeightKg));
    const age = params.patientAgeYears;
    const carpules = Math.max(0, params.carpulesAdministered);
    const carpuleVol = params.carpuleVolumeMl ?? spec.carpuleVolumeMl;
    const warnings = [];
    let isAgeContraindicated = false;
    if (age < spec.minAgeYears) {
        isAgeContraindicated = true;
        warnings.push(`Препарат ${spec.nameRu} противопоказан детям в возрасте до ${spec.minAgeYears} лет.`);
    }
    const mrdPerKg = spec.maxDosePerKgMg;
    const maxAllowedTotalDoseMg = Number(Math.min(spec.absoluteMaxDoseMg, weight * mrdPerKg).toFixed(1));
    const mgPerMl = spec.concentrationPercent * 10;
    const singleCarpuleDoseMg = Number((mgPerMl * carpuleVol).toFixed(1));
    const totalDoseAdministeredMg = Number((carpules * singleCarpuleDoseMg).toFixed(1));
    let epiPerMl = 0;
    if (spec.vasoconstrictorRatio === "1:200000")
        epiPerMl = 0.005;
    else if (spec.vasoconstrictorRatio === "1:100000")
        epiPerMl = 0.01;
    const totalEpinephrineAdministeredMg = Number((carpules * carpuleVol * epiPerMl).toFixed(4));
    const maxSafeCarpulesCount = Number((maxAllowedTotalDoseMg / (singleCarpuleDoseMg || 1)).toFixed(2));
    const doseUtilizationPercent = Number(((totalDoseAdministeredMg / (maxAllowedTotalDoseMg || 1)) * 100).toFixed(1));
    const isOverdose = totalDoseAdministeredMg > maxAllowedTotalDoseMg;
    if (isOverdose) {
        warnings.push(`ПРЕВЫШЕНА МАКСИМАЛЬНАЯ ДОЗА АНЕСТЕТИКА: введено ${totalDoseAdministeredMg} мг (лимит ${maxAllowedTotalDoseMg} мг на вес ${weight} кг). Максимум ${maxSafeCarpulesCount} карпул(ы).`);
    }
    if (spec.vasoconstrictorRatio === "1:100000") {
        warnings.push("В детской практике рекомендуется вазоконстриктор 1:200 000 (снижение кардио-нагрузки).");
    }
    return {
        drugName: spec.nameRu,
        activeSubstance: spec.drugCode,
        concentrationPercent: spec.concentrationPercent,
        vasoconstrictorRatio: spec.vasoconstrictorRatio,
        patientWeightKg: weight,
        patientAgeYears: age,
        mrdPerKgMg: mrdPerKg,
        maxAllowedTotalDoseMg,
        singleCarpuleDoseMg,
        singleCarpuleVolumeMl: carpuleVol,
        maxSafeCarpulesCount,
        carpulesAdministered: carpules,
        totalDoseAdministeredMg,
        totalEpinephrineAdministeredMg,
        doseUtilizationPercent,
        isSafe: !isOverdose && !isAgeContraindicated,
        isOverdose,
        isAgeContraindicated,
        safetyWarningsRu: warnings,
    };
}
// ------------------------------------------------------------------------------------------------
// FRANKL BEHAVIOR RATING SCALE (1..4) (ШКАЛА ПОВЕДЕНИЯ ФРАНКЛА)
// ------------------------------------------------------------------------------------------------
export const franklRatingSchema = z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
]);
export const FRANKL_SCALE_DEFINITIONS = {
    1: {
        rating: 1,
        code: "frankl_1_definitely_negative",
        symbol: "--",
        nameRu: "Рейтинг 1 (--) — Категорически негативное",
        labelRu: "Категорически негативное (--)",
        descriptionRu: "Отказ от лечения, выраженный страх, непрерывный плач, физическое сопротивление или агрессия.",
        clinicalSignsRu: "Ребенок отказывается садиться в кресло, плотно сжимает губы/зубы, кричит, отталкивает врача и инструменты.",
        badgeColor: "#ef4444",
        badgeBg: "rgba(239, 68, 68, 0.15)",
        badgeBorder: "rgba(239, 68, 68, 0.35)",
        emoji: "😫",
        managementStrategiesRu: [
            "Техника «Скажи-Покажи-Сделай» (Tell-Show-Do)",
            "Поэтапная адаптация и ознакомительный визит без инвазивных вмешательств",
            "Контроль голоса (Voice Control) — спокойная, уверенная, монотонная интонация",
            "Пассивное присутствие родителей рядом с креслом для эмоциональной поддержки",
            "Рассмотрение седации закисью азота (N2O-O2) или медикаментозного сна при неотложных показаниях",
        ],
        clinicalNotesTemplateRu: "Поведение по Франклу: Рейтинг 1 (--) — Категорически негативное. Контакт затруднен из-за высокого уровня тревожности, проведена психологическая адаптация.",
    },
    2: {
        rating: 2,
        code: "frankl_2_negative",
        symbol: "-",
        nameRu: "Рейтинг 2 (-) — Негативное",
        labelRu: "Негативное (-)",
        descriptionRu: "Неохотное принятие лечения, настороженность, капризы, замкнутость, слезы при манипуляциях.",
        clinicalSignsRu: "Ребенок садится в кресло с уговорами, скован, напряжен, плачет при виде инструментов, но дает провести минимальный осмотр.",
        badgeColor: "#f59e0b",
        badgeBg: "rgba(245, 158, 11, 0.15)",
        badgeBorder: "rgba(245, 158, 11, 0.35)",
        emoji: "🙁",
        managementStrategiesRu: [
            "Техника «Скажи-Покажи-Сделай» (Tell-Show-Do)",
            "Позитивное подкрепление за каждое выполненное микро-действие",
            "Отвлечение внимания (мультфильмы, аудиотреки, яркие игрушки)",
            "Установление стоп-сигнала рукой («подними левую ручку, если захочешь сделать паузу»)",
            "Исключение триггерных слов («укол», «сверлить», «боль», «потерпи»)",
        ],
        clinicalNotesTemplateRu: "Поведение по Франклу: Рейтинг 2 (-) — Негативное. Лечение проводится с отвлечением внимания и пошаговой адаптацией Tell-Show-Do.",
    },
    3: {
        rating: 3,
        code: "frankl_3_positive",
        symbol: "+",
        nameRu: "Рейтинг 3 (+) — Положительное",
        labelRu: "Положительное (+)",
        descriptionRu: "Принятие лечения с осторожностью, выполнение инструкций врача, готовность к сотрудничеству.",
        clinicalSignsRu: "Ребенок спокойно сидит в кресле, выполняет указания врача («открой рот шире»), задает вопросы, контакт продуктивный.",
        badgeColor: "#0284c7",
        badgeBg: "rgba(2, 132, 199, 0.15)",
        badgeBorder: "rgba(2, 132, 199, 0.35)",
        emoji: "🙂",
        managementStrategiesRu: [
            "Прямое словесное поощрение и похвала за сотрудничество",
            "Демонстрация результатов («посмотри в зеркальце на чистый зубик»)",
            "Игровой формат взаимодействия («считаем зубки», «моем микробиков»)",
            "Мотивация небольшим сувениром, наклейкой или грамотой за смелость в конце приема",
        ],
        clinicalNotesTemplateRu: "Поведение по Франклу: Рейтинг 3 (+) — Положительное. Ребенок идет на контакт, аккуратно выполняет инструкции врача.",
    },
    4: {
        rating: 4,
        code: "frankl_4_definitely_positive",
        symbol: "++",
        nameRu: "Рейтинг 4 (++) — Категорически положительное",
        labelRu: "Категорически положительное (++)",
        descriptionRu: "Отличный раппорт, искренний интерес к процедурам и инструментам, улыбка, полное доверие.",
        clinicalSignsRu: "Ребенок с радостью идет на прием, с интересом рассматривает инструменты, активно общается с врачом, лечение проходит комфортно.",
        badgeColor: "#10b981",
        badgeBg: "rgba(16, 185, 129, 0.15)",
        badgeBorder: "rgba(16, 185, 129, 0.35)",
        emoji: "😄",
        managementStrategiesRu: [
            "Полное доверительное партнерство",
            "Обучение навыкам самостоятельной гигиены полости рта на моделях",
            "Закрепление позитивного отношения к регулярным профилактическим осмотрам",
            "Вручение диплома смелого пациента",
        ],
        clinicalNotesTemplateRu: "Поведение по Франклу: Рейтинг 4 (++) — Категорически положительное. Полный контакт, эмоциональный комфорт, высокая мотивация.",
    },
};
export function getFranklDefinition(rating) {
    return FRANKL_SCALE_DEFINITIONS[rating] ?? FRANKL_SCALE_DEFINITIONS[3];
}
// ------------------------------------------------------------------------------------------------
// PEDIATRIC CLINICAL PROCEDURES & POST-OP PARENTAL RECOMMENDATIONS
// ------------------------------------------------------------------------------------------------
export const silveringDrugSchema = z.enum(["Saforide 38%", "Аргенат 30%", "Riva Star SDF"]);
export function calculatePediatricSilveringProtocol(options) {
    const teeth = options.teethNumbers.length > 0 ? options.teethNumbers : [51, 52, 61, 62];
    const drug = options.drug ?? "Аргенат 30%";
    const applications = Math.max(1, Math.min(3, options.applicationsCount ?? 1));
    const indicationsRu = "Очаговая деминерализация эмали и начальный кариес временных зубов, циркулярный кариес фронтальной группы у детей раннего возраста при невозможности препарирования.";
    const protocolDescriptionRu = `Изоляция рабочего поля ватными валиками, очищение зубов (${teeth.join(", ")}), высушивание струей воздуха. Точечная аппликация препарата ${drug} с помощью микробраша в течение 1–2 минут. Удаление излишков препарата ватным тампоном. Создан защитный слой восстановленного серебра с выраженным антисептическим и реминерализующим эффектом.`;
    const parentWarningRu = "ВАЖНО ДЛЯ РОДИТЕЛЕЙ: Обработанные кариозные участки зубов приобретают стойкое темное (черное) окрашивание из-за фиксации ионов серебра. Это свидетельствует о стабилизации кариозного процесса и гибели патогенных бактерий.";
    const parentRecommendationsRu = [
        "Не кормить и не поить ребенка в течение 60 минут после процедуры.",
        "Исключить красящие напитки и продукты (соки, ягоды, чай) в первые 2–3 часа.",
        "Продолжать регулярную домашнюю гигиену: чистить зубы 2 раза в день мягкой щеткой с детской пастой, содержащей фтор 1000 ppm.",
        "Повторный профилактический осмотр и курс повторной аппликации серебра через 4–6 месяцев.",
    ];
    const formattedDiaryEntryRu = [
        `Процедура: Серебрение временных зубов (${drug})`,
        `Зубы: ${teeth.join(", ")} (курс: ${applications}-я аппликация)`,
        `Протокол: ${protocolDescriptionRu}`,
        `Информирование: Родители предупреждены о стойком окрашивании кариозных полостей в темный цвет. Выдана памятка.`,
    ].join("\n");
    return {
        procedureNameRu: `Серебрение временных зубов (${drug})`,
        teethNumbers: teeth,
        drug,
        applicationsCount: applications,
        indicationsRu,
        protocolDescriptionRu,
        parentWarningRu,
        parentRecommendationsRu,
        formattedDiaryEntryRu,
    };
}
export const fissureSealingMethodSchema = z.enum(["non_invasive", "invasive"]);
export const fissureSealantMaterialSchema = z.enum([
    "Clinpro Sealant (3M)",
    "Fissurit FX (VOCO)",
    "Helioseal F (Ivoclar)",
    "Grandio Seal",
]);
export function calculatePediatricFissureSealingProtocol(options) {
    const teeth = options.teethNumbers.length > 0 ? options.teethNumbers : [16, 26, 36, 46];
    const method = options.method ?? "non_invasive";
    const material = options.material ?? "Clinpro Sealant (3M)";
    const methodNameRu = method === "non_invasive"
        ? "Неинвазивная герметизация фиссур"
        : "Инвазивная герметизация фиссур (с микропрепарированием)";
    const prepStep = method === "invasive"
        ? "Микропрепарирование пигментированных фиссур ультратонким алмазным бором. "
        : "";
    const protocolDescriptionRu = `Профессиональная очистка жевательных поверхностей зубов (${teeth.join(", ")}) циркулярной щеточкой с бесфтористой пастой. Изоляция и высушивание. ${prepStep}Травление эмали 37% ортофосфорной кислотой 20–30 секунд, тщательное смывание водой, высушивание до матового оттенка. Внесение светоотверждаемого герметика ${material} в фиссуры и ямки зондом. Фотополимеризация 20 секунд. Проверка окклюзионных контактов артикуляционной бумагой, финишная полировка, локальное фторирование фторлаком.`;
    const parentRecommendationsRu = [
        "Не употреблять жесткую и вязкую пищу (орехи, сухари, ириски, жевательные конфеты) в течение 2 часов.",
        "Поддерживать тщательную гигиену межзубных промежутков и окклюзионных поверхностей.",
        "Плановый контрольный визит через 6 месяцев для проверки сохранности и краевого прилегания силанта.",
    ];
    const formattedDiaryEntryRu = [
        `Процедура: ${methodNameRu}`,
        `Зубы: ${teeth.join(", ")}`,
        `Материал силанта: ${material}`,
        `Протокол: ${protocolDescriptionRu}`,
        `Окклюзия: Окклюзионные контакты выверены копиркой, завышения прикуса нет. Выдана памятка родителям.`,
    ].join("\n");
    return {
        procedureNameRu: methodNameRu,
        teethNumbers: teeth,
        method,
        methodNameRu,
        material,
        protocolDescriptionRu,
        parentRecommendationsRu,
        formattedDiaryEntryRu,
    };
}
export const pulpotomySubBaseMaterialSchema = z.enum([
    "Pulpotec",
    "Biodentine",
    "MTA ProRoot",
    "Formocresol",
]);
export const pulpotomyRestorationSchema = z.enum([
    "composite",
    "glass_ionomer",
    "stainless_steel_crown_ssc",
    "zirconia_crown",
]);
export function calculatePediatricPulpotomyProtocol(options) {
    const tooth = options.toothNumber;
    const subBase = options.subBaseMaterial ?? "Pulpotec";
    const restoration = options.restoration ?? "glass_ionomer";
    const restorationMap = {
        composite: "Реставрация светоотверждаемым композитом",
        glass_ionomer: "Пломбирование стеклоиономерным цементом (СИЦ Vitremer)",
        stainless_steel_crown_ssc: "Стандартная металлическая коронка (SSC 3M/NuSmile)",
        zirconia_crown: "Детская эстетическая циркониевая коронка",
    };
    const restorationNameRu = restorationMap[restoration];
    const protocolDescriptionRu = `Инфильтрационная/проводниковая анестезия. Изоляция рабочего поля. Препарирование кариозной полости зуба ${tooth}, полное раскрытие полости зуба с удалением нависающих краев свода. Ампутация коронковой пульпы острым стерильным экскаватором/шаровидным бором на низкой скорости до устьев корневых каналов. Гемостаз стерильным ватным тампоном с 15.5% сульфатом железа (ViscoStat) в течение 1–2 минут до полной остановки кровотечения. На устья корневых каналов нанесена лечебная паста ${subBase}. Наложена изолирующая прокладка из СИЦ. Выполнено герметичное восстановление зуба: ${restorationNameRu}.`;
    const anesthesiaSafetyWarningRu = "КРИТИЧЕСКИ ВАЖНО: В течение 2–3 часов (до полного окончания анестезии) не оставляйте ребенка без присмотра! Ребенок может сильно прикусить онемевшую губу, щеку или язык, что приведет к обширной травматической язве. Не давайте твердую пищу до восстановления чувствительности.";
    const painManagementRu = "Обезболивание при дискомфорте после окончания анестезии: детская суспензия Ибупрофен (Нурофен) 10 мг/кг или Парацетамол 15 мг/кг каждые 6–8 часов при необходимости.";
    const parentRecommendationsRu = [
        anesthesiaSafetyWarningRu,
        "Исключить прием твердой, горячей и волокнистой пищи в день лечения.",
        painManagementRu,
        "Бережная чистка зубов мягкой щеткой со следующего утра.",
        "При появлении отека, припухлости десны или повышении температуры немедленно связаться с клиникой.",
        "Плановый рентген-контроль зуба через 6–12 месяцев.",
    ];
    const formattedDiaryEntryRu = [
        `Диагноз: Обратимый пульпит временного зуба ${tooth} (K04.0)`,
        `Процедура: Витальная пульпотомия (ампутационный метод)`,
        `Лечебная прокладка: ${subBase}`,
        `Реставрация: ${restorationNameRu}`,
        `Протокол: ${protocolDescriptionRu}`,
        `Рекомендации: Родителям разъяснены риски прикусывания онемевшей губы/щеки, выдана памятка по уходу и обезболиванию.`,
    ].join("\n");
    return {
        procedureNameRu: `Витальная пульпотомия зуба ${tooth} (${subBase})`,
        toothNumber: tooth,
        subBaseMaterial: subBase,
        restoration,
        restorationNameRu,
        protocolDescriptionRu,
        anesthesiaSafetyWarningRu,
        painManagementRu,
        parentRecommendationsRu,
        formattedDiaryEntryRu,
    };
}
export function generatePediatricParentRecommendations(options) {
    const clinic = options?.clinicName ?? "Детское отделение DENTE";
    const doctor = options?.doctorName ?? "Врач-стоматолог детский";
    const patient = options?.patientName ?? "Юный пациент";
    const age = options?.patientAgeYears ?? 7;
    const frankl = options?.franklRating ? getFranklDefinition(options.franklRating) : null;
    const lines = [];
    lines.push(`═══════════════════════════════════════════════════════════════`);
    lines.push(`   ПАМЯТКА ДЛЯ РОДИТЕЛЕЙ ПОСЛЕ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЕМА`);
    lines.push(`   ${clinic}`);
    lines.push(`═══════════════════════════════════════════════════════════════`);
    lines.push(`Пациент: ${patient}, ${age} лет`);
    lines.push(`Лечащий врач: ${doctor}`);
    lines.push(`Дата приема: ${new Date().toLocaleDateString("ru-RU")}`);
    if (frankl) {
        lines.push("");
        lines.push(`Психологическое поведение на приеме (Шкала Франкла):`);
        lines.push(`• ${frankl.nameRu} ${frankl.emoji}`);
        lines.push(`• Оценка: ${frankl.descriptionRu}`);
    }
    // 1. Pulpotomy section
    if (options?.pulpotomy) {
        const pulp = calculatePediatricPulpotomyProtocol(options.pulpotomy);
        lines.push("");
        lines.push(`───────────────────────────────────────────────────────────────`);
        lines.push(`1. ЛЕЧЕНИЕ ПУЛЬПИТА МОЛОЧНОГО ЗУБА #${pulp.toothNumber} (ПУЛЬПОТОМИЯ):`);
        lines.push(`   ${pulp.anesthesiaSafetyWarningRu}`);
        lines.push("");
        lines.push(`   Рекомендации по уходу:`);
        pulp.parentRecommendationsRu.forEach((rec) => {
            lines.push(`   • ${rec}`);
        });
    }
    // 2. Fissure Sealing section
    if (options?.fissureSealing) {
        const fiss = calculatePediatricFissureSealingProtocol(options.fissureSealing);
        lines.push("");
        lines.push(`───────────────────────────────────────────────────────────────`);
        lines.push(`2. ГЕРМЕТИЗАЦИЯ ФИССУР (ЗУБЫ ${fiss.teethNumbers.join(", ")}):`);
        lines.push(`   Проведена защита фиссур материалом ${fiss.material}.`);
        lines.push(`   Рекомендации:`);
        fiss.parentRecommendationsRu.forEach((rec) => {
            lines.push(`   • ${rec}`);
        });
    }
    // 3. Silvering section
    if (options?.silvering) {
        const silv = calculatePediatricSilveringProtocol(options.silvering);
        lines.push("");
        lines.push(`───────────────────────────────────────────────────────────────`);
        lines.push(`3. СЕРЕБРЕНИЕ ВРЕМЕННЫХ ЗУБОВ (${silv.teethNumbers.join(", ")}):`);
        lines.push(`   ${silv.parentWarningRu}`);
        lines.push(`   Рекомендации:`);
        silv.parentRecommendationsRu.forEach((rec) => {
            lines.push(`   • ${rec}`);
        });
    }
    // General advice
    if (options?.generalHygieneAdvice !== false) {
        lines.push("");
        lines.push(`───────────────────────────────────────────────────────────────`);
        lines.push(`ОБЩИЕ ПРАВИЛА ДОМАШНЕЙ ГИГИЕНЫ ДЛЯ РОДИТЕЛЕЙ:`);
        lines.push(`• До 8–9 лет родители ОБЯЗАТЕЛЬНО дочищают зубы ребенку минимум 1 раз в день на ночь.`);
        lines.push(`• Зубная паста должна содержать фториды по возрасту (до 6 лет — 1000 ppm, от 6 лет — 1450 ppm).`);
        lines.push(`• Ограничьте сладкие перекусы, липкие сладости и соки между основными приемами пищи.`);
        lines.push(`• Контрольный осмотр: каждые 3–4 месяца.`);
    }
    if (options?.customNotes) {
        lines.push("");
        lines.push(`Индивидуальные указания врача: ${options.customNotes}`);
    }
    lines.push(`═══════════════════════════════════════════════════════════════`);
    return lines.join("\n");
}
