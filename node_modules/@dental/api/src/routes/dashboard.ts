import type { FastifyInstance } from "fastify";
import { dashboardSchema } from "@dental/shared";
import { getDashboardFromDb } from "../db/dashboardQuery.js";
import { verifyToken } from "../utils/cryptoHelper.js";
import { configuredClinicalAccessSecret } from "../accessGuard.js";

const TOKEN_SECRET = () => {
  const secret = process.env.AUTH_TOKEN_SECRET ?? configuredClinicalAccessSecret() ?? "dente_jwt_secret_demo";
  return secret;
};

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async (request, reply) => {
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    
    let orgId = "00000000-0000-0000-0000-000000000001";
    if (clinicToken) {
      const payload = verifyToken(clinicToken, TOKEN_SECRET());
      if (payload && payload.organizationId) {
        orgId = payload.organizationId as string;
      }
    }
    
    try {
      const dashboard = await getDashboardFromDb(orgId);
      return dashboard;
    } catch (e: any) {
      console.error("[Dashboard] Error fetching from DB:", e.message || String(e));
      return reply.code(500).send({ error: "DatabaseError", details: e.message });
    }
  });
}
