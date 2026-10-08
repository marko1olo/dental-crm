import { z } from "zod";
import { documentDateLikeStringSchema } from "./speechProviderSchemas.js";
import { installmentPaymentStatusSchema } from "./telegramAndReceiptSchemas.js";
import { nonNegativeMoneyRubSchema, positiveMoneyRubSchema } from "../money.js";
import { isDateLikeString } from "../datetime/index.js";
import { legacyTaxDeductionCertificateMinYear, taxDeductionCertificateMinYear } from "../documents/index.js";
import { CLINICAL_TOOTH_STATE_VALUES } from "../clinical/stomtDefectsCatalog.js";

export const installmentPaymentSchedulePayloadSchema = z.object({
	scheduleNumber: z.string().trim().min(1).max(120),
	scheduleDate: documentDateLikeStringSchema,
	baseDocumentTitle: z.string().trim().min(1).max(300),
	payerFullName: z.string().trim().min(1).max(240),
	/*
	 * График рассрочки. Здесь копейки не роскошь, а условие сходимости: 100 000 ₽
	 * на 3 платежа целыми рублями дают 33 333 × 3 = 99 999 — рубля не хватает, и
	 * пациент по графику остаётся должен. Точное деление уже написано:
	 * splitKopecks в packages/shared/src/utils/money.ts раскидывает остаток по
	 * первым платежам, чтобы сумма частей РАВНЯЛАСЬ итогу.
	 */
	totalAmountRub: positiveMoneyRubSchema,
	prepaidAmountRub: nonNegativeMoneyRubSchema,
	remainingAmountRub: nonNegativeMoneyRubSchema,
	installments: z
		.array(
			z.object({
				label: z.string().trim().min(1).max(200),
				dueDate: documentDateLikeStringSchema,
				amountRub: positiveMoneyRubSchema,
				status: installmentPaymentStatusSchema,
			}),
		)
		.min(1)
		.max(36),
	latePaymentPolicy: z.string().trim().min(1).max(700),
	paymentMethodNotes: z.string().trim().min(1).max(700),
	responsibleStaffFullName: z.string().trim().min(1).max(240),
	patientAcceptedSchedule: z.literal(true),
	scheduleDoesNotReplaceFiscalReceipt: z.literal(true),
	changesRequireWrittenAgreement: z.literal(true),
});

export type InstallmentPaymentSchedulePayload = z.infer<
	typeof installmentPaymentSchedulePayloadSchema
>;

export const minorLegalRepresentativeConsentPayloadSchema = z.object({
	representativeFullName: z.string().trim().min(1).max(240),
	representativeRelationship: z.string().trim().min(1).max(160),
	representativeIdentityDocument: z.string().trim().min(1).max(240),
	authorityDocument: z.string().trim().min(1).max(300),
	representativePhone: z.string().trim().max(80).nullable().optional(),
	minorFullName: z.string().trim().min(1).max(240),
	minorBirthDate: documentDateLikeStringSchema,
	interventionScope: z.string().trim().min(1).max(700),
	diagnosisOrIndication: z.string().trim().min(1).max(700),
	explainedRisks: z.array(z.string().trim().min(1).max(240)).min(1).max(16),
	alternativesExplained: z
		.array(z.string().trim().min(1).max(240))
		.min(1)
		.max(12),
	doctorFullName: z.string().trim().min(1).max(240),
	signedAt: documentDateLikeStringSchema,
	representativeIdentityVerified: z.literal(true),
	representativeAuthorityVerified: z.literal(true),
	informedConsentExplained: z.literal(true),
	medicalRecordConsentStored: z.literal(true),
	ageAppropriateExplanationGiven: z.literal(true),
});

export type MinorLegalRepresentativeConsentPayload = z.infer<
	typeof minorLegalRepresentativeConsentPayloadSchema
>;

export const warrantyServiceMemoPayloadSchema = z.object({
	serviceOrWorkName: z.string().trim().min(1).max(500),
	completedAt: documentDateLikeStringSchema,
	teethOrArea: z.string().trim().min(1).max(240),
	materialsOrSystems: z.string().trim().min(1).max(700),
	warrantyPeriod: z.string().trim().min(1).max(300),
	controlVisitSchedule: z.string().trim().min(1).max(700),
	patientObligations: z.array(z.string().trim().min(1).max(240)).min(1).max(16),
	excludedRiskFactors: z
		.array(z.string().trim().min(1).max(240))
		.min(1)
		.max(16),
	urgentContactReasons: z
		.array(z.string().trim().min(1).max(240))
		.min(1)
		.max(16),
	linkedActOrContract: z.string().trim().min(1).max(300),
	doctorFullName: z.string().trim().min(1).max(240),
	issuedAt: documentDateLikeStringSchema,
	localWarrantyPolicyApplied: z.literal(true),
	patientReceivedAftercare: z.literal(true),
	patientUnderstandsControlVisits: z.literal(true),
});

export type WarrantyServiceMemoPayload = z.infer<
	typeof warrantyServiceMemoPayloadSchema
>;

export const taxDeductionApplicationRelationshipSchema = z.enum([
	"self",
	"spouse",
	"parent",
	"child",
	"ward",
]);

export type TaxDeductionApplicationRelationship = z.infer<
	typeof taxDeductionApplicationRelationshipSchema
>;

export const taxDeductionApplicationFormSchema = z.enum([
	"knd_1151156",
	"legacy_2021_2023",
]);

export type TaxDeductionApplicationForm = z.infer<
	typeof taxDeductionApplicationFormSchema
>;

export const taxDeductionApplicationDeliveryChannelSchema = z.enum([
	"paper",
	"pdf",
	"secure_link",
	"email",
	"portal",
	"other",
]);

export type TaxDeductionApplicationDeliveryChannel = z.infer<
	typeof taxDeductionApplicationDeliveryChannelSchema
>;

export const taxDateLikeStringSchema = z
	.string()
	.trim()
	.min(1)
	.max(80)
	.refine(
		isDateLikeString,
		"Укажите дату в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ.",
	);

export const taxDeductionApplicationPayloadSchema = z
	.object({
		taxpayerFullName: z.string().trim().min(1).max(240),
		taxpayerInn: z
			.string()
			.trim()
			.regex(/^$|^\d{10}$|^\d{12}$/),
		taxpayerBirthDate: taxDateLikeStringSchema,
		taxpayerIdentityDocument: z.string().trim().min(1).max(240),
		relationshipToPatient: taxDeductionApplicationRelationshipSchema,
		requestedTaxYear: z
			.number()
			.int()
			.min(legacyTaxDeductionCertificateMinYear)
			.max(2100),
		requestedForm: taxDeductionApplicationFormSchema,
		selectedPaymentIds: z.array(z.string().uuid()).max(200).default([]),
		deliveryChannel: taxDeductionApplicationDeliveryChannelSchema,
		contactForReadyDocument: z.string().trim().min(1).max(240),
		applicantAuthorityDocument: z
			.string()
			.trim()
			.max(300)
			.nullable()
			.optional(),
		requestedAt: taxDateLikeStringSchema,
		duplicateWarningAccepted: z.literal(true),
	})
	.superRefine((value, context) => {
		if (
			value.requestedForm === "legacy_2021_2023" &&
			!/^\d{10}$|^\d{12}$/.test(value.taxpayerInn)
		) {
			context.addIssue({
				code: "custom",
				path: ["taxpayerInn"],
				message:
					"Для старой налоговой справки нужен 10- или 12-значный ИНН налогоплательщика.",
			});
		}
		if (
			value.requestedForm === "knd_1151156" &&
			value.taxpayerInn &&
			!/^\d{12}$/.test(value.taxpayerInn)
		) {
			context.addIssue({
				code: "custom",
				path: ["taxpayerInn"],
				message:
					"Для заявления на КНД 1151156 нужен 12-значный ИНН физического лица.",
			});
		}
		if (
			value.requestedTaxYear < taxDeductionCertificateMinYear &&
			value.requestedForm !== "legacy_2021_2023"
		) {
			context.addIssue({
				code: "custom",
				path: ["requestedForm"],
				message: "Для налоговых лет до 2024 нужна старая форма 2021-2023.",
			});
		}
		if (
			value.requestedTaxYear >= taxDeductionCertificateMinYear &&
			value.requestedForm !== "knd_1151156"
		) {
			context.addIssue({
				code: "custom",
				path: ["requestedForm"],
				message: "Для налоговых лет с 2024 нужна справка КНД 1151156.",
			});
		}
		if (
			value.relationshipToPatient !== "self" &&
			!value.applicantAuthorityDocument?.trim()
		) {
			context.addIssue({
				code: "custom",
				path: ["applicantAuthorityDocument"],
				message:
					"Для заявления представителя нужен документ, подтверждающий полномочия.",
			});
		}
	});

export type TaxDeductionApplicationPayload = z.infer<
	typeof taxDeductionApplicationPayloadSchema
>;

export const taxPaymentSelectionPayloadSchema = z
	.object({
		selectedPaymentIds: z.array(z.string().uuid()).min(1).max(200),
	})
	.strict();

export type TaxPaymentSelectionPayload = z.infer<
	typeof taxPaymentSelectionPayloadSchema
>;

export const anesthesiaDoseRowSchema = z.object({
	time: z.string().trim().min(1).max(40),
	medication: z.string().trim().min(1).max(120),
	doseMl: z.string().trim().min(1).max(40),
	zone: z.string().trim().min(1).max(160),
	reaction: z.string().trim().max(240).nullable().optional(),
});

export type AnesthesiaDoseRow = z.infer<typeof anesthesiaDoseRowSchema>;

export const anesthesiaConsentPayloadSchema = z.object({
	method: z.string().trim().min(1).max(160),
	anesthetic: z.string().trim().min(1).max(160),
	vasoconstrictor: z.string().trim().max(120).nullable().optional(),
	plannedZone: z.string().trim().min(1).max(160),
	allergyStatus: z.string().trim().min(1).max(240),
	restrictionNotes: z.string().trim().max(500).nullable().optional(),
	doseRows: z.array(anesthesiaDoseRowSchema).min(1).max(8),
	patientAnesthesiaRisksExplained: z.literal(true),
	allergyAndRestrictionStatusChecked: z.literal(true),
	patientConfirmedAnesthesiaConsent: z.literal(true),
});

export type AnesthesiaConsentPayload = z.infer<
	typeof anesthesiaConsentPayloadSchema
>;

export const clinicalToothSurfaceSchema = z.enum([
	"occlusal",
	"mesial",
	"distal",
	"buccal",
	"lingual",
	"palatal",
	"incisal",
	"root",
	"implant_site",
	"not_applicable",
]);

export type ClinicalToothSurface = z.infer<typeof clinicalToothSurfaceSchema>;

export const clinicalToothStatusSchema = z.enum([
	"sound",
	"watch",
	"caries",
	"pulpitis_periodontitis",
	"periodontal",
	"missing",
	"implant",
	"prosthetic",
	"orthodontic",
	"planned",
	"completed",
	"other",
]);

export type ClinicalToothStatus = z.infer<typeof clinicalToothStatusSchema>;

export const clinicalToothStateSchema = z.enum(CLINICAL_TOOTH_STATE_VALUES);

export const clinicalToothRowSchema = z.object({
	toothOrArea: z.string().trim().min(1).max(80),
	surfaces: z.array(clinicalToothSurfaceSchema).min(1).max(8),
	status: clinicalToothStatusSchema,
	diagnosisOrFinding: z.string().trim().min(1).max(500),
	indication: z.string().trim().min(1).max(500),
	plannedAction: z.string().trim().min(1).max(500),
	prognosis: z.string().trim().max(300).nullable().optional(),
	periodontalStatus: z.string().trim().max(300).nullable().optional(),
	implantOrProstheticNotes: z.string().trim().max(300).nullable().optional(),
	orthodonticNotes: z.string().trim().max(300).nullable().optional(),
});

export type ClinicalToothRow = z.infer<typeof clinicalToothRowSchema>;

export const clinicalToothRowsSchema = z
	.array(clinicalToothRowSchema)
	.min(1)
	.max(64);

export const VALID_FDI_TOOTH_NUMBERS: ReadonlySet<number> = new Set<number>([
	// Постоянные зубы
	11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33,
	34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
	// Молочные зубы
	51, 52, 53, 54, 55, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 81, 82, 83, 84,
	85,
	// Сверхкомплектные зубы (ISO 3950 / FDI Supernumerary)
	91, 92, 93, 94, 95, 96, 97, 98,
]);

export const FDI_TOOTH_NUMBER_MESSAGE =
	"Недопустимый номер зуба. Система FDI: 11–18, 21–28, 31–38, 41–48 (постоянные), 51–55, 61–65, 71–75, 81–85 (молочные), 91–98 (сверхкомплектные).";

export function isValidFdiToothNumber(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		VALID_FDI_TOOTH_NUMBERS.has(value)
	);
}

export const fdiToothNumberSchema = z
	.number()
	.int()
	.refine((value) => VALID_FDI_TOOTH_NUMBERS.has(value), {
		message: FDI_TOOTH_NUMBER_MESSAGE,
	});

export const prescriptionMedicationRowSchema = z.object({
	medication: z.string().trim().min(1).max(160),
	dosage: z.string().trim().min(1).max(160),
	instructions: z.string().trim().min(1).max(300),
	duration: z.string().trim().min(1).max(120),
});

export type PrescriptionMedicationRow = z.infer<
	typeof prescriptionMedicationRowSchema
>;

export const prescriptionMedicationPayloadSchema = z.object({
	clinicalToothRows: clinicalToothRowsSchema,
	medications: z.array(prescriptionMedicationRowSchema).min(1).max(10),
	safetyNotes: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
	urgentContactReason: z.string().trim().min(1).max(300),
});

export type PrescriptionMedicationPayload = z.infer<
	typeof prescriptionMedicationPayloadSchema
>;

export const labWorkOrderPayloadSchema = z.object({
	clinicalToothRows: clinicalToothRowsSchema,
	workType: z.string().trim().min(1).max(160),
	teethOrArea: z.string().trim().min(1).max(160),
	material: z.string().trim().min(1).max(160),
	shade: z.string().trim().min(1).max(120),
	source: z.string().trim().min(1).max(200),
	deadline: z.string().trim().min(1).max(120),
	technicianNotes: z.string().trim().max(800).nullable().optional(),
});

export type LabWorkOrderPayload = z.infer<typeof labWorkOrderPayloadSchema>;

export const VITA_CLASSICAL_SHADES = [
	"A1",
	"A2",
	"A3",
	"A3.5",
	"A4",
	"B1",
	"B2",
	"B3",
	"B4",
	"C1",
	"C2",
	"C3",
	"C4",
	"D2",
	"D3",
	"D4",
] as const;

export const VITA_BLEACH_SHADES = [
	"0M1",
	"0M2",
	"0M3",
	"BL1",
	"BL2",
	"BL3",
	"BL4",
	"OM1",
	"OM2",
	"OM3",
] as const;

export const VITA_3D_MASTER_SHADES = [
	"1M1",
	"1M2",
	"2L1.5",
	"2L2.5",
	"2M1",
	"2M2",
	"2M3",
	"2R1.5",
	"2R2.5",
	"3L1.5",
	"3L2.5",
	"3M1",
	"3M2",
	"3M3",
	"3R1.5",
	"3R2.5",
	"4L1.5",
	"4L2.5",
	"4M1",
	"4M2",
	"4M3",
	"4R1.5",
	"4R2.5",
	"5M1",
	"5M2",
	"5M3",
] as const;

export const ALL_VALID_VITA_SHADES: ReadonlySet<string> = new Set<string>([
	...VITA_CLASSICAL_SHADES,
	...VITA_BLEACH_SHADES,
	...VITA_3D_MASTER_SHADES,
]);

export function normalizeVitaShade(shade: string): string {
	if (!shade) return "";
	let s = shade.trim().toUpperCase();

	// Transliterate Cyrillic homoglyphs using explicit Unicode code points:
	// \u0410: А -> A, \u0412: В -> B, \u0411: Б -> B, \u0421: С -> C, \u0414: Д -> D,
	// \u041C: М -> M, \u0420: Р -> R, \u041B: Л -> L, \u041E: О -> O
	s = s
		.replace(/\u0410/g, "A")
		.replace(/\u0412/g, "B")
		.replace(/\u0411/g, "B")
		.replace(/\u0421/g, "C")
		.replace(/\u0414/g, "D")
		.replace(/\u041C/g, "M")
		.replace(/\u0420/g, "R")
		.replace(/\u041B/g, "L")
		.replace(/\u041E/g, "O");

	// Strip extraneous punctuation, hyphens, and whitespace
	s = s.replace(/[\s\-_]+/g, "");

	// Normalize decimal comma to dot
	s = s.replace(/,/g, ".");

	// Canonicalize OM1-OM3 (letter O) to 0M1-0M3 (digit 0)
	if (/^OM[1-3]$/.test(s)) {
		s = "0" + s.slice(1);
	}

	return s;
}

export function isValidVitaShade(shade: string): boolean {
	if (!shade) return false;
	return ALL_VALID_VITA_SHADES.has(normalizeVitaShade(shade));
}

export const VITA_SHADE_VALIDATION_MESSAGE =
	"Недопустимый оттенок зуба. Используйте стандарт VITA Classical (A1–D4), VITA 3D-Master (1M1–5M3) или Bleach (0M1–0M3, BL1–BL4).";

export const vitaShadeSchema = z
	.string()
	.trim()
	.transform((val) => normalizeVitaShade(val))
	.refine((val) => ALL_VALID_VITA_SHADES.has(val), {
		message: VITA_SHADE_VALIDATION_MESSAGE,
	});

export const LAB_ORDER_MATERIALS = {
	zirconia_multilayer: "Диоксид циркония многослойный (Multi-layer)",
	zirconia_ht: "Диоксид циркония высокопрозрачный (HT/ST)",
	emax_cad: "Литий-дисиликатная керамика (IPS e.max CAD)",
	emax_press: "Пресс-керамика (IPS e.max Press)",
	pfm: "Металлокерамика (PFM / CoCr/NiCr)",
	pmma_temp: "Временная пластмасса PMMA (CAD/CAM)",
	composite: "Композит лабораторный (Nano-hybrid)",
	titanium_abutment: "Индивидуальный титановый абатмент",
	cocr_framework: "Литой/фрезерованный бюгельный каркас (CoCr)",
	peek: "Биополимер PEEK / BioHPP",
} as const;

export type LabOrderMaterialKey = keyof typeof LAB_ORDER_MATERIALS;

export const LAB_ORDER_STATUS_LABELS = {
	draft: "Черновик",
	sent: "Отправлен в лабораторию",
	in_progress: "В работе у техника",
	shipped: "Отправлен в клинику",
	received: "Получен клиникой",
	refitting: "На примерке / доработке",
	completed: "Установлен / завершен",
	cancelled: "Отменен",
} as const;

export type LabOrderStatusKey = keyof typeof LAB_ORDER_STATUS_LABELS;
