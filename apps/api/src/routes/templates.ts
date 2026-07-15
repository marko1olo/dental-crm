import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { visitTemplates } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { requireClinicalReadAccess, requireClinicalMutationAccess, resolveOrganizationId } from "../accessGuard.js";
import { ensureClinicalTemplatesSeeded } from "../scripts/seedTemplates.js";

export default async function registerTemplateRoutes(app: FastifyInstance) {
  // GET /api/templates — list all templates for the org
  app.get("/api/templates", async (req, reply) => {
    if (!(await requireClinicalReadAccess(req, reply, "read templates"))) return;
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

    // Auto-seed built-in templates if none exist
    const existing = await db.select().from(visitTemplates).where(eq(visitTemplates.organizationId, orgId));
    if (existing.length === 0) {
      try {
        await ensureClinicalTemplatesSeeded(orgId);
      } catch (err) {
        app.log.warn(`[Templates] Auto-seed failed: ${String(err)}`);
      }
    }

    const templates = await db
      .select()
      .from(visitTemplates)
      .where(eq(visitTemplates.organizationId, orgId));

    return reply.send({ templates });
  });

  // GET /api/templates/:id — get single template
  app.get("/api/templates/:id", async (req, reply) => {
    if (!(await requireClinicalReadAccess(req, reply, "read template"))) return;
    const { id } = req.params as { id: string };
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

    const [template] = await db
      .select()
      .from(visitTemplates)
      .where(and(eq(visitTemplates.id, id), eq(visitTemplates.organizationId, orgId)));

    if (!template) return reply.code(404).send({ error: "NotFound" });
    return reply.send({ template });
  });

  // POST /api/templates — create a custom template
  app.post("/api/templates", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "create template"))) return;
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

    const body = req.body as {
      title: string;
      category?: string;
      specialty?: string;
      prefilledAnamnesis?: string;
      prefilledObjective?: string;
      prefilledTreatment?: string;
      defaultIcd10?: string;
      defaultIcd10Label?: string;
      suggestedProcedureIds?: string[];
    };

    if (!body.title?.trim()) return reply.code(400).send({ error: "Title required" });

    const [inserted] = await db
      .insert(visitTemplates)
      .values({
        organizationId: orgId,
        title: body.title.trim(),
        category: body.category,
        specialty: body.specialty,
        prefilledAnamnesis: body.prefilledAnamnesis,
        prefilledObjective: body.prefilledObjective,
        prefilledTreatment: body.prefilledTreatment,
        defaultIcd10: body.defaultIcd10,
        defaultIcd10Label: body.defaultIcd10Label,
        suggestedProcedureIds: body.suggestedProcedureIds ?? [],
        isBuiltIn: false
      })
      .returning();

    return reply.code(201).send({ template: inserted });
  });

  // DELETE /api/templates/:id — delete custom template (built-in protected)
  app.delete("/api/templates/:id", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "delete template"))) return;
    const { id } = req.params as { id: string };
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

    const [template] = await db
      .select()
      .from(visitTemplates)
      .where(and(eq(visitTemplates.id, id), eq(visitTemplates.organizationId, orgId)));

    if (!template) return reply.code(404).send({ error: "NotFound" });
    if (template.isBuiltIn) return reply.code(403).send({ error: "CannotDeleteBuiltIn" });

    await db.delete(visitTemplates).where(and(eq(visitTemplates.id, id), eq(visitTemplates.organizationId, orgId)));
    return reply.send({ success: true });
  });

  // POST /api/templates/seed — force re-seed built-in templates
  app.post("/api/templates/seed", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "seed templates"))) return;
    const orgId = await resolveOrganizationId(req);
    if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

    await ensureClinicalTemplatesSeeded(orgId);
    const templates = await db.select().from(visitTemplates).where(eq(visitTemplates.organizationId, orgId));
    return reply.send({ success: true, count: templates.length });
  });
}
