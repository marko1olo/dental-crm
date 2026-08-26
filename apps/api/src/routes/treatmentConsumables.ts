/**
 * treatmentConsumables.ts — Fastify API routes for Treatment Consumables & Stock Auto-Deductions.
 */

import {
	consumableLinkCreateSchema,
	consumableLinkUpdateSchema,
	stockAvailabilityCheckRequestSchema,
	toothTreatmentStockDeductionRequestSchema,
	visitStockDeductionRequestSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	InsufficientStockError,
	TreatmentConsumablesService,
	TreatmentConsumablesServiceError,
} from "../services/treatmentConsumablesService.js";

const listLinksQuerySchema = z.object({
	serviceId: z.string().optional(),
	inventoryItemId: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
	pageSize: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

const linkOptionsQuerySchema = z.object({
	q: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(30).optional(),
});

const alertsQuerySchema = z.object({
	expiringWithinDays: z.coerce.number().int().min(1).max(365).default(30).optional(),
});

export const treatmentConsumablesRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// GET /:organizationId/links — List all consumable links
	server.get<{
		Params: { organizationId: string };
		Querystring: {
			serviceId?: string;
			inventoryItemId?: string;
			page?: number;
			pageSize?: number;
		};
	}>("/:organizationId/links", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read links",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedQuery = listLinksQuerySchema.safeParse(request.query ?? {});
		const query = parsedQuery.success ? parsedQuery.data : {};

		const result = await TreatmentConsumablesService.listLinks(
			db,
			organizationId,
			query,
		);
		return result;
	});

	// GET /:organizationId/links/:linkId — Get a single consumable link
	server.get<{
		Params: { organizationId: string; linkId: string };
	}>("/:organizationId/links/:linkId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read single link",
		);
		if (!resolvedOrgId) return;

		const { organizationId, linkId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const link = await TreatmentConsumablesService.getLink(
			db,
			organizationId,
			linkId,
		);
		if (!link) {
			return reply.status(404).send({
				error: "LinkNotFound",
				message: "Связь расходного материала не найдена",
			});
		}
		return link;
	});

	// POST /:organizationId/links — Create a new consumable link
	server.post<{
		Params: { organizationId: string };
		Body: {
			serviceId: string;
			inventoryItemId: string;
			quantity: number;
			note?: string | null;
		};
	}>("/:organizationId/links", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables create link",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = consumableLinkCreateSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		try {
			const link = await TreatmentConsumablesService.createLink(
				db,
				organizationId,
				parsedBody.data,
			);
			return reply.status(201).send(link);
		} catch (err) {
			if (err instanceof TreatmentConsumablesServiceError) {
				return reply.status(err.statusCode).send({
					error: err.code,
					message: err.message,
				});
			}
			throw err;
		}
	});

	// PUT /:organizationId/links/:linkId — Update a consumable link
	server.put<{
		Params: { organizationId: string; linkId: string };
		Body: {
			quantity?: number;
			note?: string | null;
		};
	}>("/:organizationId/links/:linkId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables update link",
		);
		if (!resolvedOrgId) return;

		const { organizationId, linkId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = consumableLinkUpdateSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		try {
			const link = await TreatmentConsumablesService.updateLink(
				db,
				organizationId,
				linkId,
				parsedBody.data,
			);
			return link;
		} catch (err) {
			if (err instanceof TreatmentConsumablesServiceError) {
				return reply.status(err.statusCode).send({
					error: err.code,
					message: err.message,
				});
			}
			throw err;
		}
	});

	// DELETE /:organizationId/links/:linkId — Delete a consumable link
	server.delete<{
		Params: { organizationId: string; linkId: string };
	}>("/:organizationId/links/:linkId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables delete link",
		);
		if (!resolvedOrgId) return;

		const { organizationId, linkId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		try {
			const result = await TreatmentConsumablesService.deleteLink(
				db,
				organizationId,
				linkId,
			);
			return result;
		} catch (err) {
			if (err instanceof TreatmentConsumablesServiceError) {
				return reply.status(err.statusCode).send({
					error: err.code,
					message: err.message,
				});
			}
			throw err;
		}
	});

	// GET /:organizationId/service/:serviceId — Get full BOM recipe for service
	server.get<{
		Params: { organizationId: string; serviceId: string };
	}>("/:organizationId/service/:serviceId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read service recipe",
		);
		if (!resolvedOrgId) return;

		const { organizationId, serviceId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		try {
			const recipe = await TreatmentConsumablesService.getRecipeForService(
				db,
				organizationId,
				serviceId,
			);
			return recipe;
		} catch (err) {
			if (err instanceof TreatmentConsumablesServiceError) {
				return reply.status(err.statusCode).send({
					error: err.code,
					message: err.message,
				});
			}
			throw err;
		}
	});

	// GET /:organizationId/options — Get picker options for linking
	server.get<{
		Params: { organizationId: string };
		Querystring: { q?: string; limit?: number };
	}>("/:organizationId/options", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read options",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedQuery = linkOptionsQuerySchema.safeParse(request.query ?? {});
		const q = parsedQuery.success ? parsedQuery.data.q : undefined;
		const limit = parsedQuery.success ? parsedQuery.data.limit : 30;

		const options = await TreatmentConsumablesService.getLinkOptions(
			db,
			organizationId,
			q,
			limit,
		);
		return options;
	});

	// POST /:organizationId/deduct/visit — Auto-deduct consumables for visit
	server.post<{
		Params: { organizationId: string };
		Body: {
			visitId: string;
			userId?: string | null;
			transactionType?: "auto_deduct" | "manual_writeoff";
		};
	}>("/:organizationId/deduct/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables deduct visit",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = visitStockDeductionRequestSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		try {
			const result = await db.transaction(async (tx) => {
				return TreatmentConsumablesService.deductForVisit(tx, {
					organizationId,
					visitId: parsedBody.data.visitId,
					...(parsedBody.data.userId !== undefined ? { userId: parsedBody.data.userId } : { userId: (request.user as any)?.id ?? null }),
					...(parsedBody.data.transactionType !== undefined ? { transactionType: parsedBody.data.transactionType } : {}),
				});
			});
			return result;
		} catch (err) {
			if (err instanceof InsufficientStockError) {
				return reply.status(409).send({
					error: err.error,
					message: err.message,
					inventoryItemId: err.inventoryItemId,
					inventoryItemName: err.inventoryItemName,
					availableStock: err.availableStock,
					requiredStock: err.requiredStock,
				});
			}
			throw err;
		}
	});

	// POST /:organizationId/deduct/tooth-treatment — Deduct consumables for tooth procedure
	server.post<{
		Params: { organizationId: string };
		Body: {
			treatmentItemId: string;
			serviceId: string;
			toothNumber?: number | null;
			quantity?: number;
			visitId?: string | null;
			userId?: string | null;
			transactionType?: "auto_deduct" | "manual_writeoff";
		};
	}>("/:organizationId/deduct/tooth-treatment", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables deduct tooth treatment",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = toothTreatmentStockDeductionRequestSchema.safeParse(
			request.body,
		);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		try {
			const result = await db.transaction(async (tx) => {
				return TreatmentConsumablesService.deductForToothTreatment(tx, {
					organizationId,
					treatmentItemId: parsedBody.data.treatmentItemId,
					serviceId: parsedBody.data.serviceId,
					...(parsedBody.data.toothNumber !== undefined ? { toothNumber: parsedBody.data.toothNumber } : {}),
					...(parsedBody.data.quantity !== undefined ? { quantity: parsedBody.data.quantity } : {}),
					...(parsedBody.data.visitId !== undefined ? { visitId: parsedBody.data.visitId } : {}),
					...(parsedBody.data.userId !== undefined ? { userId: parsedBody.data.userId } : { userId: (request.user as any)?.id ?? null }),
					...(parsedBody.data.transactionType !== undefined ? { transactionType: parsedBody.data.transactionType } : {}),
				});
			});
			return result;
		} catch (err) {
			if (err instanceof InsufficientStockError) {
				return reply.status(409).send({
					error: err.error,
					message: err.message,
					inventoryItemId: err.inventoryItemId,
					inventoryItemName: err.inventoryItemName,
					availableStock: err.availableStock,
					requiredStock: err.requiredStock,
				});
			}
			throw err;
		}
	});

	// POST /:organizationId/check-availability — Pre-flight check stock sufficiency
	server.post<{
		Params: { organizationId: string };
		Body: {
			items: Array<{ serviceId: string; quantity: number }>;
		};
	}>("/:organizationId/check-availability", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables check availability",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = stockAvailabilityCheckRequestSchema.safeParse(
			request.body,
		);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		const result = await TreatmentConsumablesService.checkStockSufficiency(
			db,
			organizationId,
			parsedBody.data.items,
		);
		return result;
	});

	// GET /:organizationId/alerts — Low stock & batch expiration alerts
	server.get<{
		Params: { organizationId: string };
		Querystring: { expiringWithinDays?: number };
	}>("/:organizationId/alerts", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read alerts",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedQuery = alertsQuerySchema.safeParse(request.query ?? {});
		const expiringWithinDays = parsedQuery.success
			? parsedQuery.data.expiringWithinDays
			: 30;

		const alerts = await TreatmentConsumablesService.getInventoryAlerts(
			db,
			organizationId,
			...(expiringWithinDays !== undefined ? [{ expiringWithinDays }] : []),
		);
		return alerts;
	});
};
