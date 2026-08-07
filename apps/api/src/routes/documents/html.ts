import {
	createDocumentSchema,
	issueDocumentSchema,
	publicGeneratedDocumentSchema,
	voidDocumentSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import {
	getDocumentById,
	issueGeneratedDocumentInDb,
	readIssuedDocumentSnapshot,
	storeTaxXmlSnapshotInDb,
	voidGeneratedDocumentInDb,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { getVisitByIdInDb } from "../../db/visitsQuery.js";
import {
	paidAmountRubForDocument,
	paymentReceiptSelectionErrorForDocument,
	paymentRefundCorrectionSelectionErrorForDocument,
	plannedAmountRubForDocument,
	taxPaymentSelectionErrorForDocument,
	validateDocumentCreation,
} from "../../documents/guards.js";
import {
	documentIssueBlockReason,
	renderDocumentHtml,
	taxFiscalDocumentBlockReason,
} from "../../documents/renderDocument.js";
import {
	buildTaxPaymentSnapshotForIssue,
	taxDocumentUsesPaymentSnapshot,
} from "../../documents/taxPaymentSnapshot.js";
import { buildKnd1151156Xml } from "../../documents/taxXml.js";
import { requireOrganizationId } from "../../security/identity.js";
import {
	repairMojibakeDeep,
	repairMojibakeText,
} from "../../text/repairMojibake.js";
import {
	apiError,
	buildDocumentAuditFacts,
	buildMedicalDocumentReleaseJournalEntry,
	configuredTaxOfficeCode,
	documentAttachmentFileName,
	documentCreateValidationMessageForRequest,
	documentHasIssuedArchiveMetadata,
	documentIssueChainBlockReason,
	documentIssueValidationMessage,
	documentRequiresIssuedArchive,
	documentVoidValidationMessage,
	findIssuedDuplicateTaxCertificate,
	frozenTaxXmlClinicProfile,
	frozenTaxXmlPatient,
	frozenTaxXmlPayments,
	issuedArchiveIntegrityError,
	renderIssuedHtmlToPdf,
	resolveDocumentRenderContext,
	taxSnapshotDocument,
	taxXmlSourceSnapshotForIssue,
	taxXmlSourceSnapshotSha256,
} from "./shared.js";

export async function register(app: FastifyInstance) {
	app.get<{ Params: { id: string }; Querystring: { download?: string } }>(
		"/api/documents/:id/html",
		async (request, reply) => {
			if (!(await requireClinicalReadAccess(request, reply, "document html")))
				return;
			const { id } = request.params as { id: string };
			// БЫЛО: при отсутствии/невалидности токена подставлялась строка "mock-org".
			// Все проверки принадлежности сравнивали подделку саму с собой и сходились,
			// а в uuid-колонку уходило "mock-org" → 500 на каждом маршруте документов.
			// Организация теперь берётся только из проверенного токена (401 иначе).
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const document = await getDocumentById(orgId, id);
			if (!document) {
				return reply.code(404).send(apiError("Документ не найден"));
			}

			const patient = await getPatientByIdFromDb(orgId, document.patientId);
			if (!patient) {
				return reply.code(404).send(apiError("Пациент не найден"));
			}

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
				return reply.type("text/html; charset=utf-8").send(issuedSnapshot);
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
				.send(renderDocumentHtml(document, patient, renderContext));
		},
	);
}
