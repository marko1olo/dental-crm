import {
	extractGostCmsMetadata,
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
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { clinicalDocKinds } from "./query.js";

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

		try {
			// First verify the document exists and is in a state that allows signing
			const [doc] = await db
				.select({
					id: generatedDocuments.id,
					kind: generatedDocuments.kind,
					status: generatedDocuments.status,
					cryptoSignaturePkcs7: generatedDocuments.cryptoSignaturePkcs7,
					issuedSnapshotSha256: generatedDocuments.issuedSnapshotSha256,
					storagePath: generatedDocuments.storagePath,
					issuedAt: generatedDocuments.issuedAt,
					signatureAttestation: generatedDocuments.signatureAttestation,
					doctorCertSerial: generatedDocuments.doctorCertSerial,
					doctorCertSubject: generatedDocuments.doctorCertSubject,
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

			// 63-ФЗ, 323-ФЗ и Приказ Минздрава 947н: Медицинские документы могут подписываться УКЭП только медицинским персоналом (врачом/главным врачом)
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (clinicalDocKinds.has(doc.kind) && !evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.document.sign_ukep",
					role: staffRole,
					message:
						"Подписание медицинских документов УКЭП ограничено 63-ФЗ, 323-ФЗ и Приказом Минздрава 947н: требуются права врача или главного врача.",
				});
			}

			// Валидация криптографического формата отсоединенной подписи CMS PKCS#7
			const signatureValidation = validateGostCmsPkcs7Signature(pkcs7Signature);
			if (!signatureValidation.valid) {
				return reply.code(400).send({
					error: "SignatureVerificationFailed",
					errorCode: signatureValidation.errorCode ?? "SignatureVerificationFailed",
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
				if (!tamperCheck.valid) {
					return reply.code(400).send({
						error: "SignatureVerificationFailed",
						errorCode: tamperCheck.errorCode ?? "TamperDetected",
						tamperDetected: tamperCheck.tamperDetected ?? true,
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
			let certSerial =
				parsedBody.data.certificateSerialNumber || doc.doctorCertSerial;
			let certSubject =
				parsedBody.data.certificateSubject || doc.doctorCertSubject;

			if (!certSerial) {
				try {
					const derBuffer = Buffer.from(pkcs7Signature, "base64");
					const meta = extractGostCmsMetadata(derBuffer);
					if (meta.certificateSerialNumber) {
						certSerial = meta.certificateSerialNumber;
					}
				} catch {
					// DER extraction fallback
				}
			}

			if (!certSerial) {
				return reply.code(400).send({
					error: "MissingCertificateSerialNumber",
					message:
						"Не удалось определить серийный номер сертификата из подписи PKCS#7. Передайте certificateSerialNumber явно или используйте валидный контейнер CAdES.",
				});
			}

			if (!certSubject) {
				certSubject =
					doc.signatureAttestation?.staffFullName || "Врач-стоматолог";
			}
			const signedAtDate = parsedBody.data.signedAt
				? new Date(parsedBody.data.signedAt)
				: now;

			const signResult = await db.transaction(async (tx) => {
				const updated = await tx
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
					return { conflict: true as const };
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
						await tx
							.update(generatedDocuments)
							.set({
								issuedSnapshotSha256: written.sha256,
								storagePath: written.snapshotPath,
							})
							.where(
								and(
									eq(generatedDocuments.id, doc.id),
									eq(generatedDocuments.organizationId, orgId),
								),
							);
					}
				}

				return { success: true as const, id: updated[0]?.id };
			});

			if ("conflict" in signResult && signResult.conflict) {
				return reply.code(409).send({
					error: "AlreadySigned",
					message: "Документ уже подписан УКЭП или недоступен.",
				});
			}

			return { success: true, id: signResult.id };
		} catch (e) {
			console.error("[DocumentSignUkep] Error:", e);
			return reply.code(500).send({ error: "DatabaseError" });
		}
	});
}
