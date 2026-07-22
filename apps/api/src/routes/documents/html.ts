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
	requireResolvedOrganizationId,
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
	renderDocumentHtml,
	taxFiscalDocumentBlockReason,
} from "../../documents/renderDocument.js";
import {
	buildTaxPaymentSnapshotForIssue,
	taxDocumentUsesPaymentSnapshot,
} from "../../documents/taxPaymentSnapshot.js";
import { buildKnd1151156Xml } from "../../documents/taxXml.js";
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
	documentIssueBlockReason,
	documentIssueChainBlockReason,
	documentIssueValidationMessage,
	documentRenderContext,
	documentRequiresIssuedArchive,
	documentVoidValidationMessage,
	findIssuedDuplicateTaxCertificate,
	frozenTaxXmlClinicProfile,
	frozenTaxXmlPatient,
	frozenTaxXmlPayments,
	issuedArchiveIntegrityError,
	renderIssuedHtmlToPdf,
	taxSnapshotDocument,
	taxXmlSourceSnapshotForIssue,
	taxXmlSourceSnapshotSha256,
} from "../documents.js";

export async function register(app: FastifyInstance) {
	app.get<{ Params: { id: string }; Querystring: { download?: string } }>(
		"/api/documents/:id/html",
		async (request, reply) => {
			if (!(await requireClinicalReadAccess(request, reply, "document html")))
				return;
			const { id } = request.params as { id: string };
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"document html tenant",
			);
			if (!orgId) return;
			const document = await getDocumentById(orgId, id);
			if (!document) {
				return reply.code(404).send(apiError("Документ не найден"));
			}

			const patient = await getPatientByIdFromDb(orgId, document.patientId);
			if (!patient) {
				return reply.code(404).send(apiError("Пациент не найден"));
			}

			const issuedSnapshot = await readIssuedDocumentSnapshot(document);
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

			const renderContext = { ...documentRenderContext(), origin };
			const blockReason =
				documentIssueBlockReason(document, patient, renderContext) ??
				documentIssueChainBlockReason(document);
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
