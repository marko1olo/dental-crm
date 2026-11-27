import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleDiaryLockPost } from "./signing/diaryLockHandler.js";

const lockDiaryRouteSchema: Record<string, unknown> = {
	description:
		"Lock diary mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
	headers: {
		type: "object",
		properties: {
			"idempotency-key": { type: "string" },
			"x-idempotency-key": { type: "string" },
			organizationid: { type: "string" },
			"x-organization-id": { type: "string" },
		},
	},
};

export { registerSigningRoutes as registerDiarySigningRoutes };
export async function registerSigningRoutes(app: FastifyInstance): Promise<void> {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/diaries/:id/lock",
		permission: "public",
		schema: lockDiaryRouteSchema,
		handler: async ({ request, reply }) => handleDiaryLockPost(request, reply),
	});
}
