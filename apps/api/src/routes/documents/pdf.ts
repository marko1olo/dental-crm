import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	getDocumentById,
	readIssuedDocumentSnapshot,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { renderDocumentHtml } from "../../documents/renderDocument.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
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
	//
	// ПОЧЕМУ config.tenantTxSelfManaged И ЯВНЫЙ withTenantCtx.
	// Тело ответа — буфер PDF, который печатает ВНЕШНИЙ headless-браузер
	// (renderIssuedHtmlToPdf в routes/documents.ts запускает Edge/Chrome; предел
	// ожидания DENTE_PDF_EXPORT_TIMEOUT_MS, по умолчанию 60 с, потолок 180 с).
	// Автоматическая обёртка server.ts держала транзакцию и соединение из пула
	// (их 10) всё время запуска браузера, печати и последующей передачи файла
	// клиенту — то есть соединение к базе стояло на процессе, который к базе
	// отношения не имеет. Теперь документ читается под контекстом арендатора,
	// транзакция закрывается, и только потом печатается PDF. Обхода RLS нет:
	// организация берётся из проверенного токена, чтение идёт под её контекстом.
	// ────────────────────────────────────────────────────────────
	app.get<{ Params: { id: string } }>(
		"/api/documents/:id/pdf",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const parsedParams = documentPdfParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply
					.code(400)
					.send(
						apiError("Некорректный идентификатор документа (ожидается UUID)"),
					);
			}
			const { id } = parsedParams.data;
			// Организация берётся из проверенного токена портала или кабинета клиники (401 иначе).
			const portalPatient = extractPortalPatient(request);
			const orgId = portalPatient ? portalPatient.organizationId : requireOrganizationId(request, reply);
			if (!orgId) return;
			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role, {
				clinicalRole: identity.clinicalRole ?? null,
				canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
				specialties: identity.specialties ?? null,
			});

			const initialSources = await withTenantCtx(orgId, async () => {
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

			// BOLA / IDOR проверка: если запрос от пациента личного кабинета (63-ФЗ / 152-ФЗ)
			if (portalPatient) {
				if (document.patientId !== portalPatient.patientId) {
					return reply
						.code(403)
						.send(apiError("Доступ к документам другого пациента запрещен (152-ФЗ / BOLA)"));
				}
			} else {
				// Защита 152-ФЗ / 323-ФЗ ст. 13: врачебная тайна в медицинских документах
				if (clinicalDocKinds.has(document.kind)) {
					if (
						!access.hasClinicalAccess &&
						!isReceptionistAllowedPrimaryDoc(document.kind, identity.role)
					) {
						return reply.code(403).send(apiError("Доступ к медицинской тайне ограничен 152-ФЗ и 323-ФЗ: требуются права клинического персонала."));
					}
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

			// 152-ФЗ / 323-ФЗ: Аудит экспорта/печати медицинского документа в PDF
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

			// Если документ выдан и подписан — отдаём защищённую архивную копию с оттиском подписи
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

			// Для черновика или документа до подписания — динамический рендеринг в PDF со статусом черновика
			const draftSources = await withTenantCtx(orgId, async () => {
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
	);

	// ────────────────────────────────────────────────────────────
	// GET /api/documents/:id/treatment-plan-pdf
	// On-the-fly PDF for treatment_plan documents (draft or issued).
	// Does NOT require signatureAttestation — used for immediate
	// patient hand-out directly from the visit screen.
	//
	// Причина config.tenantTxSelfManaged та же, что у соседнего /pdf: печать
	// выполняет внешний headless-браузер, и держать на ней транзакцию нельзя.
	// Все три чтения из базы (документ, пациент, контекст рендеринга) собраны в
	// один явный withTenantCtx ниже и заканчиваются до вызова печати.
	// ────────────────────────────────────────────────────────────
	app.get<{ Params: { id: string } }>(
		"/api/documents/:id/treatment-plan-pdf",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const portalPatient = extractPortalPatient(request);
			const orgId = portalPatient ? portalPatient.organizationId : requireOrganizationId(request, reply);
			if (!orgId) return;
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
			const planSources = await withTenantCtx(orgId, async () => {
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

			// BOLA / IDOR проверка: если запрос от пациента личного кабинета (63-ФЗ / 152-ФЗ)
			if (portalPatient) {
				if (document.patientId !== portalPatient.patientId) {
					return reply
						.code(403)
						.send(apiError("Доступ к документам другого пациента запрещен (152-ФЗ / BOLA)"));
				}
			} else {
				// 152-ФЗ / 323-ФЗ ст. 13: врачебная тайна в плане лечения
				if (
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

			// 152-ФЗ / 323-ФЗ: Аудит экспорта плана лечения в PDF
			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId: document.patientId,
				action: "EXPORT_TREATMENT_PLAN_PDF",
				diagnosis: document.title,
			});

			// БЫЛО: маршрут не проверял статус вообще и ВСЕГДА рендерил документ заново
			// из текущих данных. План лечения, выданный и подписанный 1 марта, после
			// изменения фамилии пациента 10 марта скачивался уже с другими данными —
			// то есть отличался от копии, которую пациент подписал. Аннулированный план
			// тоже скачивался как обычный. Замороженный архив при этом игнорировался.
			if (document.status === "voided") {
				return reply
					.code(409)
					.send(apiError("Документ аннулирован: печатная форма недоступна."));
			}

			// Для выданного документа отдаём именно архивную копию, как это делает
			// соседний маршрут /pdf: она заверена и проверяется на целостность.
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

			// Пациент и контекст рендеринга — второе и третье обращения к базе. Они
			// собраны в одну транзакцию арендатора, которая закрывается до печати.
			const draftSources = await withTenantCtx(orgId, async () => {
				const draftPatient = await getPatientByIdFromDb(
					orgId,
					document.patientId,
				);
				if (!draftPatient) return { patient: null, context: null };
				// Реальный контекст вместо пустой заглушки (см. documents.ts).
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
			const dateSlug = new Date().toISOString().slice(0, 10);
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
	);
}
