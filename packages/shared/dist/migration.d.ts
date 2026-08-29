import { z } from "zod";
/**
 * Контракты движка переноса данных из чужих систем.
 *
 * Отдельный модуль, а не очередная тысяча строк в index.ts: этими типами
 * пользуются и API, и интерфейс мастера миграции, и они меняются вместе с
 * таблицами миграции 0124, а не вместе с остальной моделью клиники.
 */
export declare const migrationRunStatusSchema: z.ZodEnum<["draft", "staging", "mapping", "validated", "queued", "loading", "completed", "completed_with_quarantine", "failed", "rolled_back"]>;
export type MigrationRunStatus = z.infer<typeof migrationRunStatusSchema>;
export declare const migrationSourceKindSchema: z.ZodEnum<["delimited", "spreadsheet", "json", "xml", "dbf", "sql_dump", "clipboard", "free_text", "api"]>;
export type MigrationSourceKind = z.infer<typeof migrationSourceKindSchema>;
export declare const migrationEntityKindSchema: z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>;
export type MigrationEntityKind = z.infer<typeof migrationEntityKindSchema>;
export declare const migrationStagingStatusSchema: z.ZodEnum<["pending", "normalized", "mapped", "ready", "loaded", "updated", "duplicate", "quarantined", "skipped"]>;
export type MigrationStagingStatus = z.infer<typeof migrationStagingStatusSchema>;
export declare const migrationQuarantineReasonSchema: z.ZodEnum<["missing_required_field", "unparsable_value", "encoding_damage", "broken_reference", "duplicate_conflict", "validation_failed", "ambiguous_mapping", "low_confidence", "target_write_failed", "row_too_large"]>;
export type MigrationQuarantineReason = z.infer<typeof migrationQuarantineReasonSchema>;
export declare const migrationQuarantineResolutionSchema: z.ZodEnum<["open", "resolved_imported", "resolved_merged", "discarded"]>;
export type MigrationQuarantineResolution = z.infer<typeof migrationQuarantineResolutionSchema>;
export declare const migrationDecisionSourceSchema: z.ZodEnum<["vendor_profile", "deterministic", "llm", "manual", "inferred"]>;
export type MigrationDecisionSource = z.infer<typeof migrationDecisionSourceSchema>;
/**
 * Русские названия причин карантина. Оператор клиники не должен читать
 * английские коды, а разработчик не должен искать перевод по интерфейсу.
 */
export declare const migrationQuarantineReasonTitles: Record<MigrationQuarantineReason, string>;
export declare const migrationEntityKindTitles: Record<MigrationEntityKind, string>;
export declare const migrationTargetFieldSchema: z.ZodEnum<["patient.externalId", "patient.fullName", "patient.lastName", "patient.firstName", "patient.middleName", "patient.birthDate", "patient.phone", "patient.secondaryPhone", "patient.email", "patient.gender", "patient.address", "patient.notes", "patient.status", "patient.createdAt", "doctor.externalId", "doctor.fullName", "doctor.specialty", "doctor.phone", "doctor.email", "service.externalId", "service.code", "service.name", "service.priceRub", "appointment.externalId", "appointment.patientRef", "appointment.doctorRef", "appointment.startsAt", "appointment.endsAt", "appointment.durationMinutes", "appointment.status", "appointment.reason", "appointment.comment", "visit.externalId", "visit.patientRef", "visit.appointmentRef", "visit.date", "visit.complaint", "visit.anamnesis", "visit.objectiveStatus", "visit.diagnosis", "visit.treatmentPlan", "visit.doctorSummary", "payment.externalId", "payment.patientRef", "payment.visitRef", "payment.amountRub", "payment.method", "payment.status", "payment.paidAt", "payment.note", "toothState.patientRef", "toothState.toothCode", "toothState.condition", "toothState.note", "ignore"]>;
export type MigrationTargetField = z.infer<typeof migrationTargetFieldSchema>;
/**
 * Происхождение одного поля одной строки.
 *
 * Без этого невозможно ответить на вопрос «откуда в карточке пациента взялась
 * эта дата рождения» через год после переноса, а именно этот вопрос задают,
 * когда что-то пошло не так.
 */
export declare const migrationFieldLineageSchema: z.ZodObject<{
    /** Целевое поле нашей модели. */
    field: z.ZodEnum<["patient.externalId", "patient.fullName", "patient.lastName", "patient.firstName", "patient.middleName", "patient.birthDate", "patient.phone", "patient.secondaryPhone", "patient.email", "patient.gender", "patient.address", "patient.notes", "patient.status", "patient.createdAt", "doctor.externalId", "doctor.fullName", "doctor.specialty", "doctor.phone", "doctor.email", "service.externalId", "service.code", "service.name", "service.priceRub", "appointment.externalId", "appointment.patientRef", "appointment.doctorRef", "appointment.startsAt", "appointment.endsAt", "appointment.durationMinutes", "appointment.status", "appointment.reason", "appointment.comment", "visit.externalId", "visit.patientRef", "visit.appointmentRef", "visit.date", "visit.complaint", "visit.anamnesis", "visit.objectiveStatus", "visit.diagnosis", "visit.treatmentPlan", "visit.doctorSummary", "payment.externalId", "payment.patientRef", "payment.visitRef", "payment.amountRub", "payment.method", "payment.status", "payment.paidAt", "payment.note", "toothState.patientRef", "toothState.toothCode", "toothState.condition", "toothState.note", "ignore"]>;
    /** Имя колонки источника, из которой взято значение. */
    sourceColumn: z.ZodString;
    /** Значение источника до преобразований. Обрезается до безопасной длины. */
    sourceValue: z.ZodNullable<z.ZodString>;
    /** Цепочка применённых преобразований: ["decode:cp1251", "date:dd.mm.yyyy", "trim"]. */
    transforms: z.ZodArray<z.ZodString, "many">;
    /** Кто решил, что эта колонка соответствует этому полю. */
    decidedBy: z.ZodEnum<["vendor_profile", "deterministic", "llm", "manual", "inferred"]>;
    /** Уверенность в решении, 0..1. */
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    field: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
    sourceColumn: string;
    sourceValue: string | null;
    transforms: string[];
    decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
    confidence: number;
}, {
    field: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
    sourceColumn: string;
    sourceValue: string | null;
    transforms: string[];
    decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
    confidence: number;
}>;
export type MigrationFieldLineage = z.infer<typeof migrationFieldLineageSchema>;
/** Одна строка карты соответствия «колонка источника → наше поле». */
export declare const migrationColumnMappingSchema: z.ZodObject<{
    sourceColumn: z.ZodString;
    targetField: z.ZodEnum<["patient.externalId", "patient.fullName", "patient.lastName", "patient.firstName", "patient.middleName", "patient.birthDate", "patient.phone", "patient.secondaryPhone", "patient.email", "patient.gender", "patient.address", "patient.notes", "patient.status", "patient.createdAt", "doctor.externalId", "doctor.fullName", "doctor.specialty", "doctor.phone", "doctor.email", "service.externalId", "service.code", "service.name", "service.priceRub", "appointment.externalId", "appointment.patientRef", "appointment.doctorRef", "appointment.startsAt", "appointment.endsAt", "appointment.durationMinutes", "appointment.status", "appointment.reason", "appointment.comment", "visit.externalId", "visit.patientRef", "visit.appointmentRef", "visit.date", "visit.complaint", "visit.anamnesis", "visit.objectiveStatus", "visit.diagnosis", "visit.treatmentPlan", "visit.doctorSummary", "payment.externalId", "payment.patientRef", "payment.visitRef", "payment.amountRub", "payment.method", "payment.status", "payment.paidAt", "payment.note", "toothState.patientRef", "toothState.toothCode", "toothState.condition", "toothState.note", "ignore"]>;
    decidedBy: z.ZodEnum<["vendor_profile", "deterministic", "llm", "manual", "inferred"]>;
    confidence: z.ZodNumber;
    /** Обоснование на русском: по какому признаку принято решение. */
    rationale: z.ZodString;
    /** Примеры значений колонки — то, на чём решение проверялось. */
    sampleValues: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    sourceColumn: string;
    decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
    confidence: number;
    targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
    rationale: string;
    sampleValues: string[];
}, {
    sourceColumn: string;
    decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
    confidence: number;
    targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
    rationale: string;
    sampleValues: string[];
}>;
export type MigrationColumnMapping = z.infer<typeof migrationColumnMappingSchema>;
/** Итоговая карта соответствия, сохраняемая в migration_runs.mapping_json. */
export declare const migrationMappingSnapshotSchema: z.ZodObject<{
    /** Опознанная чужая система либо null, если профиль не подошёл. */
    vendorProfile: z.ZodNullable<z.ZodString>;
    sourceTable: z.ZodString;
    entityKind: z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>;
    columns: z.ZodArray<z.ZodObject<{
        sourceColumn: z.ZodString;
        targetField: z.ZodEnum<["patient.externalId", "patient.fullName", "patient.lastName", "patient.firstName", "patient.middleName", "patient.birthDate", "patient.phone", "patient.secondaryPhone", "patient.email", "patient.gender", "patient.address", "patient.notes", "patient.status", "patient.createdAt", "doctor.externalId", "doctor.fullName", "doctor.specialty", "doctor.phone", "doctor.email", "service.externalId", "service.code", "service.name", "service.priceRub", "appointment.externalId", "appointment.patientRef", "appointment.doctorRef", "appointment.startsAt", "appointment.endsAt", "appointment.durationMinutes", "appointment.status", "appointment.reason", "appointment.comment", "visit.externalId", "visit.patientRef", "visit.appointmentRef", "visit.date", "visit.complaint", "visit.anamnesis", "visit.objectiveStatus", "visit.diagnosis", "visit.treatmentPlan", "visit.doctorSummary", "payment.externalId", "payment.patientRef", "payment.visitRef", "payment.amountRub", "payment.method", "payment.status", "payment.paidAt", "payment.note", "toothState.patientRef", "toothState.toothCode", "toothState.condition", "toothState.note", "ignore"]>;
        decidedBy: z.ZodEnum<["vendor_profile", "deterministic", "llm", "manual", "inferred"]>;
        confidence: z.ZodNumber;
        /** Обоснование на русском: по какому признаку принято решение. */
        rationale: z.ZodString;
        /** Примеры значений колонки — то, на чём решение проверялось. */
        sampleValues: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        sourceColumn: string;
        decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
        confidence: number;
        targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
        rationale: string;
        sampleValues: string[];
    }, {
        sourceColumn: string;
        decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
        confidence: number;
        targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
        rationale: string;
        sampleValues: string[];
    }>, "many">;
    /** Колонки источника, которым не нашлось места. Они не теряются: остаются в raw_json. */
    unmappedColumns: z.ZodArray<z.ZodString, "many">;
    /** Предупреждения разбора на русском. */
    warnings: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    sourceTable: string;
    entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
    warnings: string[];
    vendorProfile: string | null;
    columns: {
        sourceColumn: string;
        decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
        confidence: number;
        targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
        rationale: string;
        sampleValues: string[];
    }[];
    unmappedColumns: string[];
}, {
    sourceTable: string;
    entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
    warnings: string[];
    vendorProfile: string | null;
    columns: {
        sourceColumn: string;
        decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
        confidence: number;
        targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
        rationale: string;
        sampleValues: string[];
    }[];
    unmappedColumns: string[];
}>;
export type MigrationMappingSnapshot = z.infer<typeof migrationMappingSnapshotSchema>;
export declare const migrationReconciliationCheckSchema: z.ZodObject<{
    /** Машинный код проверки: 'row_conservation', 'money_conservation'. */
    code: z.ZodString;
    /** Название на русском для отчёта. */
    title: z.ZodString;
    expected: z.ZodNumber;
    actual: z.ZodNumber;
    passed: z.ZodBoolean;
    /** Пояснение, что означает расхождение. */
    detail: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    expected: number;
    passed: boolean;
    title: string;
    actual: number;
    detail: string;
}, {
    code: string;
    expected: number;
    passed: boolean;
    title: string;
    actual: number;
    detail: string;
}>;
export type MigrationReconciliationCheck = z.infer<typeof migrationReconciliationCheckSchema>;
export declare const migrationEntityBreakdownSchema: z.ZodObject<{
    entityKind: z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>;
    sourceRows: z.ZodNumber;
    created: z.ZodNumber;
    updated: z.ZodNumber;
    duplicates: z.ZodNumber;
    quarantined: z.ZodNumber;
    skipped: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    quarantined: number;
    entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
    created: number;
    skipped: number;
    updated: number;
    sourceRows: number;
    duplicates: number;
}, {
    quarantined: number;
    entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
    created: number;
    skipped: number;
    updated: number;
    sourceRows: number;
    duplicates: number;
}>;
export type MigrationEntityBreakdown = z.infer<typeof migrationEntityBreakdownSchema>;
export declare const migrationReconciliationReportSchema: z.ZodObject<{
    runId: z.ZodString;
    generatedAt: z.ZodString;
    /**
     * Единственный вопрос, ради которого существует отчёт: сошлось или нет.
     * false означает, что перенос нельзя объявлять завершённым.
     */
    balanced: z.ZodBoolean;
    checks: z.ZodArray<z.ZodObject<{
        /** Машинный код проверки: 'row_conservation', 'money_conservation'. */
        code: z.ZodString;
        /** Название на русском для отчёта. */
        title: z.ZodString;
        expected: z.ZodNumber;
        actual: z.ZodNumber;
        passed: z.ZodBoolean;
        /** Пояснение, что означает расхождение. */
        detail: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        expected: number;
        passed: boolean;
        title: string;
        actual: number;
        detail: string;
    }, {
        code: string;
        expected: number;
        passed: boolean;
        title: string;
        actual: number;
        detail: string;
    }>, "many">;
    entityBreakdown: z.ZodArray<z.ZodObject<{
        entityKind: z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>;
        sourceRows: z.ZodNumber;
        created: z.ZodNumber;
        updated: z.ZodNumber;
        duplicates: z.ZodNumber;
        quarantined: z.ZodNumber;
        skipped: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        quarantined: number;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        created: number;
        skipped: number;
        updated: number;
        sourceRows: number;
        duplicates: number;
    }, {
        quarantined: number;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        created: number;
        skipped: number;
        updated: number;
        sourceRows: number;
        duplicates: number;
    }>, "many">;
    sourceMoneyTotalRub: z.ZodNullable<z.ZodLazy<z.ZodEffects<z.ZodNumber, number, number>>>;
    loadedMoneyTotalRub: z.ZodNullable<z.ZodLazy<z.ZodEffects<z.ZodNumber, number, number>>>;
    quarantinedMoneyTotalRub: z.ZodNullable<z.ZodLazy<z.ZodEffects<z.ZodNumber, number, number>>>;
}, "strip", z.ZodTypeAny, {
    generatedAt: string;
    runId: string;
    balanced: boolean;
    checks: {
        code: string;
        expected: number;
        passed: boolean;
        title: string;
        actual: number;
        detail: string;
    }[];
    entityBreakdown: {
        quarantined: number;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        created: number;
        skipped: number;
        updated: number;
        sourceRows: number;
        duplicates: number;
    }[];
    sourceMoneyTotalRub: number | null;
    loadedMoneyTotalRub: number | null;
    quarantinedMoneyTotalRub: number | null;
}, {
    generatedAt: string;
    runId: string;
    balanced: boolean;
    checks: {
        code: string;
        expected: number;
        passed: boolean;
        title: string;
        actual: number;
        detail: string;
    }[];
    entityBreakdown: {
        quarantined: number;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        created: number;
        skipped: number;
        updated: number;
        sourceRows: number;
        duplicates: number;
    }[];
    sourceMoneyTotalRub: number | null;
    loadedMoneyTotalRub: number | null;
    quarantinedMoneyTotalRub: number | null;
}>;
export type MigrationReconciliationReport = z.infer<typeof migrationReconciliationReportSchema>;
/**
 * Лимит на текстовый источник за один запрос. 24 МБ выбрано не наугад:
 * bodyLimit ingestion-маршрута стоит на 9 МБ для base64, а текстовая выгрузка
 * приходит без кодирования; 24 МБ ~ 150 тысяч строк пациентов, что покрывает
 * выгрузку средней клиники за десять лет и при этом не кладёт процесс.
 */
export declare const MIGRATION_MAX_SOURCE_CHARS = 24000000;
/** Строка, длиннее которой источник признаётся повреждённым, а не данными. */
export declare const MIGRATION_MAX_ROW_CHARS = 64000;
export declare const migrationAnalyzeRequestSchema: z.ZodEffects<z.ZodObject<{
    sourceName: z.ZodString;
    sourceKind: z.ZodOptional<z.ZodEnum<["delimited", "spreadsheet", "json", "xml", "dbf", "sql_dump", "clipboard", "free_text", "api"]>>;
    /** Текстовое содержимое источника. */
    rawText: z.ZodOptional<z.ZodString>;
    /** Двоичное содержимое источника в base64: DBF, XLSX, архив. */
    contentBase64: z.ZodOptional<z.ZodString>;
    /** Явно заданная сущность. Если не указана — определяется по содержимому. */
    entityKind: z.ZodOptional<z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>>;
    /** Разрешить обращение к языковой модели для неопознанных колонок. */
    allowLlm: z.ZodDefault<z.ZodBoolean>;
    /** Код чужой системы, если оператор знает его точно. */
    vendorProfile: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sourceName: string;
    allowLlm: boolean;
    entityKind?: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state" | undefined;
    vendorProfile?: string | undefined;
    sourceKind?: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api" | undefined;
    rawText?: string | undefined;
    contentBase64?: string | undefined;
}, {
    sourceName: string;
    entityKind?: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state" | undefined;
    vendorProfile?: string | undefined;
    sourceKind?: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api" | undefined;
    rawText?: string | undefined;
    contentBase64?: string | undefined;
    allowLlm?: boolean | undefined;
}>, {
    sourceName: string;
    allowLlm: boolean;
    entityKind?: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state" | undefined;
    vendorProfile?: string | undefined;
    sourceKind?: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api" | undefined;
    rawText?: string | undefined;
    contentBase64?: string | undefined;
}, {
    sourceName: string;
    entityKind?: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state" | undefined;
    vendorProfile?: string | undefined;
    sourceKind?: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api" | undefined;
    rawText?: string | undefined;
    contentBase64?: string | undefined;
    allowLlm?: boolean | undefined;
}>;
export type MigrationAnalyzeRequest = z.infer<typeof migrationAnalyzeRequestSchema>;
export declare const migrationSourceProfileSchema: z.ZodObject<{
    sourceKind: z.ZodEnum<["delimited", "spreadsheet", "json", "xml", "dbf", "sql_dump", "clipboard", "free_text", "api"]>;
    detectedEncoding: z.ZodString;
    encodingConfidence: z.ZodNumber;
    /** Разделитель для табличных источников. */
    delimiter: z.ZodNullable<z.ZodString>;
    columns: z.ZodArray<z.ZodString, "many">;
    rowCount: z.ZodNumber;
    /** Первые строки как есть — оператор должен видеть, что прочиталось. */
    sampleRows: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodString>, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    warnings: string[];
    columns: string[];
    sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
    detectedEncoding: string;
    encodingConfidence: number;
    delimiter: string | null;
    rowCount: number;
    sampleRows: Record<string, string>[];
}, {
    warnings: string[];
    columns: string[];
    sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
    detectedEncoding: string;
    encodingConfidence: number;
    delimiter: string | null;
    rowCount: number;
    sampleRows: Record<string, string>[];
}>;
export type MigrationSourceProfile = z.infer<typeof migrationSourceProfileSchema>;
export declare const migrationAnalyzeResponseSchema: z.ZodObject<{
    sourceName: z.ZodString;
    profile: z.ZodObject<{
        sourceKind: z.ZodEnum<["delimited", "spreadsheet", "json", "xml", "dbf", "sql_dump", "clipboard", "free_text", "api"]>;
        detectedEncoding: z.ZodString;
        encodingConfidence: z.ZodNumber;
        /** Разделитель для табличных источников. */
        delimiter: z.ZodNullable<z.ZodString>;
        columns: z.ZodArray<z.ZodString, "many">;
        rowCount: z.ZodNumber;
        /** Первые строки как есть — оператор должен видеть, что прочиталось. */
        sampleRows: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodString>, "many">;
        warnings: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        warnings: string[];
        columns: string[];
        sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
        detectedEncoding: string;
        encodingConfidence: number;
        delimiter: string | null;
        rowCount: number;
        sampleRows: Record<string, string>[];
    }, {
        warnings: string[];
        columns: string[];
        sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
        detectedEncoding: string;
        encodingConfidence: number;
        delimiter: string | null;
        rowCount: number;
        sampleRows: Record<string, string>[];
    }>;
    mapping: z.ZodObject<{
        /** Опознанная чужая система либо null, если профиль не подошёл. */
        vendorProfile: z.ZodNullable<z.ZodString>;
        sourceTable: z.ZodString;
        entityKind: z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>;
        columns: z.ZodArray<z.ZodObject<{
            sourceColumn: z.ZodString;
            targetField: z.ZodEnum<["patient.externalId", "patient.fullName", "patient.lastName", "patient.firstName", "patient.middleName", "patient.birthDate", "patient.phone", "patient.secondaryPhone", "patient.email", "patient.gender", "patient.address", "patient.notes", "patient.status", "patient.createdAt", "doctor.externalId", "doctor.fullName", "doctor.specialty", "doctor.phone", "doctor.email", "service.externalId", "service.code", "service.name", "service.priceRub", "appointment.externalId", "appointment.patientRef", "appointment.doctorRef", "appointment.startsAt", "appointment.endsAt", "appointment.durationMinutes", "appointment.status", "appointment.reason", "appointment.comment", "visit.externalId", "visit.patientRef", "visit.appointmentRef", "visit.date", "visit.complaint", "visit.anamnesis", "visit.objectiveStatus", "visit.diagnosis", "visit.treatmentPlan", "visit.doctorSummary", "payment.externalId", "payment.patientRef", "payment.visitRef", "payment.amountRub", "payment.method", "payment.status", "payment.paidAt", "payment.note", "toothState.patientRef", "toothState.toothCode", "toothState.condition", "toothState.note", "ignore"]>;
            decidedBy: z.ZodEnum<["vendor_profile", "deterministic", "llm", "manual", "inferred"]>;
            confidence: z.ZodNumber;
            /** Обоснование на русском: по какому признаку принято решение. */
            rationale: z.ZodString;
            /** Примеры значений колонки — то, на чём решение проверялось. */
            sampleValues: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }, {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }>, "many">;
        /** Колонки источника, которым не нашлось места. Они не теряются: остаются в raw_json. */
        unmappedColumns: z.ZodArray<z.ZodString, "many">;
        /** Предупреждения разбора на русском. */
        warnings: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        sourceTable: string;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        warnings: string[];
        vendorProfile: string | null;
        columns: {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }[];
        unmappedColumns: string[];
    }, {
        sourceTable: string;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        warnings: string[];
        vendorProfile: string | null;
        columns: {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }[];
        unmappedColumns: string[];
    }>;
    /** Оценка: сколько строк пройдёт, сколько уйдёт в карантин при текущей карте. */
    projectedReady: z.ZodNumber;
    projectedQuarantine: z.ZodNumber;
    /** Замечания к качеству источника до запуска переноса. */
    qualityFindings: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["info", "warning", "blocker"]>;
        message: z.ZodString;
        affectedRows: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        message: string;
        severity: "warning" | "info" | "blocker";
        affectedRows: number;
    }, {
        message: string;
        severity: "warning" | "info" | "blocker";
        affectedRows: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    mapping: {
        sourceTable: string;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        warnings: string[];
        vendorProfile: string | null;
        columns: {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }[];
        unmappedColumns: string[];
    };
    sourceName: string;
    profile: {
        warnings: string[];
        columns: string[];
        sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
        detectedEncoding: string;
        encodingConfidence: number;
        delimiter: string | null;
        rowCount: number;
        sampleRows: Record<string, string>[];
    };
    projectedReady: number;
    projectedQuarantine: number;
    qualityFindings: {
        message: string;
        severity: "warning" | "info" | "blocker";
        affectedRows: number;
    }[];
}, {
    mapping: {
        sourceTable: string;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        warnings: string[];
        vendorProfile: string | null;
        columns: {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }[];
        unmappedColumns: string[];
    };
    sourceName: string;
    profile: {
        warnings: string[];
        columns: string[];
        sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
        detectedEncoding: string;
        encodingConfidence: number;
        delimiter: string | null;
        rowCount: number;
        sampleRows: Record<string, string>[];
    };
    projectedReady: number;
    projectedQuarantine: number;
    qualityFindings: {
        message: string;
        severity: "warning" | "info" | "blocker";
        affectedRows: number;
    }[];
}>;
export type MigrationAnalyzeResponse = z.infer<typeof migrationAnalyzeResponseSchema>;
export declare const migrationRunRequestSchema: z.ZodEffects<z.ZodObject<{
    sourceName: z.ZodString;
    sourceKind: z.ZodOptional<z.ZodEnum<["delimited", "spreadsheet", "json", "xml", "dbf", "sql_dump", "clipboard", "free_text", "api"]>>;
    rawText: z.ZodOptional<z.ZodString>;
    contentBase64: z.ZodOptional<z.ZodString>;
    entityKind: z.ZodOptional<z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>>;
    allowLlm: z.ZodDefault<z.ZodBoolean>;
    vendorProfile: z.ZodOptional<z.ZodString>;
    /**
     * true — дойти до validated и остановиться, ничего не записав в боевые
     * таблицы. Значение по умолчанию именно true: перенос чужой базы начинается
     * с сухого прогона, а не с записи.
     */
    dryRun: z.ZodDefault<z.ZodBoolean>;
    /**
     * Код системы-источника для таблицы соответствий. Разные системы могут иметь
     * пациента с id=1, и они не должны склеиться.
     */
    sourceSystem: z.ZodDefault<z.ZodString>;
    /** Ручные поправки карты соответствия, заданные оператором в мастере. */
    mappingOverrides: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sourceColumn: z.ZodString;
        targetField: z.ZodEnum<["patient.externalId", "patient.fullName", "patient.lastName", "patient.firstName", "patient.middleName", "patient.birthDate", "patient.phone", "patient.secondaryPhone", "patient.email", "patient.gender", "patient.address", "patient.notes", "patient.status", "patient.createdAt", "doctor.externalId", "doctor.fullName", "doctor.specialty", "doctor.phone", "doctor.email", "service.externalId", "service.code", "service.name", "service.priceRub", "appointment.externalId", "appointment.patientRef", "appointment.doctorRef", "appointment.startsAt", "appointment.endsAt", "appointment.durationMinutes", "appointment.status", "appointment.reason", "appointment.comment", "visit.externalId", "visit.patientRef", "visit.appointmentRef", "visit.date", "visit.complaint", "visit.anamnesis", "visit.objectiveStatus", "visit.diagnosis", "visit.treatmentPlan", "visit.doctorSummary", "payment.externalId", "payment.patientRef", "payment.visitRef", "payment.amountRub", "payment.method", "payment.status", "payment.paidAt", "payment.note", "toothState.patientRef", "toothState.toothCode", "toothState.condition", "toothState.note", "ignore"]>;
    }, "strip", z.ZodTypeAny, {
        sourceColumn: string;
        targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
    }, {
        sourceColumn: string;
        targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    sourceName: string;
    allowLlm: boolean;
    dryRun: boolean;
    sourceSystem: string;
    mappingOverrides: {
        sourceColumn: string;
        targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
    }[];
    entityKind?: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state" | undefined;
    vendorProfile?: string | undefined;
    sourceKind?: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api" | undefined;
    rawText?: string | undefined;
    contentBase64?: string | undefined;
}, {
    sourceName: string;
    entityKind?: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state" | undefined;
    vendorProfile?: string | undefined;
    sourceKind?: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api" | undefined;
    rawText?: string | undefined;
    contentBase64?: string | undefined;
    allowLlm?: boolean | undefined;
    dryRun?: boolean | undefined;
    sourceSystem?: string | undefined;
    mappingOverrides?: {
        sourceColumn: string;
        targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
    }[] | undefined;
}>, {
    sourceName: string;
    allowLlm: boolean;
    dryRun: boolean;
    sourceSystem: string;
    mappingOverrides: {
        sourceColumn: string;
        targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
    }[];
    entityKind?: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state" | undefined;
    vendorProfile?: string | undefined;
    sourceKind?: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api" | undefined;
    rawText?: string | undefined;
    contentBase64?: string | undefined;
}, {
    sourceName: string;
    entityKind?: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state" | undefined;
    vendorProfile?: string | undefined;
    sourceKind?: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api" | undefined;
    rawText?: string | undefined;
    contentBase64?: string | undefined;
    allowLlm?: boolean | undefined;
    dryRun?: boolean | undefined;
    sourceSystem?: string | undefined;
    mappingOverrides?: {
        sourceColumn: string;
        targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
    }[] | undefined;
}>;
export type MigrationRunRequest = z.infer<typeof migrationRunRequestSchema>;
export declare const migrationQuarantineItemSchema: z.ZodObject<{
    id: z.ZodString;
    stagingRecordId: z.ZodNullable<z.ZodString>;
    entityKind: z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>;
    reason: z.ZodEnum<["missing_required_field", "unparsable_value", "encoding_damage", "broken_reference", "duplicate_conflict", "validation_failed", "ambiguous_mapping", "low_confidence", "target_write_failed", "row_too_large"]>;
    blocking: z.ZodBoolean;
    fieldPath: z.ZodNullable<z.ZodString>;
    message: z.ZodString;
    suggestedFix: z.ZodNullable<z.ZodString>;
    resolution: z.ZodEnum<["open", "resolved_imported", "resolved_merged", "discarded"]>;
    sourceRowNumber: z.ZodNullable<z.ZodNumber>;
    sourceTable: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    id: string;
    reason: "missing_required_field" | "unparsable_value" | "encoding_damage" | "broken_reference" | "duplicate_conflict" | "validation_failed" | "ambiguous_mapping" | "low_confidence" | "target_write_failed" | "row_too_large";
    sourceTable: string | null;
    entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
    stagingRecordId: string | null;
    blocking: boolean;
    fieldPath: string | null;
    suggestedFix: string | null;
    resolution: "open" | "resolved_imported" | "resolved_merged" | "discarded";
    sourceRowNumber: number | null;
}, {
    message: string;
    id: string;
    reason: "missing_required_field" | "unparsable_value" | "encoding_damage" | "broken_reference" | "duplicate_conflict" | "validation_failed" | "ambiguous_mapping" | "low_confidence" | "target_write_failed" | "row_too_large";
    sourceTable: string | null;
    entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
    stagingRecordId: string | null;
    blocking: boolean;
    fieldPath: string | null;
    suggestedFix: string | null;
    resolution: "open" | "resolved_imported" | "resolved_merged" | "discarded";
    sourceRowNumber: number | null;
}>;
export type MigrationQuarantineItem = z.infer<typeof migrationQuarantineItemSchema>;
export declare const migrationRunSummarySchema: z.ZodObject<{
    runId: z.ZodString;
    sourceName: z.ZodString;
    sourceKind: z.ZodEnum<["delimited", "spreadsheet", "json", "xml", "dbf", "sql_dump", "clipboard", "free_text", "api"]>;
    vendorProfile: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["draft", "staging", "mapping", "validated", "queued", "loading", "completed", "completed_with_quarantine", "failed", "rolled_back"]>;
    dryRun: z.ZodBoolean;
    sourceRows: z.ZodNumber;
    stagedRows: z.ZodNumber;
    loadedRows: z.ZodNumber;
    updatedRows: z.ZodNumber;
    duplicateRows: z.ZodNumber;
    quarantinedRows: z.ZodNumber;
    skippedRows: z.ZodNumber;
    llmCalls: z.ZodNumber;
    llmRejectedSuggestions: z.ZodNumber;
    startedAt: z.ZodNullable<z.ZodString>;
    finishedAt: z.ZodNullable<z.ZodString>;
    errorMessage: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "failed" | "queued" | "draft" | "staging" | "mapping" | "validated" | "loading" | "completed_with_quarantine" | "rolled_back";
    vendorProfile: string | null;
    sourceRows: number;
    runId: string;
    sourceName: string;
    sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
    dryRun: boolean;
    stagedRows: number;
    loadedRows: number;
    updatedRows: number;
    duplicateRows: number;
    quarantinedRows: number;
    skippedRows: number;
    llmCalls: number;
    llmRejectedSuggestions: number;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
}, {
    status: "completed" | "failed" | "queued" | "draft" | "staging" | "mapping" | "validated" | "loading" | "completed_with_quarantine" | "rolled_back";
    vendorProfile: string | null;
    sourceRows: number;
    runId: string;
    sourceName: string;
    sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
    dryRun: boolean;
    stagedRows: number;
    loadedRows: number;
    updatedRows: number;
    duplicateRows: number;
    quarantinedRows: number;
    skippedRows: number;
    llmCalls: number;
    llmRejectedSuggestions: number;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
}>;
export type MigrationRunSummary = z.infer<typeof migrationRunSummarySchema>;
export declare const migrationRunResponseSchema: z.ZodObject<{
    run: z.ZodObject<{
        runId: z.ZodString;
        sourceName: z.ZodString;
        sourceKind: z.ZodEnum<["delimited", "spreadsheet", "json", "xml", "dbf", "sql_dump", "clipboard", "free_text", "api"]>;
        vendorProfile: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["draft", "staging", "mapping", "validated", "queued", "loading", "completed", "completed_with_quarantine", "failed", "rolled_back"]>;
        dryRun: z.ZodBoolean;
        sourceRows: z.ZodNumber;
        stagedRows: z.ZodNumber;
        loadedRows: z.ZodNumber;
        updatedRows: z.ZodNumber;
        duplicateRows: z.ZodNumber;
        quarantinedRows: z.ZodNumber;
        skippedRows: z.ZodNumber;
        llmCalls: z.ZodNumber;
        llmRejectedSuggestions: z.ZodNumber;
        startedAt: z.ZodNullable<z.ZodString>;
        finishedAt: z.ZodNullable<z.ZodString>;
        errorMessage: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "failed" | "queued" | "draft" | "staging" | "mapping" | "validated" | "loading" | "completed_with_quarantine" | "rolled_back";
        vendorProfile: string | null;
        sourceRows: number;
        runId: string;
        sourceName: string;
        sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
        dryRun: boolean;
        stagedRows: number;
        loadedRows: number;
        updatedRows: number;
        duplicateRows: number;
        quarantinedRows: number;
        skippedRows: number;
        llmCalls: number;
        llmRejectedSuggestions: number;
        startedAt: string | null;
        finishedAt: string | null;
        errorMessage: string | null;
    }, {
        status: "completed" | "failed" | "queued" | "draft" | "staging" | "mapping" | "validated" | "loading" | "completed_with_quarantine" | "rolled_back";
        vendorProfile: string | null;
        sourceRows: number;
        runId: string;
        sourceName: string;
        sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
        dryRun: boolean;
        stagedRows: number;
        loadedRows: number;
        updatedRows: number;
        duplicateRows: number;
        quarantinedRows: number;
        skippedRows: number;
        llmCalls: number;
        llmRejectedSuggestions: number;
        startedAt: string | null;
        finishedAt: string | null;
        errorMessage: string | null;
    }>;
    mapping: z.ZodObject<{
        /** Опознанная чужая система либо null, если профиль не подошёл. */
        vendorProfile: z.ZodNullable<z.ZodString>;
        sourceTable: z.ZodString;
        entityKind: z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>;
        columns: z.ZodArray<z.ZodObject<{
            sourceColumn: z.ZodString;
            targetField: z.ZodEnum<["patient.externalId", "patient.fullName", "patient.lastName", "patient.firstName", "patient.middleName", "patient.birthDate", "patient.phone", "patient.secondaryPhone", "patient.email", "patient.gender", "patient.address", "patient.notes", "patient.status", "patient.createdAt", "doctor.externalId", "doctor.fullName", "doctor.specialty", "doctor.phone", "doctor.email", "service.externalId", "service.code", "service.name", "service.priceRub", "appointment.externalId", "appointment.patientRef", "appointment.doctorRef", "appointment.startsAt", "appointment.endsAt", "appointment.durationMinutes", "appointment.status", "appointment.reason", "appointment.comment", "visit.externalId", "visit.patientRef", "visit.appointmentRef", "visit.date", "visit.complaint", "visit.anamnesis", "visit.objectiveStatus", "visit.diagnosis", "visit.treatmentPlan", "visit.doctorSummary", "payment.externalId", "payment.patientRef", "payment.visitRef", "payment.amountRub", "payment.method", "payment.status", "payment.paidAt", "payment.note", "toothState.patientRef", "toothState.toothCode", "toothState.condition", "toothState.note", "ignore"]>;
            decidedBy: z.ZodEnum<["vendor_profile", "deterministic", "llm", "manual", "inferred"]>;
            confidence: z.ZodNumber;
            /** Обоснование на русском: по какому признаку принято решение. */
            rationale: z.ZodString;
            /** Примеры значений колонки — то, на чём решение проверялось. */
            sampleValues: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }, {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }>, "many">;
        /** Колонки источника, которым не нашлось места. Они не теряются: остаются в raw_json. */
        unmappedColumns: z.ZodArray<z.ZodString, "many">;
        /** Предупреждения разбора на русском. */
        warnings: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        sourceTable: string;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        warnings: string[];
        vendorProfile: string | null;
        columns: {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }[];
        unmappedColumns: string[];
    }, {
        sourceTable: string;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        warnings: string[];
        vendorProfile: string | null;
        columns: {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }[];
        unmappedColumns: string[];
    }>;
    reconciliation: z.ZodObject<{
        runId: z.ZodString;
        generatedAt: z.ZodString;
        /**
         * Единственный вопрос, ради которого существует отчёт: сошлось или нет.
         * false означает, что перенос нельзя объявлять завершённым.
         */
        balanced: z.ZodBoolean;
        checks: z.ZodArray<z.ZodObject<{
            /** Машинный код проверки: 'row_conservation', 'money_conservation'. */
            code: z.ZodString;
            /** Название на русском для отчёта. */
            title: z.ZodString;
            expected: z.ZodNumber;
            actual: z.ZodNumber;
            passed: z.ZodBoolean;
            /** Пояснение, что означает расхождение. */
            detail: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            code: string;
            expected: number;
            passed: boolean;
            title: string;
            actual: number;
            detail: string;
        }, {
            code: string;
            expected: number;
            passed: boolean;
            title: string;
            actual: number;
            detail: string;
        }>, "many">;
        entityBreakdown: z.ZodArray<z.ZodObject<{
            entityKind: z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>;
            sourceRows: z.ZodNumber;
            created: z.ZodNumber;
            updated: z.ZodNumber;
            duplicates: z.ZodNumber;
            quarantined: z.ZodNumber;
            skipped: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            quarantined: number;
            entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
            created: number;
            skipped: number;
            updated: number;
            sourceRows: number;
            duplicates: number;
        }, {
            quarantined: number;
            entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
            created: number;
            skipped: number;
            updated: number;
            sourceRows: number;
            duplicates: number;
        }>, "many">;
        sourceMoneyTotalRub: z.ZodNullable<z.ZodLazy<z.ZodEffects<z.ZodNumber, number, number>>>;
        loadedMoneyTotalRub: z.ZodNullable<z.ZodLazy<z.ZodEffects<z.ZodNumber, number, number>>>;
        quarantinedMoneyTotalRub: z.ZodNullable<z.ZodLazy<z.ZodEffects<z.ZodNumber, number, number>>>;
    }, "strip", z.ZodTypeAny, {
        generatedAt: string;
        runId: string;
        balanced: boolean;
        checks: {
            code: string;
            expected: number;
            passed: boolean;
            title: string;
            actual: number;
            detail: string;
        }[];
        entityBreakdown: {
            quarantined: number;
            entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
            created: number;
            skipped: number;
            updated: number;
            sourceRows: number;
            duplicates: number;
        }[];
        sourceMoneyTotalRub: number | null;
        loadedMoneyTotalRub: number | null;
        quarantinedMoneyTotalRub: number | null;
    }, {
        generatedAt: string;
        runId: string;
        balanced: boolean;
        checks: {
            code: string;
            expected: number;
            passed: boolean;
            title: string;
            actual: number;
            detail: string;
        }[];
        entityBreakdown: {
            quarantined: number;
            entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
            created: number;
            skipped: number;
            updated: number;
            sourceRows: number;
            duplicates: number;
        }[];
        sourceMoneyTotalRub: number | null;
        loadedMoneyTotalRub: number | null;
        quarantinedMoneyTotalRub: number | null;
    }>;
    /** Первые записи карантина для показа сразу, без второго запроса. */
    quarantinePreview: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        stagingRecordId: z.ZodNullable<z.ZodString>;
        entityKind: z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>;
        reason: z.ZodEnum<["missing_required_field", "unparsable_value", "encoding_damage", "broken_reference", "duplicate_conflict", "validation_failed", "ambiguous_mapping", "low_confidence", "target_write_failed", "row_too_large"]>;
        blocking: z.ZodBoolean;
        fieldPath: z.ZodNullable<z.ZodString>;
        message: z.ZodString;
        suggestedFix: z.ZodNullable<z.ZodString>;
        resolution: z.ZodEnum<["open", "resolved_imported", "resolved_merged", "discarded"]>;
        sourceRowNumber: z.ZodNullable<z.ZodNumber>;
        sourceTable: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        id: string;
        reason: "missing_required_field" | "unparsable_value" | "encoding_damage" | "broken_reference" | "duplicate_conflict" | "validation_failed" | "ambiguous_mapping" | "low_confidence" | "target_write_failed" | "row_too_large";
        sourceTable: string | null;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        stagingRecordId: string | null;
        blocking: boolean;
        fieldPath: string | null;
        suggestedFix: string | null;
        resolution: "open" | "resolved_imported" | "resolved_merged" | "discarded";
        sourceRowNumber: number | null;
    }, {
        message: string;
        id: string;
        reason: "missing_required_field" | "unparsable_value" | "encoding_damage" | "broken_reference" | "duplicate_conflict" | "validation_failed" | "ambiguous_mapping" | "low_confidence" | "target_write_failed" | "row_too_large";
        sourceTable: string | null;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        stagingRecordId: string | null;
        blocking: boolean;
        fieldPath: string | null;
        suggestedFix: string | null;
        resolution: "open" | "resolved_imported" | "resolved_merged" | "discarded";
        sourceRowNumber: number | null;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    mapping: {
        sourceTable: string;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        warnings: string[];
        vendorProfile: string | null;
        columns: {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }[];
        unmappedColumns: string[];
    };
    run: {
        status: "completed" | "failed" | "queued" | "draft" | "staging" | "mapping" | "validated" | "loading" | "completed_with_quarantine" | "rolled_back";
        vendorProfile: string | null;
        sourceRows: number;
        runId: string;
        sourceName: string;
        sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
        dryRun: boolean;
        stagedRows: number;
        loadedRows: number;
        updatedRows: number;
        duplicateRows: number;
        quarantinedRows: number;
        skippedRows: number;
        llmCalls: number;
        llmRejectedSuggestions: number;
        startedAt: string | null;
        finishedAt: string | null;
        errorMessage: string | null;
    };
    reconciliation: {
        generatedAt: string;
        runId: string;
        balanced: boolean;
        checks: {
            code: string;
            expected: number;
            passed: boolean;
            title: string;
            actual: number;
            detail: string;
        }[];
        entityBreakdown: {
            quarantined: number;
            entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
            created: number;
            skipped: number;
            updated: number;
            sourceRows: number;
            duplicates: number;
        }[];
        sourceMoneyTotalRub: number | null;
        loadedMoneyTotalRub: number | null;
        quarantinedMoneyTotalRub: number | null;
    };
    quarantinePreview: {
        message: string;
        id: string;
        reason: "missing_required_field" | "unparsable_value" | "encoding_damage" | "broken_reference" | "duplicate_conflict" | "validation_failed" | "ambiguous_mapping" | "low_confidence" | "target_write_failed" | "row_too_large";
        sourceTable: string | null;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        stagingRecordId: string | null;
        blocking: boolean;
        fieldPath: string | null;
        suggestedFix: string | null;
        resolution: "open" | "resolved_imported" | "resolved_merged" | "discarded";
        sourceRowNumber: number | null;
    }[];
}, {
    mapping: {
        sourceTable: string;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        warnings: string[];
        vendorProfile: string | null;
        columns: {
            sourceColumn: string;
            decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
            confidence: number;
            targetField: "patient.birthDate" | "patient.externalId" | "patient.fullName" | "patient.lastName" | "patient.firstName" | "patient.middleName" | "patient.phone" | "patient.secondaryPhone" | "patient.email" | "patient.gender" | "patient.address" | "patient.notes" | "patient.status" | "patient.createdAt" | "doctor.externalId" | "doctor.fullName" | "doctor.specialty" | "doctor.phone" | "doctor.email" | "service.externalId" | "service.code" | "service.name" | "service.priceRub" | "appointment.externalId" | "appointment.patientRef" | "appointment.doctorRef" | "appointment.startsAt" | "appointment.endsAt" | "appointment.durationMinutes" | "appointment.status" | "appointment.reason" | "appointment.comment" | "visit.externalId" | "visit.patientRef" | "visit.appointmentRef" | "visit.date" | "visit.complaint" | "visit.anamnesis" | "visit.objectiveStatus" | "visit.diagnosis" | "visit.treatmentPlan" | "visit.doctorSummary" | "payment.externalId" | "payment.patientRef" | "payment.visitRef" | "payment.amountRub" | "payment.method" | "payment.status" | "payment.paidAt" | "payment.note" | "toothState.patientRef" | "toothState.toothCode" | "toothState.condition" | "toothState.note" | "ignore";
            rationale: string;
            sampleValues: string[];
        }[];
        unmappedColumns: string[];
    };
    run: {
        status: "completed" | "failed" | "queued" | "draft" | "staging" | "mapping" | "validated" | "loading" | "completed_with_quarantine" | "rolled_back";
        vendorProfile: string | null;
        sourceRows: number;
        runId: string;
        sourceName: string;
        sourceKind: "xml" | "delimited" | "spreadsheet" | "json" | "dbf" | "sql_dump" | "clipboard" | "free_text" | "api";
        dryRun: boolean;
        stagedRows: number;
        loadedRows: number;
        updatedRows: number;
        duplicateRows: number;
        quarantinedRows: number;
        skippedRows: number;
        llmCalls: number;
        llmRejectedSuggestions: number;
        startedAt: string | null;
        finishedAt: string | null;
        errorMessage: string | null;
    };
    reconciliation: {
        generatedAt: string;
        runId: string;
        balanced: boolean;
        checks: {
            code: string;
            expected: number;
            passed: boolean;
            title: string;
            actual: number;
            detail: string;
        }[];
        entityBreakdown: {
            quarantined: number;
            entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
            created: number;
            skipped: number;
            updated: number;
            sourceRows: number;
            duplicates: number;
        }[];
        sourceMoneyTotalRub: number | null;
        loadedMoneyTotalRub: number | null;
        quarantinedMoneyTotalRub: number | null;
    };
    quarantinePreview: {
        message: string;
        id: string;
        reason: "missing_required_field" | "unparsable_value" | "encoding_damage" | "broken_reference" | "duplicate_conflict" | "validation_failed" | "ambiguous_mapping" | "low_confidence" | "target_write_failed" | "row_too_large";
        sourceTable: string | null;
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        stagingRecordId: string | null;
        blocking: boolean;
        fieldPath: string | null;
        suggestedFix: string | null;
        resolution: "open" | "resolved_imported" | "resolved_merged" | "discarded";
        sourceRowNumber: number | null;
    }[];
}>;
export type MigrationRunResponse = z.infer<typeof migrationRunResponseSchema>;
export declare const migrationRollbackRequestSchema: z.ZodObject<{
    runId: z.ZodString;
    /**
     * Подтверждение оператора. Откат удаляет созданные переносом сущности, и
     * случайный повторный клик не должен этого делать.
     */
    confirm: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    confirm: true;
    runId: string;
}, {
    confirm: true;
    runId: string;
}>;
export type MigrationRollbackRequest = z.infer<typeof migrationRollbackRequestSchema>;
export declare const migrationRollbackResponseSchema: z.ZodObject<{
    runId: z.ZodString;
    status: z.ZodEnum<["draft", "staging", "mapping", "validated", "queued", "loading", "completed", "completed_with_quarantine", "failed", "rolled_back"]>;
    deletedByEntity: z.ZodArray<z.ZodObject<{
        entityKind: z.ZodEnum<["patient", "doctor", "service", "appointment", "visit", "payment", "treatment_plan", "tooth_state", "document", "unknown"]>;
        deleted: z.ZodNumber;
        /** Сущности, которые нельзя удалить: на них уже сослались после переноса. */
        retained: z.ZodNumber;
        retainedReason: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        deleted: number;
        retained: number;
        retainedReason: string | null;
    }, {
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        deleted: number;
        retained: number;
        retainedReason: string | null;
    }>, "many">;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    status: "completed" | "failed" | "queued" | "draft" | "staging" | "mapping" | "validated" | "loading" | "completed_with_quarantine" | "rolled_back";
    runId: string;
    deletedByEntity: {
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        deleted: number;
        retained: number;
        retainedReason: string | null;
    }[];
}, {
    message: string;
    status: "completed" | "failed" | "queued" | "draft" | "staging" | "mapping" | "validated" | "loading" | "completed_with_quarantine" | "rolled_back";
    runId: string;
    deletedByEntity: {
        entityKind: "service" | "payment" | "patient" | "unknown" | "treatment_plan" | "visit" | "appointment" | "doctor" | "document" | "tooth_state";
        deleted: number;
        retained: number;
        retainedReason: string | null;
    }[];
}>;
export type MigrationRollbackResponse = z.infer<typeof migrationRollbackResponseSchema>;
