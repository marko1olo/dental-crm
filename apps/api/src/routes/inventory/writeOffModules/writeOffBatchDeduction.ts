/**
 * writeOffBatchDeduction.ts — Пакетное списание ТМЦ за смену и протоколы приёма (Мандат 8b, <= 110L).
 * Реализует Mandate 8e, 8n (1 клик на батч -> списание без блокирования врача).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	TreatmentConsumablesService,
	type QuickWriteoffVisitBundleType,
	type ShiftBundleType,
} from "../../../services/treatmentConsumablesService.js";
import { executeQuickPackageWriteOff } from "./writeOffVisitBundleExecution.js";

interface OrgParams {
	organizationId?: string | undefined;
}

interface ShiftBatchDeductBody {
	services?: Array<{ serviceId: string; quantity?: number; serviceName?: string }>;
	visitId?: string;
	notes?: string | null;
	clientMutationId?: string | null;
	date?: string;
	items?: Array<{ itemId: string; qty: number; name?: string }>;
}

interface StandardKitBody {
	visitId?: string | null;
	notes?: string | null;
}

interface SterilizationKitBody {
	count?: number;
	visitId?: string | null;
	notes?: string | null;
}

interface CarpulesBody {
	carpulesCount?: number;
	count?: number;
	needlesCount?: number;
	drugName?: string;
	drugId?: string;
	needleName?: string;
	visitId?: string | null;
	notes?: string | null;
}

interface ShiftBundleBody {
	bundleType?: ShiftBundleType;
	visitId?: string | null;
	notes?: string | null;
}

interface VisitBundleBody {
	visitType?: QuickWriteoffVisitBundleType;
	visitId?: string | null;
	notes?: string | null;
}

interface OrthopedicProtocolBody {
	protocolId?: string;
	toothNumber?: string | number;
	visitId?: string | null;
	notes?: string | null;
}

interface SurgeryBody {
	category?: "extraction" | "implant" | "sinus_lift" | "bone_graft" | "periodontal";
	operationTitle?: string;
	toothNumber?: string | number;
	visitId?: string | null;
	notes?: string | null;
}

interface QuickPackageBody {
	packageId?: string;
	quantityMultiplier?: number;
	visitId?: string | null;
	notes?: string | null;
}

interface AntishockBody {
	visitId?: string | null;
	patientName?: string;
	doctorName?: string;
	notes?: string | null;
}

async function checkOrg(req: FastifyRequest<{ Params?: OrgParams }>, rep: FastifyReply, tag: string): Promise<string | null> {
	const resolved = await requireResolvedStaffOrAdminOrganizationId(req, rep, tag);
	if (!resolved) return null;
	const org = req.params?.organizationId;
	const target = org === "current" || !org ? resolved : org;
	if (resolved !== target) { rep.code(403).send({ error: "Forbidden" }); return null; }
	return target;
}

export async function registerBatchDeductionRoutes(server: FastifyInstance): Promise<void> {
	// Списание расходников за смену и по технологическим картам услуг (BOM)
	const handleShiftDeduct = async (request: FastifyRequest<{ Params?: OrgParams; Body?: ShiftBatchDeductBody }>, reply: FastifyReply) => {
		const targetOrgId = await checkOrg(request, reply, "inventory shift batch deduct");
		if (!targetOrgId) return;
		const body = request.body ?? {};
		const effectiveUserId = getRequestIdentity(request).userId ?? request.user?.id ?? null;

		const rawIdemKey =
			request.headers["idempotency-key"] ??
			request.headers["x-idempotency-key"] ??
			(body as { idempotencyKey?: unknown }).idempotencyKey;
		const idemKeyStr = Array.isArray(rawIdemKey) ? rawIdemKey[0] : rawIdemKey;
		const idemKey = typeof idemKeyStr === "string" && idemKeyStr.trim() ? idemKeyStr.trim() : undefined;
		const effectiveMutationId = idemKey || body.clientMutationId || undefined;

		const result = await withTenantCtx(targetOrgId, async (tx) => {
			if (Array.isArray(body.services) && body.services.length > 0) {
				return TreatmentConsumablesService.executeAutoBomWriteoff(tx, {
					organizationId: targetOrgId,
					visitId: body.visitId || "batch-service-bom",
					services: body.services,
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

		if (idemKey) {
			reply.header("X-Idempotency-Key", idemKey);
		}
		return result;
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
	const handleShiftSummary = async (
		request: FastifyRequest<{ Params?: OrgParams; Querystring: { date?: string; organizationId?: string } }>,
		reply: FastifyReply,
	) => {
		const targetOrgId = await checkOrg(request, reply, "inventory shift summary");
		if (!targetOrgId) return;
		return withTenantCtx(targetOrgId, async (tx) =>
			TreatmentConsumablesService.getShiftConsumablesSummary(tx, targetOrgId, request.query.date)
		);
	};

	server.get("/:organizationId/shift-summary", handleShiftSummary);
	server.get("/shift-summary", handleShiftSummary);

	// 1-клик протоколы процедур
	server.post<{ Params?: OrgParams; Body?: StandardKitBody }>("/:organizationId/quick-writeoff-standard-kit", async (req, rep) => {
		const org = await checkOrg(req, rep, "standard kit"); if (!org) return;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.headers["x-idempotency-key"] as string) || undefined;
		const result = await withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffStandardKit(tx, {
			organizationId: org,
			userId: uid,
			visitId: req.body?.visitId,
			notes: req.body?.notes,
			idempotencyKey,
		}));
		if (idempotencyKey) { rep.header("X-Idempotency-Key", idempotencyKey); }
		return result;
	});

	const handleSteril = async (req: FastifyRequest<{ Params?: OrgParams; Body?: SterilizationKitBody }>, rep: FastifyReply) => {
		const org = await checkOrg(req, rep, "steril kit"); if (!org) return;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.headers["x-idempotency-key"] as string) || undefined;
		const result = await withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffSterilizationKit(tx, {
			organizationId: org,
			count: req.body?.count ?? 1,
			userId: uid,
			visitId: req.body?.visitId,
			notes: req.body?.notes,
			idempotencyKey,
		}));
		if (idempotencyKey) { rep.header("X-Idempotency-Key", idempotencyKey); }
		return result;
	};
	server.post("/:organizationId/quick-writeoff-sterilization-kit", handleSteril);
	server.post("/quick-writeoff-sterilization-kit", handleSteril);

	const handleCarp = async (req: FastifyRequest<{ Params?: OrgParams; Body?: CarpulesBody }>, rep: FastifyReply) => {
		const org = await checkOrg(req, rep, "carpules"); if (!org) return;
		const b = req.body ?? {};
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.headers["x-idempotency-key"] as string) || undefined;
		const result = await withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffCarpules(tx, {
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
		if (idempotencyKey) { rep.header("X-Idempotency-Key", idempotencyKey); }
		return result;
	};
	server.post("/:organizationId/quick-writeoff-carpules", handleCarp);
	server.post("/quick-writeoff-carpules", handleCarp);

	server.post<{ Params?: OrgParams; Body?: ShiftBundleBody }>("/:organizationId/quick-writeoff-shift-bundle", async (req, rep) => {
		const org = await checkOrg(req, rep, "shift bundle"); if (!org) return;
		const b = req.body ?? {};
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.headers["x-idempotency-key"] as string) || undefined;
		const result = await withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffShiftBundle(tx, {
			organizationId: org,
			bundleType: b.bundleType || "therapy",
			userId: uid,
			visitId: b.visitId,
			notes: b.notes,
			idempotencyKey,
		}));
		if (idempotencyKey) { rep.header("X-Idempotency-Key", idempotencyKey); }
		return result;
	});

	server.post<{ Params?: OrgParams; Body?: VisitBundleBody }>("/:organizationId/quick-writeoff-visit-bundle", async (req, rep) => {
		const org = await checkOrg(req, rep, "visit bundle"); if (!org) return;
		const b = req.body ?? {};
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.headers["x-idempotency-key"] as string) || undefined;
		const result = await withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
			organizationId: org,
			visitType: b.visitType || "therapy",
			userId: uid,
			visitId: b.visitId,
			notes: b.notes,
			idempotencyKey,
		}));
		if (idempotencyKey) { rep.header("X-Idempotency-Key", idempotencyKey); }
		return result;
	});

	server.post<{ Params?: OrgParams; Body?: OrthopedicProtocolBody }>("/:organizationId/quick-writeoff-orthopedic", async (req, rep) => {
		const org = await checkOrg(req, rep, "orthopedic"); if (!org) return;
		const b = req.body ?? {};
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.headers["x-idempotency-key"] as string) || undefined;
		const result = await withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffOrthopedicProtocol(tx, {
			organizationId: org,
			protocolId: b.protocolId || "ortho_prep_zirconia_emax",
			userId: uid,
			toothNumber: b.toothNumber,
			visitId: b.visitId,
			notes: b.notes,
			idempotencyKey,
		}));
		if (idempotencyKey) { rep.header("X-Idempotency-Key", idempotencyKey); }
		return result;
	});

	const handleSurg = async (req: FastifyRequest<{ Params?: OrgParams; Body?: SurgeryBody }>, rep: FastifyReply) => {
		const org = await checkOrg(req, rep, "surgery"); if (!org) return;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.headers["x-idempotency-key"] as string) || undefined;
		const result = await withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffSurgery(tx, {
			organizationId: org,
			userId: uid,
			category: req.body?.category || "extraction",
			operationTitle: req.body?.operationTitle,
			toothNumber: req.body?.toothNumber,
			visitId: req.body?.visitId,
			notes: req.body?.notes,
			idempotencyKey,
		}));
		if (idempotencyKey) { rep.header("X-Idempotency-Key", idempotencyKey); }
		return result;
	};
	server.post("/:organizationId/quick-writeoff-surgery", handleSurg);
	server.post("/quick-writeoff-surgery", handleSurg);

	const handleHygiene = async (req: FastifyRequest<{ Params?: OrgParams; Body?: { visitId?: string; notes?: string } }>, rep: FastifyReply) => {
		const org = await checkOrg(req, rep, "hygiene"); if (!org) return;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.headers["x-idempotency-key"] as string) || undefined;
		const result = await withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
			organizationId: org,
			visitType: "hygiene",
			userId: uid,
			visitId: req.body?.visitId,
			notes: req.body?.notes,
			idempotencyKey,
		}));
		if (idempotencyKey) { rep.header("X-Idempotency-Key", idempotencyKey); }
		return result;
	};
	server.post("/:organizationId/quick-writeoff-hygiene", handleHygiene);
	server.post("/quick-writeoff-hygiene", handleHygiene);

	server.post<{ Params?: OrgParams; Body?: QuickPackageBody }>("/:organizationId/quick-writeoff-package", async (req, rep) => {
		const org = await checkOrg(req, rep, "package"); if (!org) return;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.headers["x-idempotency-key"] as string) || undefined;
		const result = await withTenantCtx(org, (tx) => executeQuickPackageWriteOff(tx, {
			organizationId: org,
			effectiveUserId: uid,
			packageId: req.body?.packageId,
			quantityMultiplier: req.body?.quantityMultiplier,
			visitId: req.body?.visitId,
			notes: req.body?.notes,
			idempotencyKey,
		}));
		if (idempotencyKey) { rep.header("X-Idempotency-Key", idempotencyKey); }
		return result;
	});

	const handleAntishock = async (req: FastifyRequest<{ Params?: OrgParams; Body?: AntishockBody }>, rep: FastifyReply) => {
		const org = await checkOrg(req, rep, "antishock"); if (!org) return;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		const idempotencyKey = (req.headers["idempotency-key"] as string) || (req.headers["x-idempotency-key"] as string) || undefined;
		const result = await withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffEmergencyAntishock(tx, {
			organizationId: org,
			userId: uid,
			visitId: req.body?.visitId,
			patientName: req.body?.patientName,
			doctorName: req.body?.doctorName,
			notes: req.body?.notes,
			idempotencyKey,
		}));
		if (idempotencyKey) { rep.header("X-Idempotency-Key", idempotencyKey); }
		return result;
	};
	server.post("/:organizationId/quick-writeoff-emergency-antishock", handleAntishock);
	server.post("/quick-writeoff-emergency-antishock", handleAntishock);
}
