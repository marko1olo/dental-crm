/**
 * chatRoutes.ts — Backward-compatible facades for Copilot Chat Endpoints (Mandate 8s).
 * Consolidated around the canonical SSOT controller apps/api/src/routes/agentRoutes.ts.
 */

import type { FastifyPluginAsync } from "fastify";
import { handleAgentChat } from "../agentRoutes.js";

export const chatRoutes: FastifyPluginAsync = async (server) => {
	server.post("/api/v1/copilot/chat", { config: { tenantTxSelfManaged: true } }, handleAgentChat);
	server.post("/api/copilot/chat", { config: { tenantTxSelfManaged: true } }, handleAgentChat);
	server.post("/api/ai/chat", { config: { tenantTxSelfManaged: true } }, handleAgentChat);
};
