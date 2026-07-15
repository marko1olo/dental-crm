import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { generatedDocuments } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export async function register(app: FastifyInstance) {
  app.post("/api/documents/:id/sign", async (request, reply) => {
    const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "document signature");
    if (!orgId) return;

    const { id } = request.params as { id: string };
    const { signatureSvg } = request.body as { signatureSvg: string };

    if (!id || !signatureSvg) {
      return reply.code(400).send({ error: "ValidationError", message: "ID and signatureSvg are required" });
    }

    try {
      const updated = await db
        .update(generatedDocuments)
        .set({ signatureSvg })
        .where(and(eq(generatedDocuments.id, id), eq(generatedDocuments.organizationId, orgId)))
        .returning();

      if (!updated.length) {
        return reply.code(404).send({ error: "DocumentNotFound" });
      }

      return { success: true, id: updated[0]?.id };
    } catch (e) {
      console.error("[DocumentSign] Error:", e);
      return reply.code(500).send({ error: "DatabaseError" });
    }
  });
}
