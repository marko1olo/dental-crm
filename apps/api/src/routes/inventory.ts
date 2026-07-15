import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { db } from "../db/client.js";
import { inventoryItems } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const inventoryRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // GET all inventory items for an organization
  server.get<{ Params: { organizationId: string } }>("/:organizationId", async (request, reply) => {
    const { organizationId } = request.params;
    if (!organizationId) return reply.status(400).send({ error: "Missing organizationId" });

    const items = await db.select().from(inventoryItems).where(eq(inventoryItems.organizationId, organizationId));
    return items;
  });

  // POST new inventory item
  server.post<{
    Params: { organizationId: string };
    Body: { name: string; criticalThreshold?: number; unitCostRub?: number; stockQuantity?: number }
  }>("/:organizationId", async (request, reply) => {
    const { organizationId } = request.params;
    const { name, criticalThreshold = 5, unitCostRub = 0, stockQuantity = 0 } = request.body;

    if (!name) return reply.status(400).send({ error: "Name is required" });

    const newItem = await db.insert(inventoryItems).values({
      organizationId,
      name,
      criticalThreshold,
      unitCostRub: unitCostRub.toString(),
      stockQuantity
    }).returning();

    const created = newItem[0];
    if (!created) return reply.status(500).send({ error: "Failed to create item" });
    return created;
  });

  // PATCH adjust stock quantity
  server.patch<{
    Params: { organizationId: string; itemId: string };
    Body: { adjustment: number }
  }>("/:organizationId/:itemId/stock", async (request, reply) => {
    const { organizationId, itemId } = request.params;
    const { adjustment } = request.body;

    if (typeof adjustment !== "number") return reply.status(400).send({ error: "Invalid adjustment" });

    const currentItem = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId)).limit(1);
    if (!currentItem.length) return reply.status(404).send({ error: "Item not found" });

    const item = currentItem[0];
    if (!item) return reply.status(404).send({ error: "Item not found" });
    const newStock = item.stockQuantity + adjustment;
    
    // Allow negative stock in extreme cases or clamp to 0? Let's just allow it for now
    // or clamp to 0 if needed. For now, let's keep it simple.
    
    const updated = await db.update(inventoryItems)
      .set({ stockQuantity: newStock, updatedAt: new Date() })
      .where(eq(inventoryItems.id, itemId))
      .returning();

    const result = updated[0];
    if (!result) return reply.status(500).send({ error: "Failed to update item" });
    return result;
  });
};
