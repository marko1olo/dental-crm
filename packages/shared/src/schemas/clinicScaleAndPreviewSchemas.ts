import { z } from "zod";
import { clinicScheduleDefaultsSchema, nullableDocumentDateLikeStringSchema, staffWorkingHoursSchema, timeZoneSchema } from "./speechProviderSchemas.js";
import { communicationTaskOutcomeSchema, dentalSpecialtySchema, imagingSourceKindSchema, imagingStudyKindSchema, staffRoleSchema } from "./aiAndEgiszSchemas.js";
import { documentPayloadDisallowedKeys, documentPayloadSchema } from "./paymentRefundAndGeneratedDocSchemas.js";
import { documentKindMetadata } from "./documentSourceSchemas.js";
import { documentKindSchema, legacyTaxDeductionCertificateMinYear } from "../documents/index.js";
import { nonNegativeMoneyRubSchema } from "../money.js";
import { fiscalReceiptDetailsSchema, fiscalReceiptUrlSchema, paymentMethodSchema, strictFiscalReceiptIssuedAtSchema } from "../fiscal/index.js";
import { birthDateInputSchema } from "../patients/index.js";
import { isDateLikeString } from "../datetime/index.js";

export const updateClinicProfileSchema = z.object({
	clinicName: z.string().trim().min(1).max(240).optional(),
	legalName: z.string().trim().max(240).nullable().optional(),
	inn: z
		.string()
		.trim()
		.regex(/^\d{10}$|^\d{12}$/)
		.nullable()
		.optional(),
	kpp: z
		.string()
		.trim()
		.regex(/^\d{9}$/)
		.nullable()
		.optional(),
	ogrn: z
		.string()
		.trim()
		.regex(/^\d{13}$|^\d{15}$/)
		.nullable()
		.optional(),
	address: z.string().trim().max(500).nullable().optional(),
	phone: z.string().trim().max(80).nullable().optional(),
	email: z.string().trim().email().max(240).nullable().optional(),
	website: z.string().trim().max(300).nullable().optional(),
	medicalLicenseNumber: z.string().trim().max(160).nullable().optional(),
	medicalLicenseIssuedAt: nullableDocumentDateLikeStringSchema,
	medicalLicenseIssuer: z.string().trim().max(400).nullable().optional(),
	bankDetails: z.string().trim().max(1000).nullable().optional(),
	signatoryName: z.string().trim().max(240).nullable().optional(),
	signatoryTitle: z.string().trim().max(180).nullable().optional(),
	timezone: timeZoneSchema.optional(),
	defaultVisitMinutes: z.number().int().positive().max(480).optional(),
	scheduleDefaults: clinicScheduleDefaultsSchema.optional(),
	egiszEnabled: z.boolean().optional(),
	logoUrl: z.string().trim().max(2000).nullable().optional(),
	stampUrl: z.string().trim().max(2000).nullable().optional(),
});

export type UpdateClinicProfileInput = z.infer<
	typeof updateClinicProfileSchema
>;

export const createStaffMemberSchema = z.object({
	fullName: z.string().trim().min(1).max(240),
	role: staffRoleSchema,
	specialties: z.array(dentalSpecialtySchema).min(1).default(["universal"]),
	phone: z.string().trim().max(80).nullable().optional(),
	email: z.string().trim().email().max(240).nullable().optional(),
	snils: z.string().trim().max(30).nullable().optional(),
	inn: z.string().trim().max(30).nullable().optional(),
	workingHours: staffWorkingHoursSchema.nullable().optional(),
});

export type CreateStaffMemberInput = z.infer<typeof createStaffMemberSchema>;

export const updateStaffWorkingHoursSchema = z.object({
	workingHours: staffWorkingHoursSchema,
});

export type UpdateStaffWorkingHoursInput = z.infer<
	typeof updateStaffWorkingHoursSchema
>;

export const staffAuthorityFlagsSchema = z.object({
	canSignMedicalRecords: z.boolean(),
	canManageMoney: z.boolean(),
	canManageImports: z.boolean(),
});

export type StaffAuthorityFlagsDto = z.infer<typeof staffAuthorityFlagsSchema>;

export const staffAuthorityFlagKeys = [
	"canSignMedicalRecords",
	"canManageMoney",
	"canManageImports",
] as const;

export type StaffAuthorityFlagKey = (typeof staffAuthorityFlagKeys)[number];

export const updateStaffAuthorityGrantsSchema = z.object({
	canSignMedicalRecords: z.boolean().optional(),
	canManageMoney: z.boolean().optional(),
	canManageImports: z.boolean().optional(),
});

export type UpdateStaffAuthorityGrantsInput = z.infer<
	typeof updateStaffAuthorityGrantsSchema
>;

export const staffAuthorityStateSchema = z.object({
	staffId: z.string().uuid(),
	role: z.string(),
	roleDerived: staffAuthorityFlagsSchema,
	grants: staffAuthorityFlagsSchema,
	effective: staffAuthorityFlagsSchema,
});

export type StaffAuthorityState = z.infer<typeof staffAuthorityStateSchema>;

export const updateChairWorkingHoursSchema = z.object({
	workingHours: staffWorkingHoursSchema,
});

export type UpdateChairWorkingHoursInput = z.infer<
	typeof updateChairWorkingHoursSchema
>;

export const createChairSchema = z.object({
	name: z.string().trim().min(1).max(120),
	room: z.string().trim().max(120).nullable().optional(),
	specialization: dentalSpecialtySchema.nullable().optional(),
	hasXraySensor: z.boolean().default(false),
	hasMicroscope: z.boolean().default(false),
	hasSurgeryKit: z.boolean().default(false),
	notes: z.string().trim().max(500).nullable().optional(),
	workingHours: staffWorkingHoursSchema.nullable().optional(),
});

export type CreateChairInput = z.infer<typeof createChairSchema>;

export const createDocumentSchema = z
	.object({
		patientId: z.string().uuid(),
		visitId: z.string().uuid().nullable().optional(),
		kind: documentKindSchema,
		title: z.string().trim().min(1).max(240).optional(),
		/*
		 * ЗДЕСЬ ОБРЫВ БЫЛ ВИДЕН ПОЛЬЗОВАТЕЛЮ.
		 *
		 * apps/web/src/useAppLogic.tsx собирает totalAmountRub как сумму
		 * payment.amountRub по выбранным платежам и отправляет её в POST
		 * /api/documents. Платёж на 1500,50 разрешён (paymentSchema.amountRub), а
		 * этот int его отвергал — apps/api/src/routes/documents/create.ts отвечал
		 * 400 «Документ не создан» на КАЖДУЮ попытку выдать квитанцию, акт или
		 * справку для вычета пациенту, у которого оплата с копейками. Читающая
		 * сторона (generatedDocumentSchema.totalAmountRub) копейки уже принимала:
		 * контракт расходился сам с собой на запись и на чтение.
		 */
		totalAmountRub: nonNegativeMoneyRubSchema.nullable().optional(),
		taxYear: z
			.number()
			.int()
			.min(legacyTaxDeductionCertificateMinYear)
			.max(2100)
			.nullable()
			.optional(),
		taxPayerInn: z
			.string()
			.trim()
			.regex(/^\d{10}$|^\d{12}$/)
			.nullable()
			.optional(),
		payload: documentPayloadSchema.nullable().optional(),
	})
	.superRefine((input, context) => {
		const disallowedKeys = documentPayloadDisallowedKeys(
			input.kind,
			input.payload,
		);
		if (disallowedKeys.length === 0) return;
		const documentLabel = documentKindMetadata[input.kind]?.label ?? input.kind;

		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["payload"],
			message: `Структурированные данные не соответствуют документу "${documentLabel}": ${disallowedKeys.join(", ")}`,
		});
	});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const createPaymentSchema = z
	.object({
		patientId: z.string().uuid(),
		visitId: z.string().uuid().nullable().optional(),
		documentId: z.string().uuid().nullable().optional(),
		serviceId: z.string().uuid().nullable().optional(),
		catalogItemId: z.string().uuid().nullable().optional(),
		discountRub: nonNegativeMoneyRubSchema.nullable().optional(),
		discountPercent: z.number().min(0).max(100).refine((val) => typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val)).nullable().optional(),
		amountRub: nonNegativeMoneyRubSchema,
		method: z.union([paymentMethodSchema, z.enum(["split", "mixed"])]).default("card"),
		cashAmountKopecks: z.number().int().nonnegative().nullable().optional(),
		electronicAmountKopecks: z.number().int().nonnegative().nullable().optional(),
		dmsAmountKopecks: z.number().int().nonnegative().nullable().optional(),
		depositAmountKopecks: z.number().int().nonnegative().nullable().optional(),
		familyDepositAmountKopecks: z.number().int().nonnegative().nullable().optional(),
		cashAmountRub: nonNegativeMoneyRubSchema.nullable().optional(),
		electronicAmountRub: nonNegativeMoneyRubSchema.nullable().optional(),
		dmsAmountRub: nonNegativeMoneyRubSchema.nullable().optional(),
		depositAmountRub: nonNegativeMoneyRubSchema.nullable().optional(),
		familyDepositAmountRub: nonNegativeMoneyRubSchema.nullable().optional(),
		guaranteeLetterId: z.string().trim().max(120).nullable().optional(),
		fiscalReceiptNumber: z.string().trim().max(120).nullable().optional(),
		fiscalReceiptIssuedAt: strictFiscalReceiptIssuedAtSchema
			.nullable()
			.optional(),
		fiscalReceiptUrl: fiscalReceiptUrlSchema.nullable().optional(),
		fiscalReceipt: fiscalReceiptDetailsSchema.nullable().optional(),
		clientMutationId: z.string().trim().min(1).max(120).nullable().optional(),
		payerFullName: z.string().trim().max(240).nullable().optional(),
		payerInn: z
			.union([
				z.string().trim().regex(/^\d{10}$|^\d{12}$/),
				z.literal(""),
			])
			.transform((val) => (val === "" ? null : val))
			.nullable()
			.optional(),
		payerBirthDate: birthDateInputSchema,
		payerIdentityDocument: z.string().trim().max(240).nullable().optional(),
		payerRelationship: z.string().trim().max(120).nullable().optional(),
		taxDeductionCode: z.enum(["1", "2"]).nullable().optional(),
		note: z.string().nullable().optional(),
		toothNumber: z.union([z.number().int(), z.string()]).nullable().optional(),
		tooth_number: z.union([z.number().int(), z.string()]).nullable().optional(),
		toothCode: z.string().nullable().optional(),
		invoice_items: z.array(z.record(z.string(), z.any())).optional(),
		invoiceItems: z.array(z.record(z.string(), z.any())).optional(),
	})
	.superRefine((input, context) => {
		const fiscalReceiptIssuedAt = input.fiscalReceiptIssuedAt?.trim();
		if (fiscalReceiptIssuedAt && !isDateLikeString(fiscalReceiptIssuedAt)) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["fiscalReceiptIssuedAt"],
				message:
					"Дата фискального чека должна быть реальной календарной датой.",
			});
		}
		if (input.fiscalReceipt?.operationType === "income_return") {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["fiscalReceipt", "operationType"],
				message:
					"Возвратный фискальный чек нельзя записывать как новую оплату.",
			});
		}
		const fiscalReceiptUrl = input.fiscalReceiptUrl?.trim();
		const structuredReceiptUrl = input.fiscalReceipt?.receiptUrl?.trim();
		if (
			fiscalReceiptUrl &&
			structuredReceiptUrl &&
			fiscalReceiptUrl !== structuredReceiptUrl
		) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["fiscalReceipt", "receiptUrl"],
				message:
					"Ссылка ОФД в реквизитах чека должна совпадать с основной ссылкой ОФД.",
			});
		}
		if (!input.taxDeductionCode) return;
		const requiredTaxFields: Array<[keyof typeof input, string]> = [
			["fiscalReceiptIssuedAt", "дата фискального чека"],
			["payerFullName", "ФИО плательщика"],
			["payerBirthDate", "дата рождения плательщика"],
			["payerIdentityDocument", "документ плательщика"],
			["payerRelationship", "родство плательщика с пациентом"],
		];
		for (const [field, label] of requiredTaxFields) {
			const value = input[field];
			if (typeof value === "string" && value.trim()) continue;
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: [field],
				message: `Для налоговой оплаты нужен явный ввод: ${label}.`,
			});
		}
		const fiscalReceipt = input.fiscalReceipt;
		const requiredFiscalReceiptFields: Array<
			[keyof NonNullable<typeof fiscalReceipt>, string]
		> = [
			["fn", "ФН"],
			["fd", "ФД"],
			["fpd", "ФПД"],
		];
		for (const [field, label] of requiredFiscalReceiptFields) {
			const value = fiscalReceipt?.[field];
			if (typeof value === "string" && value.trim()) continue;
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["fiscalReceipt", field],
				message: `Для налоговой оплаты укажите реквизит фискального чека: ${label}.`,
			});
		}
	});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const completeCommunicationTaskSchema = z.object({
	taskId: z.string().uuid(),
	actorUserId: z.string().uuid().optional().nullable(),
	outcome: communicationTaskOutcomeSchema.optional(),
	note: z.string().trim().min(1).max(1000).optional(),
});

export type CompleteCommunicationTaskInput = z.infer<
	typeof completeCommunicationTaskSchema
>;

export const createImagingStudySchema = z.object({
	patientId: z.string().uuid(),
	visitId: z.string().uuid().nullable().optional(),
	doctorId: z.string().uuid().nullable().optional(),
	kind: imagingStudyKindSchema,
	title: z.string().trim().min(1).max(180),
	toothCode: z.string().trim().min(1).max(24).nullable().optional(),
	region: z.string().trim().min(1).max(120).nullable().optional(),
	sourceKind: imagingSourceKindSchema.default("manual_upload"),
	sourceName: z.string().trim().min(1).max(160).default("manual"),
	storagePath: z.string().trim().min(1).max(2048).nullable().optional(),
	dicomStudyUid: z.string().trim().min(1).max(128).nullable().optional(),
	capturedAt: z.string().optional(),
	aiSummary: z.string().trim().max(2000).nullable().optional(),
});

export type CreateImagingStudyInput = z.infer<typeof createImagingStudySchema>;

export const imagingImportPreviewRequestSchema = z.object({
	sourceName: z.string().trim().min(1).max(160).default("imaging_manifest"),
	sourceKind: imagingSourceKindSchema.default("folder_watch"),
	rawText: z.string().trim().min(1).max(120000),
});

export type ImagingImportPreviewRequest = z.infer<
	typeof imagingImportPreviewRequestSchema
>;

export const imagingImportPreviewRowSchema = z.object({
	rowNumber: z.number().int().positive(),
	patientId: z.string().uuid().nullable(),
	patientName: z.string().nullable(),
	phone: z.string().nullable(),
	kind: imagingStudyKindSchema.nullable(),
	title: z.string().nullable(),
	toothCode: z.string().nullable(),
	region: z.string().nullable(),
	capturedAt: z.string().nullable(),
	filePath: z.string().nullable(),
	sourceKind: imagingSourceKindSchema,
	sourceName: z.string(),
	status: z.enum(["ready", "warning", "blocked"]),
	warnings: z.array(z.string()),
});

export type ImagingImportPreviewRow = z.infer<
	typeof imagingImportPreviewRowSchema
>;

export const imagingImportPreviewResponseSchema = z.object({
	sourceName: z.string(),
	sourceKind: imagingSourceKindSchema,
	totalRows: z.number().int().nonnegative(),
	readyRows: z.number().int().nonnegative(),
	warningRows: z.number().int().nonnegative(),
	blockedRows: z.number().int().nonnegative(),
	rows: z.array(imagingImportPreviewRowSchema),
	parserNotes: z.array(z.string()),
});

export type ImagingImportPreviewResponse = z.infer<
	typeof imagingImportPreviewResponseSchema
>;

export const imagingImportCommitResponseSchema = z.object({
	sourceName: z.string(),
	sourceKind: imagingSourceKindSchema,
	importedCount: z.number().int().nonnegative(),
	skippedCount: z.number().int().nonnegative(),
	createdStudyIds: z.array(z.string().uuid()),
	preview: imagingImportPreviewResponseSchema,
});

export type ImagingImportCommitResponse = z.infer<
	typeof imagingImportCommitResponseSchema
>;

export const imagingFolderScanRequestSchema = z.object({
	folderPath: z.string().min(1),
	recursive: z.boolean().default(true),
	sourceName: z.string().min(1).default("folder_scan"),
	maxFiles: z.number().int().positive().max(5000).default(500),
	maxFolders: z.number().int().positive().max(3000).default(900),
	maxEntriesPerFolder: z.number().int().positive().max(10000).default(2000),
});

export type ImagingFolderScanRequest = z.infer<
	typeof imagingFolderScanRequestSchema
>;

export const imagingFolderScanResponseSchema = z.object({
	folderPath: z.string(),
	recursive: z.boolean(),
	filesFound: z.number().int().nonnegative(),
	filesReturned: z.number().int().nonnegative(),
	rawText: z.string(),
	preview: imagingImportPreviewResponseSchema,
	warnings: z.array(z.string()),
});

export type ImagingFolderScanResponse = z.infer<
	typeof imagingFolderScanResponseSchema
>;

export const dicomSeriesViewerSchema = z.enum([
	"none",
	"two_d_stack",
	"cbct_mpr",
	"external_dicom",
]);

export type DicomSeriesViewer = z.infer<typeof dicomSeriesViewerSchema>;

export const dicomMprProjectionSchema = z.enum([
	"axial",
	"coronal",
	"sagittal",
	"oblique",
	"panoramic_reconstruction",
	"three_d_volume",
	"mip",
	"panoramic",
	"3d_reconstruction",
]);

export type DicomMprProjection = z.infer<typeof dicomMprProjectionSchema>;

export const dicomMprToolSchema = z.enum([
	"window_level",
	"pan",
	"zoom",
	"slice_scroll",
	"crosshair",
	"rotate_axes",
	"oblique_planes",
	"mpr_3up",
	"panoramic_curve",
	"measurement",
	"measure_distance",
	"measure_angle",
	"area_roi",
	"volume_roi",
	"implant_axis",
	"implant_library",
	"nerve_canal",
	"bone_density_probe",
	"surgical_guide",
	"reset",
	"export_snapshot",
	"external_open",
]);

export type DicomMprTool = z.infer<typeof dicomMprToolSchema>;

export const dicomMprResourceTierSchema = z.enum([
	"low_end",
	"standard",
	"workstation",
	"diagnostic_workstation",
]);

export type DicomMprResourceTier = z.infer<typeof dicomMprResourceTierSchema>;

export const dicomMprLoadStrategySchema = z.enum([
	"metadata_only",
	"two_d_stack_stream",
	"mpr_downsampled",
	"mpr_full",
	"external_handoff",
]);

export type DicomMprLoadStrategy = z.infer<typeof dicomMprLoadStrategySchema>;

export const dicomMprCacheModeSchema = z.enum([
	"none",
	"metadata_only",
	"bounded_disk",
	"dicomweb_stream",
]);

export type DicomMprCacheMode = z.infer<typeof dicomMprCacheModeSchema>;

export const dicomMprResourcePolicySchema = z.object({
	requiredTier: dicomMprResourceTierSchema,
	loadStrategy: dicomMprLoadStrategySchema,
	estimatedMemoryMb: z.number().int().nonnegative(),
	maxClientSlices: z.number().int().positive(),
	thumbnailFirst: z.boolean(),
	downsampleRecommended: z.boolean(),
	cacheMode: dicomMprCacheModeSchema,
	safetyCaps: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomMprResourcePolicy = z.infer<
	typeof dicomMprResourcePolicySchema
>;

export const dicomMprReadinessSchema = z.object({
	volumeCandidate: z.boolean(),
	canOpenMpr: z.boolean(),
	canBuildPanoramic: z.boolean(),
	recommendedLayout: z.enum([
		"none",
		"two_d_stack",
		"mpr_3up",
		"mpr_4up",
		"external_only",
	]),
	minSliceCount: z.number().int().positive(),
	projections: z.array(dicomMprProjectionSchema),
	tools: z.array(dicomMprToolSchema),
	resourcePolicy: dicomMprResourcePolicySchema,
	blockers: z.array(z.string()),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomMprReadiness = z.infer<typeof dicomMprReadinessSchema>;

export const dicomSeriesPreviewRequestSchema = z.object({
	sourceName: z.string().min(1).default("dicom_series_manifest"),
	sourceKind: imagingSourceKindSchema.default("dicom_file"),
	rawText: z.string().min(1),
});

export type DicomSeriesPreviewRequest = z.infer<
	typeof dicomSeriesPreviewRequestSchema
>;
