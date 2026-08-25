/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ZOD SCHEMAS FOR EGISZ REMD CDA R2 & UKEP (МИНЗДРАВ РФ)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

export const personNameSchema = z.object({
	first: z.string().min(1, "Имя обязательно"),
	last: z.string().min(1, "Фамилия обязательна"),
	middle: z.string().optional(),
});

export const identityDocumentSchema = z.object({
	typeCode: z.string().default("1"), // 1 = Паспорт РФ, 10 = Иностранный паспорт
	series: z.string().optional(),
	number: z.string().min(1, "Номер документа обязателен"),
	issuedBy: z.string().optional(),
	issueDate: z.string().optional(),
});

export const patientCdaSchema = z.object({
	patientId: z.string().min(1),
	name: personNameSchema,
	snils: z.string().nullable().optional(),
	birthDate: z.string().nullable(),
	gender: z.enum(["male", "female", "other"]).nullable(),
	polisOms: z.string().nullable().optional(),
	polisDms: z.string().nullable().optional(),
	identityDoc: identityDocumentSchema.nullable().optional(),
	address: z.string().nullable().optional(),
	addressFias: z.string().nullable().optional(),
	phone: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
	isForeignCitizen: z.boolean().optional().default(false),
});

export const doctorCdaSchema = z.object({
	name: personNameSchema,
	snils: z.string().optional(),
	position: z.string().optional(),
	positionCode: z.string().optional(), // NSI 1.2.643.5.1.13.13.11.1002
	specialtyCode: z.string().optional(), // NSI 1.2.643.5.1.13.13.11.1066
	specialtyName: z.string().optional(),
	phone: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
});

export const clinicCdaSchema = z.object({
	name: z.string().min(1, "Наименование клиники обязательно"),
	oid: z.string().optional(), // FRMO 1.2.643.5.1.13.13.12.2.*
	ogrn: z.string().nullable().optional(),
	inn: z.string().nullable().optional(),
	kpp: z.string().nullable().optional(),
	licenseNumber: z.string().nullable().optional(),
	licenseDate: z.string().nullable().optional(),
	address: z.string().nullable().optional(),
	legalAddress: z.string().nullable().optional(),
	addressFias: z.string().nullable().optional(),
	phone: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
});

export const legalAuthenticatorCdaSchema = z.object({
	name: personNameSchema.optional(),
	snils: z.string().optional(),
	position: z.string().optional(),
	positionCode: z.string().optional(),
	time: z.preprocess((v) => {
		if (v === undefined || v === null || v === "") return undefined;
		const d = v instanceof Date ? v : new Date(String(v));
		return Number.isNaN(d.getTime()) ? undefined : d;
	}, z.date().optional()),
});

export const dentalToothSurfaceSchema = z.enum([
	"V",
	"L",
	"O",
	"M",
	"D",
	"B",
	"P",
	"I",
	"R",
	"vestibular",
	"lingual",
	"palatal",
	"occlusal",
	"incisal",
	"mesial",
	"distal",
	"root",
	"buccal",
]);

export const dentalStatusItemSchema = z.object({
	tooth: z.union([z.string(), z.number()]),
	surfaces: z.union([z.array(z.string()), z.string()]).optional(),
	condition: z.string().min(1),
	conditionCode: z.string().optional(),
	conditionName: z.string().optional(),
	description: z.string().optional(),
});

export const diagnosisItemSchema = z.object({
	icd10Code: z.string().min(1),
	diagnosisText: z.string().min(1),
	tooth: z.union([z.string(), z.number()]).optional(),
	isPrimary: z.boolean().optional().default(false),
});

export const serviceRenderedItemSchema = z.object({
	code: z.string().min(1),
	name: z.string().min(1),
	quantity: z.number().positive().optional().default(1),
	tooth: z.union([z.string(), z.number()]).optional(),
	priceRubKopecks: z.number().int().nonnegative().optional(),
	serviceCategoryCode: z.enum(["1", "2"]).optional().default("1"),
	completedAt: z.union([z.date(), z.string()]).optional(),
});

export const taxPaymentRecordItemSchema = z.object({
	fiscalReceiptNumber: z.string().min(1),
	fiscalReceiptDate: z.string().min(1),
	paymentAmountKopecks: z.number().int().positive(),
	serviceCategoryCode: z.enum(["1", "2"]).default("1"),
	contractNumber: z.string().optional(),
	contractDate: z.string().optional(),
	patientFullName: z.string().optional(),
});

export const taxpayerInfoSchema = z.object({
	fullName: z.string().min(1),
	snils: z.string().optional(),
	inn: z.string().optional(),
	birthDate: z.string().optional(),
	relationToPatient: z.enum(["1", "2", "3", "4"]).default("1"),
});

// ─── СЭМД 101 / 043/у: Протокол консультации стоматолога ───────────────────

export const cdaSemd101Schema = z.object({
	docKind: z.enum(["101", "043u", "108"]).default("101"),
	documentId: z.string().min(1),
	documentVersion: z.number().int().positive().optional().default(1),
	documentTime: z.preprocess((v) => {
		if (!v) return undefined;
		const d = v instanceof Date ? v : new Date(String(v));
		return Number.isNaN(d.getTime()) ? undefined : d;
	}, z.date().optional()),
	visitDate: z.coerce.date(),
	encounterId: z.string().optional(),
	documentSetId: z.string().optional(),
	replacesDocumentId: z.string().optional(),

	patient: patientCdaSchema,
	doctor: doctorCdaSchema,
	clinic: clinicCdaSchema,
	legalAuthenticator: legalAuthenticatorCdaSchema.optional(),

	complaints: z.string().optional(),
	anamnesis: z.string().optional(),
	anamnesisVitae: z.string().optional(),

	dentalStatus: z.array(dentalStatusItemSchema).optional(),
	objectiveStatus: z.string().optional(),

	diagnoses: z.array(diagnosisItemSchema).min(1, "Требуется минимум один диагноз по МКБ-10"),

	services: z.array(serviceRenderedItemSchema).optional(),
	treatmentDescription: z.string().optional(),

	recommendations: z.union([z.string(), z.array(z.string())]).optional(),

	complications: z.string().optional(),
	comorbidities: z.string().optional(),
	instrumentTrayBarcode: z.string().optional(),
});

// ─── СЭМД 104: Эпикриз стоматологический ────────────────────────────────────

export const cdaSemd104Schema = z.object({
	docKind: z.literal("104").default("104"),
	documentId: z.string().min(1),
	documentVersion: z.number().int().positive().optional().default(1),
	documentTime: z.preprocess((v) => {
		if (!v) return undefined;
		const d = v instanceof Date ? v : new Date(String(v));
		return Number.isNaN(d.getTime()) ? undefined : d;
	}, z.date().optional()),
	visitDate: z.coerce.date(),
	admissionDate: z.coerce.date().optional(),
	dischargeDate: z.coerce.date().optional(),
	encounterId: z.string().optional(),
	documentSetId: z.string().optional(),
	replacesDocumentId: z.string().optional(),

	patient: patientCdaSchema,
	doctor: doctorCdaSchema,
	clinic: clinicCdaSchema,
	legalAuthenticator: legalAuthenticatorCdaSchema.optional(),

	admissionDiagnoses: z.array(diagnosisItemSchema).optional(),
	dischargeDiagnoses: z.array(diagnosisItemSchema).min(1, "Требуется минимум один выписной диагноз"),

	anamnesis: z.string().optional(),
	clinicalCourse: z.string().optional(),

	initialDentalStatus: z.array(dentalStatusItemSchema).optional(),
	finalDentalStatus: z.array(dentalStatusItemSchema).optional(),
	objectiveStatus: z.string().optional(),

	servicesRendered: z.array(serviceRenderedItemSchema).default([]),
	surgeryProtocol: z.string().optional(),
	anesthesiaProtocol: z.string().optional(),
	radiologyStudiesSummary: z.string().optional(),

	epicrisisText: z.string().min(1, "Текст эпикриза обязателен"),
	outcomeCode: z.enum(["recovery", "improvement", "unchanged"]).optional(),
	outcomeName: z.string().optional(),
	recommendations: z.union([z.string(), z.array(z.string())]),
	nextFollowupDate: z.union([z.string(), z.date()]).optional(),
});

// ─── СЭМД 130: Справка об оплате медицинских услуг ─────────────────────────

export const cdaSemd130Schema = z.object({
	docKind: z.literal("130").default("130"),
	documentId: z.string().min(1),
	documentVersion: z.number().int().positive().optional().default(1),
	documentTime: z.preprocess((v) => {
		if (!v) return undefined;
		const d = v instanceof Date ? v : new Date(String(v));
		return Number.isNaN(d.getTime()) ? undefined : d;
	}, z.date().optional()),
	issueDate: z.coerce.date(),
	taxYear: z.number().int().min(2020).max(2035),
	certificateNumber: z.string().min(1),

	patient: patientCdaSchema,
	taxpayer: taxpayerInfoSchema,
	doctor: doctorCdaSchema,
	clinic: clinicCdaSchema,
	legalAuthenticator: legalAuthenticatorCdaSchema.optional(),

	contractNumber: z.string().min(1),
	contractDate: z.string().min(1),

	paymentRecords: z.array(taxPaymentRecordItemSchema).min(1, "Требуется минимум одна запись об оплате"),

	totalOrdinaryTreatmentKopecks: z.number().int().nonnegative(),
	totalExpensiveTreatmentKopecks: z.number().int().nonnegative(),
	totalSumKopecks: z.number().int().positive(),
});

export const cdaSemd043uSchema = cdaSemd101Schema;
export const cdaSemd108Schema = cdaSemd101Schema;

export const cdaDocumentParamsSchema = z.union([
	cdaSemd101Schema,
	cdaSemd104Schema,
	cdaSemd130Schema,
]);

// ─── Отсоединенная подпись и пакет РЭМД ────────────────────────────────────

export const detachedSignatureSchema = z.object({
	signatureBase64: z.string().min(1, "Подпись Base64 обязательна"),
	certificateSerialNumber: z.string().min(1, "Серийный номер сертификата обязателен"),
	certificateSubject: z.string().min(1, "Владелец сертификата обязателен"),
	certificateIssuer: z.string().optional(),
	validFrom: z.string().optional(),
	validTo: z.string().optional(),
	signedAt: z.string().datetime({ message: "Время подписания должно быть в формате ISO 8601" }),
	algorithmOid: z.string().default("1.2.643.7.1.1.1.1"),
	digestAlgorithmOid: z.string().optional(),
	signatureValueHex: z.string().optional(),
});

export const egiszRemdPackageSchema = z.object({
	documentId: z.string(),
	documentVersion: z.number().int().positive(),
	docTypeNsiCode: z.string(),
	xmlCanonicalPayload: z.string().min(1),
	doctorSignature: detachedSignatureSchema,
	moSignature: detachedSignatureSchema.optional(),
	metadata: z.object({
		patientSnils: z.string().optional(),
		clinicOid: z.string().min(1),
		clinicOgrn: z.string().optional(),
		docTypeNsiCode: z.string(),
	}),
});
