import { z } from "zod";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА № 037/у-88 — ЛИСТОК ЕЖЕДНЕВНОГО УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА
 * Приказ Минздрава СССР № 50-88 / Приказ Минздрава РФ № 804н
 * ═══════════════════════════════════════════════════════════════════════════
 */
/** Запись о принятом пациенте в листке ежедневного учета (строка таблицы 037/у) */
export declare const dailyPatientRecord037uSchema: z.ZodObject<{
    sequenceNumber: z.ZodNumber;
    patientFullName: z.ZodString;
    patientAge: z.ZodNumber;
    patientCategory: z.ZodDefault<z.ZodEnum<["adult", "child_under_14", "adolescent_15_17"]>>;
    medicalCardNumber: z.ZodString;
    patientAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isPrimaryVisit: z.ZodDefault<z.ZodBoolean>;
    isSanatedInVisit: z.ZodDefault<z.ZodBoolean>;
    diagnosisIcd10: z.ZodString;
    diagnosisText: z.ZodString;
    performedProceduresSummary: z.ZodString;
    uetCaries: z.ZodDefault<z.ZodNumber>;
    uetPulpitisPeriodontitis: z.ZodDefault<z.ZodNumber>;
    uetSurgeryExtractions: z.ZodDefault<z.ZodNumber>;
    uetHygienePeriodontology: z.ZodDefault<z.ZodNumber>;
    uetProstheticsOrthodontics: z.ZodDefault<z.ZodNumber>;
    uetAnesthesia: z.ZodDefault<z.ZodNumber>;
    totalUetForVisit: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    patientFullName: string;
    diagnosisIcd10: string;
    medicalCardNumber: string;
    sequenceNumber: number;
    patientAge: number;
    patientCategory: "adult" | "child_under_14" | "adolescent_15_17";
    isPrimaryVisit: boolean;
    isSanatedInVisit: boolean;
    diagnosisText: string;
    performedProceduresSummary: string;
    uetCaries: number;
    uetPulpitisPeriodontitis: number;
    uetSurgeryExtractions: number;
    uetHygienePeriodontology: number;
    uetProstheticsOrthodontics: number;
    uetAnesthesia: number;
    totalUetForVisit: number;
    patientAddress?: string | null | undefined;
}, {
    patientFullName: string;
    diagnosisIcd10: string;
    medicalCardNumber: string;
    sequenceNumber: number;
    patientAge: number;
    diagnosisText: string;
    performedProceduresSummary: string;
    totalUetForVisit: number;
    patientAddress?: string | null | undefined;
    patientCategory?: "adult" | "child_under_14" | "adolescent_15_17" | undefined;
    isPrimaryVisit?: boolean | undefined;
    isSanatedInVisit?: boolean | undefined;
    uetCaries?: number | undefined;
    uetPulpitisPeriodontitis?: number | undefined;
    uetSurgeryExtractions?: number | undefined;
    uetHygienePeriodontology?: number | undefined;
    uetProstheticsOrthodontics?: number | undefined;
    uetAnesthesia?: number | undefined;
}>;
export type DailyPatientRecord037u = z.infer<typeof dailyPatientRecord037uSchema>;
/** Сводные итоги за рабочий день / смену (подвал формы 037/у) */
export declare const dailySummaryTotals037uSchema: z.ZodObject<{
    totalPatientsCount: z.ZodNumber;
    totalAdultsCount: z.ZodNumber;
    totalChildrenUnder14Count: z.ZodNumber;
    totalAdolescents15_17Count: z.ZodNumber;
    totalPrimaryVisitsCount: z.ZodNumber;
    totalRepeatVisitsCount: z.ZodNumber;
    totalSanatedCount: z.ZodNumber;
    totalUetAccumulated: z.ZodNumber;
    shiftStandardQuotaUet: z.ZodDefault<z.ZodNumber>;
    planExecutionPercentage: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    totalPatientsCount: number;
    totalAdultsCount: number;
    totalChildrenUnder14Count: number;
    totalAdolescents15_17Count: number;
    totalPrimaryVisitsCount: number;
    totalRepeatVisitsCount: number;
    totalSanatedCount: number;
    totalUetAccumulated: number;
    shiftStandardQuotaUet: number;
    planExecutionPercentage: number;
}, {
    totalPatientsCount: number;
    totalAdultsCount: number;
    totalChildrenUnder14Count: number;
    totalAdolescents15_17Count: number;
    totalPrimaryVisitsCount: number;
    totalRepeatVisitsCount: number;
    totalSanatedCount: number;
    totalUetAccumulated: number;
    shiftStandardQuotaUet?: number | undefined;
    planExecutionPercentage?: number | undefined;
}>;
export type DailySummaryTotals037u = z.infer<typeof dailySummaryTotals037uSchema>;
/** Калькулятор сводных показателей дня для формы 037/у */
export declare function calculateDaily037uTotals(records: readonly any[], standardShiftQuota?: number): DailySummaryTotals037u & {
    totalPatientsSeen: number;
    adultsCount: number;
    childrenUnder18Count: number;
    ruralResidentsCount: number;
    primaryVisitsCount: number;
    repeatVisitsCount: number;
    sanatedPatientsCount: number;
    totalFillingsPlaced: number;
    totalTeethExtracted: number;
    uetTotals: {
        therapeuticUet: number;
        surgicalUet: number;
        orthopedicUet: number;
        orthodonticUet: number;
        childrenUet: number;
        totalUet: number;
    };
};
/** Полный структурированный Payload формы № 037/у-88 */
export declare const dailyDentistDiary037uPayloadSchema: z.ZodObject<{
    formNumber: z.ZodLiteral<"037/у-88">;
    clinicLegalName: z.ZodString;
    clinicDepartment: z.ZodDefault<z.ZodString>;
    doctorFullName: z.ZodString;
    doctorSpecialty: z.ZodDefault<z.ZodString>;
    shiftDate: z.ZodString;
    shiftNumber: z.ZodDefault<z.ZodEnum<["shift_1_morning", "shift_2_evening", "full_day"]>>;
    shiftWorkingHours: z.ZodDefault<z.ZodString>;
    patientRecords: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sequenceNumber: z.ZodNumber;
        patientFullName: z.ZodString;
        patientAge: z.ZodNumber;
        patientCategory: z.ZodDefault<z.ZodEnum<["adult", "child_under_14", "adolescent_15_17"]>>;
        medicalCardNumber: z.ZodString;
        patientAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isPrimaryVisit: z.ZodDefault<z.ZodBoolean>;
        isSanatedInVisit: z.ZodDefault<z.ZodBoolean>;
        diagnosisIcd10: z.ZodString;
        diagnosisText: z.ZodString;
        performedProceduresSummary: z.ZodString;
        uetCaries: z.ZodDefault<z.ZodNumber>;
        uetPulpitisPeriodontitis: z.ZodDefault<z.ZodNumber>;
        uetSurgeryExtractions: z.ZodDefault<z.ZodNumber>;
        uetHygienePeriodontology: z.ZodDefault<z.ZodNumber>;
        uetProstheticsOrthodontics: z.ZodDefault<z.ZodNumber>;
        uetAnesthesia: z.ZodDefault<z.ZodNumber>;
        totalUetForVisit: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        patientFullName: string;
        diagnosisIcd10: string;
        medicalCardNumber: string;
        sequenceNumber: number;
        patientAge: number;
        patientCategory: "adult" | "child_under_14" | "adolescent_15_17";
        isPrimaryVisit: boolean;
        isSanatedInVisit: boolean;
        diagnosisText: string;
        performedProceduresSummary: string;
        uetCaries: number;
        uetPulpitisPeriodontitis: number;
        uetSurgeryExtractions: number;
        uetHygienePeriodontology: number;
        uetProstheticsOrthodontics: number;
        uetAnesthesia: number;
        totalUetForVisit: number;
        patientAddress?: string | null | undefined;
    }, {
        patientFullName: string;
        diagnosisIcd10: string;
        medicalCardNumber: string;
        sequenceNumber: number;
        patientAge: number;
        diagnosisText: string;
        performedProceduresSummary: string;
        totalUetForVisit: number;
        patientAddress?: string | null | undefined;
        patientCategory?: "adult" | "child_under_14" | "adolescent_15_17" | undefined;
        isPrimaryVisit?: boolean | undefined;
        isSanatedInVisit?: boolean | undefined;
        uetCaries?: number | undefined;
        uetPulpitisPeriodontitis?: number | undefined;
        uetSurgeryExtractions?: number | undefined;
        uetHygienePeriodontology?: number | undefined;
        uetProstheticsOrthodontics?: number | undefined;
        uetAnesthesia?: number | undefined;
    }>, "many">>;
    summaryTotals: z.ZodDefault<z.ZodObject<{
        totalPatientsCount: z.ZodNumber;
        totalAdultsCount: z.ZodNumber;
        totalChildrenUnder14Count: z.ZodNumber;
        totalAdolescents15_17Count: z.ZodNumber;
        totalPrimaryVisitsCount: z.ZodNumber;
        totalRepeatVisitsCount: z.ZodNumber;
        totalSanatedCount: z.ZodNumber;
        totalUetAccumulated: z.ZodNumber;
        shiftStandardQuotaUet: z.ZodDefault<z.ZodNumber>;
        planExecutionPercentage: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        totalPatientsCount: number;
        totalAdultsCount: number;
        totalChildrenUnder14Count: number;
        totalAdolescents15_17Count: number;
        totalPrimaryVisitsCount: number;
        totalRepeatVisitsCount: number;
        totalSanatedCount: number;
        totalUetAccumulated: number;
        shiftStandardQuotaUet: number;
        planExecutionPercentage: number;
    }, {
        totalPatientsCount: number;
        totalAdultsCount: number;
        totalChildrenUnder14Count: number;
        totalAdolescents15_17Count: number;
        totalPrimaryVisitsCount: number;
        totalRepeatVisitsCount: number;
        totalSanatedCount: number;
        totalUetAccumulated: number;
        shiftStandardQuotaUet?: number | undefined;
        planExecutionPercentage?: number | undefined;
    }>>;
    notesAndObservations: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    shiftNumber: "shift_1_morning" | "shift_2_evening" | "full_day";
    doctorFullName: string;
    formNumber: "037/у-88";
    clinicLegalName: string;
    clinicDepartment: string;
    doctorSpecialty: string;
    shiftDate: string;
    shiftWorkingHours: string;
    patientRecords: {
        patientFullName: string;
        diagnosisIcd10: string;
        medicalCardNumber: string;
        sequenceNumber: number;
        patientAge: number;
        patientCategory: "adult" | "child_under_14" | "adolescent_15_17";
        isPrimaryVisit: boolean;
        isSanatedInVisit: boolean;
        diagnosisText: string;
        performedProceduresSummary: string;
        uetCaries: number;
        uetPulpitisPeriodontitis: number;
        uetSurgeryExtractions: number;
        uetHygienePeriodontology: number;
        uetProstheticsOrthodontics: number;
        uetAnesthesia: number;
        totalUetForVisit: number;
        patientAddress?: string | null | undefined;
    }[];
    summaryTotals: {
        totalPatientsCount: number;
        totalAdultsCount: number;
        totalChildrenUnder14Count: number;
        totalAdolescents15_17Count: number;
        totalPrimaryVisitsCount: number;
        totalRepeatVisitsCount: number;
        totalSanatedCount: number;
        totalUetAccumulated: number;
        shiftStandardQuotaUet: number;
        planExecutionPercentage: number;
    };
    notesAndObservations?: string | null | undefined;
}, {
    doctorFullName: string;
    formNumber: "037/у-88";
    clinicLegalName: string;
    shiftDate: string;
    shiftNumber?: "shift_1_morning" | "shift_2_evening" | "full_day" | undefined;
    clinicDepartment?: string | undefined;
    doctorSpecialty?: string | undefined;
    shiftWorkingHours?: string | undefined;
    patientRecords?: {
        patientFullName: string;
        diagnosisIcd10: string;
        medicalCardNumber: string;
        sequenceNumber: number;
        patientAge: number;
        diagnosisText: string;
        performedProceduresSummary: string;
        totalUetForVisit: number;
        patientAddress?: string | null | undefined;
        patientCategory?: "adult" | "child_under_14" | "adolescent_15_17" | undefined;
        isPrimaryVisit?: boolean | undefined;
        isSanatedInVisit?: boolean | undefined;
        uetCaries?: number | undefined;
        uetPulpitisPeriodontitis?: number | undefined;
        uetSurgeryExtractions?: number | undefined;
        uetHygienePeriodontology?: number | undefined;
        uetProstheticsOrthodontics?: number | undefined;
        uetAnesthesia?: number | undefined;
    }[] | undefined;
    summaryTotals?: {
        totalPatientsCount: number;
        totalAdultsCount: number;
        totalChildrenUnder14Count: number;
        totalAdolescents15_17Count: number;
        totalPrimaryVisitsCount: number;
        totalRepeatVisitsCount: number;
        totalSanatedCount: number;
        totalUetAccumulated: number;
        shiftStandardQuotaUet?: number | undefined;
        planExecutionPercentage?: number | undefined;
    } | undefined;
    notesAndObservations?: string | null | undefined;
}>;
export type DailyDentistDiary037uPayload = z.infer<typeof dailyDentistDiary037uPayloadSchema>;
