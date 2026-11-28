/**
 * stornoRoutes.ts — Чистая Fastify-маршрутизация сторно и овердрафта склада (Мандат 8b, ~100 строк).
 * Логика вынесена в stornoOperationHandlers.ts и stornoAuditAndJournal.ts.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
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

const stornoParamsSchema = z.object({
	organizationId: z.string().uuid().optional(),
});

const stornoBodyOrgHintSchema = z
	.object({
		organizationId: z.string().uuid().optional(),
	})
	.passthrough();

export const stornoRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	const resolveTargetOrgId = (
		rawParams: unknown,
		rawBody: unknown,
		resolvedOrgId: string,
	): { ok: true; orgId: string } | { ok: false; message: string } => {
		const parsedParams = stornoParamsSchema.safeParse(rawParams ?? {});
		if (!parsedParams.success) {
			return { ok: false, message: "Некорректный UUID организации в пути запроса." };
		}
		const parsedBody = stornoBodyOrgHintSchema.safeParse(rawBody ?? {});
		if (!parsedBody.success) {
			return { ok: false, message: "Некорректный UUID организации в теле запроса." };
		}
		return {
			ok: true,
			orgId:
				parsedParams.data.organizationId ||
				parsedBody.data.organizationId ||
				resolvedOrgId,
		};
	};

	const registerOverdraftRoute = (path: string) => {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: "inventory.write",
			authOptions: INVENTORY_WRITE_AUTH,
			idempotency: "optional_header",
			handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
				const target = resolveTargetOrgId(request.params, request.body, resolvedOrgId);
				if (!target.ok) {
					return reply.code(400).send({ error: "ValidationError", message: target.message });
				}
				if (target.orgId !== resolvedOrgId) {
					return reply.code(403).send({ error: "Forbidden" });
				}
				return handleOverdraftAlertRequest(target.orgId, request.body, request, reply, tx);
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
				const target = resolveTargetOrgId(request.params, request.body, resolvedOrgId);
				if (!target.ok) {
					return reply.code(400).send({ error: "ValidationError", message: target.message });
				}
				if (target.orgId !== resolvedOrgId) {
					return reply.code(403).send({ error: "Forbidden" });
				}
				return handleStornoRequest(target.orgId, request.body, request, reply, tx);
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
