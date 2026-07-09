import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { visitTemplates } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireClinicalReadAccess, resolveOrganizationId } from "../accessGuard.js";

export default async function registerTemplateRoutes(app: FastifyInstance) {
  app.get("/api/templates", async (req, reply) => {
    if (!(await requireClinicalReadAccess(req, reply, "read templates"))) return;
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return reply.code(403).send({error: "OrgRequired"});
    const templates = await db.select().from(visitTemplates).where(eq(visitTemplates.organizationId, orgId));
    return reply.send({ templates });
  });
}
