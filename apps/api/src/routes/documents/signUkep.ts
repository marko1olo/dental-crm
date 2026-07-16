import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { generatedDocuments } from "../../db/schema.js";

export async function register(app: FastifyInstance) {
	app.post("/api/documents/:id/sign-ukep", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"document ukep signature",
		);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const { pkcs7Signature } = request.body as { pkcs7Signature: string };

		if (!id || !pkcs7Signature || typeof pkcs7Signature !== "string") {
			return reply.code(400).send({
				error: "ValidationError",
				message: "ID and pkcs7Signature are required",
			});
		}

		try {
			// First verify the document exists and is in a state that allows signing
			const [doc] = await db
				.select({ status: generatedDocuments.status })
				.from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.id, id),
						eq(generatedDocuments.organizationId, orgId),
					),
				)
				.limit(1);

			if (!doc) {
				return reply.code(404).send({ error: "DocumentNotFound" });
			}

			// In our workflow, UKEP signs an already issued document (to hash the final PDF)
			// So we allow signing if it's issued, or draft. Usually it's "issued".
			if (doc.status === "voided") {
				return reply.code(409).send({
					error: "Conflict",
					message: "Подписание УКЭП невозможно: документ аннулирован.",
				});
			}

			// Prevent replay of the exact same PKCS#7 signature
			const [replayed] = await db
				.select({ id: generatedDocuments.id })
				.from(generatedDocuments)
				.where(eq(generatedDocuments.cryptoSignaturePkcs7, pkcs7Signature))
				.limit(1);

			if (replayed) {
				return reply.code(409).send({
					error: "SignatureReplay",
					message: "Эта крипто-подпись уже использована для другого документа.",
				});
			}

			const updated = await db
				.update(generatedDocuments)
				.set({ cryptoSignaturePkcs7: pkcs7Signature })
				.where(
					and(
						eq(generatedDocuments.id, id),
						eq(generatedDocuments.organizationId, orgId),
					),
				)
				.returning();

			if (!updated.length) {
				return reply.code(404).send({ error: "DocumentNotFound" });
			}

			return { success: true, id: updated[0]?.id };
		} catch (e) {
			console.error("[DocumentSignUkep] Error:", e);
			return reply.code(500).send({ error: "DatabaseError" });
		}
	});
}
