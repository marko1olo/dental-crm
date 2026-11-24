/**
 * DENTE Dental CRM — 1C:Enterprise (1С:Бухгалтерия 8.3 / 1С:Медицина)
 * CommerceML 2.09 Fastify Integration Routes.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	COMMERCEML_VERSION_209,
	oneCChartOfAccountsSchema,
	oneCClinicProfileSchema,
	oneCCommerceMlPackageSchema,
	rublesToKopecks,
	sha256Hex,
	validatePackageIntegrity,
} from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { getRequestIdentity } from "../security/identity.js";
import {
	CommerceMlService,
	oneCSyncPayloadSchema,
	type OneCSyncPayload,
} from "../services/finance/commerceMlService.js";

const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const booleanQuerySchema = z
	.union([z.boolean(), z.enum(["true", "false", "1", "0"])])
	.transform((v) => v === true || v === "true" || v === "1");

const exportQuerySchema = z
	.object({
		organizationId: z.string().uuid().optional(),
		startDateIso: z.string().regex(DATE_ISO_REGEX).optional(),
		endDateIso: z.string().regex(DATE_ISO_REGEX).optional(),
		format: z.enum(["xml", "json"]).default("xml"),
		shiftId: z.string().optional(),
		includeRetailSales: booleanQuerySchema.default(true),
		includeMedicalActs: booleanQuerySchema.default(true),
		includeMaterials: booleanQuerySchema.default(true),
		includePayroll: booleanQuerySchema.default(true),
	})
	.strict();

const exportPostBodySchema = z
	.object({
		organizationId: z.string().uuid().optional(),
		startDateIso: z.string().regex(DATE_ISO_REGEX).optional(),
		endDateIso: z.string().regex(DATE_ISO_REGEX).optional(),
		format: z.enum(["xml", "json"]).default("xml"),
		shiftId: z.string().optional(),
		includeRetailSales: z.boolean().default(true),
		includeMedicalActs: z.boolean().default(true),
		includeMaterials: z.boolean().default(true),
		includePayroll: z.boolean().default(true),
		chartOfAccountsOverrides: oneCChartOfAccountsSchema.partial().optional(),
		clinicProfileOverrides: oneCClinicProfileSchema.partial().optional(),
	})
	.strict();

const checkDoublePostingBodySchema = z
	.object({
		sha256Hash: z.string().min(1, "Необходимо передать sha256Hash пакета или документа"),
		organizationId: z.string().uuid().optional(),
	})
	.strict();

const catalogQuerySchema = z
	.object({
		format: z.enum(["xml", "json"]).default("xml"),
		classifierName: z.string().optional(),
		catalogName: z.string().optional(),
		includeInactive: booleanQuerySchema.default(false),
		priceTypeTitle: z.string().optional(),
	})
	.strict();

const offersQuerySchema = z
	.object({
		format: z.enum(["xml", "json"]).default("xml"),
		warehouseName: z.string().optional(),
		includeZeroStock: booleanQuerySchema.default(false),
		priceTypeTitle: z.string().optional(),
	})
	.strict();

const FORBIDDEN_COMMERCEML_ROLES = new Set(["marketer", "marketing", "receptionist", "patient"]);

async function requireCommerceMlAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	permission: "integrations.commerceml.export" | "integrations.commerceml.sync" | "integrations.commerceml.validate",
): Promise<{ organizationId: string; userId: string } | null> {
	const identity = getRequestIdentity(request);
	const staffRole = identity.role;
	if (staffRole && FORBIDDEN_COMMERCEML_ROLES.has(staffRole)) {
		void reply.code(403).send({
			error: "PermissionDenied",
			permission,
			role: staffRole,
			message:
				"Операции CommerceML 2.09 (реестры 1С, медицинские акты, склад и зарплаты) для нефинансового персонала запрещены (152-ФЗ / 323-ФЗ ст. 13).",
		});
		return null;
	}

	const verifiedOrgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, permission);
	if (!verifiedOrgId) return null;

	const verifiedIdentity = getRequestIdentity(request);
	if (verifiedIdentity.role && FORBIDDEN_COMMERCEML_ROLES.has(verifiedIdentity.role)) {
		void reply.code(403).send({
			error: "PermissionDenied",
			permission,
			role: verifiedIdentity.role,
			message:
				"Операции CommerceML 2.09 (реестры 1С, медицинские акты, склад и зарплаты) для нефинансового персонала запрещены (152-ФЗ / 323-ФЗ ст. 13).",
		});
		return null;
	}

	return {
		organizationId: verifiedOrgId,
		userId: verifiedIdentity.userId || "",
	};
}

function decodeXmlBody(body: string | Buffer): string {
	if (typeof body === "string") {
		return body.replace(/^\uFEFF/, "");
	}
	const asciiHead = body.subarray(0, 256).toString("latin1");
	const encMatch = asciiHead.match(/encoding\s*=\s*["']([^"']+)["']/i);
	const encoding = encMatch?.[1]?.toLowerCase() ?? "utf-8";
	if (encoding === "windows-1251" || encoding === "cp1251" || encoding === "cp-1251") {
		const cp1251Text = new TextDecoder("windows-1251").decode(body).replace(/^\uFEFF/, "");
		if (/<КоммерческаяИнформация(?:\s|>)/i.test(cp1251Text)) {
			return cp1251Text;
		}
		const utf8Text = new TextDecoder("utf-8").decode(body).replace(/^\uFEFF/, "");
		if (/<КоммерческаяИнформация(?:\s|>)/i.test(utf8Text)) {
			return utf8Text;
		}
		return cp1251Text;
	}
	return new TextDecoder("utf-8").decode(body).replace(/^\uFEFF/, "");
}

function extractXmlTagValue(block: string, tagName: string): string | undefined {
	const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
	return match?.[1]?.trim() || undefined;
}

function extractXmlBlocks(xml: string, tagName: string): string[] {
	const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "gi");
	const blocks: string[] = [];
	let m = regex.exec(xml);
	while (m) {
		if (m[1]) blocks.push(m[1]);
		m = regex.exec(xml);
	}
	return blocks;
}

function parseInboundCommerceMlSyncXml(
	xmlText: string,
	organizationId: string,
): { ok: true; payload: OneCSyncPayload } | { ok: false; message: string } {
	const trimmed = xmlText.trim();
	if (!trimmed.startsWith("<") || !/<КоммерческаяИнформация(?:\s|>)/i.test(trimmed)) {
		return {
			ok: false,
			message: "Некорректный XML CommerceML 2.09: отсутствует корневой элемент <КоммерческаяИнформация>.",
		};
	}

	const normalizedForHash = trimmed.replace(/\r\n/g, "\n");
	const explicitSyncId =
		extractXmlTagValue(trimmed, "ИдПакета") ||
		`1c-xml-${sha256Hex(normalizedForHash).slice(0, 24)}`;

	const postedDocumentConfirmations = extractXmlBlocks(trimmed, "Документ")
		.map((docBlock) => {
			const documentId = extractXmlTagValue(docBlock, "Ид");
			const documentNumber = extractXmlTagValue(docBlock, "Номер");
			if (!documentId || !documentNumber) return null;
			const postedDate = extractXmlTagValue(docBlock, "Дата");
			const postedRaw = extractXmlTagValue(docBlock, "Проведен");
			const isPosted = postedRaw ? postedRaw.toLowerCase() !== "false" : true;
			return {
				documentId,
				documentNumber,
				isPosted,
				oneCDocumentNumber: documentNumber,
				...(postedDate ? { postedAtIso: postedDate } : {}),
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);

	const inventoryStockUpdates = extractXmlBlocks(trimmed, "Предложение")
		.map((offerBlock) => {
			const idVal = extractXmlTagValue(offerBlock, "Ид");
			const skuVal = extractXmlTagValue(offerBlock, "Артикул");
			const qtyRaw = extractXmlTagValue(offerBlock, "Количество");
			if ((!idVal && !skuVal) || qtyRaw === undefined) return null;
			const updatedQty = Number(qtyRaw.replace(",", "."));
			if (!Number.isFinite(updatedQty) || updatedQty < 0) return null;
			const priceRaw = extractXmlTagValue(offerBlock, "ЦенаЗаЕдиницу");
			const priceNum = priceRaw ? Number(priceRaw.replace(",", ".")) : undefined;
			const unitCostKopecks =
				priceNum !== undefined && Number.isFinite(priceNum) && priceNum >= 0
					? rublesToKopecks(priceNum)
					: undefined;
			return {
				...(idVal && UUID_REGEX.test(idVal) ? { itemId: idVal } : {}),
				...(skuVal ? { sku: skuVal } : idVal ? { sku: idVal } : {}),
				updatedQty,
				...(unitCostKopecks !== undefined ? { unitCostKopecks } : {}),
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);

	const reconciledPayments = extractXmlBlocks(trimmed, "Оплата")
		.map((payBlock) => {
			const paymentId = extractXmlTagValue(payBlock, "Ид");
			if (!paymentId || !UUID_REGEX.test(paymentId)) return null;
			const fiscalReceiptNumber = extractXmlTagValue(payBlock, "НомерЧека");
			const status = extractXmlTagValue(payBlock, "Статус") || "reconciled";
			return {
				paymentId,
				status,
				...(fiscalReceiptNumber ? { fiscalReceiptNumber } : {}),
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);

	if (
		postedDocumentConfirmations.length === 0 &&
		inventoryStockUpdates.length === 0 &&
		reconciledPayments.length === 0
	) {
		return {
			ok: false,
			message:
				"XML CommerceML 2.09 не содержит распознаваемых элементов синхронизации (<Документ>, <Предложение> или <Оплата>).",
		};
	}

	const candidate: OneCSyncPayload = {
		organizationId,
		syncTransactionId: explicitSyncId,
		syncTimestamp: new Date().toISOString(),
		postedDocumentConfirmations,
		inventoryStockUpdates,
		reconciledPayments,
	};

	const validated = oneCSyncPayloadSchema.safeParse(candidate);
	if (!validated.success) {
		return {
			ok: false,
			message: validated.error.issues[0]?.message ?? "Ошибка валидации распарсенного XML-пакета 1С.",
		};
	}

	return { ok: true, payload: validated.data };
}

export async function registerCommerceMlRoutes(app: FastifyInstance): Promise<void> {
	if (!app.hasContentTypeParser("application/xml")) {
		app.addContentTypeParser(
			["application/xml", "text/xml"],
			{ parseAs: "buffer" },
			(_req, body, done) => {
				done(null, body);
			},
		);
	}

	// ═════════════════════════════════════════════════════════════════════════
	// 1. EXPORT ENDPOINTS (GET & POST)
	// ═════════════════════════════════════════════════════════════════════════

	const executeExport = async (
		authOrgId: string,
		reply: FastifyReply,
		inputData: z.infer<typeof exportPostBodySchema>,
	) => {
		if (inputData.organizationId && inputData.organizationId !== authOrgId) {
			return reply.code(403).send({
				error: "TenantMismatch",
				message: "Запрошенная организация не совпадает с авторизованным арендатором.",
			});
		}

		const todayIso = new Date().toISOString().slice(0, 10);
		const startDateIso = inputData.startDateIso || todayIso;
		const endDateIso = inputData.endDateIso || startDateIso;

		const result = await CommerceMlService.buildCommerceMlPackage({
			organizationId: authOrgId,
			startDateIso,
			endDateIso,
			shiftId: inputData.shiftId,
			includeRetailSales: inputData.includeRetailSales,
			includeMedicalActs: inputData.includeMedicalActs,
			includeMaterials: inputData.includeMaterials,
			includePayroll: inputData.includePayroll,
			chartOfAccountsOverrides: inputData.chartOfAccountsOverrides,
			clinicProfileOverrides: inputData.clinicProfileOverrides,
		});

		if (inputData.format === "xml") {
			const filename = `1C_CommerceML209_${result.package.clinic.prefix1C || "DN"}_${startDateIso.replace(/-/g, "")}.xml`;
			return reply
				.header("Content-Type", "application/xml; charset=utf-8")
				.header("Content-Disposition", `attachment; filename="${filename}"`)
				.header("X-CommerceML-Version", COMMERCEML_VERSION_209)
				.header("X-CommerceML-SHA256", result.sha256)
				.send(result.xml);
		}

		return reply.send({
			success: true,
			packageId: result.package.packageId,
			generatedAt: result.package.generatedAtIso,
			sha256: result.sha256,
			integrity: result.integrity,
			package: result.package,
			xml: result.xml,
		});
	};

	const handleGetExport = async (request: FastifyRequest, reply: FastifyReply) => {
		const access = await requireCommerceMlAccess(request, reply, "integrations.commerceml.export");
		if (!access) return;

		const parsedQuery = exportQuerySchema.safeParse(request.query || {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsedQuery.error.issues[0]?.message ?? "Некорректные параметры запроса экспорта CommerceML.",
				details: parsedQuery.error.issues,
			});
		}
		return executeExport(access.organizationId, reply, parsedQuery.data);
	};

	const handlePostExport = async (request: FastifyRequest, reply: FastifyReply) => {
		const access = await requireCommerceMlAccess(request, reply, "integrations.commerceml.export");
		if (!access) return;

		const parsedBody = exportPostBodySchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsedBody.error.issues[0]?.message ?? "Некорректное тело запроса экспорта CommerceML.",
				details: parsedBody.error.issues,
			});
		}
		return executeExport(access.organizationId, reply, parsedBody.data);
	};

	app.get("/api/v1/integrations/1c/commerceml/export", handleGetExport);
	app.post("/api/v1/integrations/1c/commerceml/export", handlePostExport);
	app.get("/api/commerceml/export", handleGetExport);
	app.post("/api/commerceml/export", handlePostExport);

	// ═════════════════════════════════════════════════════════════════════════
	// 2. CATALOG (import.xml) & OFFERS (offers.xml) ENDPOINTS
	// ═════════════════════════════════════════════════════════════════════════

	const handleGetCatalog = async (request: FastifyRequest, reply: FastifyReply) => {
		const access = await requireCommerceMlAccess(request, reply, "integrations.commerceml.export");
		if (!access) return;

		const parsedQuery = catalogQuerySchema.safeParse(request.query || {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsedQuery.error.issues[0]?.message ?? "Некорректные параметры запроса каталога CommerceML.",
				details: parsedQuery.error.issues,
			});
		}

		const res = await CommerceMlService.buildCatalogXml({
			organizationId: access.organizationId,
			classifierName: parsedQuery.data.classifierName || "Классификатор стоматологических услуг и материалов",
			catalogName: parsedQuery.data.catalogName || "Каталог медицинских услуг",
			includeInactive: parsedQuery.data.includeInactive,
			priceTypeTitle: parsedQuery.data.priceTypeTitle || "Основной прайс-лист",
		});

		if (parsedQuery.data.format === "json") {
			return reply.send(res);
		}
		return reply
			.header("Content-Type", "application/xml; charset=utf-8")
			.header("X-CommerceML-Version", COMMERCEML_VERSION_209)
			.header("X-CommerceML-SHA256", res.sha256)
			.send(res.xml);
	};

	const handleGetOffers = async (request: FastifyRequest, reply: FastifyReply) => {
		const access = await requireCommerceMlAccess(request, reply, "integrations.commerceml.export");
		if (!access) return;

		const parsedQuery = offersQuerySchema.safeParse(request.query || {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsedQuery.error.issues[0]?.message ?? "Некорректные параметры запроса остатков CommerceML.",
				details: parsedQuery.error.issues,
			});
		}

		const res = await CommerceMlService.buildOffersXml({
			organizationId: access.organizationId,
			warehouseName: parsedQuery.data.warehouseName || "Основной склад клиники",
			includeZeroStock: parsedQuery.data.includeZeroStock,
			priceTypeTitle: parsedQuery.data.priceTypeTitle || "Основной прайс-лист",
		});

		if (parsedQuery.data.format === "json") {
			return reply.send(res);
		}
		return reply
			.header("Content-Type", "application/xml; charset=utf-8")
			.header("X-CommerceML-Version", COMMERCEML_VERSION_209)
			.header("X-CommerceML-SHA256", res.sha256)
			.send(res.xml);
	};

	app.get("/api/v1/integrations/1c/commerceml/catalog", handleGetCatalog);
	app.get("/api/commerceml/catalog", handleGetCatalog);
	app.get("/api/v1/integrations/1c/commerceml/offers", handleGetOffers);
	app.get("/api/commerceml/offers", handleGetOffers);

	// ═════════════════════════════════════════════════════════════════════════
	// 3. INBOUND ACID SYNC ENDPOINT (POST)
	// ═════════════════════════════════════════════════════════════════════════

	const handleSync = async (request: FastifyRequest, reply: FastifyReply) => {
		const access = await requireCommerceMlAccess(request, reply, "integrations.commerceml.sync");
		if (!access) return;

		const contentType = String(request.headers["content-type"] || "").toLowerCase();
		let payloadToSync: OneCSyncPayload;

		if (
			Buffer.isBuffer(request.body) ||
			typeof request.body === "string"
		) {
			const decoded = decodeXmlBody(request.body);
			const trimmed = decoded.trim();
			const looksLikeJson = !contentType.includes("xml") && trimmed.startsWith("{");

			if (looksLikeJson) {
				let parsedJson: unknown;
				try {
					parsedJson = JSON.parse(trimmed);
				} catch {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный JSON в запросе синхронизации 1С.",
					});
				}
				if (
					parsedJson &&
					typeof parsedJson === "object" &&
					"organizationId" in parsedJson &&
					(parsedJson as { organizationId?: unknown }).organizationId !== undefined &&
					(parsedJson as { organizationId?: unknown }).organizationId !== access.organizationId
				) {
					return reply.code(403).send({
						error: "TenantMismatch",
						message: "Указанная организация не совпадает с авторизованным арендатором.",
					});
				}
				const safeJson = oneCSyncPayloadSchema.safeParse({
					...(parsedJson && typeof parsedJson === "object" ? parsedJson : {}),
					organizationId: access.organizationId,
				});
				if (!safeJson.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: safeJson.error.issues[0]?.message ?? "Некорректный JSON-пакет синхронизации 1С.",
						details: safeJson.error.issues,
					});
				}
				payloadToSync = safeJson.data;
			} else {
				const xmlResult = parseInboundCommerceMlSyncXml(decoded, access.organizationId);
				if (!xmlResult.ok) {
					return reply.code(400).send({
						error: "InvalidXmlPayload",
						message: xmlResult.message,
					});
				}
				payloadToSync = xmlResult.payload;
			}
		} else if (typeof request.body === "object" && request.body !== null && !Array.isArray(request.body)) {
			const rawObj = request.body as Record<string, unknown>;
			if (rawObj.organizationId !== undefined && rawObj.organizationId !== access.organizationId) {
				return reply.code(403).send({
					error: "TenantMismatch",
					message: "Указанная организация не совпадает с авторизованным арендатором.",
				});
			}
			const safeObj = oneCSyncPayloadSchema.safeParse({
				...rawObj,
				organizationId: access.organizationId,
			});
			if (!safeObj.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: safeObj.error.issues[0]?.message ?? "Некорректные данные синхронизации 1С.",
					details: safeObj.error.issues,
				});
			}
			payloadToSync = safeObj.data;
		} else {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Передайте JSON или XML CommerceML 2.09 для синхронизации с 1С.",
			});
		}

		const syncResult = await CommerceMlService.syncFrom1C(
			payloadToSync,
			access.userId || undefined,
		);
		return reply.send(syncResult);
	};

	app.post("/api/v1/integrations/1c/commerceml/sync", handleSync);
	app.post("/api/commerceml/sync", handleSync);

	// ═════════════════════════════════════════════════════════════════════════
	// 4. VALIDATION ENDPOINT
	// ═════════════════════════════════════════════════════════════════════════

	const handleValidate = async (request: FastifyRequest, reply: FastifyReply) => {
		const access = await requireCommerceMlAccess(request, reply, "integrations.commerceml.validate");
		if (!access) return;

		const parsedPkg = oneCCommerceMlPackageSchema.safeParse(request.body);
		if (!parsedPkg.success) {
			return reply.status(400).send({
				error: "InvalidPayload",
				message: parsedPkg.error.issues[0]?.message ?? "Требуется передать валидный пакет CommerceML 2.09",
				details: parsedPkg.error.issues,
			});
		}

		const integrity = validatePackageIntegrity(parsedPkg.data);
		return reply.send({
			isValid: integrity.isValid,
			errors: integrity.errors,
			totalsKop: integrity.totalsKop,
			sha256: integrity.sha256,
		});
	};

	app.post("/api/v1/integrations/1c/commerceml/validate", handleValidate);
	app.post("/api/commerceml/validate", handleValidate);

	// ═════════════════════════════════════════════════════════════════════════
	// 5. CHECK DOUBLE POSTING ENDPOINT
	// ═════════════════════════════════════════════════════════════════════════

	const handleCheckDoublePosting = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const access = await requireCommerceMlAccess(request, reply, "integrations.commerceml.export");
		if (!access) return;

		const parsedBody = checkDoublePostingBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "MissingSha256",
				message: parsedBody.error.issues[0]?.message ?? "Необходимо передать sha256Hash пакета или документа",
				details: parsedBody.error.issues,
			});
		}

		if (parsedBody.data.organizationId && parsedBody.data.organizationId !== access.organizationId) {
			return reply.code(403).send({
				error: "TenantMismatch",
				message: "Запрошенная организация не совпадает с авторизованным арендатором.",
			});
		}

		const check = await CommerceMlService.checkDoublePosting(
			access.organizationId,
			parsedBody.data.sha256Hash,
		);
		return reply.send(check);
	};

	app.post(
		"/api/v1/integrations/1c/commerceml/check-double-posting",
		handleCheckDoublePosting,
	);
	app.post("/api/commerceml/check-double-posting", handleCheckDoublePosting);

	// ═════════════════════════════════════════════════════════════════════════
	// 6. STATUTORY DOMAIN INSPECTION LISTS
	// ═════════════════════════════════════════════════════════════════════════

	app.get("/api/v1/integrations/1c/commerceml/shifts", async (request, reply) => {
		const access = await requireCommerceMlAccess(request, reply, "integrations.commerceml.export");
		if (!access) return;

		const parsedQuery = exportQuerySchema.safeParse(request.query || {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsedQuery.error.issues[0]?.message ?? "Некорректные параметры запроса смен.",
				details: parsedQuery.error.issues,
			});
		}
		const todayIso = new Date().toISOString().slice(0, 10);

		const result = await CommerceMlService.buildCommerceMlPackage({
			organizationId: access.organizationId,
			startDateIso: parsedQuery.data.startDateIso || todayIso,
			endDateIso: parsedQuery.data.endDateIso || parsedQuery.data.startDateIso || todayIso,
			includeRetailSales: true,
			includeMedicalActs: false,
			includeMaterials: false,
			includePayroll: false,
		});

		return reply.send({
			document: result.package.retailSalesDocument,
			sha256: result.package.retailSalesDocument.sha256Hash,
			accountsBreakdown: {
				accountCashDesk: result.package.chartOfAccounts.accountCashDesk,
				accountAcquiringTransit:
					result.package.chartOfAccounts.accountAcquiringTransit,
				accountBankCurrent: result.package.chartOfAccounts.accountBankCurrent,
				accountAdvancesReceived:
					result.package.chartOfAccounts.accountAdvancesReceived,
			},
		});
	});

	app.get("/api/v1/integrations/1c/commerceml/acts", async (request, reply) => {
		const access = await requireCommerceMlAccess(request, reply, "integrations.commerceml.export");
		if (!access) return;

		const parsedQuery = exportQuerySchema.safeParse(request.query || {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsedQuery.error.issues[0]?.message ?? "Некорректные параметры запроса медицинских актов.",
				details: parsedQuery.error.issues,
			});
		}
		const todayIso = new Date().toISOString().slice(0, 10);

		const result = await CommerceMlService.buildCommerceMlPackage({
			organizationId: access.organizationId,
			startDateIso: parsedQuery.data.startDateIso || todayIso,
			endDateIso: parsedQuery.data.endDateIso || parsedQuery.data.startDateIso || todayIso,
			includeRetailSales: false,
			includeMedicalActs: true,
			includeMaterials: false,
			includePayroll: false,
		});

		return reply.send({
			medicalActs: result.package.medicalActs,
			count: result.package.medicalActs.length,
		});
	});

	app.get("/api/v1/integrations/1c/commerceml/materials", async (request, reply) => {
		const access = await requireCommerceMlAccess(request, reply, "integrations.commerceml.export");
		if (!access) return;

		const parsedQuery = exportQuerySchema.safeParse(request.query || {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsedQuery.error.issues[0]?.message ?? "Некорректные параметры запроса списания материалов.",
				details: parsedQuery.error.issues,
			});
		}
		const todayIso = new Date().toISOString().slice(0, 10);

		const result = await CommerceMlService.buildCommerceMlPackage({
			organizationId: access.organizationId,
			startDateIso: parsedQuery.data.startDateIso || todayIso,
			endDateIso: parsedQuery.data.endDateIso || parsedQuery.data.startDateIso || todayIso,
			includeRetailSales: false,
			includeMedicalActs: false,
			includeMaterials: true,
			includePayroll: false,
		});

		return reply.send({
			materialWriteoffDocument: result.package.materialWriteoffDocument,
			sha256: result.package.materialWriteoffDocument.sha256Hash,
			accounts: {
				debitAccount: result.package.chartOfAccounts.accountProductionCost,
				creditAccountMaterials: result.package.chartOfAccounts.accountMaterials,
				creditAccountConsumables:
					result.package.chartOfAccounts.accountConsumables,
			},
		});
	});
}

// Backward-compatible default export
export default registerCommerceMlRoutes;
