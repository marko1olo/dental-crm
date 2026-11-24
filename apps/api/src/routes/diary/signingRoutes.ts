import type { FastifyInstance } from "fastify";
import { handleDiaryLockPost } from "./signing/diaryLockHandler.js";

const lockDiaryRouteOptions = {
	schema: {
		description:
			"Lock diary mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
				"organizationid": { type: "string" },
				"x-organization-id": { type: "string" },
			},
		},
	},
};

export { registerSigningRoutes as registerDiarySigningRoutes };
export async function registerSigningRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/diaries/:id/lock", lockDiaryRouteOptions, handleDiaryLockPost);
}
