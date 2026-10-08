import { z } from "zod";
import { clinicSettingsSchema, documentDateLikeStringSchema } from "./speechProviderSchemas.js";
import { medicalRecordCopyRequestFormatSchema } from "./labOrderAndSterilizationSchemas.js";
import { documentIssueSignatureAttestationSchema, documentReleaseJournalEntrySchema, documentStatusSchema, documentVoidAttestationSchema, generatedDocumentSchema } from "./paymentRefundAndGeneratedDocSchemas.js";
import { documentSourceStatusSchema } from "./documentMetaSchemas.js";
import { imagingSourceKindSchema, imagingStudyKindSchema, speechProviderSchema } from "./aiAndEgiszSchemas.js";
import { billingSummarySchema, clinicalRuleEvaluationSchema, clinicalRuleSchema, clinicalRuleSummarySchema, communicationTemplateSchema, protocolTemplateSchema, serviceCatalogItemSchema, shiftIntelligenceSchema, treatmentPlanItemSchema, treatmentPlanScenarioSchema } from "./clinicSettingsSchemas.js";
import { appointmentReadinessSchema, communicationSummarySchema, recommendedActionSchema, scheduleSuggestionSchema, visitCloseChecklistSchema, visitSchema } from "./telegramAndReceiptSchemas.js";
import { communicationEventSchema, communicationTaskSchema } from "./communicationAndTasksSchemas.js";
import { documentKindSchema } from "../documents/index.js";
import { patientInsightSchema, patientSchema } from "../patients/index.js";
import { appointmentSchema } from "../schedule/index.js";
import { paymentSchema } from "../fiscal/index.js";
import { nonNegativeMoneyRubSchema } from "../money.js";

export const documentChainSummarySchema = z
	.object({
		paidMedicalServicesContract: z
			.object({
				contractNumber: z.string().trim().min(1).max(120),
				contractDate: documentDateLikeStringSchema,
			})
			.optional(),
		medicalRecordCopyRequest: z
			.object({
				requestedDocumentTypes: z
					.array(z.string().trim().min(1).max(180))
					.min(1)
					.max(20),
				periodStart: z.string().trim().max(40).nullable().optional(),
				periodEnd: z.string().trim().max(40).nullable().optional(),
				requestedFormat: medicalRecordCopyRequestFormatSchema,
				recipientFullName: z.string().trim().min(1).max(240),
				recipientIdentityDocument: z.string().trim().min(1).max(240),
				recipientAuthority: z.string().trim().min(1).max(300),
				representativeAuthorityDocument: z
					.string()
					.trim()
					.max(300)
					.nullable()
					.optional(),
			})
			.optional(),
	})
	.strict();

export type DocumentChainSummary = z.infer<typeof documentChainSummarySchema>;

export const publicGeneratedDocumentSchema = generatedDocumentSchema
	.omit({
		storagePath: true,
		payload: true,
		taxPaymentSnapshot: true,
		taxXmlSourceSnapshot: true,
		taxXmlSnapshot: true,
	})
	.extend({ chainSummary: documentChainSummarySchema.nullable().optional() });

export type PublicGeneratedDocument = z.infer<
	typeof publicGeneratedDocumentSchema
>;

export const documentAuditFactsSchema = z.object({
	documentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	visitId: z.string().uuid().nullable(),
	kind: documentKindSchema,
	title: z.string(),
	status: documentStatusSchema,
	issuedAt: z.string().nullable(),
	issuedByUserId: z.string().uuid().nullable(),
	signatureAttestation: documentIssueSignatureAttestationSchema.nullable(),
	voidAttestation: documentVoidAttestationSchema.nullable(),
	releaseJournalEntry: documentReleaseJournalEntrySchema.nullable(),
	generatedAt: z.string(),
	snapshotSha256: z
		.string()
		.regex(/^[a-f0-9]{64}$/)
		.nullable(),
	snapshotCreatedAt: z.string().nullable(),
	immutableSnapshotReady: z.boolean(),
	canPreviewHtml: z.boolean(),
	canDownloadHtml: z.boolean(),
	canExportPdf: z.boolean(),
	canExportFnsXml: z.boolean(),
	htmlPreviewUrl: z.string(),
	htmlDownloadUrl: z.string().nullable(),
	pdfDownloadUrl: z.string().nullable(),
	taxXmlDownloadUrl: z.string().nullable(),
	taxXmlSourceSnapshotSha256: z
		.string()
		.regex(/^[a-f0-9]{64}$/)
		.nullable(),
	taxXmlSnapshotSha256: z
		.string()
		.regex(/^[a-f0-9]{64}$/)
		.nullable(),
	taxXmlSnapshotCreatedAt: z.string().nullable(),
	taxXmlOfficialValidationStatus: z.enum([
		"not_applicable",
		"external_validation_required",
	]),
	taxXmlOfficialValidationNote: z.string().nullable(),
	sourceStatus: documentSourceStatusSchema,
	sourceAuthority: z.string(),
	sourceReference: z.string(),
	sourceNote: z.string(),
	sourceCheckedAt: z.string(),
	sourceUrls: z.array(z.string().url()),
	blockers: z.array(z.string()),
	warnings: z.array(z.string()),
	cryptoSignaturePkcs7: z.string().nullable().optional(),
	doctorCertSerial: z.string().nullable().optional(),
	doctorCertSubject: z.string().nullable().optional(),
	doctorSignedAt: z.string().nullable().optional(),
});

export type DocumentAuditFacts = z.infer<typeof documentAuditFactsSchema>;

export const imagingStudyBindingStatusSchema = z.enum([
	"auto_bound",
	"manual_bound",
	"pending_review",
	"unassigned",
]);

export type ImagingStudyBindingStatus = z.infer<
	typeof imagingStudyBindingStatusSchema
>;

export const imagingStudyStatusSchema = z.enum([
	"available",
	"needs_review",
	"failed",
]);

export type ImagingStudyStatus = z.infer<typeof imagingStudyStatusSchema>;

export const imagingStudySchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid().nullable(),
	visitId: z.string().uuid().nullable(),
	doctorId: z.string().uuid().nullable().optional(),
	kind: imagingStudyKindSchema,
	title: z.string(),
	toothCode: z.string().nullable(),
	region: z.string().nullable(),
	capturedAt: z.string(),
	sourceKind: imagingSourceKindSchema,
	sourceName: z.string(),
	storagePath: z.string().nullable().optional(),
	dicomStudyUid: z.string().nullable().optional(),
	studyInstanceUid: z.string().nullable().optional(),
	seriesInstanceUid: z.string().nullable().optional(),
	archivePath: z.string().nullable().optional(),
	unpackedFolderPath: z.string().nullable().optional(),
	modality: z.string().nullable().optional(),
	seriesDescription: z.string().nullable().optional(),
	studyDate: z.string().nullable().optional(),
	sliceCount: z.number().int().nullable().optional(),
	dimensions: z.string().nullable().optional(),
	voxelSpacing: z.string().nullable().optional(),
	fileSizeBytes: z.number().int().nullable().optional(),
	bindingStatus: imagingStudyBindingStatusSchema.optional(),
	bindingConfidence: z.number().int().min(0).max(100).optional(),
	dicomPatientName: z.string().nullable().optional(),
	dicomPatientId: z.string().nullable().optional(),
	dicomBirthDate: z.string().nullable().optional(),
	patientFullName: z.string().nullable().optional(),
	status: imagingStudyStatusSchema,
	aiSummary: z.string().nullable(),
	previewUrl: z.string(),
	viewerUrl: z.string().nullable(),
});

export type ImagingStudy = z.infer<typeof imagingStudySchema>;

export const importBatchSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	sourceName: z.string(),
	status: z.enum(["previewed", "completed", "completed_with_skips", "failed"]),
	totalRows: z.number().int().nonnegative(),
	importedRows: z.number().int().nonnegative(),
	skippedRows: z.number().int().nonnegative(),
	warningRows: z.number().int().nonnegative(),
	blockedRows: z.number().int().nonnegative(),
	createdAt: z.string(),
});

export type ImportBatch = z.infer<typeof importBatchSchema>;

export const auditEventSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid().nullable(),
	entityType: z.string(),
	entityId: z.string(),
	action: z.string(),
	reason: z.string().nullable(),
	createdAt: z.string(),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;

export const dashboardSchema = z.object({
	clinicName: z.string(),
	todayIso: z.string(),
	clinicSettings: clinicSettingsSchema,
	shiftIntelligence: shiftIntelligenceSchema,
	patients: z.array(patientSchema),
	patientInsights: z.array(patientInsightSchema),
	recommendedActions: z.array(recommendedActionSchema),
	appointments: z.array(appointmentSchema),
	appointmentReadiness: z.array(appointmentReadinessSchema),
	scheduleSuggestions: z.array(scheduleSuggestionSchema),
	/*
	 * `null` — ОТКРЫТОГО ПРИЁМА В КЛИНИКЕ НЕТ, И КОНТРАКТ ОБЯЗАН УМЕТЬ ЭТО СКАЗАТЬ.
	 *
	 * Было `visitSchema` без `.nullable()`, а `visitSchema.id` — `z.string().uuid()`,
	 * который не принимает ни `null`, ни пустую строку. То есть сказать «приёма нет»
	 * контракт физически не мог, и сервер говорил это единственным доступным ему
	 * способом — выдумывал приём: `id` и `patientId` из нулей, `status: "draft"`,
	 * `revision: 1`. Строки с таким идентификатором в базе нет ни одной.
	 *
	 * Нулевой ууид — НЕПУСТАЯ строка, поэтому клиентские сторожа
	 * `if (!dashboard?.activeVisit?.id) return;` его пропускали, и выдумка уезжала
	 * дальше как настоящий приём: касса отвечала «Прием для оплаты не найден» на
	 * нажатие «Принять оплату», а лента снимков была пуста всегда, пока приём не
	 * начат — врач не мог открыть ни прошлогоднюю ОПТГ, ни только что загруженный
	 * снимок. Это тот же запрещённый класс, что и неизвестное, напечатанное нулём
	 * (`apps/api/src/tests/unknownIsNotZero.test.ts`), только напечатали не сумму
	 * денег, а идентификатор записи.
	 *
	 * Поле остаётся ОБЯЗАТЕЛЬНЫМ, а не `.optional()`: `null` — это утверждение
	 * «приёма нет», отсутствие поля — молчание, которое не отличить от «сервер не
	 * посчитал».
	 */
	activeVisit: visitSchema.nullable(),
	visitCloseChecklist: visitCloseChecklistSchema,
	documents: z.array(publicGeneratedDocumentSchema),
	imagingStudies: z.array(imagingStudySchema),
	protocolTemplates: z.array(protocolTemplateSchema),
	serviceCatalog: z.array(serviceCatalogItemSchema),
	treatmentPlanItems: z.array(treatmentPlanItemSchema),
	treatmentPlanScenarios: z.array(treatmentPlanScenarioSchema),
	clinicalRules: z.array(clinicalRuleSchema),
	clinicalRuleEvaluations: z.array(clinicalRuleEvaluationSchema),
	clinicalRuleSummary: clinicalRuleSummarySchema,
	payments: z.array(paymentSchema),
	billingSummary: billingSummarySchema,
	communicationTemplates: z.array(communicationTemplateSchema),
	communicationTasks: z.array(communicationTaskSchema),
	communicationEvents: z.array(communicationEventSchema),
	communicationSummary: communicationSummarySchema,
	importBatches: z.array(importBatchSchema),
	speechProviders: z.array(speechProviderSchema),
	auditEvents: z.array(auditEventSchema),
	complianceWarnings: z.array(z.string()),
	insuranceContracts: z.array(z.any()).optional(),
});

export type Dashboard = z.infer<typeof dashboardSchema>;

export const insuranceContractSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	companyName: z.string().trim().min(1),
	policyNumberMask: z.string().trim().nullable().optional(),
	coverageTherapyPct: z.number().min(0).max(100),
	coverageSurgeryPct: z.number().min(0).max(100),
	coverageOrthoPct: z.number().min(0).max(100),
	coverageHygienePct: z.number().min(0).max(100),
	annualLimitRub: z.number().min(0).nullable().optional(),
	isActive: z.boolean().default(true),
	createdAt: z.string().or(z.date()).optional(),
});

export type InsuranceContract = z.infer<typeof insuranceContractSchema>;

export const insuranceCalculationItemSchema = z.object({
	serviceId: z.string().uuid().or(z.string().min(1)),
	serviceName: z.string().trim().optional(),
	category: z.enum([
		"consultation",
		"therapy",
		"surgery",
		"prosthetics",
		"orthodontics",
		"periodontology",
		"hygiene",
		"imaging",
		"documents",
		"other",
	]),
	priceRub: nonNegativeMoneyRubSchema,
	quantity: z.number().int().min(1).default(1),
});

export type InsuranceCalculationItem = z.infer<typeof insuranceCalculationItemSchema>;

export const insuranceCoverageCalculationInputSchema = z.object({
	contractId: z.string().uuid(),
	usedAnnualAmountRub: nonNegativeMoneyRubSchema.default(0),
	items: z.array(insuranceCalculationItemSchema).min(1),
});

export type InsuranceCoverageCalculationInput = z.infer<
	typeof insuranceCoverageCalculationInputSchema
>;

export const insuranceItemBreakdownSchema = z.object({
	serviceId: z.string(),
	serviceName: z.string().optional(),
	category: z.string(),
	quantity: z.number(),
	unitPriceRub: z.number(),
	totalPriceRub: z.number(),
	coveragePct: z.number(),
	coveredAmountRub: z.number(),
	patientCoPayRub: z.number(),
});

export type InsuranceItemBreakdown = z.infer<typeof insuranceItemBreakdownSchema>;

export const insuranceCoverageCalculationResultSchema = z.object({
	contractId: z.string().uuid(),
	companyName: z.string(),
	totalPriceRub: z.number(),
	totalCoveredRub: z.number(),
	totalPatientCoPayRub: z.number(),
	annualLimitRub: z.number().nullable(),
	usedAnnualAmountRub: z.number(),
	remainingAnnualLimitRub: z.number().nullable(),
	itemBreakdown: z.array(insuranceItemBreakdownSchema),
});

export type InsuranceCoverageCalculationResult = z.infer<
	typeof insuranceCoverageCalculationResultSchema
>;

export function calculateDmsCoverage(
	contract: Pick<
		InsuranceContract,
		| "id"
		| "companyName"
		| "coverageTherapyPct"
		| "coverageSurgeryPct"
		| "coverageOrthoPct"
		| "coverageHygienePct"
		| "annualLimitRub"
	>,
	items: readonly InsuranceCalculationItem[],
	usedAnnualAmountRub: number = 0,
): InsuranceCoverageCalculationResult {
	const annualLimitKopecks =
		contract.annualLimitRub != null && Number.isFinite(contract.annualLimitRub)
			? Math.round(contract.annualLimitRub * 100)
			: null;
	const usedKopecks = Math.max(0, Math.round(usedAnnualAmountRub * 100));

	let availableLimitKopecks =
		annualLimitKopecks != null
			? Math.max(0, annualLimitKopecks - usedKopecks)
			: null;

	let totalBillKopecks = 0;
	let totalCoveredKopecks = 0;
	let totalCoPayKopecks = 0;

	const breakdown: InsuranceItemBreakdown[] = [];

	for (const item of items) {
		const unitPriceKopecks = Math.round(item.priceRub * 100);
		const lineTotalKopecks = unitPriceKopecks * item.quantity;
		totalBillKopecks += lineTotalKopecks;

		let pct = 0;
		switch (item.category) {
			case "therapy":
				pct = Number(contract.coverageTherapyPct) || 0;
				break;
			case "surgery":
				pct = Number(contract.coverageSurgeryPct) || 0;
				break;
			case "orthodontics":
			case "prosthetics":
				pct = Number(contract.coverageOrthoPct) || 0;
				break;
			case "hygiene":
			case "periodontology":
				pct = Number(contract.coverageHygienePct) || 0;
				break;
			case "consultation":
			case "imaging":
				pct = 100;
				break;
			case "documents":
			case "other":
			default:
				pct = 0;
				break;
		}
		pct = Math.min(100, Math.max(0, pct));

		let candidateCoveredKopecks = Math.round(lineTotalKopecks * (pct / 100));

		if (availableLimitKopecks != null) {
			const allowedByCap = Math.min(
				candidateCoveredKopecks,
				availableLimitKopecks,
			);
			candidateCoveredKopecks = allowedByCap;
			availableLimitKopecks -= allowedByCap;
		}

		const itemCoPayKopecks = lineTotalKopecks - candidateCoveredKopecks;

		totalCoveredKopecks += candidateCoveredKopecks;
		totalCoPayKopecks += itemCoPayKopecks;

		breakdown.push({
			serviceId: item.serviceId,
			serviceName: item.serviceName,
			category: item.category,
			quantity: item.quantity,
			unitPriceRub: unitPriceKopecks / 100,
			totalPriceRub: lineTotalKopecks / 100,
			coveragePct: pct,
			coveredAmountRub: candidateCoveredKopecks / 100,
			patientCoPayRub: itemCoPayKopecks / 100,
		});
	}

	return {
		contractId: contract.id,
		companyName: contract.companyName,
		totalPriceRub: totalBillKopecks / 100,
		totalCoveredRub: totalCoveredKopecks / 100,
		totalPatientCoPayRub: totalCoPayKopecks / 100,
		annualLimitRub: contract.annualLimitRub ?? null,
		usedAnnualAmountRub: usedKopecks / 100,
		remainingAnnualLimitRub:
			availableLimitKopecks != null ? availableLimitKopecks / 100 : null,
		itemBreakdown: breakdown,
	};
}

export const dmsGuaranteeLetterStatusSchema = z.enum([
	"active",
	"exhausted",
	"expired",
	"cancelled",
]);

export type DmsGuaranteeLetterStatus = z.infer<typeof dmsGuaranteeLetterStatusSchema>;

export const dmsGuaranteeLetterSchema = z.object({
	id: z.string().uuid().or(z.string().min(1)),
	organizationId: z.string().uuid().optional(),
	contractId: z.string().uuid().nullable().optional(),
	patientId: z.string().uuid().or(z.string().min(1)),
	patientFullName: z.string().trim().min(1),
	patientBirthDate: z.string().nullable().optional(),
	policyNumber: z.string().trim().min(1),
	insurerKey: z.string().trim().optional(),
	insurerName: z.string().trim().min(1),
	letterNumber: z.string().trim().min(1),
	issueDate: z.string().min(1),
	validFrom: z.string().min(1),
	validUntil: z.string().min(1),
	maxCoverageRub: nonNegativeMoneyRubSchema,
	usedAmountRub: nonNegativeMoneyRubSchema.default(0),
	franchisePct: z.number().min(0).max(100).default(0),
	franchiseType: z.enum(["none", "percent", "fixed_rub"]).default("none"),
	franchiseFixedRub: nonNegativeMoneyRubSchema.default(0),
	programExclusions: z.array(z.string()).default([]),
	approvedServiceCodes: z.array(z.string()).default([]),
	approvedTeethFdi: z.array(z.string()).default([]),
	approvedDiagnosisCodes: z.array(z.string()).default([]),
	curatorFullName: z.string().trim().nullable().optional(),
	curatorPhone: z.string().trim().nullable().optional(),
	notes: z.string().trim().default(""),
	status: dmsGuaranteeLetterStatusSchema.default("active"),
	createdAt: z.string().or(z.date()).optional(),
	updatedAt: z.string().or(z.date()).optional(),
});

export type DmsGuaranteeLetter = z.infer<typeof dmsGuaranteeLetterSchema>;

export const dmsGuaranteeLetterCreateSchema = dmsGuaranteeLetterSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
}).extend({
	id: z.string().optional(),
});

export type DmsGuaranteeLetterCreate = z.infer<typeof dmsGuaranteeLetterCreateSchema>;

export const dmsGuaranteeLetterUpdateSchema = dmsGuaranteeLetterSchema.partial().extend({
	id: z.string().min(1),
});

export type DmsGuaranteeLetterUpdate = z.infer<typeof dmsGuaranteeLetterUpdateSchema>;

export const dmsSplitCalculationItemSchema = z.object({
	serviceId: z.string().min(1),
	serviceCode: z.string().trim().optional(),
	serviceName: z.string().trim().optional(),
	category: z.enum([
		"consultation",
		"therapy",
		"surgery",
		"prosthetics",
		"orthodontics",
		"periodontology",
		"hygiene",
		"imaging",
		"documents",
		"other",
	]).default("other"),
	toothNumber: z.string().or(z.number()).optional(),
	diagnosisCodeMkb10: z.string().optional(),
	priceRub: nonNegativeMoneyRubSchema,
	quantity: z.number().int().min(1).default(1),
	discountRub: nonNegativeMoneyRubSchema.optional().default(0),
	isExcluded: z.boolean().optional(),
	isExplicitlyApproved: z.boolean().optional(),
});
