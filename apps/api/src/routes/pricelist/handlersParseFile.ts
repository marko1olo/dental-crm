import {
	analyzeTabularPricelist,
	type ColumnMappingConfig,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { getServiceCatalogForOrganization } from "../../db/pricelistQuery.js";
import { resolveSpreadsheetRowsAndSheets } from "./spreadsheetImport.js";
import { pricelistParseFileSchema } from "./types.js";

/**
 * POST /api/pricelist/parse-file
 * Интеллектуальный разбор Excel (.xlsx, .ods) и CSV (.csv) с автоопределением колонок.
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
