import {
	type DocumentKind,
	documentKindMetadata,
	documentKindSchema,
	publicGeneratedDocumentSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getDocumentById } from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { generatedDocuments, patients } from "../../db/schema.js";
import {
	getRequestIdentity,
	requireOrganizationId,
} from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { apiError } from "./shared.js";

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

export async function registerQuery(app: FastifyInstance) {
	// 1. GET /api/documents — список документов с защитой врачебной тайны (152-ФЗ / 323-ФЗ)
	app.get("/api/documents", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const query = request.query as {
			patientId?: string;
			kind?: string;
			limit?: string;
			offset?: string;
		};

		const identity = getRequestIdentity(request);
		const access = evaluateClinicalAccess(identity.role);

		// Если запрашивается конкретный вид медицинского документа неклиническим персоналом — отказ 403
		if (query.kind && clinicalDocKinds.has(query.kind) && !access.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.document.read",
				role: identity.role,
				message:
					"Доступ к медицинским документам ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
			});
		}

		// Если указан patientId, проверяем архивный статус пациента
		if (query.patientId) {
			const patient = await getPatientByIdFromDb(orgId, query.patientId);
			if (patient?.status === "archived" && !access.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.read",
					role: identity.role,
					message:
						"Отказ в доступе к документам архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): извлечение данных списанного в архив пациента неклиническим персоналом запрещено.",
				});
			}
		}

		const conditions = [eq(generatedDocuments.organizationId, orgId)];
		if (query.patientId) {
			conditions.push(eq(generatedDocuments.patientId, query.patientId));
		}
		if (query.kind) {
			conditions.push(eq(generatedDocuments.kind, query.kind as DocumentKind));
		}

		const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
		const offset = Math.max(Number(query.offset) || 0, 0);

		const records = await db
			.select()
			.from(generatedDocuments)
			.where(and(...conditions))
			.orderBy(desc(generatedDocuments.createdAt))
			.limit(limit)
			.offset(offset);

		// 152-ФЗ / 323-ФЗ: фильтрация клинических документов от неклинических глаз
		const filteredRecords = records.filter((doc) => {
			if (clinicalDocKinds.has(doc.kind) && !access.hasClinicalAccess) {
				return false; // Неклинические сотрудники не видят клинические документы в общем списке
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
				createdAt: record.createdAt.toISOString(),
			}),
		);

		return reply.send({
			success: true,
			documents: publicDocs,
			total: publicDocs.length,
		});
	});

	// 2. GET /api/documents/:id — получение документа по идентификатору
	app.get<{ Params: { id: string } }>("/api/documents/:id", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params;
		const UUID_REGEX =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!UUID_REGEX.test(id)) {
			return reply
				.code(400)
				.send(apiError("Некорректный идентификатор документа (ожидается UUID)"));
		}

		const document = await getDocumentById(orgId, id);
		if (!document) {
			return reply.code(404).send(apiError("Документ не найден"));
		}

		const identity = getRequestIdentity(request);
		const access = evaluateClinicalAccess(identity.role);

		// 152-ФЗ / 323-ФЗ ст. 13: врачебная тайна в медицинских документах
		if (clinicalDocKinds.has(document.kind) && !access.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.document.read",
				role: identity.role,
				message:
					"Доступ к медицинской тайне в документе ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
			});
		}

		// Защита архивированного пациента
		const patient = await getPatientByIdFromDb(orgId, document.patientId);
		if (patient?.status === "archived" && !access.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "patients.archived.read",
				role: identity.role,
				message:
					"Отказ в доступе к документам архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): извлечение данных списанного в архив пациента неклиническим персоналом запрещено.",
			});
		}

		// Аудит доступа к медицинскому документу
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
			document: publicGeneratedDocumentSchema.parse(document),
		});
	});

	// 3. GET /api/documents/templates — список шаблонов документов
	app.get("/api/documents/templates", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const access = evaluateClinicalAccess(identity.role);

		const allKinds = documentKindSchema.options;
		const templates = allKinds
			.filter((kind) => {
				// Если неклинический сотрудник, исключаем клинические шаблоны с мед. протоколами
				if (clinicalDocKinds.has(kind) && !access.hasClinicalAccess) {
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
						(meta as unknown as { group?: string })?.group ??
						(clinicalDocKinds.has(kind) ? "clinical" : "general"),
				};
			});

		return reply.send({
			success: true,
			templates,
			total: templates.length,
		});
	});

	// 4. GET /api/documents/templates/:kind — получение шаблона по типу
	app.get<{ Params: { kind: string } }>(
		"/api/documents/templates/:kind",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { kind } = request.params;
			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role);

			if (clinicalDocKinds.has(kind) && !access.hasClinicalAccess) {
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
	);
}
