import {
	communicationTaskSchema,
	completeCommunicationTaskSchema,
} from "@dental/shared";
import { and, eq, ilike, asc, desc, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess, requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { communicationEvents, communicationTasks, patients } from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import { ChatLockService } from "../services/communications/ChatLockService.js";
import { MessageTemplateEngine } from "../services/communications/MessageTemplateEngine.js";

const chatIdParamSchema = z.object({
	chatId: z.string().uuid("Идентификатор чата должен быть корректным UUID"),
});

const lockChatBodySchema = z.object({
	agentName: z.string().min(1).max(200).optional(),
	durationMinutes: z.number().int().min(1).max(60).optional(),
});

const unlockChatBodySchema = z.object({
	agentName: z.string().min(1).max(200).optional(),
	force: z.boolean().optional(),
});

const createTemplateRouteSchema = z.object({
	title: z.string().min(1, "Название шаблона обязательно"),
	channel: z.enum(["telegram", "whatsapp", "sms", "vk", "email", "max"]).default("telegram"),
	intent: z.string().default("general"),
	templateText: z.string().min(1, "Текст шаблона обязателен"),
	variables: z.array(z.string()).optional(),
	isActive: z.boolean().default(true),
});

const renderTemplateRouteSchema = z.object({
	templateId: z.string().uuid().optional(),
	templateText: z.string().optional(),
	channel: z.enum(["telegram", "whatsapp", "sms", "vk", "email", "max"]).default("telegram"),
	patientId: z.string().uuid().optional(),
	appointmentId: z.string().uuid().optional(),
	visitId: z.string().uuid().optional(),
	variables: z.record(z.any()).optional(),
	allowPreviewFallback: z.boolean().default(true),
	violationHandling: z.enum(["block", "strip"]).default("block"),
});

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
				const outcome = parsedInput.data.outcome ?? "completed";
				const taskStatus: "completed" | "needs_call" =
					outcome === "no_answer" || outcome === "callback_requested"
						? "needs_call"
						: "completed";

				const [updatedTask] = await tx
					.update(communicationTasks)
					.set({
						status: taskStatus,
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
					actorUserId: parsedInput.data.actorUserId ?? null,
					channel: task.channel,
					direction: "outbound",
					status: taskStatus,
					message:
						parsedInput.data.note ??
						`Задача переведена в статус ${outcome}`,
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
				message: "К этому событию не прикреплена аудиозапись.",
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


	// --- Omnichannel Inbox endpoints ---

	app.get("/api/communications/patients/search", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "communications patients search"))) return;
		const { q } = request.query as { q?: string };
		if (!q || q.length < 2) return reply.send([]);

		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const result = await db.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone
		})
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, orgId),
				ilike(patients.fullName, `%${q}%`)
			)
		)
		.limit(20);

		return reply.send(result);
	});

	app.get("/api/communications/inbox", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "communications inbox"))) return;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const latestEvents = await db.execute(sql`
			SELECT DISTINCT ON (e.patient_id)
				e.id,
				e.patient_id AS "patientId",
				e.message,
				e.channel,
				e.direction,
				e.created_at AS "createdAt",
				p.full_name AS "patientName",
				p.phone AS "patientPhone"
			FROM communication_events e
			JOIN patients p ON e.patient_id = p.id
			WHERE p.organization_id = ${orgId}
			ORDER BY e.patient_id, e.created_at DESC
		`);

		const summaries = latestEvents.rows.map((row: any) => ({
			id: row.id,
			patientId: row.patientId,
			message: row.message,
			channel: row.channel,
			direction: row.direction,
			createdAt: row.createdAt,
			readAt: row.createdAt,
			patientName: row.patientName,
			patientPhone: row.patientPhone,
			unreadCount: 0
		}));
		summaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		return reply.send(summaries);
	});

	app.get("/api/communications/inbox/:patientId", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "communications inbox thread"))) return;
		const { patientId } = request.params as { patientId: string };
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const events = await db.select({
			id: communicationEvents.id,
			patientId: communicationEvents.patientId,
			message: communicationEvents.message,
			channel: communicationEvents.channel,
			direction: communicationEvents.direction,
			createdAt: communicationEvents.createdAt,
			patientName: patients.fullName
		})
		.from(communicationEvents)
		.leftJoin(patients, eq(patients.id, communicationEvents.patientId))
		.where(
			and(
				eq(patients.organizationId, orgId),
				eq(communicationEvents.patientId, patientId)
			)
		)
		.orderBy(asc(communicationEvents.createdAt));

		return reply.send(events.map(e => ({
			id: e.id,
			patientId: e.patientId,
			message: e.message,
			channel: e.channel,
			direction: e.direction,
			createdAt: e.createdAt,
			patientName: e.patientName,
			readAt: e.createdAt
		})));
	});

	app.post("/api/communications/inbox/:patientId/send", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "communications send message"))) return;
		const { patientId } = request.params as { patientId: string };
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { message, channel } = request.body as { message: string, channel: string };

		const inserted = await db.insert(communicationEvents).values({
			organizationId: orgId,
			patientId: patientId,
			channel: channel as any,
			direction: "outbound",
			status: "sent",
			message: message,
		}).returning();

		return reply.send({ success: true, event: inserted[0] });
	});

	// --- Collaborative Chat Concurrency Locking (PostgreSQL 18 collaborative_chat_processing_states) ---

	/**
	 * POST /api/communications/chats/:chatId/lock
	 * Эксклюзивный захват чата оператором на 5 минут с защитой от состояния гонки (ACID pg_advisory_xact_lock + FOR UPDATE).
	 */
	app.post("/api/communications/chats/:chatId/lock", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"communications lock chat",
			))
		)
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"communications lock chat",
		);
		if (!organizationId) return;

		const paramResult = chatIdParamSchema.safeParse(request.params);
		if (!paramResult.success) {
			return reply.code(400).send({
				error: "InvalidChatIdError",
				message: "Идентификатор чата должен быть корректным UUID.",
			});
		}

		const bodyResult = lockChatBodySchema.safeParse(request.body ?? {});
		if (!bodyResult.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры блокировки чата.",
			});
		}

		const identity = getRequestIdentity(request);
		const agentName =
			bodyResult.data?.agentName?.trim() ||
			identity.fullName?.trim() ||
			"Оператор";

		const result = await ChatLockService.acquireLock({
			organizationId,
			chatId: paramResult.data.chatId,
			agentName,
			durationMinutes: bodyResult.data?.durationMinutes ?? 5,
		});

		if (!result.success) {
			return reply.code(409).send({
				error: "ChatAlreadyLockedError",
				message: result.message,
				lockedByAgent: result.lockedByAgent,
				expiresAtIso: result.expiresAtIso,
			});
		}

		return reply.code(200).send({
			success: true,
			chatId: result.lock.chatId,
			lockedByAgent: result.lock.lockedByAgent,
			lockAcquiredAt: result.lock.lockAcquiredAt,
			lockExpiresAt: result.lock.lockExpiresAt,
			expiresAtIso: result.lock.expiresAtIso,
		});
	});

	/**
	 * POST /api/communications/chats/:chatId/heartbeat
	 * Продление блокировки чата активным оператором.
	 */
	app.post(
		"/api/communications/chats/:chatId/heartbeat",
		async (request, reply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"communications heartbeat chat",
				))
			)
				return;

			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications heartbeat chat",
			);
			if (!organizationId) return;

			const paramResult = chatIdParamSchema.safeParse(request.params);
			if (!paramResult.success) {
				return reply.code(400).send({
					error: "InvalidChatIdError",
					message: "Идентификатор чата должен быть корректным UUID.",
				});
			}

			const bodyResult = lockChatBodySchema.safeParse(request.body ?? {});
			if (!bodyResult.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры продления блокировки чата.",
				});
			}

			const identity = getRequestIdentity(request);
			const agentName =
				bodyResult.data?.agentName?.trim() ||
				identity.fullName?.trim() ||
				"Оператор";

			const result = await ChatLockService.heartbeatLock({
				organizationId,
				chatId: paramResult.data.chatId,
				agentName,
				durationMinutes: bodyResult.data?.durationMinutes ?? 5,
			});

			if (!result.success) {
				return reply.code(409).send({
					error:
						result.reason === "lock_expired"
							? "ChatLockExpiredError"
							: "ChatLockMismatchError",
					message: result.message,
				});
			}

			return reply.code(200).send({
				success: true,
				chatId: result.chatId,
				lockedByAgent: result.lockedByAgent,
				lockExpiresAt: result.lockExpiresAt,
				expiresAtIso: result.expiresAtIso,
			});
		},
	);

	/**
	 * POST /api/communications/chats/:chatId/unlock
	 * Явное освобождение блокировки оператором.
	 */
	app.post(
		"/api/communications/chats/:chatId/unlock",
		async (request, reply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"communications unlock chat",
				))
			)
				return;

			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications unlock chat",
			);
			if (!organizationId) return;

			const paramResult = chatIdParamSchema.safeParse(request.params);
			if (!paramResult.success) {
				return reply.code(400).send({
					error: "InvalidChatIdError",
					message: "Идентификатор чата должен быть корректным UUID.",
				});
			}

			const bodyResult = unlockChatBodySchema.safeParse(request.body ?? {});
			if (!bodyResult.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры освобождения блокировки чата.",
				});
			}

			const identity = getRequestIdentity(request);
			const agentName =
				bodyResult.data?.agentName?.trim() ||
				identity.fullName?.trim() ||
				null;

			const result = await ChatLockService.releaseLock({
				organizationId,
				chatId: paramResult.data.chatId,
				agentName,
				force: bodyResult.data?.force ?? false,
			});

			if (!result.success) {
				return reply.code(409).send({
					error: "ChatLockMismatchError",
					message: result.message,
					lockedByAgent: result.lockedByAgent,
				});
			}

			return reply.code(200).send({
				success: true,
				chatId: result.chatId,
				released: result.released,
			});
		},
	);

	/**
	 * GET /api/communications/chats/:chatId/lock-status
	 * Проверка статуса блокировки чата.
	 */
	app.get(
		"/api/communications/chats/:chatId/lock-status",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"communications get chat lock status",
				))
			)
				return;

			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications get chat lock status",
			);
			if (!organizationId) return;

			const paramResult = chatIdParamSchema.safeParse(request.params);
			if (!paramResult.success) {
				return reply.code(400).send({
					error: "InvalidChatIdError",
					message: "Идентификатор чата должен быть корректным UUID.",
				});
			}

			const status = await ChatLockService.getLockStatus({
				organizationId,
				chatId: paramResult.data.chatId,
			});

			return reply.code(200).send(status);
		},
	);

	// ────────────────────────────────────────────────────────────
	// 152-ФЗ / 323-ФЗ: ШАБЛОНЫ СООБЩЕНИЙ И БЕЗОПАСНЫЙ РЕНДЕРИНГ
	// ────────────────────────────────────────────────────────────

	/**
	 * GET /api/communications/templates
	 * Получение каталога шаблонов сообщений клиники
	 */
	app.get("/api/communications/templates", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "list communication templates")))
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"list communication templates",
		);
		if (!organizationId) return;

		const query = request.query as { channel?: string; intent?: string; isActive?: string };
		const isActive =
			query.isActive === "true" ? true : query.isActive === "false" ? false : undefined;

		const templates = await MessageTemplateEngine.listTemplates(organizationId, {
			channel: query.channel ?? undefined,
			intent: query.intent ?? undefined,
			isActive,
		});

		return reply.send({
			success: true,
			templates,
		});
	});

	/**
	 * POST /api/communications/templates
	 * Создание нового шаблона сообщения с валидацией 152-ФЗ / 323-ФЗ ст. 13
	 */
	app.post("/api/communications/templates", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "create communication template")))
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"create communication template",
		);
		if (!organizationId) return;

		const parsed = createTemplateRouteSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры шаблона сообщения.",
				details: parsed.error.format(),
			});
		}

		try {
			const template = await MessageTemplateEngine.createTemplate(organizationId, {
				title: parsed.data.title,
				channel: parsed.data.channel,
				intent: parsed.data.intent,
				templateText: parsed.data.templateText,
				variables: parsed.data.variables ?? undefined,
				isActive: parsed.data.isActive,
			});
			return reply.code(201).send({
				success: true,
				template,
			});
		} catch (err: any) {
			return reply.code(422).send({
				error: "MedicalSecrecyInTemplateError",
				message: err.message || "Ошибка создания шаблона сообщения",
			});
		}
	});

	/**
	 * POST /api/communications/templates/render
	 * Безопасный рендеринг шаблона с подстановкой макросов и защитой от утечки врачебной тайны
	 */
	app.post("/api/communications/templates/render", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "render communication template")))
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"render communication template",
		);
		if (!organizationId) return;

		const parsed = renderTemplateRouteSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры для рендеринга шаблона.",
				details: parsed.error.format(),
			});
		}

		const result = await MessageTemplateEngine.render(organizationId, {
			templateId: parsed.data.templateId ?? undefined,
			templateText: parsed.data.templateText ?? undefined,
			channel: parsed.data.channel,
			patientId: parsed.data.patientId ?? undefined,
			appointmentId: parsed.data.appointmentId ?? undefined,
			visitId: parsed.data.visitId ?? undefined,
			variables: parsed.data.variables ?? undefined,
			allowPreviewFallback: parsed.data.allowPreviewFallback,
			violationHandling: parsed.data.violationHandling,
		});

		if (result.hasMedicalSecrecyViolation && parsed.data.violationHandling === "block") {
			return reply.code(422).send({
				error: "MedicalSecrecyViolation",
				message: result.error,
				result,
			});
		}

		return reply.send({
			success: true,
			result,
		});
	});
}
