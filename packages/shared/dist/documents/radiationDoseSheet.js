import { z } from "zod";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА ПРИ РЕНТГЕНОЛОГИЧЕСКИХ ИССЛЕДОВАНИЯХ
 * СанПиН 2.6.1.1192-03 / СанПиН 2.6.1.2523-09 (НРБ-99/2009)
 * ═══════════════════════════════════════════════════════════════════════════
 */
/** Тип дентального рентгенологического исследования */
export const dentalRadiologyStudyTypeSchema = z.enum([
    "intraoral_radiovisiography", // Прицельная радиовизиография (1 зуб / сегмент) — 0.001 - 0.005 мЗв (1-5 мкЗв)
    "optg_digital_panoramic", // Цифровая ортопантомограмма (ОПТГ) — 0.010 - 0.025 мЗв (10-25 мкЗв)
    "trg_cephalometric_lateral", // Телерентгенограмма (ТРГ в боковой проекции) — 0.005 - 0.015 мЗв (5-15 мкЗв)
    "trg_cephalometric_frontal", // Телерентгенограмма (ТРГ в прямой проекции) — 0.005 - 0.015 мЗв (5-15 мкЗв)
    "cbct_segment_5x5", // КЛКТ сегмента зубного ряда (FOV 5x5 см) — 0.020 - 0.040 мЗв (20-40 мкЗв)
    "cbct_jaw_8x8", // КЛКТ одной/обеих челюстей (FOV 8x8 см) — 0.045 - 0.075 мЗв (45-75 мкЗв)
    "cbct_full_maxillofacial_15x15", // КЛКТ челюстно-лицевой области и ВНЧС (FOV 12x8, 15x15 см) — 0.080 - 0.140 мЗв (80-140 мкЗв)
    "film_intraoral_legacy", // Пленочная внутриротовая рентгенография — 0.010 - 0.030 мЗв (10-30 мкЗв)
]);
export const dentalRadiologyStudyLabels = {
    intraoral_radiovisiography: "Прицельная радиовизиография (цифровая)",
    optg_digital_panoramic: "Ортопантомограмма (цифровая ОПТГ)",
    trg_cephalometric_lateral: "Телерентгенограмма ТРГ (боковая проекция)",
    trg_cephalometric_frontal: "Телерентгенограмма ТРГ (прямая проекция)",
    cbct_segment_5x5: "КЛКТ сегмента зубного ряда (FOV 5x5 см)",
    cbct_jaw_8x8: "КЛКТ челюстей (FOV 8x8 см)",
    cbct_full_maxillofacial_15x15: "КЛКТ челюстно-лицевой области (FOV 15x15 см)",
    film_intraoral_legacy: "Пленочная прицельная рентгенограмма",
};
/** Типовые ориентировочные эффективные дозы по СанПиН */
export const DEFAULT_EFFECTIVE_DOSES_MSV = {
    intraoral_radiovisiography: 0.003, // 3 мкЗв
    optg_digital_panoramic: 0.018, // 18 мкЗв
    trg_cephalometric_lateral: 0.010, // 10 мкЗв
    trg_cephalometric_frontal: 0.010, // 10 мкЗв
    cbct_segment_5x5: 0.030, // 30 мкЗв
    cbct_jaw_8x8: 0.055, // 55 мкЗв
    cbct_full_maxillofacial_15x15: 0.095, // 95 мкЗв
    film_intraoral_legacy: 0.015, // 15 мкЗв
};
/** Запись о проведенном исследовании в листе радиационного контроля */
export const radiationExposureEntrySchema = z.object({
    id: z.string().uuid().default(() => "00000000-0000-0000-0000-000000000000"),
    studyDate: z.string().trim().min(10).max(32),
    studyType: dentalRadiologyStudyTypeSchema.default("intraoral_radiovisiography"),
    anatomicalArea: z.string().trim().min(1).max(120), // Например "Зуб 36", "Сегмент 2.4-2.7", "Верхняя и нижняя челюсти"
    apparatusModel: z.string().trim().max(120).default("Дентальный цифровой аппарат"),
    tubeVoltageKv: z.number().min(40).max(120).default(65), // Напряжение на трубке (кВ)
    tubeCurrentMa: z.number().min(1).max(20).default(7), // Ток трубки (мА)
    exposureTimeSeconds: z.number().min(0.01).max(30).default(0.12), // Время экспозиции (сек)
    effectiveDoseMsv: z.number().min(0.0001).max(5.0), // Эффективная эквивалентная доза в миллизивертах (мЗв)
    effectiveDoseMicrosieverts: z.number().min(0.1).max(5000.0), // в микрозивертах (мкЗв = мЗв * 1000)
    radiologistFullName: z.string().trim().min(1).max(160),
    notes: z.string().trim().max(500).nullable().optional(),
});
export const STANDARD_DENTAL_RADIATION_DOSES = DEFAULT_EFFECTIVE_DOSES_MSV;
export function calculateAnnualRadiationDose(entries, calendarYear = new Date().getFullYear()) {
    let sumMsv = 0;
    let countInYear = 0;
    for (const e of entries) {
        const entryYear = e.studyDate ? Number.parseInt(String(e.studyDate).slice(0, 4), 10) : calendarYear;
        if (Number.isNaN(entryYear) || entryYear === calendarYear) {
            sumMsv += Number(e.effectiveDoseMsv ?? 0);
            countInYear += 1;
        }
    }
    const totalMsv = Number(sumMsv.toFixed(4));
    const totalMksv = Number((totalMsv * 1000).toFixed(1));
    let safetyZone = "green_optimal";
    let safetyZoneLabel = "Зеленая зона (< 0.5 мЗв/год) — Оптимальный безопасный уровень.";
    let safetyRecommendation = "Накопленная лучевая нагрузка находится в пределах фоновых нормативных значений СанПиН.";
    let riskCategory = "safe";
    if (totalMsv >= 1.0) {
        safetyZone = "red_warning";
        riskCategory = "moderate"; // moderate risk of exceeding standard preventive diagnostic limit
        safetyZoneLabel = "Красная зона (≥ 1.0 мЗв/год) — Достигнут рекомендуемый годовой диагностический порог.";
        safetyRecommendation = "Внимание: годовая эффективная доза превысила 1.0 мЗв (СанПиН 2.6.1.2523-09 НРБ-99/2009). Все последующие исследования требуют строгого клинического консилиума и альтернативных методов контроля.";
    }
    else if (totalMsv >= 0.5) {
        safetyZone = "yellow_moderate";
        riskCategory = "moderate";
        safetyZoneLabel = "Желтая зона (0.5 – 1.0 мЗв/год) — Умеренная дозовая нагрузка.";
        safetyRecommendation = "Нагрузка допустима. Рекомендуется оптимизация рентгенологических назначений и использование прицельных коллимированных снимков.";
    }
    const sanpinLimit = 1.0;
    const pctOfLimit = Number(((totalMsv / sanpinLimit) * 100).toFixed(1));
    const hasExceeded = totalMsv >= sanpinLimit;
    return {
        totalDoseMsv: totalMsv,
        totalDoseMicrosv: totalMksv,
        totalDoseYearMsv: totalMsv,
        totalDoseYearMicrosieverts: totalMksv,
        safetyZone,
        safetyZoneLabel,
        safetyRecommendation,
        interpretation: safetyZoneLabel,
        studiesCount: countInYear,
        sanpinLimitMsv: sanpinLimit,
        percentageOfSanpinLimit: pctOfLimit,
        hasExceededLimit: hasExceeded,
        riskCategory,
    };
}
/** Полный структурированный Payload Листа дозовых нагрузок */
export const radiationDoseSheetPayloadSchema = z.object({
    formNumber: z.literal("Лист дозовых нагрузок"),
    clinicLegalName: z.string().trim().min(1).max(240),
    clinicAddress: z.string().trim().max(240).nullable().optional(),
    clinicOgrn: z.string().trim().max(32).nullable().optional(),
    clinicLicenseNumber: z.string().trim().max(64).nullable().optional(),
    // Пациент
    patientFullName: z.string().trim().min(1).max(160),
    patientBirthDate: z.string().trim().min(10).max(32),
    patientSex: z.enum(["male", "female"]).default("male"),
    medicalCardNumber: z.string().trim().min(1).max(64),
    reportingYear: z.number().int().min(2020).max(2050).default(new Date().getFullYear()),
    // Таблица проведенных облучений
    exposureEntries: z.array(radiationExposureEntrySchema).default([]),
    // Итоговые показатели за год
    annualSummary: z.object({
        totalDoseYearMsv: z.number().min(0).default(0),
        totalDoseYearMicrosieverts: z.number().min(0).default(0),
        safetyZone: z.enum(["green_optimal", "yellow_moderate", "red_warning"]).default("green_optimal"),
        safetyZoneLabel: z.string().trim().default("Зеленая зона (< 0.5 мЗв/год) — Оптимальный безопасный уровень."),
        safetyRecommendation: z.string().trim().default("Накопленная дозовая нагрузка в пределах нормы."),
    }).default({
        totalDoseYearMsv: 0,
        totalDoseYearMicrosieverts: 0,
        safetyZone: "green_optimal",
        safetyZoneLabel: "Зеленая зона (< 0.5 мЗв/год) — Оптимальный безопасный уровень.",
        safetyRecommendation: "Накопленная дозовая нагрузка в пределах нормы.",
    }),
    responsibleOfficerFullName: z.string().trim().min(1).max(160).default("Врач-рентгенолог / Ответственный за РБ"),
});
