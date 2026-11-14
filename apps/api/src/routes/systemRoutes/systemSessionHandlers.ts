import type { FastifyInstance } from "fastify";
import { requireOrganizationId } from "../../security/identity.js";

/**
 * Регистрация системных правил сессий (Single Session Enforcement).
 */
export function registerSystemSessionRoutes(app: FastifyInstance): void {
	// Блокировка параллельного входа под одной учетной записью (Single Session Enforcement)
	app.get("/api/system/single-session-enforcements", async (request, reply) => {
		try {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { getSingleSessionEnforcementsFromDb } = await import(
				"../../db/singleSessionEnforcementsQuery.js"
			);
			return reply
				.status(200)
				.send(await getSingleSessionEnforcementsFromDb(orgId));
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Внутренняя ошибка сервера при проверке односессионного режима.",
			});
		}
	});
}
