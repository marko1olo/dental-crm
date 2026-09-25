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
import {
	recallBandSchema,
	recallCandidateSchema,
	recallReportSchema,
	recallInviteSchema,
	recallInviteResultSchema,
	type RecallBand,
	type RecallReport,
	type RecallInviteRequest,
	type RecallInviteResponse,
} from "@dental/shared/recalls";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import { isMachineDeliverableChannel } from "../services/communications/channelRouter.js";
import { enqueueMessage } from "../services/communications/dispatcher.js";
import {
	findRecallCandidates,
	recallCandidateBelongsTo,
	type RecallOptions,
} from "../services/patients/recallCandidates.js";

export {
	recallBandSchema,
	recallCandidateSchema,
	recallReportSchema,
	recallInviteSchema,
	recallInviteResultSchema,
	type RecallBand,
	type RecallReport,
	type RecallInviteRequest,
	type RecallInviteResponse,
};

const listQuerySchema = z.object({
	minMonths: z.coerce.number().int().min(1).max(60).optional(),
	limit: z.coerce.number().int().min(1).max(1000).optional(),
	band: recallBandSchema.optional(),
	filterBand: recallBandSchema.optional(),
	includeNeverArrived: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => (value === undefined ? undefined : value === "true")),
});

const inviteSchema = recallInviteSchema;

function badRequest(reply: FastifyReply, message: string) {
	return reply.code(400).send({ error: "RecallValidationError", message });
}

export async function registerPatientRecallRoutes(app: FastifyInstance) {
	/** Список тех, кого пора звать. Считается при каждом запросе. */
	app.get(
		"/api/patients/recall-candidates",
		{
			schema: {
				summary: "Список кандидатов на профилактический осмотр и диспансеризацию",
				tags: ["patients", "recalls"],
				querystring: {
					type: "object",
					properties: {
						minMonths: { type: "integer", minimum: 1, maximum: 60 },
						limit: { type: "integer", minimum: 1, maximum: 1000 },
						band: {
							type: "string",
							enum: ["due", "overdue", "probably_lost", "never_arrived"],
						},
						filterBand: {
							type: "string",
							enum: ["due", "overdue", "probably_lost", "never_arrived"],
						},
						includeNeverArrived: { type: "string", enum: ["true", "false"] },
					},
				},
			},
		},
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"recall candidates",
			);
			if (!context) return;
			if (!enforcePermissionWhenStaffKnown(request, reply, "patients.read"))
				return;

			const parsed = listQuerySchema.safeParse(request.query);
			if (!parsed.success)
				return badRequest(
					reply,
					"Проверьте параметры: срок в месяцах, полосу (band) и предел списка.",
				);

			const options: RecallOptions = {
				...(parsed.data.minMonths !== undefined ? { minMonths: parsed.data.minMonths } : {}),
				...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
				...(parsed.data.includeNeverArrived !== undefined ? { includeNeverArrived: parsed.data.includeNeverArrived } : {}),
				...(parsed.data.band !== undefined ? { band: parsed.data.band } : {}),
				...(parsed.data.filterBand !== undefined ? { filterBand: parsed.data.filterBand } : {}),
			};

			const report: RecallReport = await findRecallCandidates(
				context.organizationId,
				options,
			);
			return reply.code(200).send(report);
		},
	);

	/**
	 * Приглашение одному пациенту.
	 *
	 * По одному, а не пачкой, намеренно: массовая отправка живёт в рассылках,
	 * где есть обязательный предпросмотр и снимок аудитории. Здесь администратор
	 * зовёт конкретного человека, глядя на его карточку.
	 */
	app.post("/api/patients/recall-candidates/invite", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"recall invite",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const parsed = inviteSchema.safeParse(request.body);
		if (!parsed.success)
			return badRequest(reply, "Укажите пациента, канал и текст приглашения.");

		if (!isMachineDeliverableChannel(parsed.data.channel)) {
			return badRequest(
				reply,
				`Канал «${parsed.data.channel}» не отправляется автоматически — по нему нужно позвонить или пригласить лично.`,
			);
		}

		if (
			!(await recallCandidateBelongsTo(
				context.organizationId,
				parsed.data.patientId,
			))
		) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
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
			dedupeKey: `recall:${parsed.data.patientId}:${period}`,
		});

		if (!result.ok) return badRequest(reply, result.reason);

		return {
			ok: true,
			outboxId: result.outboxId,
			duplicate: result.duplicate,
			message: result.duplicate
				? "Этого пациента уже приглашали в этом месяце — второе сообщение не отправлено."
				: "Приглашение поставлено в очередь. Оно уйдёт, если пациент давал согласие на такие сообщения.",
		};
	});
}
