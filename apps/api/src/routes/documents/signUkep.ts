import { and, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { generatedDocuments } from "../../db/schema.js";

/**
 * УКЭП-подпись документа. Тело раньше читалось через bare cast
 * `request.body as { pkcs7Signature: string }`: при null body
 * деструктуризация давала 500. Zod safeParse после auth-first — 400.
 * Тексты ответов сохранены дословно: их ждёт proof documentUkepSignProof.
 */
const documentUkepSignParamsSchema = z.object({
	id: z.string().uuid({
		message: "ID and pkcs7Signature are required",
	}),
});

const documentUkepSignBodySchema = z.object({
	pkcs7Signature: z
		.string({
			required_error: "ID and pkcs7Signature are required",
			invalid_type_error: "ID and pkcs7Signature are required",
		})
		.min(1, { message: "ID and pkcs7Signature are required" }),
});

export async function register(app: FastifyInstance) {
	app.post("/api/documents/:id/sign-ukep", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"document ukep signature",
		);
		if (!orgId) return;

		const parsedParams = documentUkepSignParamsSchema.safeParse(request.params);
		const parsedBody = documentUkepSignBodySchema.safeParse(request.body);
		if (!parsedParams.success || !parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "ID and pkcs7Signature are required",
			});
		}

		const { id } = parsedParams.data;
		const { pkcs7Signature } = parsedBody.data;

		try {
			// First verify the document exists and is in a state that allows signing
			const [doc] = await db
				.select({
					status: generatedDocuments.status,
					// Нужна для проверки повторного подписания ниже: без этой
					// колонки в выборке doc.cryptoSignaturePkcs7 не существует.
					cryptoSignaturePkcs7: generatedDocuments.cryptoSignaturePkcs7,
				})
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

			// БЫЛО: не проверялось, подписан ли документ УЖЕ. Любой сотрудник мог
			// заменить подпись главного врача своей — прежняя затиралась в той же
			// колонке, и определить, чья подпись заверяла архивный PDF, было
			// невозможно (ни автора, ни времени подписи в схеме не хранится).
			if (doc.cryptoSignaturePkcs7) {
				return reply.code(409).send({
					error: "AlreadySigned",
					message:
						"Документ уже подписан УКЭП. Замена подписи запрещена: аннулируйте документ и выпустите исправляющий.",
				});
			}

			// Prevent replay of the exact same PKCS#7 signature.
			// Поиск ограничен своей организацией: раньше он шёл по всей базе и
			// сообщал о существовании подписи в ЧУЖОЙ клинике.
			const [replayed] = await db
				.select({ id: generatedDocuments.id })
				.from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.organizationId, orgId),
						eq(generatedDocuments.cryptoSignaturePkcs7, pkcs7Signature),
					),
				)
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
						// Условие в самом UPDATE: два одновременных подписания
						// не смогут перезаписать друг друга.
						isNull(generatedDocuments.cryptoSignaturePkcs7),
					),
				)
				.returning();

			if (!updated.length) {
				return reply.code(409).send({
					error: "AlreadySigned",
					message: "Документ уже подписан УКЭП или недоступен.",
				});
			}

			return { success: true, id: updated[0]?.id };
		} catch (e) {
			console.error("[DocumentSignUkep] Error:", e);
			return reply.code(500).send({ error: "DatabaseError" });
		}
	});
}
