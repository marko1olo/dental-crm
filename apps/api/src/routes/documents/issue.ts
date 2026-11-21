import { createHash } from "node:crypto";
import {
	issueDocumentSchema,
	publicGeneratedDocumentSchema,
	type TaxXmlSnapshot,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	getDocumentById,
	issueGeneratedDocumentInDb,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { paymentRefundCorrectionSelectionErrorForDocument } from "../../documents/guards.js";
import { settleRefundedPaymentsForPatient } from "../../documents/refundSettlement.js";
import { syncDocumentToPatientConsent } from "../consents/queries.js";
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
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { clinicalDocKinds, isReceptionistAllowedPrimaryDoc } from "./query.js";
import {
	repairMojibakeDeep,
	repairMojibakeText,
} from "../../text/repairMojibake.js";
import { buildKnd1151156Xml } from "../../documents/taxXml.js";
import {
	apiError,
	buildMedicalDocumentReleaseJournalEntry,
	configuredTaxOfficeCode,
	documentIssueChainBlockReason,
	documentIssueValidationMessage,
	findIssuedDuplicateTaxCertificate,
	frozenTaxXmlClinicProfile,
	frozenTaxXmlPatient,
	frozenTaxXmlPayments,
	resolveDocumentRenderContext,
	taxSnapshotDocument,
	taxXmlSourceSnapshotForIssue,
	taxXmlSourceSnapshotSha256,
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
		const UUID_REGEX =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!id || !UUID_REGEX.test(id)) {
			return reply
				.code(400)
				.send(
					apiError("Некорректный идентификатор документа (ожидается UUID)"),
				);
		}
		const existing = await getDocumentById(orgId, id);
		if (!existing) {
			return reply.code(404).send(apiError("Документ не найден"));
		}

		// Выдача клинических медицинских документов разрешена только клиническому персоналу
		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (
			clinicalDocKinds.has(existing.kind) &&
			!evalAccess.hasClinicalAccess &&
			!isReceptionistAllowedPrimaryDoc(existing.kind, staffRole)
		) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.document.issue",
				role: staffRole,
				message:
					"Выдача клинических медицинских документов доступна только медицинскому персоналу (врачу или ассистенту).",
			});
		}
		if (existing.status === "voided") {
			return reply
				.code(409)
				.send(apiError("Аннулированный документ нельзя выдать."));
		}
		if (existing.status === "issued") {
			return reply.code(409).send(apiError("Документ уже выдан."));
		}
		const earlyParsedIssueInput = issueDocumentSchema.safeParse(request.body);
		if (!earlyParsedIssueInput.success) {
			return reply.code(400).send({
				error: "DocumentIssueValidationFailed",
				message: repairMojibakeText(documentIssueValidationMessage),
			});
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
		const chainBlockReason =
			await documentIssueChainBlockReason(issueCandidate);
		if (chainBlockReason) {
			return reply.code(409).send(apiError(chainBlockReason));
		}
		const blockReason = documentIssueBlockReason(
			issueCandidate,
			patient,
			renderContext,
		);
		if (blockReason) {
			return reply.code(409).send(apiError(blockReason));
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
				issueCandidate,
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
			renderContext?.clinicProfile,
		);
		let taxXmlSnapshot: TaxXmlSnapshot | null = null;
		if (issueCandidate.kind === "tax_deduction_certificate" && taxXmlSourceSnapshot) {
			const taxOfficeCode = configuredTaxOfficeCode();
			const xmlPatient = frozenTaxXmlPatient(issueCandidate, patient);
			const xmlClinicProfile = frozenTaxXmlClinicProfile(
				issueCandidate,
				renderContext?.clinicProfile ?? taxXmlSourceSnapshot.clinicProfile,
			);
			const xmlPayments = frozenTaxXmlPayments(
				issueCandidate,
				renderContext?.payments ?? [],
			);
			const xmlResult = buildKnd1151156Xml(issueCandidate, xmlPatient, {
				clinicProfile: xmlClinicProfile,
				payments: xmlPayments,
				taxOfficeCode,
			});
			if (xmlResult.ok) {
				const xmlSourceSha256 = taxXmlSourceSnapshotSha256(taxXmlSourceSnapshot);
				taxXmlSnapshot = {
					fileName: xmlResult.fileName,
					xml: xmlResult.xml,
					taxOfficeCode: (taxOfficeCode ?? "").replace(/\D+/g, ""),
					sourceSnapshotSha256: xmlSourceSha256 ?? "",
					createdAt: issuedAt,
					sha256: createHash("sha256").update(xmlResult.xml).digest("hex"),
				};
			}
		}

		const issuedDocumentCandidate = {
			...issueCandidate,
			status: "issued" as const,
			issuedAt,
			signatureAttestation,
			releaseJournalEntry,
			taxXmlSourceSnapshot,
			taxXmlSnapshot,
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
		// Неделимая ACID транзакция (Мандат 8bo): атомарная выдача документа,
		// погашение возвратов и синхронизация выданных медицинских согласий.
		const document = await db.transaction(async (tx) => {
			const issuedDoc = await issueGeneratedDocumentInDb(orgId, id, {
				issuedByUserId: getRequestIdentity(request).userId,
				issuedAt,
				releaseJournalEntry,
				snapshotHtml: issuedHtml,
				signatureAttestation,
				signatureSvg: parsedIssueInput.data.signatureSvg ?? null,
				taxPaymentSnapshot,
				taxXmlSourceSnapshot,
				taxXmlSnapshot,
				totalAmountRub: issueCandidate.totalAmountRub,
				tx,
			});
			if (!issuedDoc) {
				return null;
			}

			// ВЫДАЧА ЗАЯВЛЕНИЯ НА ВОЗВРАТ — ЭТО МОМЕНТ, КОГДА ДЕНЬГИ ПОКИДАЮТ КАССУ.
			if (issuedDoc.kind === "payment_refund_correction_request") {
				const settlement = await settleRefundedPaymentsForPatient(
					orgId,
					issuedDoc.patientId,
					tx,
				);
				request.log.info(
					{
						documentId: issuedDoc.id,
						refundedPaymentIds: settlement.refunded,
						partiallyRefundedPaymentIds: settlement.partiallyRefunded.map(
							(item) => item.paymentId,
						),
					},
					"возврат сведён с кассой при выдаче заявления",
				);
			}

			// Синхронизация выданных медицинских согласий в таблицу patient_consents (Мандат 8e и 8n)
			const consentKinds = new Set([
				"informed_consent",
				"procedure_specific_consent_packet",
				"anesthesia_consent_log",
				"personal_data_processing_consent",
				"minor_legal_representative_consent",
				"photo_video_consent",
				"medical_intervention_refusal",
			]);
			if (consentKinds.has(issuedDoc.kind)) {
				await syncDocumentToPatientConsent(
					orgId,
					issuedDoc.patientId,
					issuedDoc.kind,
					issuedDoc.id,
					new Date(issuedAt),
					tx,
				);
			}

			return issuedDoc;
		});

		if (!document) {
			return reply
				.code(409)
				.send(apiError("Статус документа нельзя изменить."));
		}

		return reply.send(publicGeneratedDocumentSchema.parse(document));
	});
}
