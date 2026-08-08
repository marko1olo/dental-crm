import {
	issueDocumentSchema,
	publicGeneratedDocumentSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import {
	getDocumentById,
	issueGeneratedDocumentInDb,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { paymentRefundCorrectionSelectionErrorForDocument } from "../../documents/guards.js";
import { settleRefundedPaymentsForPatient } from "../../documents/refundSettlement.js";
import {
	documentIssueBlockReason,
	renderDocumentHtml,
} from "../../documents/renderDocument.js";
import {
	buildTaxPaymentSnapshotForIssue,
	taxDocumentUsesPaymentSnapshot,
} from "../../documents/taxPaymentSnapshot.js";
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
	buildMedicalDocumentReleaseJournalEntry,
	documentIssueChainBlockReason,
	documentIssueValidationMessage,
	findIssuedDuplicateTaxCertificate,
	resolveDocumentRenderContext,
	taxSnapshotDocument,
	taxXmlSourceSnapshotForIssue,
} from "./shared.js";

export async function register(app: FastifyInstance) {
	app.post("/api/documents/:id/issue", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(request, reply, "document issue"))
		)
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

		// Реальный контекст вместо пустой заглушки: без профиля клиники выдача
		// договоров и актов отклонялась как «профиль заполнен не полностью».
		const renderContext = {
			...(await resolveDocumentRenderContext(orgId, existing.patientId)),
			origin,
		};
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

		// Контроль суммарных возвратов именно в момент ВЫДАЧИ — здесь деньги реально
		// покидают кассу. Проверка при создании черновика недостаточна: между
		// созданием и выдачей мог быть выдан другой возврат по тому же чеку.
		if (issueCandidate.kind === "payment_refund_correction_request") {
			const [refundPayments, refundDocuments] = await Promise.all([
				import("../../db/billingQuery.js").then((m) =>
					m.getPaymentsByPatientIdInDb(orgId, existing.patientId),
				),
				import("../../db/documentQuery.js").then((m) =>
					m.getDocumentsByPatientId(orgId, existing.patientId),
				),
			]);
			const refundLimitError = paymentRefundCorrectionSelectionErrorForDocument(
				issueCandidate as unknown as Parameters<
					typeof paymentRefundCorrectionSelectionErrorForDocument
				>[0],
				refundPayments,
				refundDocuments,
				existing.id,
			);
			if (refundLimitError) {
				return reply.code(409).send(apiError(refundLimitError));
			}
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
		// БЫЛО: слой БД писал в issued_by_user_id литерал "doctor". Колонка —
		// uuid с внешним ключом на users.id, поэтому выдача документа не просто
		// указывала фиктивного подписанта, а падала в Postgres (22P02). Реальный
		// сотрудник берётся из подписанного staff-токена; если авторизованного
		// человека в запросе нет, пишем null — «подписант не установлен», а не
		// подставляем чужой идентификатор.
		const document = await issueGeneratedDocumentInDb(orgId, id, {
			issuedByUserId: getRequestIdentity(request).userId,
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

		// ВЫДАЧА ЗАЯВЛЕНИЯ НА ВОЗВРАТ — ЭТО МОМЕНТ, КОГДА ДЕНЬГИ ПОКИДАЮТ КАССУ.
		// БЫЛО: заявление выдавалось (HTTP 200), а payments.status оставался "paid",
		// поэтому выручка `sum(amount_rub) where status = 'paid'` считала
		// возвращённые пациенту деньги полученными. Полный разбор решения, включая
		// то, почему частичный возврат существующими столбцами не выражается, —
		// documents/refundSettlement.ts.
		if (document.kind === "payment_refund_correction_request") {
			const settlement = await settleRefundedPaymentsForPatient(
				orgId,
				document.patientId,
			);
			request.log.info(
				{
					documentId: document.id,
					refundedPaymentIds: settlement.refunded,
					partiallyRefundedPaymentIds: settlement.partiallyRefunded.map(
						(item) => item.paymentId,
					),
				},
				"возврат сведён с кассой при выдаче заявления",
			);
		}
		return reply.send(publicGeneratedDocumentSchema.parse(document));
	});
}
