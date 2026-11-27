import { createHash } from "node:crypto";
import {
	issueDocumentSchema,
	type TaxXmlSnapshot,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import {
	getDocumentById,
	getDocumentsByPatientId,
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
	taxDocumentDuplicateSensitive,
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
import {
	apiError,
	buildKnd1151156Xml,
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
	toPublicGeneratedDocument,
} from "./shared.js";

const documentIdParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

export async function register(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/documents/:id/issue",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (
				!(await requireClinicalMutationAccess(request, reply, "document issue"))
			)
				return reply;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return reply;
			const parsedParams = documentIdParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply
					.code(400)
					.send(
						apiError("Некорректный идентификатор документа (ожидается UUID)"),
					);
			}
			const { id } = parsedParams.data;

			const earlyParsedIssueInput = issueDocumentSchema.safeParse(request.body);
			if (!earlyParsedIssueInput.success) {
				return reply.code(400).send({
					error: "DocumentIssueValidationFailed",
					message: repairMojibakeText(documentIssueValidationMessage),
				});
			}

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole, {
				clinicalRole: identity.clinicalRole ?? null,
				canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
				specialties: identity.specialties ?? null,
			});

			const requestHost = request.headers.host ?? "127.0.0.1:4100";
			const requestProto =
				(request.headers["x-forwarded-proto"] as string) ?? "http";
			const origin = `${requestProto}://${requestHost}`;

			const prep = await withTenantReadCtx(orgId, async () => {
				const existing = await getDocumentById(orgId, id);
				if (!existing) {
					return { kind: "error" as const, status: 404, body: apiError("Документ не найден") };
				}

				if (
					clinicalDocKinds.has(existing.kind) &&
					!evalAccess.hasClinicalAccess &&
					!isReceptionistAllowedPrimaryDoc(existing.kind, staffRole)
				) {
					return {
						kind: "error" as const,
						status: 403,
						body: {
							error: "PermissionDenied",
							permission: "clinical.document.issue",
							role: staffRole,
							message:
								"Выдача клинических медицинских документов доступна только медицинскому персоналу (врачу или ассистенту).",
						},
					};
				}
				if (existing.status === "voided") {
					return {
						kind: "error" as const,
						status: 409,
						body: apiError("Аннулированный документ нельзя выдать."),
					};
				}
				if (existing.status === "issued") {
					return { kind: "error" as const, status: 409, body: apiError("Документ уже выдан.") };
				}

				const patient = await getPatientByIdFromDb(orgId, existing.patientId);
				if (!patient) {
					return { kind: "error" as const, status: 404, body: apiError("Пациент не найден") };
				}
				if (patient.status === "archived" && !evalAccess.hasClinicalAccess) {
					return {
						kind: "error" as const,
						status: 403,
						body: {
							error: "PermissionDenied",
							permission: "patients.archived.read",
							role: staffRole,
							message:
								"Отказ в доступе к документам архивированного пациента (152-ФЗ / 323-ФЗ ст. 13).",
						},
					};
				}

				const patientPayments =
					taxDocumentUsesPaymentSnapshot(existing.kind) ||
					taxDocumentDuplicateSensitive(existing.kind)
						? await getPaymentsByPatientIdInDb(orgId, existing.patientId)
						: [];
				const taxPaymentSnapshot = taxDocumentUsesPaymentSnapshot(existing.kind)
					? buildTaxPaymentSnapshotForIssue(
							existing,
							patientPayments,
							await getDocumentsByPatientId(orgId, existing.patientId),
						)
					: null;
				if (taxDocumentUsesPaymentSnapshot(existing.kind) && !taxPaymentSnapshot) {
					const duplicateTaxCertificate = await findIssuedDuplicateTaxCertificate(
						existing,
						patientPayments,
					);
					if (duplicateTaxCertificate) {
						return {
							kind: "error" as const,
							status: 409,
							body: apiError(
								"За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. Справка должна быть годовой; сначала аннулируйте или корректно оформите предыдущую справку.",
							),
						};
					}
					return {
						kind: "error" as const,
						status: 409,
						body: apiError(
							"Для налогового документа нет новых оплаченных фискальных чеков за выбранный год.",
						),
					};
				}

				const issueCandidate = taxSnapshotDocument(existing, taxPaymentSnapshot);
				const renderContext = {
					...(await resolveDocumentRenderContext(orgId, existing.patientId)),
					origin,
				};
				const chainBlockReason =
					await documentIssueChainBlockReason(issueCandidate);
				if (chainBlockReason) {
					return { kind: "error" as const, status: 409, body: apiError(chainBlockReason) };
				}
				const blockReason = documentIssueBlockReason(
					issueCandidate,
					patient,
					renderContext,
				);
				if (blockReason) {
					return { kind: "error" as const, status: 409, body: apiError(blockReason) };
				}

				if (issueCandidate.kind === "payment_refund_correction_request") {
					const [refundPayments, refundDocuments] = await Promise.all([
						getPaymentsByPatientIdInDb(orgId, existing.patientId),
						getDocumentsByPatientId(orgId, existing.patientId),
					]);
					const refundLimitError = paymentRefundCorrectionSelectionErrorForDocument(
						issueCandidate,
						refundPayments,
						refundDocuments,
						existing.id,
					);
					if (refundLimitError) {
						return { kind: "error" as const, status: 409, body: apiError(refundLimitError) };
					}
				}
				const duplicateTaxCertificate = await findIssuedDuplicateTaxCertificate(
					issueCandidate,
					patientPayments,
				);
				if (duplicateTaxCertificate) {
					return {
						kind: "error" as const,
						status: 409,
						body: apiError(
							"За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. Справка должна быть годовой; сначала аннулируйте или корректно оформите предыдущую справку.",
						),
					};
				}

				return {
					kind: "ok" as const,
					patient,
					taxPaymentSnapshot,
					issueCandidate,
					renderContext,
				};
			});

			if (prep.kind === "error") {
				return reply.code(prep.status).send(prep.body);
			}

			const { patient, taxPaymentSnapshot, issueCandidate, renderContext } = prep;
			const parsedIssueInput = earlyParsedIssueInput;

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

			const document = await withTenantWriteCtx(orgId, async (tx) => {
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

			return reply.send(toPublicGeneratedDocument(document));
		},
	});
}
