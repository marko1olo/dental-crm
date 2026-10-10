/**
 * messagingServiceHandlers.ts — Layer 2: 1-on-1 Messaging, Inbox & Chat Concurrency Locking Handlers.
 *
 * Implements:
 * - Communication task completion with strict tenant isolation and audit events
 * - Omnichannel patient search and inbox message threads
 * - 152-FZ / 323-FZ Art. 13 medical secrecy guards blocking marketers and protecting archived patients
 * - Rapid double-click protection (15s idempotency)
 * - Collaborative Chat Concurrency Locking (PostgreSQL 18 pg_advisory_xact_lock & FOR UPDATE)
 */

import {
	communicationTaskSchema,
	completeCommunicationTaskSchema,
} from "@dental/shared";
import { and, asc, eq, gt, ilike, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	communicationEvents,
	communicationTasks,
	patients,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { ChatLockService } from "../../services/communications/ChatLockService.js";
import { MessageTemplateEngine } from "../../services/communications/MessageTemplateEngine.js";
import {
	UUID_REGEX,
	chatIdParamSchema,
	communicationTaskNotFoundMessage,
	communicationTaskValidationMessage,
	lockChatBodySchema,
	sendMessageSchema,
	unlockChatBodySchema,
} from "./types.js";

export async function registerMessagingServiceHandlers(
	app: FastifyInstance,
): Promise<void> {
	app.post("/api/communications/tasks/complete", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"communication task complete",
			))
		)
			return;
		const parsedInput = completeCommunicationTaskSchema.safeParse(
			request.body,
		);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "CommunicationTaskValidationError",
				message: communicationTaskValidationMessage,
			});
		}

		/*
		 * АРЕНДАТОР БЕРЁТСЯ ИЗ ПОДПИСАННОГО ТОКЕНА, А НЕ ИЗ ПЕРВОЙ СТРОКИ ТАБЛИЦЫ.
		 * Был устранен антипаттерн `SELECT * FROM organizations LIMIT 1`.
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

			return communicationTaskSchema.parse({
				...result,
				dueAt:
					result.dueAt instanceof Date
						? result.dueAt.toISOString()
						: String(result.dueAt),
				createdAt:
					result.createdAt instanceof Date
						? result.createdAt.toISOString()
						: String(result.createdAt),
				lastEventAt:
					result.lastEventAt instanceof Date
						? result.lastEventAt.toISOString()
						: result.lastEventAt
							? String(result.lastEventAt)
							: null,
			});
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

	// --- Omnichannel Inbox endpoints ---

	app.get("/api/communications/patients/search", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"communications patients search",
			))
		)
			return;
		const { q } = request.query as { q?: string };
		if (!q || q.length < 2) return reply.send([]);

		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const result = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, orgId),
					ilike(patients.fullName, `%${q}%`),
				),
			)
			.limit(20);

		return reply.send(result);
	});

	app.get("/api/communications/inbox", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"communications inbox",
			))
		)
			return reply;
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return reply;

		// 152-ФЗ / 323-ФЗ ст. 13: Запрет маркетологам на просмотр переписки пациентов
		const identity = getRequestIdentity(request);
		if (identity.role === "marketer" || identity.role === "marketing") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "communications.inbox.read",
				role: identity.role,
				message:
					"Доступ к личным сообщениям пациентов для маркетологов ограничен 152-ФЗ и 323-ФЗ ст. 13.",
			});
		}

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
			unreadCount: 0,
		}));
		summaries.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

		return reply.send(summaries);
	});

	app.get("/api/communications/inbox/:patientId", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"communications inbox thread",
			))
		)
			return;
		const { patientId } = request.params as { patientId: string };
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ ст. 13: Маркетолог не имеет права читать диалог пациента
		const identity = getRequestIdentity(request);
		if (identity.role === "marketer" || identity.role === "marketing") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "communications.inbox.read",
				role: identity.role,
				message:
					"Доступ к диалогу пациента для маркетологов ограничен 152-ФЗ и 323-ФЗ ст. 13.",
			});
		}

		// Проверяем существование пациента в данной клинике (Tenant Isolation)
		const [patient] = await db
			.select({ id: patients.id, status: patients.status })
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		// Защита архивированного пациента: неклинический персонал не может читать переписку списанного в архив пациента
		if (patient.status === "archived") {
			const reqAny = request as unknown as { user?: { role?: string | null } };
			const staffRole = identity.role ?? reqAny.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.communications",
					role: staffRole,
					message:
						"Отказ в доступе к сообщениям архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): переписка списанного в архив пациента защищена.",
				});
			}
		}

		const events = await db
			.select({
				id: communicationEvents.id,
				patientId: communicationEvents.patientId,
				message: communicationEvents.message,
				channel: communicationEvents.channel,
				direction: communicationEvents.direction,
				createdAt: communicationEvents.createdAt,
				patientName: patients.fullName,
			})
			.from(communicationEvents)
			.leftJoin(patients, eq(patients.id, communicationEvents.patientId))
			.where(
				and(
					eq(patients.organizationId, orgId),
					eq(communicationEvents.patientId, patientId),
				),
			)
			.orderBy(asc(communicationEvents.createdAt));

		return reply.send(
			events.map((e) => ({
				id: e.id,
				patientId: e.patientId,
				message: e.message,
				channel: e.channel,
				direction: e.direction,
				createdAt: e.createdAt,
				patientName: e.patientName,
				readAt: e.createdAt,
			})),
		);
	});

	app.post(
		"/api/communications/inbox/:patientId/send",
		async (request, reply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"communications send message",
				))
			)
				return;
			const { patientId } = request.params as { patientId: string };
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const identity = getRequestIdentity(request);
			if (identity.role === "marketer" || identity.role === "marketing") {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "communications.inbox.send",
					role: identity.role,
					message:
						"Отправка сообщений в личный диалог пациента маркетологам запрещена (152-ФЗ / 323-ФЗ ст. 13).",
				});
			}

			if (!UUID_REGEX.test(patientId)) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента.",
				});
			}

			const [patient] = await db
				.select({ id: patients.id, status: patients.status })
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				)
				.limit(1);
			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в клинике.",
				});
			}

			if (patient.status === "archived") {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.communications",
					message:
						"Отказ в отправке сообщения архивированному пациенту (152-ФЗ / 323-ФЗ ст. 13).",
				});
			}

			const bodyParsed = sendMessageSchema.safeParse(request.body);
			if (!bodyParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						bodyParsed.error.issues[0]?.message ||
						"Некорректные параметры сообщения.",
					details: bodyParsed.error.issues,
				});
			}

			const {
				message,
				channel: resolvedChannel,
				idempotencyKey,
			} = bodyParsed.data;

			const secrecy =
				MessageTemplateEngine.detectMedicalSecrecyLeaks(message);
			if (secrecy.hasLeak) {
				return reply.code(422).send({
					error: "MedicalSecrecyViolation",
					message: `Отправка сведений о здоровье, диагнозов или формулы зубов по открытым каналам связи запрещена (152-ФЗ / 323-ФЗ ст. 13): ${secrecy.reasons.join("; ")}`,
					detectedTerms: secrecy.detectedTerms,
				});
			}

			// 15-second idempotency check to protect against rapid double-clicks
			const fifteenSecAgo = new Date(Date.now() - 15 * 1000);
			const trimmedMessage = message.trim();
			const recentEvents = await db
				.select({
					id: communicationEvents.id,
					createdAt: communicationEvents.createdAt,
				})
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, orgId),
						eq(communicationEvents.patientId, patientId),
						eq(communicationEvents.channel, resolvedChannel),
						eq(communicationEvents.direction, "outbound"),
						eq(communicationEvents.message, trimmedMessage),
						gt(communicationEvents.createdAt, fifteenSecAgo),
					),
				)
				.limit(1);

			if (recentEvents.length > 0) {
				return reply.send({
					success: true,
					duplicate: true,
					event: recentEvents[0],
					message:
						"Сообщение уже отправлено (защита от повторной отправки)",
				});
			}

			const messageToStore = idempotencyKey
				? `${trimmedMessage} [idempotency:${idempotencyKey}]`
				: trimmedMessage;

			const inserted = await db
				.insert(communicationEvents)
				.values({
					organizationId: orgId,
					patientId: patientId,
					channel: resolvedChannel,
					direction: "outbound",
					status: "sent",
					message: messageToStore,
				})
				.returning();

			return reply.send({ success: true, event: inserted[0] });
		},
	);

	// --- Collaborative Chat Concurrency Locking (PostgreSQL 18 collaborative_chat_processing_states) ---

	/**
	 * POST /api/communications/chats/:chatId/lock
	 * Эксклюзивный захват чата оператором на 5 минут с защитой от состояния гонки.
	 */
	app.post(
		"/api/communications/chats/:chatId/lock",
		async (request, reply) => {
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
		},
	);

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

			const bodyResult = unlockChatBodySchema.safeParse(
				request.body ?? {},
			);
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
}
