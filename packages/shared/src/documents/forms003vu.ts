import { z } from "zod";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА № 003-В/у — ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ АМБУЛАТОРНОГО СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО
 * Приказ Минздрава РФ / Порядок выдачи медицинских выписок
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Хронологическая запись проведенного этапа лечения для выписки */
export const medicalExtractTreatmentStageSchema = z.object({
	treatmentDate: z.string().trim().min(10).max(32),
	toothOrAnatomicalArea: z.string().trim().min(1).max(64),
	diagnosisIcd10: z.string().trim().min(1).max(32),
	diagnosisText: z.string().trim().min(1).max(300),
	performedIntervention: z.string().trim().min(1).max(2000), // Описание процедуры и материалов
	anesthesiaUsed: z.string().trim().max(300).nullable().optional(),
	attendingDoctorFullName: z.string().trim().min(1).max(160),
});
export type MedicalExtractTreatmentStage = z.infer<typeof medicalExtractTreatmentStageSchema>;

/** Полный структурированный Payload формы № 003-В/у (Выписка) */
export const medicalCardExtract003vuPayloadSchema = z.object({
	formNumber: z.literal("003-В/у"),
	// Реквизиты медорганизации
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	clinicLicenseNumber: z.string().trim().max(64).nullable().optional(),
	clinicLicenseDate: z.string().trim().max(32).nullable().optional(),
	clinicLicenseIssuer: z.string().trim().max(240).nullable().optional(),
	// Номер и дата выдачи выписки
	extractRegistrationNumber: z.string().trim().min(1).max(64),
	extractIssueDate: z.string().trim().min(10).max(32),
	extractDestinationInstitution: z.string().trim().max(240).default("По месту требования"),
	// Данные пациента и амбулаторной карты
	medicalCardNumber: z.string().trim().min(1).max(64),
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientSex: z.enum(["male", "female"]).default("male"),
	patientAddress: z.string().trim().max(240).nullable().optional(),
	patientPhone: z.string().trim().max(64).nullable().optional(),
	// Период оказания помощи
	treatmentPeriodStartDate: z.string().trim().min(10).max(32),
	treatmentPeriodEndDate: z.string().trim().min(10).max(32),
	// Клинические диагнозы
	primaryDiagnosisText: z.string().trim().min(1).max(1000),
	primaryDiagnosisIcd10: z.string().trim().min(1).max(32),
	concomitantDiagnosisText: z.string().trim().max(1000).nullable().optional(),
	concomitantDiagnosisIcd10: z.string().trim().max(32).nullable().optional(),
	// Анамнез и данные обследования
	briefAnamnesisAndClinicalCourse: z.string().trim().min(1).max(3000),
	diagnosticStudiesSummary: z.string().trim().max(2000).default("Прицельная радиовизиография, ОПТГ: очагов периапикальной деструкции не выявлено, пломбирование каналов гомогенное до верхушки"),
	// Хронология выполненных вмешательств
	treatmentStagesTimeline: z.array(medicalExtractTreatmentStageSchema).default([]),
	// Состояние при выписке
	conditionAtDischarge: z.string().trim().min(1).max(2000).default("Лечение завершено в полном объеме. Жалоб нет. Анатомическая форма и жевательная функция зубов восстановлены, прикус физиологический. Слизистая оболочка полости рта бледно-розовая, без воспалительных явлений."),
	// Рекомендации и назначения
	followUpRecommendations: z.string().trim().min(1).max(2000).default("1. Соблюдение индивидуальной гигиены полости рта (щетка средней жесткости, зубная нить/ершики, ирригатор).\n2. Контрольный осмотр врача-стоматолога через 6 месяцев.\n3. Проведение профессиональной гигиены полости рта 2 раза в год."),
	warrantyConditions: z.string().trim().max(1000).default("Гарантийный срок на терапевтические реставрации — 12 месяцев при соблюдении условий регулярной гигиены и контрольных осмотров."),
	// Подписи
	attendingDoctorFullName: z.string().trim().min(1).max(160),
	attendingDoctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	headOfDepartmentFullName: z.string().trim().min(1).max(160).default("Главный врач клиники"),
});
export type MedicalCardExtract003vuPayload = z.infer<typeof medicalCardExtract003vuPayloadSchema>;
