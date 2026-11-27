import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import {
	getDocumentById,
	getDocumentsByPatientId,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { getClinicSettingsFromDb } from "../../db/settingsQuery.js";
import {
	documentIssueBlockReason,
	taxFiscalDocumentBlockReason,
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
import { buildPdfContentDispositionHeader } from "./pdf.js";
import {
	apiError,
	buildKnd1151156Xml,
	configuredTaxOfficeCode,
	documentIssueChainBlockReason,
	findIssuedDuplicateTaxCertificate,
	frozenTaxXmlClinicProfile,
	frozenTaxXmlPatient,
	frozenTaxXmlPayments,
	resolveDocumentRenderContext,
	taxSnapshotDocument,
	taxXmlSourceSnapshotSha256,
} from "./shared.js";

export async function register(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/documents/:id/tax-xml",
		permission: "public",
		handler: async ({ request, reply }) => handleGetTaxXml(request, reply),
	});
}

const documentIdParamsSchema = z
	.object({
		id: z.string().uuid(),
	})
	.strict();

async function handleGetTaxXml(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "document tax xml")))
		return;
	const parsedParams = documentIdParamsSchema.safeParse(request.params);
	if (!parsedParams.success) {
		return reply
			.code(400)
			.send(
				apiError("Некорректный идентификатор документа (ожидается UUID)"),
			);
	}
	const { id } = parsedParams.data;
	// БЫЛО: при отсутствии/невалидности токена подставлялась строка "mock-org".
	// Все проверки принадлежности сравнивали подделку саму с собой и сходились,
	// а в uuid-колонку уходило "mock-org" → 500 на каждом маршруте документов.
	// Организация теперь берётся только из проверенного токена (401 иначе).
	const orgId = requireOrganizationId(request, reply);
	if (!orgId) return reply;

	const prep = await withTenantReadCtx(orgId, async () => {
		const document = await getDocumentById(orgId, id);
		if (!document) {
			return { kind: "error" as const, status: 404, body: apiError("Документ не найден") };
		}
		if (document.status === "voided") {
			return {
				kind: "error" as const,
				status: 409,
				body: apiError("Аннулированный документ нельзя выгрузить в XML ФНС."),
			};
		}
		if (document.status !== "issued") {
			return {
				kind: "error" as const,
				status: 409,
				body: apiError(
					"XML ФНС можно выгрузить только после выдачи налоговой справки. Сначала выпустите справку и заморозьте состав оплат.",
				),
			};
		}
		if (!document.signatureAttestation) {
			return {
				kind: "error" as const,
				status: 409,
				body: apiError(
					"XML ФНС нельзя выгрузить без отметки подписания и получения выданного документа.",
				),
			};
		}

		if (document.taxXmlSnapshot) {
			const patient = await getPatientByIdFromDb(orgId, document.patientId);
			const identity = getRequestIdentity(request);
			const access = evaluateClinicalAccess(identity.role, {
				clinicalRole: identity.clinicalRole ?? null,
				canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
				specialties: identity.specialties ?? null,
			});
			if (patient?.status === "archived" && !access.hasClinicalAccess) {
				return {
					kind: "error" as const,
					status: 403,
					body: {
						error: "PermissionDenied",
						permission: "patients.archived.read",
						role: identity.role,
						message:
							"Отказ в доступе к документам архивированного пациента (152-ФЗ / 323-ФЗ ст. 13).",
					},
				};
			}
			return { kind: "snapshot" as const, taxXmlSnapshot: document.taxXmlSnapshot };
		}

		const patient = await getPatientByIdFromDb(orgId, document.patientId);
		if (!patient) {
			return { kind: "error" as const, status: 404, body: apiError("Пациент не найден") };
		}

		const identity = getRequestIdentity(request);
		const access = evaluateClinicalAccess(identity.role, {
			clinicalRole: identity.clinicalRole ?? null,
			canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
			specialties: identity.specialties ?? null,
		});
		if (patient.status === "archived" && !access.hasClinicalAccess) {
			return {
				kind: "error" as const,
				status: 403,
				body: {
					error: "PermissionDenied",
					permission: "patients.archived.read",
					role: identity.role,
					message:
						"Отказ в доступе к документам архивированного пациента (152-ФЗ / 323-ФЗ ст. 13).",
				},
			};
		}

		const patientPayments = await getPaymentsByPatientIdInDb(
			orgId,
			document.patientId,
		);
		const taxPaymentSnapshot =
			document.taxPaymentSnapshot ??
			(taxDocumentUsesPaymentSnapshot(document.kind)
				? buildTaxPaymentSnapshotForIssue(
						document,
						patientPayments,
						await getDocumentsByPatientId(orgId, document.patientId),
					)
				: null);
		if (taxDocumentUsesPaymentSnapshot(document.kind) && !taxPaymentSnapshot) {
			const duplicateTaxCertificate = await findIssuedDuplicateTaxCertificate(
				document,
				patientPayments,
			);
			if (duplicateTaxCertificate) {
				return {
					kind: "error" as const,
					status: 409,
					body: apiError(
						"За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. XML ФНС нельзя собирать до аннулирования или корректировки предыдущей справки.",
					),
				};
			}
			return {
				kind: "error" as const,
				status: 409,
				body: apiError(
					"Для XML ФНС нет новых оплаченных фискальных чеков за выбранный год.",
				),
			};
		}
		const xmlDocument = taxSnapshotDocument(document, taxPaymentSnapshot);
		const xmlSourceSnapshotSha256 = taxXmlSourceSnapshotSha256(
			xmlDocument.taxXmlSourceSnapshot,
		);
		if (!xmlSourceSnapshotSha256) {
			return {
				kind: "error" as const,
				status: 409,
				body: apiError(
					"XML ФНС нельзя собрать без снимка данных пациента, клиники и платежей на момент выдачи. Аннулируйте и выдайте исправленную справку.",
				),
			};
		}
		const renderContext = await resolveDocumentRenderContext(
			orgId,
			document.patientId,
		);
		const xmlPatient = frozenTaxXmlPatient(xmlDocument, patient);
		const xmlClinicProfile = frozenTaxXmlClinicProfile(
			xmlDocument,
			await getClinicSettingsFromDb(orgId).then((s) => s.profile),
		);
		const xmlPayments = frozenTaxXmlPayments(
			xmlDocument,
			await getPaymentsByPatientIdInDb(orgId, xmlDocument.patientId),
		);
		const xmlRenderContext = {
			...renderContext,
			clinicProfile: xmlClinicProfile,
			payments: xmlPayments,
		};
		const blockReason = documentIssueBlockReason(
			xmlDocument,
			xmlPatient,
			xmlRenderContext,
		);
		if (blockReason) {
			return { kind: "error" as const, status: 409, body: apiError(blockReason) };
		}
		const taxBlockReason = taxFiscalDocumentBlockReason(
			xmlDocument,
			xmlPatient,
			xmlRenderContext,
		);
		if (taxBlockReason) {
			return { kind: "error" as const, status: 409, body: apiError(taxBlockReason) };
		}
		const chainBlockReason = await documentIssueChainBlockReason(xmlDocument);
		if (chainBlockReason) {
			return { kind: "error" as const, status: 409, body: apiError(chainBlockReason) };
		}
		const duplicateTaxCertificate = await findIssuedDuplicateTaxCertificate(
			xmlDocument,
			patientPayments,
		);
		if (duplicateTaxCertificate) {
			return {
				kind: "error" as const,
				status: 409,
				body: apiError(
					"За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. XML ФНС нельзя собирать до аннулирования или корректировки предыдущей справки.",
				),
			};
		}

		return {
			kind: "build" as const,
			xmlDocument,
			xmlPatient,
			xmlClinicProfile,
			xmlPayments,
		};
	});

	if (prep.kind === "error") {
		return reply.code(prep.status).send(prep.body);
	}
	if (prep.kind === "snapshot") {
		const xmlFilename = `${prep.taxXmlSnapshot.fileName}.xml`;
		return reply
			.header(
				"Content-Disposition",
				buildPdfContentDispositionHeader(xmlFilename, xmlFilename),
			)
			.type("application/xml; charset=utf-8")
			.send(prep.taxXmlSnapshot.xml);
	}

	const taxOfficeCode = configuredTaxOfficeCode();
	const result = buildKnd1151156Xml(prep.xmlDocument, prep.xmlPatient, {
		clinicProfile: prep.xmlClinicProfile,
		payments: prep.xmlPayments,
		taxOfficeCode,
	});
	if (!result.ok) {
		return reply.code(result.statusCode).send(apiError(result.error));
	}

	const xmlFilename = `${result.fileName}.xml`;
	return reply
		.header(
			"Content-Disposition",
			buildPdfContentDispositionHeader(xmlFilename, xmlFilename),
		)
		.type("application/xml; charset=utf-8")
		.send(result.xml);
}
