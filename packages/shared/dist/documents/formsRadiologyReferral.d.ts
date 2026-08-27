import { z } from "zod";
import { type DentalRadiologyStudyType } from "./radiationDoseSheet.js";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * НАПРАВЛЕНИЕ НА РЕНТГЕНОЛОГИЧЕСКОЕ ИССЛЕДОВАНИЕ (КЛКТ / ОПТГ / ТРГ / ВИЗИО)
 * Стандарты лучевой диагностики в стоматологии и ЧЛО
 * СанПиН 2.6.1.1192-03 / Приказ Минздрава РФ № 560н
 * ═══════════════════════════════════════════════════════════════════════════
 */
/** Клиническая цель рентгенологического исследования */
export declare const radiologyReferralGoalSchema: z.ZodEnum<["endodontics", "implantology", "orthodontics", "surgery_extraction", "periodontology", "periapical_cyst", "tmj_dysfunction", "trauma", "pediatric_development", "general_screening"]>;
export type RadiologyReferralGoal = z.infer<typeof radiologyReferralGoalSchema>;
export declare const radiologyReferralGoalLabels: Record<RadiologyReferralGoal, string>;
/** Структурированный Payload направления на рентген-диагностику */
export declare const radiologyReferralPayloadSchema: z.ZodObject<{
    formType: z.ZodDefault<z.ZodLiteral<"radiology_referral">>;
    referralNumber: z.ZodString;
    referralDate: z.ZodString;
    clinicLegalName: z.ZodString;
    clinicAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    patientFullName: z.ZodString;
    patientBirthDate: z.ZodString;
    patientPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    medicalCardNumber: z.ZodString;
    doctorFullName: z.ZodString;
    doctorSpecialty: z.ZodDefault<z.ZodString>;
    diagnosisIcd10Code: z.ZodString;
    diagnosisDetailed: z.ZodString;
    studyType: z.ZodDefault<z.ZodEnum<["intraoral_radiovisiography", "optg_digital_panoramic", "trg_cephalometric_lateral", "trg_cephalometric_frontal", "cbct_segment_5x5", "cbct_jaw_8x8", "cbct_full_maxillofacial_15x15", "film_intraoral_legacy"]>>;
    studyGoal: z.ZodDefault<z.ZodEnum<["endodontics", "implantology", "orthodontics", "surgery_extraction", "periodontology", "periapical_cyst", "tmj_dysfunction", "trauma", "pediatric_development", "general_screening"]>>;
    targetTeethFdi: z.ZodDefault<z.ZodString>;
    anatomicalArea: z.ZodDefault<z.ZodString>;
    clinicalJustification: z.ZodDefault<z.ZodString>;
    hasMetallicArtifacts: z.ZodDefault<z.ZodBoolean>;
    isPregnancyExcluded: z.ZodDefault<z.ZodBoolean>;
    specialInstructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    patientFullName: string;
    doctorFullName: string;
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    doctorSpecialty: string;
    studyType: "intraoral_radiovisiography" | "optg_digital_panoramic" | "trg_cephalometric_lateral" | "trg_cephalometric_frontal" | "cbct_segment_5x5" | "cbct_jaw_8x8" | "cbct_full_maxillofacial_15x15" | "film_intraoral_legacy";
    anatomicalArea: string;
    diagnosisIcd10Code: string;
    formType: "radiology_referral";
    referralNumber: string;
    referralDate: string;
    diagnosisDetailed: string;
    studyGoal: "endodontics" | "implantology" | "orthodontics" | "surgery_extraction" | "periodontology" | "periapical_cyst" | "tmj_dysfunction" | "trauma" | "pediatric_development" | "general_screening";
    targetTeethFdi: string;
    clinicalJustification: string;
    hasMetallicArtifacts: boolean;
    isPregnancyExcluded: boolean;
    clinicAddress?: string | null | undefined;
    patientPhone?: string | null | undefined;
    clinicPhone?: string | null | undefined;
    specialInstructions?: string | null | undefined;
}, {
    patientFullName: string;
    doctorFullName: string;
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    diagnosisIcd10Code: string;
    referralNumber: string;
    referralDate: string;
    diagnosisDetailed: string;
    clinicAddress?: string | null | undefined;
    patientPhone?: string | null | undefined;
    doctorSpecialty?: string | undefined;
    studyType?: "intraoral_radiovisiography" | "optg_digital_panoramic" | "trg_cephalometric_lateral" | "trg_cephalometric_frontal" | "cbct_segment_5x5" | "cbct_jaw_8x8" | "cbct_full_maxillofacial_15x15" | "film_intraoral_legacy" | undefined;
    anatomicalArea?: string | undefined;
    clinicPhone?: string | null | undefined;
    formType?: "radiology_referral" | undefined;
    studyGoal?: "endodontics" | "implantology" | "orthodontics" | "surgery_extraction" | "periodontology" | "periapical_cyst" | "tmj_dysfunction" | "trauma" | "pediatric_development" | "general_screening" | undefined;
    targetTeethFdi?: string | undefined;
    clinicalJustification?: string | undefined;
    hasMetallicArtifacts?: boolean | undefined;
    isPregnancyExcluded?: boolean | undefined;
    specialInstructions?: string | null | undefined;
}>;
export type RadiologyReferralPayload = z.infer<typeof radiologyReferralPayloadSchema>;
/**
 * Автоматическая генерация направления на КЛКТ/ОПТГ из данных SOAP-дневника визита.
 */
export declare function generateRadiologyReferralPayloadFromSoap(options: {
    readonly clinic: {
        readonly fullName: string;
        readonly address?: string | null;
        readonly phone?: string | null;
    };
    readonly patient: {
        readonly fullName: string;
        readonly birthDate: string;
        readonly phone?: string | null;
        readonly medicalCardNumber: string;
    };
    readonly doctor: {
        readonly fullName: string;
        readonly specialty?: string | null;
    };
    readonly diagnosisIcd10?: string | null;
    readonly diagnosisTooth?: string | null;
    readonly statusLocalis?: string | null;
    readonly studyType?: DentalRadiologyStudyType;
    readonly studyGoal?: RadiologyReferralGoal;
    readonly customReferralNumber?: string;
}): RadiologyReferralPayload;
