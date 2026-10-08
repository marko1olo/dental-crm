/**
 * copilot.ts — Canonical Facade for DENTE Clinical AI Copilot Fastify Routes.
 *
 * Decomposed into modular DAG under ./copilot/ according to /decomposer Mandate 8zi.
 */

export {
	copilotRoutes,
	extractDoctorScreenContext,
} from "./copilot/index.js";

export type * from "./copilot/types.js";

import { copilotRoutes } from "./copilot/index.js";
export default copilotRoutes;
