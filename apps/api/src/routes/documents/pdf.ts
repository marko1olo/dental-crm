import { formatDateKeyInTimeZone, resolveValidIanaTimeZone } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	getDocumentById,
	readIssuedDocumentSnapshot,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { renderDocumentHtml } from "../../documents/renderDocument.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { clinicTimeZone } from "../../services/reports/managerReports/timezone.js";
import { extractPortalPatient } from "../portal/portalAuthStore.js";
import { clinicalDocKinds, isReceptionistAllowedPrimaryDoc } from "./query.js";
import {
	apiError,
	applySignatureStampIfSigned,
	documentAttachmentFileName,
	documentHasIssuedArchiveMetadata,
	issuedArchiveIntegrityError,
	renderIssuedHtmlToPdf,
	resolveDocumentRenderContext,
} from "./shared.js";

const documentPdfParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

export function buildPdfContentDispositionHeader(
	utf8Filename: string,
	asciiFallbackFilename: string,
): string {
	const safeAscii = asciiFallbackFilename.replace(/[^a-zA-Z0-9._-]+/g, "-");
	const encodedUtf8 = encodeURIComponent(utf8Filename);
	return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodedUtf8}`;
}

export async function register(app: FastifyInstance) {
	// ────────────────────────────────────────────────────────────
	// GET /api/documents/:id/pdf  — issued documents (signed archive)
	// Чтение идёт под READ ONLY транзакцией, которая закрывается до печати PDF.
	// ────────────────────────────────────────────────────────────
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/documents/:id/pdf",
		permission: "public",
		handler: async ({ request, reply }) => {
			const parsedParams = documentPdfParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply
					.code(400)
					.send(
						apiError("Некорректный идентификатор документа (ожидается UUID)"),
					);
			}
			const { id } = parsedParams.data;
			const portalPatient = await extractPortalPatient(request);
			const orgId = portalPatient ? portalPatient.organizationId : requireOrganizationId(request, reply);
			if (!orgId) return reply;
			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role, {
				clinicalRole: identity.clinicalRole ?? null,
				canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
				specialties: identity.specialties ?? null,
			});

			const initialSources = await withTenantReadCtx(orgId, async () => {
				const loadedDoc = await getDocumentById(orgId, id);
				if (!loadedDoc) return { document: null, patient: null };
				const loadedPatient = await getPatientByIdFromDb(
					orgId,
					loadedDoc.patientId,
				);
				return { document: loadedDoc, patient: loadedPatient ?? null };
			});
			const document = initialSources.document;
			if (!document) {
				return reply.code(404).send(apiError("Документ не найден"));
			}

			if (portalPatient) {
				if (document.patientId !== portalPatient.patientId) {
					return reply
						.code(403)
						.send(apiError("Доступ к документам другого пациента запрещен (152-ФЗ / BOLA)"));
				}
			} else if (clinicalDocKinds.has(document.kind)) {
				if (
					!access.hasClinicalAccess &&
					!isReceptionistAllowedPrimaryDoc(document.kind, identity.role)
				) {
					return reply.code(403).send(apiError("Доступ к медицинской тайне ограничен 152-ФЗ и 323-ФЗ: требуются права клинического персонала."));
				}
			}
			if (!initialSources.patient) {
				return reply.code(404).send(apiError("Пациент не найден"));
			}
			if (
				!portalPatient &&
				initialSources.patient.status === "archived" &&
				!access.hasClinicalAccess
			) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.read",
					message: "Доступ к документам архивного пациента разрешён только клиническому персоналу.",
				});
			}

			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId: document.patientId,
				action: "EXPORT_MEDICAL_DOCUMENT_PDF",
				diagnosis: document.title,
			});
			if (document.status === "voided") {
				return reply
					.code(409)
					.send(apiError("Документ аннулирован: печатная форма недоступна."));
			}

			if (
				document.status === "issued" &&
				document.signatureAttestation &&
				documentHasIssuedArchiveMetadata(document)
			) {
				const issuedSnapshot = readIssuedDocumentSnapshot(document);
				if (issuedSnapshot) {
					const result = await renderIssuedHtmlToPdf(
						applySignatureStampIfSigned(document, issuedSnapshot),
					);
					if (!result.ok) {
						return reply.code(503).send(apiError(result.error));
					}
					return reply
						.header(
							"Content-Disposition",
							`attachment; filename="${documentAttachmentFileName(document, "pdf")}"`,
						)
						.type("application/pdf")
						.send(result.pdf);
				}
			}

			const draftSources = await withTenantReadCtx(orgId, async () => {
				const draftPatient = await getPatientByIdFromDb(
					orgId,
					document.patientId,
				);
				if (!draftPatient) return { patient: null, context: null };
				return {
					patient: draftPatient,
					context: await resolveDocumentRenderContext(
						orgId,
						document.patientId,
					),
				};
			});
			const patient = draftSources.patient;
			if (!patient || !draftSources.context) {
				return reply.code(404).send(apiError("Пациент не найден"));
			}

			const draftHtml = renderDocumentHtml(document, patient, draftSources.context);
			const result = await renderIssuedHtmlToPdf(
				applySignatureStampIfSigned(document, draftHtml),
			);
			if (!result.ok) {
				return reply.code(503).send(apiError(result.error));
			}

			return reply
				.header(
					"Content-Disposition",
					`attachment; filename="${documentAttachmentFileName(document, "pdf")}"`,
				)
				.type("application/pdf")
				.send(result.pdf);
		},
	});

	// ────────────────────────────────────────────────────────────
	// GET /api/documents/:id/treatment-plan-pdf
	// ────────────────────────────────────────────────────────────
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/documents/:id/treatment-plan-pdf",
		permission: "public",
		handler: async ({ request, reply }) => {
			const portalPatient = await extractPortalPatient(request);
			const orgId = portalPatient ? portalPatient.organizationId : requireOrganizationId(request, reply);
			if (!orgId) return reply;
			const parsedParams = documentPdfParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply
					.code(400)
					.send(
						apiError("Некорректный идентификатор документа (ожидается UUID)"),
					);
			}
			const { id } = parsedParams.data;
			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role, {
				clinicalRole: identity.clinicalRole ?? null,
				canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
				specialties: identity.specialties ?? null,
			});
			const planSources = await withTenantReadCtx(orgId, async () => {
				const loadedDoc = await getDocumentById(orgId, id);
				if (!loadedDoc) return { document: null, patient: null };
				const loadedPatient = await getPatientByIdFromDb(
					orgId,
					loadedDoc.patientId,
				);
				return { document: loadedDoc, patient: loadedPatient ?? null };
			});
			const document = planSources.document;
			if (!document) {
				return reply.code(404).send(apiError("Документ не найден"));
			}
			if (document.kind !== "treatment_plan") {
				return reply
					.code(409)
					.send(
						apiError(
							"Этот маршрут предназначен только для документов типа treatment_plan.",
						),
					);
			}

			if (portalPatient) {
				if (document.patientId !== portalPatient.patientId) {
					return reply
						.code(403)
						.send(apiError("Доступ к документам другого пациента запрещен (152-ФЗ / BOLA)"));
				}
			} else if (
				!access.hasClinicalAccess &&
				!isReceptionistAllowedPrimaryDoc(document.kind, identity.role)
			) {
				return reply
					.code(403)
					.send(
						apiError(
							"Доступ к медицинской тайне ограничен 152-ФЗ и 323-ФЗ: требуются права клинического персонала.",
						),
					);
			}
			if (!planSources.patient) {
				return reply.code(404).send(apiError("Пациент не найден"));
			}
			if (
				!portalPatient &&
				planSources.patient.status === "archived" &&
				!access.hasClinicalAccess
			) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.read",
					message: "Доступ к документам архивного пациента разрешён только клиническому персоналу.",
				});
			}

			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId: document.patientId,
				action: "EXPORT_TREATMENT_PLAN_PDF",
				diagnosis: document.title,
			});

			if (document.status === "voided") {
				return reply
					.code(409)
					.send(apiError("Документ аннулирован: печатная форма недоступна."));
			}

			if (document.status === "issued") {
				if (!documentHasIssuedArchiveMetadata(document)) {
					return reply.code(409).send(apiError(issuedArchiveIntegrityError));
				}
				const issuedSnapshot = readIssuedDocumentSnapshot(document);
				if (!issuedSnapshot) {
					return reply
						.code(409)
						.send(
							apiError(
								"Архив выданного документа не прошёл проверку целостности.",
							),
						);
				}
				const issuedResult = await renderIssuedHtmlToPdf(
					applySignatureStampIfSigned(document, issuedSnapshot),
				);
				if (!issuedResult.ok) {
					return reply.code(503).send(apiError(issuedResult.error));
				}
				return reply
					.header(
						"Content-Disposition",
						`attachment; filename="${documentAttachmentFileName(document, "pdf")}"`,
					)
					.type("application/pdf")
					.send(issuedResult.pdf);
			}

			const draftSources = await withTenantReadCtx(orgId, async (tx) => {
				const draftPatient = await getPatientByIdFromDb(
					orgId,
					document.patientId,
				);
				if (!draftPatient) return { patient: null, context: null, clinicTz: null };
				const [context, clinicTz] = await Promise.all([
					resolveDocumentRenderContext(orgId, document.patientId),
					clinicTimeZone(orgId, tx),
				]);
				return {
					patient: draftPatient,
					context,
					clinicTz,
				};
			});
			const patient = draftSources.patient;
			if (!patient || !draftSources.context) {
				return reply.code(404).send(apiError("Пациент не найден"));
			}

			const html = renderDocumentHtml(document, patient, draftSources.context);

			const result = await renderIssuedHtmlToPdf(
				applySignatureStampIfSigned(document, html),
			);
			if (!result.ok) {
				return reply.code(503).send(apiError(result.error));
			}

			const patientNameSlug = (patient.fullName ?? "patient")
				.toLowerCase()
				.replace(/[^a-zа-яё0-9]+/gi, "-")
				.replace(/^-+|-+$/g, "")
				.slice(0, 40);
			const dateSlug = formatDateKeyInTimeZone(
				new Date(),
				resolveValidIanaTimeZone(draftSources.clinicTz),
			);
			const utf8Filename = `plan-${patientNameSlug || document.id.slice(0, 8)}-${dateSlug}.pdf`;
			const asciiFallbackFilename = `plan-${document.id.slice(0, 8)}-${dateSlug}.pdf`;

			return reply
				.header(
					"Content-Disposition",
					buildPdfContentDispositionHeader(utf8Filename, asciiFallbackFilename),
				)
				.type("application/pdf")
				.send(result.pdf);
		},
	});
}
