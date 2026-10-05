import {
	type DentalSpecialty,
	type ServiceCategory,
	dentalPricelistAnalysisRequestSchema,
	dentalPricelistAnalysisResponseSchema,
	analyzeTabularPricelist,
	type ColumnMappingConfig,
	type PricelistCollisionStrategy,
	scanPriceList,
	type ScannedPriceItem,
	type ScannedPricelistResult,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	looksLikeZipContainer,
	parseOds,
	parseXlsx,
} from "../migration/parsers/spreadsheet.js";
import {
	batchRepriceServicesInDb,
	createServiceCatalogItemInDb,
	getServiceCatalogForOrganization,
	seedBaseline804nServicesInDb,
	ServiceCatalogItemNotFoundError,
	ServiceCatalogStorageDisabledError,
	updateServiceCatalogItemInDb,
} from "../db/pricelistQuery.js";
import { analyzePricelist } from "../pricelist/analyzer.js";
import {
	ingestPriceList,
	priceListIngestionRequestSchema,
	priceListIngestionResponseSchema,
} from "../services/ai/priceListIngestionService.js";

type PricelistPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

const pricelistValidationMessage =
	"Ошибка валидации: прайс-лист или запрос не соответствуют формату.";

function parsePricelistPayload<T>(
	schema: PricelistPayloadSchema<T>,
	value: unknown,
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		return null;
	}
	return parsed.data;
}

// ─── Валидация и нормализация категорий стоматологических услуг ─────────────

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

export function isValidServiceCategory(category: string): boolean {
	const c = (category || "").toLowerCase().trim();
	return (VALID_SERVICE_CATEGORIES as readonly string[]).includes(c) ||
		[
			"терапия",
			"ортопедия",
			"хирургия",
			"ортодонтия",
			"гигиена",
			"пародонтология",
			"диагностика",
			"рентген",
			"консультация",
			"документы",
			"протезирование",
			"orthopedics",
		].includes(c);
}

export function normalizeCategory(cat: string): ServiceCategory {
	const c = (cat || "").toLowerCase().trim();
	if (
		c === "therapy" ||
		c === "терапия" ||
		c.includes("кариес") ||
		c.includes("пульпит") ||
		c.includes("эндодонт")
	)
		return "therapy";
	if (
		c === "surgery" ||
		c === "хирургия" ||
		c.includes("удален") ||
		c.includes("имплант") ||
		c.includes("синус")
	)
		return "surgery";
	if (
		c === "orthopedics" ||
		c === "prosthetics" ||
		c === "ортопедия" ||
		c === "протезирование" ||
		c.includes("корон") ||
		c.includes("винир") ||
		c.includes("протез")
	)
		return "prosthetics";
	if (
		c === "orthodontics" ||
		c === "ортодонтия" ||
		c.includes("брекет") ||
		c.includes("элайн")
	)
		return "orthodontics";
	if (
		c === "hygiene" ||
		c === "гигиена" ||
		c.includes("чистк") ||
		c.includes("air-flow") ||
		c.includes("отбел")
	)
		return "hygiene";
	if (c === "periodontology" || c === "пародонтология" || c.includes("пародонт"))
		return "periodontology";
	if (
		c === "diagnostics" ||
		c === "imaging" ||
		c === "диагностика" ||
		c.includes("рентген") ||
		c.includes("сним") ||
		c.includes("оптг") ||
		c.includes("кт")
	)
		return "imaging";
	if (
		c === "consultation" ||
		c === "консультация" ||
		c.includes("консульт") ||
		c.includes("осмотр") ||
		c.includes("прием")
	)
		return "consultation";
	if (c === "documents" || c === "документы" || c.includes("справк") || c.includes("вычет"))
		return "documents";
	return "other";
}

export function normalizeSpecialty(spec: string): DentalSpecialty {
	const s = (spec || "").toLowerCase().trim();
	if (s === "therapist" || s === "терапевт") return "therapist";
	if (s === "orthopedist" || s === "ортопед") return "orthopedist";
	if (s === "surgeon" || s === "хирург") return "surgeon";
	if (s === "orthodontist" || s === "ортодонт") return "orthodontist";
	if (s === "periodontist" || s === "пародонтолог") return "periodontist";
	if (s === "hygienist" || s === "гигиенист") return "hygienist";
	if (s === "pediatric" || s === "детский") return "pediatric";
	if (s === "implantologist" || s === "имплантолог") return "implantologist";
	if (s === "radiologist" || s === "рентгенолог") return "radiologist";
	return "universal";
}

// ─── Эталонные коды номенклатуры 804н и клиническая длительность ────────────
// Никаких моков A16.07.000: только реальные реестровые позиции Минздрава РФ.
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

// ─── Единый обработчик сидирования базового прейскуранта 804н ───────────────
// Исключает дублирование ручек и обеспечивает соблюдение Мандатов 8e, 8k, 8n.

const seedBodySchema = z.object({
	replace: z.boolean().optional(),
});

export async function handleSeedBaseline804n(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalMutationAccess(
			request,
			reply,
			"pricelist seed baseline",
		))
	) {
		return;
	}

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"pricelist seed baseline",
	);
	if (!orgId) return;

	const parseResult = seedBodySchema.safeParse(request.body ?? {});
	if (!parseResult.success) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Некорректный формат параметров сидирования 804н.",
		});
	}

	const replace = Boolean(parseResult.data.replace);

	try {
		const result = await seedBaseline804nServicesInDb(orgId, { replace });
		return reply.code(200).send(result);
	} catch (error) {
		if (error instanceof ServiceCatalogStorageDisabledError) {
			return reply.code(503).send({
				error: "ServiceCatalogStorageDisabled",
				message:
					"Хранилище прейскуранта отключено: настройте базу данных для сохранения услуг.",
			});
		}
		request.log.error(
			{ err: error },
			"Ошибка при наполнении базового прейскуранта 804н",
		);
		return reply.code(500).send({
			error: "PricelistSeedBaselineError",
			message:
				(error as Error).message ||
				"Не удалось наполнить базовый прейскурант 804н",
		});
	}
}

function escapeCsvCell(value: unknown, delimiter = ";"): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (str.includes(delimiter) || str.includes('"') || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export const batchRepriceBodySchema = z.object({
	percentChange: z.number().min(-90).max(500).optional(),
	fixedRubChange: z.number().min(-100000).max(100000).optional(),
	roundMode: z.enum(["none", "round_10", "round_50", "round_100"]).default("none"),
	category: z.string().optional(),
	specialty: z.string().optional(),
	serviceIds: z.array(z.string()).optional(),
});

export const pricelistExportQuerySchema = z.object({
	format: z.enum(["csv", "json"]).default("csv"),
	category: z.string().optional(),
	activeOnly: z
		.union([z.boolean(), z.string()])
		.transform((v) => v === true || v === "true" || v === "1")
		.optional(),
});

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

/**
 * Universal CSV / TSV text to matrix parser (RFC 4180 compliant with UTF-8 BOM stripping).
 */
export function parseCsvToMatrix(text: string): string[][] {
	const cleaned = text
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");
	const lines = cleaned.split("\n");
	if (lines.length === 0) return [];

	const sample = lines.slice(0, 10).join("\n");
	const semicolonCount = (sample.match(/;/g) || []).length;
	const commaCount = (sample.match(/,/g) || []).length;
	const tabCount = (sample.match(/\t/g) || []).length;

	let delimiter = ";";
	if (tabCount > semicolonCount && tabCount > commaCount) delimiter = "\t";
	else if (commaCount > semicolonCount && commaCount > tabCount) delimiter = ",";

	const result: string[][] = [];
	for (const line of lines) {
		if (!line.trim()) continue;
		const row: string[] = [];
		let inQuotes = false;
		let currentCell = "";
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					currentCell += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === delimiter && !inQuotes) {
				row.push(currentCell.trim());
				currentCell = "";
			} else {
				currentCell += char;
			}
		}
		row.push(currentCell.trim());
		result.push(row);
	}
	return result;
}

// ─── Регистрация маршрутов прейскуранта ──────────────────────────────────────

export async function registerPricelistRoutes(app: FastifyInstance) {
	/**
	 * GET /api/pricelist/categories
	 * Справочник валидных клинических категорий услуг со статьями 804н и описанием.
	 */
	app.get("/api/pricelist/categories", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"pricelist categories",
			))
		)
			return;

		return reply.code(200).send({
			success: true,
			categories: SERVICE_CATEGORIES_METADATA,
		});
	});

	/**
	 * POST /api/pricelist/analyze
	 * Анализ и сопоставление прейскуранта с номенклатурой Минздрава 804н.
	 */
	app.post(
		"/api/pricelist/analyze",
		{
			bodyLimit: 5 * 1024 * 1024,
		},
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"pricelist analysis",
				))
			)
				return;
			const input = parsePricelistPayload(
				dentalPricelistAnalysisRequestSchema,
				request.body,
			);
			if (!input) {
				return reply.code(400).send({
					error: "PricelistValidationError",
					message: pricelistValidationMessage,
				});
			}

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"pricelist analysis",
			);
			if (!orgId) return;
			const catalog = await getServiceCatalogForOrganization(orgId);
			return dentalPricelistAnalysisResponseSchema.parse(
				await analyzePricelist(input, catalog),
			);
		},
	);

	/**
	 * POST /api/pricelist/ingest
	 * Интеллектуальный разбор и пакетная фиксация прейскуранта в БД (ACID-транзакция).
	 */
	app.post(
		"/api/pricelist/ingest",
		{
			bodyLimit: 10 * 1024 * 1024,
		},
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"pricelist ingestion",
				))
			)
				return;

			const input = parsePricelistPayload(
				priceListIngestionRequestSchema,
				request.body,
			);
			if (!input) {
				return reply.code(400).send({
					error: "PricelistValidationError",
					message:
						"Ошибка валидации: параметры ингестии прейскуранта не соответствуют формату.",
				});
			}

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"pricelist ingestion",
			);
			if (!orgId) return;

			const existingCatalog = await getServiceCatalogForOrganization(orgId);
			const ingestionResult = await ingestPriceList(input, existingCatalog);

			if (input.commit) {
				if (
					!(await requireClinicalMutationAccess(
						request,
						reply,
						"pricelist ingestion commit",
					))
				) {
					return;
				}

				const itemsToCommit =
					input.approvedItems && input.approvedItems.length > 0
						? input.approvedItems
						: ingestionResult.proposals.filter((p) => p.isApproved);

				let committedCount = 0;

				// Дефект 4 (ACID): Пакетная фиксация услуг строго внутри транзакции
				try {
					await db.transaction(async () => {
						for (const item of itemsToCommit) {
							const category = normalizeCategory(item.category);
							const specialty = normalizeSpecialty(item.specialty);
							const statutoryCode =
								item.code804n &&
								item.code804n.trim().length > 0
									? item.code804n.trim()
									: STATUTORY_CATEGORY_CODES[category] || "A16.07.002";
							const durationMinutes =
								STATUTORY_CATEGORY_DURATIONS[category] || 30;

							if (
								item.suggestedAction === "update_existing" &&
								item.matchedExistingServiceId
							) {
								await updateServiceCatalogItemInDb(
									orgId,
									item.matchedExistingServiceId,
									{
										code: statutoryCode,
										title: item.cleanedTitle,
										basePriceRub: item.priceRub,
										category,
										specialty,
									},
								);
								committedCount++;
							} else if (
								item.suggestedAction === "link_existing" &&
								item.matchedExistingServiceId
							) {
								await updateServiceCatalogItemInDb(
									orgId,
									item.matchedExistingServiceId,
									{
										code: statutoryCode,
										basePriceRub: item.priceRub,
									},
								);
								committedCount++;
							} else if (
								item.suggestedAction === "create_new" ||
								!item.matchedExistingServiceId
							) {
								await createServiceCatalogItemInDb(orgId, {
									code: statutoryCode,
									title: item.cleanedTitle,
									category,
									specialty,
									basePriceRub: item.priceRub,
									durationMinutes,
									taxDeductible: true,
									active: true,
								});
								committedCount++;
							}
						}
					});
				} catch (commitError) {
					if (commitError instanceof ServiceCatalogStorageDisabledError) {
						return reply.code(503).send({
							error: "ServiceCatalogStorageDisabled",
							message:
								"Хранилище прейскуранта отключено: настройте постоянную базу данных для сохранения услуг.",
						});
					}
					request.log.error(
						{ err: commitError },
						"Транзакционный сбой при пакетном сохранении прейскуранта",
					);
					return reply.code(500).send({
						error: "PricelistCommitTransactionError",
						message: `Не удалось зафиксировать изменения прейскуранта: ${(commitError as Error).message}`,
					});
				}

				ingestionResult.committedCount = committedCount;
			}

			return reply
				.code(200)
				.send(priceListIngestionResponseSchema.parse(ingestionResult));
		},
	);

	/**
	 * POST /api/pricelist/parse-file
	 * Интеллектуальный разбор Excel (.xlsx, .xls, .ods) и CSV (.csv) с автоопределением колонок
	 * форматов IDENT, DentalPRO, iStom, 1C:Медицина и произвольных таблиц врачей.
	 */
	app.post(
		"/api/pricelist/parse-file",
		{
			bodyLimit: 15 * 1024 * 1024,
		},
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"pricelist parse file",
				))
			) {
				return;
			}

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"pricelist parse file",
			);
			if (!orgId) return;

			const parseResult = pricelistParseFileSchema.safeParse(request.body ?? {});
			if (!parseResult.success) {
				return reply.code(400).send({
					error: "PricelistValidationError",
					message: "Некорректный формат параметров загрузки файла прейскуранта.",
					issues: parseResult.error.issues,
				});
			}

			const {
				fileBase64,
				rawText,
				filename,
				selectedSheetIndex,
				customMapping,
			} = parseResult.data;

			let rows: string[][] = [];
			let sheets: string[] = ["Лист 1"];

			if (fileBase64) {
				try {
					const buffer = Buffer.from(fileBase64, "base64");
					const lowerName = filename.toLowerCase();

					if (
						lowerName.endsWith(".xlsx") ||
						lowerName.endsWith(".ods") ||
						looksLikeZipContainer(buffer)
					) {
						const isOds = lowerName.endsWith(".ods");
						const parsedBook = isOds ? parseOds(buffer) : parseXlsx(buffer);
						if (parsedBook.sheets.length > 0) {
							sheets = parsedBook.sheets.map((s) => s.name);
							const sheetIdx = Math.min(
								selectedSheetIndex,
								parsedBook.sheets.length - 1,
							);
							rows = parsedBook.sheets[sheetIdx]?.rows ?? [];
						}
					} else {
						// Text / CSV buffer
						const text = buffer.toString("utf8");
						rows = parseCsvToMatrix(text);
					}
				} catch (err: unknown) {
					request.log.error({ err }, "Ошибка при разборе файла книги прейскуранта");
					return reply.code(400).send({
						error: "SpreadsheetParseError",
						message: `Не удалось разобрать файл прейскуранта: ${err instanceof Error ? err.message : "ошибка чтения"}`,
					});
				}
			} else if (rawText) {
				rows = parseCsvToMatrix(rawText);
			} else {
				return reply.code(400).send({
					error: "PricelistValidationError",
					message: "Передайте содержимое файла (fileBase64) или текст (rawText).",
				});
			}

			const existingCatalog = await getServiceCatalogForOrganization(orgId);
			const cleanedMapping: Partial<ColumnMappingConfig> | undefined = customMapping
				? (Object.fromEntries(
						Object.entries(customMapping).filter(([, v]) => v !== undefined),
					) as Partial<ColumnMappingConfig>)
				: undefined;
			const analysis = analyzeTabularPricelist({
				rows,
				...(cleanedMapping ? { customMapping: cleanedMapping } : {}),
				existingCatalog,
			});

			return reply.code(200).send({
				success: true,
				filename,
				sheets,
				selectedSheetIndex: Math.min(selectedSheetIndex, sheets.length - 1),
				analysis,
			});
		},
	);

	/**
	 * POST /api/pricelist/scan-and-import
	 * Интеллектуальный мультиформатный сканер прейскурантов и семантический матчер 804н
	 * с режимами preview (commit: false) и транзакционным сохранением в БД (commit: true).
	 */
	app.post(
		"/api/pricelist/scan-and-import",
		{
			bodyLimit: 20 * 1024 * 1024,
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const scanAndImportItemSchema = z.object({
				id: z.string().optional(),
				cleanedTitle: z.string().min(1, "Наименование услуги не может быть пустым"),
				code: z.string().optional(),
				code804n: z.string().default("A16.07.002"),
				category: z.string().default("therapy"),
				specialty: z.string().default("therapist"),
				priceRub: z.number().nonnegative("Цена не может быть отрицательной"),
				durationMinutes: z.number().int().positive().default(30),
				suggestedAction: z
					.enum(["create_new", "update_existing", "identical"])
					.default("create_new"),
				matchedExistingServiceId: z.string().nullable().optional(),
				isApproved: z.boolean().default(true),
			});

			const pricelistScanAndImportRequestSchema = z.object({
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

			const parseResult = pricelistScanAndImportRequestSchema.safeParse(request.body ?? {});
			if (!parseResult.success) {
				return reply.code(400).send({
					error: "PricelistValidationError",
					message: "Некорректный формат запроса на сканирование прейскуранта.",
					issues: parseResult.error.issues,
				});
			}

			const {
				fileBase64,
				rawContent,
				rawText,
				filename,
				selectedSheetIndex,
				customMapping,
				collisionStrategy,
				commit,
				approvedItems,
			} = parseResult.data;

			if (commit) {
				if (
					!(await requireClinicalMutationAccess(
						request,
						reply,
						"pricelist scan and import commit",
					))
				) {
					return;
				}
			} else {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"pricelist scan and import preview",
					))
				) {
					return;
				}
			}

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"pricelist scan and import",
			);
			if (!orgId) return;

			let scanInput: string | string[][] = "";

			if (fileBase64) {
				try {
					const buffer = Buffer.from(fileBase64, "base64");
					const lowerName = (filename || "").toLowerCase();

					if (
						lowerName.endsWith(".xlsx") ||
						lowerName.endsWith(".ods") ||
						looksLikeZipContainer(buffer)
					) {
						const isOds = lowerName.endsWith(".ods");
						const parsedBook = isOds ? parseOds(buffer) : parseXlsx(buffer);
						if (parsedBook.sheets.length > 0) {
							const sheetIdx = Math.min(
								selectedSheetIndex,
								parsedBook.sheets.length - 1,
							);
							scanInput = parsedBook.sheets[sheetIdx]?.rows ?? [];
						}
					} else {
						scanInput = buffer.toString("utf8");
					}
				} catch (err: unknown) {
					request.log.error({ err }, "Ошибка при разборе файла прейскуранта");
					return reply.code(400).send({
						error: "SpreadsheetParseError",
						message: `Не удалось разобрать файл книги прейскуранта: ${err instanceof Error ? err.message : "ошибка чтения"}`,
					});
				}
			} else if (rawContent || rawText) {
				scanInput = rawContent || rawText || "";
			} else {
				return reply.code(400).send({
					error: "PricelistValidationError",
					message: "Передайте файл (fileBase64) или текст (rawContent / rawText).",
				});
			}

			const existingCatalog = await getServiceCatalogForOrganization(orgId);
			const cleanedMapping: Partial<ColumnMappingConfig> | undefined = customMapping
				? (Object.fromEntries(
						Object.entries(customMapping).filter(([, v]) => v !== undefined),
					) as Partial<ColumnMappingConfig>)
				: undefined;

			const scanResult = scanPriceList(scanInput, {
				customMapping: cleanedMapping,
				existingCatalog,
			});

			if (!commit) {
				return reply.code(200).send({
					success: scanResult.success,
					scanResult,
				});
			}

			// COMMIT MODE: Persist in ACID transaction
			const itemsToCommit =
				approvedItems && approvedItems.length > 0
					? approvedItems.filter((i) => i.isApproved)
					: scanResult.items.filter(
							(i) => i.validationStatus === "valid" && i.isApproved,
						);

			let createdCount = 0;
			let updatedCount = 0;
			let skippedCount = 0;

			try {
				await db.transaction(async () => {
					for (const item of itemsToCommit) {
						const category = normalizeCategory(item.category);
						const specialty = normalizeSpecialty(item.specialty);
						const statutoryCode =
							item.code804n && item.code804n.trim().length > 0
								? item.code804n.trim()
								: STATUTORY_CATEGORY_CODES[category] || "A16.07.002";
						const durationMinutes =
							item.durationMinutes || STATUTORY_CATEGORY_DURATIONS[category] || 30;

						if (
							collisionStrategy === "skip_duplicates" &&
							item.matchedExistingServiceId
						) {
							skippedCount++;
							continue;
						}

						if (
							(collisionStrategy === "update_existing" ||
								item.suggestedAction === "update_existing") &&
							item.matchedExistingServiceId
						) {
							await updateServiceCatalogItemInDb(
								orgId,
								item.matchedExistingServiceId,
								{
									code: statutoryCode,
									title: item.cleanedTitle,
									basePriceRub: item.priceRub,
									category,
									specialty,
									durationMinutes,
								},
							);
							updatedCount++;
						} else {
							await createServiceCatalogItemInDb(orgId, {
								code: statutoryCode,
								title: item.cleanedTitle,
								category,
								specialty,
								basePriceRub: item.priceRub,
								durationMinutes,
								taxDeductible: true,
								active: true,
							});
							createdCount++;
						}
					}
				});

				return reply.code(200).send({
					success: true,
					committedCount: createdCount + updatedCount,
					createdCount,
					updatedCount,
					skippedCount,
					scanResult,
				});
			} catch (error) {
				if (error instanceof ServiceCatalogStorageDisabledError) {
					return reply.code(503).send({
						error: "ServiceCatalogStorageDisabled",
						message:
							"Хранилище прейскуранта отключено: настройте постоянную базу данных для сохранения услуг.",
					});
				}
				request.log.error({ err: error }, "Ошибка при транзакционной фиксации прейскуранта");
				return reply.code(500).send({
					error: "PricelistCommitTransactionError",
					message: (error as Error).message || "Ошибка транзакционного импорта прейскуранта",
				});
			}
		},
	);

	/**
	 * POST /api/pricelist/batch-import
	 * Пакетное сохранение позиций прейскуранта в ACID-транзакции с выбором стратегии коллизий:
	 * update_existing | skip_duplicates | create_new.
	 */
	app.post(
		"/api/pricelist/batch-import",
		{
			bodyLimit: 15 * 1024 * 1024,
		},
		async (request, reply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"pricelist batch import",
				))
			) {
				return;
			}

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"pricelist batch import",
			);
			if (!orgId) return;

			const parseResult = pricelistBatchImportBodySchema.safeParse(request.body ?? {});
			if (!parseResult.success) {
				return reply.code(400).send({
					error: "PricelistValidationError",
					message: "Некорректный формат позиций прейскуранта для импорта.",
					issues: parseResult.error.issues,
				});
			}

			const { items, collisionStrategy } = parseResult.data;
			let createdCount = 0;
			let updatedCount = 0;
			let skippedCount = 0;

			try {
				await db.transaction(async () => {
					for (const item of items) {
						const category = normalizeCategory(item.category);
						const specialty = normalizeSpecialty(item.specialty);
						const statutoryCode =
							item.order804nCode && item.order804nCode.trim().length > 0
								? item.order804nCode.trim()
								: STATUTORY_CATEGORY_CODES[category] || "A16.07.002";
						const durationMinutes =
							item.durationMinutes || STATUTORY_CATEGORY_DURATIONS[category] || 30;

						if (
							collisionStrategy === "skip_duplicates" &&
							item.matchedExistingServiceId
						) {
							skippedCount++;
							continue;
						}

						if (
							(collisionStrategy === "update_existing" ||
								item.suggestedAction === "update_existing") &&
							item.matchedExistingServiceId
						) {
							await updateServiceCatalogItemInDb(
								orgId,
								item.matchedExistingServiceId,
								{
									code: statutoryCode,
									title: item.title,
									basePriceRub: item.priceRub,
									category,
									specialty,
									durationMinutes,
								},
							);
							updatedCount++;
						} else {
							await createServiceCatalogItemInDb(orgId, {
								code: statutoryCode,
								title: item.title,
								category,
								specialty,
								basePriceRub: item.priceRub,
								durationMinutes,
								taxDeductible: true,
								active: true,
							});
							createdCount++;
						}
					}
				});

				return reply.code(200).send({
					success: true,
					committedCount: createdCount + updatedCount,
					createdCount,
					updatedCount,
					skippedCount,
				});
			} catch (error) {
				if (error instanceof ServiceCatalogStorageDisabledError) {
					return reply.code(503).send({
						error: "ServiceCatalogStorageDisabled",
						message:
							"Хранилище прейскуранта отключено: настройте постоянную базу данных.",
					});
				}
				request.log.error(
					{ err: error },
					"Ошибка транзакции при пакетном импорте прейскуранта",
				);
				return reply.code(500).send({
					error: "PricelistBatchImportError",
					message:
						(error as Error).message ||
						"Ошибка транзакционного импорта прейскуранта",
				});
			}
		},
	);

	/**
	 * 1-клик быстрое наполнение прейскуранта базовым набором 804н (30 услуг).
	 * Доступно для соло-врача и клиники (Мандаты 8e, 8k, 8n).
	 * Устранено дублирование: канонический эндпоинт и алиасы вызывают единый обработчик handleSeedBaseline804n.
	 */
	app.post("/api/pricelist/seed-baseline-804n", handleSeedBaseline804n);
	app.post("/api/pricelist/seed-baseline", handleSeedBaseline804n);
	app.post("/api/pricelist/seed", handleSeedBaseline804n);

	/**
	 * GET /api/pricelist/export
	 * Выгрузка прейскуранта организации в CSV (с UTF-8 BOM \uFEFF и точкой с запятой для русского Excel) или JSON.
	 */
	app.get("/api/pricelist/export", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "pricelist export"))) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(request, reply, "pricelist export");
		if (!orgId) return;

		const queryParse = pricelistExportQuerySchema.safeParse(request.query ?? {});
		const query = queryParse.success ? queryParse.data : { format: "csv" as const };

		const catalog = await getServiceCatalogForOrganization(orgId);
		let filtered = catalog;

		if (query.category && query.category !== "all") {
			filtered = filtered.filter((s) => s.category === query.category);
		}
		if (query.activeOnly) {
			filtered = filtered.filter((s) => s.active);
		}

		const todayStr = new Date().toISOString().slice(0, 10);

		if (query.format === "json") {
			return reply.code(200).send({
				success: true,
				organizationId: orgId,
				totalCount: filtered.length,
				exportedAt: new Date().toISOString(),
				items: filtered,
			});
		}

		// CSV format per RFC 4180 with UTF-8 BOM
		const delimiter = ";";
		const headers = [
			"Код 804н",
			"Коммерческое наименование",
			"Раздел",
			"Специальность",
			"Цена (руб)",
			"Длительность (мин)",
			"НДС",
			"Налоговый вычет",
			"Статус",
		];

		const rows: string[] = [headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter)];

		for (const item of filtered) {
			const categoryMeta = SERVICE_CATEGORIES_METADATA.find((m) => m.id === item.category);
			const categoryTitle = categoryMeta?.shortLabel || item.category;
			const row = [
				item.code,
				item.title,
				categoryTitle,
				item.specialty,
				item.basePriceRub,
				item.durationMinutes,
				"НДС не облагается (ст. 149 НК РФ)",
				item.taxDeductible ? "Да" : "Нет",
				item.active ? "Активна" : "В архиве",
			];
			rows.push(row.map((val) => escapeCsvCell(val, delimiter)).join(delimiter));
		}

		const UTF8_BOM = "\uFEFF";
		const csvOutput = UTF8_BOM + rows.join("\r\n");

		reply.header("Content-Type", "text/csv; charset=utf-8");
		reply.header(
			"Content-Disposition",
			`attachment; filename="dente_pricelist_${todayStr}.csv"`,
		);
		return reply.send(csvOutput);
	});

	/**
	 * POST /api/pricelist/batch-reprice
	 * Пакетная переоценка услуг клиники (+X%, фиксированная сумма, округление) в ACID-транзакции.
	 */
	app.post("/api/pricelist/batch-reprice", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "pricelist batch reprice"))) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(request, reply, "pricelist batch reprice");
		if (!orgId) return;

		const parseResult = batchRepriceBodySchema.safeParse(request.body ?? {});
		if (!parseResult.success) {
			return reply.code(400).send({
				error: "PricelistValidationError",
				message: "Некорректные параметры пакетной переоценки услуг.",
			});
		}

		try {
			const result = await batchRepriceServicesInDb(orgId, parseResult.data);
			return reply.code(200).send(result);
		} catch (error) {
			if (error instanceof ServiceCatalogStorageDisabledError) {
				return reply.code(503).send({
					error: "ServiceCatalogStorageDisabled",
					message:
						"Хранилище прейскуранта отключено: настройте базу данных для сохранения изменений.",
				});
			}
			request.log.error({ err: error }, "Ошибка при пакетной переоценке услуг");
			return reply.code(500).send({
				error: "PricelistBatchRepriceError",
				message: (error as Error).message || "Не удалось выполнить переоценку услуг",
			});
		}
	});
}
