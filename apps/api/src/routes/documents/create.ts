import { createDocumentSchema } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import { getTreatmentPlanItemsForPatient } from "../../db/clinicalQuery.js";
import {
	createGeneratedDocumentInDb,
	getDocumentsByPatientId,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { getVisitByIdInDb } from "../../db/visitsQuery.js";
import {
	paidAmountRubForDocument,
	paymentReceiptSelectionErrorForDocument,
	paymentRefundCorrectionSelectionErrorForDocument,
	plannedAmountRubForDocument,
	taxPaymentSelectionErrorForDocument,
	validateDocumentCreation,
} from "../../documents/guards.js";
import {
	getRequestIdentity,
	requireOrganizationId,
} from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	repairMojibakeDeep,
	repairMojibakeText,
} from "../../text/repairMojibake.js";
import {
	apiError,
	documentCreateValidationMessageForRequest,
	toPublicGeneratedDocument,
} from "./shared.js";
import { clinicalDocKinds, isReceptionistAllowedPrimaryDoc } from "./query.js";

export async function register(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/documents",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (
				!(await requireClinicalMutationAccess(request, reply, "document create"))
			)
				return reply;

			// 152-ФЗ / 323-ФЗ: Создание медицинских документов запрещено маркетологам
			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			if (staffRole === "marketer" || staffRole === "marketing") {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.document.write",
					role: staffRole,
					message:
						"Маркетолог не имеет права создавать медицинские документы (152-ФЗ / 323-ФЗ)",
				});
			}

			const parsedInput = createDocumentSchema.safeParse(request.body);
			if (!parsedInput.success) {
				return reply.code(400).send({
					error: "DocumentValidationFailed",
					message: repairMojibakeText(
						documentCreateValidationMessageForRequest(request.body),
					),
				});
			}
			const input = repairMojibakeDeep(parsedInput.data);

			const evalAccess = evaluateClinicalAccess(staffRole);
			if (
				clinicalDocKinds.has(input.kind) &&
				!evalAccess.hasClinicalAccess &&
				!isReceptionistAllowedPrimaryDoc(input.kind, staffRole)
			) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.document.write",
					role: staffRole,
					message:
						"Создание медицинских документов ограничено 323-ФЗ и 152-ФЗ: требуются права клинического персонала (врач / ассистент).",
				});
			}

			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return reply;

			const {
				patient,
				visit,
				patientPayments,
				patientPlanItems,
				patientDocuments,
			} = await withTenantReadCtx(orgId, async () => {
				const p = await getPatientByIdFromDb(orgId, input.patientId);
				const v = input.visitId
					? await getVisitByIdInDb(orgId, input.visitId)
					: null;
				const pay = await getPaymentsByPatientIdInDb(orgId, input.patientId);
				const planItems = await getTreatmentPlanItemsForPatient(
					orgId,
					input.patientId,
				);
				const docs = await getDocumentsByPatientId(orgId, input.patientId);
				return {
					patient: p,
					visit: v,
					patientPayments: pay,
					patientPlanItems: planItems,
					patientDocuments: docs,
				};
			});

			const validation = validateDocumentCreation(input, {
				patient: patient
					? {
							...patient,
							isAnonymous: patient.isAnonymous ?? null,
						}
					: null,
				visit: visit
					? {
							id: visit.id,
							patientId: visit.patientId,
						}
					: null,
				paidAmountRub: paidAmountRubForDocument(
					input.kind,
					input,
					patientPayments,
				),
				plannedAmountRub: plannedAmountRubForDocument(
					input.kind,
					input,
					patientPlanItems.map((item) => ({
						...item,
						quantity: Number(item.quantity),
					})),
				),
				taxPaymentSelectionError: taxPaymentSelectionErrorForDocument(
					input,
					patientPayments,
				),
				paymentReceiptSelectionError: paymentReceiptSelectionErrorForDocument(
					input,
					patientPayments,
				),
				paymentRefundCorrectionSelectionError:
					paymentRefundCorrectionSelectionErrorForDocument(
						input,
						patientPayments,
						patientDocuments,
					),
			});
			if (!validation.ok) {
				if (
					validation.code === "TaxPayerRequisitesRequiredError" ||
					validation.code === "TaxDeductionIdentificationRequiredError"
				) {
					return reply.code(422).send({
						error: "TaxPayerRequisitesRequiredError",
						message: validation.error,
					});
				}
				return reply.code(validation.statusCode).send(apiError(validation.error));
			}

			const document = await withTenantWriteCtx(orgId, () =>
				createGeneratedDocumentInDb(orgId, validation.input),
			);
			return reply.code(201).send(toPublicGeneratedDocument(document));
		},
	});
}
