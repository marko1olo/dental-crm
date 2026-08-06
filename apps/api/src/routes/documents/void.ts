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
import { settleRefundedPaymentsForPatient } from "../../documents/refundSettlement.js";
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
	getRequestIdentity,
	requireOrganizationId,
} from "../../security/identity.js";
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
		// БЫЛО: при отсутствии/невалидности токена подставлялась строка "mock-org".
		// Все проверки принадлежности сравнивали подделку саму с собой и сходились,
		// а в uuid-колонку уходило "mock-org" → 500 на каждом маршруте документов.
		// Организация теперь берётся только из проверенного токена (401 иначе).
		const orgId = requireOrganizationId(request, reply);
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
		// БЫЛО: аннулировать можно было документ в ЛЮБОМ статусе, включая уже
		// аннулированный. Повторное аннулирование перезаписывало причину в
		// voidAttestation — исходное основание, на которое ссылается «Паспорт
		// документа», терялось безвозвратно.
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
			const correctionDocument = await getDocumentById(
				orgId,
				correctionDocumentId,
			);
			// БЫЛО: проверялось лишь `status === "voided"`, поэтому исправляющим
			// документом принимался ЧЕРНОВИК. Аннулирование ссылалось на документ,
			// который юридически ещё не существует. Во всех остальных звеньях цепочки
			// (documents.ts) требуется именно статус "issued".
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
		// БЫЛО: слой БД писал в voided_by_user_id литерал "doctor" — та же
		// uuid-колонка с внешним ключом на users.id, что и у выдачи, и тот же
		// отказ Postgres 22P02. Аннулирование — юридическое действие, поэтому
		// сотрудник берётся из подписанного staff-токена, а при его отсутствии
		// остаётся null вместо выдуманного подписанта.
		const document = await voidGeneratedDocumentInDb(orgId, id, {
			voidedByUserId: getRequestIdentity(request).userId,
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

		// ОБРАТНЫЙ ХОД ТОГО ЖЕ ШВА. Учёт возвратов ведётся только по ВЫДАННЫМ
		// заявлениям (documents/guards.ts: alreadyRefundedKopecksForPayment), поэтому
		// аннулирование заявления обнуляет учтённый возврат по чеку. Без этого вызова
		// платёж навсегда остался бы "refunded" при нулевом учтённом возврате: деньги
		// пропали бы из выручки без действующего основания, а новый возврат по тому же
		// чеку упирался бы в отказ «уже выполнен полный возврат средств».
		if (document.kind === "payment_refund_correction_request") {
			const settlement = await settleRefundedPaymentsForPatient(
				orgId,
				document.patientId,
			);
			request.log.info(
				{ documentId: document.id, restoredPaymentIds: settlement.restored },
				"аннулирование заявления на возврат сведено с кассой",
			);
		}
		return reply.send(publicGeneratedDocumentSchema.parse(document));
	});
}
