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
import { getTreatmentPlanItemsForPatient } from "../../db/clinicalQuery.js";
import {
	createGeneratedDocumentInDb,
	readIssuedDocumentSnapshot,
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
	app.post("/api/documents", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(request, reply, "document create"))
		)
			return;
		const parsedInput = createDocumentSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "DocumentValidationFailed",
				message: repairMojibakeText(
					documentCreateValidationMessageForRequest(request.body),
				),
			});
		}
		const input = repairMojibakeDeep(parsedInput.data);
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"document create tenant",
		);
		if (!orgId) return;

		const patient = await getPatientByIdFromDb(orgId, input.patientId);
		const visit = input.visitId
			? await getVisitByIdInDb(orgId, input.visitId)
			: null;
		const patientPayments = await getPaymentsByPatientIdInDb(
			orgId,
			input.patientId,
		);
		const patientPlanItems = await getTreatmentPlanItemsForPatient(
			orgId,
			input.patientId,
		);

		const validation = validateDocumentCreation(input, {
			patient: patient ?? null,
			visit,
			paidAmountRub: paidAmountRubForDocument(
				input.kind,
				input,
				patientPayments,
			),
			plannedAmountRub: plannedAmountRubForDocument(
				input.kind,
				input,
				patientPlanItems.map((item) => ({
					...item,
					quantity: Number(item.quantity),
				})),
			),
			taxPaymentSelectionError: taxPaymentSelectionErrorForDocument(
				input,
				patientPayments,
			),
			paymentReceiptSelectionError: paymentReceiptSelectionErrorForDocument(
				input,
				patientPayments,
			),
			paymentRefundCorrectionSelectionError:
				paymentRefundCorrectionSelectionErrorForDocument(
					input,
					patientPayments,
				),
		});
		if (!validation.ok) {
			return reply.code(validation.statusCode).send(apiError(validation.error));
		}

		const document = await createGeneratedDocumentInDb(orgId, validation.input);
		return reply.code(201).send(publicGeneratedDocumentSchema.parse(document));
	});
}
