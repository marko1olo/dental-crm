import {
	communicationTaskSchema,
	completeCommunicationTaskSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { communicationEvents, communicationTasks } from "../db/schema.js";

const communicationTaskValidationMessage =
	"Задача связи не закрыта: выберите задачу, сотрудника и корректный исход действия.";
const communicationTaskNotFoundMessage =
	"Задача связи не закрыта: задача не найдена или уже недоступна.";

export async function registerCommunicationRoutes(app: FastifyInstance) {
	app.post("/api/communications/tasks/complete", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"communication task complete",
			))
		)
			return;
		const parsedInput = completeCommunicationTaskSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "CommunicationTaskValidationError",
				message: communicationTaskValidationMessage,
			});
		}
		/*
		 * АРЕНДАТОР БЕРЁТСЯ ИЗ ПОДПИСАННОГО ТОКЕНА, А НЕ ИЗ ПЕРВОЙ СТРОКИ ТАБЛИЦЫ.
		 *
		 * БЫЛО: `const [org] = await db.select().from(organizations).limit(1);` —
		 * то есть `SELECT * FROM organizations LIMIT 1`. Организация не выводилась из
		 * звонящего ВООБЩЕ, ни при каком значении секрета периметра. Последствия при
		 * нескольких клиниках в одной базе, каждое замерено разведкой на живом сервере:
		 *   • задача связи закрывалась в ПЕРВОЙ организации таблицы независимо от того,
		 *     чья клиника её закрывает;
		 *   • строка в communicationEvents писалась с organizationId первой организации,
		 *     то есть в историю коммуникаций ЧУЖОЙ клиники;
		 *   • клиника, не являющаяся первой строкой, не могла закрыть даже свою задачу —
		 *     фильтр по organizationId был прибит к организации №1.
		 *
		 * ЭТО НЕ НОВЫЙ КЛАСС, А ПОСЛЕДНИЙ ЖИВОЙ ЭКЗЕМПЛЯР УЖЕ ИЗВЕСТНОГО. Три соседних
		 * файла описывают тот же анти-паттерн как ИСПРАВЛЕННЫЙ дефект и стоило это денег
		 * и клинических данных:
		 *   routes/billing.ts:371  — «Оплата любой клиники записывалась в ПЕРВУЮ
		 *                            организацию таблицы: деньги попадали в чужую кассу»;
		 *   routes/clinical.ts:57  — «Клиника Б проверяла противопоказания по НАБОРУ
		 *                            ПРАВИЛ КЛИНИКИ А»;
		 *   routes/ai.ts:90, :104, :157 — то же.
		 * Здесь он оставался живым, потому что маршрут проверял ПРАВО на изменение
		 * (requireClinicalMutationAccess) и не проверял ГРАНИЦУ АРЕНДАТОРА. Это две
		 * разные проверки, и наличие первой маскировало отсутствие второй.
		 *
		 * Взят тот же охранник, что в починенном billing.ts — requireResolvedOrganizationId,
		 * возвращающий организацию из проверенного токена либо 401. Второго способа
		 * выводить арендатора в проекте быть не должно.
		 *
		 * СОЗНАТЕЛЬНО НЕ ВЗЯТ requireResolvedStaffOrAdminOrganizationId, хотя обработчик
		 * пишет actorUserId: он дополнительно требует входа СОТРУДНИКА, то есть меняет
		 * доступ шире самого дефекта. Ужесточение доступа — отдельное решение, и делать
		 * его заодно с починкой границы арендатора нельзя.
		 *
		 * Ответ 500 NoOrganizationFound снят не по недосмотру: организации «не найтись»
		 * больше не может — при отсутствии токена охранник отвечает 401 раньше.
		 */
		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"communication task complete",
		);
		if (!organizationId) return;

		try {
			const result = await db.transaction(async (tx) => {
				const [task] = await tx
					.select()
					.from(communicationTasks)
					.where(
						and(
							eq(communicationTasks.id, parsedInput.data.taskId),
							eq(communicationTasks.organizationId, organizationId),
						),
					)
					.limit(1);

				if (!task) {
					throw new Error("Задача коммуникации не найдена");
				}

				/*
				 * БЫЛО: SELECT задачи с organizationId, а UPDATE — только по id.
				 * Defense-in-depth того же класса, что visits/appointments:
				 * чужая строка с совпавшим UUID могла сменить статус. Событие
				 * писалось с org токена даже если UPDATE задел не ту задачу.
				 * СТАЛО: organizationId в WHERE; пустой RETURNING → не пишем
				 * событие и не отдаём успех.
				 */
				const [updatedTask] = await tx
					.update(communicationTasks)
					.set({
						// biome-ignore lint/suspicious/noExplicitAny: automated suppression
						status: parsedInput.data.outcome as any,
						lastEventAt: new Date(),
					})
					.where(
						and(
							eq(communicationTasks.id, task.id),
							eq(communicationTasks.organizationId, organizationId),
						),
					)
					.returning();

				if (!updatedTask) {
					throw new Error("Задача коммуникации не найдена");
				}

				await tx.insert(communicationEvents).values({
					organizationId,
					clinicId: task.clinicId,
					taskId: task.id,
					patientId: task.patientId,
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					actorUserId: (parsedInput.data as any).actorUserId ?? null,
					channel: task.channel,
					direction: "outbound",
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					status: parsedInput.data.outcome as any,
					message:
						parsedInput.data.note ??
						`Задача переведена в статус ${parsedInput.data.outcome}`,
				});

				return updatedTask;
			});

			return communicationTaskSchema.parse(result);
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === "Задача коммуникации не найдена"
			) {
				return reply.code(404).send({
					error: "CommunicationTaskNotFound",
					reason: "task_not_found",
					message: communicationTaskNotFoundMessage,
				});
			}
			throw error;
		}
	});

	app.get("/api/settings/message-templates", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const templates = await import(
			"../db/messageTemplateCatalogsQuery.js"
		).then((m) => m.getMessageTemplateCatalogs(orgId));
		return reply.send(templates);
	});

	app.post("/api/settings/message-templates", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"create message template",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { createMessageTemplateCatalogSchema } = await import(
			"@dental/shared"
		);
		const parsedInput = createMessageTemplateCatalogSchema.safeParse(
			request.body,
		);
		if (!parsedInput.success) {
			return reply
				.code(400)
				.send({ error: "ValidationError", details: parsedInput.error.errors });
		}

		const template = await import("../db/messageTemplateCatalogsQuery.js").then(
			(m) => m.createMessageTemplateCatalog(orgId, parsedInput.data),
		);
		return reply.send(template);
	});

	app.put("/api/settings/message-templates/:id", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"update message template",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const { updateMessageTemplateCatalogSchema } = await import(
			"@dental/shared"
		);
		const parsedInput = updateMessageTemplateCatalogSchema.safeParse(
			request.body,
		);
		if (!parsedInput.success) {
			return reply
				.code(400)
				.send({ error: "ValidationError", details: parsedInput.error.errors });
		}

		try {
			const template = await import(
				"../db/messageTemplateCatalogsQuery.js"
			).then((m) =>
				m.updateMessageTemplateCatalog(orgId, id, parsedInput.data),
			);
			return reply.send(template);
		} catch (_error) {
			return reply.code(404).send({ error: "NotFound" });
		}
	});

	app.delete("/api/settings/message-templates/:id", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"delete message template",
			))
		)
			return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		try {
			await import("../db/messageTemplateCatalogsQuery.js").then((m) =>
				m.deleteMessageTemplateCatalog(orgId, id),
			);
			return reply.send({ success: true });
		} catch (_error) {
			return reply.code(404).send({ error: "NotFound" });
		}
	});

	app.get("/api/communications/recordings/:id", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const [event] = await db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.id, id),
					eq(communicationEvents.organizationId, orgId),
				),
			)
			.limit(1);

		if (!event) {
			return reply.code(404).send({ error: "NotFound" });
		}

		if (!event.recordingUrl) {
			return reply.code(404).send({
				error: "NoRecording",
				message: "This event does not have a recording attached.",
			});
		}

		return reply.send({
			id: event.id,
			recordingUrl: event.recordingUrl,
			durationSeconds: event.durationSeconds,
			audioFormat: event.audioFormat,
		});
	});

	app.get(
		"/api/communications/recordings/:id/stream",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const { id } = request.params as { id: string };
			const [event] = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.id, id),
						eq(communicationEvents.organizationId, orgId),
					),
				)
				.limit(1);

			if (!event?.recordingUrl) {
				return reply.code(404).send({ error: "NotFound" });
			}

			// Simple redirect proxy for now
			return reply.redirect(event.recordingUrl);
		},
	);
}
