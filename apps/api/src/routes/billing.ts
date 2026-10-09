import type { FastifyInstance } from "fastify";
import { registerBillingRoutes } from "./billingRoutes/index.js";

export { registerBillingRoutes } from "./billingRoutes/index.js";
export * from "./billingRoutes/index.js";
export default registerBillingRoutes;
