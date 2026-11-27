import {
	isValidUuid,
	kopecksToNumericString,
	rublesToKopecks,
	toExactKopecks,
} from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";

function resolveRuleUnitCost(row: {
	unitCostKopecks: bigint | null;
	pricePerUnitKopecks: bigint | null;
	unitCostRub: string | null;
}): { unitCostKopecks: number; unitCostRub: string } {
	const legacyRub = Number(row.unitCostRub ?? 0);
	const resolvedKop =
		row.unitCostKopecks !== null &&
		(Number(row.unitCostKopecks) !== 0 || !Number.isFinite(legacyRub) || legacyRub === 0)
			? Number(row.unitCostKopecks)
			: row.pricePerUnitKopecks !== null &&
				  (Number(row.pricePerUnitKopecks) !== 0 || !Number.isFinite(legacyRub) || legacyRub === 0)
				? Number(row.pricePerUnitKopecks)
				: rublesToKopecks(Number.isFinite(legacyRub) ? legacyRub : 0);
	return {
		unitCostKopecks: resolvedKop,
		unitCostRub: kopecksToNumericString(toExactKopecks(resolvedKop)),
	};
}
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { defineTenantMutation, defineTenantQuery } from "../../core/routeFactories.js";
import {
	inventoryItems,
	procedureMaterialRules,
	procedureTechCardItems,
	procedureTechCards,
	serviceCatalogItems,
} from "../../db/schema.js";
import { seedDefaultProcedureMaterialRules } from "../../services/inventory/bomSeeds/index.js";
import { inventoryRuleBodySchema } from "./types.js";

const INVENTORY_READ_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
	allowUnverifiedHeaderRead: true,
} as const;

const INVENTORY_WRITE_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

export const procedureRuleRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// GET all procedure tech cards with their items for the organization (Canonical SSOT BOM)
	defineTenantQuery(server, {
		path: "/:organizationId/tech-cards",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId } = request.params as { organizationId: string };
			if (!isValidUuid(organizationId)) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const { serviceId } = request.query as { serviceId?: string };
			if (serviceId && !isValidUuid(serviceId)) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID услуги (serviceId)" });
			}
			const conditions = [
				eq(procedureTechCards.organizationId, organizationId),
				eq(procedureTechCards.status, "active"),
			];
			if (serviceId) {
				conditions.push(eq(procedureTechCards.serviceId, serviceId));
			}

			const cards = await tx
				.select({
					id: procedureTechCards.id,
					serviceId: procedureTechCards.serviceId,
					serviceCode: procedureTechCards.serviceCode,
					title: procedureTechCards.title,
					version: procedureTechCards.version,
					status: procedureTechCards.status,
					createdAt: procedureTechCards.createdAt,
				})
				.from(procedureTechCards)
				.where(and(...conditions))
				.limit(1000);

			const cardIds = cards.map((c) => c.id);
			const items =
				cardIds.length > 0
					? await tx
							.select({
								id: procedureTechCardItems.id,
								techCardId: procedureTechCardItems.techCardId,
								inventoryItemId: procedureTechCardItems.inventoryItemId,
								itemName: inventoryItems.name,
								unit: procedureTechCardItems.unit,
								quantity: procedureTechCardItems.quantity,
								isMdlpRequired: procedureTechCardItems.isMdlpRequired,
							})
							.from(procedureTechCardItems)
							.innerJoin(
								inventoryItems,
								eq(procedureTechCardItems.inventoryItemId, inventoryItems.id),
							)
							.where(inArray(procedureTechCardItems.techCardId, cardIds))
							.limit(5000)
					: [];

			const itemsByCardId = new Map<string, typeof items>();
			for (const it of items) {
				const arr = itemsByCardId.get(it.techCardId) ?? [];
				arr.push(it);
				itemsByCardId.set(it.techCardId, arr);
			}

			return cards.map((card) => {
				const cardItems = itemsByCardId.get(card.id) ?? [];
				return {
					...card,
					inventoryItemId: cardItems[0]?.inventoryItemId,
					items: cardItems,
				};
			});
		},
	});

	// GET all procedure material rules for the organization (or optionally filtered by service)
	defineTenantQuery(server, {
		path: "/:organizationId/rules",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId } = request.params as { organizationId: string };
			if (!isValidUuid(organizationId)) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const { serviceId } = request.query as { serviceId?: string };
			if (serviceId && !isValidUuid(serviceId)) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID услуги (serviceId)" });
			}

			const conditions = [
				eq(procedureMaterialRules.organizationId, organizationId),
				eq(inventoryItems.organizationId, organizationId),
				eq(serviceCatalogItems.organizationId, organizationId),
			];
			if (serviceId) {
				conditions.push(eq(procedureMaterialRules.serviceId, serviceId));
			}

			const rules = await tx
				.select({
					id: procedureMaterialRules.id,
					serviceId: procedureMaterialRules.serviceId,
					serviceCode: serviceCatalogItems.code,
					serviceTitle: serviceCatalogItems.title,
					serviceCategory: serviceCatalogItems.category,
					specialty: serviceCatalogItems.specialty,
					inventoryItemId: procedureMaterialRules.inventoryItemId,
					itemName: inventoryItems.name,
					category: inventoryItems.category,
					unit: inventoryItems.unit,
					stockQuantity: inventoryItems.stockQuantity,
					unitCostKopecks: inventoryItems.unitCostKopecks,
					pricePerUnitKopecks: inventoryItems.pricePerUnitKopecks,
					unitCostRub: inventoryItems.unitCostRub,
					criticalThreshold: inventoryItems.criticalThreshold,
					quantityToDeduct: procedureMaterialRules.quantityToDeduct,
					requiredQty: procedureMaterialRules.requiredQty,
					createdAt: procedureMaterialRules.createdAt,
				})
				.from(procedureMaterialRules)
				.innerJoin(
					serviceCatalogItems,
					eq(procedureMaterialRules.serviceId, serviceCatalogItems.id),
				)
				.innerJoin(
					inventoryItems,
					eq(procedureMaterialRules.inventoryItemId, inventoryItems.id),
				)
				.where(and(...conditions))
				.limit(2000);

			return rules.map(({ pricePerUnitKopecks, ...rule }) => ({
				...rule,
				...resolveRuleUnitCost({
					unitCostKopecks: rule.unitCostKopecks,
					pricePerUnitKopecks,
					unitCostRub: rule.unitCostRub,
				}),
			}));
		},
	});

	// POST seed default Order 804n clinical BOM rules
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId/rules/seed-defaults",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId } = request.params as { organizationId: string };
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const result = await seedDefaultProcedureMaterialRules(organizationId, tx);
			return {
				success: true,
				...result,
				message: `Добавлено ${result.createdRulesCount} технологических карт списания (${result.createdServicesCount} услуг, ${result.createdItemsCount} расходников). Всего активных правил: ${result.totalRulesCount}.`,
			};
		},
	});

	// GET all procedure material rules for a specific service (authenticated)
	defineTenantQuery(server, {
		path: "/:organizationId/rules/:serviceId",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId, serviceId } = request.params as { organizationId: string; serviceId: string };
			if (!isValidUuid(organizationId) || !isValidUuid(serviceId)) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID организации или услуги" });
			}
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			// The service must belong to this org, otherwise another clinic's
			// material rules (and item names/stock) would leak through the join.
			const [service] = await tx
				.select({ id: serviceCatalogItems.id })
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.id, serviceId),
						eq(serviceCatalogItems.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!service) {
				return reply.status(404).send({ error: "Service not found" });
			}

			const rules = await tx
				.select({
					id: procedureMaterialRules.id,
					serviceId: procedureMaterialRules.serviceId,
					inventoryItemId: procedureMaterialRules.inventoryItemId,
					quantityToDeduct: procedureMaterialRules.quantityToDeduct,
					requiredQty: procedureMaterialRules.requiredQty,
					createdAt: procedureMaterialRules.createdAt,
					itemName: inventoryItems.name,
					unit: inventoryItems.unit,
					unitCostKopecks: inventoryItems.unitCostKopecks,
					pricePerUnitKopecks: inventoryItems.pricePerUnitKopecks,
					unitCostRub: inventoryItems.unitCostRub,
					stockQuantity: inventoryItems.stockQuantity,
				})
				.from(procedureMaterialRules)
				.innerJoin(
					inventoryItems,
					eq(procedureMaterialRules.inventoryItemId, inventoryItems.id),
				)
				.where(
					and(
						eq(procedureMaterialRules.serviceId, serviceId),
						eq(inventoryItems.organizationId, organizationId),
					),
				)
				.limit(500);

			return rules.map(({ pricePerUnitKopecks, ...rule }) => ({
				...rule,
				...resolveRuleUnitCost({
					unitCostKopecks: rule.unitCostKopecks,
					pricePerUnitKopecks,
					unitCostRub: rule.unitCostRub,
				}),
			}));
		},
	});

	// POST create or update a procedure material rule (staff/admin only)
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId/rules",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId } = request.params as { organizationId: string };
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const parsedRule = inventoryRuleBodySchema.safeParse(request.body);
			if (!parsedRule.success) {
				return reply.status(400).send({ error: "Missing required fields" });
			}
			const { serviceId, inventoryItemId, quantityToDeduct } = parsedRule.data;

			// Both the service and the inventory item must belong to this org — else a
			// caller could wire another clinic's item into their own service rule.
			const [service] = await tx
				.select({ id: serviceCatalogItems.id, code: serviceCatalogItems.code })
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.id, serviceId),
						eq(serviceCatalogItems.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!service) return reply.status(404).send({ error: "Service not found" });

			const [item] = await tx
				.select({
					id: inventoryItems.id,
					name: inventoryItems.name,
					unit: inventoryItems.unit,
				})
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.id, inventoryItemId),
						eq(inventoryItems.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!item) return reply.status(404).send({ error: "Item not found" });

			const normalizedQty = String(Math.max(0.0001, quantityToDeduct));

			// Sync with canonical procedure_tech_cards
			let [techCard] = await tx
				.select()
				.from(procedureTechCards)
				.where(
					and(
						eq(procedureTechCards.organizationId, organizationId),
						eq(procedureTechCards.serviceId, serviceId),
					),
				)
				.limit(1);

			if (!techCard) {
				[techCard] = await tx
					.insert(procedureTechCards)
					.values({
						organizationId,
						serviceId,
						serviceCode: service.code,
						title: `Техкарта: ${service.code ?? serviceId}`,
						status: "active",
						version: 1,
					})
					.returning();
			}

			if (techCard) {
				const [existingCardItem] = await tx
					.select()
					.from(procedureTechCardItems)
					.where(
						and(
							eq(procedureTechCardItems.techCardId, techCard.id),
							eq(procedureTechCardItems.inventoryItemId, inventoryItemId),
						),
					)
					.limit(1);

				if (existingCardItem) {
					await tx
						.update(procedureTechCardItems)
						.set({
							quantity: normalizedQty,
							unit: item.unit || "шт",
						})
						.where(eq(procedureTechCardItems.id, existingCardItem.id));
				} else {
					await tx.insert(procedureTechCardItems).values({
						techCardId: techCard.id,
						inventoryItemId,
						quantity: normalizedQty,
						unit: item.unit || "шт",
					});
				}
			}

			const [existing] = await tx
				.select()
				.from(procedureMaterialRules)
				.where(
					and(
						eq(procedureMaterialRules.serviceId, serviceId),
						eq(procedureMaterialRules.inventoryItemId, inventoryItemId),
						eq(procedureMaterialRules.organizationId, organizationId),
					),
				)
				.limit(1);

			if (existing) {
				const [updated] = await tx
					.update(procedureMaterialRules)
					.set({
						quantityToDeduct: normalizedQty,
						requiredQty: normalizedQty,
						serviceCode: service.code,
						materialItemId: item.id,
						materialName: item.name,
					})
					.where(
						and(
							eq(procedureMaterialRules.id, existing.id),
							eq(procedureMaterialRules.organizationId, organizationId),
						),
					)
					.returning();
				if (!updated) {
					return reply.status(500).send({
						error: "RuleNotSaved",
						message:
							"Правило списания не сохранено: сервер не записал изменение. Повторите; если снова не выйдет — сообщите администратору клиники.",
					});
				}
				return updated;
			}

			const [newRule] = await tx
				.insert(procedureMaterialRules)
				.values({
					organizationId,
					serviceId,
					inventoryItemId,
					serviceCode: service.code,
					materialItemId: item.id,
					materialName: item.name,
					quantityToDeduct: normalizedQty,
					requiredQty: normalizedQty,
				})
				.returning();

			if (!newRule) {
				return reply.status(500).send({
					error: "RuleNotSaved",
					message:
						"Правило списания не создано: сервер не сохранил запись. Повторите; если снова не выйдет — сообщите администратору клиники.",
				});
			}
			return newRule;
		},
	});

	// DELETE a procedure material rule (admin only)
	defineTenantMutation(server, {
		method: "DELETE",
		path: "/:organizationId/rules/:ruleId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId, ruleId } = request.params as { organizationId: string; ruleId: string };
			if (!isValidUuid(organizationId) || !isValidUuid(ruleId)) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID организации или правила" });
			}
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			// Confirm the rule belongs to a service owned by this org before deleting
			const [rule] = await tx
				.select({
					id: procedureMaterialRules.id,
					serviceId: procedureMaterialRules.serviceId,
					inventoryItemId: procedureMaterialRules.inventoryItemId,
				})
				.from(procedureMaterialRules)
				.innerJoin(
					serviceCatalogItems,
					eq(procedureMaterialRules.serviceId, serviceCatalogItems.id),
				)
				.where(
					and(
						eq(procedureMaterialRules.id, ruleId),
						eq(serviceCatalogItems.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!rule) return reply.status(404).send({ error: "Rule not found" });
			if (rule.serviceId && rule.inventoryItemId) {
				const [techCard] = await tx
					.select({ id: procedureTechCards.id })
					.from(procedureTechCards)
					.where(
						and(
							eq(procedureTechCards.organizationId, organizationId),
							eq(procedureTechCards.serviceId, rule.serviceId),
						),
					)
					.limit(1);

				if (techCard) {
					await tx
						.delete(procedureTechCardItems)
						.where(
							and(
								eq(procedureTechCardItems.techCardId, techCard.id),
								eq(procedureTechCardItems.inventoryItemId, rule.inventoryItemId),
							),
						);
				}
			}

			const [deleted] = await tx
				.delete(procedureMaterialRules)
				.where(
					and(
						eq(procedureMaterialRules.id, ruleId),
						eq(procedureMaterialRules.organizationId, organizationId),
					),
				)
				.returning({ id: procedureMaterialRules.id });

			if (!deleted) {
				return reply.status(404).send({ error: "Rule not found" });
			}
			return { success: true };
		},
	});

	// DELETE all rules for a service
	defineTenantMutation(server, {
		method: "DELETE",
		path: "/:organizationId/rules/service/:serviceId",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId, serviceId } = request.params as { organizationId: string; serviceId: string };
			if (!isValidUuid(organizationId) || !isValidUuid(serviceId)) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID организации или услуги" });
			}
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const [techCard] = await tx
				.select({ id: procedureTechCards.id })
				.from(procedureTechCards)
				.where(
					and(
						eq(procedureTechCards.organizationId, organizationId),
						eq(procedureTechCards.serviceId, serviceId),
					),
				)
				.limit(1);

			if (techCard) {
				await tx
					.delete(procedureTechCardItems)
					.where(eq(procedureTechCardItems.techCardId, techCard.id));
			}

			const deleted = await tx
				.delete(procedureMaterialRules)
				.where(
					and(
						eq(procedureMaterialRules.serviceId, serviceId),
						eq(procedureMaterialRules.organizationId, organizationId),
					),
				)
				.returning({ id: procedureMaterialRules.id });

			return { success: true, count: deleted.length };
		},
	});
};
