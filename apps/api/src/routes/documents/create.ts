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
} from "./shared.js";
import { clinicalDocKinds } from "./query.js";

export async function register(app: FastifyInstance) {
	app.post("/api/documents", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(request, reply, "document create"))
		)
			return;

		// 152-ФЗ / 323-ФЗ: Создание медицинских документов запрещено маркетологам
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
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

		// 152-ФЗ / 323-ФЗ: Создание клинических медицинских документов разрешено только клиническому персоналу
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (clinicalDocKinds.has(input.kind) && !evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.document.write",
				role: staffRole,
				message:
					"Создание медицинских документов ограничено 323-ФЗ и 152-ФЗ: требуются права клинического персонала (врач / ассистент).",
			});
		}
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
