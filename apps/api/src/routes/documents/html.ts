import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	getDocumentById,
	readIssuedDocumentSnapshot,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import {
	escapeHtml,
	renderDocumentHtml,
} from "../../documents/renderDocument.js";
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
	documentRequiresIssuedArchive,
	issuedArchiveIntegrityError,
	resolveDocumentRenderContext,
} from "./shared.js";

const documentHtmlParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

const documentHtmlQuerySchema = z
	.object({
		download: z.enum(["0", "1", "true", "false"]).optional(),
	})
	.strict();

function injectVoidWatermarkIntoHtml(
	html: string,
	reason?: string | null,
	voidedAt?: string | null,
): string {
	const safeReason = reason?.trim() ? escapeHtml(reason.trim()) : "";
	const reasonStr = safeReason ? ` Причина: ${safeReason}.` : "";
	const parsedVoidDate = voidedAt ? new Date(voidedAt) : null;
	const dateStr =
		parsedVoidDate && !Number.isNaN(parsedVoidDate.getTime())
			? ` Дата аннулирования: ${escapeHtml(parsedVoidDate.toLocaleDateString("ru-RU"))}.`
			: "";
	const bannerHtml = `
<div id="dente-void-banner" style="position: sticky; top: 0; left: 0; width: 100%; background: #fee2e2; border-bottom: 2px solid #ef4444; color: #991b1b; text-align: center; padding: 12px 16px; font-weight: 700; font-size: 15px; z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box;">
  ВНИМАНИЕ: ДОКУМЕНТ АННУЛИРОВАН (ЮРИДИЧЕСКАЯ СИЛА УТРАЧЕНА).${reasonStr}${dateStr}
</div>
<div id="dente-void-watermark" style="position: fixed; top: 38%; left: 5%; width: 90%; text-align: center; transform: rotate(-30deg); font-size: 56px; font-weight: 900; color: rgba(220, 38, 38, 0.22); letter-spacing: 4px; pointer-events: none; z-index: 99998; border: 6px dashed rgba(220, 38, 38, 0.3); border-radius: 16px; padding: 24px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; user-select: none;">
  ДОКУМЕНТ АННУЛИРОВАН
</div>
`;
	if (html.includes("<body")) {
		return html.replace(/(<body[^>]*>)/i, `$1${bannerHtml}`);
	}
	return bannerHtml + html;
}

export async function register(app: FastifyInstance) {
	app.get<{ Params: { id: string }; Querystring: { download?: string } }>(
		"/api/documents/:id/html",
		async (request, reply) => {
			const parsedParams = documentHtmlParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send(apiError("Некорректный идентификатор документа (ожидается UUID)"));
			}
			const parsedQuery = documentHtmlQuerySchema.safeParse(request.query);
			if (!parsedQuery.success) {
				return reply.code(400).send(apiError("Некорректные параметры запроса HTML-версии документа"));
			}
			const { id } = parsedParams.data;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const document = await getDocumentById(orgId, id);
			if (!document) {
				return reply.code(404).send(apiError("Документ не найден"));
			}

			// BOLA / IDOR проверка: если запрос от пациента личного кабинета (63-ФЗ / 152-ФЗ)
			const portalPatient = extractPortalPatient(request);
			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role, {
				clinicalRole: identity.clinicalRole ?? null,
				canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
				specialties: identity.specialties ?? null,
			});
			if (portalPatient) {
				if (document.patientId !== portalPatient.patientId) {
					return reply
						.code(403)
						.send(apiError("Доступ к документам другого пациента запрещен (152-ФЗ / BOLA)"));
				}
			} else {
				// Защита 152-ФЗ / 323-ФЗ ст. 13: врачебная тайна в медицинских документах для персонала клиники
				if (clinicalDocKinds.has(document.kind)) {
					if (
						!access.hasClinicalAccess &&
						!isReceptionistAllowedPrimaryDoc(document.kind, identity.role)
					) {
						return reply.code(403).send(apiError("Доступ к медицинской тайне ограничен 152-ФЗ и 323-ФЗ: требуются права клинического персонала."));
					}
				}
			}

			const patient = await getPatientByIdFromDb(orgId, document.patientId);
			if (!patient) {
				return reply.code(404).send(apiError("Пациент не найден"));
			}
			if (!portalPatient && patient.status === "archived" && !access.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.read",
					message: "Доступ к документам архивного пациента разрешён только клиническому персоналу.",
				});
			}

			// 152-ФЗ / 323-ФЗ: Аудит просмотра медицинского документа
			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId: document.patientId,
				action: "VIEW_MEDICAL_DOCUMENT_HTML",
				diagnosis: document.title,
			});

			const issuedSnapshot = readIssuedDocumentSnapshot(document);
			if (documentRequiresIssuedArchive(document)) {
				if (!documentHasIssuedArchiveMetadata(document)) {
					return reply.code(409).send(apiError(issuedArchiveIntegrityError));
				}
				if (!issuedSnapshot) {
					return reply
						.code(409)
						.send(
							apiError(
								"Архивная копия выданного документа отсутствует или не прошла проверку целостности.",
							),
						);
				}
				if (
					parsedQuery.data.download === "1" ||
					parsedQuery.data.download === "true"
				) {
					reply.header(
						"Content-Disposition",
						`attachment; filename="${documentAttachmentFileName(document, "html")}"`,
					);
				}
				let renderedHtml = applySignatureStampIfSigned(document, issuedSnapshot);
				if (document.status === "voided") {
					renderedHtml = injectVoidWatermarkIntoHtml(
						renderedHtml,
						document.voidAttestation?.reasonText || null,
						document.voidedAt,
					);
				}
				return reply
					.type("text/html; charset=utf-8")
					.send(renderedHtml);
			}

			const requestHost = request.headers.host ?? "127.0.0.1:4100";
			const requestProto =
				(request.headers["x-forwarded-proto"] as string) ?? "http";
			const origin = `${requestProto}://${requestHost}`;

			// Реальный контекст вместо пустой заглушки (см. documents.ts).
			const renderContext = {
				...(await resolveDocumentRenderContext(orgId, document.patientId, request.log)),
				origin,
			};

			let rendered = applySignatureStampIfSigned(
				document,
				renderDocumentHtml(document, patient, renderContext),
			);
			if (document.status === "voided") {
				rendered = injectVoidWatermarkIntoHtml(
					rendered,
					document.voidAttestation?.reasonText || null,
					document.voidedAt,
				);
			}

			return reply
				.type("text/html; charset=utf-8")
				.send(rendered);
		},
	);
}
