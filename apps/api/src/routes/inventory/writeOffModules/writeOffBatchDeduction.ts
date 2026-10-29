/**
 * writeOffBatchDeduction.ts — Пакетное списание ТМЦ за смену и протоколы приёма (Мандат 8b, <= 110L).
 * Реализует Mandate 8e, 8n (1 клик на батч -> списание без блокирования врача).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { TreatmentConsumablesService } from "../../../services/treatmentConsumablesService.js";
import { executeQuickPackageWriteOff } from "./writeOffVisitBundleExecution.js";

async function checkOrg(req: FastifyRequest, rep: FastifyReply, tag: string): Promise<string | null> {
	const resolved = await requireResolvedStaffOrAdminOrganizationId(req, rep, tag);
	if (!resolved) return null;
	const org = (req.params as any)?.organizationId;
	const target = org === "current" || !org ? resolved : org;
	if (resolved !== target) { rep.code(403).send({ error: "Forbidden" }); return null; }
	return target;
}

export async function registerBatchDeductionRoutes(server: FastifyInstance): Promise<void> {
	// Списание расходников за смену
	const handleShiftDeduct = async (request: FastifyRequest<{ Params?: { organizationId?: string }; Body?: Record<string, any> }>, reply: FastifyReply) => {
		const targetOrgId = await checkOrg(request, reply, "inventory shift batch deduct");
		if (!targetOrgId) return;
		const body = (request.body as any) ?? {};
		return withTenantCtx(targetOrgId, async (tx) =>
			TreatmentConsumablesService.executeShiftBatchDeduction(tx, {
				organizationId: targetOrgId, date: body.date, userId: request.user?.id ?? null, items: body.items, notes: body.notes,
			})
		);
	};
	[
		"/:organizationId/shift-batch-deduct",
		"/shift-batch-deduct",
		"/:organizationId/shift-deduct",
		"/shift-deduct",
		"/:organizationId/batch-shift-writeoff",
		"/batch-shift-writeoff",
		"/:organizationId/shift-deduction",
		"/shift-deduction",
	].forEach((p) => server.post(p, handleShiftDeduct));

	// 1-клик протоколы процедур
	server.post<{ Params?: { organizationId?: string }; Body?: Record<string, any> }>("/:organizationId/quick-writeoff-standard-kit", async (req, rep) => {
		const org = await checkOrg(req, rep, "standard kit"); if (!org) return;
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffStandardKit(tx, { organizationId: org, userId: req.user?.id ?? null, ...(req.body as any) }));
	});

	const handleSteril = async (req: any, rep: any) => {
		const org = await checkOrg(req, rep, "steril kit"); if (!org) return;
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffSterilizationKit(tx, { organizationId: org, count: req.body?.count ?? 1, userId: req.user?.id ?? null, ...(req.body as any) }));
	};
	server.post("/:organizationId/quick-writeoff-sterilization-kit", handleSteril);
	server.post("/quick-writeoff-sterilization-kit", handleSteril);

	const handleCarp = async (req: any, rep: any) => {
		const org = await checkOrg(req, rep, "carpules"); if (!org) return;
		const b = (req.body as any) ?? {};
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffCarpules(tx, { organizationId: org, carpulesCount: b.carpulesCount ?? b.count ?? 1, drugName: b.drugName ?? b.drugId, userId: req.user?.id ?? null, ...b }));
	};
	server.post("/:organizationId/quick-writeoff-carpules", handleCarp);
	server.post("/quick-writeoff-carpules", handleCarp);

	server.post<{ Params?: { organizationId?: string }; Body?: Record<string, any> }>("/:organizationId/quick-writeoff-shift-bundle", async (req, rep) => {
		const org = await checkOrg(req, rep, "shift bundle"); if (!org) return;
		const b = (req.body as any) ?? {};
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffShiftBundle(tx, { organizationId: org, bundleType: b.bundleType || "therapy", userId: req.user?.id ?? null, ...b }));
	});

	server.post<{ Params?: { organizationId?: string }; Body?: Record<string, any> }>("/:organizationId/quick-writeoff-visit-bundle", async (req, rep) => {
		const org = await checkOrg(req, rep, "visit bundle"); if (!org) return;
		const b = (req.body as any) ?? {};
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffVisitBundle(tx, { organizationId: org, visitType: b.visitType || "therapy", userId: req.user?.id ?? null, ...b }));
	});

	server.post<{ Params?: { organizationId?: string }; Body?: Record<string, any> }>("/:organizationId/quick-writeoff-orthopedic", async (req, rep) => {
		const org = await checkOrg(req, rep, "orthopedic"); if (!org) return;
		const b = (req.body as any) ?? {};
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffOrthopedicProtocol(tx, { organizationId: org, protocolId: b.protocolId || "ortho_prep_zirconia_emax", userId: req.user?.id ?? null, ...b }));
	});

	const handleSurg = async (req: any, rep: any) => {
		const org = await checkOrg(req, rep, "surgery"); if (!org) return;
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffSurgery(tx, { organizationId: org, userId: req.user?.id ?? null, ...(req.body as any) }));
	};
	server.post("/:organizationId/quick-writeoff-surgery", handleSurg);
	server.post("/quick-writeoff-surgery", handleSurg);

	server.post<{ Params?: { organizationId?: string }; Body?: Record<string, any> }>("/:organizationId/quick-writeoff-package", async (req, rep) => {
		const org = await checkOrg(req, rep, "package"); if (!org) return;
		const uid = getRequestIdentity(req).userId ?? req.user?.id ?? null;
		return withTenantCtx(org, (tx) => executeQuickPackageWriteOff(tx, { organizationId: org, effectiveUserId: uid, ...(req.body as any) }));
	});

	const handleAntishock = async (req: any, rep: any) => {
		const org = await checkOrg(req, rep, "antishock"); if (!org) return;
		return withTenantCtx(org, (tx) => TreatmentConsumablesService.quickWriteoffEmergencyAntishock(tx, { organizationId: org, userId: req.user?.id ?? null, ...req.body }));
	};
	server.post("/:organizationId/quick-writeoff-emergency-antishock", handleAntishock);
	server.post("/quick-writeoff-emergency-antishock", handleAntishock);
}
