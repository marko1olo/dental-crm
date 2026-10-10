/**
 * techCardNormHandlers.ts — Layer 2: Fastify route handlers for reading and configuring
 * Technological Cards (BOM recipes) and material consumption norms per service/procedure.
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { inventoryItems, treatmentConsumables } from "../../db/schema.js";
import { ReorderSuggestionService } from "../../services/reorderSuggestionService.js";
import {
	TreatmentConsumablesService,
	TreatmentConsumablesServiceError,
} from "../../services/treatmentConsumablesService.js";
import {
	consumableLinkCreateSchema,
	consumableLinkUpdateSchema,
	linkOptionsQuerySchema,
	listLinksQuerySchema,
	treatmentConsumableLinkCreateSchema,
} from "./types.js";

/**
 * Registers technological card and material consumption norm endpoints on the Fastify instance.
 */
export async function registerTechCardNormHandlers(
	server: FastifyInstance,
): Promise<void> {
	// GET / — List consumable links for current organization (CRUD)
	server.get("/", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables list",
		);
		if (!orgId) return;

		const mappings = await db
			.select({
				id: treatmentConsumables.id,
				organizationId: treatmentConsumables.organizationId,
				catalogItemCode: treatmentConsumables.catalogItemCode,
				inventoryItemId: treatmentConsumables.inventoryItemId,
				quantity: treatmentConsumables.quantity,
				note: treatmentConsumables.note,
				createdAt: treatmentConsumables.createdAt,
				updatedAt: treatmentConsumables.updatedAt,
				itemName: inventoryItems.name,
				itemCategory: inventoryItems.category,
				unit: inventoryItems.unit,
				currentStock: inventoryItems.currentQty,
				unitCostRub: inventoryItems.unitCostRub,
			})
			.from(treatmentConsumables)
			.leftJoin(
				inventoryItems,
				eq(treatmentConsumables.inventoryItemId, inventoryItems.id),
			)
			.where(eq(treatmentConsumables.organizationId, orgId));

		return mappings;
	});

	// POST / — Create or update consumable link for procedure (CRUD)
	server.post("/", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables create",
		);
		if (!orgId) return;

		const parsed = treatmentConsumableLinkCreateSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		const body = parsed.data;
		const [link] = await db
			.insert(treatmentConsumables)
			.values({
				organizationId: orgId,
				catalogItemCode: body.catalogItemCode,
				inventoryItemId: body.inventoryItemId,
				quantity: body.quantity.toFixed(4),
				note: body.note ?? null,
			})
			.onConflictDoUpdate({
				target: [
					treatmentConsumables.organizationId,
					treatmentConsumables.catalogItemCode,
					treatmentConsumables.inventoryItemId,
				],
				set: {
					quantity: body.quantity.toFixed(4),
					note: body.note ?? null,
					updatedAt: new Date(),
				},
			})
			.returning();

		return reply.status(201).send(link);
	});

	// DELETE /:id — Delete consumable link
	server.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables delete",
		);
		if (!orgId) return;

		const { id } = request.params;
		const deleted = await db
			.delete(treatmentConsumables)
			.where(
				and(
					eq(treatmentConsumables.organizationId, orgId),
					eq(treatmentConsumables.id, id),
				),
			)
			.returning();

		if (deleted.length === 0) {
			return reply.status(404).send({ error: "NotFound", message: "Связь не найдена" });
		}
		return { success: true, deletedId: id };
	});

	// =========================================================================
	// MANDATE 8s (CANONICAL AUTHORITY & ANTI-BLOAT LAW):
	// Canonical master route: `apps/api/src/routes/inventory.ts` (GET /api/inventory/reorder-suggestions).
	// This endpoint is maintained as a transparent alias under /api/treatment-consumables
	// for backward compatibility without logic desynchronization.
	// Both routes delegate execution to ReorderSuggestionService.getSuggestions.
	// =========================================================================
	// GET /reorder-suggestions — Predictive reorder point calculation
	server.get<{ Querystring: { onlyNeedingReorder?: string | boolean } }>(
		"/reorder-suggestions",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory reorder suggestions",
			);
			if (!orgId) return;

			const onlyNeedingReorder =
				request.query.onlyNeedingReorder === "true" ||
				request.query.onlyNeedingReorder === true;

			const suggestions = await ReorderSuggestionService.getSuggestions(orgId, {
				onlyNeedingReorder,
			});
			return reply.status(200).send(suggestions);
		},
	);

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
}
