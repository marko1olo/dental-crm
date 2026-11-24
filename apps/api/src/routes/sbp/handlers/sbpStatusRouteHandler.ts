import type { FastifyReply, FastifyRequest } from "fastify";
import { getSbpPaymentStatus } from "../sbpPaymentService.js";
import { requireClinicalReadContext } from "../../../security/tenantContext.js";

/**
 * 5. GET /api/sbp/status/:id
 * Проверка статуса операции СБП в реальном времени.
 * Строгая изоляция тенанта: orgId извлекается исключительно из проверенного токена авторизации.
 */
export async function handleGetSbpStatus(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
): Promise<void> {
	const context = await requireClinicalReadContext(
		request,
		reply,
		"sbp status check",
	);
	if (!context) return;
	const { organizationId } = context;

	const operationId = request.params?.id;
	if (!operationId) {
		return reply.status(400).send({
			error: "MissingOperationId",
			message: "Идентификатор операции не указан.",
		});
	}

	const statusResult = await getSbpPaymentStatus(operationId, organizationId);

	if (!statusResult || !statusResult.found) {
		return reply.status(404).send({
			error: "PaymentNotFound",
			message: `Операция СБП '${operationId}' не найдена.`,
		});
	}

	return reply.status(200).send({
		success: true,
		operationId,
		...statusResult,
	});
}
