import {
	createDocumentSchema,
	issueDocumentSchema,
	publicGeneratedDocumentSchema,
	voidDocumentSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";
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
	buildTaxPaymentSnapshotForIssue,
	taxDocumentUsesPaymentSnapshot,
} from "../../documents/taxPaymentSnapshot.js";
import { buildKnd1151156Xml } from "../../documents/taxXml.js";
import { requireOrganizationId } from "../../security/identity.js";
import { repairMojibakeText } from "../../text/repairMojibake.js";
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
	taxSnapshotDocument,
	taxXmlSourceSnapshotForIssue,
	taxXmlSourceSnapshotSha256,
} from "./shared.js";

export async function register(app: FastifyInstance) {
	app.get("/api/documents/:id/audit-facts", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(request, reply, "document audit facts"))
		)
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

		return reply.send(buildDocumentAuditFacts(document, patient));
	});
}
