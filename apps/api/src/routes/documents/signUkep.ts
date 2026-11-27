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
import { recordAuditEvent } from "../../audit.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import {
	readIssuedDocumentSnapshot,
	writeStampedDocumentSnapshot,
} from "../../db/documentQuery.js";
import { generatedDocuments } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { clinicalDocKinds } from "./query.js";

/**
 * УКЭП-подпись документа. Валидирует отсоединенную подпись CMS (PKCS#7)
 * по ГОСТ Р 34.10-2012 / 34.11-2012. Запрещает прием любых произвольных строк.
 */
const documentUkepSignParamsSchema = z
	.object({
		id: z.string().uuid({
			message: "Не указан идентификатор документа или электронная подпись.",
		}),
	})
	.strict();

const documentUkepSignBodySchema = z
	.object({
		pkcs7Signature: z
			.string({
				required_error: "Не указан идентификатор документа или электронная подпись.",
				invalid_type_error: "Не указан идентификатор документа или электронная подпись.",
			})
			.min(1, { message: "Не указан идентификатор документа или электронная подпись." }),
		certificateSerialNumber: z.string().trim().optional(),
		certificateSubject: z.string().trim().optional(),
		certificateIssuer: z.string().trim().optional(),
		validFrom: z.string().trim().optional(),
		validTo: z.string().trim().optional(),
		signedAt: z.string().trim().optional(),
		signatureType: z.enum(["ukep", "unep"]).optional().default("ukep"),
	})
	.strict();

const ukepSignMutationSchema: Record<string, unknown> = {
	description: "UKEP document sign mutation with mandatory RFC 9562 Idempotency-Key",
	headers: {
		type: "object",
		properties: {
			"idempotency-key": { type: "string" },
			"x-idempotency-key": { type: "string" },
			organizationid: { type: "string" },
			"x-organization-id": { type: "string" },
		},
	},
};

export async function register(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/documents/:id/sign-ukep",
		permission: "public",
		schema: ukepSignMutationSchema,
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"document ukep signature",
			);
			if (!orgId) return reply;

			const parsedParams = documentUkepSignParamsSchema.safeParse(request.params);
			const parsedBody = documentUkepSignBodySchema.safeParse(request.body);
			if (!parsedParams.success || !parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Не указан идентификатор документа или электронная подпись.",
				});
			}

			const { id } = parsedParams.data;
			const { pkcs7Signature } = parsedBody.data;

			try {
				const [doc] = await withTenantReadCtx(orgId, (tx) =>
					tx
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
						.limit(1),
				);

				if (!doc) {
					return reply.code(404).send({
						error: "DocumentNotFound",
						message: "Документ не найден.",
					});
				}

				const identity = getRequestIdentity(request);
				const staffRole = identity.role ?? request.user?.role ?? null;
				const evalAccess = evaluateClinicalAccess(staffRole, {
					clinicalRole: identity.clinicalRole ?? null,
					canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
					specialties: identity.specialties ?? null,
				});
				if (clinicalDocKinds.has(doc.kind) && !evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "clinical.document.sign_ukep",
						role: staffRole,
						message:
							"Подписание клинических медицинских документов электронной подписью доступно только врачу или главному врачу.",
					});
				}

				const signatureValidation = validateGostCmsPkcs7Signature(pkcs7Signature);
				if (!signatureValidation.valid) {
					return reply.code(400).send({
						error: "SignatureVerificationFailed",
						errorCode: signatureValidation.errorCode ?? "SignatureVerificationFailed",
						message: `Файл электронной подписи поврежден или имеет неверный формат. ${signatureValidation.error ?? ""}`.trim(),
					});
				}

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

				if (doc.status === "voided") {
					return reply.code(409).send({
						error: "Conflict",
						message: "Невозможно подписать аннулированный документ электронной подписью.",
					});
				}

				if (doc.cryptoSignaturePkcs7) {
					return reply.code(409).send({
						error: "AlreadySigned",
						message:
							"Документ уже подписан электронной подписью. Замена подписи запрещена: аннулируйте документ и выпустите исправляющий.",
					});
				}

				if (!doc.issuedSnapshotSha256) {
					return reply.code(400).send({
						error: "DocumentNotIssued",
						message:
							"Документ должен быть сформирован (выпущен) перед подписанием УКЭП.",
					});
				}

				const tamperCheck = validateGostCmsPkcs7Signature(
					pkcs7Signature,
					doc.issuedSnapshotSha256,
				);
				if (!tamperCheck.valid) {
					return reply.code(400).send({
						error: "SignatureVerificationFailed",
						errorCode: tamperCheck.errorCode ?? "TamperDetected",
						tamperDetected: tamperCheck.tamperDetected ?? true,
						message:
							"Хэш документа не совпадает с хэшем в электронной подписи (целостность нарушена: обнаружена модификация документа).",
					});
				}

				const [replayed] = await withTenantReadCtx(orgId, (tx) =>
					tx
						.select({ id: generatedDocuments.id })
						.from(generatedDocuments)
						.where(
							and(
								eq(generatedDocuments.organizationId, orgId),
								eq(generatedDocuments.cryptoSignaturePkcs7, pkcs7Signature),
							),
						)
						.limit(1),
				);

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
					} catch (derErr) {
						request.log.warn(
							{ err: derErr, documentId: id },
							"[DocumentSignUkep] Не удалось извлечь серийный номер из DER CMS",
						);
					}
				}

				if (!certSerial) {
					return reply.code(400).send({
						error: "MissingCertificateSerialNumber",
						message:
							"Не удалось определить серийный номер сертификата электронной подписи. Выберите действующий сертификат врача и повторите подписание.",
					});
				}

				if (!certSubject) {
					certSubject =
						doc.signatureAttestation?.staffFullName || "Врач-стоматолог";
				}
				const signedAtDate = parsedBody.data.signedAt
					? new Date(parsedBody.data.signedAt)
					: now;

				const signResult = await withTenantWriteCtx(orgId, async (tx) => {
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
								isNull(generatedDocuments.cryptoSignaturePkcs7),
							),
						)
						.returning();

					if (!updated.length) {
						return { conflict: true as const };
					}

					if (doc.status === "issued" && doc.issuedSnapshotSha256) {
						const snapshotHtml = readIssuedDocumentSnapshot(doc);
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
							writeStampedDocumentSnapshot(doc.id, stampedHtml);
						}
					}

					await recordAuditEvent({
						organizationId: orgId,
						actorUserId: identity.userId ?? null,
						entityType: "generated_document",
						entityId: doc.id,
						action: "document_signed_ukep_63fz",
						reason: JSON.stringify({
							law: "63-FZ",
							signatureType: parsedBody.data.signatureType ?? "ukep",
							certSerial,
							certSubject,
							signedAt: signedAtDate.toISOString(),
						}),
						tx,
					});

					return { success: true as const, id: updated[0]?.id };
				});

				if ("conflict" in signResult && signResult.conflict) {
					return reply.code(409).send({
						error: "AlreadySigned",
						message: "Документ уже подписан электронной подписью или недоступен.",
					});
				}

				return reply.send({ success: true, id: signResult.id });
			} catch (e: unknown) {
				request.log.error(e, "[DocumentSignUkep] Error");
				return reply.code(500).send({
					error: "DatabaseError",
					message: "Не удалось сохранить электронную подпись документа. Повторите попытку.",
				});
			}
		},
	});
}
