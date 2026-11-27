import { voidDocumentSchema } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import {
	getDocumentById,
	voidGeneratedDocumentInDb,
} from "../../db/documentQuery.js";
import { settleRefundedPaymentsForPatient } from "../../documents/refundSettlement.js";
import {
	getRequestIdentity,
	requireOrganizationId,
} from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { clinicalDocKinds } from "./query.js";
import {
	repairMojibakeDeep,
	repairMojibakeText,
} from "../../text/repairMojibake.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	apiError,
	documentVoidValidationMessage,
	toPublicGeneratedDocument,
} from "./shared.js";

const documentIdParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

export async function register(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/documents/:id/void",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalMutationAccess(request, reply, "document void")))
				return reply;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
				});
			}
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return reply;
			const parsedParams = documentIdParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply
					.code(400)
					.send(
						apiError("Некорректный идентификатор документа (ожидается UUID)"),
					);
			}
			const { id } = parsedParams.data;
			const existing = await withTenantReadCtx(orgId, () =>
				getDocumentById(orgId, id),
			);
			if (!existing) {
				return reply.code(404).send(apiError("Документ не найден"));
			}

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (clinicalDocKinds.has(existing.kind) && !evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.document.void",
					role: staffRole,
					message:
						"Аннулирование медицинских документов ограничено 323-ФЗ и 152-ФЗ: требуются права клинического персонала (врач / главный врач).",
				});
			}

			const parsedVoidInput = voidDocumentSchema.safeParse(request.body);
			if (!parsedVoidInput.success) {
				return reply.code(400).send({
					error: "DocumentVoidValidationFailed",
					message: repairMojibakeText(documentVoidValidationMessage),
				});
			}

			const voidAttestationInput = repairMojibakeDeep(
				parsedVoidInput.data.voidAttestation,
			);
			const correctionDocumentId =
				voidAttestationInput.correctionDocumentId ?? null;
			if (correctionDocumentId === id) {
				return reply
					.code(409)
					.send(
						apiError("Документ не может ссылаться на себя как на исправление."),
					);
			}
			if (existing.status === "voided") {
				return reply.code(409).send(apiError("Документ уже аннулирован."));
			}
			if (existing.status !== "issued") {
				return reply
					.code(409)
					.send(
						apiError(
							"Аннулировать можно только выданный документ. Черновик достаточно удалить или изменить.",
						),
					);
			}

			if (correctionDocumentId) {
				const correctionDocument = await withTenantReadCtx(orgId, () =>
					getDocumentById(orgId, correctionDocumentId),
				);
				if (
					!correctionDocument ||
					correctionDocument.organizationId !== existing.organizationId ||
					correctionDocument.patientId !== existing.patientId ||
					correctionDocument.status !== "issued"
				) {
					return reply
						.code(409)
						.send(
							apiError(
								"Исправляющий документ должен быть ВЫДАН, относиться к тому же пациенту и той же клинике.",
							),
						);
				}
			}

			const voidedAt = new Date().toISOString();
			const document = await withTenantWriteCtx(orgId, async (tx) => {
				const voidedDoc = await voidGeneratedDocumentInDb(orgId, id, {
					voidedByUserId: getRequestIdentity(request).userId,
					voidedAt,
					voidAttestation: {
						...voidAttestationInput,
						voidedAt,
					},
					tx,
				});
				if (!voidedDoc) {
					return null;
				}

				if (voidedDoc.kind === "payment_refund_correction_request") {
					const settlement = await settleRefundedPaymentsForPatient(
						orgId,
						voidedDoc.patientId,
						tx,
					);
					request.log.info(
						{ documentId: voidedDoc.id, restoredPaymentIds: settlement.restored },
						"аннулирование заявления на возврат сведено с кассой",
					);
				}

				return voidedDoc;
			});

			if (!document) {
				return reply
					.code(409)
					.send(apiError("Статус документа нельзя изменить."));
			}

			return reply.send(toPublicGeneratedDocument(document));
		},
	});
}
