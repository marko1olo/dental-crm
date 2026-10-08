import type { FastifyInstance } from "fastify";
import { registerInvitationRoutes } from "./invitationRoutes.js";
import { registerLoginRoutes } from "./loginRoutes.js";
import { registerPasswordRoutes } from "./passwordRoutes.js";
import { registerRegistrationRoutes } from "./registrationRoutes.js";
import { registerSessionRoutes } from "./sessionRoutes.js";
import { TOKEN_SECRET } from "./tokenHelpers.js";

export { TOKEN_SECRET };
export * from "./types.js";
export * from "./tokenHelpers.js";
export { registerLoginRoutes } from "./loginRoutes.js";
export { registerSessionRoutes } from "./sessionRoutes.js";
export { registerInvitationRoutes } from "./invitationRoutes.js";
export { registerPasswordRoutes } from "./passwordRoutes.js";
export { registerRegistrationRoutes } from "./registrationRoutes.js";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
	registerLoginRoutes(app);
	registerSessionRoutes(app);
	registerInvitationRoutes(app);
	registerPasswordRoutes(app);
	registerRegistrationRoutes(app);
}

export default registerAuthRoutes;
