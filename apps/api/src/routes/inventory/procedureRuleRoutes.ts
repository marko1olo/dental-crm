import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	procedureMaterialRules,
	serviceCatalogItems,
} from "../../db/schema.js";
import { seedDefaultProcedureMaterialRules } from "../../services/inventory/defaultBomSeeds.js";
import { inventoryRuleBodySchema } from "./types.js";

export const procedureRuleRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// GET all procedure material rules for the organization (or optionally filtered by service)
	server.get<{
		Params: { organizationId: string };
		Querystring: { serviceId?: string };
	}>("/:organizationId/rules", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"inventory rules read all",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const { serviceId } = request.query;

		const conditions = [
			eq(procedureMaterialRules.organizationId, organizationId),
			eq(inventoryItems.organizationId, organizationId),
			eq(serviceCatalogItems.organizationId, organizationId),
		];
		if (serviceId) {
			conditions.push(eq(procedureMaterialRules.serviceId, serviceId));
		}

		const rules = await db
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
			.where(and(...conditions));

		return rules;
	});

	// POST seed default Order 804n clinical BOM rules
	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/rules/seed-defaults",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"inventory rules seed defaults",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const result = await seedDefaultProcedureMaterialRules(organizationId);
			return {
				success: true,
				...result,
				message: `Добавлено ${result.createdRulesCount} технологических карт списания (${result.createdServicesCount} услуг, ${result.createdItemsCount} расходников). Всего активных правил: ${result.totalRulesCount}.`,
			};
		},
	);

	// GET all procedure material rules for a specific service (authenticated)
	server.get<{ Params: { organizationId: string; serviceId: string } }>(
		"/:organizationId/rules/:serviceId",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory rules read",
			);
			if (!resolvedOrgId) return;

			const { organizationId, serviceId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			// The service must belong to this org, otherwise another clinic's
			// material rules (and item names/stock) would leak through the join.
			const [service] = await db
				.select({ id: serviceCatalogItems.id })
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.id, serviceId),
						eq(serviceCatalogItems.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!service)
				return reply.status(404).send({ error: "Service not found" });

			const rules = await db
				.select({
					id: procedureMaterialRules.id,
					serviceId: procedureMaterialRules.serviceId,
					inventoryItemId: procedureMaterialRules.inventoryItemId,
					quantityToDeduct: procedureMaterialRules.quantityToDeduct,
					requiredQty: procedureMaterialRules.requiredQty,
					createdAt: procedureMaterialRules.createdAt,
					itemName: inventoryItems.name,
					unit: inventoryItems.unit,
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
				);

			return rules;
		},
	);

	// POST create or update a procedure material rule (staff/admin only)
	server.post<{
		Params: { organizationId: string };
		Body: {
			serviceId: string;
			inventoryItemId: string;
			quantityToDeduct: number;
		};
	}>("/:organizationId/rules", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory rules create",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
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
		const [service] = await db
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

		const [item] = await db
			.select({ id: inventoryItems.id, name: inventoryItems.name })
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

		const [existing] = await db
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
			const [updated] = await db
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

		const [newRule] = await db
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
	});

	// DELETE a procedure material rule (admin only)
	server.delete<{
		Params: { organizationId: string; ruleId: string };
	}>("/:organizationId/rules/:ruleId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory rules delete",
		);
		if (!resolvedOrgId) return;

		const { organizationId, ruleId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		// Confirm the rule belongs to a service owned by this org before deleting
		const [rule] = await db
			.select({ id: procedureMaterialRules.id })
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

		const [deleted] = await db
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
	});

	// DELETE all rules for a service
	server.delete<{
		Params: { organizationId: string; serviceId: string };
	}>("/:organizationId/rules/service/:serviceId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory rules delete by service",
		);
		if (!resolvedOrgId) return;

		const { organizationId, serviceId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const deleted = await db
			.delete(procedureMaterialRules)
			.where(
				and(
					eq(procedureMaterialRules.serviceId, serviceId),
					eq(procedureMaterialRules.organizationId, organizationId),
				),
			)
			.returning({ id: procedureMaterialRules.id });

		return { success: true, count: deleted.length };
	});
};
