import type { FastifyInstance } from "fastify";
import { register } from "./consents/index.js";

export * from "./consents/types.js";
export * from "./consents/queries.js";
export * from "./consents/shareLink.js";

export async function registerConsentRoutes(app: FastifyInstance) {
	await register(app);
}
