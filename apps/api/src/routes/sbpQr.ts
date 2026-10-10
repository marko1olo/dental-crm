/**
 * @file sbpQr.ts
 * Layer 5: Canonical Facade for SBP QR Routes, Webhooks & 54-FZ Fiscalization.
 * Decomposed into modular DAG architecture in ./sbp/ (<800 lines per file).
 */

import type { FastifyInstance } from "fastify";
import { registerSbpRoutes } from "./sbp/index.js";

export * from "./sbp/index.js";

/**
 * Registers all SBP and fiscal routes on Fastify application instance.
 * Canonical entry point preserved for 100% backward compatibility.
 */
export async function registerSbpQrRoutes(app: FastifyInstance): Promise<void> {
	registerSbpRoutes(app);
}

export const sbpQrRoutes = registerSbpQrRoutes;
export default registerSbpQrRoutes;
