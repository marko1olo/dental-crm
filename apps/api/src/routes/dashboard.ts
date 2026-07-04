import type { FastifyInstance } from "fastify";
import { dashboardSchema } from "@dental/shared";
import { getDashboardFromDb } from "../db/dashboardQuery.js";
import { verifyToken } from "../utils/cryptoHelper.js";
import { configuredClinicalAccessSecret } from "../accessGuard.js";

const TOKEN_SECRET = () => process.env.AUTH_TOKEN_SECRET ?? configuredClinicalAccessSecret() ?? "dente_fallback_secret_change_me";

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async (request, reply) => {
    // Authenticate and get organizationId
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    if (!clinicToken) return reply.code(401).send({ error: "AuthRequired" });
    
    const payload = verifyToken(clinicToken, TOKEN_SECRET());
    if (!payload || !payload.organizationId) return reply.code(401).send({ error: "AuthExpired" });

    const orgId = payload.organizationId as string;
    
    try {
      const dashboard = await getDashboardFromDb(orgId);
      return dashboardSchema.parse(dashboard);
    } catch (e) {
      console.error("[Dashboard] Error fetching from DB:", e);
      return reply.code(500).send({ error: "DatabaseError" });
    }
  });
}
