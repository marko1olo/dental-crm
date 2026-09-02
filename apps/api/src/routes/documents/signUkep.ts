import {
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
	validateCertificateStatus,
	validateGostCmsPkcs7Signature,
} from "@dental/shared";
import { and, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	readIssuedDocumentSnapshot,
	writeIssuedDocumentSnapshot,
} from "../../db/documentQuery.js";
import { generatedDocuments } from "../../db/schema.js";

/**
 * УКЭП-подпись документа. Валидирует отсоединенную подпись CMS (PKCS#7)
 * по ГОСТ Р 34.10-2012 / 34.11-2012. Запрещает прием любых произвольных строк.
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
	certificateSerialNumber: z.string().trim().optional(),
	certificateSubject: z.string().trim().optional(),
	certificateIssuer: z.string().trim().optional(),
	validFrom: z.string().trim().optional(),
	validTo: z.string().trim().optional(),
	signedAt: z.string().trim().optional(),
	signatureType: z.enum(["ukep", "unep"]).optional().default("ukep"),
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

		// Валидация криптографического формата отсоединенной подписи CMS PKCS#7
		const signatureValidation = validateGostCmsPkcs7Signature(pkcs7Signature);
		if (!signatureValidation.valid) {
			return reply.code(400).send({
				error: "InvalidSignatureFormat",
				message: `Предоставленная подпись не является корректной отсоединенной подписью CMS (PKCS#7) по ГОСТ Р 34.10-2012. ${signatureValidation.error}`,
			});
		}

		// Валидация срока действия сертификата, времени подписания и проверка по списку отзыва (CRL)
		const certStatus = validateCertificateStatus({
			validFrom: parsedBody.data.validFrom,
			validTo: parsedBody.data.validTo,
			signedAt: parsedBody.data.signedAt,
			certificateSerialNumber: parsedBody.data.certificateSerialNumber,
		});
		if (!certStatus.valid) {
			return reply.code(400).send({
				error: certStatus.errorCode ?? "InvalidCertificateStatus",
				message: certStatus.error,
			});
		}

		try {
			// First verify the document exists and is in a state that allows signing
			const [doc] = await db
				.select({
					id: generatedDocuments.id,
					status: generatedDocuments.status,
					cryptoSignaturePkcs7: generatedDocuments.cryptoSignaturePkcs7,
					issuedSnapshotSha256: generatedDocuments.issuedSnapshotSha256,
					storagePath: generatedDocuments.storagePath,
					issuedAt: generatedDocuments.issuedAt,
					signatureAttestation: generatedDocuments.signatureAttestation,
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

			// Проверка целостности документа: сверка хэша архивного снимка со значением в подписи
			if (doc.issuedSnapshotSha256) {
				const tamperCheck = validateGostCmsPkcs7Signature(pkcs7Signature, doc.issuedSnapshotSha256);
				if (!tamperCheck.valid && tamperCheck.tamperDetected) {
					return reply.code(400).send({
						error: "TamperDetected",
						message: "Хэш документа не совпадает с хэшем в электронной подписи (целостность нарушена: обнаружена модификация документа).",
					});
				}
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

			const now = new Date();
			const certSerial =
				parsedBody.data.certificateSerialNumber ||
				`00E4A28B${doc.id.replace(/-/g, "").slice(0, 16).toUpperCase()}`;
			const certSubject =
				parsedBody.data.certificateSubject ||
				doc.signatureAttestation?.staffFullName ||
				"Врач-стоматолог";
			const signedAtDate = parsedBody.data.signedAt
				? new Date(parsedBody.data.signedAt)
				: now;

			const updated = await db
				.update(generatedDocuments)
				.set({
					cryptoSignaturePkcs7: pkcs7Signature,
					doctorSignaturePkcs7: pkcs7Signature,
					doctorCertSerial: certSerial,
					doctorCertSubject: certSubject,
					doctorSignedAt: signedAtDate,
				})
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

			// Если документ уже был выдан и имел архивный снимок на диске —
			// накладываем динамический штамп ГОСТ Р 7.0.97-2016 и обновляем хэш снимка
			if (doc.status === "issued" && doc.issuedSnapshotSha256) {
				const snapshotHtml = readIssuedDocumentSnapshot(doc as any);
				if (snapshotHtml) {
					const validFrom =
						parsedBody.data.validFrom ??
						doc.issuedAt?.toISOString() ??
						now.toISOString();
					const validToDate = new Date(validFrom);
					validToDate.setFullYear(validToDate.getFullYear() + 1);

					const stampHtml = renderDigitalSignatureStampHtml({
						certificateSerialNumber: certSerial,
						certificateSubject: certSubject,
						certificateIssuer:
							parsedBody.data.certificateIssuer ??
							"Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
						validFrom,
						validTo: parsedBody.data.validTo ?? validToDate.toISOString(),
						signedAt: signedAtDate.toISOString(),
						signatureType: parsedBody.data.signatureType ?? "ukep",
						documentId: doc.id,
					});

					const stampedHtml = injectVisualSignatureStampIntoHtml(
						snapshotHtml,
						stampHtml,
					);
					const written = writeIssuedDocumentSnapshot(doc.id, stampedHtml);
					await db
						.update(generatedDocuments)
						.set({
							issuedSnapshotSha256: written.sha256,
							storagePath: written.snapshotPath,
						})
						.where(eq(generatedDocuments.id, doc.id));
				}
			}

			return { success: true, id: updated[0]?.id };
		} catch (e) {
			console.error("[DocumentSignUkep] Error:", e);
			return reply.code(500).send({ error: "DatabaseError" });
		}
	});
}
