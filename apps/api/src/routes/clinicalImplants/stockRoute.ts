import { and, eq, ilike, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { serializeInventoryItem } from "../../db/inventoryQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { inventoryItems } from "../../db/schema.js";

export function registerStockRoute(app: FastifyInstance) {
	app.get("/api/clinical/implants/stock", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const items = await withTenantCtx(orgId, async (tx) =>
			tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, orgId),
						or(
							eq(inventoryItems.category, "Имплантология"),
							eq(inventoryItems.category, "Хирургия"),
							ilike(inventoryItems.name, "%имплант%"),
							ilike(inventoryItems.name, "%графт%"),
							ilike(inventoryItems.name, "%костн%"),
							ilike(inventoryItems.name, "%мембран%"),
							ilike(inventoryItems.name, "%шовн%"),
							ilike(inventoryItems.name, "%полиглактин%"),
							ilike(inventoryItems.name, "%монофиламент%"),
						),
					),
				),
		);

		const serializedItems = items.map(serializeInventoryItem);

		const implants = serializedItems.filter(
			(i) =>
				i.category === "Имплантология" ||
				i.name.toLowerCase().includes("имплант"),
		);

		const grafts = serializedItems.filter(
			(i) =>
				i.name.toLowerCase().includes("графт") ||
				i.name.toLowerCase().includes("костн") ||
				i.name.toLowerCase().includes("ксенографт"),
		);

		const membranes = serializedItems.filter(
			(i) =>
				i.name.toLowerCase().includes("мембран") ||
				i.name.toLowerCase().includes("коллаген"),
		);

		const sutures = serializedItems.filter(
			(i) =>
				i.name.toLowerCase().includes("шовн") ||
				i.name.toLowerCase().includes("полиглактин") ||
				i.name.toLowerCase().includes("монофиламент") ||
				i.name.toLowerCase().includes("полипропилен") ||
				i.name.toLowerCase().includes("пга"),
		);

		return reply.send({
			success: true,
			implants,
			consumables: { grafts, membranes, sutures },
		});
	});
}
