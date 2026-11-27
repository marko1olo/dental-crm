/**
 * writeOffBatchDeduction.ts — Пакетное списание ТМЦ за смену и протоколы приёма (Мандат 8b, <= 110L).
 * Реализует Mandate 8e, 8n (1 клик на батч -> списание без блокирования врача).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { generateUuidV7 } from "@dental/shared";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	TreatmentConsumablesService,
} from "../../../services/treatmentConsumablesService.js";
import { executeQuickPackageWriteOff } from "./writeOffVisitBundleExecution.js";

const orgParamsSchema = z.object({
	organizationId: z.string().optional(),
}).strict();

const shiftBatchDeductBodySchema = z.object({
	services: z.array(
		z.object({
			serviceId: z.string().min(1),
			quantity: z.number().optional(),
			serviceName: z.string().optional(),
		}).strict(),
	).optional(),
	visitId: z.string().optional(),
	notes: z.string().nullable().optional(),
	clientMutationId: z.string().nullable().optional(),
	idempotencyKey: z.string().nullable().optional(),
	date: z.string().optional(),
	items: z.array(
		z.object({
			itemId: z.string().min(1),
			qty: z.number(),
			name: z.string().optional(),
		}).strict(),
	).optional(),
}).strict();

const shiftSummaryQuerySchema = z.object({
	date: z.string().optional(),
	organizationId: z.string().optional(),
}).strict();

const standardKitBodySchema = z.object({
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

const sterilizationKitBodySchema = z.object({
	organizationId: z.string().uuid().optional(),
	count: z.number().finite().positive().optional(),
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

const carpulesBodySchema = z.object({
	carpulesCount: z.number().finite().positive().optional(),
	count: z.number().finite().positive().optional(),
	needlesCount: z.number().finite().nonnegative().optional(),
	drugName: z.string().optional(),
	drugId: z.string().optional(),
	needleName: z.string().optional(),
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

const shiftBundleBodySchema = z.object({
	bundleType: z.enum(["therapy", "orthopedics", "surgery"]).optional(),
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

const visitBundleBodySchema = z.object({
	visitType: z.enum([
		"therapy",
		"surgery",
		"implant",
		"sinus_gbr",
		"orthopedics_prep",
		"orthopedics_impression",
		"orthopedics_temporary",
		"orthopedics_cementation",
		"hygiene",
	]).optional(),
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

const orthopedicProtocolBodySchema = z.object({
	protocolId: z.string().optional(),
	toothNumber: z.union([z.string(), z.number()]).optional(),
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

const surgeryBodySchema = z.object({
	category: z.enum(["extraction", "implant", "sinus_lift", "bone_graft", "periodontal"]).optional(),
	operationTitle: z.string().optional(),
	toothNumber: z.union([z.string(), z.number()]).optional(),
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

const hygieneBodySchema = z.object({
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

const quickPackageBodySchema = z.object({
	packageId: z.string().optional(),
	quantityMultiplier: z.number().finite().positive().optional(),
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
}).strict();

const antishockBodySchema = z.object({
	visitId: z.string().nullable().optional(),
	patientName: z.string().optional(),
	doctorName: z.string().optional(),
	notes: z.string().nullable().optional(),
}).strict();

function sendValidationError(reply: FastifyReply, issues: z.ZodIssue[]) {
	return reply.status(400).send({
		error: "ValidationError",
		message: "Некорректные параметры запроса",
		details: issues,
	});
}

function readHeaderIdempotencyKey(req: FastifyRequest): string | undefined {
	const raw = req.headers["idempotency-key"] ?? req.headers["x-idempotency-key"];
	const str = Array.isArray(raw) ? raw[0] : raw;
	return typeof str === "string" && str.trim() ? str.trim() : undefined;
}

async function checkOrg(req: FastifyRequest, rep: FastifyReply, tag: string): Promise<string | null> {
	const resolved = await requireResolvedStaffOrAdminOrganizationId(req, rep, tag);
	if (!resolved) return null;
	const parsedParams = orgParamsSchema.safeParse(req.params ?? {});
	if (!parsedParams.success) {
		sendValidationError(rep, parsedParams.error.issues);
		return null;
	}
	const org = parsedParams.data.organizationId;
	const target = org === "current" || !org ? resolved : org;
	if (resolved !== target) { rep.code(403).send({ error: "Forbidden" }); return null; }
	return target;
}

export async function registerBatchDeductionRoutes(server: FastifyInstance): Promise<void> {
	// Списание расходников за смену и по технологическим картам услуг (BOM)
	const handleShiftDeduct = async (request: FastifyRequest, reply: FastifyReply) => {
		const targetOrgId = await checkOrg(request, reply, "inventory shift batch deduct");
		if (!targetOrgId) return;
		const parsedBody = shiftBatchDeductBodySchema.safeParse(request.body ?? {});
		if (!parsedBody.success) return sendValidationError(reply, parsedBody.error.issues);
		const body = parsedBody.data;
		const effectiveUserId = getRequestIdentity(request).userId ?? request.user?.id ?? null;

		const headerIdemKey = readHeaderIdempotencyKey(request);
		const bodyIdemKey = typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
			? body.idempotencyKey.trim()
			: undefined;
		const idemKey = headerIdemKey ?? bodyIdemKey;
		const effectiveMutationId = idemKey || body.clientMutationId || undefined;

		return withTenantCtx(targetOrgId, async (tx) => {
			if (Array.isArray(body.services) && body.services.length > 0) {
				return TreatmentConsumablesService.executeAutoBomWriteoff(tx, {
					organizationId: targetOrgId,
					visitId: body.visitId || effectiveMutationId || generateUuidV7(),
					services: body.services.map((item) => ({
						serviceId: item.serviceId,
						...(item.quantity !== undefined ? { quantity: item.quantity } : {}),
					})),
					userId: effectiveUserId,
					notes: body.notes,
					allowOverdraft: true,
					clientMutationId: effectiveMutationId,
				});
			}
			return TreatmentConsumablesService.executeShiftBatchDeduction(tx, {
				organizationId: targetOrgId,
				date: body.date,
				userId: effectiveUserId,
				items: body.items,
				notes: body.notes ?? undefined,
				idempotencyKey: idemKey,
				clientMutationId: effectiveMutationId,
			});
		});
	};
	[
		"/:organizationId/shift-batch-deduct",
		"/shift-batch-deduct",
		"/:organizationId/shift-deduct",
		"/shift-deduct",
		"/:organizationId/batch-writeoff",
		"/batch-writeoff",
	].forEach((p) => server.post(p, handleShiftDeduct));

	// Сводка списания расходников за смену для ConsumablesBatchWriteoffModal
	const handleShiftSummary = async (request: FastifyRequest, reply: FastifyReply) => {
		const targetOrgId = await checkOrg(request, reply, "inventory shift summary");
		if (!targetOrgId) return;
		const parsedQuery = shiftSummaryQuerySchema.safeParse(request.query ?? {});
		if (!parsedQuery.success) return sendValidationError(reply, parsedQuery.error.issues);
		return withTenantCtx(targetOrgId, async (tx) =>
			TreatmentConsumablesService.getShiftConsumablesSummary(tx, targetOrgId, parsedQuery.data.date)
		);
	};

	server.get("/:organizationId/shift-summary", handleShiftSummary);
	server.get("/shift-summary", handleShiftSummary);

	// 1-клик протоколы процедур
	server.post("/:organizationId/quick-writeoff-standard-kit", async (req, rep) => {
		const org = await checkOrg(req, rep, "standard kit"); if (!org) return;
		const parsed = standardKitBodySchema.safeParse(req.body ?? {});
		if (!parsed.success) return sendValidationError(rep, parsed.error.issues);
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = readHeaderIdempotencyKey(req);
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffStandardKit(tx, {
			organizationId: org,
			userId: uid,
			visitId: parsed.data.visitId,
			notes: parsed.data.notes,
			idempotencyKey,
		}));
	});

	const handleSteril = async (req: FastifyRequest, rep: FastifyReply) => {
		const org = await checkOrg(req, rep, "steril kit"); if (!org) return;
		const parsed = sterilizationKitBodySchema.safeParse(req.body ?? {});
		if (!parsed.success) return sendValidationError(rep, parsed.error.issues);
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = readHeaderIdempotencyKey(req);
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffSterilizationKit(tx, {
			organizationId: org,
			count: parsed.data.count ?? 1,
			userId: uid,
			visitId: parsed.data.visitId,
			notes: parsed.data.notes,
			idempotencyKey,
		}));
	};
	server.post("/:organizationId/quick-writeoff-sterilization-kit", handleSteril);
	server.post("/quick-writeoff-sterilization-kit", handleSteril);

	const handleCarp = async (req: FastifyRequest, rep: FastifyReply) => {
		const org = await checkOrg(req, rep, "carpules"); if (!org) return;
		const parsed = carpulesBodySchema.safeParse(req.body ?? {});
		if (!parsed.success) return sendValidationError(rep, parsed.error.issues);
		const b = parsed.data;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = readHeaderIdempotencyKey(req);
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffCarpules(tx, {
			organizationId: org,
			carpulesCount: b.carpulesCount ?? b.count ?? 1,
			needlesCount: b.needlesCount,
			drugName: b.drugName ?? b.drugId,
			needleName: b.needleName,
			userId: uid,
			visitId: b.visitId,
			notes: b.notes,
			idempotencyKey,
		}));
	};
	server.post("/:organizationId/quick-writeoff-carpules", handleCarp);
	server.post("/quick-writeoff-carpules", handleCarp);

	server.post("/:organizationId/quick-writeoff-shift-bundle", async (req, rep) => {
		const org = await checkOrg(req, rep, "shift bundle"); if (!org) return;
		const parsed = shiftBundleBodySchema.safeParse(req.body ?? {});
		if (!parsed.success) return sendValidationError(rep, parsed.error.issues);
		const b = parsed.data;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = readHeaderIdempotencyKey(req);
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffShiftBundle(tx, {
			organizationId: org,
			bundleType: b.bundleType || "therapy",
			userId: uid,
			visitId: b.visitId,
			notes: b.notes,
			idempotencyKey,
		}));
	});

	server.post("/:organizationId/quick-writeoff-visit-bundle", async (req, rep) => {
		const org = await checkOrg(req, rep, "visit bundle"); if (!org) return;
		const parsed = visitBundleBodySchema.safeParse(req.body ?? {});
		if (!parsed.success) return sendValidationError(rep, parsed.error.issues);
		const b = parsed.data;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = readHeaderIdempotencyKey(req);
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
			organizationId: org,
			visitType: b.visitType || "therapy",
			userId: uid,
			visitId: b.visitId,
			notes: b.notes,
			idempotencyKey,
		}));
	});

	server.post("/:organizationId/quick-writeoff-orthopedic", async (req, rep) => {
		const org = await checkOrg(req, rep, "orthopedic"); if (!org) return;
		const parsed = orthopedicProtocolBodySchema.safeParse(req.body ?? {});
		if (!parsed.success) return sendValidationError(rep, parsed.error.issues);
		const b = parsed.data;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = readHeaderIdempotencyKey(req);
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffOrthopedicProtocol(tx, {
			organizationId: org,
			protocolId: b.protocolId || "ortho_prep_zirconia_emax",
			userId: uid,
			toothNumber: b.toothNumber,
			visitId: b.visitId,
			notes: b.notes,
			idempotencyKey,
		}));
	});

	const handleSurg = async (req: FastifyRequest, rep: FastifyReply) => {
		const org = await checkOrg(req, rep, "surgery"); if (!org) return;
		const parsed = surgeryBodySchema.safeParse(req.body ?? {});
		if (!parsed.success) return sendValidationError(rep, parsed.error.issues);
		const b = parsed.data;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = readHeaderIdempotencyKey(req);
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffSurgery(tx, {
			organizationId: org,
			userId: uid,
			category: b.category || "extraction",
			operationTitle: b.operationTitle,
			toothNumber: b.toothNumber,
			visitId: b.visitId,
			notes: b.notes,
			idempotencyKey,
		}));
	};
	server.post("/:organizationId/quick-writeoff-surgery", handleSurg);
	server.post("/quick-writeoff-surgery", handleSurg);

	const handleHygiene = async (req: FastifyRequest, rep: FastifyReply) => {
		const org = await checkOrg(req, rep, "hygiene"); if (!org) return;
		const parsed = hygieneBodySchema.safeParse(req.body ?? {});
		if (!parsed.success) return sendValidationError(rep, parsed.error.issues);
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = readHeaderIdempotencyKey(req);
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
			organizationId: org,
			visitType: "hygiene",
			userId: uid,
			visitId: parsed.data.visitId,
			notes: parsed.data.notes,
			idempotencyKey,
		}));
	};
	server.post("/:organizationId/quick-writeoff-hygiene", handleHygiene);
	server.post("/quick-writeoff-hygiene", handleHygiene);

	server.post("/:organizationId/quick-writeoff-package", async (req, rep) => {
		const org = await checkOrg(req, rep, "package"); if (!org) return;
		const parsed = quickPackageBodySchema.safeParse(req.body ?? {});
		if (!parsed.success) return sendValidationError(rep, parsed.error.issues);
		const b = parsed.data;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = readHeaderIdempotencyKey(req);
		return withTenantCtx(org, (tx) => executeQuickPackageWriteOff(tx, {
			organizationId: org,
			effectiveUserId: uid,
			packageId: b.packageId,
			quantityMultiplier: b.quantityMultiplier,
			visitId: b.visitId,
			notes: b.notes,
			idempotencyKey,
		}));
	});

	const handleAntishock = async (req: FastifyRequest, rep: FastifyReply) => {
		const org = await checkOrg(req, rep, "antishock"); if (!org) return;
		const parsed = antishockBodySchema.safeParse(req.body ?? {});
		if (!parsed.success) return sendValidationError(rep, parsed.error.issues);
		const b = parsed.data;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = readHeaderIdempotencyKey(req);
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffEmergencyAntishock(tx, {
			organizationId: org,
			userId: uid,
			visitId: b.visitId,
			patientName: b.patientName,
			doctorName: b.doctorName,
			notes: b.notes,
			idempotencyKey,
		}));
	};
	server.post("/:organizationId/quick-writeoff-emergency-antishock", handleAntishock);
	server.post("/quick-writeoff-emergency-antishock", handleAntishock);
}
