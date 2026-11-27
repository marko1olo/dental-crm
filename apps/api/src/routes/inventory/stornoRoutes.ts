/**
 * stornoRoutes.ts — Чистая Fastify-маршрутизация сторно и овердрафта склада (Мандат 8b, ~100 строк).
 * Логика вынесена в stornoOperationHandlers.ts и stornoAuditAndJournal.ts.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { defineTenantMutation } from "../../core/routeFactories.js";
import {
	handleOverdraftAlertRequest,
	handleStornoRequest,
} from "./storno/index.js";

export { handleOverdraftAlertRequest, handleStornoRequest } from "./storno/index.js";

const INVENTORY_WRITE_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

export const stornoRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	const registerOverdraftRoute = (path: string) => {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: "inventory.write",
			authOptions: INVENTORY_WRITE_AUTH,
			idempotency: "optional_header",
			handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
				const params = request.params as { organizationId?: string } | undefined;
				const body = (request.body as { organizationId?: string } | undefined) ?? {};
				const targetOrgId = params?.organizationId || body.organizationId || resolvedOrgId;
				if (targetOrgId !== resolvedOrgId) {
					return reply.code(403).send({ error: "Forbidden" });
				}
				return handleOverdraftAlertRequest(targetOrgId, request.body, request, reply, tx);
			},
		});
	};

	const registerStornoRoute = (path: string) => {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: "inventory.write",
			authOptions: INVENTORY_WRITE_AUTH,
			idempotency: "optional_header",
			handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
				const params = request.params as { organizationId?: string } | undefined;
				const body = (request.body as { organizationId?: string } | undefined) ?? {};
				const targetOrgId = params?.organizationId || body.organizationId || resolvedOrgId;
				if (targetOrgId !== resolvedOrgId) {
					return reply.code(403).send({ error: "Forbidden" });
				}
				return handleStornoRequest(targetOrgId, request.body, request, reply, tx);
			},
		});
	};

	// 1. Асинхронное оповещение об овердрафте при приеме (Мандат 8n)
	registerOverdraftRoute("/:organizationId/overdraft-alert");
	registerOverdraftRoute("/overdraft-alert");

	// 2. Автоматическое сторно при отмене услуг / визита (Мандаты 8e, 8n)
	registerStornoRoute("/:organizationId/storno");
	registerStornoRoute("/storno");
	registerStornoRoute("/:organizationId/storno/service");
	registerStornoRoute("/storno/service");
	registerStornoRoute("/:organizationId/storno/visit");
	registerStornoRoute("/storno/visit");
};

export default stornoRoutes;
