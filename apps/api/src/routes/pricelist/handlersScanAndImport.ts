import { scanPriceList, type ColumnMappingConfig } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { getServiceCatalogForOrganization } from "../../db/pricelistQuery.js";
import { processScanAndImportCommit } from "./handlersScanAndImportCommit.js";
import { resolveSpreadsheetScanInput } from "./spreadsheetImport.js";
import { pricelistScanAndImportRequestSchema } from "./types.js";

export async function handleScanAndImport(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const parseResult = pricelistScanAndImportRequestSchema.safeParse(request.body ?? {});
	if (!parseResult.success) {
		return reply.code(400).send({
			error: "PricelistValidationError",
			message: "Некорректный формат запроса на сканирование прейскуранта.",
			issues: parseResult.error.issues,
		});
	}

	const {
		fileBase64, rawContent, rawText, filename, selectedSheetIndex,
		customMapping, collisionStrategy, commit, approvedItems,
	} = parseResult.data;

	if (commit) {
		if (!(await requireClinicalMutationAccess(request, reply, "pricelist scan and import commit"))) return;
	} else {
		if (!(await requireClinicalReadAccess(request, reply, "pricelist scan and import preview"))) return;
	}

	const orgId = await requireResolvedOrganizationId(request, reply, "pricelist scan and import");
	if (!orgId) return;

	let scanInput: string | string[][] = "";
	try {
		scanInput = resolveSpreadsheetScanInput({
			fileBase64, rawContent, rawText, filename, selectedSheetIndex, commit, approvedItems,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "ошибка чтения";
		if (message.includes("Передайте файл")) {
			return reply.code(400).send({ error: "PricelistValidationError", message });
		}
		request.log.error({ err }, "Ошибка при разборе файла прейскуранта");
		return reply.code(400).send({
			error: "SpreadsheetParseError",
			message: `Не удалось разобрать файл книги прейскуранта: ${message}`,
		});
	}

	const existingCatalog = await getServiceCatalogForOrganization(orgId);
	const cleanedMapping = customMapping
		? (Object.fromEntries(
				Object.entries(customMapping).filter(([, v]) => v !== undefined),
			) as Partial<ColumnMappingConfig>)
		: undefined;

	const scanResult = scanInput
		? scanPriceList(scanInput, { customMapping: cleanedMapping, existingCatalog })
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
		return reply.code(200).send({ success: scanResult.success, scanResult });
	}

	const itemsToCommit = approvedItems && approvedItems.length > 0
		? approvedItems.filter((i) => i.isApproved)
		: scanResult.items.filter((i) => i.validationStatus === "valid" && i.isApproved);

	return processScanAndImportCommit({
		request, reply, orgId, itemsToCommit, collisionStrategy, scanResult,
	});
}
