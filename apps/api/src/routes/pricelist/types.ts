import {
	type ColumnMappingConfig,
	type DentalSpecialty,
	type ServiceCategory,
} from "@dental/shared";
import { z } from "zod";

export type PricelistPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

export const pricelistValidationMessage =
	"Ошибка валидации: прайс-лист или запрос не соответствуют формату.";

export function parsePricelistPayload<T>(
	schema: PricelistPayloadSchema<T>,
	value: unknown,
): T | null {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	return parsed.data;
}

// ─── Валидация категорий услуг и метаданные 804н ───────────────────────────

export const VALID_SERVICE_CATEGORIES = [
	"therapy",
	"prosthetics",
	"surgery",
	"orthodontics",
	"hygiene",
	"periodontology",
	"imaging",
	"consultation",
	"documents",
	"other",
] as const;

export const STATUTORY_CATEGORY_CODES: Record<ServiceCategory, string> = {
	therapy: "A16.07.002", // Восстановление зуба пломбой
	prosthetics: "A16.07.004", // Восстановление зуба коронкой
	surgery: "A16.07.001", // Удаление зуба
	orthodontics: "A16.07.048", // Ортодонтическая коррекция
	hygiene: "A16.07.051", // Профессиональная гигиена полости рта и зубов
	periodontology: "A16.07.018", // Пособие при пародонтологических вмешательствах
	imaging: "A06.07.007", // Внутриротовая прицельная рентгенография
	consultation: "B01.065.001", // Прием (осмотр, консультация) врача-стоматолога
	documents: "B01.065.001", // Официальные медицинские документы / Форма 043/у
	other: "A16.07.002",
};

export const STATUTORY_CATEGORY_DURATIONS: Record<ServiceCategory, number> = {
	therapy: 45,
	prosthetics: 60,
	surgery: 45,
	orthodontics: 30,
	hygiene: 60,
	periodontology: 45,
	imaging: 15,
	consultation: 30,
	documents: 15,
	other: 30,
};

export const SERVICE_CATEGORIES_METADATA = [
	{
		id: "therapy" as const,
		label: "Терапевтическая стоматология",
		shortLabel: "Терапия",
		statutoryCodePrefix: "A16.07.002",
		specialty: "therapist",
		description:
			"Лечение кариеса, пульпита, периодонтита, эстетическая реставрация и эндодонтия.",
	},
	{
		id: "prosthetics" as const,
		label: "Ортопедическая стоматология",
		shortLabel: "Ортопедия",
		statutoryCodePrefix: "A16.07.004",
		specialty: "orthopedist",
		description:
			"Протезирование, коронки, виниры, мостовидные протезы, вкладки и накладки.",
	},
	{
		id: "surgery" as const,
		label: "Хирургическая стоматология и имплантология",
		shortLabel: "Хирургия",
		statutoryCodePrefix: "A16.07.001",
		specialty: "surgeon",
		description:
			"Удаление зубов, дентальная имплантация, синус-лифтинг, костная пластика.",
	},
	{
		id: "orthodontics" as const,
		label: "Ортодонтия",
		shortLabel: "Ортодонтия",
		statutoryCodePrefix: "A16.07.048",
		specialty: "orthodontist",
		description:
			"Исправление прикуса, брекет-системы, элайнеры, ретейнеры.",
	},
	{
		id: "hygiene" as const,
		label: "Профессиональная гигиена и профилактика",
		shortLabel: "Гигиена",
		statutoryCodePrefix: "A16.07.051",
		specialty: "hygienist",
		description:
			"Ультразвуковая чистка, Air-Flow, полировка, реминерализация, отбеливание.",
	},
	{
		id: "periodontology" as const,
		label: "Пародонтология",
		shortLabel: "Пародонтология",
		statutoryCodePrefix: "A16.07.018",
		specialty: "periodontist",
		description:
			"Лечение гингивита, пародонтита, кюретаж, шинирование зубов.",
	},
	{
		id: "imaging" as const,
		label: "Лучевая диагностика и рентгенология",
		shortLabel: "Диагностика",
		statutoryCodePrefix: "A06.07.007",
		specialty: "radiologist",
		description:
			"Прицельная визиография RVG, панорамная ОПТГ, КЛКТ 3D, ТРГ черепа.",
	},
	{
		id: "consultation" as const,
		label: "Консультация и прием врача",
		shortLabel: "Консультация",
		statutoryCodePrefix: "B01.065.001",
		specialty: "universal",
		description:
			"Первичный и повторный осмотр, составление плана лечения, консилиум.",
	},
	{
		id: "documents" as const,
		label: "Официальные медицинские документы",
		shortLabel: "Документы",
		statutoryCodePrefix: "B01.065.001",
		specialty: "universal",
		description:
			"Форма 043/у, справки в налоговую для вычета НДФЛ (КНД 1151156), выписки.",
	},
	{
		id: "other" as const,
		label: "Прочие стоматологические услуги",
		shortLabel: "Прочее",
		statutoryCodePrefix: "A16.07.002",
		specialty: "universal",
		description:
			"Анестезия, изолирующие системы коффердам, сервисное обслуживание.",
	},
] as const;

// ─── Zod-схемы запросов ───────────────────────────────────────────────────

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
