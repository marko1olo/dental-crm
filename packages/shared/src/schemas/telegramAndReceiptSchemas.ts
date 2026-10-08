import { z } from "zod";
import { denteTelegramBotModeSchema, denteTelegramBotSettingsSchema, type DenteTelegramOutboxSendResponse } from "./communicationAndTasksSchemas.js";
import { staffRoleSchema } from "./aiAndEgiszSchemas.js";
import { documentDateLikeStringSchema, workspaceSectionSchema } from "./speechProviderSchemas.js";
import { visitStatusSchema } from "./documentMetaSchemas.js";
import { nonNegativeMoneyRubSchema, positiveMoneyRubSchema } from "../money.js";

export type DenteTelegramOutboxDeliveryReceipt = Pick<
	DenteTelegramOutboxSendResponse,
	| "status"
	| "outboxItem"
	| "taskId"
	| "eventId"
	| "telegramMessageId"
	| "clientMutationId"
	| "warnings"
	| "blockedReason"
> & {
	outboxItemId: string;
	createdAt: string;
};

export const denteTelegramUpdateKindSchema = z.enum([
	"command",
	"message",
	"callback_query",
	"voice",
	"photo",
	"document",
	"unsupported",
]);

export type DenteTelegramUpdateKind = z.infer<
	typeof denteTelegramUpdateKindSchema
>;

export const denteTelegramWebhookStatusSchema = z.enum([
	"processing",
	"processed",
	"duplicate",
	"ignored",
	"rejected",
]);

export type DenteTelegramWebhookStatus = z.infer<
	typeof denteTelegramWebhookStatusSchema
>;

export const denteTelegramWebhookEventSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	updateId: z.number().int().nonnegative(),
	botConfigId: z.string().min(1),
	chatFingerprint: z.string().nullable(),
	updateKind: denteTelegramUpdateKindSchema,
	command: z.string().max(64).nullable(),
	status: denteTelegramWebhookStatusSchema,
	action: z.string(),
	warnings: z.array(z.string()),
	createdAt: z.string(),
});

export type DenteTelegramWebhookEvent = z.infer<
	typeof denteTelegramWebhookEventSchema
>;

export const denteTelegramWebhookUpdateSchema = z
	.object({
		update_id: z.number().int().nonnegative(),
	})
	.passthrough();

export const denteTelegramBotStatusSchema = z.object({
	settings: denteTelegramBotSettingsSchema,
	organizationId: z.string().uuid(),
	clinicId: z.string().uuid(),
	botConfigId: z.string().min(1).max(160),
	mode: denteTelegramBotModeSchema,
	botUsername: z.string().nullable(),
	tokenConfigured: z.boolean(),
	webhookSecretConfigured: z.boolean(),
	webhookReady: z.boolean(),
	clinicOwnedBotReady: z.boolean(),
	warnings: z.array(z.string()),
	nextActions: z.array(z.string()),
	processedUpdateCount: z.number().int().nonnegative(),
	pendingLinkCodeCount: z.number().int().nonnegative(),
	activeChatLinkCount: z.number().int().nonnegative(),
	recentEvents: z.array(denteTelegramWebhookEventSchema),
});

export type DenteTelegramBotStatus = z.infer<
	typeof denteTelegramBotStatusSchema
>;

export const denteTelegramWebhookResponseSchema = z.object({
	ok: z.boolean(),
	duplicate: z.boolean(),
	action: z.string(),
	suggestedReply: z.string().nullable(),
	suggestedReplyMarkup: z.record(z.unknown()).nullable().default(null),
	suggestedPhotoUrl: z.string().url().nullable().default(null),
	warnings: z.array(z.string()),
	event: denteTelegramWebhookEventSchema.nullable(),
});

export type DenteTelegramWebhookResponse = z.infer<
	typeof denteTelegramWebhookResponseSchema
>;

export const communicationSummarySchema = z.object({
	openTasks: z.number().int().nonnegative(),
	urgentTasks: z.number().int().nonnegative(),
	dueToday: z.number().int().nonnegative(),
	overdue: z.number().int().nonnegative(),
	completedToday: z.number().int().nonnegative(),
	appointmentConfirmations: z.number().int().nonnegative(),
	paymentReminders: z.number().int().nonnegative(),
	postVisitInstructions: z.number().int().nonnegative(),
});

export type CommunicationSummary = z.infer<typeof communicationSummarySchema>;

export const recommendedActionPrioritySchema = z.enum([
	"routine",
	"important",
	"urgent",
]);

export type RecommendedActionPriority = z.infer<
	typeof recommendedActionPrioritySchema
>;

export const recommendedActionSchema = z.object({
	id: z.string(),
	role: staffRoleSchema,
	priority: recommendedActionPrioritySchema,
	section: workspaceSectionSchema,
	patientId: z.string().uuid().nullable(),
	title: z.string(),
	detail: z.string(),
	metricLabel: z.string(),
	actionLabel: z.string(),
	source: z.string(),
});

export type RecommendedAction = z.infer<typeof recommendedActionSchema>;

export const appointmentReadinessStateSchema = z.enum([
	"ready",
	"needs_attention",
	"blocked",
]);

export type AppointmentReadinessState = z.infer<
	typeof appointmentReadinessStateSchema
>;

export const appointmentReadinessCheckSchema = z.object({
	key: z.string(),
	title: z.string(),
	ready: z.boolean(),
	detail: z.string(),
});

export type AppointmentReadinessCheck = z.infer<
	typeof appointmentReadinessCheckSchema
>;

export const appointmentReadinessSchema = z.object({
	appointmentId: z.string().uuid(),
	patientId: z.string().uuid().nullable(),
	state: appointmentReadinessStateSchema,
	score: z.number().int().min(0).max(100),
	ownerRole: staffRoleSchema,
	nextAction: z.string(),
	blockers: z.array(z.string()),
	warnings: z.array(z.string()).default([]),
	checks: z.array(appointmentReadinessCheckSchema),
});

export type AppointmentReadiness = z.infer<typeof appointmentReadinessSchema>;

export const scheduleSuggestionSchema = z.object({
	id: z.string(),
	priority: recommendedActionPrioritySchema,
	ownerRole: staffRoleSchema,
	appointmentId: z.string().uuid().nullable(),
	section: workspaceSectionSchema,
	title: z.string(),
	detail: z.string(),
	actionLabel: z.string(),
	reason: z.string(),
});

export type ScheduleSuggestion = z.infer<typeof scheduleSuggestionSchema>;

export const visitCloseChecklistItemSchema = z.object({
	id: z.string(),
	visitId: z.string().uuid(),
	title: z.string(),
	detail: z.string(),
	ready: z.boolean(),
	blocking: z.boolean(),
	ownerRole: staffRoleSchema,
	section: workspaceSectionSchema,
	actionLabel: z.string(),
});

export type VisitCloseChecklistItem = z.infer<
	typeof visitCloseChecklistItemSchema
>;

export const visitCloseChecklistSchema = z.object({
	visitId: z.string().uuid(),
	readyToSign: z.boolean(),
	score: z.number().int().min(0).max(100),
	nextAction: z.string(),
	blockingItems: z.number().int().nonnegative(),
	items: z.array(visitCloseChecklistItemSchema),
});

export type VisitCloseChecklist = z.infer<typeof visitCloseChecklistSchema>;

export const visitSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	appointmentId: z.string().uuid().nullable(),
	status: visitStatusSchema,
	revision: z.number().int().nonnegative().default(1),
	complaint: z.string().nullable(),
	anamnesis: z.string().nullable(),
	objectiveStatus: z.string().nullable(),
	diagnosis: z.string().nullable(),
	treatmentPlan: z.string().nullable(),
	doctorSummary: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type Visit = z.infer<typeof visitSchema>;

export const patientIntakePregnancyStatusSchema = z.enum([
	"not_applicable",
	"denied",
	"possible",
	"confirmed",
	"lactation",
	"unknown",
]);

export type PatientIntakePregnancyStatus = z.infer<
	typeof patientIntakePregnancyStatusSchema
>;

export const patientIntakeQuestionnairePayloadSchema = z.object({
	chiefComplaint: z.string().trim().min(1).max(500),
	allergyStatus: z.string().trim().min(1).max(500),
	currentMedications: z.string().trim().min(1).max(500),
	chronicConditions: z.string().trim().min(1).max(700),
	pregnancyStatus: patientIntakePregnancyStatusSchema,
	anticoagulants: z.string().trim().min(1).max(400),
	infectiousRiskNotes: z.string().trim().min(1).max(500),
	cardioEndocrineNotes: z.string().trim().min(1).max(500),
	emergencyContact: z.string().trim().max(240).nullable().optional(),
	additionalNotes: z.string().trim().max(800).nullable().optional(),
	accuracyConfirmed: z.literal(true),
});

export type PatientIntakeQuestionnairePayload = z.infer<
	typeof patientIntakeQuestionnairePayloadSchema
>;

export const paidMedicalServicesContractPayloadSchema = z.object({
	contractNumber: z.string().trim().min(1).max(120),
	contractDate: documentDateLikeStringSchema,
	serviceStart: documentDateLikeStringSchema,
	serviceEndOrCondition: z.string().trim().min(1).max(240),
	customerFullName: z.string().trim().min(1).max(240),
	representativeFullName: z.string().trim().max(240).nullable().optional(),
	plannedCareReason: z.string().trim().min(1).max(700),
	serviceScopeSummary: z.string().trim().min(1).max(1400),
	/*
	 * Ориентировочная сумма договора берётся из плана лечения, а план теперь с
	 * копейками. Договор — документ, который пациент подписывает: сумма в нём
	 * обязана совпадать со сметой до копейки, иначе это два разных обязательства.
	 */
	estimatedTotalRub: nonNegativeMoneyRubSchema,
	paymentTerms: z.string().trim().min(1).max(800),
	priceChangeRules: z.string().trim().min(1).max(800),
	freeCareAvailabilityNotice: z.string().trim().min(1).max(800),
	medicalRecommendationWarning: z.string().trim().min(1).max(800),
	refusalAndRefundTerms: z.string().trim().min(1).max(800),
	warrantyAndClaimsTerms: z.string().trim().min(1).max(800),
	doctorFullName: z.string().trim().max(240).default(""),
	signedAt: documentDateLikeStringSchema,
	patientReceivedClinicInfo: z.literal(true),
	patientReceivedPriceAndServiceList: z.literal(true),
	patientUnderstandsPaidBasis: z.literal(true),
	changesRequireWrittenAgreement: z.literal(true),
});

export type PaidMedicalServicesContractPayload = z.infer<
	typeof paidMedicalServicesContractPayloadSchema
>;

export const completedWorksActPayloadSchema = z.object({
	actNumber: z.string().trim().min(1).max(120),
	actDate: documentDateLikeStringSchema,
	contractNumber: z.string().trim().min(1).max(120),
	linkedContractDocumentId: z.string().uuid(),
	servicePeriodStart: documentDateLikeStringSchema,
	servicePeriodEnd: documentDateLikeStringSchema,
	doctorFullName: z.string().trim().min(1).max(240),
	acceptedServicesSummary: z.string().trim().min(1).max(1200),
	/*
	 * Акт выполненных работ. paidRub сверяется с фактически оплаченным ТОЧНЫМ
	 * равенством (apps/api/src/documents/guards.ts, paidFactsTotalMismatchReason),
	 * а фактическая оплата с копейками существует уже сейчас: paymentSchema
	 * .amountRub принимает 1500,50. С int акт по такому платежу было невозможно
	 * ни создать, ни подписать — контракт отвергал единственно верную сумму.
	 */
	totalByActRub: nonNegativeMoneyRubSchema,
	paidRub: nonNegativeMoneyRubSchema,
	fiscalReceiptNumbers: z
		.array(z.string().trim().min(1).max(120))
		.min(1)
		.max(20),
	patientClaimsText: z.string().trim().max(1000).nullable().optional(),
	linkedToSignedContract: z.literal(true),
	finalServiceScopeConfirmed: z.literal(true),
	fiscalReceiptsVerified: z.literal(true),
	patientAcceptedWorks: z.literal(true),
});

export type CompletedWorksActPayload = z.infer<
	typeof completedWorksActPayloadSchema
>;

export const treatmentCostEstimatePayloadSchema = z.object({
	estimateNumber: z.string().trim().min(1).max(120),
	estimateDate: documentDateLikeStringSchema,
	patientOrPayerFullName: z.string().trim().min(1).max(240),
	treatmentBasis: z.string().trim().min(1).max(700),
	/*
	 * Строки сметы. Сервер уже считает и сверяет их с точностью до копейки:
	 * expectedFinancialLineTotal и financialLinesTotal в
	 * apps/api/src/documents/guards.ts округляют до двух знаков. То есть проверка
	 * ждала копейки, а контракт их не пропускал — смету по цене 1500,50 нельзя
	 * было составить вообще.
	 */
	serviceLines: z
		.array(
			z.object({
				serviceName: z.string().trim().min(1).max(300),
				toothOrArea: z.string().trim().max(160).nullable().optional(),
				quantity: z.number().int().positive().max(999),
				unitPriceRub: nonNegativeMoneyRubSchema,
				discountRub: nonNegativeMoneyRubSchema,
				totalRub: nonNegativeMoneyRubSchema,
			}),
		)
		.min(1)
		.max(80),
	totalAmountRub: positiveMoneyRubSchema,
	estimateValidUntil: documentDateLikeStringSchema,
	priceChangeRules: z.string().trim().min(1).max(900),
	excludedItems: z.array(z.string().trim().min(1).max(260)).min(1).max(20),
	paymentMilestoneNotes: z.string().trim().min(1).max(900),
	responsibleDoctorFullName: z.string().trim().min(1).max(240),
	responsibleAdminFullName: z.string().trim().max(240).nullable().optional(),
	signedAt: documentDateLikeStringSchema,
	patientUnderstandsPreliminaryEstimate: z.literal(true),
	serviceScopeMatchesTreatmentPlan: z.literal(true),
	estimateDoesNotReplaceContractOrFiscalReceipt: z.literal(true),
	changesRequireUpdatedEstimate: z.literal(true),
});

export type TreatmentCostEstimatePayload = z.infer<
	typeof treatmentCostEstimatePayloadSchema
>;

export const paymentInvoicePayloadSchema = z.object({
	invoiceNumber: z.string().trim().min(1).max(120),
	invoiceDate: documentDateLikeStringSchema,
	payerFullName: z.string().trim().min(1).max(240),
	payerPhone: z.string().trim().max(80).nullable().optional(),
	payerEmail: z.string().trim().max(240).nullable().optional(),
	paymentPurpose: z.string().trim().min(1).max(500),
	/* Строки счёта проверяются тем же кодом, что и строки сметы, — с копейками. */
	serviceLines: z
		.array(
			z.object({
				serviceName: z.string().trim().min(1).max(300),
				toothOrArea: z.string().trim().max(160).nullable().optional(),
				quantity: z.number().int().positive().max(999),
				unitPriceRub: nonNegativeMoneyRubSchema,
				discountRub: nonNegativeMoneyRubSchema,
				totalRub: nonNegativeMoneyRubSchema,
			}),
		)
		.min(1)
		.max(60),
	totalAmountRub: positiveMoneyRubSchema,
	dueDate: documentDateLikeStringSchema,
	paymentTerms: z.string().trim().min(1).max(700),
	clinicBankDetails: z.string().trim().min(1).max(1200),
	cashlessPaymentAllowed: z.boolean(),
	cashDeskPaymentAllowed: z.boolean(),
	qrPaymentPayload: z.string().trim().max(1000).nullable().optional(),
	clinicRequisitesVerified: z.literal(true),
	serviceScopeConfirmed: z.literal(true),
	payerInformedInvoiceIsNotFiscalReceipt: z.literal(true),
});

export type PaymentInvoicePayload = z.infer<typeof paymentInvoicePayloadSchema>;

export const paymentReceiptPayloadSchema = z
	.object({
		receiptNumber: z.string().trim().min(1).max(120),
		receiptDate: documentDateLikeStringSchema,
		selectedPaymentIds: z.array(z.string().uuid()).min(1).max(20),
		/*
		 * Квитанция об оплате — сумма ВЫБРАННЫХ платежей, ничего больше.
		 *
		 * Это была самая жёсткая точка обрыва: платёж на 1500,50 создать можно, а
		 * квитанцию на него — нет. Сервер требует точного совпадения с суммой
		 * платежей (guards.ts, paidFactsTotalMismatchReason), а контракт отвергал
		 * единственное значение, которое этому требованию удовлетворяло. Пациент
		 * оставался без документа об оплате.
		 */
		totalPaidRub: positiveMoneyRubSchema,
		payerFullName: z.string().trim().min(1).max(240),
		taxSupportRequested: z.boolean().default(false),
		payerBirthDate: documentDateLikeStringSchema.nullable().optional(),
		payerInn: z
			.string()
			.trim()
			.regex(/^$|^\d{10}$|^\d{12}$/)
			.nullable()
			.optional(),
		payerIdentityDocument: z.string().trim().max(240).nullable().optional(),
		payerRelationship: z.string().trim().max(160).nullable().optional(),
		paymentPurpose: z.string().trim().min(1).max(500),
		fiscalReceiptNumbers: z
			.array(z.string().trim().min(1).max(120))
			.min(1)
			.max(20),
		issuedByFullName: z.string().trim().min(1).max(240),
		paymentAndFiscalDataVerified: z.literal(true),
		payerIdentityVerified: z.literal(true),
		receiptDoesNotReplaceFiscalReceipt: z.literal(true),
	})
	.superRefine((value, context) => {
		if (
			new Set(value.selectedPaymentIds).size !== value.selectedPaymentIds.length
		) {
			context.addIssue({
				code: "custom",
				path: ["selectedPaymentIds"],
				message: "Выбранные платежи не должны повторяться.",
			});
		}
		const normalizedReceipts = value.fiscalReceiptNumbers.map((item) =>
			item.trim().replace(/\s+/g, " ").toLocaleUpperCase("ru-RU"),
		);
		if (new Set(normalizedReceipts).size !== normalizedReceipts.length) {
			context.addIssue({
				code: "custom",
				path: ["fiscalReceiptNumbers"],
				message: "Номера фискальных чеков не должны повторяться.",
			});
		}
		if (value.taxSupportRequested) {
			const payerInnDigits = value.payerInn?.replace(/\D+/g, "") ?? "";
			const hasIdentityDocument = Boolean(value.payerIdentityDocument?.trim());
			if (!value.payerBirthDate?.trim()) {
				context.addIssue({
					code: "custom",
					path: ["payerBirthDate"],
					message: "Для налоговой квитанции укажите дату рождения плательщика.",
				});
			}
			if (!value.payerRelationship?.trim()) {
				context.addIssue({
					code: "custom",
					path: ["payerRelationship"],
					message:
						"Для налоговой квитанции укажите связь плательщика с пациентом.",
				});
			}
			if (payerInnDigits.length !== 12 && !hasIdentityDocument) {
				context.addIssue({
					code: "custom",
					path: ["payerInn"],
					message:
						"Для налоговой квитанции укажите 12-значный ИНН плательщика или документ удостоверения личности.",
				});
			}
		}
	});

export type PaymentReceiptPayload = z.infer<typeof paymentReceiptPayloadSchema>;

export const installmentPaymentStatusSchema = z.enum([
	"planned",
	"paid",
	"overdue",
	"rescheduled",
	"cancelled",
]);

export type InstallmentPaymentStatus = z.infer<
	typeof installmentPaymentStatusSchema
>;
