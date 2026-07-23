import { db } from "../db/client.js";
import { toothStates, treatmentPlans, treatmentPlanItemsNew } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
export async function registerOdontogramRoutes(app) {
    // GET /api/patients/:id/tooth-states
    app.get("/api/patients/:id/tooth-states", async (request, reply) => {
        try {
            const { id: patientId } = request.params;
            const states = await db.select().from(toothStates).where(eq(toothStates.patientId, patientId));
            return reply.send({ success: true, states });
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: "Internal server error" });
        }
    });
    // POST /api/patients/:id/tooth-states
    app.post("/api/patients/:id/tooth-states", async (request, reply) => {
        try {
            const { id: patientId } = request.params;
            const { toothNumber, state } = request.body;
            // Upsert
            const existing = await db.select().from(toothStates)
                .where(and(eq(toothStates.patientId, patientId), eq(toothStates.toothNumber, toothNumber)))
                .limit(1);
            if (existing.length > 0 && existing[0]) {
                await db.update(toothStates)
                    .set({ state, updatedAt: new Date() })
                    .where(eq(toothStates.id, existing[0].id));
            }
            else {
                await db.insert(toothStates).values({
                    patientId,
                    toothNumber,
                    state
                });
            }
            return reply.send({ success: true });
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: "Internal server error" });
        }
    });
    // GET /api/patients/:id/treatment-plans
    app.get("/api/patients/:id/treatment-plans", async (request, reply) => {
        try {
            const { id: patientId } = request.params;
            const plans = await db.select().from(treatmentPlans).where(eq(treatmentPlans.patientId, patientId));
            const planItems = await db.select().from(treatmentPlanItemsNew);
            // Merge items into plans
            const plansWithItems = plans.map(p => ({
                ...p,
                items: planItems.filter(i => i.planId === p.id)
            }));
            return reply.send({ success: true, plans: plansWithItems });
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: "Internal server error" });
        }
    });
    // POST /api/patients/:id/treatment-plans
    app.post("/api/patients/:id/treatment-plans", async (request, reply) => {
        try {
            const { id: patientId } = request.params;
            const { id: planId, name, items } = request.body;
            let finalPlanId = planId;
            if (!planId) {
                const [newPlan] = await db.insert(treatmentPlans).values({
                    patientId,
                    name: name || "Новый план лечения",
                    status: "Draft",
                    totalPrice: "0"
                }).returning({ id: treatmentPlans.id });
                if (newPlan)
                    finalPlanId = newPlan.id;
            }
            else {
                await db.update(treatmentPlans).set({ name, updatedAt: new Date() }).where(eq(treatmentPlans.id, planId));
            }
            // Process items (simple full replace for draft)
            if (items && Array.isArray(items)) {
                await db.delete(treatmentPlanItemsNew).where(eq(treatmentPlanItemsNew.planId, finalPlanId));
                if (items.length > 0) {
                    const insertData = items.map((i) => ({
                        planId: finalPlanId,
                        toothNumber: i.toothNumber,
                        priceId: i.priceId,
                        quantity: i.quantity || 1,
                        price: i.price || "0",
                        discount: i.discount || "0",
                        phase: i.phase || 1
                    }));
                    await db.insert(treatmentPlanItemsNew).values(insertData);
                }
            }
            // Calculate total
            const savedItems = await db.select().from(treatmentPlanItemsNew).where(eq(treatmentPlanItemsNew.planId, finalPlanId));
            const total = savedItems.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity - parseFloat(item.discount)), 0);
            await db.update(treatmentPlans).set({ totalPrice: total.toString() }).where(eq(treatmentPlans.id, finalPlanId));
            return reply.send({ success: true, planId: finalPlanId, total });
        }
        catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: "Internal server error" });
        }
    });
}
