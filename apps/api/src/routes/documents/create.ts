import {
	createDocumentSchema,
	publicGeneratedDocumentSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import { getTreatmentPlanItemsForPatient } from "../../db/clinicalQuery.js";
import {
	createGeneratedDocumentInDb,
	getDocumentsByPatientId,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { getVisitByIdInDb } from "../../db/visitsQuery.js";
import {
	paidAmountRubForDocument,
	paymentReceiptSelectionErrorForDocument,
	paymentRefundCorrectionSelectionErrorForDocument,
	plannedAmountRubForDocument,
	taxPaymentSelectionErrorForDocument,
	validateDocumentCreation,
} from "../../documents/guards.js";
import { requireOrganizationId } from "../../security/identity.js";
import {
	repairMojibakeDeep,
	repairMojibakeText,
} from "../../text/repairMojibake.js";
import {
	apiError,
	documentCreateValidationMessageForRequest,
} from "./shared.js";

export async function register(app: FastifyInstance) {
	app.post("/api/documents", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(request, reply, "document create"))
		)
			return;
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
		// БЫЛО: при отсутствии/невалидности токена подставлялась строка "mock-org".
		// Все проверки принадлежности сравнивали подделку саму с собой и сходились,
		// а в uuid-колонку уходило "mock-org" → 500 на каждом маршруте документов.
		// Организация теперь берётся только из проверенного токена (401 иначе).
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const patient = await getPatientByIdFromDb(orgId, input.patientId);
		const visit = input.visitId
			? await getVisitByIdInDb(orgId, input.visitId)
			: null;
		const patientPayments = await getPaymentsByPatientIdInDb(
			orgId,
			input.patientId,
		);
		const patientPlanItems = await getTreatmentPlanItemsForPatient(
			orgId,
			input.patientId,
		);
		// Нужны для контроля суммарных возвратов по одному чеку (см. guards.ts).
		const patientDocuments = await getDocumentsByPatientId(
			orgId,
			input.patientId,
		);

		const validation = validateDocumentCreation(input, {
			patient: patient ?? null,
			visit: visit ?? null,
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
			return reply.code(validation.statusCode).send(apiError(validation.error));
		}

		const document = await createGeneratedDocumentInDb(orgId, validation.input);
		return reply.code(201).send(publicGeneratedDocumentSchema.parse(document));
	});
}
