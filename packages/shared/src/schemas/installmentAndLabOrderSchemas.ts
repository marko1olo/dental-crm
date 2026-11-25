import { z } from "zod";
import { documentDateLikeStringSchema } from "./speechProviderSchemas.js";
import { installmentPaymentStatusSchema } from "./telegramAndReceiptSchemas.js";
import { nonNegativeMoneyRubSchema, positiveMoneyRubSchema } from "../money.js";
import { isDateLikeString } from "../datetime/index.js";
import { legacyTaxDeductionCertificateMinYear, taxDeductionCertificateMinYear } from "../documents/index.js";
import { CLINICAL_TOOTH_STATE_VALUES } from "../clinical/clinicalDefectsCatalog.js";
import {
	CANONICAL_TOOTH_STATES,
	LEGACY_CLINICAL_TOOTH_STATUSES,
	toCanonicalToothState,
} from "../clinical/dentalFormulaStates.js";

export const installmentPaymentSchedulePayloadSchema = z.object({
	scheduleNumber: z.string().trim().min(1).max(120),
	scheduleDate: documentDateLikeStringSchema,
	baseDocumentTitle: z.string().trim().min(1).max(300),
	payerFullName: z.string().trim().min(1).max(240),
	/*
	 * График рассрочки. Здесь копейки не роскошь, а условие сходимости: 100 000 ₽
	 * на 3 платежа целыми рублями дают 33 333 × 3 = 99 999 — рубля не хватает, и
	 * пациент по графику остаётся должен. Точное деление уже написано:
	 * splitKopecks в packages/shared/src/money.ts раскидывает остаток по
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
			}).strict(),
		)
		.min(1)
		.max(36),
	latePaymentPolicy: z.string().trim().min(1).max(700),
	paymentMethodNotes: z.string().trim().min(1).max(700),
	responsibleStaffFullName: z.string().trim().min(1).max(240),
	patientAcceptedSchedule: z.literal(true),
	scheduleDoesNotReplaceFiscalReceipt: z.literal(true),
	changesRequireWrittenAgreement: z.literal(true),
}).strict();

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
}).strict();

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
}).strict();

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
	.strict()
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
}).strict();

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
}).strict();

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

export const canonicalToothStateSchema = z.enum(CANONICAL_TOOTH_STATES);

export const clinicalToothStatusSchema = z.enum([
	...CANONICAL_TOOTH_STATES,
	...LEGACY_CLINICAL_TOOTH_STATUSES,
]);

export type ClinicalToothStatus = z.infer<typeof clinicalToothStatusSchema>;

export const canonicalClinicalToothStatusSchema =
	clinicalToothStatusSchema.transform((status) =>
		toCanonicalToothState(status),
	);

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
}).strict();

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
}).strict();

export type PrescriptionMedicationRow = z.infer<
	typeof prescriptionMedicationRowSchema
>;

export const prescriptionMedicationPayloadSchema = z.object({
	clinicalToothRows: clinicalToothRowsSchema,
	medications: z.array(prescriptionMedicationRowSchema).min(1).max(10),
	safetyNotes: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
	urgentContactReason: z.string().trim().min(1).max(300),
}).strict();

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
}).strict();

export type LabWorkOrderPayload = z.infer<typeof labWorkOrderPayloadSchema>;

// ─── SSOT RE-EXPORTS FROM CANONICAL LAB MODULE (MANDATE 8bf) ─────────────────
export {
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	VITA_3D_MASTER_SHADES,
	ALL_VALID_VITA_SHADES,
	normalizeVitaShade,
	isValidVitaShade,
	VITA_SHADE_VALIDATION_MESSAGE,
	vitaShadeSchema,
	LAB_ORDER_MATERIALS,
	type LabOrderMaterialKey,
	LAB_ORDER_STATUS_LABELS,
	type LabOrderStatusKey,
} from "../lab/labOrders.js";
