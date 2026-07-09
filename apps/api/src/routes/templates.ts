import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { visitTemplates } from "../db/schema.js";
import { requireClinicalReadAccess } from "../accessGuard.js";

export default async function registerTemplateRoutes(app: FastifyInstance) {
  app.get("/api/templates", async (req, reply) => {
    if (!(await requireClinicalReadAccess(req, reply, "read templates"))) return;
    const templates = await db.select().from(visitTemplates);
    return reply.send({ templates });
  });
}
