import {
	analyzeTabularPricelist,
	dentalPricelistAnalysisRequestSchema,
	dentalPricelistAnalysisResponseSchema,
	scanPriceList,
	type ColumnMappingConfig,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import {
	batchRepriceServicesInDb,
	getServiceCatalogForOrganization,
	seedBaseline804nServicesInDb,
	ServiceCatalogStorageDisabledError,
} from "../../db/pricelistQuery.js";
import { analyzePricelist } from "../../pricelist/analyzer.js";
import {
	ingestPriceList,
	priceListIngestionRequestSchema,
	priceListIngestionResponseSchema,
} from "../../services/ai/priceListIngestionService.js";
import {
	commitBatchImportItems,
	commitIngestedPriceListItems,
	commitScanAndImportItems,
	SERVICE_CATEGORIES_METADATA,
} from "./catalogOperations.js";
import {
	formatPricelistToCsv,
	resolveSpreadsheetRowsAndSheets,
	resolveSpreadsheetScanInput,
} from "./spreadsheetImport.js";
import {
	batchRepriceBodySchema,
	parsePricelistPayload,
	pricelistBatchImportBodySchema,
	pricelistExportQuerySchema,
	pricelistParseFileSchema,
	pricelistScanAndImportRequestSchema,
	pricelistValidationMessage,
	seedBodySchema,
} from "./types.js";

/**
 * GET /api/pricelists & GET /api/pricelist
 * Получение каталога услуг прейскуранта организации из PostgreSQL.
 */
export async function handleGetPricelists(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalReadAccess(
			request,
			reply,
			"pricelist get",
		))
	)
		return;

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"pricelist get",
	);
	if (!orgId) return;

	const catalog = await getServiceCatalogForOrganization(orgId);
	return reply.code(200).send({
		success: true,
		items: catalog,
		count: catalog.length,
	});
}

/**
 * GET /api/pricelist/categories
 * Справочник валидных клинических категорий услуг со статьями 804н и описанием.
 */
export async function handleGetCategories(
	request: FastifyRequest,
	reply: FastifyReply,
) {
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
}

/**
 * POST /api/pricelist/analyze
 * Анализ и сопоставление прейскуранта с номенклатурой Минздрава 804н.
 */
export async function handleAnalyzePricelist(
	request: FastifyRequest,
	reply: FastifyReply,
) {
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
}

/**
 * POST /api/pricelist/ingest
 * Интеллектуальный разбор и пакетная фиксация прейскуранта в БД (ACID-транзакция).
 */
export async function handleIngestPricelist(
	request: FastifyRequest,
	reply: FastifyReply,
) {
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

		try {
			const committedCount = await commitIngestedPriceListItems(
				orgId,
				itemsToCommit,
			);
			ingestionResult.committedCount = committedCount;
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
	}

	return reply
		.code(200)
		.send(priceListIngestionResponseSchema.parse(ingestionResult));
}

/**
 * POST /api/pricelist/parse-file
 * Интеллектуальный разбор Excel (.xlsx, .xls, .ods) и CSV (.csv) с автоопределением колонок.
 */
export async function handleParseFile(
	request: FastifyRequest,
	reply: FastifyReply,
) {
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

	let parsedBook;
	try {
		parsedBook = resolveSpreadsheetRowsAndSheets(
			fileBase64,
			rawText,
			filename,
			selectedSheetIndex,
		);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "ошибка чтения";
		if (message.includes("Передайте содержимое")) {
			return reply.code(400).send({
				error: "PricelistValidationError",
				message,
			});
		}
		request.log.error({ err }, "Ошибка при разборе файла книги прейскуранта");
		return reply.code(400).send({
			error: "SpreadsheetParseError",
			message: `Не удалось разобрать файл прейскуранта: ${message}`,
		});
	}

	const { rows, sheets, selectedSheetIndex: sheetIdx } = parsedBook;
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
		selectedSheetIndex: sheetIdx,
		analysis,
	});
}

/**
 * POST /api/pricelist/scan-and-import
 * Интеллектуальный мультиформатный сканер прейскурантов и семантический матчер 804н.
 */
export async function handleScanAndImport(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const parseResult = pricelistScanAndImportRequestSchema.safeParse(
		request.body ?? {},
	);
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

	try {
		scanInput = resolveSpreadsheetScanInput({
			fileBase64,
			rawContent,
			rawText,
			filename,
			selectedSheetIndex,
			commit,
			approvedItems,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "ошибка чтения";
		if (message.includes("Передайте файл")) {
			return reply.code(400).send({
				error: "PricelistValidationError",
				message,
			});
		}
		request.log.error({ err }, "Ошибка при разборе файла прейскуранта");
		return reply.code(400).send({
			error: "SpreadsheetParseError",
			message: `Не удалось разобрать файл книги прейскуранта: ${message}`,
		});
	}

	const existingCatalog = await getServiceCatalogForOrganization(orgId);
	const cleanedMapping: Partial<ColumnMappingConfig> | undefined = customMapping
		? (Object.fromEntries(
				Object.entries(customMapping).filter(([, v]) => v !== undefined),
			) as Partial<ColumnMappingConfig>)
		: undefined;

	const scanResult = scanInput
		? scanPriceList(scanInput, {
				customMapping: cleanedMapping,
				existingCatalog,
			})
		: {
				success: true,
				totalLines: approvedItems?.length ?? 0,
				detectedFormat: "approved_items",
				items: [],
				stats: {
					total: approvedItems?.length ?? 0,
					validCount: approvedItems?.length ?? 0,
					errorCount: 0,
					exactCodeMatches: 0,
					keywordMatches: 0,
					fallbacks: 0,
					averageConfidence: 1,
				},
			};

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

	try {
		const { createdCount, updatedCount, skippedCount } =
			await commitScanAndImportItems(orgId, itemsToCommit, collisionStrategy);

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
		request.log.error(
			{ err: error },
			"Ошибка при транзакционной фиксации прейскуранта",
		);
		return reply.code(500).send({
			error: "PricelistCommitTransactionError",
			message:
				(error as Error).message ||
				"Ошибка транзакционного импорта прейскуранта",
		});
	}
}

/**
 * POST /api/pricelist/batch-import
 * Пакетное сохранение позиций прейскуранта в ACID-транзакции.
 */
export async function handleBatchImport(
	request: FastifyRequest,
	reply: FastifyReply,
) {
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

	const parseResult = pricelistBatchImportBodySchema.safeParse(
		request.body ?? {},
	);
	if (!parseResult.success) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Некорректный формат позиций прейскуранта для импорта.",
			issues: parseResult.error.issues,
		});
	}

	const { items, collisionStrategy } = parseResult.data;

	try {
		const { createdCount, updatedCount, skippedCount } =
			await commitBatchImportItems(orgId, items, collisionStrategy);

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
}

/**
 * Единый обработчик сидирования базового прейскуранта 804н.
 * Исключает дублирование ручек и обеспечивает соблюдение Мандатов 8e, 8k, 8n.
 */
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
			message: "Некорректный формат параметров наполнения прейскуранта.",
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
			"Ошибка при наполнении базового прейскуранта",
		);
		return reply.code(500).send({
			error: "PricelistSeedBaselineError",
			message:
				(error as Error).message ||
				"Не удалось наполнить базовый прейскурант",
		});
	}
}

/**
 * GET /api/pricelist/export
 * Выгрузка прейскуранта организации в CSV (с UTF-8 BOM и точкой с запятой) или JSON.
 */
export async function handleExportPricelist(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "pricelist export"))) {
		return;
	}

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"pricelist export",
	);
	if (!orgId) return;

	const queryParse = pricelistExportQuerySchema.safeParse(
		request.query ?? {},
	);
	const query = queryParse.success
		? queryParse.data
		: { format: "csv" as const };

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

	const csvOutput = formatPricelistToCsv(filtered);

	reply.header("Content-Type", "text/csv; charset=utf-8");
	reply.header(
		"Content-Disposition",
		`attachment; filename="dente_pricelist_${todayStr}.csv"`,
	);
	return reply.send(csvOutput);
}

/**
 * POST /api/pricelist/batch-reprice
 * Пакетная переоценка услуг клиники (+X%, фиксированная сумма, округление) в ACID-транзакции.
 */
export async function handleBatchReprice(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalMutationAccess(
			request,
			reply,
			"pricelist batch reprice",
		))
	) {
		return;
	}

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"pricelist batch reprice",
	);
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
			message:
				(error as Error).message ||
				"Не удалось выполнить переоценку услуг",
		});
	}
}

/**
 * Регистрация маршрутов прейскуранта.
 */
export async function registerPricelistRoutes(app: FastifyInstance) {
	app.get("/api/pricelists", handleGetPricelists);
	app.get("/api/pricelist", handleGetPricelists);
	app.get("/api/pricelist/categories", handleGetCategories);

	app.post(
		"/api/pricelist/analyze",
		{
			bodyLimit: 5 * 1024 * 1024,
		},
		handleAnalyzePricelist,
	);

	app.post(
		"/api/pricelist/ingest",
		{
			bodyLimit: 10 * 1024 * 1024,
		},
		handleIngestPricelist,
	);

	app.post(
		"/api/pricelist/parse-file",
		{
			bodyLimit: 15 * 1024 * 1024,
		},
		handleParseFile,
	);

	app.post(
		"/api/pricelist/scan-and-import",
		{
			bodyLimit: 20 * 1024 * 1024,
		},
		handleScanAndImport,
	);

	app.post(
		"/api/pricelist/batch-import",
		{
			bodyLimit: 15 * 1024 * 1024,
		},
		handleBatchImport,
	);

	app.post("/api/pricelist/seed-baseline-804n", handleSeedBaseline804n);
	app.post("/api/pricelist/seed-baseline", handleSeedBaseline804n);
	app.post("/api/pricelist/seed", handleSeedBaseline804n);

	app.get("/api/pricelist/export", handleExportPricelist);
	app.post("/api/pricelist/batch-reprice", handleBatchReprice);
}
