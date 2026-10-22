import type { FastifyReply, FastifyRequest } from "fastify";
import { advanceLabOrderStage } from "@dental/shared";
import { autonomousOrdersStore } from "./autonomousTrackerStore.js";
import { defectBodySchema } from "./autonomousTrackerSchemas.js";

export async function handleDefectAutonomousOrder(
	request: FastifyRequest<{ Params: { ref: string } }>,
	reply: FastifyReply,
) {
	const { ref } = request.params;
	const order = autonomousOrdersStore.get(ref);
	if (!order) {
		return reply.code(404).send({
			error: "NotFound",
			message: `Заказ-наряд #${ref} не найден.`,
		});
	}

	const parsed = defectBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные данные отчета о дефекте.",
			details: parsed.error.issues,
		});
	}

	const defect = {
		reportedAt: new Date().toISOString(),
		...parsed.data,
		isBlocking: true,
	};
	try {
		const updatedOrder = advanceLabOrderStage(
			order,
			"rework_flagged",
			parsed.data.reportedByRole,
			parsed.data.reportedByName,
			{
				notes: `ДЕФЕКТ: ${defect.description}`,
				photoProofUrl: defect.proofPhotoUrl,
			},
		);
		updatedOrder.activeDefect = defect;
		autonomousOrdersStore.set(ref, updatedOrder);

		return reply.send({
			success: true,
			updatedOrder,
			alertDoctorTelegram: `🚨 ТРЕВОГА ПО ЗТЛ #${ref}: Работа остановлена из-за дефекта (${defect.reasonCategory}). Доктор ${order.doctorName}, проверьте фото!`,
		});
	} catch (err: unknown) {
		return reply.code(422).send({
			error: "TransitionFailed",
			message: err instanceof Error ? err.message : String(err),
		});
	}
}
