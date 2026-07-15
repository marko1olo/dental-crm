import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { db } from "../db/client.js";
import { patients } from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";
import { ilike } from "drizzle-orm";

export const telephonyRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Webhook для АТС (Mango, Задарма, UIS)
  server.post<{
    Params: { organizationId: string };
    Body: {
      event: "ringing" | "answered" | "ended";
      from: string;
      to: string;
      call_id?: string;
    };
  }>("/:organizationId/webhook", async (request, reply) => {
    const { organizationId } = request.params;
    const { event, from } = request.body;

    if (!from) {
      return reply.status(400).send({ error: "Missing 'from' phone number" });
    }

    if (event === "ringing") {
      // Пытаемся найти пациента по номеру телефона
      // Убираем всё лишнее из номера, оставляя только цифры для поиска
      const rawPhone = from.replace(/\D/g, "");
      let patient: any = null;

      if (rawPhone.length >= 10) {
        // Ищем по последним 10 цифрам
        const phoneSuffix = rawPhone.slice(-10);
        const searchResult = await db.select()
          .from(patients)
          .where(ilike(patients.phone, `%${phoneSuffix}%`))
          .limit(1);
        patient = searchResult[0] || null;
      }

      // Броадкастим всем админам этой клиники
      wsBroker.broadcastToOrganization(organizationId, {
        type: "TELEPHONY_INCOMING_CALL",
        payload: {
          phone: from,
          patientId: patient?.id || null,
          patientName: patient ? `${patient.lastName || ''} ${patient.firstName || ''}`.trim() : "Неизвестный номер",
          timestamp: new Date().toISOString()
        }
      });
    }

    // Возвращаем 200 OK чтобы АТС поняла, что хук принят
    return { success: true };
  });
};
