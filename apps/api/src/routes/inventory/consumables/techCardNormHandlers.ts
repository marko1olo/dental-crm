/**
 * techCardNormHandlers.ts — Layer 2: Fastify route handlers for reading and configuring
 * Technological Cards (BOM recipes) and material consumption norms per service/procedure.
 */

import { and, eq, inArray, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	isValidUuid,
	kopecksToNumericString,
	rublesToKopecks,
	toExactKopecks,
} from "@dental/shared";

const orgUuidParamsSchema = z.object({
	organizationId: z.string().uuid(),
});

const orgLinkUuidParamsSchema = z.object({
	organizationId: z.string().uuid(),
	linkId: z.string().uuid(),
});

const orgServiceUuidParamsSchema = z.object({
	organizationId: z.string().uuid(),
	serviceId: z.string().uuid(),
});

const reorderSuggestionsQuerySchema = z.object({
	onlyNeedingReorder: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional(),
});
import { defineTenantMutation, defineTenantQuery } from "../../../core/routeFactories.js";
import {
	inventoryItems,
	procedureTechCardItems,
	procedureTechCards,
	serviceCatalogItems,
	treatmentConsumables,
} from "../../../db/schema.js";
import { ReorderSuggestionService } from "../../../services/reorderSuggestionService.js";
import {
	TreatmentConsumablesService,
	TreatmentConsumablesServiceError,
} from "../../../services/treatmentConsumablesService.js";
import {
	consumableLinkCreateSchema,
	consumableLinkUpdateSchema,
	linkOptionsQuerySchema,
	listLinksQuerySchema,
	treatmentConsumableLinkCreateSchema,
} from "./types.js";

const INVENTORY_READ_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
	allowUnverifiedHeaderRead: true,
} as const;

const INVENTORY_WRITE_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

function resolveInventoryItemUnitCost(row: {
	unitCostKopecks: bigint | null;
	pricePerUnitKopecks: bigint | null;
	unitCostRub: string | null;
}): { unitCostKopecks: number; pricePerUnitKopecks: number; unitCostRub: string } {
	const legacyRub = Number(row.unitCostRub ?? 0);
	const primaryKop =
		row.unitCostKopecks !== null &&
		(Number(row.unitCostKopecks) !== 0 || !Number.isFinite(legacyRub) || legacyRub === 0)
			? Number(row.unitCostKopecks)
			: row.pricePerUnitKopecks !== null &&
				  (Number(row.pricePerUnitKopecks) !== 0 || !Number.isFinite(legacyRub) || legacyRub === 0)
				? Number(row.pricePerUnitKopecks)
				: rublesToKopecks(Number.isFinite(legacyRub) ? legacyRub : 0);
	const pricePerUnitKop =
		row.pricePerUnitKopecks !== null && Number(row.pricePerUnitKopecks) !== 0
			? Number(row.pricePerUnitKopecks)
			: primaryKop;
	return {
		unitCostKopecks: primaryKop,
		pricePerUnitKopecks: pricePerUnitKop,
		unitCostRub: kopecksToNumericString(toExactKopecks(primaryKop)),
	};
}

/**
 * Registers technological card and material consumption norm endpoints on the Fastify instance.
 */
export async function registerTechCardNormHandlers(
	server: FastifyInstance,
): Promise<void> {
	// GET / — List consumable links for current organization (CRUD)
	defineTenantQuery(server, {
		path: "/",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: orgId }) => {
			const rows = await tx
				.select({
					id: treatmentConsumables.id,
					organizationId: treatmentConsumables.organizationId,
					catalogItemCode: treatmentConsumables.catalogItemCode,
					inventoryItemId: treatmentConsumables.inventoryItemId,
					quantity: treatmentConsumables.quantity,
					note: treatmentConsumables.note,
					createdAt: treatmentConsumables.createdAt,
					updatedAt: treatmentConsumables.updatedAt,
					itemName: inventoryItems.name,
					itemCategory: inventoryItems.category,
					unit: inventoryItems.unit,
					currentStock: inventoryItems.currentQty,
					unitCostKopecks: inventoryItems.unitCostKopecks,
					pricePerUnitKopecks: inventoryItems.pricePerUnitKopecks,
					unitCostRub: inventoryItems.unitCostRub,
				})
				.from(treatmentConsumables)
				.leftJoin(
					inventoryItems,
					eq(treatmentConsumables.inventoryItemId, inventoryItems.id),
				)
				.where(eq(treatmentConsumables.organizationId, orgId))
				.limit(2000);

			return rows.map((row) => ({
				...row,
				...resolveInventoryItemUnitCost(row),
			}));
		},
	});

	// POST / — Create or update consumable link for procedure (CRUD) with canonical SSOT sync
	defineTenantMutation(server, {
		method: "POST",
		path: "/",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			const parsed = treatmentConsumableLinkCreateSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: parsed.error.errors[0]?.message ?? "Неверные параметры запроса",
				});
			}

			const body = parsed.data;
			const [link] = await tx
				.insert(treatmentConsumables)
				.values({
					organizationId: orgId,
					catalogItemCode: body.catalogItemCode,
					inventoryItemId: body.inventoryItemId,
					quantity: body.quantity.toFixed(4),
					note: body.note ?? null,
				})
				.onConflictDoUpdate({
					target: [
						treatmentConsumables.organizationId,
						treatmentConsumables.catalogItemCode,
						treatmentConsumables.inventoryItemId,
					],
					set: {
						quantity: body.quantity.toFixed(4),
						note: body.note ?? null,
						updatedAt: new Date(),
					},
				})
				.returning();

			const isCodeUuid = isValidUuid(body.catalogItemCode);
			const [service] = await tx
				.select({ id: serviceCatalogItems.id, code: serviceCatalogItems.code, title: serviceCatalogItems.title })
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.organizationId, orgId),
						isCodeUuid
							? or(
									eq(serviceCatalogItems.code, body.catalogItemCode),
									eq(serviceCatalogItems.id, body.catalogItemCode),
								)
							: eq(serviceCatalogItems.code, body.catalogItemCode),
					),
				)
				.limit(1);

			const [invItem] = await tx
				.select({ id: inventoryItems.id, unit: inventoryItems.unit })
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, orgId),
						eq(inventoryItems.id, body.inventoryItemId),
					),
				)
				.limit(1);

			const serviceId = service?.id ?? null;
			const serviceCode = service?.code ?? body.catalogItemCode;

			let [techCard] = await tx
				.select()
				.from(procedureTechCards)
				.where(
					and(
						eq(procedureTechCards.organizationId, orgId),
						or(
							serviceId ? eq(procedureTechCards.serviceId, serviceId) : eq(procedureTechCards.serviceCode, serviceCode),
							eq(procedureTechCards.serviceCode, serviceCode),
						),
					),
				)
				.limit(1);

			if (!techCard) {
				[techCard] = await tx
					.insert(procedureTechCards)
					.values({
						organizationId: orgId,
						serviceId,
						serviceCode,
						title: service?.title ? `Техкарта: ${service.title}` : `Техкарта: ${serviceCode}`,
						status: "active",
						version: 1,
					})
					.returning();
			}

			if (techCard) {
				const [existingItem] = await tx
					.select()
					.from(procedureTechCardItems)
					.where(
						and(
							eq(procedureTechCardItems.techCardId, techCard.id),
							eq(procedureTechCardItems.inventoryItemId, body.inventoryItemId),
						),
					)
					.limit(1);

				if (existingItem) {
					await tx
						.update(procedureTechCardItems)
						.set({
							quantity: body.quantity.toFixed(4),
							unit: invItem?.unit || "шт",
							notes: body.note ?? null,
						})
						.where(eq(procedureTechCardItems.id, existingItem.id));
				} else {
					await tx.insert(procedureTechCardItems).values({
						techCardId: techCard.id,
						inventoryItemId: body.inventoryItemId,
						quantity: body.quantity.toFixed(4),
						unit: invItem?.unit || "шт",
						notes: body.note ?? null,
					});
				}
			}

			return reply.status(201).send(link);
		},
	});

	// door-validation: none — удаление нормы расхода по URL-параметру :id без тела запроса
	defineTenantMutation(server, {
		method: "DELETE",
		path: "/:id",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			const idParsed = z.object({ id: z.string().uuid() }).safeParse(request.params);
			if (!idParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный UUID нормы расхода",
				});
			}
			const { id } = idParsed.data;
			const [toDelete] = await tx
				.select()
				.from(treatmentConsumables)
				.where(
					and(
						eq(treatmentConsumables.organizationId, orgId),
						eq(treatmentConsumables.id, id),
					),
				)
				.limit(1);

			if (!toDelete) {
				return reply.status(404).send({ error: "NotFound", message: "Связь не найдена" });
			}

			await tx
				.delete(treatmentConsumables)
				.where(
					and(
						eq(treatmentConsumables.id, id),
						eq(treatmentConsumables.organizationId, orgId),
					),
				);

			const isCodeUuid = isValidUuid(toDelete.catalogItemCode);
			const [service] = await tx
				.select({ id: serviceCatalogItems.id, code: serviceCatalogItems.code })
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.organizationId, orgId),
						isCodeUuid
							? or(
									eq(serviceCatalogItems.code, toDelete.catalogItemCode),
									eq(serviceCatalogItems.id, toDelete.catalogItemCode),
								)
							: eq(serviceCatalogItems.code, toDelete.catalogItemCode),
					),
				)
				.limit(1);

			const matchedCards = await tx
				.select({ id: procedureTechCards.id })
				.from(procedureTechCards)
				.where(
					and(
						eq(procedureTechCards.organizationId, orgId),
						or(
							eq(procedureTechCards.serviceCode, toDelete.catalogItemCode),
							...(service
								? [
										eq(procedureTechCards.serviceId, service.id),
										eq(procedureTechCards.serviceCode, service.code),
									]
								: []),
						),
					),
				);

			const matchedCardIds = matchedCards.map((c) => c.id);
			if (matchedCardIds.length > 0) {
				await tx
					.delete(procedureTechCardItems)
					.where(
						and(
							inArray(procedureTechCardItems.techCardId, matchedCardIds),
							eq(procedureTechCardItems.inventoryItemId, toDelete.inventoryItemId),
						),
					);
			}

			return { success: true, deletedId: id };
		},
	});

	// GET /reorder-suggestions — Predictive reorder point calculation
	defineTenantQuery(server, {
		path: "/reorder-suggestions",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			const parsedQuery = reorderSuggestionsQuerySchema.safeParse(request.query ?? {});
			const query = parsedQuery.success ? parsedQuery.data : {};
			const onlyNeedingReorder =
				query.onlyNeedingReorder === "true" ||
				query.onlyNeedingReorder === true;

			const suggestions = await ReorderSuggestionService.getSuggestions(orgId, {
				onlyNeedingReorder,
				tx,
			});
			return reply.status(200).send(suggestions);
		},
	});

	// GET /:organizationId/links — List all consumable links
	defineTenantQuery(server, {
		path: "/:organizationId/links",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const parsedQuery = listLinksQuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: parsedQuery.error.errors[0]?.message ?? "Неверные параметры запроса",
				});
			}

			return TreatmentConsumablesService.listLinks(
				tx,
				organizationId,
				parsedQuery.data,
			);
		},
	});

	// GET /:organizationId/links/:linkId — Get a single consumable link
	defineTenantQuery(server, {
		path: "/:organizationId/links/:linkId",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgLinkUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID параметра" });
			}
			const { organizationId, linkId } = parsedParams.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const link = await TreatmentConsumablesService.getLink(
				tx,
				organizationId,
				linkId,
			);
			if (!link) {
				return reply.status(404).send({
					error: "LinkNotFound",
					message: "Связь расходного материала не найдена",
				});
			}
			return link;
		},
	});

	// POST /:organizationId/links — Create a new consumable link
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId/links",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const parsedBody = consumableLinkCreateSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
				});
			}

			try {
				const link = await TreatmentConsumablesService.createLink(
					tx,
					organizationId,
					parsedBody.data,
				);
				return reply.status(201).send(link);
			} catch (err) {
				if (err instanceof TreatmentConsumablesServiceError) {
					return reply.status(err.statusCode).send({
						error: err.code,
						message: err.message,
					});
				}
				throw err;
			}
		},
	});

	// PUT /:organizationId/links/:linkId — Update a consumable link
	defineTenantMutation(server, {
		method: "PUT",
		path: "/:organizationId/links/:linkId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgLinkUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID параметра" });
			}
			const { organizationId, linkId } = parsedParams.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const parsedBody = consumableLinkUpdateSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
				});
			}

			try {
				return await TreatmentConsumablesService.updateLink(
					tx,
					organizationId,
					linkId,
					parsedBody.data,
				);
			} catch (err) {
				if (err instanceof TreatmentConsumablesServiceError) {
					return reply.status(err.statusCode).send({
						error: err.code,
						message: err.message,
					});
				}
				throw err;
			}
		},
	});

	// DELETE /:organizationId/links/:linkId — Delete a consumable link
	defineTenantMutation(server, {
		method: "DELETE",
		path: "/:organizationId/links/:linkId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgLinkUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID параметра" });
			}
			const { organizationId, linkId } = parsedParams.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			try {
				return await TreatmentConsumablesService.deleteLink(
					tx,
					organizationId,
					linkId,
				);
			} catch (err) {
				if (err instanceof TreatmentConsumablesServiceError) {
					return reply.status(err.statusCode).send({
						error: err.code,
						message: err.message,
					});
				}
				throw err;
			}
		},
	});

	// GET /:organizationId/service/:serviceId — Get full BOM recipe for service
	defineTenantQuery(server, {
		path: "/:organizationId/service/:serviceId",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgServiceUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID параметра" });
			}
			const { organizationId, serviceId } = parsedParams.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			try {
				return await TreatmentConsumablesService.getRecipeForService(
					tx,
					organizationId,
					serviceId,
				);
			} catch (err) {
				if (err instanceof TreatmentConsumablesServiceError) {
					return reply.status(err.statusCode).send({
						error: err.code,
						message: err.message,
					});
				}
				throw err;
			}
		},
	});

	// GET /:organizationId/options — Get picker options for linking
	defineTenantQuery(server, {
		path: "/:organizationId/options",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const parsedQuery = linkOptionsQuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: parsedQuery.error.errors[0]?.message ?? "Неверные параметры запроса",
				});
			}
			return TreatmentConsumablesService.getLinkOptions(
				tx,
				organizationId,
				parsedQuery.data.q,
				parsedQuery.data.limit,
			);
		},
	});
}
