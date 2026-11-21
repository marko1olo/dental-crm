/**
 * agentRoutes.ts — Fastify Endpoints Gateway for Autonomous Clinical Dental AI Agent
 * Mandate 8b: Monolith decomposed into modular sub-routers (< 50 lines).
 */

import type { FastifyPluginAsync } from "fastify";
import {
	registerAgentChatRoutes,
	handleAgentChat,
	formatSseMessage,
	resolveRuntimeMode,
	normalizeIncomingBody,
	agentChatBodySchema,
} from "./agent/agentChatRoutes.js";
import { registerAgentToolsAndActionRoutes } from "./agent/agentToolsAndActionRoutes.js";
import { registerAgentSettingsAndMemoryRoutes } from "./agent/agentSettingsAndMemoryRoutes.js";
import { registerAgentProactiveAndNudgeRoutes } from "./agent/agentProactiveAndNudgeRoutes.js";
import { registerAgentSessionRoutes } from "./agentSessionRoutes.js";

export {
	handleAgentChat,
	formatSseMessage,
	resolveRuntimeMode,
	normalizeIncomingBody,
	agentChatBodySchema,
};

export const registerAgentRoutes: FastifyPluginAsync = async (
	server,
): Promise<void> => {
	await registerAgentChatRoutes(server);
	await registerAgentToolsAndActionRoutes(server);
	await registerAgentSettingsAndMemoryRoutes(server);
	await registerAgentProactiveAndNudgeRoutes(server);
	await registerAgentSessionRoutes(server);
};
