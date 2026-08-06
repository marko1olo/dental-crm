import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { auditFromRequest } from "../clinicalAuditService.js";
import { db } from "../db/client.js";
import { auditEvents } from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";

const auditQuerySchema = z.object({
	entityType: z.string().optional(),
	entityId: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
});

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
	app.get(
		"/api/audit/logs",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"read audit logs",
			);
			if (!orgId) return;

			const query = auditQuerySchema.parse(request.query);
			const conditions = [eq(auditEvents.organizationId, orgId)];

			if (query.entityType) {
				conditions.push(eq(auditEvents.entityType, query.entityType));
			}
			if (query.entityId) {
				conditions.push(eq(auditEvents.entityId, query.entityId));
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
			const identity = getRequestIdentity(request);
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

	// IMMUTABILITY GUARANTEE: Block any attempts to modify or delete audit logs
	/*
	 * ОБЛАСТЬ ДЕЙСТВИЯ ЭТОЙ ГАРАНТИИ — ТОЛЬКО HTTP, И ЭТО НАДО НАЗВАТЬ ВСЛУХ.
	 *
	 * Проверено на живой базе 2026-08-06 (PostgreSQL 18.4, роль приложения
	 * `dental`, она же владелец таблиц):
	 *   • `audit_events` — RLS включён и ПРИНУДИТЕЛЕН (`relforcerowsecurity`),
	 *     политика `tenant_isolation` с непустым `WITH CHECK`. Изоляцию клиник
	 *     она держит: записать событие в чужую клинику нельзя.
	 *   • НО у роли `dental` на этой таблице есть привилегии `UPDATE`, `DELETE`
	 *     и `TRUNCATE` (`information_schema.table_privileges`), а триггеров на
	 *     таблице НОЛЬ (`pg_trigger`). Ни `REVOKE`, ни правила append-only нет.
	 * Следствие: любой код внутри процесса стирает журнал мимо этих четырёх
	 * обработчиков. Действующий пример —
	 * `scripts/seedOpsScreenshotDemo.ts:169`: `db.delete(auditEvents)`.
	 * Пока в базе нет запрета на UPDATE/DELETE, текст ниже описывает поведение
	 * маршрута, а не свойство журнала. Долг вынесен в отчёт.
	 */
	const rejectMutation = async (
		_request: FastifyRequest,
		reply: FastifyReply,
	) => {
		return reply.status(403).send({
			error: "AuditLogImmutable",
			message:
				"Журнал аудита доступа к персональным данным 152-ФЗ не подлежит изменению или удалению.",
		});
	};

	app.delete("/api/audit/logs", rejectMutation);
	app.delete("/api/audit/logs/:id", rejectMutation);
	app.put("/api/audit/logs/:id", rejectMutation);
	app.patch("/api/audit/logs/:id", rejectMutation);
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
