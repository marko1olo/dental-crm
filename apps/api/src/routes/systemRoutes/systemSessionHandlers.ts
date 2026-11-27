import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { getSingleSessionEnforcementsFromDb } from "../../db/singleSessionEnforcementsQuery.js";
import { requireOrganizationId } from "../../security/identity.js";

/**
 * Регистрация системных правил сессий (Single Session Enforcement).
 */
export function registerSystemSessionRoutes(app: FastifyInstance): void {
	// Блокировка параллельного входа под одной учетной записью (Single Session Enforcement)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/system/single-session-enforcements",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return;
				const rows = await withTenantReadCtx(orgId, (tx) =>
					getSingleSessionEnforcementsFromDb(orgId, tx),
				);
				return reply.status(200).send(rows);
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message:
						"Внутренняя ошибка сервера при проверке односессионного режима.",
				});
			}
		},
	});
}
