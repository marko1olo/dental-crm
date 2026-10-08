import { z } from "zod";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ТИПЫ И ZOD-СХЕМЫ РЕЦЕПТУРНЫХ БЛАНКОВ МИНЗДРАВА РФ (ПРИКАЗ № 1094н)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Допустимые типы бланков рецептов */
export const prescriptionFormTypeSchema = z.enum(["107-1u", "148-1u-88"]);
export type PrescriptionFormType = z.infer<typeof prescriptionFormTypeSchema>;

/** Сроки действия рецептов согласно Приказу Минздрава России № 1094н */
export const prescriptionValidityPeriodSchema = z.enum([
	"days_15", // 15 дней — бланки 148-1/у-88 (ПКУ), наркотические/психотропные
	"days_30", // 30 дней — льготные рецепты 148-1/у-04(л) стандартные
	"days_60", // 60 дней — бланки 107-1/у стандартные (2 месяца)
	"year_1",  // До 1 года — хронические больные с пометкой «По специальному назначению»
]);
export type PrescriptionValidityPeriod = z.infer<typeof prescriptionValidityPeriodSchema>;

/** Категории льготных граждан (для формы 148-1/у-04(л)) */
export const PREFERENTIAL_BENEFIT_CATEGORIES = [
	{ code: "010", nameRu: "Инвалиды войны", discountPercent: 100 },
	{ code: "020", nameRu: "Участники Великой Отечественной войны", discountPercent: 100 },
	{ code: "030", nameRu: "Ветераны боевых действий", discountPercent: 100 },
	{ code: "081", nameRu: "Инвалиды I группы", discountPercent: 100 },
	{ code: "082", nameRu: "Инвалиды II группы", discountPercent: 100 },
	{ code: "083", nameRu: "Инвалиды III группы (безработные)", discountPercent: 50 },
	{ code: "084", nameRu: "Дети-инвалиды", discountPercent: 100 },
	{ code: "701", nameRu: "Лица, подвергшиеся воздействию радиации (ЧАЭС)", discountPercent: 100 },
	{ code: "801", nameRu: "Дети первых трех лет жизни (из многодетных семей — до 6 лет)", discountPercent: 100 },
	{ code: "802", nameRu: "Пенсионеры, получающие пенсию по старости в минимальном размере", discountPercent: 50 },
	{ code: "901", nameRu: "Хронические заболевания (диабет, бронхиальная астма, онкология)", discountPercent: 100 },
] as const;


/** ═══════════════════════════════════════════════════════════════════════════
 * ZOD SCHEMAS ДЛЯ ВАЛИДАЦИИ РЕЦЕПТУРНЫХ БЛАНКОВ
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Отдельная пропись лекарственного препарата в рецепте */
export const prescriptionDrugItemSchema = z.object({
	id: z.string().trim().min(1).default(() => `drug-item-${Date.now()}`),
	latinName: z.string().trim().min(1).max(240), // "Rp.: Nimesulidi 100 mg"
	tradeName: z.string().trim().min(1).max(120), // "Нимесил"
	form: z.string().trim().min(1).max(120),      // "гранулы для приготовления суспензии"
	dosage: z.string().trim().min(1).max(80),    // "100 мг"
	quantity: z.string().trim().min(1).max(80),  // "N. 10"
	dispenseLatin: z.string().trim().min(1).max(200), // "D.t.d. N 10 in gran."
	signaRussian: z.string().trim().min(1).max(500),  // "S. Внутрь по 1 пакетику..."
	category: z.enum([
		"nsaid",
		"antibiotic",
		"controlled_pku",
		"antihistamine",
		"antiseptic",
		"corticosteroid",
		"hemostatic",
		"gastroprotective",
		"preferential_somatic",
		"other",
	]).default("nsaid"),
});
export type PrescriptionDrugItem = z.infer<typeof prescriptionDrugItemSchema>;

/** Реквизиты штампа медицинской организации */
export const prescriptionClinicStampSchema = z.object({
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicPhone: z.string().trim().max(64).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	medicalLicenseNumber: z.string().trim().max(64).nullable().optional(),
	medicalLicenseDate: z.string().trim().max(32).nullable().optional(),
});
export type PrescriptionClinicStamp = z.infer<typeof prescriptionClinicStampSchema>;

/** Электронная подпись врача (УКЭП) */
export const prescriptionDoctorUkepSchema = z.object({
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	doctorSnils: z.string().trim().max(32).nullable().optional(),
	certificateSerialNumber: z.string().trim().max(64).nullable().optional(),
	certificateThumbprint: z.string().trim().max(64).nullable().optional(),
	certificateIssuer: z.string().trim().max(160).nullable().optional(),
	certificateValidFrom: z.string().trim().max(32).nullable().optional(),
	certificateValidTo: z.string().trim().max(32).nullable().optional(),
	signedAt: z.string().trim().max(32).nullable().optional(),
	cryptoSignaturePkcs7: z.string().trim().min(1).nullable().optional(),
	signatureAlgorithm: z.string().trim().max(64).default("ГОСТ Р 34.10-2012 (256 бит)"),
	egiszDocumentId: z.string().trim().max(64).nullable().optional(),
	qrVerificationUrl: z.string().trim().max(256).nullable().optional(),
});
export type PrescriptionDoctorUkep = z.infer<typeof prescriptionDoctorUkepSchema>;

/** Реквизиты льготы (для формы 148-1/у-04(л)) */
export const prescriptionPreferentialDetailsSchema = z.object({
	preferentialBenefitCode: z.string().trim().min(1).max(16).default("081"), // Код категории (e.g. 081 - Инвалид I группы)
	preferentialBenefitNameRu: z.string().trim().max(160).default("Инвалиды I группы"),
	preferentialDiscountPercent: z.number().int().min(0).max(100).default(100), // 100% бесплатно / 50%
	patientSnils: z.string().trim().min(11).max(20), // 11-значный СНИЛС
	patientOmsPolicy: z.string().trim().min(16).max(20), // 16-значный полис ОМС
	fundingSource: z.enum(["federal", "regional", "municipal"]).default("federal"),
	medicalCardNumber: z.string().trim().min(1).max(64),
});
export type PrescriptionPreferentialDetails = z.infer<typeof prescriptionPreferentialDetailsSchema>;

/** Универсальный структурированный Payload рецептурного бланка (Формы 107-1/у, 148-1/у-88, 148-1/у-04(л)) */
export const form107_1uPayloadSchema = z.object({
	formNumber: z.literal("107-1/у").default("107-1/у"),
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicPhone: z.string().trim().max(64).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	medicalLicenseNumber: z.string().trim().max(64).nullable().optional(),
	prescriptionSeriesNumber: z.string().trim().min(1).max(64),
	prescriptionDate: z.string().trim().min(10).max(32),
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientAgeYears: z.number().int().min(0).max(130).nullable().optional(),
	medicalCardNumber: z.string().trim().min(1).max(64),
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	validityDays: z.enum(["15", "30", "60", "365"]).default("60"),
	isChronicSpecialCare: z.boolean().default(false),
	chronicPeriodicity: z.string().trim().max(120).nullable().optional(),
	items: z.array(prescriptionDrugItemSchema).min(1).max(3),
	diagnosisIcd10Code: z.string().trim().max(32).nullable().optional(),
	notes: z.string().trim().max(500).nullable().optional(),
	ukepSignature: prescriptionDoctorUkepSchema.nullable().optional(),
	withStampAndSignature: z.boolean().default(true).optional(),
});
export type Form107_1uPayload = z.infer<typeof form107_1uPayloadSchema>;

/** Payload рецептурного бланка строгой отчетности № 148-1/у-88 (ПКУ) */
export const form148_1u88PayloadSchema = z.object({
	formNumber: z.literal("148-1/у-88").default("148-1/у-88"),
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicPhone: z.string().trim().max(64).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	medicalLicenseNumber: z.string().trim().max(64).nullable().optional(),
	prescriptionSeriesNumber: z.string().trim().min(1).max(64),
	prescriptionDate: z.string().trim().min(10).max(32),
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientAddress: z.string().trim().min(5).max(240), // Обязательно для 148-1/у-88
	medicalCardNumber: z.string().trim().min(1).max(64),
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	headOfDepartmentFullName: z.string().trim().max(160).nullable().optional(),
	validityDays: z.literal("15").default("15"), // Строго 15 дней для ПКУ
	items: z.array(prescriptionDrugItemSchema).min(1).max(1), // Строго 1 препарат на бланк
	diagnosisIcd10Code: z.string().trim().max(32).nullable().optional(),
	notes: z.string().trim().max(500).nullable().optional(),
	ukepSignature: prescriptionDoctorUkepSchema.nullable().optional(),
});
export type Form148_1u88Payload = z.infer<typeof form148_1u88PayloadSchema>;

/** Payload льготного рецептурного бланка № 148-1/у-04(л) */
export const form148_1u04lPayloadSchema = z.object({
	formNumber: z.literal("148-1/у-04(л)").default("148-1/у-04(л)"),
	clinicLegalName: z.string().trim().min(1).max(240),
	clinicAddress: z.string().trim().max(240).nullable().optional(),
	clinicPhone: z.string().trim().max(64).nullable().optional(),
	clinicOgrn: z.string().trim().max(32).nullable().optional(),
	clinicInn: z.string().trim().max(16).nullable().optional(),
	medicalLicenseNumber: z.string().trim().max(64).nullable().optional(),
	prescriptionSeriesNumber: z.string().trim().min(1).max(64),
	prescriptionDate: z.string().trim().min(10).max(32),
	patientFullName: z.string().trim().min(1).max(160),
	patientBirthDate: z.string().trim().min(10).max(32),
	patientAddress: z.string().trim().max(240).nullable().optional(),
	medicalCardNumber: z.string().trim().min(1).max(64),
	preferentialDetails: prescriptionPreferentialDetailsSchema,
	doctorFullName: z.string().trim().min(1).max(160),
	doctorSpecialty: z.string().trim().max(120).default("Врач-стоматолог"),
	validityDays: z.enum(["15", "30", "60", "365"]).default("30"), // 30 дней стандарт, 15 дней наркотики, 365 хроники
	isChronicSpecialCare: z.boolean().default(false),
	chronicPeriodicity: z.string().trim().max(120).nullable().optional(),
	items: z.array(prescriptionDrugItemSchema).min(1).max(3),
	diagnosisIcd10Code: z.string().trim().max(32).nullable().optional(),
	notes: z.string().trim().max(500).nullable().optional(),
	ukepSignature: prescriptionDoctorUkepSchema.nullable().optional(),
});
export type Form148_1u04lPayload = z.infer<typeof form148_1u04lPayloadSchema>;

