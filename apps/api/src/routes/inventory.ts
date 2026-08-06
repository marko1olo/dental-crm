import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";

declare module "fastify" {
	interface FastifyRequest {
		user?: { id: string; [key: string]: any };
	}
}

import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	serviceCatalogItems,
} from "../db/schema.js";

/**
 * Тела склада раньше читались через bare destructure `const { … } = request.body`.
 * При null/undefined body (POST/PATCH без JSON) это бросало TypeError → 500.
 * Zod safeParse после auth-first закрывает путь: 400 с прежними текстами.
 */
const inventoryCreateBodySchema = z.object({
	name: z.string().optional(),
	criticalThreshold: z.number().finite().optional(),
	unitCostRub: z.number().finite().optional(),
	stockQuantity: z.number().finite().optional(),
	sku: z.string().nullable().optional(),
	barcode: z.string().nullable().optional(),
	lotNumber: z.string().nullable().optional(),
	expirationDate: z.string().nullable().optional(),
});

const inventoryStockBodySchema = z.object({
	adjustment: z
		.number({
			required_error:
				"Количество для склада не разобрано: его нужно указать числом, например 10 для прихода или 10 для списания. Исправьте количество и повторите.",
			invalid_type_error:
				"Количество для склада не разобрано: его нужно указать числом, например 10 для прихода или 10 для списания. Исправьте количество и повторите.",
		})
		.finite({
			message:
				"Количество для склада не разобрано: его нужно указать числом, например 10 для прихода или 10 для списания. Исправьте количество и повторите.",
		}),
});

const inventoryRuleBodySchema = z.object({
	serviceId: z
		.string({
			required_error: "Missing required fields",
			invalid_type_error: "Missing required fields",
		})
		.min(1, { message: "Missing required fields" }),
	inventoryItemId: z
		.string({
			required_error: "Missing required fields",
			invalid_type_error: "Missing required fields",
		})
		.min(1, { message: "Missing required fields" }),
	quantityToDeduct: z.number({
		required_error: "Missing required fields",
		invalid_type_error: "Missing required fields",
	}),
});

/**
 * Метка «дату прислали, но разобрать её нельзя».
 *
 * Отличать её от пустого значения обязательно: пустой срок годности —
 * нормальное состояние (у многих расходников его просто не пишут), а
 * непонятная строка означает ошибку ввода, и молча превращать её в «срока нет»
 * значит потерять предупреждение о просрочке.
 */
const INVALID_DATE = Symbol("invalid-expiration-date");

/**
 * Приведение срока годности к виду, который принимает колонка date.
 *
 * Поле ввода типа date отдаёт «2027-03-31», и в этом же виде значение уходит в
 * базу. Всё остальное — ошибка, о которой надо сказать человеку, а не
 * подставлять пустоту.
 */
function normalizedExpirationDate(
	value: string | null | undefined,
): string | null | typeof INVALID_DATE {
	if (value === null || value === undefined) return null;
	const trimmed = String(value).trim();
	if (!trimmed) return null;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return INVALID_DATE;
	const parsed = new Date(`${trimmed}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) return INVALID_DATE;
	// 2027-02-31 разбирается в 3 марта: сверяем, что дата не «уехала».
	if (parsed.toISOString().slice(0, 10) !== trimmed) return INVALID_DATE;
	return trimmed;
}

export const inventoryRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// GET all inventory items for an organization (authenticated)
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			// Security: ensure the resolved org matches the requested one
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await db
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.organizationId, organizationId))
				.orderBy(inventoryItems.name);
			return items;
		},
	);

	// POST new inventory item (staff/admin only)
	server.post<{
		Params: { organizationId: string };
		Body: {
			name: string;
			criticalThreshold?: number;
			unitCostRub?: number;
			stockQuantity?: number;
			sku?: string | null;
			barcode?: string | null;
			lotNumber?: string | null;
			expirationDate?: string | null;
		};
	}>("/:organizationId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory create",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = inventoryCreateBodySchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "NameRequired",
				message: "Укажите название материала.",
			});
		}
		const {
			name,
			criticalThreshold = 0,
			unitCostRub = 0,
			stockQuantity = 0,
			sku = null,
			barcode = null,
			lotNumber = null,
			expirationDate = null,
		} = parsedBody.data;
		if (!name?.trim()) {
			return reply.status(400).send({
				error: "NameRequired",
				message: "Укажите название материала.",
			});
		}
		/*
		 * Умолчание порога снижено с 5 до 0.
		 *
		 * Пятёрка бралась с потолка: не приславший поле клиент получал в базу
		 * выдуманный минимальный остаток, и склад начинал сигналить о дефиците
		 * материала, для которого никто порога не задавал. Ноль означает «порог не
		 * задан» и ни о чём не сигналит.
		 */
		const expiration = normalizedExpirationDate(expirationDate);
		if (expiration === INVALID_DATE) {
			return reply.status(400).send({
				error: "ExpirationDateInvalid",
				message: "Срок годности указывается датой, например 31.03.2027.",
			});
		}

		const newItem = await db
			.insert(inventoryItems)
			.values({
				organizationId,
				name: name.trim(),
				criticalThreshold: String(Math.max(0, criticalThreshold)),
				unitCostRub: String(Math.max(0, unitCostRub)),
				stockQuantity: String(Math.max(0, stockQuantity)),
				sku: sku?.trim() || null,
				barcode: barcode?.trim() || null,
				lotNumber: lotNumber?.trim() || null,
				expirationDate: expiration,
			})
			.returning();

		const created = newItem[0];
		if (!created)
			return reply.status(500).send({
				error: "InventoryItemNotSaved",
				message:
					"Позиция склада не создана: сервер не сохранил запись. Проверьте название и повторите; если снова не выйдет — сообщите администратору клиники.",
			});
		return created;
	});

	// PATCH adjust stock quantity (staff/admin only, never below 0)
	server.patch<{
		Params: { organizationId: string; itemId: string };
		Body: { adjustment: number };
	}>("/:organizationId/:itemId/stock", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory adjust stock",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedStock = inventoryStockBodySchema.safeParse(request.body);
		if (!parsedStock.success) {
			return reply.status(400).send({
				error: "AdjustmentInvalid",
				message:
					"Количество для склада не разобрано: его нужно указать числом, например 10 для прихода или 10 для списания. Исправьте количество и повторите.",
			});
		}
		const { adjustment } = parsedStock.data;
		if (adjustment === 0) {
			// БЫЛО: ноль проходил как 200 с обновлённой строкой, при этом строка в
			// журнал движений не писалась вовсе (условие actualAdjustment !== 0
			// ниже). То есть сервер отвечал успехом на запрос, который не сделал
			// ничего, и кладовщик читал «Остаток изменён» на неизменённом остатке.
			return reply.status(400).send({
				error: "AdjustmentZero",
				message:
					"Количество не указано: ни приход, ни списание не может быть нулевым. Укажите, сколько штук пришло или списано, и повторите.",
			});
		}

		// Read-modify-write on stock must be atomic: two concurrent PATCHes would
		// otherwise both read the same currentStock, compute newStock from the stale
		// value, and write absolute quantities — losing one adjustment (lost update)
		// and potentially driving stock negative despite the clamp. Lock the row
		// FOR UPDATE inside a transaction so the second writer blocks until the first
		// commits and then re-reads the fresh value.
		const result = await db.transaction(async (tx) => {
			const [item] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.id, itemId),
						eq(inventoryItems.organizationId, organizationId),
					),
				)
				.limit(1)
				.for("update");

			if (!item) return { notFound: true as const };

			const currentStock = Number(item.stockQuantity ?? 0);

			/*
			 * ЧТО БЫЛО СЛОМАНО, И ЭТО НЕ ПРО ТЕКСТ, А ПРО УТРАТУ ДАННЫХ.
			 *
			 * Здесь стояло `Math.max(-currentStock, adjustment)`: списание 10 при
			 * остатке 2 давало списание 2, остаток 0, ответ 200 с обновлённой
			 * строкой, а в журнал inventoryTransactions уходило -2. Запрошенные 10 не
			 * сохранялись НИГДЕ. Физически материала нет, по базе остаток обнулился
			 * «правильно», расход по услугам не сходится, и восстановить, сколько
			 * списывали на самом деле, уже невозможно — всплывает через недели, на
			 * инвентаризации, когда спорить не с чем.
			 *
			 * Крайний случай был ещё хуже: списание при остатке 0 давало поправку 0,
			 * ответ 200 с строкой материала и НИ ОДНОЙ строки в журнале, то есть
			 * успех на запрос, который не сделал ничего.
			 *
			 * Экран склада эту дорогу уже закрыл своей проверкой
			 * (apps/web/src/components/inventory/useInventoryLogic.ts:708-714), но
			 * граница правды — сервер: офлайн-очередь повторов, внешняя интеграция и
			 * любой будущий экран приходят прямо сюда. Поэтому отказ стоит здесь.
			 *
			 * Списание РОВНО в ноль остаётся законным: отказ только когда просят
			 * больше, чем лежит на полке.
			 */
			if (adjustment < 0 && -adjustment > currentStock) {
				return {
					insufficient: {
						name: item.name,
						unit: item.unit,
						currentStock,
						requested: -adjustment,
					},
				} as const;
			}

			const actualAdjustment = adjustment;
			const newStock = currentStock + actualAdjustment;

			const [updated] = await tx
				.update(inventoryItems)
				.set({ stockQuantity: String(newStock), updatedAt: new Date() })
				.where(
					and(
						eq(inventoryItems.id, itemId),
						eq(inventoryItems.organizationId, organizationId),
					),
				)
				.returning();

			if (!updated) return { failed: true as const };

			// Log the transaction (same tx: the ledger entry commits atomically with the balance change)
			if (actualAdjustment !== 0) {
				const userContext = request.user;
				await tx.insert(inventoryTransactions).values({
					organizationId,
					inventoryItemId: itemId,
					quantityChanged: String(actualAdjustment),
					unitCostRub: updated.unitCostRub,
					transactionType: "manual_adjust",
					userId: userContext?.id ?? null,
				});
			}

			return { updated };
		});

		if ("notFound" in result)
			return reply.status(404).send({
				error: "ItemNotFound",
				message:
					"Этот материал на складе клиники не найден: возможно, его уже удалили из списка. Обновите список склада и повторите — если материал нужен, добавьте его заново.",
			});
		if ("insufficient" in result) {
			// 409, а не 400: запрос сам по себе правильный, ему мешает остаток на
			// полке. Текст называет материал, остаток, запрошенное количество и
			// действие; «Приход на склад» — реальная подпись окна прихода в
			// InventoryView.tsx, поэтому человек не отправляется в несуществующее
			// место. Единица измерения берётся у самого материала, а не зашивается.
			const { name, unit, currentStock, requested } = result.insufficient;
			const measure = unit?.trim() || "шт";
			return reply.status(409).send({
				error: "InsufficientStock",
				message:
					`Нельзя списать ${requested} ${measure} материала «${name}»: на складе ${currentStock} ${measure}. ` +
					"Исправьте количество или сначала проведите «Приход на склад» — списание больше остатка сервер не принимает, " +
					"иначе расход по услугам разойдётся с фактическим и на инвентаризации это уже не восстановить.",
				itemName: name,
				currentStock,
				requested,
			});
		}
		if ("failed" in result)
			return reply.status(500).send({
				error: "StockNotSaved",
				message:
					"Остаток не сохранён: сервер не смог записать движение по складу. Проверьте остаток в списке склада и повторите операцию; если повторится, сообщите администратору клиники.",
			});
		return result.updated;
	});

	// PUT update inventory item details (staff/admin only)
	server.put<{
		Params: { organizationId: string; itemId: string };
		Body: {
			name: string;
			criticalThreshold?: number;
			unitCostRub?: number;
			sku?: string | null;
			barcode?: string | null;
			lotNumber?: string | null;
			expirationDate?: string | null;
		};
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

		/*
		 * Правка материала сохраняла только название, порог и цену.
		 *
		 * Артикул и штрихкод форма присылала, а `.set()` их не писал: кладовщик
		 * менял штрихкод, видел «Материал обновлён» и получал прежнее значение.
		 * Молчаливая потеря введённого хуже отказа — человек уверен, что данные
		 * сохранены.
		 *
		 * Умолчание порога снижено с 5 до 0 по той же причине, что и при создании:
		 * пятёрка бралась с потолка и заставляла склад сигналить о дефиците
		 * материала, для которого порога не задавали.
		 */
		const parsedUpdate = inventoryCreateBodySchema.safeParse(
			request.body ?? {},
		);
		if (!parsedUpdate.success) {
			return reply.status(400).send({
				error: "NameRequired",
				message: "Укажите название материала.",
			});
		}
		const {
			name,
			criticalThreshold = 0,
			unitCostRub = 0,
			sku = null,
			barcode = null,
			lotNumber = null,
			expirationDate = null,
		} = parsedUpdate.data;
		if (!name?.trim()) {
			return reply.status(400).send({
				error: "NameRequired",
				message: "Укажите название материала.",
			});
		}
		const expiration = normalizedExpirationDate(expirationDate);
		if (expiration === INVALID_DATE) {
			return reply.status(400).send({
				error: "ExpirationDateInvalid",
				message: "Срок годности указывается датой, например 31.03.2027.",
			});
		}

		const [existing] = await db
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existing) return reply.status(404).send({ error: "Item not found" });

		const [updated] = await db
			.update(inventoryItems)
			.set({
				name: name.trim(),
				criticalThreshold: String(Math.max(0, criticalThreshold)),
				unitCostRub: String(Math.max(0, unitCostRub)),
				sku: sku?.trim() || null,
				barcode: barcode?.trim() || null,
				lotNumber: lotNumber?.trim() || null,
				expirationDate: expiration,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.returning();

		if (!updated)
			return reply.status(500).send({
				error: "InventoryItemNotSaved",
				message:
					"Позиция склада не сохранена: сервер не записал изменения. Проверьте данные и повторите; если снова не выйдет — сообщите администратору клиники.",
			});
		return updated;
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

		const [existing] = await db
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existing) return reply.status(404).send({ error: "Item not found" });

		// БЫЛО: DELETE по id после SELECT с org — без organizationId в WHERE и без
		// RETURNING: 0 строк всё равно success:true.
		// СТАЛО: and(id, organizationId) + RETURNING; пусто — 404.
		const [deleted] = await db
			.delete(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.returning({ id: inventoryItems.id });
		if (!deleted) return reply.status(404).send({ error: "Item not found" });
		return { success: true };
	});

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
					createdAt: procedureMaterialRules.createdAt,
					itemName: inventoryItems.name,
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
			.select({ id: serviceCatalogItems.id })
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
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, inventoryItemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!item) return reply.status(404).send({ error: "Item not found" });

		// БЫЛО: SELECT/UPDATE правила по serviceId+itemId / id без organizationId;
		// INSERT не писал organizationId (колонка nullable есть в схеме) — чужая
		// клиника могла пересечься по UUID услуги/материала, а UPDATE шёл id-only.
		// СТАЛО: фильтр по organizationId на SELECT/UPDATE; INSERT выставляет org.
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
					quantityToDeduct: String(Math.max(1, quantityToDeduct)),
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
				quantityToDeduct: String(Math.max(1, quantityToDeduct)),
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

		// Confirm the rule belongs to a service owned by this org before deleting,
		// otherwise the bare id would allow deleting another clinic's rule (IDOR).
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

		// БЫЛО: DELETE id-only после join-проверки org через service; 0 строк → success.
		// СТАЛО: organizationId в WHERE (колонка есть) + RETURNING.
		// Старые строки с organizationId NULL: join SELECT выше уже подтвердил
		// владение через serviceCatalogItems — fallback DELETE по id только для них,
		// с RETURNING (без фейкового success на 0 строк).
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
			// No id-only fallback: nullable organizationId legacy rows must be repaired
			// by migration, not deleted without org defense-in-depth.
			return reply.status(404).send({ error: "Rule not found" });
		}
		return { success: true };
	});
};
