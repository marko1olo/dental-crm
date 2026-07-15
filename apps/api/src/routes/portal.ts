import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { db } from "../db/client.js";
import { patients, visitDiaries, treatmentPlans, patientInvoices } from "../db/schema.js";
import { eq, ilike } from "drizzle-orm";

export const portalRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  
  // 1. Send OTP
  server.post<{ Body: { phone: string } }>("/auth/send-otp", async (request, reply) => {
    const { phone } = request.body;
    if (!phone) return reply.status(400).send({ error: "Phone is required" });
    
    // В реальном мире тут интеграция с SMS-шлюзом
    // Для MVP всегда шлём 0000
    return { success: true, message: "OTP sent" };
  });

  // 2. Verify OTP
  server.post<{ Body: { phone: string; code: string } }>("/auth/verify-otp", async (request, reply) => {
    const { phone, code } = request.body;
    if (code !== "0000") return reply.status(401).send({ error: "Invalid OTP" });

    const rawPhone = phone.replace(/\D/g, "");
    if (rawPhone.length < 10) return reply.status(400).send({ error: "Invalid phone" });
    
    const phoneSuffix = rawPhone.slice(-10);
    const searchResult = await db.select().from(patients).where(ilike(patients.phone, `%${phoneSuffix}%`)).limit(1);
    
    if (searchResult.length === 0) {
      return reply.status(404).send({ error: "Patient not found in CRM" });
    }

    const patient = searchResult[0];
    if (!patient) return reply.status(404).send({ error: "Patient not found in CRM" });

    // MVP Token generation
    const token = Buffer.from(`DENTE_TOKEN:${patient.id}`).toString("base64");

    return { success: true, token, patientId: patient.id };
  });

  // 3. Get Patient Data (Protected)
  server.get("/me", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return reply.status(401).send({ error: "Unauthorized" });

    try {
      const token = authHeader.split(" ")[1];
      if (!token) throw new Error("No token provided");
      const decodedStr = Buffer.from(token, "base64").toString("utf-8");
      if (!decodedStr.startsWith("DENTE_TOKEN:")) throw new Error("Invalid token format");
      const patientId = decodedStr.replace("DENTE_TOKEN:", "");
      
      const pResult = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (!pResult.length || !pResult[0]) return reply.status(404).send({ error: "Not found" });

      const patient = pResult[0];
      const visits = await db.select().from(visitDiaries).where(eq(visitDiaries.patientId, patient.id));
      const plans = await db.select().from(treatmentPlans).where(eq(treatmentPlans.patientId, patient.id));
      const invoices = await db.select().from(patientInvoices).where(eq(patientInvoices.patientId, patient.id));

      return {
        patient,
        visits,
        plans,
        invoices
      };
    } catch (err) {
      return reply.status(401).send({ error: "Invalid token" });
    }
  });

};
