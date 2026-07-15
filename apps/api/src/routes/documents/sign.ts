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

    if (!id || !signatureSvg || typeof signatureSvg !== "string") {
      return reply.code(400).send({ error: "ValidationError", message: "ID and signatureSvg are required" });
    }

    if (!signatureSvg.startsWith("<svg") || !signatureSvg.endsWith("</svg>")) {
      return reply.code(400).send({ error: "ValidationError", message: "Invalid signature format: must be an SVG element." });
    }

    if (/(<script|<\/?iframe|<\/?object|<\/?embed|on\w+\s*=)/i.test(signatureSvg)) {
      return reply.code(400).send({ error: "ValidationError", message: "Unsafe signature content detected." });
    }

    try {
      // Prevent exact signature replay attacks
      const [replayed] = await db
        .select({ id: generatedDocuments.id })
        .from(generatedDocuments)
        .where(eq(generatedDocuments.signatureSvg, signatureSvg))
        .limit(1);

      if (replayed) {
        return reply.code(409).send({ error: "SignatureReplay", message: "Эта подпись уже использована для другого документа. Повторное использование запрещено." });
      }

      // First verify the document exists and is in a state that allows signing
      const [doc] = await db
        .select({ status: generatedDocuments.status })
        .from(generatedDocuments)
        .where(and(eq(generatedDocuments.id, id), eq(generatedDocuments.organizationId, orgId)))
        .limit(1);

      if (!doc) {
        return reply.code(404).send({ error: "DocumentNotFound" });
      }

      if (doc.status !== "draft") {
        return reply.code(409).send({ error: "Conflict", message: "Подпись невозможна: документ уже финализирован или аннулирован." });
      }

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
