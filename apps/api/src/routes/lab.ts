import type { FastifyInstance } from "fastify";
import { getLabOrderByToken, updateLabOrderStatus } from "../db/labQuery.js";
import { wsBroker } from "../services/websocketBroker.js";

export async function registerLabRoutes(app: FastifyInstance) {
  // Публичный роут для зуботехника (по secure_token)
  app.get("/api/portal/lab-order/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    if (!token) return reply.code(400).send({ error: "TokenRequired" });

    try {
      const order = await getLabOrderByToken(token);
      if (!order) return reply.code(404).send({ error: "OrderNotFound" });

      // Возвращаем данные для портала, маскируя полную информацию пациента, 
      // но оставляя нужные технику параметры.
      return {
        id: order.id,
        patientFullName: order.patientFullName,
        toothFdi: order.toothFdi,
        material: order.material,
        colorVita: order.colorVita,
        status: order.status,
        clinicalNotes: order.clinicalNotes,
        attachedImageUrl: order.attachedImageUrl,
        createdAt: order.createdAt
      };
    } catch (e) {
      console.error("[LabPortal] GET error:", e);
      return reply.code(500).send({ error: "DatabaseError" });
    }
  });

  // Публичный POST для смены статуса
  app.post("/api/portal/lab-order/:token/status", async (request, reply) => {
    const { token } = request.params as { token: string };
    const { status } = request.body as { status: string };

    if (!token || !status) return reply.code(400).send({ error: "InvalidRequest" });

    try {
      const order = await getLabOrderByToken(token);
      if (!order) return reply.code(404).send({ error: "OrderNotFound" });

      const updated = await updateLabOrderStatus(token, status);
      if (updated) {
        // Уведомляем клиентов в клинике через WebSocket
        wsBroker.broadcast({
          type: "LAB_ORDER_UPDATED",
          payload: {
            patientId: updated.patientId,
            orderId: updated.id,
            status: updated.status
          }
        });
      }

      return { success: true, status: updated?.status };
    } catch (e) {
      console.error("[LabPortal] POST error:", e);
      return reply.code(500).send({ error: "DatabaseError" });
    }
  });
}
