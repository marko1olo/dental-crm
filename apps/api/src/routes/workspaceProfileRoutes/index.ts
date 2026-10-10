/**
 * index.ts — Layer 5: Fastify Plugin & Master Coordinator for Workspace Profile Routes.
 *
 * GET  /api/workspace/profile        — load feature flags for current org
 * GET  /api/workspace/chairs         — list clinic chairs
 * POST /api/workspace/profile        — save feature flags (individual toggles)
 * PATCH /api/workspace/profile       — patch feature flags (individual toggles)
 * POST /api/workspace/preset/:name   — apply a named preset + seed demo data
 *
 * Mandate 8s (Sovereign Scale):
 * - Solo Doctor / Small Clinic / Network presets
 * - Preserves 100% of public AST contracts and API endpoints
 */

import type { FastifyInstance } from "fastify";
import {
	applyWorkspacePresetHandler,
	defaultResponseSchema,
	getWorkspaceChairsHandler,
	getWorkspaceProfileHandler,
	updateWorkspaceProfileHandler,
} from "./workspaceProfileHandlers.js";

export async function workspaceProfileRoutes(
	fastify: FastifyInstance,
): Promise<void> {
	// GET /api/workspace/profile — какие модули включены у ЭТОЙ клиники
	fastify.get(
		"/api/workspace/profile",
		{
			schema: {
				response: defaultResponseSchema,
			},
		},
		getWorkspaceProfileHandler,
	);

	// GET /api/workspace/chairs — список кресел клиники
	fastify.get(
		"/api/workspace/chairs",
		{
			schema: {
				response: defaultResponseSchema,
			},
		},
		getWorkspaceChairsHandler,
	);

	// POST /api/workspace/profile — сохранить частичные признаки модулей
	fastify.post(
		"/api/workspace/profile",
		{
			schema: {
				response: defaultResponseSchema,
			},
		},
		updateWorkspaceProfileHandler,
	);

	// PATCH /api/workspace/profile — обновить признаки модулей (alias)
	fastify.patch(
		"/api/workspace/profile",
		{
			schema: {
				response: defaultResponseSchema,
			},
		},
		updateWorkspaceProfileHandler,
	);

	// POST /api/workspace/preset/:name — применить именованный пресет и засеять данные
	fastify.post(
		"/api/workspace/preset/:name",
		{
			schema: {
				response: defaultResponseSchema,
			},
		},
		applyWorkspacePresetHandler,
	);
}

// 100% Re-export public contracts
export * from "./types.js";
export * from "./workspaceFlagDefaults.js";
export * from "./workspaceFlagStorageHelpers.js";
export * from "./workspaceProfileHandlers.js";
