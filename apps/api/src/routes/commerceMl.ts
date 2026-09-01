/**
 * DENTE Dental CRM — 1C:Enterprise (1С:Бухгалтерия 8.3 / 1С:Медицина)
 * CommerceML 2.09 Fastify Integration Routes.
 *
 * Statutory Endpoints:
 * - GET  /api/v1/integrations/1c/commerceml/export — Download statutory CommerceML 2.09 XML package.
 * - POST /api/v1/integrations/1c/commerceml/export — Generate CommerceML 2.09 JSON/XML package with SHA-256 idempotency.
 * - POST /api/v1/integrations/1c/commerceml/sync   — Inbound ACID sync from 1C (inventory stock, payments, confirmations).
 * - POST /api/v1/integrations/1c/commerceml/validate — Validate CommerceML package for exact kopeck math and accounts balancing.
 * - GET  /api/v1/integrations/1c/commerceml/shifts — List cash register shifts with 54-FZ status and 1C accounts (50.01, 57.03, 51, 62.02).
 * - GET  /api/v1/integrations/1c/commerceml/acts   — List medical acts with 804n nomenclature codes and doctor names.
 * - GET  /api/v1/integrations/1c/commerceml/materials — List CSO and warehouse write-offs (Account 10.01 / 10.06 -> 20.01).
 * - POST /api/v1/integrations/1c/commerceml/check-double-posting — Prevent double posting in 1C via SHA-256 hash.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	COMMERCEML_VERSION_209,
	OneCCommerceMlPackage,
	validatePackageIntegrity,
} from "@dental/shared";
import {
	namedDevelopmentModeActive,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { getRequestIdentity } from "../security/identity.js";
import {
	CommerceMlService,
	exportCommerceMlParamsSchema,
	oneCSyncPayloadSchema,
} from "../services/finance/commerceMlService.js";

const exportQuerySchema = z.object({
	organizationId: z.string().uuid().optional(),
	startDateIso: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	endDateIso: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	format: z.enum(["xml", "json"]).default("xml"),
	shiftId: z.string().optional(),
	includeRetailSales: z
		.union([z.boolean(), z.string()])
		.transform((v) => v === true || v === "true" || v === "1")
		.default(true),
	includeMedicalActs: z
		.union([z.boolean(), z.string()])
		.transform((v) => v === true || v === "true" || v === "1")
		.default(true),
	includeMaterials: z
		.union([z.boolean(), z.string()])
		.transform((v) => v === true || v === "true" || v === "1")
		.default(true),
	includePayroll: z
		.union([z.boolean(), z.string()])
		.transform((v) => v === true || v === "true" || v === "1")
		.default(true),
});

export async function registerCommerceMlRoutes(app: FastifyInstance): Promise<void> {
	// ═════════════════════════════════════════════════════════════════════════
	// 1. EXPORT ENDPOINTS (GET & POST)
	// ═════════════════════════════════════════════════════════════════════════

	const handleExport = async (
		request: FastifyRequest,
		reply: FastifyReply,
		inputData: Record<string, unknown>,
	) => {
		const verifiedOrgId = await requireResolvedOrganizationId(request, reply);
		if (reply.sent) return;
		const targetOrgId =
			verifiedOrgId ||
			(typeof inputData.organizationId === "string"
				? inputData.organizationId
				: undefined);

		if (!targetOrgId) {
			if (!namedDevelopmentModeActive()) {
				return reply.status(401).send({
					error: "Unauthorized",
					message: "Необходимо указать действующий токен организации",
				});
			}
		}

		const resolvedOrgId = targetOrgId || "00000000-0000-7000-8000-000000000001";
		const todayIso = new Date().toISOString().slice(0, 10);

		const startDateIso =
			typeof inputData.startDateIso === "string"
				? inputData.startDateIso
				: todayIso;
		const endDateIso =
			typeof inputData.endDateIso === "string"
				? inputData.endDateIso
				: startDateIso;

		const format = inputData.format === "json" ? "json" : "xml";

		const result = await CommerceMlService.buildCommerceMlPackage({
			organizationId: resolvedOrgId,
			startDateIso,
			endDateIso,
			shiftId:
				typeof inputData.shiftId === "string" ? inputData.shiftId : undefined,
			includeRetailSales: inputData.includeRetailSales !== false,
			includeMedicalActs: inputData.includeMedicalActs !== false,
			includeMaterials: inputData.includeMaterials !== false,
			includePayroll: inputData.includePayroll !== false,
			chartOfAccountsOverrides:
				typeof inputData.chartOfAccountsOverrides === "object" &&
				inputData.chartOfAccountsOverrides !== null
					? (inputData.chartOfAccountsOverrides as any)
					: undefined,
			clinicProfileOverrides:
				typeof inputData.clinicProfileOverrides === "object" &&
				inputData.clinicProfileOverrides !== null
					? (inputData.clinicProfileOverrides as any)
					: undefined,
		});

		if (format === "xml") {
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

	// Primary v1 statutory path
	app.get("/api/v1/integrations/1c/commerceml/export", async (request, reply) => {
		const parsedQuery = exportQuerySchema.parse(request.query || {});
		return handleExport(request, reply, parsedQuery as any);
	});

	app.post("/api/v1/integrations/1c/commerceml/export", async (request, reply) => {
		const parsedBody =
			typeof request.body === "object" && request.body !== null
				? (request.body as Record<string, unknown>)
				: {};
		return handleExport(request, reply, parsedBody);
	});

	// Direct alias paths for web client
	app.get("/api/commerceml/export", async (request, reply) => {
		const parsedQuery = exportQuerySchema.parse(request.query || {});
		return handleExport(request, reply, parsedQuery as any);
	});

	app.post("/api/commerceml/export", async (request, reply) => {
		const parsedBody =
			typeof request.body === "object" && request.body !== null
				? (request.body as Record<string, unknown>)
				: {};
		return handleExport(request, reply, parsedBody);
	});

	// ═════════════════════════════════════════════════════════════════════════
	// 2. INBOUND ACID SYNC ENDPOINT (POST)
	// ═════════════════════════════════════════════════════════════════════════

	const handleSync = async (request: FastifyRequest, reply: FastifyReply) => {
		const verifiedOrgId = await requireResolvedOrganizationId(request, reply);
		if (reply.sent) return;
		const rawBody =
			typeof request.body === "object" && request.body !== null
				? (request.body as Record<string, unknown>)
				: {};

		const resolvedOrgId =
			verifiedOrgId ||
			(typeof rawBody.organizationId === "string"
				? rawBody.organizationId
				: "00000000-0000-7000-8000-000000000001");

		const identity = getRequestIdentity(request);
		const actorUserId = identity.userId || undefined;

		const payload = oneCSyncPayloadSchema.parse({
			...rawBody,
			organizationId: resolvedOrgId,
		});

		const syncResult = await CommerceMlService.syncFrom1C(payload, actorUserId);
		return reply.send(syncResult);
	};

	app.post("/api/v1/integrations/1c/commerceml/sync", handleSync);
	app.post("/api/commerceml/sync", handleSync);

	// ═════════════════════════════════════════════════════════════════════════
	// 3. VALIDATION ENDPOINT
	// ═════════════════════════════════════════════════════════════════════════

	const handleValidate = async (request: FastifyRequest, reply: FastifyReply) => {
		const pkg = request.body as OneCCommerceMlPackage;
		if (!pkg || typeof pkg !== "object") {
			return reply.status(400).send({
				error: "InvalidPayload",
				message: "Требуется передать объект пакета CommerceML 2.09",
			});
		}

		const integrity = validatePackageIntegrity(pkg);
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
	// 4. CHECK DOUBLE POSTING ENDPOINT
	// ═════════════════════════════════════════════════════════════════════════

	const handleCheckDoublePosting = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const verifiedOrgId = await requireResolvedOrganizationId(request, reply);
		if (reply.sent) return;
		const body = request.body as
			| { sha256Hash?: string; organizationId?: string }
			| undefined;

		const hash = body?.sha256Hash;
		if (!hash || typeof hash !== "string") {
			return reply.status(400).send({
				error: "MissingSha256",
				message: "Необходимо передать sha256Hash пакета или документа",
			});
		}

		const resolvedOrgId =
			verifiedOrgId ||
			body?.organizationId ||
			"00000000-0000-7000-8000-000000000001";

		const check = CommerceMlService.checkDoublePosting(resolvedOrgId, hash);
		return reply.send(check);
	};

	app.post(
		"/api/v1/integrations/1c/commerceml/check-double-posting",
		handleCheckDoublePosting,
	);
	app.post("/api/commerceml/check-double-posting", handleCheckDoublePosting);

	// ═════════════════════════════════════════════════════════════════════════
	// 5. STATUTORY DOMAIN INSPECTION LISTS
	// ═════════════════════════════════════════════════════════════════════════

	// Shifts & 54-FZ receipts breakdown (Accounts 50.01, 57.03, 51, 62.02)
	app.get("/api/v1/integrations/1c/commerceml/shifts", async (request, reply) => {
		const verifiedOrgId = await requireResolvedOrganizationId(request, reply);
		if (reply.sent) return;
		const parsedQuery = exportQuerySchema.parse(request.query || {});
		const todayIso = new Date().toISOString().slice(0, 10);
		const resolvedOrgId =
			verifiedOrgId ||
			parsedQuery.organizationId ||
			"00000000-0000-7000-8000-000000000001";

		const result = await CommerceMlService.buildCommerceMlPackage({
			organizationId: resolvedOrgId,
			startDateIso: parsedQuery.startDateIso || todayIso,
			endDateIso: parsedQuery.endDateIso || parsedQuery.startDateIso || todayIso,
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

	// Medical acts (804n codes & doctor names)
	app.get("/api/v1/integrations/1c/commerceml/acts", async (request, reply) => {
		const verifiedOrgId = await requireResolvedOrganizationId(request, reply);
		if (reply.sent) return;
		const parsedQuery = exportQuerySchema.parse(request.query || {});
		const todayIso = new Date().toISOString().slice(0, 10);
		const resolvedOrgId =
			verifiedOrgId ||
			parsedQuery.organizationId ||
			"00000000-0000-7000-8000-000000000001";

		const result = await CommerceMlService.buildCommerceMlPackage({
			organizationId: resolvedOrgId,
			startDateIso: parsedQuery.startDateIso || todayIso,
			endDateIso: parsedQuery.endDateIso || parsedQuery.startDateIso || todayIso,
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

	// Warehouse & CSO write-offs (Account 10.01 / 10.06)
	app.get("/api/v1/integrations/1c/commerceml/materials", async (request, reply) => {
		const verifiedOrgId = await requireResolvedOrganizationId(request, reply);
		if (reply.sent) return;
		const parsedQuery = exportQuerySchema.parse(request.query || {});
		const todayIso = new Date().toISOString().slice(0, 10);
		const resolvedOrgId =
			verifiedOrgId ||
			parsedQuery.organizationId ||
			"00000000-0000-7000-8000-000000000001";

		const result = await CommerceMlService.buildCommerceMlPackage({
			organizationId: resolvedOrgId,
			startDateIso: parsedQuery.startDateIso || todayIso,
			endDateIso: parsedQuery.endDateIso || parsedQuery.startDateIso || todayIso,
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
