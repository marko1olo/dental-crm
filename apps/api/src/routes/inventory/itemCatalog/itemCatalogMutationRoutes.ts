import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import {
	handleCreateInventoryItem,
	handleDeleteInventoryItem,
	handlePatchInventoryItem,
	handleUpdateInventoryItem,
} from "./itemCatalogMutations.js";

export const registerItemCatalogMutations = (server: FastifyInstance): void => {
	// POST new inventory item (staff/admin only)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory create",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		const effectiveOrgId =
			organizationId === "current" || organizationId === "items"
				? resolvedOrgId
				: organizationId;
		if (resolvedOrgId !== effectiveOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleCreateInventoryItem(effectiveOrgId, request.body, request, reply);
	});

	// POST new inventory item alias /:organizationId/items (staff/admin only)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/items", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory create items",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		const effectiveOrgId =
			organizationId === "current" || organizationId === "items"
				? resolvedOrgId
				: organizationId;
		if (resolvedOrgId !== effectiveOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleCreateInventoryItem(effectiveOrgId, request.body, request, reply);
	});

	// POST /items — unparameterized create item with session org (Zero Dead-Ends SSOT)
	server.post("/items", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory create items fallback",
		);
		if (!resolvedOrgId) return;
		const targetOrgId =
			(request.body as { organizationId?: string })?.organizationId ||
			resolvedOrgId;
		if (targetOrgId !== resolvedOrgId)
			return reply.code(403).send({ error: "Forbidden" });
		return handleCreateInventoryItem(targetOrgId, request.body, request, reply);
	});

	// PUT update inventory item details (staff/admin only)
	server.put<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory update",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleUpdateInventoryItem(organizationId, itemId, request.body, reply);
	});

	// PUT /:organizationId/items/:itemId alias
	server.put<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/items/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory update alias",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleUpdateInventoryItem(organizationId, itemId, request.body, reply);
	});

	// PUT /items/:itemId — unparameterized update with session org
	server.put<{
		Params: { itemId: string };
	}>("/items/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory update fallback",
		);
		if (!resolvedOrgId) return;

		const { itemId } = request.params;
		return handleUpdateInventoryItem(resolvedOrgId, itemId, request.body, reply);
	});

	// DELETE inventory item (admin only)
	server.delete<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory delete",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeleteInventoryItem(organizationId, itemId, reply);
	});

	// DELETE /:organizationId/items/:itemId alias
	server.delete<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/items/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory delete alias",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeleteInventoryItem(organizationId, itemId, reply);
	});

	// DELETE /items/:itemId — unparameterized delete with session org
	server.delete<{
		Params: { itemId: string };
	}>("/items/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory delete fallback",
		);
		if (!resolvedOrgId) return;

		const { itemId } = request.params;
		return handleDeleteInventoryItem(resolvedOrgId, itemId, reply);
	});

	// PATCH /:organizationId/items/:itemId — partial update (Mandates 8e, 8n)
	server.patch<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/items/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory patch org items",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		const effectiveOrgId =
			organizationId === "current" || organizationId === "items"
				? resolvedOrgId
				: organizationId;
		if (resolvedOrgId !== effectiveOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handlePatchInventoryItem(effectiveOrgId, itemId, request.body, reply);
	});

	// PATCH /:organizationId/:itemId alias
	server.patch<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory patch org alias",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		const effectiveOrgId =
			organizationId === "current" || organizationId === "items"
				? resolvedOrgId
				: organizationId;
		if (resolvedOrgId !== effectiveOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handlePatchInventoryItem(effectiveOrgId, itemId, request.body, reply);
	});

	// PATCH /items/:itemId — unparameterized partial update with session org
	server.patch<{
		Params: { itemId: string };
	}>("/items/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory patch fallback",
		);
		if (!resolvedOrgId) return;

		const { itemId } = request.params;
		return handlePatchInventoryItem(resolvedOrgId, itemId, request.body, reply);
	});
};
