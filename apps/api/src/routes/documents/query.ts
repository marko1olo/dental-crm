import {
	type DocumentKind,
	documentKindMetadata,
	documentKindSchema,
	publicGeneratedDocumentSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { getDocumentById } from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { generatedDocuments } from "../../db/schema.js";
import {
	getRequestIdentity,
	requireOrganizationId,
} from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { extractPortalPatient } from "../portal/portalAuthStore.js";
import { apiError, toPublicGeneratedDocument } from "./shared.js";

const documentListQuerySchema = z
	.object({
		patientId: z.string().uuid().optional(),
		kind: documentKindSchema.optional(),
		limit: z.coerce.number().int().min(1).max(200).optional(),
		offset: z.coerce.number().int().min(0).optional(),
	})
	.strict();

const documentIdParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

const documentTemplateKindParamsSchema = z
	.object({
		kind: z.string().trim().min(1).max(120),
	})
	.strict();

export const clinicalDocKinds = new Set<string>([
	"dental_medical_card_043u",
	"orthodontic_medical_card_043_1u",
	"outpatient_medical_card_025u",
	"daily_dentist_diary_037u",
	"summary_dentist_statement_039u",
	"medical_record_extract",
	"treatment_plan",
	"treatment_plan_acceptance",
	"informed_consent",
	"procedure_specific_consent_packet",
	"anesthesia_consent_log",
	"prescription_medication_order",
	"medical_intervention_refusal",
	"radiation_dose_sheet",
	"xray_cbct_referral",
	"lab_work_order",
	"patient_intake_questionnaire",
	"post_visit_recommendations",
]);

/**
 * Проверяет, разрешен ли документ для администраторов / регистраторов на ресепшене.
 * Первичные документы, договоры, ИДС, анкеты, согласия, акты и справки выдаются пациенту
 * в зоне ресепшена до, во время или после приёма без бюрократических 403-блокировок.
 */
export function isReceptionistAllowedPrimaryDoc(
	kind: string | null | undefined,
	role: string | null | undefined,
): boolean {
	if (!kind) return false;
	const isAllowedFrontDeskDoc =
		kind === "informed_consent" ||
		kind === "procedure_specific_consent_packet" ||
		kind === "anesthesia_consent_log" ||
		kind === "patient_intake_questionnaire" ||
		kind === "paid_medical_services_contract" ||
		kind === "treatment_plan" ||
		kind === "treatment_plan_acceptance" ||
		kind === "completed_works_act" ||
		kind === "post_visit_recommendations" ||
		kind === "medical_intervention_refusal" ||
		kind === "tax_deduction_certificate" ||
		kind === "legacy_tax_deduction_certificate" ||
		kind === "tax_deduction_application" ||
		kind === "personal_data_processing_consent" ||
		kind === "photo_video_consent" ||
		kind === "warranty_service_memo" ||
		kind === "minor_legal_representative_consent" ||
		kind === "visit_attendance_certificate" ||
		kind === "treatment_cost_estimate" ||
		kind === "payment_invoice" ||
		kind === "payment_receipt" ||
		kind === "installment_payment_schedule" ||
		kind === "medical_record_copy_request" ||
		kind === "medical_document_release_receipt";
	if (!isAllowedFrontDeskDoc) return false;
	if (!role) return true;
	const normalizedRole = role.trim().toLowerCase();
	return normalizedRole !== "marketer" && normalizedRole !== "marketing";
}

export async function registerQuery(app: FastifyInstance) {
	// 1. GET /api/documents — список документов с защитой врачебной тайны (152-ФЗ / 323-ФЗ)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/documents",
		permission: "public",
		handler: async ({ request, reply }) => {
			const portalPatient = await extractPortalPatient(request);
			if (!portalPatient) {
				if (!(await requireClinicalReadAccess(request, reply, "documents list"))) {
					return reply;
				}
			}

			const orgId = portalPatient
				? portalPatient.organizationId
				: requireOrganizationId(request, reply);
			if (!orgId) return reply;

			const queryParsed = documentListQuerySchema.safeParse(request.query ?? {});
			if (!queryParsed.success) {
				return reply
					.code(400)
					.send(apiError("Некорректные параметры запроса списка документов"));
			}
			const query = queryParsed.data;

			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role, {
				clinicalRole: identity.clinicalRole ?? null,
				canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
				specialties: identity.specialties ?? null,
			});

			const effectivePatientId = portalPatient ? portalPatient.patientId : query.patientId;

			if (
				!portalPatient &&
				query.kind &&
				clinicalDocKinds.has(query.kind) &&
				!access.hasClinicalAccess &&
				!isReceptionistAllowedPrimaryDoc(query.kind, identity.role)
			) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.document.read",
					role: identity.role,
					message:
						"Доступ к медицинским документам ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
				});
			}

			const conditions = [eq(generatedDocuments.organizationId, orgId)];
			if (effectivePatientId) {
				conditions.push(eq(generatedDocuments.patientId, effectivePatientId));
			}
			if (query.kind) {
				conditions.push(eq(generatedDocuments.kind, query.kind as DocumentKind));
			}

			const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
			const offset = Math.max(Number(query.offset) || 0, 0);

			const listOutcome = await withTenantReadCtx(orgId, async (tx) => {
				if (effectivePatientId && !portalPatient) {
					const patient = await getPatientByIdFromDb(orgId, effectivePatientId);
					if (patient?.status === "archived" && !access.hasClinicalAccess) {
						return { archivedForbidden: true as const };
					}
				}
				const records = await tx
					.select()
					.from(generatedDocuments)
					.where(and(...conditions))
					.orderBy(desc(generatedDocuments.createdAt))
					.limit(limit)
					.offset(offset);
				return { archivedForbidden: false as const, records };
			});

			if (listOutcome.archivedForbidden) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.read",
					role: identity.role,
					message:
						"Отказ в доступе к документам архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): извлечение данных списанного в архив пациента неклиническим персоналом запрещено.",
				});
			}

			const filteredRecords = listOutcome.records.filter((doc) => {
				if (portalPatient) return true;
				if (
					clinicalDocKinds.has(doc.kind) &&
					!access.hasClinicalAccess &&
					!isReceptionistAllowedPrimaryDoc(doc.kind, identity.role)
				) {
					return false;
				}
				return true;
			});

			const publicDocs = filteredRecords.map((record) =>
				publicGeneratedDocumentSchema.parse({
					id: record.id,
					organizationId: record.organizationId,
					patientId: record.patientId,
					visitId: record.visitId,
					kind: record.kind,
					status: record.status,
					title: record.title,
					totalAmountRub: record.totalAmountRub,
					taxYear: record.taxYear,
					taxPayerInn: record.taxPayerInn,
					signatureAttestation: record.signatureAttestation,
					voidAttestation: record.voidAttestation,
					releaseJournalEntry: record.releaseJournalEntry,
					issuedAt: record.issuedAt?.toISOString() ?? null,
					issuedSnapshotSha256: record.issuedSnapshotSha256,
					issuedSnapshotCreatedAt:
						record.issuedSnapshotCreatedAt?.toISOString() ?? null,
					issuedByUserId: record.issuedByUserId,
					voidedAt: record.voidedAt?.toISOString() ?? null,
					voidedByUserId: record.voidedByUserId,
					cryptoSignaturePkcs7: record.cryptoSignaturePkcs7 ?? null,
					doctorSignaturePkcs7: record.doctorSignaturePkcs7 ?? null,
					doctorCertSerial: record.doctorCertSerial ?? null,
					doctorCertSubject: record.doctorCertSubject ?? null,
					doctorSignedAt: record.doctorSignedAt?.toISOString() ?? null,
				}),
			);

			return reply.send({
				success: true,
				documents: publicDocs,
				total: publicDocs.length,
			});
		},
	});

	// 2. GET /api/documents/:id — получение документа по идентификатору
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/documents/:id",
		permission: "public",
		handler: async ({ request, reply }) => {
			const portalPatient = await extractPortalPatient(request);
			if (!portalPatient) {
				if (!(await requireClinicalReadAccess(request, reply, "document read"))) {
					return reply;
				}
			}

			const orgId = portalPatient
				? portalPatient.organizationId
				: requireOrganizationId(request, reply);
			if (!orgId) return reply;

			const paramsParsed = documentIdParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply
					.code(400)
					.send(apiError("Некорректный идентификатор документа (ожидается UUID)"));
			}
			const { id } = paramsParsed.data;

			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role, {
				clinicalRole: identity.clinicalRole ?? null,
				canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
				specialties: identity.specialties ?? null,
			});

			const readOutcome = await withTenantReadCtx(orgId, async () => {
				const document = await getDocumentById(orgId, id);
				if (!document) {
					return { status: 404 as const, body: apiError("Документ не найден") };
				}

				if (portalPatient) {
					if (document.patientId !== portalPatient.patientId) {
						return {
							status: 403 as const,
							body: apiError("Доступ к документам другого пациента запрещен (152-ФЗ / BOLA)"),
						};
					}
				} else {
					if (
						clinicalDocKinds.has(document.kind) &&
						!access.hasClinicalAccess &&
						!isReceptionistAllowedPrimaryDoc(document.kind, identity.role)
					) {
						return {
							status: 403 as const,
							body: {
								error: "PermissionDenied",
								permission: "clinical.document.read",
								role: identity.role,
								message:
									"Доступ к медицинской тайне в документе ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
							},
						};
					}

					const patient = await getPatientByIdFromDb(orgId, document.patientId);
					if (patient?.status === "archived" && !access.hasClinicalAccess) {
						return {
							status: 403 as const,
							body: {
								error: "PermissionDenied",
								permission: "patients.archived.read",
								role: identity.role,
								message:
									"Отказ в доступе к документам архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): извлечение данных списанного в архив пациента неклиническим персоналом запрещено.",
							},
						};
					}
				}

				return { status: 200 as const, document };
			});

			if (readOutcome.status !== 200) {
				return reply.code(readOutcome.status).send(readOutcome.body);
			}

			const { document } = readOutcome;

			// Аудит доступа к медицинскому документу (вне READ ONLY TX)
			if (clinicalDocKinds.has(document.kind)) {
				await auditMedicalAccessFromRequest(request, {
					organizationId: orgId,
					patientId: document.patientId,
					action: "READ_CLINICAL_DOCUMENT",
					diagnosis: document.title,
				});
			}

			return reply.send({
				success: true,
				document: toPublicGeneratedDocument(document),
			});
		},
	});

	// 3. GET /api/documents/templates — список шаблонов документов
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/documents/templates",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalReadAccess(request, reply, "document templates list"))) {
				return reply;
			}
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return reply;

			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role, {
				clinicalRole: identity.clinicalRole ?? null,
				canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
				specialties: identity.specialties ?? null,
			});

			const allKinds = documentKindSchema.options;
			const templates = allKinds
				.filter((kind) => {
					if (
						clinicalDocKinds.has(kind) &&
						!access.hasClinicalAccess &&
						!isReceptionistAllowedPrimaryDoc(kind, identity.role)
					) {
						return false;
					}
					return true;
				})
				.map((kind) => {
					const meta = documentKindMetadata[kind as DocumentKind];
					return {
						kind,
						label: meta?.label ?? kind,
						isClinical: clinicalDocKinds.has(kind),
						group:
							meta?.group ??
							(clinicalDocKinds.has(kind) ? "clinical" : "general"),
					};
				});

			return reply.send({
				success: true,
				templates,
				total: templates.length,
			});
		},
	});

	// 4. GET /api/documents/templates/:kind — получение шаблона по типу
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/documents/templates/:kind",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalReadAccess(request, reply, "document template read"))) {
				return reply;
			}
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return reply;

			const paramsParsed = documentTemplateKindParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(404).send(apiError("Шаблон документа не найден"));
			}
			const { kind } = paramsParsed.data;
			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role, {
				clinicalRole: identity.clinicalRole ?? null,
				canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
				specialties: identity.specialties ?? null,
			});

			if (
				clinicalDocKinds.has(kind) &&
				!access.hasClinicalAccess &&
				!isReceptionistAllowedPrimaryDoc(kind, identity.role)
			) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.document.template.read",
					role: identity.role,
					message:
						"Доступ к медицинскому клиническому шаблону ограничен 152-ФЗ и 323-ФЗ ст. 13.",
				});
			}

			const parsedKind = documentKindSchema.safeParse(kind);
			if (!parsedKind.success) {
				return reply.code(404).send(apiError("Шаблон документа не найден"));
			}

			const meta = documentKindMetadata[parsedKind.data];
			return reply.send({
				success: true,
				template: {
					kind: parsedKind.data,
					label: meta?.label ?? parsedKind.data,
					isClinical: clinicalDocKinds.has(parsedKind.data),
					metadata: meta,
				},
			});
		},
	});
}
