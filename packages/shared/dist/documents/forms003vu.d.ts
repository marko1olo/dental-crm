import { z } from "zod";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА № 003-В/у — ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ АМБУЛАТОРНОГО СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО
 * Приказ Минздрава РФ / Порядок выдачи медицинских выписок
 * ═══════════════════════════════════════════════════════════════════════════
 */
/** Хронологическая запись проведенного этапа лечения для выписки */
export declare const medicalExtractTreatmentStageSchema: z.ZodObject<{
    treatmentDate: z.ZodString;
    toothOrAnatomicalArea: z.ZodString;
    diagnosisIcd10: z.ZodString;
    diagnosisText: z.ZodString;
    performedIntervention: z.ZodString;
    anesthesiaUsed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    attendingDoctorFullName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    diagnosisIcd10: string;
    attendingDoctorFullName: string;
    diagnosisText: string;
    treatmentDate: string;
    toothOrAnatomicalArea: string;
    performedIntervention: string;
    anesthesiaUsed?: string | null | undefined;
}, {
    diagnosisIcd10: string;
    attendingDoctorFullName: string;
    diagnosisText: string;
    treatmentDate: string;
    toothOrAnatomicalArea: string;
    performedIntervention: string;
    anesthesiaUsed?: string | null | undefined;
}>;
export type MedicalExtractTreatmentStage = z.infer<typeof medicalExtractTreatmentStageSchema>;
/** Полный структурированный Payload формы № 003-В/у (Выписка) */
export declare const medicalCardExtract003vuPayloadSchema: z.ZodObject<{
    formNumber: z.ZodLiteral<"003-В/у">;
    clinicLegalName: z.ZodString;
    clinicAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicOgrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicInn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicLicenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicLicenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicLicenseIssuer: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    extractRegistrationNumber: z.ZodString;
    extractIssueDate: z.ZodString;
    extractDestinationInstitution: z.ZodDefault<z.ZodString>;
    medicalCardNumber: z.ZodString;
    patientFullName: z.ZodString;
    patientBirthDate: z.ZodString;
    patientSex: z.ZodDefault<z.ZodEnum<["male", "female"]>>;
    patientAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    patientPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    treatmentPeriodStartDate: z.ZodString;
    treatmentPeriodEndDate: z.ZodString;
    primaryDiagnosisText: z.ZodString;
    primaryDiagnosisIcd10: z.ZodString;
    concomitantDiagnosisText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    concomitantDiagnosisIcd10: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    briefAnamnesisAndClinicalCourse: z.ZodString;
    diagnosticStudiesSummary: z.ZodDefault<z.ZodString>;
    treatmentStagesTimeline: z.ZodDefault<z.ZodArray<z.ZodObject<{
        treatmentDate: z.ZodString;
        toothOrAnatomicalArea: z.ZodString;
        diagnosisIcd10: z.ZodString;
        diagnosisText: z.ZodString;
        performedIntervention: z.ZodString;
        anesthesiaUsed: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        attendingDoctorFullName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        diagnosisIcd10: string;
        attendingDoctorFullName: string;
        diagnosisText: string;
        treatmentDate: string;
        toothOrAnatomicalArea: string;
        performedIntervention: string;
        anesthesiaUsed?: string | null | undefined;
    }, {
        diagnosisIcd10: string;
        attendingDoctorFullName: string;
        diagnosisText: string;
        treatmentDate: string;
        toothOrAnatomicalArea: string;
        performedIntervention: string;
        anesthesiaUsed?: string | null | undefined;
    }>, "many">>;
    conditionAtDischarge: z.ZodDefault<z.ZodString>;
    followUpRecommendations: z.ZodDefault<z.ZodString>;
    warrantyConditions: z.ZodDefault<z.ZodString>;
    attendingDoctorFullName: z.ZodString;
    attendingDoctorSpecialty: z.ZodDefault<z.ZodString>;
    headOfDepartmentFullName: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    patientFullName: string;
    formNumber: "003-В/у";
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    patientSex: "male" | "female";
    attendingDoctorFullName: string;
    attendingDoctorSpecialty: string;
    extractRegistrationNumber: string;
    extractIssueDate: string;
    extractDestinationInstitution: string;
    treatmentPeriodStartDate: string;
    treatmentPeriodEndDate: string;
    primaryDiagnosisText: string;
    primaryDiagnosisIcd10: string;
    briefAnamnesisAndClinicalCourse: string;
    diagnosticStudiesSummary: string;
    treatmentStagesTimeline: {
        diagnosisIcd10: string;
        attendingDoctorFullName: string;
        diagnosisText: string;
        treatmentDate: string;
        toothOrAnatomicalArea: string;
        performedIntervention: string;
        anesthesiaUsed?: string | null | undefined;
    }[];
    conditionAtDischarge: string;
    followUpRecommendations: string;
    warrantyConditions: string;
    headOfDepartmentFullName: string;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    clinicLicenseNumber?: string | null | undefined;
    clinicLicenseDate?: string | null | undefined;
    clinicLicenseIssuer?: string | null | undefined;
    patientPhone?: string | null | undefined;
    patientAddress?: string | null | undefined;
    concomitantDiagnosisText?: string | null | undefined;
    concomitantDiagnosisIcd10?: string | null | undefined;
}, {
    patientFullName: string;
    formNumber: "003-В/у";
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    attendingDoctorFullName: string;
    extractRegistrationNumber: string;
    extractIssueDate: string;
    treatmentPeriodStartDate: string;
    treatmentPeriodEndDate: string;
    primaryDiagnosisText: string;
    primaryDiagnosisIcd10: string;
    briefAnamnesisAndClinicalCourse: string;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    clinicLicenseNumber?: string | null | undefined;
    clinicLicenseDate?: string | null | undefined;
    clinicLicenseIssuer?: string | null | undefined;
    patientSex?: "male" | "female" | undefined;
    patientPhone?: string | null | undefined;
    attendingDoctorSpecialty?: string | undefined;
    patientAddress?: string | null | undefined;
    extractDestinationInstitution?: string | undefined;
    concomitantDiagnosisText?: string | null | undefined;
    concomitantDiagnosisIcd10?: string | null | undefined;
    diagnosticStudiesSummary?: string | undefined;
    treatmentStagesTimeline?: {
        diagnosisIcd10: string;
        attendingDoctorFullName: string;
        diagnosisText: string;
        treatmentDate: string;
        toothOrAnatomicalArea: string;
        performedIntervention: string;
        anesthesiaUsed?: string | null | undefined;
    }[] | undefined;
    conditionAtDischarge?: string | undefined;
    followUpRecommendations?: string | undefined;
    warrantyConditions?: string | undefined;
    headOfDepartmentFullName?: string | undefined;
}>;
export type MedicalCardExtract003vuPayload = z.infer<typeof medicalCardExtract003vuPayloadSchema>;
