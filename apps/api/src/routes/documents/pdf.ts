import {
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";
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
import {
	apiError,
	documentAttachmentFileName,
	documentHasIssuedArchiveMetadata,
	documentRequiresIssuedArchive,
	issuedArchiveIntegrityError,
	renderIssuedHtmlToPdf,
	resolveDocumentRenderContext,
} from "./shared.js";

function applySignatureStampIfSigned(
	document: import("@dental/shared").GeneratedDocument,
	html: string,
): string {
	const isElectronicallySigned =
		document.signatureAttestation?.mode === "qualified_electronic_signature" ||
		document.signatureAttestation?.mode === "enhanced_non_qualified_electronic_signature" ||
		Boolean(document.cryptoSignaturePkcs7 && document.cryptoSignaturePkcs7.length > 0) ||
		Boolean(document.doctorSignaturePkcs7 && document.doctorSignaturePkcs7.length > 0);

	if (!isElectronicallySigned || html.includes("BEGIN_GOST_SIGNATURE_STAMP")) {
		return html;
	}

	const certSerial =
		document.doctorCertSerial ||
		`00E4A28B${document.id.replace(/-/g, "").slice(0, 16).toUpperCase()}`;
	const isTaxCert =
		document.kind === "tax_deduction_certificate" ||
		document.kind === "legacy_tax_deduction_certificate";
	const defaultSubject = isTaxCert
		? document.signatureAttestation?.staffFullName ||
			"Главный врач / Уполномоченное лицо клиники"
		: "Врач-стоматолог клиники";
	const certSubject =
		document.doctorCertSubject ||
		document.signatureAttestation?.staffFullName ||
		defaultSubject;
	const validFrom = document.issuedAt || new Date().toISOString();
	const validToDate = new Date(validFrom);
	validToDate.setFullYear(validToDate.getFullYear() + 1);

	const stampHtml = renderDigitalSignatureStampHtml({
		certificateSerialNumber: certSerial,
		certificateSubject: certSubject,
		certificateIssuer: "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
		validFrom,
		validTo: validToDate.toISOString(),
		signedAt:
			document.doctorSignedAt ||
			document.signatureAttestation?.signedAt ||
			document.issuedAt ||
			undefined,
		signatureType:
			document.signatureAttestation?.mode ===
			"enhanced_non_qualified_electronic_signature"
				? "unep"
				: "ukep",
		documentId: document.id,
	});

	return injectVisualSignatureStampIntoHtml(html, stampHtml);
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
			if (!(await requireClinicalReadAccess(request, reply, "document pdf")))
				return;
			const { id } = request.params;
			// БЫЛО: при отсутствии/невалидности токена подставлялась строка "mock-org".
			// Все проверки принадлежности сравнивали подделку саму с собой и сходились,
			// а в uuid-колонку уходило "mock-org" → 500 на каждом маршруте документов.
			// Организация теперь берётся только из проверенного токена (401 иначе).
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const document = await withTenantCtx(orgId, () =>
				getDocumentById(orgId, id),
			);
			if (!document) {
				return reply.code(404).send(apiError("Документ не найден"));
			}

			// Защита 152-ФЗ / 323-ФЗ ст. 13: врачебная тайна в медицинских документах
			const clinicalDocKinds = new Set([
				"dental_medical_card_043u",
				"orthodontic_medical_card_043_1u",
				"outpatient_medical_card_025u",
				"medical_record_extract",
				"patient_intake_questionnaire",
				"informed_consent",
				"prescription_medication_order",
				"treatment_plan",
				"treatment_plan_acceptance",
				"radiation_dose_sheet",
				"daily_dentist_diary_037u",
				"summary_dentist_statement_039u",
			]);
			if (clinicalDocKinds.has(document.kind)) {
				const identity = getRequestIdentity(request);
				const access = evaluateClinicalAccess(identity.role);
				if (!access.hasClinicalAccess) {
					return reply.code(403).send(apiError("Доступ к медицинской тайне ограничен 152-ФЗ и 323-ФЗ: требуются права клинического персонала."));
				}
			}

			// 152-ФЗ / 323-ФЗ: Аудит экспорта/печати медицинского документа в PDF
			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId: document.patientId,
				action: "EXPORT_MEDICAL_DOCUMENT_PDF",
				diagnosis: document.title,
			});
			if (!documentRequiresIssuedArchive(document)) {
				return reply
					.code(409)
					.send(
						apiError(
							"PDF недоступен: документ не требует архива выданного HTML.",
						),
					);
			}
			if (!document.signatureAttestation) {
				return reply
					.code(409)
					.send(
						apiError(
							"PDF недоступен: требуется отметка о подписании при выдаче документа.",
						),
					);
			}

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
			if (
				!(await requireClinicalReadAccess(request, reply, "treatment plan pdf"))
			)
				return;
			// БЫЛО: при отсутствии/невалидности токена подставлялась строка "mock-org".
			// Все проверки принадлежности сравнивали подделку саму с собой и сходились,
			// а в uuid-колонку уходило "mock-org" → 500 на каждом маршруте документов.
			// Организация теперь берётся только из проверенного токена (401 иначе).
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { id } = request.params;
			const document = await withTenantCtx(orgId, () =>
				getDocumentById(orgId, id),
			);
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
				.slice(0, 40);
			const dateSlug = new Date().toISOString().slice(0, 10);
			const filename = `plan-${patientNameSlug}-${dateSlug}.pdf`;

			return reply
				.header("Content-Disposition", `attachment; filename="${filename}"`)
				.type("application/pdf")
				.send(result.pdf);
		},
	);
}
