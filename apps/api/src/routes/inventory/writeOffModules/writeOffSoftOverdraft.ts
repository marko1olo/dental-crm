/**
 * writeOffSoftOverdraft.ts — Маршруты мягкого овердрафта (Soft Negative Stock, Мандат 8n, <= 110L).
 * Задержка оприходования накладной не блокирует работу врача у кресла (Мандат 8e).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import {
	executeQuickCarpuleDisposal,
	executeSoftOverdraftDeduct,
	quickCarpuleDisposalSchema,
	softOverdraftDeductSchema,
} from "../../../services/warehouse/warehouseOperations.js";

async function resolveOrg(req: FastifyRequest, rep: FastifyReply, tag: string): Promise<string | null> {
	const resolved = await requireResolvedStaffOrAdminOrganizationId(req, rep, tag);
	if (!resolved) return null;
	const target = (req.params as any)?.organizationId || (req.body as any)?.organizationId || resolved;
	if (target !== resolved) {
		rep.code(403).send({ error: "Forbidden" });
		return null;
	}
	return target;
}

export async function registerSoftOverdraftRoutes(server: FastifyInstance): Promise<void> {
	const handleSoftOverdraft = async (request: FastifyRequest, reply: FastifyReply) => {
		const targetOrgId = await resolveOrg(request, reply, "inventory soft overdraft deduct");
		if (!targetOrgId) return;

		const parsed = softOverdraftDeductSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const userId = (request.user as { id?: string } | undefined)?.id ?? null;
		const result = await executeSoftOverdraftDeduct(targetOrgId, parsed.data, userId);
		return reply.status(200).send({
			success: true,
			itemId: result.item.id,
			itemName: result.item.name,
			quantityDeducted: parsed.data.quantity,
			newStock: result.newStock,
			isOverdraft: result.isOverdraft,
			deficit: result.deficit,
			warning: result.isOverdraft ? "soft_overdraft" : undefined,
			warningMessage: result.isOverdraft
				? `Остаток 0: зафиксирован мягкий овердрафт (дефицит: ${result.deficit} ${result.item.unit ?? "ед."}). Задержка оприходования накладной не блокирует проведение приема!`
				: undefined,
		});
	};

	server.post<{ Params?: { organizationId?: string } }>("/:organizationId/soft-overdraft-deduct", handleSoftOverdraft);
	server.post("/soft-overdraft-deduct", handleSoftOverdraft);

	const handleCarpuleDisposal = async (request: FastifyRequest, reply: FastifyReply) => {
		const targetOrgId = await resolveOrg(request, reply, "inventory quick carpule disposal");
		if (!targetOrgId) return;

		const parsed = quickCarpuleDisposalSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const userId = (request.user as { id?: string } | undefined)?.id ?? null;
		const response = await executeQuickCarpuleDisposal(targetOrgId, parsed.data, userId);
		return reply.status(200).send(response);
	};

	server.post<{ Params?: { organizationId?: string } }>("/:organizationId/quick-carpule-disposal", handleCarpuleDisposal);
	server.post("/quick-carpule-disposal", handleCarpuleDisposal);
}
