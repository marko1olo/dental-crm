import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import {
	getDocumentById,
	readIssuedDocumentSnapshot,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import {
	documentIssueBlockReason,
	renderDocumentHtml,
} from "../../documents/renderDocument.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { clinicalDocKinds } from "./query.js";
import {
	apiError,
	applySignatureStampIfSigned,
	documentAttachmentFileName,
	documentHasIssuedArchiveMetadata,
	documentIssueChainBlockReason,
	documentRequiresIssuedArchive,
	issuedArchiveIntegrityError,
	resolveDocumentRenderContext,
} from "./shared.js";

export async function register(app: FastifyInstance) {
	app.get<{ Params: { id: string }; Querystring: { download?: string } }>(
		"/api/documents/:id/html",
		async (request, reply) => {
			if (!(await requireClinicalReadAccess(request, reply, "document html")))
				return;
			const { id } = request.params as { id: string };
			const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (!UUID_REGEX.test(id)) {
				return reply.code(400).send(apiError("Некорректный идентификатор документа (ожидается UUID)"));
			}
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const document = await getDocumentById(orgId, id);
			if (!document) {
				return reply.code(404).send(apiError("Документ не найден"));
			}

			// Защита 152-ФЗ / 323-ФЗ ст. 13: врачебная тайна в медицинских документах
			if (clinicalDocKinds.has(document.kind)) {
				const identity = getRequestIdentity(request);
				const access = evaluateClinicalAccess(identity.role);
				if (!access.hasClinicalAccess) {
					return reply.code(403).send(apiError("Доступ к медицинской тайне ограничен 152-ФЗ и 323-ФЗ: требуются права клинического персонала."));
				}
			}

			const patient = await getPatientByIdFromDb(orgId, document.patientId);
			if (!patient) {
				return reply.code(404).send(apiError("Пациент не найден"));
			}

			// 152-ФЗ / 323-ФЗ: Аудит просмотра медицинского документа
			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId: document.patientId,
				action: "VIEW_MEDICAL_DOCUMENT_HTML",
				diagnosis: document.title,
			});

			const issuedSnapshot = readIssuedDocumentSnapshot(document);
			if (documentRequiresIssuedArchive(document)) {
				if (!documentHasIssuedArchiveMetadata(document)) {
					return reply.code(409).send(apiError(issuedArchiveIntegrityError));
				}
				if (!issuedSnapshot) {
					return reply
						.code(409)
						.send(
							apiError(
								"Архивная копия выданного документа отсутствует или не прошла проверку целостности.",
							),
						);
				}
				if (
					request.query.download === "1" ||
					request.query.download === "true"
				) {
					reply.header(
						"Content-Disposition",
						`attachment; filename="${documentAttachmentFileName(document, "html")}"`,
					);
				}
				return reply
					.type("text/html; charset=utf-8")
					.send(applySignatureStampIfSigned(document, issuedSnapshot));
			}

			const requestHost = request.headers.host ?? "127.0.0.1:4100";
			const requestProto =
				(request.headers["x-forwarded-proto"] as string) ?? "http";
			const origin = `${requestProto}://${requestHost}`;

			// Реальный контекст вместо пустой заглушки (см. documents.ts).
			const renderContext = {
				...(await resolveDocumentRenderContext(orgId, document.patientId)),
				origin,
			};
			// БЫЛО: без await у второго операнда. Для чистого черновика левая часть
			// равна null, и blockReason становился Promise — истинным значением.
			// Врач нажимал «Печать» и получал 409 «Печатная форма недоступна:
			// [object Promise]». Печать не работала вообще ни для одного документа.
			const blockReason =
				documentIssueBlockReason(document, patient, renderContext) ??
				(await documentIssueChainBlockReason(document));
			if (blockReason) {
				return reply
					.code(409)
					.send(apiError(`Печатная форма недоступна: ${blockReason}`));
			}

			return reply
				.type("text/html; charset=utf-8")
				.send(
					applySignatureStampIfSigned(
						document,
						renderDocumentHtml(document, patient, renderContext),
					),
				);
		},
	);
}
