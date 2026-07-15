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
	requireResolvedStaffOrAdminOrganizationId,
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
	app.post("/api/documents/:id/void", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "document void")))
			return;
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"document void tenant",
		);
		if (!orgId) return;
		const { id } = request.params as { id: string };
		const existing = await getDocumentById(orgId, id);
		if (!existing) {
			return reply.code(404).send(apiError("Документ не найден"));
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
		if (correctionDocumentId) {
			const correctionDocument = await getDocumentById(
				orgId,
				correctionDocumentId,
			);
			if (
				!correctionDocument ||
				correctionDocument.organizationId !== existing.organizationId ||
				correctionDocument.patientId !== existing.patientId ||
				correctionDocument.status === "voided"
			) {
				return reply
					.code(409)
					.send(
						apiError(
							"Исправляющий документ должен существовать у того же пациента, той же клиники и не быть аннулированным.",
						),
					);
			}
		}

		const voidedAt = new Date().toISOString();
		const document = await voidGeneratedDocumentInDb(orgId, id, {
			voidedAt,
			voidAttestation: {
				...voidAttestationInput,
				voidedAt,
			},
		});
		if (!document) {
			return reply
				.code(409)
				.send(apiError("Статус документа нельзя изменить."));
		}
		return reply.send(publicGeneratedDocumentSchema.parse(document));
	});
}
