import { and, eq, ilike, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { inventoryItems } from "../../db/schema.js";

export function registerStockRoute(app: FastifyInstance) {
	app.get("/api/clinical/implants/stock", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const items = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.organizationId, orgId),
					or(
						eq(inventoryItems.category, "Имплантология"),
						eq(inventoryItems.category, "Хирургия"),
						ilike(inventoryItems.name, "%имплант%"),
						ilike(inventoryItems.name, "%bio-oss%"),
						ilike(inventoryItems.name, "%bio-gide%"),
						ilike(inventoryItems.name, "%викрил%"),
						ilike(inventoryItems.name, "%vicryl%"),
					),
				),
			);

		const implants = items.filter(
			(i) =>
				i.category === "Имплантология" ||
				i.name.toLowerCase().includes("имплант"),
		);

		const grafts = items.filter(
			(i) =>
				i.name.toLowerCase().includes("графт") ||
				i.name.toLowerCase().includes("bio-oss") ||
				i.name.toLowerCase().includes("костн"),
		);

		const membranes = items.filter(
			(i) =>
				i.name.toLowerCase().includes("мембран") ||
				i.name.toLowerCase().includes("bio-gide"),
		);

		const sutures = items.filter(
			(i) =>
				i.name.toLowerCase().includes("шовн") ||
				i.name.toLowerCase().includes("викрил") ||
				i.name.toLowerCase().includes("vicryl") ||
				i.name.toLowerCase().includes("пролен") ||
				i.name.toLowerCase().includes("пга"),
		);

		return reply.send({
			success: true,
			implants,
			consumables: { grafts, membranes, sutures },
		});
	});
}
