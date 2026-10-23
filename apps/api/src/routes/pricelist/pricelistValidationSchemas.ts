import { z } from "zod";

export const seedBodySchema = z.object({
	replace: z.boolean().optional(),
});
export type SeedBodyInput = z.infer<typeof seedBodySchema>;

export const batchRepriceBodySchema = z.object({
	percentChange: z.number().min(-90).max(500).optional(),
	fixedRubChange: z.number().min(-100000).max(100000).optional(),
	roundMode: z.enum(["none", "round_10", "round_50", "round_100"]).default("none"),
	category: z.string().optional(),
	specialty: z.string().optional(),
	serviceIds: z.array(z.string()).optional(),
});
export type BatchRepriceBody = z.infer<typeof batchRepriceBodySchema>;

export const pricelistExportQuerySchema = z.object({
	format: z.enum(["csv", "json"]).default("csv"),
	category: z.string().optional(),
	activeOnly: z
		.union([z.boolean(), z.string()])
		.transform((v) => v === true || v === "true" || v === "1")
		.optional(),
});
export type PricelistExportQuery = z.infer<typeof pricelistExportQuerySchema>;

export const pricelistParseFileSchema = z.object({
	fileBase64: z.string().optional(),
	rawText: z.string().optional(),
	filename: z.string().default("pricelist.csv"),
	selectedSheetIndex: z.number().int().min(0).default(0),
	customMapping: z
		.object({
			codeCol: z.number().int().min(0).optional(),
			order804nCol: z.number().int().min(0).optional(),
			titleCol: z.number().int().min(0).optional(),
			categoryCol: z.number().int().min(0).optional(),
			specialtyCol: z.number().int().min(0).optional(),
			priceCol: z.number().int().min(0).optional(),
			costCol: z.number().int().min(0).optional(),
			durationCol: z.number().int().min(0).optional(),
			warrantyCol: z.number().int().min(0).optional(),
		})
		.optional(),
});
export type PricelistParseFileInput = z.infer<typeof pricelistParseFileSchema>;

export const pricelistBatchImportBodySchema = z.object({
	items: z.array(
		z.object({
			code: z.string().optional(),
			order804nCode: z.string().optional(),
			title: z.string().min(1, "Название услуги обязательно"),
			category: z.string().default("other"),
			specialty: z.string().default("universal"),
			priceRub: z.number().nonnegative(),
			costRub: z.number().nonnegative().optional(),
			durationMinutes: z.number().int().positive().default(30),
			warrantyMonths: z.number().int().nonnegative().optional(),
			suggestedAction: z
				.enum(["create_new", "update_existing", "skip_duplicates", "identical"])
				.default("create_new"),
			matchedExistingServiceId: z.string().optional().nullable(),
		}),
	),
	collisionStrategy: z
		.enum(["update_existing", "skip_duplicates", "create_new"])
		.default("update_existing"),
});
export type PricelistBatchImportBody = z.infer<typeof pricelistBatchImportBodySchema>;

export const scanAndImportItemSchema = z.object({
	id: z.string().optional(),
	cleanedTitle: z.string().min(1, "Наименование услуги не может быть пустым"),
	code: z.string().optional(),
	code804n: z.string().default("A16.07.002"),
	category: z.string().default("therapy"),
	specialty: z.string().default("therapist"),
	priceRub: z.number().nonnegative("Цена не может быть отрицательной"),
	durationMinutes: z.number().int().positive().default(30),
	suggestedAction: z
		.enum(["create_new", "update_existing", "link_existing", "identical"])
		.default("create_new"),
	matchedExistingServiceId: z.string().nullable().optional(),
	isApproved: z.boolean().default(true),
});
export type ScanAndImportItem = z.infer<typeof scanAndImportItemSchema>;

export const pricelistScanAndImportRequestSchema = z.object({
	fileBase64: z.string().optional(),
	rawContent: z.string().optional(),
	rawText: z.string().optional(),
	filename: z.string().optional().default("pricelist.txt"),
	selectedSheetIndex: z.number().int().min(0).default(0),
	customMapping: z
		.object({
			codeCol: z.number().int().min(0).optional(),
			order804nCol: z.number().int().min(0).optional(),
			titleCol: z.number().int().min(0).optional(),
			categoryCol: z.number().int().min(0).optional(),
			specialtyCol: z.number().int().min(0).optional(),
			priceCol: z.number().int().min(0).optional(),
			costCol: z.number().int().min(0).optional(),
			durationCol: z.number().int().min(0).optional(),
			warrantyCol: z.number().int().min(0).optional(),
		})
		.optional(),
	collisionStrategy: z
		.enum(["update_existing", "skip_duplicates", "create_new"])
		.default("update_existing"),
	commit: z.boolean().default(false),
	approvedItems: z.array(scanAndImportItemSchema).optional(),
});
export type PricelistScanAndImportRequest = z.infer<
	typeof pricelistScanAndImportRequestSchema
>;
