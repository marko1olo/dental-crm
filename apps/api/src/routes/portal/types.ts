import { z } from "zod";

/**
 * Patient portal sessions for mobile PWA (per OWASP / 152-FZ / clinical security policy, <= 30 days).
 */
export const PORTAL_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days (2_592_000s)
export const PORTAL_TOKEN_KIND = "portal";

export const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 минут
export const OTP_MAX_REQUESTS_PER_IP = 5; // максимум 5 запросов с одного IP за 10 минут
export const OTP_MAX_REQUESTS_PER_PHONE = 3; // максимум 3 SMS на один номер за 10 минут

export const DEFAULT_OTP_SMS_TEMPLATE =
	"Код для входа в личный кабинет: {code}. Действует {minutes} мин. Никому не сообщайте его.";

export const PORTAL_ROLES = ["patient"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

export const OTP_EXPIRY_SECONDS = 300; // 5 минут (300с)

export const PORTAL_CONSENT_REGISTRY = [
	{
		id: "ids_treatment",
		code: "ИДС-ТЕР-01",
		titleRu: "Информированное добровольное согласие на терапевтическое лечение",
		categoryRu: "Терапия",
		statutoryBasis: "323-ФЗ ст. 20",
		summaryTextRu:
			"Согласие на проведение осмотра, инструментальной диагностики, анестезии и пломбирования кариозных полостей.",
	},
	{
		id: "ids_anesthesia",
		code: "ИДС-АНЕСТ-01",
		titleRu: "Информированное добровольное согласие на местное обезболивание",
		categoryRu: "Анестезия",
		statutoryBasis: "323-ФЗ ст. 20",
		summaryTextRu:
			"Согласие на инфильтрационную и проводниковую анестезию современными карпульными анестетиками с оценкой рисков.",
	},
	{
		id: "pd_152",
		code: "ПДН-152",
		titleRu: "Согласие на обработку персональных данных",
		categoryRu: "Персональные данные",
		statutoryBasis: "152-ФЗ",
		summaryTextRu:
			"Согласие на сбор, систематизацию, хранение и обработку персональных данных и медицинской тайны в рамках медпомощи.",
	},
] as const;

/** Настройки одноразового кода. Значения по умолчанию рабочие, но переопределяемы. */
export interface PortalOtpPolicy {
	readonly codeLength: number;
	readonly ttlSeconds: number;
	readonly maxAttempts: number;
	readonly resendCooldownSeconds: number;
	readonly maxPerWindow: number;
	readonly windowSeconds: number;
	readonly retentionSeconds: number;
	readonly smsTemplate: string;
}

export interface AuthenticatedPortalPatient {
	readonly patientId: string;
	readonly organizationId: string;
}

export const sendOtpBodySchema = z
	.object({
		phone: z.string().optional(),
		organizationId: z.string().optional(),
	})
	.strict();
export type SendOtpBody = z.infer<typeof sendOtpBodySchema>;

export const verifyOtpBodySchema = z
	.object({
		phone: z.string().optional(),
		code: z.string().optional(),
		organizationId: z.string().optional(),
	})
	.strict();
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;

export const selfCheckinBodySchema = z
	.object({
		organizationId: z.string().optional(),
		phoneLast4: z.string().optional(),
		patientPhone: z.string().optional(),
		patientId: z.string().optional(),
		checkinCode: z.string().optional(),
		signedConsents: z.array(z.string()).optional(),
		somaticProfile: z.record(z.string(), z.unknown()).optional(),
	})
	.strict();
export type SelfCheckinBody = z.infer<typeof selfCheckinBodySchema>;

export const signConsentBodySchema = z
	.object({
		signatureSvg: z.string().optional(),
		signatureMethod: z.string().optional(),
		consentKind: z.string().optional(),
		deviceMeta: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
		pepCode: z.string().optional(),
	})
	.strict();
export type SignConsentBody = z.infer<typeof signConsentBodySchema>;

export const healthQuestionnaireBodySchema = z
	.object({
		allergies: z
			.object({
				hasAllergies: z.boolean().optional(),
				localAnestheticsAllergy: z.boolean().optional(),
				antibioticsAllergy: z.boolean().optional(),
				sulfiteAllergy: z.boolean().optional(),
				latexAllergy: z.boolean().optional(),
				drugList: z.array(z.string()).optional(),
				details: z.string().optional(),
			})
			.strict()
			.optional(),
		cardiovascular: z
			.object({
				hasRisk: z.boolean().optional(),
				hypertension: z.boolean().optional(),
				arrhythmia: z.boolean().optional(),
				ischemicHeartDisease: z.boolean().optional(),
				heartAttackHistory: z.boolean().optional(),
				pacemaker: z.boolean().optional(),
				details: z.string().optional(),
			})
			.strict()
			.optional(),
		diabetes: z
			.object({
				hasDiabetes: z.boolean().optional(),
				type: z.enum(["type1", "type2"]).optional(),
				glucoseLevel: z.string().optional(),
				insulinDependent: z.boolean().optional(),
				details: z.string().optional(),
			})
			.strict()
			.optional(),
		coagulation: z
			.object({
				hasBleedingDisorder: z.boolean().optional(),
				onAnticoagulants: z.boolean().optional(),
				anticoagulantName: z.string().optional(),
				hemophilia: z.boolean().optional(),
				details: z.string().optional(),
			})
			.strict()
			.optional(),
		pregnancy: z
			.object({
				isPregnantOrLactating: z.boolean().optional(),
				trimester: z.number().optional(),
				weeks: z.number().optional(),
				lactating: z.boolean().optional(),
			})
			.strict()
			.optional(),
		infectious: z
			.object({
				hepatitisBOrC: z.boolean().optional(),
				hiv: z.boolean().optional(),
				tuberculosis: z.boolean().optional(),
				details: z.string().optional(),
			})
			.strict()
			.optional(),
		respiratory: z
			.object({
				bronchialAsthma: z.boolean().optional(),
				details: z.string().optional(),
			})
			.strict()
			.optional(),
		gastrointestinal: z
			.object({
				ulcerOrReflux: z.boolean().optional(),
			})
			.strict()
			.optional(),
		currentMedications: z.array(z.string()).optional(),
		additionalNotes: z.string().optional(),
	})
	.strict();
export type HealthQuestionnaireBody = z.infer<
	typeof healthQuestionnaireBodySchema
>;

export const selectTierBodySchema = z
	.object({
		tierId: z.string().optional(),
	})
	.strict();
export type SelectTierBody = z.infer<typeof selectTierBodySchema>;

export const approveTreatmentPlanBodySchema = z
	.object({
		pepCode: z.string().optional(),
		selectedTier: z.string().optional(),
	})
	.strict();
export type ApproveTreatmentPlanBody = z.infer<
	typeof approveTreatmentPlanBodySchema
>;

export const createSbpQrBodySchema = z
	.object({
		invoiceId: z.string().optional(),
		planId: z.string().optional(),
		stageId: z.string().optional(),
		amountRub: z.number().finite().positive().optional(),
	})
	.strict();
export type CreateSbpQrBody = z.infer<typeof createSbpQrBodySchema>;

export const createCardOrderBodySchema = z
	.object({
		invoiceId: z.string().min(1),
		stageId: z.string().optional(),
		amountRub: z.number().finite().positive().optional(),
	})
	.strict();
export type CreateCardOrderBody = z.infer<typeof createCardOrderBodySchema>;

export const confirmSbpBodySchema = z
	.object({
		invoiceId: z.string().optional(),
		stageId: z.string().optional(),
		amountRub: z.number().finite().positive().optional(),
		sbpTransactionId: z.string().optional(),
	})
	.strict();
export type ConfirmSbpBody = z.infer<typeof confirmSbpBodySchema>;

export const paymentStatusQuerySchema = z
	.object({
		invoiceNumber: z.string().optional(),
		invoiceId: z.string().optional(),
	})
	.strict();
export type PaymentStatusQuery = z.infer<typeof paymentStatusQuerySchema>;

export const bookAppointmentBodySchema = z
	.object({
		doctorId: z.string().optional(),
		startsAt: z.string().optional(),
		endsAt: z.string().optional(),
		reason: z.string().optional(),
		comment: z.string().optional(),
	})
	.strict();
export type BookAppointmentBody = z.infer<typeof bookAppointmentBodySchema>;

export const rescheduleAppointmentBodySchema = z
	.object({
		startsAt: z.string().optional(),
		endsAt: z.string().optional(),
		reason: z.string().optional(),
	})
	.strict();
export type RescheduleAppointmentBody = z.infer<
	typeof rescheduleAppointmentBodySchema
>;

export const cancelAppointmentBodySchema = z
	.object({
		reason: z.string().optional(),
	})
	.strict();
export type CancelAppointmentBody = z.infer<typeof cancelAppointmentBodySchema>;
