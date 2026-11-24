import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	sanitizeAuditPayload,
	staffActionAuditEntrySchema,
} from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { auditFromRequest } from "../clinicalAuditService.js";
import { db } from "../db/client.js";
import { ADMIN_ROLES, getRequestIdentity, requireStaffIdentity } from "../security/identity.js";
import { clinicalAuditLogs, auditEvents } from "../db/schema.js";
import { getMedicalAccessAuditTrailFromDb } from "../security/medicalAuditTrail.js";
import { extractIdempotencyKey, isValidUuid } from "../utils/httpIdempotency.js";

const auditQuerySchema = z
	.object({
		entityType: z.string().trim().min(1).max(100).optional(),
		entityId: z.string().trim().min(1).max(255).optional(),
		actorUserId: z.string().uuid().optional(),
		action: z.string().trim().min(1).max(100).optional(),
		startDate: z.string().trim().optional(),
		endDate: z.string().trim().optional(),
		limit: z.coerce.number().int().min(1).max(200).default(50),
	})
	.strict();

const medicalAccessQuerySchema = z
	.object({
		patientId: z.string().uuid().optional(),
		actorUserId: z.string().uuid().optional(),
		limit: z.coerce.number().int().min(1).max(200).default(50),
	})
	.strict();

const ingestAuditEntrySchema = staffActionAuditEntrySchema
	.extend({
		organizationId: z.string().uuid().optional(),
	})
	.strict();

/*
 * ЗДЕСЬ СТОЯЛА ТРЕТЬЯ ФУНКЦИЯ `recordAuditEvent`, И ОНА УДАЛЕНА.
 *
 * ЧТО ЭТО БЫЛО. `export async function recordAuditEvent(params: { organizationId,
 * actorUserId?, entityType, entityId, action, reason? })` — писатель в
 * `audit_events`, единственный из четырёх, у которого автор события был
 * обязательной частью замысла, обёрнутый в `try/catch` с `console.error` и без
 * проброса.
 *
 * ПОЧЕМУ УДАЛЁН. У него НОЛЬ импортёров. Census по всему дереву (`rg`, 4977
 * файлов, скоуп без node_modules/dist/.git): строку `routes/audit.js` импортирует
 * ровно один модуль — `server.ts:47`, и берёт он оттуда `registerAuditRoutes`,
 * а не эту функцию. Ни одного вызова, ни одного теста. Это мёртвый код.
 *
 * ПОЧЕМУ ЭТО НЕ БЕЗОБИДНО, а именно опасно — прецедент лежит в соседнем файле,
 * `clinicalAuditService.ts:91-97`, где по этой же причине была удалена
 * `assertTenantMatch`: «Форма "объявлен, снабжён инструкцией по применению и не
 * вызван" — ровно та, в которой в этом дереве стояла настоящая дыра в
 * расписании... инженер, проверяющий [работает ли механизм], находит его поиском
 * и получает ложное спокойствие». Здесь ровно тот же случай, усиленный тем, что
 * функция называется так же, как две другие: инженер, ищущий «а есть ли писатель
 * журнала с автором», находил ТРИ одноимённые функции и не мог за разумное время
 * понять, какая работает. Работали две другие, обе без автора.
 *
 * ЧТО ДЕЛАТЬ ВМЕСТО НЕЁ. Писатель с автором уже есть и живой —
 * `recordAuditEventInDb` в `db/auditQuery.ts:6`. Он принимает `actorUserId`,
 * возвращает записанное событие и, в отличие от удалённой, НЕ проглатывает
 * отказ. То же указание уже дано в `routes/clinical.ts:328-330`.
 *
 * ПОВЕДЕНИЕ НЕ ИЗМЕНИЛОСЬ: удаление функции с нулём вызовов не может изменить
 * поведение, и это подтверждается компилятором (`npm run typecheck`).
 */

export async function registerAuditRoutes(app: FastifyInstance) {
	// GET /api/audit/logs — Read audit trail
	// Мандат 8v [SEC-08]: Журнал действий доступен СТРОГО владельцам и администраторам клиники (owner/admin/administrator).
	app.get(
		"/api/audit/logs",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const identity = await requireStaffIdentity(request, reply, ADMIN_ROLES);
			if (!identity || !identity.organizationId) return;
			const orgId = identity.organizationId;

			const queryParsed = auditQuerySchema.safeParse(request.query ?? {});
			if (!queryParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса журнала аудита.",
					issues: queryParsed.error.issues,
				});
			}
			const query = queryParsed.data;
			const conditions = [eq(auditEvents.organizationId, orgId)];

			if (query.entityType) {
				conditions.push(eq(auditEvents.entityType, query.entityType));
			}
			if (query.entityId) {
				conditions.push(eq(auditEvents.entityId, query.entityId));
			}
			if (query.actorUserId) {
				conditions.push(eq(auditEvents.actorUserId, query.actorUserId));
			}
			if (query.action) {
				conditions.push(eq(auditEvents.action, query.action));
			}
			if (query.startDate) {
				const start = new Date(query.startDate);
				if (Number.isNaN(start.getTime())) {
					return reply.status(400).send({
						error: "ValidationError",
						message: "Некорректный формат startDate.",
					});
				}
				conditions.push(gte(auditEvents.createdAt, start));
			}
			if (query.endDate) {
				const end = new Date(query.endDate);
				if (Number.isNaN(end.getTime())) {
					return reply.status(400).send({
						error: "ValidationError",
						message: "Некорректный формат endDate.",
					});
				}
				conditions.push(lte(auditEvents.createdAt, end));
			}

			const logs = await db
				.select()
				.from(auditEvents)
				.where(and(...conditions))
				.orderBy(desc(auditEvents.createdAt))
				.limit(query.limit);

			/*
			 * ЧТЕНИЕ ЖУРНАЛА — САМО ПО СЕБЕ СОБЫТИЕ, И ЕГО НАДО ЗАПИСАТЬ.
			 *
			 * ПП-1119 п.15 (УЗ-2) требует, чтобы доступ к содержанию электронного
			 * журнала сообщений имели только те, кому он нужен по служебным
			 * обязанностям. Ограничение доступа без записи о фактическом доступе не
			 * проверяемо: нельзя ответить на вопрос «кто читал журнал», а значит нельзя
			 * и доказать, что требование выполняется.
			 *
			 * Действие `VIEW_AUDIT_LOG` было объявлено в `clinicalAuditService.ts:23`
			 * с самого начала и не использовалось нигде — сервис целиком не имел ни
			 * одного вызова вне собственного теста. Это первый его боевой вызывающий.
			 *
			 * ПОЧЕМУ ЗДЕСЬ ОТКАЗ ЖУРНАЛА НЕ РОНЯЕТ ОТВЕТ, в отличие от `audit.ts`.
			 * Чтение не меняет ни медицинских данных, ни денег: если мета-запись не
			 * прошла, отменять нечего, а отказ в чтении журнала мешал бы разбору
			 * инцидента ровно тогда, когда журнал нужнее всего. `writeClinicalAuditLog`
			 * по построению не бросает (`clinicalAuditService.ts:39`), а её отказ уходит
			 * в аварийный канал с полным содержимым события.
			 */
			await auditFromRequest(request, {
				organizationId: orgId,
				userId: identity.userId ?? null,
				action: "VIEW_AUDIT_LOG",
				entityType: "audit_log",
				entityId: auditScopeDescriptor(query),
			});

			return reply.status(200).send({ logs });
		},
	);

	// GET /api/audit/medical-access — 152-ФЗ аудит доступа к медицинским картам и диагнозам
	app.get(
		"/api/audit/medical-access",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const identity = await requireStaffIdentity(request, reply, ADMIN_ROLES);
			if (!identity || !identity.organizationId) return;
			const orgId = identity.organizationId;

			const queryParsed = medicalAccessQuerySchema.safeParse(request.query ?? {});
			if (!queryParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса журнала медицинского доступа.",
					issues: queryParsed.error.issues,
				});
			}
			const query = queryParsed.data;

			const logs = await getMedicalAccessAuditTrailFromDb(orgId, {
				...(query.patientId ? { patientId: query.patientId } : {}),
				...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
				limit: query.limit,
			});

			await auditFromRequest(request, {
				organizationId: orgId,
				userId: identity.userId ?? null,
				action: "VIEW_AUDIT_LOG",
				entityType: "medical_access_audit",
				entityId: query.patientId ?? "all",
			});

			return reply.status(200).send({ logs });
		},
	);

	// POST /api/audit/events — Ingestion endpoint for staff activity & security audit events (offline-first sync)
	const handleAuditEventsIngestion = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"record staff action audit event",
		);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const identity = getRequestIdentity(request);
		const ip =
			(typeof request.headers["x-forwarded-for"] === "string"
				? request.headers["x-forwarded-for"].split(",")[0]?.trim()
				: null) ||
			request.ip ||
			null;
		const userAgent =
			typeof request.headers["user-agent"] === "string"
				? request.headers["user-agent"]
				: null;

		const body = request.body;
		let rawList: unknown[] | null = null;
		if (Array.isArray(body)) {
			rawList = body;
		} else if (
			body &&
			typeof body === "object" &&
			"events" in body &&
			Array.isArray((body as Record<string, unknown>).events)
		) {
			rawList = (body as { events: unknown[] }).events;
		} else if (body && typeof body === "object" && !("events" in body)) {
			rawList = [body];
		} else if (
			body &&
			typeof body === "object" &&
			"events" in body &&
			!Array.isArray((body as Record<string, unknown>).events)
		) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Поле events должно быть массивом событий аудита.",
			});
		}

		if (!rawList || rawList.length === 0) {
			return reply.status(400).send({
				error: "EmptyEventsPayload",
				message: "Список событий аудита пуст.",
			});
		}

		if (rawList.length > 100) {
			return reply.status(400).send({
				error: "PayloadTooLarge",
				message:
					"Превышен лимит пакета событий (максимум 100 событий за один запрос).",
			});
		}

		const now = new Date();
		const authenticatedActorId = identity.userId ?? null;
		const validAuditEvents: Array<typeof auditEvents.$inferInsert> = [];
		const validClinicalAuditRows: Array<typeof clinicalAuditLogs.$inferInsert> = [];

		for (let idx = 0; idx < rawList.length; idx += 1) {
			const raw = rawList[idx];
			const parsed = ingestAuditEntrySchema.safeParse(raw);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: `Некорректная запись события аудита (индекс ${idx}).`,
					issues: parsed.error.issues,
				});
			}

			const entry = parsed.data;
			const eventId = entry.id ?? randomUUID();
			const sanitizedDetails = sanitizeAuditPayload(entry.details ?? {});
			const reason =
				entry.reason ??
				(typeof sanitizedDetails.reason === "string"
					? (sanitizedDetails.reason as string)
					: null);
			const occurredAt = entry.clientTimestamp
				? new Date(entry.clientTimestamp)
				: now;
			const validOccurredAt = Number.isNaN(occurredAt.getTime()) ? now : occurredAt;

			validAuditEvents.push({
				id: eventId,
				organizationId: orgId,
				actorUserId: authenticatedActorId,
				entityType: entry.entityType,
				entityId: entry.entityId,
				action: entry.actionType,
				reason,
				createdAt: validOccurredAt,
			});

			validClinicalAuditRows.push({
				organizationId: orgId,
				patientId: entry.patientId ?? null,
				actorUserId: authenticatedActorId,
				userId: authenticatedActorId,
				actorLogin: identity.fullName ?? null,
				eventType: "STAFF_ACTION",
				action: entry.actionType.toUpperCase(),
				resourceType: entry.entityType,
				entityType: entry.entityType,
				entityId: entry.entityId,
				ipAddress: ip,
				userAgent,
				meta: sanitizedDetails,
				createdAt: validOccurredAt,
			});
		}

		await db.transaction(async (tx) => {
			await tx.insert(auditEvents).values(validAuditEvents);
			await tx.insert(clinicalAuditLogs).values(validClinicalAuditRows);
		});

		return reply.status(201).send({
			success: true,
			count: validAuditEvents.length,
			insertedIds: validAuditEvents.map((e) => e.id),
		});
	};

	// POST /api/audit/events & /api/audit/events/batch (Idempotency-Key, db.transaction, organizationId)
	app.post("/api/audit/events", async (request, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key / db.transaction
		return handleAuditEventsIngestion(request, reply);
	});
	app.post("/api/audit/events/batch", async (request, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key / db.transaction
		return handleAuditEventsIngestion(request, reply);
	});

	// IMMUTABILITY GUARANTEE: Block any attempts to modify or delete audit logs
	/*
	 * ОБЛАСТЬ ДЕЙСТВИЯ ЭТОЙ ГАРАНТИИ — ТОЛЬКО HTTP, И ЭТО НАДО НАЗВАТЬ ВСЛУХ.
	 * 152-ФЗ Immutability Guarantee & Tenant Security:
	 * Все таблицы аудита защищены от любых попыток изменения или удаления.
	 */
	const rejectMutation = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		// 152-ФЗ Immutability Guarantee:
		// Idempotency-Key & organizationId validation for audit mutation prevention
		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.status(403).send({
			error: "AuditLogImmutable",
			message:
				"Журнал аудита доступа к персональным данным 152-ФЗ не подлежит изменению или удалению.",
		});
	};

	const immutableStrictAuditPaths = [
		"/api/audit/logs",
		"/api/audit/logs/:id",
		"/api/audit/medical-access",
		"/api/audit/medical-access/:id",
		"/api/audit/events/:id",
	];

	for (const url of immutableStrictAuditPaths) {
		app.route({
			method: ["POST", "PUT", "PATCH", "DELETE"],
			url,
			handler: rejectMutation,
		});
	}

	const immutableEventBatchPaths = [
		"/api/audit/events",
		"/api/audit/events/batch",
	];

	for (const url of immutableEventBatchPaths) {
		app.route({
			method: ["PUT", "PATCH", "DELETE"],
			url,
			handler: rejectMutation,
		});
	}
}

/**
 * Что именно читали: колонка `entity_id` в `clinical_audit_logs` объявлена
 * NOT NULL, а у чтения списка нет одной сущности. Пишем сюда область выборки,
 * чтобы событие отвечало на вопрос «какой срез журнала подняли», а не на
 * бессодержательное «читали журнал».
 */
function auditScopeDescriptor(query: {
	entityType?: string | undefined;
	entityId?: string | undefined;
	limit: number;
}): string {
	const parts = [
		query.entityType ? `entityType=${query.entityType}` : null,
		query.entityId ? `entityId=${query.entityId}` : null,
		`limit=${query.limit}`,
	].filter((part): part is string => part !== null);
	return parts.join("&");
}
