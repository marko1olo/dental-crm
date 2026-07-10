import type { FastifyInstance } from "fastify";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "../auth.js";
import { db } from "../../db/client.js";
import { generatedDocuments } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export async function register(app: FastifyInstance) {
  app.post("/api/documents/:id/sign", async (request, reply) => {
    const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    if (!clinicToken) return reply.code(401).send({ error: "AuthRequired" });

    const payload = verifyToken(clinicToken, TOKEN_SECRET());
    if (!payload || !payload.organizationId) return reply.code(401).send({ error: "AuthExpired" });

    const { id } = request.params as { id: string };
    const { signatureSvg } = request.body as { signatureSvg: string };

    if (!id || !signatureSvg) {
      return reply.code(400).send({ error: "ValidationError", message: "ID and signatureSvg are required" });
    }

    try {
      const updated = await db
        .update(generatedDocuments)
        .set({ signatureSvg })
        .where(eq(generatedDocuments.id, id))
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
