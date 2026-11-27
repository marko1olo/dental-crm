/**
 * writeOffAuditTrail.ts — Проводки, автосписание по визитам и аудит смены (Мандат 8b, <= 110L).
 * Обеспечивает Soft Negative Stock (Мандат 8n) и автономию врача (Мандат 8e).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { visitStockDeductionRequestSchema } from "@dental/shared";
import { defineTenantMutation } from "../../../core/routeFactories.js";
import { withTenantWriteCtx, type TenantDb } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { TreatmentConsumablesService } from "../../../services/treatmentConsumablesService.js";
import { normalizeVisitDeductionBody } from "./writeOffValidation.js";

const INVENTORY_WRITE_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

export async function handleDeductVisitRequest(
	organizationId: string,
	rawBody: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
	executor?: TenantDb,
) {
	const normalizedBody = normalizeVisitDeductionBody(rawBody);
	const parsedBody = visitStockDeductionRequestSchema.safeParse(normalizedBody);
	if (!parsedBody.success) {
		return reply.status(400).send({ error: "ValidationError", message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса списания" });
	}

	const identity = getRequestIdentity(request);
	const effectiveUserId = parsedBody.data.userId ?? identity.userId ?? request.user?.id ?? null;

	try {
		const runDeduct = async (tx: TenantDb) =>
			TreatmentConsumablesService.deductForVisit(tx, {
				organizationId,
				visitId: parsedBody.data.visitId,
				clientMutationId: parsedBody.data.clientMutationId ?? (request.headers["idempotency-key"] as string | undefined) ?? null,
				userId: effectiveUserId,
				transactionType: parsedBody.data.transactionType,
				services: parsedBody.data.services,
				items: parsedBody.data.items,
				carpulesCount: parsedBody.data.carpulesCount,
				drugName: parsedBody.data.drugName,
				paperJournalAcknowledged: parsedBody.data.paperJournalAcknowledged,
				allowOverdraft: parsedBody.data.allowOverdraft ?? true,
			});
		const result = executor ? await runDeduct(executor) : await withTenantWriteCtx(organizationId, runDeduct);
		return reply.send({ success: true, ...result, is_overdraft: Boolean(result.isOverdraft) });
	} catch (err: unknown) {
		request.log.error(
			{ err, organizationId, visitId: parsedBody.data.visitId },
			"Failed to execute visit inventory deduction",
		);
		return reply.status(500).send({
			error: "InventoryDeductionFailed",
			message:
				err instanceof Error
					? err.message
					: "Не удалось выполнить списание материалов по визиту",
		});
	}
}

export async function registerAuditTrailRoutes(server: FastifyInstance): Promise<void> {
	const registerVisit = (path: string) => {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: "inventory.write",
			authOptions: INVENTORY_WRITE_AUTH,
			idempotency: "optional_header",
			handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
				const params = request.params as { organizationId?: string } | undefined;
				const body = request.body && typeof request.body === "object" ? (request.body as { organizationId?: unknown }) : undefined;
				const bodyOrg = typeof body?.organizationId === "string" ? body.organizationId : undefined;
				const targetOrgId = params?.organizationId || (bodyOrg && /^[0-9a-f-]{36}$/i.test(bodyOrg) ? bodyOrg : resolvedOrgId);
				if (targetOrgId !== resolvedOrgId) return reply.code(403).send({ error: "Forbidden" });
				return handleDeductVisitRequest(targetOrgId, request.body, request, reply, tx);
			},
		});
	};

	registerVisit("/:organizationId/auto-bom-deduct");
	registerVisit("/auto-bom-deduct");
	registerVisit("/:organizationId/deduct/visit");
	registerVisit("/deduct/visit");
}
