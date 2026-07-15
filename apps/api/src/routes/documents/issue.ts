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
	app.post("/api/documents/:id/issue", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(request, reply, "document issue"))
		)
			return;
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"document issue tenant",
		);
		if (!orgId) return;
		const { id } = request.params as { id: string };
		const existing = await getDocumentById(orgId, id);
		if (!existing) {
			return reply.code(404).send(apiError("Документ не найден"));
		}
		if (existing.status === "voided") {
			return reply
				.code(409)
				.send(apiError("Аннулированный документ нельзя выдать."));
		}
		if (existing.status === "issued") {
			return reply.code(409).send(apiError("Документ уже выдан."));
		}
		const patient = await getPatientByIdFromDb(orgId, existing.patientId);
		if (!patient) {
			return reply.code(404).send(apiError("Пациент не найден"));
		}
		const taxPaymentSnapshot = taxDocumentUsesPaymentSnapshot(existing.kind)
			? buildTaxPaymentSnapshotForIssue(
					existing,
					await import("../../db/billingQuery.js").then((m) =>
						m.getPaymentsByPatientIdInDb(orgId, existing.patientId),
					),
					await import("../../db/documentQuery.js").then((m) =>
						m.getDocumentsByPatientId(orgId, existing.patientId),
					),
				)
			: null;
		if (taxDocumentUsesPaymentSnapshot(existing.kind) && !taxPaymentSnapshot) {
			const duplicateTaxCertificate = await findIssuedDuplicateTaxCertificate(
				existing,
				[],
			);
			if (duplicateTaxCertificate) {
				return reply
					.code(409)
					.send(
						apiError(
							"За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. Справка должна быть годовой; сначала аннулируйте или корректно оформите предыдущую справку.",
						),
					);
			}
			return reply
				.code(409)
				.send(
					apiError(
						"Для налогового документа нет новых оплаченных фискальных чеков за выбранный год.",
					),
				);
		}

		const issueCandidate = taxSnapshotDocument(existing, taxPaymentSnapshot);
		const requestHost = request.headers.host ?? "127.0.0.1:4100";
		const requestProto =
			(request.headers["x-forwarded-proto"] as string) ?? "http";
		const origin = `${requestProto}://${requestHost}`;

		const renderContext = { ...documentRenderContext(), origin };
		const blockReason = documentIssueBlockReason(
			issueCandidate,
			patient,
			renderContext,
		);
		if (blockReason) {
			return reply.code(409).send(apiError(blockReason));
		}
		const chainBlockReason =
			await documentIssueChainBlockReason(issueCandidate);
		if (chainBlockReason) {
			return reply.code(409).send(apiError(chainBlockReason));
		}
		const duplicateTaxCertificate = await findIssuedDuplicateTaxCertificate(
			issueCandidate,
			[],
		);
		if (duplicateTaxCertificate) {
			return reply
				.code(409)
				.send(
					apiError(
						"За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. Справка должна быть годовой; сначала аннулируйте или корректно оформите предыдущую справку.",
					),
				);
		}

		const parsedIssueInput = issueDocumentSchema.safeParse(request.body);
		if (!parsedIssueInput.success) {
			return reply.code(400).send({
				error: "DocumentIssueValidationFailed",
				message: repairMojibakeText(documentIssueValidationMessage),
			});
		}

		const signatureAttestation = repairMojibakeDeep(
			parsedIssueInput.data.signatureAttestation,
		);
		const issuedAt = new Date().toISOString();
		const releaseJournalEntry = await buildMedicalDocumentReleaseJournalEntry(
			issueCandidate,
			issuedAt,
			signatureAttestation,
		);
		const taxXmlSourceSnapshot = taxXmlSourceSnapshotForIssue(
			issueCandidate,
			patient,
			taxPaymentSnapshot,
			issuedAt,
		);
		const issuedDocumentCandidate = {
			...issueCandidate,
			status: "issued" as const,
			issuedAt,
			signatureAttestation,
			releaseJournalEntry,
			taxXmlSourceSnapshot,
		};
		const issuedHtml = renderDocumentHtml(
			issuedDocumentCandidate,
			patient,
			renderContext,
		);
		const document = await issueGeneratedDocumentInDb(orgId, id, {
			issuedAt,
			releaseJournalEntry,
			snapshotHtml: issuedHtml,
			signatureAttestation,
			taxPaymentSnapshot,
			taxXmlSourceSnapshot,
			totalAmountRub: issueCandidate.totalAmountRub,
		});
		if (!document) {
			return reply
				.code(409)
				.send(apiError("Статус документа нельзя изменить."));
		}
		return reply.send(publicGeneratedDocumentSchema.parse(document));
	});
}
