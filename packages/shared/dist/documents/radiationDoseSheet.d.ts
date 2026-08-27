import { z } from "zod";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА ПРИ РЕНТГЕНОЛОГИЧЕСКИХ ИССЛЕДОВАНИЯХ
 * СанПиН 2.6.1.1192-03 / СанПиН 2.6.1.2523-09 (НРБ-99/2009)
 * ═══════════════════════════════════════════════════════════════════════════
 */
/** Тип дентального рентгенологического исследования */
export declare const dentalRadiologyStudyTypeSchema: z.ZodEnum<["intraoral_radiovisiography", "optg_digital_panoramic", "trg_cephalometric_lateral", "trg_cephalometric_frontal", "cbct_segment_5x5", "cbct_jaw_8x8", "cbct_full_maxillofacial_15x15", "film_intraoral_legacy"]>;
export type DentalRadiologyStudyType = z.infer<typeof dentalRadiologyStudyTypeSchema>;
export declare const dentalRadiologyStudyLabels: Record<DentalRadiologyStudyType, string>;
/** Типовые ориентировочные эффективные дозы по СанПиН */
export declare const DEFAULT_EFFECTIVE_DOSES_MSV: Record<DentalRadiologyStudyType, number>;
/** Запись о проведенном исследовании в листе радиационного контроля */
export declare const radiationExposureEntrySchema: z.ZodObject<{
    id: z.ZodDefault<z.ZodString>;
    studyDate: z.ZodString;
    studyType: z.ZodDefault<z.ZodEnum<["intraoral_radiovisiography", "optg_digital_panoramic", "trg_cephalometric_lateral", "trg_cephalometric_frontal", "cbct_segment_5x5", "cbct_jaw_8x8", "cbct_full_maxillofacial_15x15", "film_intraoral_legacy"]>>;
    anatomicalArea: z.ZodString;
    apparatusModel: z.ZodDefault<z.ZodString>;
    tubeVoltageKv: z.ZodDefault<z.ZodNumber>;
    tubeCurrentMa: z.ZodDefault<z.ZodNumber>;
    exposureTimeSeconds: z.ZodDefault<z.ZodNumber>;
    effectiveDoseMsv: z.ZodNumber;
    effectiveDoseMicrosieverts: z.ZodNumber;
    radiologistFullName: z.ZodString;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    studyDate: string;
    studyType: "intraoral_radiovisiography" | "optg_digital_panoramic" | "trg_cephalometric_lateral" | "trg_cephalometric_frontal" | "cbct_segment_5x5" | "cbct_jaw_8x8" | "cbct_full_maxillofacial_15x15" | "film_intraoral_legacy";
    anatomicalArea: string;
    apparatusModel: string;
    tubeVoltageKv: number;
    tubeCurrentMa: number;
    exposureTimeSeconds: number;
    effectiveDoseMsv: number;
    effectiveDoseMicrosieverts: number;
    radiologistFullName: string;
    notes?: string | null | undefined;
}, {
    studyDate: string;
    anatomicalArea: string;
    effectiveDoseMsv: number;
    effectiveDoseMicrosieverts: number;
    radiologistFullName: string;
    id?: string | undefined;
    notes?: string | null | undefined;
    studyType?: "intraoral_radiovisiography" | "optg_digital_panoramic" | "trg_cephalometric_lateral" | "trg_cephalometric_frontal" | "cbct_segment_5x5" | "cbct_jaw_8x8" | "cbct_full_maxillofacial_15x15" | "film_intraoral_legacy" | undefined;
    apparatusModel?: string | undefined;
    tubeVoltageKv?: number | undefined;
    tubeCurrentMa?: number | undefined;
    exposureTimeSeconds?: number | undefined;
}>;
export type RadiationExposureEntry = z.infer<typeof radiationExposureEntrySchema>;
export type PatientRadiationExposureRecord = any;
export declare const STANDARD_DENTAL_RADIATION_DOSES: Record<string, number>;
/** Калькулятор суммарной годовой дозы и уровня безопасности */
export interface RadiationSafetyAssessment {
    totalDoseMsv: number;
    totalDoseMicrosv: number;
    totalDoseYearMsv: number;
    totalDoseYearMicrosieverts: number;
    safetyZone: "green_optimal" | "yellow_moderate" | "red_warning";
    safetyZoneLabel: string;
    safetyRecommendation: string;
    interpretation: string;
    studiesCount: number;
    sanpinLimitMsv: number;
    percentageOfSanpinLimit: number;
    hasExceededLimit: boolean;
    riskCategory: "safe" | "moderate" | "danger";
}
export declare function calculateAnnualRadiationDose(entries: readonly any[], calendarYear?: number): RadiationSafetyAssessment;
/** Полный структурированный Payload Листа дозовых нагрузок */
export declare const radiationDoseSheetPayloadSchema: z.ZodObject<{
    formNumber: z.ZodLiteral<"Лист дозовых нагрузок">;
    clinicLegalName: z.ZodString;
    clinicAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicOgrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicLicenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    patientFullName: z.ZodString;
    patientBirthDate: z.ZodString;
    patientSex: z.ZodDefault<z.ZodEnum<["male", "female"]>>;
    medicalCardNumber: z.ZodString;
    reportingYear: z.ZodDefault<z.ZodNumber>;
    exposureEntries: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodDefault<z.ZodString>;
        studyDate: z.ZodString;
        studyType: z.ZodDefault<z.ZodEnum<["intraoral_radiovisiography", "optg_digital_panoramic", "trg_cephalometric_lateral", "trg_cephalometric_frontal", "cbct_segment_5x5", "cbct_jaw_8x8", "cbct_full_maxillofacial_15x15", "film_intraoral_legacy"]>>;
        anatomicalArea: z.ZodString;
        apparatusModel: z.ZodDefault<z.ZodString>;
        tubeVoltageKv: z.ZodDefault<z.ZodNumber>;
        tubeCurrentMa: z.ZodDefault<z.ZodNumber>;
        exposureTimeSeconds: z.ZodDefault<z.ZodNumber>;
        effectiveDoseMsv: z.ZodNumber;
        effectiveDoseMicrosieverts: z.ZodNumber;
        radiologistFullName: z.ZodString;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        studyDate: string;
        studyType: "intraoral_radiovisiography" | "optg_digital_panoramic" | "trg_cephalometric_lateral" | "trg_cephalometric_frontal" | "cbct_segment_5x5" | "cbct_jaw_8x8" | "cbct_full_maxillofacial_15x15" | "film_intraoral_legacy";
        anatomicalArea: string;
        apparatusModel: string;
        tubeVoltageKv: number;
        tubeCurrentMa: number;
        exposureTimeSeconds: number;
        effectiveDoseMsv: number;
        effectiveDoseMicrosieverts: number;
        radiologistFullName: string;
        notes?: string | null | undefined;
    }, {
        studyDate: string;
        anatomicalArea: string;
        effectiveDoseMsv: number;
        effectiveDoseMicrosieverts: number;
        radiologistFullName: string;
        id?: string | undefined;
        notes?: string | null | undefined;
        studyType?: "intraoral_radiovisiography" | "optg_digital_panoramic" | "trg_cephalometric_lateral" | "trg_cephalometric_frontal" | "cbct_segment_5x5" | "cbct_jaw_8x8" | "cbct_full_maxillofacial_15x15" | "film_intraoral_legacy" | undefined;
        apparatusModel?: string | undefined;
        tubeVoltageKv?: number | undefined;
        tubeCurrentMa?: number | undefined;
        exposureTimeSeconds?: number | undefined;
    }>, "many">>;
    annualSummary: z.ZodDefault<z.ZodObject<{
        totalDoseYearMsv: z.ZodDefault<z.ZodNumber>;
        totalDoseYearMicrosieverts: z.ZodDefault<z.ZodNumber>;
        safetyZone: z.ZodDefault<z.ZodEnum<["green_optimal", "yellow_moderate", "red_warning"]>>;
        safetyZoneLabel: z.ZodDefault<z.ZodString>;
        safetyRecommendation: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        safetyZone: "green_optimal" | "yellow_moderate" | "red_warning";
        totalDoseYearMsv: number;
        totalDoseYearMicrosieverts: number;
        safetyZoneLabel: string;
        safetyRecommendation: string;
    }, {
        safetyZone?: "green_optimal" | "yellow_moderate" | "red_warning" | undefined;
        totalDoseYearMsv?: number | undefined;
        totalDoseYearMicrosieverts?: number | undefined;
        safetyZoneLabel?: string | undefined;
        safetyRecommendation?: string | undefined;
    }>>;
    responsibleOfficerFullName: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    patientFullName: string;
    formNumber: "Лист дозовых нагрузок";
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    patientSex: "male" | "female";
    reportingYear: number;
    exposureEntries: {
        id: string;
        studyDate: string;
        studyType: "intraoral_radiovisiography" | "optg_digital_panoramic" | "trg_cephalometric_lateral" | "trg_cephalometric_frontal" | "cbct_segment_5x5" | "cbct_jaw_8x8" | "cbct_full_maxillofacial_15x15" | "film_intraoral_legacy";
        anatomicalArea: string;
        apparatusModel: string;
        tubeVoltageKv: number;
        tubeCurrentMa: number;
        exposureTimeSeconds: number;
        effectiveDoseMsv: number;
        effectiveDoseMicrosieverts: number;
        radiologistFullName: string;
        notes?: string | null | undefined;
    }[];
    annualSummary: {
        safetyZone: "green_optimal" | "yellow_moderate" | "red_warning";
        totalDoseYearMsv: number;
        totalDoseYearMicrosieverts: number;
        safetyZoneLabel: string;
        safetyRecommendation: string;
    };
    responsibleOfficerFullName: string;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicLicenseNumber?: string | null | undefined;
}, {
    patientFullName: string;
    formNumber: "Лист дозовых нагрузок";
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicLicenseNumber?: string | null | undefined;
    patientSex?: "male" | "female" | undefined;
    reportingYear?: number | undefined;
    exposureEntries?: {
        studyDate: string;
        anatomicalArea: string;
        effectiveDoseMsv: number;
        effectiveDoseMicrosieverts: number;
        radiologistFullName: string;
        id?: string | undefined;
        notes?: string | null | undefined;
        studyType?: "intraoral_radiovisiography" | "optg_digital_panoramic" | "trg_cephalometric_lateral" | "trg_cephalometric_frontal" | "cbct_segment_5x5" | "cbct_jaw_8x8" | "cbct_full_maxillofacial_15x15" | "film_intraoral_legacy" | undefined;
        apparatusModel?: string | undefined;
        tubeVoltageKv?: number | undefined;
        tubeCurrentMa?: number | undefined;
        exposureTimeSeconds?: number | undefined;
    }[] | undefined;
    annualSummary?: {
        safetyZone?: "green_optimal" | "yellow_moderate" | "red_warning" | undefined;
        totalDoseYearMsv?: number | undefined;
        totalDoseYearMicrosieverts?: number | undefined;
        safetyZoneLabel?: string | undefined;
        safetyRecommendation?: string | undefined;
    } | undefined;
    responsibleOfficerFullName?: string | undefined;
}>;
export type RadiationDoseSheetPayload = z.infer<typeof radiationDoseSheetPayloadSchema>;
