import type { FastifyInstance, FastifyRequest } from "fastify";
import { withTenantCtx } from "../../db/rls.js";
import { auditEvents } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";

/**
 * ЗАПИСЬ О ВЫГРУЗКЕ ДЕЛАЕТСЯ ПО НАЗВАННОЙ КЛИНИКЕ, А НЕ ПО «ПЕРВОЙ ПОПАВШЕЙСЯ».
 *
 * `requireClinicalReadAccess` пускает двумя путями, и они дают РАЗНОЕ. По
 * токену сотрудника арендатор известен, `request.tenantId` выставлен, и
 * обёртка server.ts уже открыла контекст. По заголовку `x-dente-admin-secret`
 * арендатора нет вовсе: `security/identity.ts` этот заголовок не читает.
 * Под FORCE RLS второй путь ломался молча — `select organizations limit 1`
 * возвращал ноль строк, `if (org)` не срабатывало, и резервная копия
 * состояния уезжала БЕЗ СЛЕДА В ЖУРНАЛЕ. Именно этот след требует ст. 13
 * 323-ФЗ, и «тихо не записали» здесь хуже отказа.
 *
 * Теперь организация берётся из проверенной личности запроса, а когда её
 * нет — причина пишется в журнал сервера явно, а не растворяется в пустом if.
 */
export async function recordPersistenceExportAudit(
	request: FastifyRequest,
): Promise<void> {
	const identity = getRequestIdentity(request);
	const auditOrganizationId = identity.organizationId;
	if (auditOrganizationId) {
		await withTenantCtx(auditOrganizationId, async (tx) => {
			await tx.insert(auditEvents).values({
				organizationId: auditOrganizationId,
				actorUserId: identity.userId ?? null,
				entityType: "system",
				entityId: "persistence-export",
				action: "persistence_export_downloaded",
				reason:
					"Администратор клиники скачал резервную копию состояния прототипа для аварийного восстановления или проверки переноса.",
			});
		});
	} else {
		request.log.warn(
			{ url: request.url, reason: "no-verified-organization" },
			"[SYSTEM_EXPORT_UNAUDITED] Выгрузка состояния выполнена по ключу администратора без токена клиники: " +
				"назвать организацию нечем, поэтому событие в журнал аудита не записано. " +
				"Чтобы след оставался, выгружайте состояние из кабинета клиники.",
		);
	}
}

export function registerSystemAuditRoutes(_app: FastifyInstance): void {
	// Точка монтирования для системных журналов и аудита Fastify при расширении телеметрии
}
