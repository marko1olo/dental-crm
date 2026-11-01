/**
 * stornoRoutes.ts — Чистая Fastify-маршрутизация сторно и овердрафта склада (Мандат 8b, ~100 строк).
 * Логика вынесена в stornoOperationHandlers.ts и stornoAuditAndJournal.ts.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import {
	handleOverdraftAlertRequest,
	handleStornoRequest,
} from "./storno/index.js";

export { handleOverdraftAlertRequest, handleStornoRequest } from "./storno/index.js";

export const stornoRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. Асинхронное оповещение об овердрафте при приеме (Мандат 8n)
	// ─────────────────────────────────────────────────────────────────────────
	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/overdraft-alert",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"inventory overdraft alert",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleOverdraftAlertRequest(organizationId, request.body, request, reply);
		},
	);

	server.post("/overdraft-alert", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory overdraft alert",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleOverdraftAlertRequest(targetOrgId, request.body, request, reply);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. Автоматическое сторно при отмене услуг / визита (Мандаты 8e, 8n)
	// ─────────────────────────────────────────────────────────────────────────
	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/storno",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"inventory storno",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleStornoRequest(organizationId, request.body, request, reply);
		},
	);

	server.post("/storno", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(targetOrgId, request.body, request, reply);
	});

	// Алиасы для гранулярной отмены услуг и визитов
	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/storno/service",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"inventory storno service",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleStornoRequest(organizationId, request.body, request, reply);
		},
	);

	server.post("/storno/service", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno service",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(targetOrgId, request.body, request, reply);
	});

	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/storno/visit",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"inventory storno visit",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleStornoRequest(organizationId, request.body, request, reply);
		},
	);

	server.post("/storno/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno visit",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(targetOrgId, request.body, request, reply);
	});
};

export default stornoRoutes;
