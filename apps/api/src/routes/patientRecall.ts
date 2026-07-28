/**
 * Возврат пациентов: кого пора пригласить и как их пригласить.
 *
 * ЧТО БЫЛО. Экран «потерянные пациенты» читал таблицу lost_patients_filters, в
 * которую никто ничего не пишет — проверено поиском по всем исходникам. Список
 * был снимком, сделанным неизвестно когда, и обновиться не мог.
 *
 * ДОСТУП: чтение списка — patients.read, отправка приглашения — communications
 * .write. Приглашение уходит в общую очередь и проходит там обычную проверку
 * согласия: это реклама услуги (ФЗ «О рекламе» ст. 18 ч. 1), а не сообщение по
 * действующему договору.
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireClinicalMutationContext, requireClinicalReadContext } from "../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import { findRecallCandidates, recallCandidateBelongsTo } from "../services/patients/recallCandidates.js";
import { enqueueMessage } from "../services/communications/dispatcher.js";
import { isMachineDeliverableChannel } from "../services/communications/channelRouter.js";

const listQuerySchema = z.object({
	minMonths: z.coerce.number().int().min(1).max(60).optional(),
	limit: z.coerce.number().int().min(1).max(1000).optional(),
	includeNeverArrived: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => (value === undefined ? undefined : value === "true"))
});

const inviteSchema = z.object({
	patientId: z.string().uuid(),
	channel: z.string().min(2).max(20),
	/** Текст готовит вызывающий: подстановка переменных уже выполнена. */
	body: z.string().trim().min(5).max(2000)
});

function badRequest(reply: FastifyReply, message: string) {
	return reply.code(400).send({ error: "RecallValidationError", message });
}

export async function registerPatientRecallRoutes(app: FastifyInstance) {
	/** Список тех, кого пора звать. Считается при каждом запросе. */
	app.get("/api/patients/recall-candidates", async (request, reply) => {
		const context = await requireClinicalReadContext(request, reply, "recall candidates");
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "patients.read")) return;

		const parsed = listQuerySchema.safeParse(request.query);
		if (!parsed.success) return badRequest(reply, "Проверьте параметры: срок в месяцах и предел списка.");

		const options: { minMonths?: number; limit?: number; includeNeverArrived?: boolean } = {};
		if (parsed.data.minMonths !== undefined) options.minMonths = parsed.data.minMonths;
		if (parsed.data.limit !== undefined) options.limit = parsed.data.limit;
		if (parsed.data.includeNeverArrived !== undefined) options.includeNeverArrived = parsed.data.includeNeverArrived;

		return findRecallCandidates(context.organizationId, options);
	});

	/**
	 * Приглашение одному пациенту.
	 *
	 * По одному, а не пачкой, намеренно: массовая отправка живёт в рассылках,
	 * где есть обязательный предпросмотр и снимок аудитории. Здесь администратор
	 * зовёт конкретного человека, глядя на его карточку.
	 */
	app.post("/api/patients/recall-candidates/invite", async (request, reply) => {
		const context = await requireClinicalMutationContext(request, reply, "recall invite");
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.write")) return;

		const parsed = inviteSchema.safeParse(request.body);
		if (!parsed.success) return badRequest(reply, "Укажите пациента, канал и текст приглашения.");

		if (!isMachineDeliverableChannel(parsed.data.channel)) {
			return badRequest(
				reply,
				`Канал «${parsed.data.channel}» не отправляется автоматически — по нему нужно позвонить или пригласить лично.`
			);
		}

		if (!(await recallCandidateBelongsTo(context.organizationId, parsed.data.patientId))) {
			return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден в этой клинике." });
		}

		/*
		 * Ключ повтора привязан к месяцу: одного и того же человека нельзя звать
		 * дважды за месяц, даже если администратор нажал кнопку повторно или
		 * список открыт в двух вкладках. Год и месяц берутся из текущей даты —
		 * следующий месяц откроет возможность позвать снова, и это осознанно:
		 * приглашение раз в месяц — предел приличия, чаще это давление.
		 */
		const now = new Date();
		const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

		const result = await enqueueMessage({
			organizationId: context.organizationId,
			patientId: parsed.data.patientId,
			channel: parsed.data.channel as never,
			intent: "recall",
			// Реклама услуги, а не сообщение по договору: согласие проверяется
			// диспетчером перед отправкой, и без него сообщение не уйдёт.
			scope: "marketing",
			body: parsed.data.body,
			dedupeKey: `recall:${parsed.data.patientId}:${period}`
		});

		if (!result.ok) return badRequest(reply, result.reason);

		return {
			ok: true,
			outboxId: result.outboxId,
			duplicate: result.duplicate,
			message: result.duplicate
				? "Этого пациента уже приглашали в этом месяце — второе сообщение не отправлено."
				: "Приглашение поставлено в очередь. Оно уйдёт, если пациент давал согласие на такие сообщения."
		};
	});
}

export default registerPatientRecallRoutes;
