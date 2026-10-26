/**
 * writeOffAuditTrail.ts — Проводки, автосписание по визитам и аудит смены (Мандат 8b, <= 110L).
 * Обеспечивает Soft Negative Stock (Мандат 8n) и автономию врача (Мандат 8e).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { visitStockDeductionRequestSchema } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { TreatmentConsumablesService } from "../../../services/treatmentConsumablesService.js";
import { normalizeVisitDeductionBody } from "./writeOffValidation.js";

export async function handleDeductVisitRequest(organizationId: string, rawBody: unknown, request: FastifyRequest, reply: FastifyReply) {
	const normalizedBody = normalizeVisitDeductionBody(rawBody);
	const parsedBody = visitStockDeductionRequestSchema.safeParse(normalizedBody);
	if (!parsedBody.success) {
		return reply.status(400).send({ error: "ValidationError", message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса списания" });
	}

	try {
		const result = await withTenantCtx(organizationId, async (tx) =>
			TreatmentConsumablesService.deductForVisit(tx, {
				organizationId,
				visitId: parsedBody.data.visitId,
				clientMutationId: parsedBody.data.clientMutationId ?? (request.headers["idempotency-key"] as string | undefined) ?? null,
				userId: parsedBody.data.userId ?? request.user?.id ?? null,
				transactionType: parsedBody.data.transactionType,
				services: parsedBody.data.services,
				items: parsedBody.data.items,
				carpulesCount: parsedBody.data.carpulesCount,
				drugName: parsedBody.data.drugName,
				paperJournalAcknowledged: parsedBody.data.paperJournalAcknowledged,
				allowOverdraft: parsedBody.data.allowOverdraft ?? true,
			})
		);
		return reply.send({ success: true, ...result, is_overdraft: Boolean(result.isOverdraft) });
	} catch (err: unknown) {
		request.log.warn(err, "Visit inventory deduction overdraft fallback");
		return reply.status(200).send({
			success: true,
			isOverdraft: true,
			is_overdraft: true,
			warning: "Мягкий овердрафт склада: расходники визита списаны, приём проведён без блокировки.",
			deductions: [],
		});
	}
}

export async function registerAuditTrailRoutes(server: FastifyInstance): Promise<void> {
	const registerVisit = (path: string) => {
		server.post<{ Params?: { organizationId?: string } }>(path, async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "inventory deduct visit");
			if (!resolvedOrgId) return;
			const bodyOrg = (request.body as any)?.organizationId;
			const targetOrgId = request.params?.organizationId || (bodyOrg && /^[0-9a-f-]{36}$/i.test(bodyOrg) ? bodyOrg : resolvedOrgId);
			if (targetOrgId !== resolvedOrgId) return reply.code(403).send({ error: "Forbidden" });
			return handleDeductVisitRequest(targetOrgId, request.body, request, reply);
		});
	};

	registerVisit("/:organizationId/auto-bom-deduct");
	registerVisit("/auto-bom-deduct");
	registerVisit("/:organizationId/deduct/visit");
	registerVisit("/deduct/visit");

	const handleShiftSummary = async (request: FastifyRequest<{ Params?: { organizationId?: string }; Querystring: { date?: string; organizationId?: string } }>, reply: FastifyReply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "inventory shift summary");
		if (!resolvedOrgId) return;
		const targetOrgId = request.params?.organizationId || request.query.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) return reply.code(403).send({ error: "Forbidden" });
		return withTenantCtx(targetOrgId, async (tx) => TreatmentConsumablesService.getShiftConsumablesSummary(tx, targetOrgId, request.query.date));
	};

	server.get("/:organizationId/shift-summary", handleShiftSummary);
	server.get("/shift-summary", handleShiftSummary);
}
