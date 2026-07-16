import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { inventoryItems } from "../db/schema.js";

export const inventoryRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// GET all inventory items for an organization (authenticated)
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			// Security: ensure the resolved org matches the requested one
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await db
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.organizationId, organizationId))
				.orderBy(inventoryItems.name);
			return items;
		},
	);

	// POST new inventory item (staff/admin only)
	server.post<{
		Params: { organizationId: string };
		Body: {
			name: string;
			criticalThreshold?: number;
			unitCostRub?: number;
			stockQuantity?: number;
		};
	}>("/:organizationId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory create",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const {
			name,
			criticalThreshold = 5,
			unitCostRub = 0,
			stockQuantity = 0,
		} = request.body;
		if (!name?.trim()) {
			return reply.status(400).send({ error: "Name is required" });
		}

		const newItem = await db
			.insert(inventoryItems)
			.values({
				organizationId,
				name: name.trim(),
				criticalThreshold: Math.max(0, criticalThreshold),
				unitCostRub: Math.max(0, unitCostRub).toString(),
				stockQuantity: Math.max(0, stockQuantity),
			})
			.returning();

		const created = newItem[0];
		if (!created) return reply.status(500).send({ error: "Failed to create item" });
		return created;
	});

	// PATCH adjust stock quantity (staff/admin only, never below 0)
	server.patch<{
		Params: { organizationId: string; itemId: string };
		Body: { adjustment: number };
	}>("/:organizationId/:itemId/stock", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory adjust stock",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const { adjustment } = request.body;
		if (typeof adjustment !== "number" || !Number.isFinite(adjustment)) {
			return reply.status(400).send({ error: "Invalid adjustment value" });
		}

		const [item] = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!item) return reply.status(404).send({ error: "Item not found" });

		// Clamp to 0: cannot have negative stock
		const newStock = Math.max(0, item.stockQuantity + adjustment);

		const [updated] = await db
			.update(inventoryItems)
			.set({ stockQuantity: newStock, updatedAt: new Date() })
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.returning();

		if (!updated) return reply.status(500).send({ error: "Failed to update item" });
		return updated;
	});

	// PUT update inventory item properties (staff/admin only)
	server.put<{
		Params: { organizationId: string; itemId: string };
		Body: { name: string; criticalThreshold?: number; unitCostRub?: number };
	}>("/:organizationId/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory update",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const { name, criticalThreshold = 5, unitCostRub = 0 } = request.body;
		if (!name?.trim()) {
			return reply.status(400).send({ error: "Name is required" });
		}

		const [existing] = await db
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existing) return reply.status(404).send({ error: "Item not found" });

		const [updated] = await db
			.update(inventoryItems)
			.set({
				name: name.trim(),
				criticalThreshold: Math.max(0, criticalThreshold),
				unitCostRub: Math.max(0, unitCostRub).toString(),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.returning();

		if (!updated) return reply.status(500).send({ error: "Failed to update item" });
		return updated;
	});

	// DELETE inventory item (admin only)
	server.delete<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory delete",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const [existing] = await db
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existing) return reply.status(404).send({ error: "Item not found" });

		await db.delete(inventoryItems).where(eq(inventoryItems.id, itemId));
		return { success: true };
	});
};
