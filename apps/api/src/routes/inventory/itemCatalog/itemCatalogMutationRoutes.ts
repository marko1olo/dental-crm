import type { FastifyInstance } from "fastify";
import { defineTenantMutation } from "../../../core/routeFactories.js";
import {
	handleCreateInventoryItem,
	handleDeleteInventoryItem,
	handlePatchInventoryItem,
	handleUpdateInventoryItem,
} from "./itemCatalogMutations.js";

const INVENTORY_WRITE_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

export const registerItemCatalogMutations = (server: FastifyInstance): void => {
	// POST new inventory item (staff/admin only)
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId } = request.params as { organizationId: string };
			const effectiveOrgId =
				organizationId === "current" || organizationId === "items"
					? resolvedOrgId
					: organizationId;
			if (resolvedOrgId !== effectiveOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleCreateInventoryItem(effectiveOrgId, request.body, request, reply, tx);
		},
	});

	// POST new inventory item alias /:organizationId/items (staff/admin only)
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId/items",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId } = request.params as { organizationId: string };
			const effectiveOrgId =
				organizationId === "current" || organizationId === "items"
					? resolvedOrgId
					: organizationId;
			if (resolvedOrgId !== effectiveOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleCreateInventoryItem(effectiveOrgId, request.body, request, reply, tx);
		},
	});

	// POST /items — unparameterized create item with session org (Zero Dead-Ends SSOT)
	defineTenantMutation(server, {
		method: "POST",
		path: "/items",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const targetOrgId =
				(request.body as { organizationId?: string })?.organizationId ||
				resolvedOrgId;
			if (targetOrgId !== resolvedOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}
			return handleCreateInventoryItem(targetOrgId, request.body, request, reply, tx);
		},
	});

	// PUT update inventory item details (staff/admin only)
	defineTenantMutation(server, {
		method: "PUT",
		path: "/:organizationId/:itemId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId, itemId } = request.params as { organizationId: string; itemId: string };
			const targetOrgId = organizationId === "current" ? resolvedOrgId : organizationId;
			if (resolvedOrgId !== targetOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleUpdateInventoryItem(targetOrgId, itemId, request.body, reply, tx);
		},
	});

	// PUT /:organizationId/items/:itemId alias
	defineTenantMutation(server, {
		method: "PUT",
		path: "/:organizationId/items/:itemId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId, itemId } = request.params as { organizationId: string; itemId: string };
			const targetOrgId = organizationId === "current" ? resolvedOrgId : organizationId;
			if (resolvedOrgId !== targetOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleUpdateInventoryItem(targetOrgId, itemId, request.body, reply, tx);
		},
	});

	// PUT /items/:itemId — unparameterized update with session org
	defineTenantMutation(server, {
		method: "PUT",
		path: "/items/:itemId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { itemId } = request.params as { itemId: string };
			return handleUpdateInventoryItem(resolvedOrgId, itemId, request.body, reply, tx);
		},
	});

	// DELETE inventory item (admin only)
	defineTenantMutation(server, {
		method: "DELETE",
		path: "/:organizationId/:itemId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId, itemId } = request.params as { organizationId: string; itemId: string };
			const targetOrgId = organizationId === "current" ? resolvedOrgId : organizationId;
			if (resolvedOrgId !== targetOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleDeleteInventoryItem(targetOrgId, itemId, reply, tx);
		},
	});

	// DELETE /:organizationId/items/:itemId alias
	defineTenantMutation(server, {
		method: "DELETE",
		path: "/:organizationId/items/:itemId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId, itemId } = request.params as { organizationId: string; itemId: string };
			const targetOrgId = organizationId === "current" ? resolvedOrgId : organizationId;
			if (resolvedOrgId !== targetOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleDeleteInventoryItem(targetOrgId, itemId, reply, tx);
		},
	});

	// DELETE /items/:itemId — unparameterized delete with session org
	defineTenantMutation(server, {
		method: "DELETE",
		path: "/items/:itemId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { itemId } = request.params as { itemId: string };
			return handleDeleteInventoryItem(resolvedOrgId, itemId, reply, tx);
		},
	});

	// PATCH /:organizationId/items/:itemId — partial update (Mandates 8e, 8n)
	defineTenantMutation(server, {
		method: "PATCH",
		path: "/:organizationId/items/:itemId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId, itemId } = request.params as { organizationId: string; itemId: string };
			const effectiveOrgId =
				organizationId === "current" || organizationId === "items"
					? resolvedOrgId
					: organizationId;
			if (resolvedOrgId !== effectiveOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handlePatchInventoryItem(effectiveOrgId, itemId, request.body, reply, tx);
		},
	});

	// PATCH /:organizationId/:itemId alias
	defineTenantMutation(server, {
		method: "PATCH",
		path: "/:organizationId/:itemId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId, itemId } = request.params as { organizationId: string; itemId: string };
			const effectiveOrgId =
				organizationId === "current" || organizationId === "items"
					? resolvedOrgId
					: organizationId;
			if (resolvedOrgId !== effectiveOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handlePatchInventoryItem(effectiveOrgId, itemId, request.body, reply, tx);
		},
	});

	// PATCH /items/:itemId — unparameterized partial update with session org
	defineTenantMutation(server, {
		method: "PATCH",
		path: "/items/:itemId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { itemId } = request.params as { itemId: string };
			return handlePatchInventoryItem(resolvedOrgId, itemId, request.body, reply, tx);
		},
	});
};
