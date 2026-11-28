import type { FastifyInstance } from "fastify";
import { z } from "zod";
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

const orgOrAliasParamsSchema = z.object({
	organizationId: z.union([z.literal("current"), z.literal("items"), z.string().uuid()]),
});

const orgIdBodyHintSchema = z
	.object({
		organizationId: z.string().uuid().optional(),
	})
	.passthrough();

const orgCurrentItemParamsSchema = z.object({
	organizationId: z.union([z.literal("current"), z.string().uuid()]),
	itemId: z.string().min(1),
});

const orgAliasItemParamsSchema = z.object({
	organizationId: z.union([z.literal("current"), z.literal("items"), z.string().uuid()]),
	itemId: z.string().min(1),
});

const itemIdOnlyParamsSchema = z.object({
	itemId: z.string().min(1),
});

export const registerItemCatalogMutations = (server: FastifyInstance): void => {
	// POST new inventory item (staff/admin only)
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgOrAliasParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
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
			const parsedParams = orgOrAliasParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
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
			const parsedBody = orgIdBodyHintSchema.safeParse(request.body ?? {});
			const targetOrgId =
				(parsedBody.success ? parsedBody.data.organizationId : undefined) ||
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
			const parsedParams = orgCurrentItemParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры запроса" });
			}
			const { organizationId, itemId } = parsedParams.data;
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
			const parsedParams = orgCurrentItemParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры запроса" });
			}
			const { organizationId, itemId } = parsedParams.data;
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
			const parsedParams = itemIdOnlyParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Не указан itemId" });
			}
			return handleUpdateInventoryItem(resolvedOrgId, parsedParams.data.itemId, request.body, reply, tx);
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
			const parsedParams = orgCurrentItemParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры запроса" });
			}
			const { organizationId, itemId } = parsedParams.data;
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
			const parsedParams = orgCurrentItemParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры запроса" });
			}
			const { organizationId, itemId } = parsedParams.data;
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
			const parsedParams = itemIdOnlyParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Не указан itemId" });
			}
			return handleDeleteInventoryItem(resolvedOrgId, parsedParams.data.itemId, reply, tx);
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
			const parsedParams = orgAliasItemParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры запроса" });
			}
			const { organizationId, itemId } = parsedParams.data;
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
			const parsedParams = orgAliasItemParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры запроса" });
			}
			const { organizationId, itemId } = parsedParams.data;
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
			const parsedParams = itemIdOnlyParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Не указан itemId" });
			}
			return handlePatchInventoryItem(resolvedOrgId, parsedParams.data.itemId, request.body, reply, tx);
		},
	});
};
