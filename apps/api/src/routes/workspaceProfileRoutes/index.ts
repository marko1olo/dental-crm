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
import { defineTenantMutation, defineTenantQuery } from "../../core/routeFactories.js";
import type { PresetName } from "./types.js";
import {
	executeWorkspacePresetApplyTx,
	executeWorkspaceProfileUpdateTx,
	fetchWorkspaceChairs,
	fetchWorkspaceProfileFlags,
} from "./workspaceProfileHandlers.js";

const WORKSPACE_READ_PERMISSIONS = {
	anyOf: [
		"settings.read" as const,
		"schedule.read" as const,
		"clinical.read" as const,
		"patients.read" as const,
		"finance.read" as const,
		"inventory.read" as const,
	],
};

const WORKSPACE_AUTH_OPTIONS = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
};

export async function workspaceProfileRoutes(
	fastify: FastifyInstance,
): Promise<void> {
	// GET /api/workspace/profile — какие модули включены у ЭТОЙ клиники
	defineTenantQuery(fastify, {
		path: "/api/workspace/profile",
		permission: WORKSPACE_READ_PERMISSIONS,
		authOptions: WORKSPACE_AUTH_OPTIONS,
		handler: async ({ tx, organizationId }) =>
			fetchWorkspaceProfileFlags(tx, organizationId),
	});

	// GET /api/workspace/chairs — список кресел клиники
	defineTenantQuery(fastify, {
		path: "/api/workspace/chairs",
		permission: WORKSPACE_READ_PERMISSIONS,
		authOptions: WORKSPACE_AUTH_OPTIONS,
		handler: async ({ tx, organizationId }) => ({
			success: true,
			data: await fetchWorkspaceChairs(tx, organizationId),
		}),
	});

	// POST /api/workspace/profile — сохранить частичные признаки модулей
	defineTenantMutation(fastify, {
		method: "POST",
		path: "/api/workspace/profile",
		permission: "settings.write",
		authOptions: WORKSPACE_AUTH_OPTIONS,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId, request, reply }) =>
			executeWorkspaceProfileUpdateTx(tx, organizationId, request, reply),
	});

	// PATCH /api/workspace/profile — обновить признаки модулей (alias)
	defineTenantMutation(fastify, {
		method: "PATCH",
		path: "/api/workspace/profile",
		permission: "settings.write",
		authOptions: WORKSPACE_AUTH_OPTIONS,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId, request, reply }) =>
			executeWorkspaceProfileUpdateTx(tx, organizationId, request, reply),
	});

	// POST /api/workspace/preset/:name — применить именованный пресет и засеять данные
	defineTenantMutation(fastify, {
		method: "POST",
		path: "/api/workspace/preset/:name",
		permission: "settings.write",
		authOptions: WORKSPACE_AUTH_OPTIONS,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId, request, reply }) => {
			const presetName = ((request.params as { name?: string })?.name ?? "") as PresetName;
			return executeWorkspacePresetApplyTx(
				tx,
				organizationId,
				presetName,
				request,
				reply,
			);
		},
	});
}

// 100% Re-export public contracts
export * from "./types.js";
export * from "./workspaceFlagDefaults.js";
export * from "./workspaceFlagStorageHelpers.js";
export * from "./workspaceProfileHandlers.js";
