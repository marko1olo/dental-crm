/**
 * @file apps/api/src/routes/ai/noShowRoutes.ts
 * @description Fastify routes for patient no-show risk assessment based on relational appointment history.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "../auth.js";

const predictNoShowBodySchema = z.object({
	patientId: z.unknown().optional(),
});

export async function registerNoShowRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/ai/predict-no-show", async (request, reply) => {
		const clinicHeader = request.headers["x-dente-clinic-token"];
		const clinicToken = Array.isArray(clinicHeader)
			? clinicHeader[0]
			: clinicHeader;
		const payload =
			typeof clinicToken === "string" && clinicToken
				? verifyToken(clinicToken, TOKEN_SECRET())
				: null;
		const orgId = payload?.organizationId as string | undefined;
		if (!orgId) {
			return reply.code(401).send({
				error: "AuthRequired",
				message: "Требуется авторизация рабочего кабинета клиники.",
			});
		}

		const parsedBody = predictNoShowBodySchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Не указано, для какого пациента считать риск неявки.",
			});
		}
		const patientId =
			typeof parsedBody.data.patientId === "string"
				? parsedBody.data.patientId.trim()
				: "";
		if (!patientId) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Не указано, для какого пациента считать риск неявки.",
			});
		}

		try {
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Карта пациента не найдена в этой клинике.",
				});
			}

			const { computePatientNoShowRisk } = await import(
				"../../db/patientNoShowRiskQuery.js"
			);
			const outcome = await computePatientNoShowRisk(orgId, patientId);

			if (outcome.kind === "not_enough_history") {
				return reply.code(422).send({
					error: "NoShowRiskNotEnoughHistory",
					message:
						outcome.consideredAppointments === 0
							? "Считать риск неявки пока не на чем: у этого пациента ещё нет завершённых записей. Подтвердите запись обычным порядком."
							: "Для расчёта риска неявки нужно хотя бы две завершённые записи, а пока есть одна. Подтвердите запись обычным порядком.",
				});
			}

			return reply.status(200).send(outcome.risk);
		} catch (e) {
			request.log.error({ err: e }, "[AI] Ошибка расчёта риска неявки");
			return reply.code(500).send({
				error: "NoShowRiskFailed",
				message:
					"Не удалось посчитать риск неявки. Не считайте пациента ни надёжным, ни рискованным: подтвердите запись обычным порядком.",
			});
		}
	});
}
