import crypto from "node:crypto";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	DEFAULT_804N_CONSUMABLE_LINKS,
	visitStockDeductionRequestSchema,
} from "@dental/shared";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { getRequestIdentity } from "../security/identity.js";

declare module "fastify" {
	interface FastifyRequest {
		user?: { id: string; role?: string; organizationId?: string; [key: string]: unknown };
	}
}

import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	serviceCatalogItems,
	stockBatches,
} from "../db/schema.js";
import { inventoryQuery } from "../db/inventoryQuery.js";
import { seedDefaultProcedureMaterialRules } from "../services/inventory/defaultBomSeeds.js";
import {
	fefoStockService,
	getDefaultExpirationDate,
	normalizeDateToIso,
} from "../services/inventory/fefoStockService.js";
import { InsufficientStockError } from "../services/inventory/materialDeduction.js";
import { ReorderSuggestionService } from "../services/reorderSuggestionService.js";
import { TreatmentConsumablesService } from "../services/treatmentConsumablesService.js";

/**
 * Тела склада раньше читались через bare destructure `const { … } = request.body`.
 * При null/undefined body (POST/PATCH без JSON) это бросало TypeError → 500.
 * Zod safeParse после auth-first закрывает путь: 400 с прежними текстами.
 */
const inventoryCreateBodySchema = z.object({
	name: z.string().optional(),
	criticalThreshold: z.number().finite().nonnegative().optional(),
	unitCostRub: z.number().finite().nonnegative().optional(),
	stockQuantity: z.number().finite().nonnegative().optional(),
	sku: z.string().nullable().optional(),
	barcode: z.string().nullable().optional(),
	lotNumber: z.string().nullable().optional(),
	expirationDate: z.string().nullable().optional(),
});

const inventoryUpdateBodySchema = z.object({
	name: z.string().optional(),
	criticalThreshold: z.number().finite().nonnegative().optional(),
	unitCostRub: z.number().finite().nonnegative().optional(),
	stockQuantity: z.number().finite().nonnegative().optional(),
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
	allowOverdraft: z.boolean().default(true).optional(),
	reason: z.string().optional(),
	isClinicalOperation: z.boolean().optional(),
	batchNumber: z.string().optional(),
	lotNumber: z.string().optional(),
	expirationDate: z.string().optional(),
	manufactureDate: z.string().nullable().optional(),
	purchasePricePerUnit: z.number().finite().nonnegative().optional(),
	barcode: z.string().nullable().optional(),
});

const inventoryReceiveBatchBodySchema = z.object({
	inventoryItemId: z
		.string({
			required_error: "Укажите ID материала",
			invalid_type_error: "ID материала должен быть строкой",
		})
		.min(1, { message: "Укажите ID материала" }),
	warehouseId: z.string().nullable().optional(),
	batchNumber: z.string().optional(),
	lotNumber: z.string().optional(),
	expirationDate: z.string().optional(),
	manufactureDate: z.string().nullable().optional(),
	quantity: z
		.number({
			required_error: "Укажите количество для оприходования",
			invalid_type_error: "Количество должно быть числом",
		})
		.finite({ message: "Количество должно быть числом" })
		.positive({ message: "Количество приходуемой партии должно быть больше 0" }),
	purchasePricePerUnit: z.number().finite().nonnegative().optional(),
	barcode: z.string().nullable().optional(),
	notes: z.string().optional(),
});

const acceptanceWaybillItemSchema = z.object({
	inventoryItemId: z.string().optional(),
	name: z.string().min(1, "Наименование материала обязательно"),
	category: z.string().optional(),
	unit: z.string().default("шт"),
	batchNumber: z.string().min(1, "Номер серии / партии обязателен"),
	lotNumber: z.string().optional(),
	expirationDate: z.string().min(1, "Срок годности обязателен"),
	manufactureDate: z.string().nullable().optional(),
	quantity: z.number().finite().positive("Количество должно быть больше нуля"),
	purchasePriceKopecks: z.number().int().nonnegative().optional(),
	purchasePricePerUnit: z.number().finite().nonnegative().optional(),
	vatRate: z.number().finite().default(0),
	barcode: z.string().nullable().optional(),
	sku: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
});

const acceptanceWaybillBodySchema = z.object({
	supplierName: z.string().min(1, "Наименование поставщика обязательно"),
	supplierInn: z.string().nullable().optional(),
	waybillNumber: z.string().min(1, "Номер накладной обязателен"),
	receiptDate: z.string().min(1, "Дата прихода обязательна"),
	warehouseId: z.string().nullable().optional(),
	warehouseName: z.string().nullable().optional(),
	items: z.array(acceptanceWaybillItemSchema).min(1, "Накладная должна содержать хотя бы одну позицию"),
	notes: z.string().nullable().optional(),
	organizationId: z.string().optional(),
});

const inventoryDeductItemSchema = z.object({
	inventoryItemId: z.string().optional(),
	id: z.string().optional(),
	name: z.string().optional(),
	quantity: z
		.number({
			required_error: "Укажите количество для списания",
			invalid_type_error: "Количество должно быть числом",
		})
		.finite({ message: "Количество должно быть числом" })
		.positive({ message: "Количество для списания должно быть больше 0" }),
	unitCostRub: z.union([z.number(), z.string()]).optional(),
	allowOverdraft: z.boolean().default(true).optional(),
	reason: z.string().optional(),
	notes: z.string().optional(),
	lotNumber: z.string().nullable().optional(),
	expirationDate: z.string().nullable().optional(),
});

const inventoryDeductBatchBodySchema = z.union([
	z.array(inventoryDeductItemSchema),
	z.object({
		items: z.array(inventoryDeductItemSchema).optional(),
		materials: z.array(inventoryDeductItemSchema).optional(),
		organizationId: z.string().optional(),
		reason: z.string().optional(),
		notes: z.string().optional(),
		operationTitle: z.string().optional(),
		hasWarehouseDelay: z.boolean().optional(),
		visitId: z.string().optional(),
		cabinetId: z.string().optional(),
		doctorName: z.string().optional(),
		nurseName: z.string().optional(),
		allowOverdraft: z.boolean().default(true).optional(),
	}),
	inventoryDeductItemSchema,
]);

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
	quantityToDeduct: z
		.number({
			required_error: "Missing required fields",
			invalid_type_error: "Missing required fields",
		})
		.finite({ message: "Количество должно быть числом" })
		.positive({ message: "Количество должно быть больше 0" }),
});

const inventoryStornoItemSchema = z.object({
	inventoryItemId: z.string().optional(),
	id: z.string().optional(),
	name: z.string().optional(),
	quantity: z
		.number({
			required_error: "Укажите количество для сторно",
			invalid_type_error: "Количество должно быть числом",
		})
		.finite({ message: "Количество должно быть числом" })
		.positive({ message: "Количество для возврата на склад должно быть больше 0" }),
	reason: z.string().optional(),
	notes: z.string().optional(),
});

const inventoryStornoServiceSchema = z.object({
	serviceId: z.string().optional(),
	serviceCode: z.string().optional(),
	code804n: z.string().optional(),
	title: z.string().optional(),
	toothCode: z.string().optional(),
	toothNumber: z.union([z.number(), z.string()]).optional(),
	quantity: z.number().finite().positive().default(1),
	reason: z.string().optional(),
});

const inventoryStornoBodySchema = z.object({
	visitId: z.string().optional(),
	service: inventoryStornoServiceSchema.optional(),
	services: z.array(inventoryStornoServiceSchema).optional(),
	items: z.array(inventoryStornoItemSchema).optional(),
	materials: z.array(inventoryStornoItemSchema).optional(),
	reason: z.string().optional(),
	notes: z.string().optional(),
	cancelVisit: z.boolean().optional(),
	organizationId: z.string().optional(),
});

const inventoryOverdraftAlertBodySchema = z.object({
	visitId: z.string().optional(),
	visitNumber: z.union([z.string(), z.number()]).optional(),
	chairId: z.string().optional(),
	cabinetId: z.string().optional(),
	message: z.string().optional(),
	items: z
		.array(
			z.object({
				itemId: z.string().optional(),
				inventoryItemId: z.string().optional(),
				itemName: z.string().optional(),
				deficitQty: z.number().finite().optional(),
				quantity: z.number().finite().optional(),
			}),
		)
		.default([]),
});


/**
 * Метка «дату прислали, но разобрать её нельзя».
 *
 * Отличать её от пустого значения обязательно: пустой срок годности —
 * нормальное состояние (у многих расходников его просто не пишут), а
 * непонятная строка означает ошибку ввода, и молча превращать её в «срока нет»
 * значит потерять предупреждение о просрочке.
 */
export const INVALID_DATE = Symbol("invalid-expiration-date");

/**
 * Приведение срока годности к виду, который принимает колонка date (YYYY-MM-DD).
 *
 * Принимает как ISO-формат «YYYY-MM-DD» (2027-03-31), так и российский формат «DD.MM.YYYY» (31.03.2027).
 * Всё остальное, включая невалидные дни в месяце (например, 31.02.2027), — ошибка INVALID_DATE.
 */
export function normalizedExpirationDate(
	value: string | null | undefined,
): string | null | typeof INVALID_DATE {
	if (value === null || value === undefined) return null;
	const trimmed = String(value).trim();
	if (!trimmed) return null;

	let isoCandidate: string;
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		isoCandidate = trimmed;
	} else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		const [dd, mm, yyyy] = trimmed.split(".");
		isoCandidate = `${yyyy}-${mm}-${dd}`;
	} else {
		return INVALID_DATE;
	}

	const parsed = new Date(`${isoCandidate}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) return INVALID_DATE;
	// 2027-02-31 разбирается в 3 марта: сверяем, что дата не «уехала».
	if (parsed.toISOString().slice(0, 10) !== isoCandidate) return INVALID_DATE;
	return isoCandidate;
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

			const items = await inventoryQuery.getInventoryItems(organizationId);
			return items;
		},
	);

	// GET /:organizationId/items — alias for inventory read
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/items",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory read items",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(organizationId);
			return items;
		},
	);

	// GET /:organizationId/batches — Получение партий FEFO со сроками годности (inventoryQuery SSOT)
	server.get<{
		Params: { organizationId: string };
		Querystring: {
			itemId?: string;
			status?: "active" | "depleted" | "expired" | "quarantine" | "all";
			warehouseId?: string;
			limit?: string | number;
			offset?: string | number;
		};
	}>(
		"/:organizationId/batches",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory batches read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const limit = request.query.limit ? Number(request.query.limit) : undefined;
			const offset = request.query.offset ? Number(request.query.offset) : undefined;

			const batches = await inventoryQuery.getStockBatches(organizationId, {
				itemId: request.query.itemId,
				status: request.query.status,
				warehouseId: request.query.warehouseId,
				limit,
				offset,
			});
			return batches;
		},
	);

	// GET /batches — Получение партий FEFO с автоопределением организации (Zero Dead-Ends)
	server.get<{
		Querystring: {
			itemId?: string;
			status?: "active" | "depleted" | "expired" | "quarantine" | "all";
			warehouseId?: string;
			limit?: string | number;
			offset?: string | number;
		};
	}>(
		"/batches",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory batches read",
			);
			if (!resolvedOrgId) return;

			const limit = request.query.limit ? Number(request.query.limit) : undefined;
			const offset = request.query.offset ? Number(request.query.offset) : undefined;

			const batches = await inventoryQuery.getStockBatches(resolvedOrgId, {
				itemId: request.query.itemId,
				status: request.query.status,
				warehouseId: request.query.warehouseId,
				limit,
				offset,
			});
			return batches;
		},
	);

	// GET /:organizationId/batches/expiring — Мониторинг истекающих партий (Shelf-Life Monitor)
	server.get<{
		Params: { organizationId: string };
		Querystring: { daysAhead?: string | number };
	}>(
		"/:organizationId/batches/expiring",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory expiring batches read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const daysAhead = request.query.daysAhead ? Number(request.query.daysAhead) : 30;
			const batches = await inventoryQuery.getExpiringBatches(organizationId, daysAhead);
			return batches;
		},
	);

	// GET /batches/expiring — Мониторинг истекающих партий с автоопределением организации
	server.get<{
		Querystring: { daysAhead?: string | number };
	}>(
		"/batches/expiring",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory expiring batches read",
			);
			if (!resolvedOrgId) return;

			const daysAhead = request.query.daysAhead ? Number(request.query.daysAhead) : 30;
			const batches = await inventoryQuery.getExpiringBatches(resolvedOrgId, daysAhead);
			return batches;
		},
	);

	// GET /reorder-suggestions — Предиктивные рекомендации к закупкам (DentalPin Reorder Point)
	server.get<{ Querystring: { onlyNeedingReorder?: string | boolean } }>(
		"/reorder-suggestions",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory reorder suggestions read",
			);
			if (!resolvedOrgId) return;

			const onlyNeedingReorder =
				request.query.onlyNeedingReorder === "true" ||
				request.query.onlyNeedingReorder === true;

			const suggestions = await ReorderSuggestionService.getSuggestions(
				resolvedOrgId,
				{ onlyNeedingReorder },
			);
			return reply.status(200).send(suggestions);
		},
	);

	// GET /:organizationId/reorder-suggestions
	server.get<{
		Params: { organizationId: string };
		Querystring: { onlyNeedingReorder?: string | boolean };
	}>("/:organizationId/reorder-suggestions", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"inventory reorder suggestions read",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const onlyNeedingReorder =
			request.query.onlyNeedingReorder === "true" ||
			request.query.onlyNeedingReorder === true;

		const suggestions = await ReorderSuggestionService.getSuggestions(
			organizationId,
			{ onlyNeedingReorder },
		);
		return reply.status(200).send(suggestions);
	});

	// GET /:organizationId/alerts — сводка по дефициту и срокам годности материалов
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/alerts",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory alerts read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(organizationId);

			const now = new Date();
			const todayStr = now.toISOString().slice(0, 10);
			const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
			const in30DaysStr = in30Days.toISOString().slice(0, 10);

			const lowStockItems: typeof items = [];
			const outOfStockItems: typeof items = [];
			const expiredItems: typeof items = [];
			const expiringSoonItems: typeof items = [];

			let totalValuationRub = 0;

			for (const item of items) {
				const stock = Number(item.stockQuantity ?? 0);
				const threshold = Number(item.criticalThreshold ?? 0);
				const cost = Number(item.unitCostRub ?? 0);

				if (Number.isFinite(stock) && Number.isFinite(cost)) {
					totalValuationRub += Math.max(0, stock) * Math.max(0, cost);
				}

				if (stock <= 0) {
					outOfStockItems.push(item);
				} else if (threshold > 0 && stock <= threshold) {
					lowStockItems.push(item);
				}

				if (item.expirationDate) {
					if (item.expirationDate < todayStr) {
						expiredItems.push(item);
					} else if (item.expirationDate <= in30DaysStr) {
						expiringSoonItems.push(item);
					}
				}
			}

			return {
				summary: {
					totalItems: items.length,
					totalValuationRub: Number(totalValuationRub.toFixed(2)),
					lowStockCount: lowStockItems.length,
					outOfStockCount: outOfStockItems.length,
					expiredCount: expiredItems.length,
					expiringSoonCount: expiringSoonItems.length,
				},
				lowStockItems,
				outOfStockItems,
				expiredItems,
				expiringSoonItems,
			};
		},
	);

	const handleCreateInventoryItem = async (
		organizationId: string,
		rawBody: unknown,
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const parsedBody = inventoryCreateBodySchema.safeParse(rawBody ?? {});
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
	};

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
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleCreateInventoryItem(organizationId, request.body, request, reply);
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
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleCreateInventoryItem(organizationId, request.body, request, reply);
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
			const actualAdjustment = adjustment;

			// Мандат 8s & 8e: если это приход товара (actualAdjustment > 0),
			// проводим его через партионный учет FEFO (receiveBatch),
			// чтобы физически создать запись в stock_batches и ликвидировать
			// накопленный технический дефицит/овердрафт, если остаток был отрицательным.
			if (actualAdjustment > 0) {
				const userContext = request.user;
				const identity = getRequestIdentity(request);
				const effectiveUserId = identity.userId ?? userContext?.id ?? null;
				const batchNumber =
					parsedStock.data.batchNumber ||
					parsedStock.data.lotNumber ||
					item.lotNumber ||
					`BATCH-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
				const expirationDate =
					parsedStock.data.expirationDate ||
					item.expirationDate ||
					getDefaultExpirationDate();
				const purchasePrice =
					parsedStock.data.purchasePricePerUnit != null
						? parsedStock.data.purchasePricePerUnit
						: item.unitCostRub != null
							? Number(item.unitCostRub)
							: undefined;

				const createdBatch = await fefoStockService.receiveBatch(tx, {
					organizationId,
					inventoryItemId: itemId,
					batchNumber,
					expirationDate,
					manufactureDate: parsedStock.data.manufactureDate || undefined,
					quantity: actualAdjustment,
					purchasePricePerUnit: purchasePrice,
					barcode: parsedStock.data.barcode || item.barcode || undefined,
					userId: effectiveUserId,
					notes:
						parsedStock.data.reason ||
						`Поступление товара по складу (+${actualAdjustment} ед.)`,
				});

				const [updated] = await tx
					.select()
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.id, itemId),
							eq(inventoryItems.organizationId, organizationId),
						),
					)
					.limit(1);

				return { updated: updated ?? item, isOverdraft: false, batch: createdBatch };
			}

			const newStock = currentStock + actualAdjustment;
			const isOverdraft = newStock < 0;
			const identity = getRequestIdentity(request);
			const isClinicalRole =
				identity.role === "doctor" ||
				identity.role === "assistant" ||
				identity.role === "nurse" ||
				identity.role === "senior_nurse" ||
				identity.role === "owner" ||
				identity.role === "admin" ||
				identity.role === "chief_doctor" ||
				request.user?.role === "doctor" ||
				request.user?.role === "assistant" ||
				request.user?.role === "nurse" ||
				request.user?.role === "senior_nurse" ||
				request.user?.role === "owner" ||
				request.user?.role === "admin" ||
				request.user?.role === "chief_doctor";
			const isClinicalCategory =
				item.category === "anesthesia" ||
				item.category === "anesthetic" ||
				item.category === "consumable" ||
				item.category === "consumables" ||
				item.category === "ppe" ||
				item.category === "composite" ||
				item.category === "surgery" ||
				item.category === "hygiene" ||
				item.category === "auxiliary" ||
				item.category === "material" ||
				item.category === "medication" ||
				item.category === "dental" ||
				item.category === "general" ||
				item.category === "orthodontic" ||
				item.category === "orthopedic" ||
				item.category === "endodontic" ||
				item.category === "disinfection" ||
				item.category === "Расходные материалы" ||
				item.category === "Анестетики" ||
				item.category === "Медикаменты" ||
				item.category === "Шовный материал" ||
				item.category === "Перевязочные средства" ||
				item.category === "СИЗ" ||
				item.category === "Дезинфекция" ||
				item.category === "Пломбировочные материалы" ||
				item.category === "Эндодонтия" ||
				item.category === "Ортопедия" ||
				item.category === "Хирургия";
			const isClinicalOperation =
				isClinicalRole ||
				isClinicalCategory ||
				parsedStock.data.isClinicalOperation === true ||
				Boolean(
					parsedStock.data.reason &&
						/(операци|лечени|при[её]м|визит|дефицит|экстрен|карпул|анесте|расход|списан)/i.test(
							parsedStock.data.reason,
						),
				) ||
				Boolean(
					item.name &&
						/(карпул|анесте|ультракаин|септодонт|септанест|септонест|скандонест|убистезин|артикаин|мепивакаин|лидокаин|бупивакаин|перчатк|маск|игла|валик|слюноотсос|коффердам|пломб|композит|шовн|скальпель|губк|паст|клин|матриц|дезинфек|шприц|крафт|салфет|порошок|гель|цемент)/i.test(
							item.name,
						),
				);

			// Списание со склада (actualAdjustment < 0) — автоматический FEFO партионный учет
			if (actualAdjustment < 0) {
				const requiredQty = Math.abs(actualAdjustment);
				const userContext = request.user;
				const effectiveUserId = identity.userId ?? userContext?.id ?? null;
				const isAllowedOverdraft =
					parsedStock.data.allowOverdraft !== false || isClinicalOperation;

				let fefoResult: Awaited<ReturnType<typeof fefoStockService.deductFefo>>;
				try {
					fefoResult = await fefoStockService.deductFefo(tx, {
						organizationId,
						inventoryItemId: itemId,
						requiredQty,
						allowOverdraft: isAllowedOverdraft,
						notes:
							parsedStock.data.reason ||
							(isClinicalOperation
								? `Списание под операцию/приём (мягкий минусовой овердрафт партии, накладная ещё не внесена: дефицит ${Math.abs(newStock)} ед., Мандат 8e, 8v)`
								: "Списание со склада (FEFO)"),
						userId: effectiveUserId,
						transactionType: isClinicalOperation
							? "treatment_consumable"
							: (isOverdraft ? "emergency_overdraft" : "manual_adjust"),
					});
				} catch (err) {
					if (err instanceof InsufficientStockError) {
						return { insufficientStock: true as const, currentStock };
					}
					throw err;
				}

				const [updated] = await tx
					.select()
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.id, itemId),
							eq(inventoryItems.organizationId, organizationId),
						),
					)
					.limit(1);

				return { updated: updated ?? item, isOverdraft: fefoResult.isOverdraft };
			}

			if (isOverdraft && parsedStock.data.allowOverdraft === false && !isClinicalOperation) {
				return { insufficientStock: true as const, currentStock };
			}

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
				const effectiveUserId = identity.userId ?? userContext?.id ?? null;
				await tx.insert(inventoryTransactions).values({
					organizationId,
					inventoryItemId: itemId,
					quantityChanged: String(actualAdjustment),
					unitCostRub: updated.unitCostRub,
					transactionType: isOverdraft ? "emergency_overdraft" : "manual_adjust",
					isOverdraft,
					notes: isOverdraft
						? (parsedStock.data.reason || `Списано под операцию/приём (мягкий минусовой овердрафт партии, накладная ещё не внесена: дефицит ${Math.abs(newStock)} ед., Мандат 8e)`)
						: (parsedStock.data.reason || null),
					userId: effectiveUserId,
				});
			}

			return { updated, isOverdraft };
		});

		if ("notFound" in result)
			return reply.status(404).send({
				error: "ItemNotFound",
				message:
					"Этот материал на складе клиники не найден: возможно, его уже удалили из списка. Обновите список склада и повторите — если материал нужен, добавьте его заново.",
			});
		if ("insufficientStock" in result)
			return reply.status(400).send({
				error: "insufficientStock",
				message: `Недостаточно остатка на складе (текущий остаток: ${result.currentStock}). Списание не может уводить остаток в минус.`,
			});
		if ("failed" in result)
			return reply.status(500).send({
				error: "StockNotSaved",
				message:
					"Остаток не сохранён: сервер не смог записать движение по складу. Проверьте остаток в списке склада и повторите операцию; если повторится, сообщите администратору клиники.",
			});
		if (result.isOverdraft) {
			return {
				...result.updated,
				isOverdraft: true,
				warning: `Остаток 0: зафиксирован мягкий овердрафт (дефицит: ${Math.abs(Number(result.updated.stockQuantity))} ед., накладная поставщика ещё в пути, списание под операцию проведено без блокировки врача по Мандату 8e).`,
			};
		}
		return result.updated;
	});

	// PUT update inventory item details (staff/admin only)
	server.put<{
		Params: { organizationId: string; itemId: string };
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
		const parsedUpdate = inventoryUpdateBodySchema.safeParse(
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
				message: `Засеяно ${result.createdRulesCount} технологических карт 804н (${result.createdServicesCount} услуг, ${result.createdItemsCount} расходников). Всего активных правил: ${result.totalRulesCount}.`,
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

	// POST /:organizationId/quick-writeoff-standard-kit — 1-клик списание базового набора приёма
	// (перчатки 2 пары, маска 2 шт., слюноотсос 1 шт., нагрудник 1 шт., валики 6 шт.)
	// без поиска по 1000 позициям и без комиссии из 3 человек.
	server.post<{
		Params: { organizationId: string };
		Body?: { cabinetId?: string; visitId?: string; notes?: string };
	}>("/:organizationId/quick-writeoff-standard-kit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff standard kit",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const userContext = request.user;

		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffStandardKit(tx, {
				organizationId,
				userId: userContext?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// POST /:organizationId/quick-writeoff-carpules — 1-клик списание пустых карпул анестетиков
	// медсестрой (СанПиН 3.3686-21, отходы Класса Б) без требования комиссии из 3 человек.
	server.post<{
		Params: { organizationId: string };
		Body?: { carpulesCount?: number; drugName?: string; visitId?: string; notes?: string };
	}>("/:organizationId/quick-writeoff-carpules", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff carpules",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const userContext = request.user;

		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
				organizationId,
				carpulesCount: body.carpulesCount,
				drugName: body.drugName,
				userId: userContext?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// POST /:organizationId/quick-writeoff-shift-bundle — 1-клик пакетное списание смены
	// (комплект терапия / ортопедия / хирургия) без прокликивания 40 позиций.
	server.post<{
		Params: { organizationId: string };
		Body?: { bundleType?: "therapy" | "orthopedics" | "surgery"; visitId?: string; notes?: string };
	}>("/:organizationId/quick-writeoff-shift-bundle", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff shift bundle",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const userContext = request.user;

		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffShiftBundle(tx, {
				organizationId,
				bundleType: body.bundleType || "therapy",
				userId: userContext?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// POST /:organizationId/quick-writeoff-visit-bundle — 1-клик списание набора клинического приёма
	// (терапия: карпула + игла + перчатки + слюноотсос + валики + нагрудник;
	//  хирургия: карпула + игла + скальпель + шовный материал + гемостатическая губка)
	// без созыва комиссий и с поддержкой мягкого овердрафта (Мандат 8e п. 10).
	server.post<{
		Params: { organizationId: string };
		Body?: { visitType?: "therapy" | "surgery" | "implant" | "sinus_gbr"; visitId?: string; notes?: string };
	}>("/:organizationId/quick-writeoff-visit-bundle", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff visit bundle",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const userContext = request.user;

		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
				organizationId,
				visitType: body.visitType || "therapy",
				userId: userContext?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// POST /:organizationId/quick-writeoff-package — 1-клик пакетное списание анестетиков и расходников
	// (Мандаты 8e п. 10, 8k, 8n: мягкий овердрафт склада без созыва комиссии из 3 человек).
	server.post<{
		Params: { organizationId: string };
		Body?: {
			packageId?: string;
			quantityMultiplier?: number;
			cabinetId?: string;
			doctorName?: string;
			nurseName?: string;
			patientName?: string;
			visitId?: string;
			notes?: string;
			allowOverdraft?: boolean;
			allowSoftOverdraft?: boolean;
		};
	}>("/:organizationId/quick-writeoff-package", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff package",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = identity.userId ?? userContext?.id ?? null;
		const pkgId = body.packageId || "anesthesia";
		const multiplier = Math.max(1, body.quantityMultiplier ?? 1);

		const result = await db.transaction(async (tx) => {
			if (pkgId === "anesthesia") {
				return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
					organizationId,
					carpulesCount: multiplier,
					userId: effectiveUserId,
					visitId: body.visitId ?? null,
					notes: body.notes ?? `Списание анестезии у кресла (пакет «Стандартная анестезия» x${multiplier})`,
				});
			}
			if (pkgId === "surgery") {
				return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
					organizationId,
					visitType: "surgery",
					userId: effectiveUserId,
					visitId: body.visitId ?? null,
					notes: body.notes ?? `Списание хирургического пакета у кресла x${multiplier}`,
				});
			}
			if (pkgId === "implant") {
				return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
					organizationId,
					visitType: "implant",
					userId: effectiveUserId,
					visitId: body.visitId ?? null,
					notes: body.notes ?? `Списание имплантологического пакета у кресла x${multiplier}`,
				});
			}
			if (pkgId === "sinus_gbr" || pkgId === "implant_gbr") {
				return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
					organizationId,
					visitType: "sinus_gbr",
					userId: effectiveUserId,
					visitId: body.visitId ?? null,
					notes: body.notes ?? `Списание пакета костной пластики / синус-лифтинга у кресла x${multiplier}`,
				});
			}
			return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
				organizationId,
				visitType: "therapy",
				userId: effectiveUserId,
				visitId: body.visitId ?? null,
				notes: body.notes ?? `Списание пакета приёма у кресла (${pkgId}) x${multiplier}`,
			});
		});

		return result;
	});

	// =========================================================================
	// BATCH RECEIPT & FEFO STOCK INTAKE (Мандаты 8e, 8k, 8s)
	// =========================================================================

	const handleReceiveBatchRequest = async (
		targetOrgId: string,
		rawBody: unknown,
		request: any,
		reply: any,
	) => {
		const parsed = inventoryReceiveBatchBodySchema.safeParse(rawBody);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message:
					parsed.error.errors[0]?.message ||
					"Неверные данные для оприходования партии",
				details: parsed.error.errors,
			});
		}

		const data = parsed.data;
		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = identity.userId ?? userContext?.id ?? null;

		try {
			const batch = await db.transaction(async (tx) => {
				return fefoStockService.receiveBatch(tx, {
					organizationId: targetOrgId,
					inventoryItemId: data.inventoryItemId,
					warehouseId: data.warehouseId ?? null,
					batchNumber:
						data.batchNumber ||
						data.lotNumber ||
						`LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
					expirationDate: data.expirationDate || getDefaultExpirationDate(),
					manufactureDate: data.manufactureDate ?? null,
					quantity: data.quantity,
					purchasePricePerUnit: data.purchasePricePerUnit ?? null,
					barcode: data.barcode ?? null,
					userId: effectiveUserId,
					notes: data.notes ?? null,
				});
			});

			return reply.status(201).send({
				success: true,
				message: `Партия ${batch.batchNumber} успешно оприходована (${data.quantity} ед.)`,
				batch,
			});
		} catch (error) {
			request.log.error(error, "Failed to receive batch");
			const msg =
				error instanceof Error
					? error.message
					: "Не удалось сохранить приходную партию";
			return reply.status(400).send({
				error: "ReceiveBatchFailed",
				message: msg,
			});
		}
	};

	// POST /:organizationId/receive-batch
	server.post<{
		Params: { organizationId: string };
		Body: z.infer<typeof inventoryReceiveBatchBodySchema>;
	}>("/:organizationId/receive-batch", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory receive batch",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleReceiveBatchRequest(organizationId, request.body, request, reply);
	});

	// POST /receive-batch
	server.post<{
		Body: z.infer<typeof inventoryReceiveBatchBodySchema> & {
			organizationId?: string;
		};
	}>("/receive-batch", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory receive batch",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleReceiveBatchRequest(targetOrgId, request.body, request, reply);
	});

	// =========================================================================
	// ACCEPTANCE WAYBILLS & SUPPLIER BATCH RECEIPT (Мандаты 8e, 8k, 8n, 8s)
	// =========================================================================

	const handleAcceptanceWaybillRequest = async (
		targetOrgId: string,
		rawBody: unknown,
		request: any,
		reply: any,
	) => {
		const parsed = acceptanceWaybillBodySchema.safeParse(rawBody);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message:
					parsed.error.errors[0]?.message ||
					"Неверные данные приходной накладной",
				details: parsed.error.errors,
			});
		}

		const data = parsed.data;
		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = identity.userId ?? userContext?.id ?? null;

		try {
			const result = await db.transaction(async (tx) => {
				const processedItems: Array<{
					inventoryItemId: string;
					name: string;
					batchId?: string | undefined;
					batchNumber: string;
					expirationDate: string;
					quantity: number;
					remainingInBatch: number;
					previousStock: number;
					newStock: number;
					overdraftExtinguished: boolean;
					clearedDeficit: number;
				}> = [];
				let totalCostKopecks = 0;
				let totalVatKopecks = 0;
				let totalQuantity = 0;
				let overdraftResolvedCount = 0;

				for (const item of data.items) {
					totalQuantity += item.quantity;
					const pricePerUnitRub =
						item.purchasePricePerUnit != null
							? item.purchasePricePerUnit
							: item.purchasePriceKopecks != null
								? item.purchasePriceKopecks / 100
								: 0;
					const priceKopecks =
						item.purchasePriceKopecks != null
							? item.purchasePriceKopecks
							: Math.round(pricePerUnitRub * 100);

					const itemSubtotalKopecks = Math.round(item.quantity * priceKopecks);
					const vatRate = item.vatRate ?? 0;
					const itemVatKopecks = Math.round((itemSubtotalKopecks * vatRate) / 100);
					const itemTotalKopecks = itemSubtotalKopecks + itemVatKopecks;

					totalCostKopecks += itemTotalKopecks;
					totalVatKopecks += itemVatKopecks;

					// 1. Поиск или создание карточки номенклатуры
					let targetItemId = item.inventoryItemId;
					let existingItem: typeof inventoryItems.$inferSelect | undefined;

					if (targetItemId) {
						const [found] = await tx
							.select()
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.id, targetItemId),
									eq(inventoryItems.organizationId, targetOrgId),
								),
							)
							.for("update");
						existingItem = found;
					}

					if (!existingItem) {
						const [foundByName] = await tx
							.select()
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.organizationId, targetOrgId),
									sql`lower(${inventoryItems.name}) = lower(${item.name.trim()})`,
								),
							)
							.limit(1)
							.for("update");
						existingItem = foundByName;
					}

					if (!existingItem) {
						const [createdItem] = await tx
							.insert(inventoryItems)
							.values({
								organizationId: targetOrgId,
								name: item.name.trim(),
								category: item.category || "material",
								unit: item.unit || "шт",
								stockQuantity: "0",
								currentQty: "0",
								criticalThreshold: "5",
								unitCostRub: String(pricePerUnitRub),
								pricePerUnit: String(pricePerUnitRub),
								lotNumber: item.batchNumber || item.lotNumber || null,
								expirationDate:
									normalizeDateToIso(item.expirationDate) ||
									getDefaultExpirationDate(),
								barcode: item.barcode?.trim() || null,
								sku: item.sku?.trim() || null,
							})
							.returning();
						existingItem = createdItem;
					}

					if (!existingItem) {
						throw new Error(`Не удалось создать материал "${item.name}"`);
					}
					targetItemId = existingItem.id;

					// 2. Ликвидация мягкого овердрафта (Мандат 8n):
					const currentStock = Number(
						existingItem.stockQuantity ?? existingItem.currentQty ?? 0,
					);
					const deficit = currentStock < 0 ? Math.abs(currentStock) : 0;
					if (deficit > 0) {
						overdraftResolvedCount++;
					}
					const remainingInBatch = Math.max(
						0,
						Number((item.quantity - deficit).toFixed(3)),
					);
					const isDepletedByDeficit = remainingInBatch <= 0;

					const batchNumber =
						(item.batchNumber || item.lotNumber || "").trim() ||
						`LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
					const expirationDate =
						normalizeDateToIso(item.expirationDate) || getDefaultExpirationDate();
					const manufactureDate = normalizeDateToIso(item.manufactureDate);

					// 3. Создаем партию FEFO в stock_batches
					const [createdBatch] = await tx
						.insert(stockBatches)
						.values({
							organizationId: targetOrgId,
							warehouseId: data.warehouseId ?? null,
							inventoryItemId: targetItemId,
							batchNumber,
							expirationDate,
							manufactureDate: manufactureDate ?? null,
							initialQty: String(item.quantity),
							remainingQty: String(remainingInBatch),
							purchasePricePerUnit: String(pricePerUnitRub),
							status: isDepletedByDeficit ? "depleted" : "active",
							barcode: item.barcode?.trim() || null,
						})
						.returning();

					// 4. Обновляем остаток в карточке номенклатуры
					const newStock = Number((currentStock + item.quantity).toFixed(3));
					const shouldUpdateCardDate =
						!existingItem.expirationDate ||
						expirationDate < existingItem.expirationDate;

					await tx
						.update(inventoryItems)
						.set({
							stockQuantity: String(newStock),
							currentQty: String(newStock),
							unitCostRub: String(pricePerUnitRub),
							pricePerUnit: String(pricePerUnitRub),
							...(shouldUpdateCardDate ? { expirationDate } : {}),
							...(item.barcode ? { barcode: item.barcode.trim() } : {}),
							...(item.sku ? { sku: item.sku.trim() } : {}),
							lotNumber: batchNumber,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(inventoryItems.id, targetItemId),
								eq(inventoryItems.organizationId, targetOrgId),
							),
						);

					// 5. Фиксируем транзакцию прихода в inventory_transactions
					await tx.insert(inventoryTransactions).values({
						organizationId: targetOrgId,
						itemId: targetItemId,
						inventoryItemId: targetItemId,
						batchId: createdBatch?.id ?? null,
						warehouseId: data.warehouseId ?? null,
						quantityChanged: String(item.quantity),
						qty: String(item.quantity),
						unitCostRub: String(pricePerUnitRub),
						transactionType: "receipt",
						isOverdraft: false,
						notes: `Накладная №${data.waybillNumber} от ${data.supplierName}${data.supplierInn ? ` (ИНН ${data.supplierInn})` : ""} • Партия ${batchNumber} [FEFO]`,
						userId: effectiveUserId,
					});

					processedItems.push({
						inventoryItemId: targetItemId,
						name: existingItem.name,
						batchId: createdBatch?.id,
						batchNumber,
						expirationDate,
						quantity: item.quantity,
						remainingInBatch,
						previousStock: currentStock,
						newStock,
						overdraftExtinguished: deficit > 0,
						clearedDeficit: deficit,
					});
				}

				return {
					success: true,
					waybillNumber: data.waybillNumber,
					supplierName: data.supplierName,
					supplierInn: data.supplierInn ?? null,
					receiptDate: data.receiptDate,
					warehouseId: data.warehouseId ?? null,
					warehouseName: data.warehouseName ?? "Основной склад",
					totalPositions: processedItems.length,
					totalQuantity,
					totalCostKopecks,
					totalVatKopecks,
					totalCostRubles: Number((totalCostKopecks / 100).toFixed(2)),
					overdraftResolvedCount,
					items: processedItems,
				};
			});

			return reply.status(201).send(result);
		} catch (error) {
			request.log.error(error, "Failed to accept waybill");
			const msg =
				error instanceof Error
					? error.message
					: "Не удалось оприходовать накладную";
			return reply.status(400).send({
				error: "AcceptanceWaybillFailed",
				message: msg,
			});
		}
	};

	// POST /:organizationId/acceptance-waybill
	server.post<{
		Params: { organizationId: string };
		Body: z.infer<typeof acceptanceWaybillBodySchema>;
	}>("/:organizationId/acceptance-waybill", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory acceptance waybill",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleAcceptanceWaybillRequest(
			organizationId,
			request.body,
			request,
			reply,
		);
	});

	// POST /acceptance-waybill
	server.post<{
		Body: z.infer<typeof acceptanceWaybillBodySchema> & {
			organizationId?: string;
		};
	}>("/acceptance-waybill", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory acceptance waybill",
		);
		if (!resolvedOrgId) return;

		const body =
			(request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleAcceptanceWaybillRequest(
			targetOrgId,
			request.body,
			request,
			reply,
		);
	});

	// =========================================================================
	// LIVE STOCK DEDUCTION & FEFO CONSUMPTION (Мандаты 8e, 8k, 8s)
	// =========================================================================

	const handleDeductRequest = async (
		organizationId: string,
		rawBody: unknown,
		request: any,
		reply: any,
	) => {
		const parsed = inventoryDeductBatchBodySchema.safeParse(rawBody);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Неверный формат данных для списания материалов",
				details: parsed.error.errors,
			});
		}

		let itemsList: z.infer<typeof inventoryDeductItemSchema>[] = [];
		let commonReason: string | undefined;
		let visitId: string | undefined;
		let allowOverdraftDefault = true;

		if (Array.isArray(parsed.data)) {
			itemsList = parsed.data;
		} else if (
			("items" in parsed.data && Array.isArray(parsed.data.items)) ||
			("materials" in parsed.data && Array.isArray(parsed.data.materials))
		) {
			itemsList =
				parsed.data.materials && parsed.data.materials.length > 0
					? parsed.data.materials
					: (parsed.data.items ?? []);
			commonReason =
				parsed.data.reason ||
				parsed.data.notes ||
				(parsed.data.operationTitle
					? `Списание под операцию «${parsed.data.operationTitle}» (FEFO у кресла)`
					: undefined);
			visitId = parsed.data.visitId;
			if (parsed.data.allowOverdraft !== undefined) {
				allowOverdraftDefault = parsed.data.allowOverdraft;
			} else if (parsed.data.hasWarehouseDelay !== undefined) {
				allowOverdraftDefault = true;
			}
		} else {
			itemsList = [parsed.data as z.infer<typeof inventoryDeductItemSchema>];
		}

		if (itemsList.length === 0) {
			return reply.status(400).send({
				error: "EmptyDeduction",
				message: "Список материалов для списания пуст",
			});
		}

		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = identity.userId ?? userContext?.id ?? null;

		try {
			const deductionResults = await db.transaction(async (tx) => {
				const results: Array<any> = [];

				for (const item of itemsList) {
					let itemId = item.inventoryItemId || item.id;

					// Если ID не передан, но передано наименование — ищем позицию в базе
					if (!itemId && item.name?.trim()) {
						const searchName = item.name.trim();
						let [found] = await tx
							.select({ id: inventoryItems.id })
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.organizationId, organizationId),
									sql`lower(${inventoryItems.name}) = lower(${searchName})`,
								),
							)
							.limit(1);

						if (!found) {
							// Поиск по ключевым словам/подстроке
							const [partial] = await tx
								.select({ id: inventoryItems.id })
								.from(inventoryItems)
								.where(
									and(
										eq(inventoryItems.organizationId, organizationId),
										sql`lower(${inventoryItems.name}) LIKE lower(${'%' + searchName + '%'}) OR lower(${searchName}) LIKE ('%' || lower(${inventoryItems.name}) || '%')`,
									),
								)
								.limit(1);
							if (partial) found = partial;
						}

						if (found) {
							itemId = found.id;
						} else {
							// По закону Zero Dead-Ends (Мандат 8e, 8n): если номенклатура отсутствует на складе,
							// создаем карточку материала с остатком 0 для последующего мягкого овердрафта.
							const [created] = await tx
								.insert(inventoryItems)
								.values({
									organizationId,
									name: searchName,
									stockQuantity: "0",
									currentQty: "0",
									criticalThreshold: "0",
									unitCostRub:
										item.unitCostRub != null
											? String(item.unitCostRub)
											: "0",
								})
								.returning({ id: inventoryItems.id });
							if (created) itemId = created.id;
						}
					}

					if (!itemId) {
						throw new Error(
							`Не удалось определить позицию склада для материала «${item.name || "не указано"}»`,
						);
					}

					const res = await fefoStockService.deductFefo(tx, {
						organizationId,
						inventoryItemId: itemId,
						requiredQty: item.quantity,
						allowOverdraft:
							item.allowOverdraft ?? allowOverdraftDefault,
						notes:
							item.reason ||
							item.notes ||
							commonReason ||
							"Списание со склада у кресла (автоматический FEFO по Мандату 8e, 8v)",
						userId: effectiveUserId,
						visitId: visitId || null,
						transactionType: "treatment_consumable",
					});

					results.push(res);
				}

				return results;
			});

			const hasOverdraft = deductionResults.some((r) => r.isOverdraft);

			return reply.status(200).send({
				success: true,
				count: deductionResults.length,
				items: deductionResults,
				hasOverdraft,
				message: hasOverdraft
					? `Списано позиций по FEFO: ${deductionResults.length} (зафиксирован мягкий овердрафт, клинический процесс не блокируется)`
					: `Списано позиций по FEFO: ${deductionResults.length}`,
			});
		} catch (error) {
			const isInsufficientStock =
				error instanceof InsufficientStockError ||
				(error as any)?.error === "InsufficientStock" ||
				(error as any)?.name === "InsufficientStockError" ||
				(error as any)?.code === "InsufficientStock";

			if (isInsufficientStock) {
				const itemErr = error as any;
				const invItemId = itemErr.inventoryItemId ?? "unknown";
				const invItemName = itemErr.inventoryItemName ?? "Материал";
				const avail = Number(itemErr.availableStock ?? 0);
				const req = Number(itemErr.requiredStock ?? 1);
				return reply.status(200).send({
					success: true,
					isOverdraft: true,
					is_overdraft: true,
					hasOverdraft: true,
					warning: `Мягкий овердрафт склада (Мандат 8n): зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Приём проведён без блокировки.`,
					message: `Мягкий овердрафт склада (Мандат 8n): дефицит по материалу «${invItemName}». Клинический процесс не блокируется.`,
					inventoryItemId: invItemId,
					inventoryItemName: invItemName,
					availableStock: avail,
					requiredStock: req,
					count: 0,
					items: [],
				});
			}

			request.log.error(error, "Failed to deduct inventory items");
			const msg =
				error instanceof Error
					? error.message
					: "Не удалось провести списание материалов";
			return reply.status(400).send({
				error: "DeductionFailed",
				message: msg,
			});
		}
	};

	// POST /:organizationId/deduct — Пакетное или одиночное списание со склада (Мандаты 8e, 8k, 8s)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/deduct", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory deduct",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(organizationId, request.body, request, reply);
	});

	// POST /deduct — Списание со склада (для клиентов без orgId в URL)
	server.post("/deduct", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory deduct",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(targetOrgId, request.body, request, reply);
	});

	// POST /:organizationId/quick-deduct-surgical — 1-клик списание расходников операции (Мандат 8e, 8n)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/quick-deduct-surgical", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick deduct surgical",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(organizationId, request.body, request, reply);
	});

	// POST /quick-deduct-surgical — 1-клик списание расходников операции без orgId в URL
	server.post("/quick-deduct-surgical", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick deduct surgical",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(targetOrgId, request.body, request, reply);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// POST /:organizationId/deduct/visit — Автосписание расходников по визиту (Мандаты 8e, 8k, 8s)
	// ─────────────────────────────────────────────────────────────────────────
	const handleDeductVisitRequest = async (
		organizationId: string,
		rawBody: unknown,
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		let normalizedBody = rawBody;
		if (rawBody && typeof rawBody === "object") {
			const b = rawBody as Record<string, any>;
			const rawVisitId = b.visitId ?? b.treatment_reference_id ?? b.visit_id;
			const rawItems = b.items ?? b.materials;
			let items: any[] | undefined = undefined;
			if (Array.isArray(rawItems)) {
				const uuidRegex =
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
				for (const it of rawItems) {
					const id = it.inventoryItemId ?? it.inventory_item_id ?? it.id;
					if (id && !uuidRegex.test(id)) {
						return reply.status(400).send({
							error: "ValidationError",
							message: "ID материала должен быть валидным UUID",
						});
					}
				}
				items = rawItems.map((it) => ({
					inventoryItemId: it.inventoryItemId ?? it.inventory_item_id ?? it.id,
					quantity: it.quantity,
					reason: it.reason ?? it.notes ?? b.notes,
				}));
			}
			normalizedBody = {
				...b,
				visitId: rawVisitId,
				items,
				allowOverdraft:
					b.allowOverdraft ?? b.allowSoftOverdraft ?? b.clamp_at_zero ?? true,
			};
		}

		const parsedBody = visitStockDeductionRequestSchema.safeParse(normalizedBody);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса списания",
			});
		}

		try {
			const result = await db.transaction(async (tx) => {
				return TreatmentConsumablesService.deductForVisit(tx, {
					organizationId,
					visitId: parsedBody.data.visitId,
					clientMutationId:
						parsedBody.data.clientMutationId ??
						(request.headers["idempotency-key"] as string | undefined) ??
						null,
					...(parsedBody.data.userId !== undefined
						? { userId: parsedBody.data.userId }
						: { userId: (request.user as any)?.id ?? null }),
					...(parsedBody.data.transactionType !== undefined
						? { transactionType: parsedBody.data.transactionType }
						: {}),
					...(parsedBody.data.services !== undefined
						? { services: parsedBody.data.services }
						: {}),
					...(parsedBody.data.items !== undefined ? { items: parsedBody.data.items } : {}),
					...(parsedBody.data.carpulesCount !== undefined
						? { carpulesCount: parsedBody.data.carpulesCount }
						: {}),
					...(parsedBody.data.drugName !== undefined
						? { drugName: parsedBody.data.drugName }
						: {}),
					...(parsedBody.data.paperJournalAcknowledged !== undefined
						? { paperJournalAcknowledged: parsedBody.data.paperJournalAcknowledged }
						: {}),
					...(parsedBody.data.allowOverdraft !== undefined
						? { allowOverdraft: parsedBody.data.allowOverdraft }
						: {}),
				});
			});
			return reply.send({
				success: true,
				...result,
				is_overdraft: Boolean(result.isOverdraft),
			});
		} catch (err: unknown) {
			const isInsufficientStock =
				err instanceof InsufficientStockError ||
				(err as any)?.error === "InsufficientStock" ||
				(err as any)?.name === "InsufficientStockError" ||
				(err as any)?.code === "InsufficientStock";

			if (isInsufficientStock) {
				const itemErr = err as any;
				const invItemId = itemErr.inventoryItemId ?? "unknown";
				const invItemName = itemErr.inventoryItemName ?? "Материал";
				const avail = Number(itemErr.availableStock ?? 0);
				const req = Number(itemErr.requiredStock ?? 1);
				return reply.status(200).send({
					success: true,
					isOverdraft: true,
					is_overdraft: true,
					warning: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Приём проведён без блокировки.`,
					inventoryItemId: invItemId,
					inventoryItemName: invItemName,
					availableStock: avail,
					requiredStock: req,
					deductions: [],
					warnings: [
						{
							type: "out_of_stock",
							itemId: invItemId,
							itemName: invItemName,
							message: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}).`,
							currentStock: avail - req,
							criticalThreshold: 0,
						},
					],
				});
			}
			request.log.error(err, "Failed to deduct visit inventory");
			return reply.code(500).send({
				error: "InternalServerError",
				message: err instanceof Error ? err.message : "Не удалось выполнить списание расходников по визиту",
			});
		}
	};

	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/deduct/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory deduct visit",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductVisitRequest(organizationId, request.body, request, reply);
	});

	server.post("/deduct/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory deduct visit",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductVisitRequest(targetOrgId, request.body, request, reply);
	});

	function toValidUuid(str?: string | null): string | null {
		if (!str) return null;
		const trimmed = String(str).trim();
		if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
			return trimmed;
		}
		const hash = crypto.createHash("md5").update(trimmed).digest("hex");
		return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// POST /:organizationId/overdraft-alert — Асинхронное оповещение об овердрафте при приеме (Мандат 8n)
	// ─────────────────────────────────────────────────────────────────────────
	const handleOverdraftAlertRequest = async (
		organizationId: string,
		rawBody: unknown,
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const parsed = inventoryOverdraftAlertBodySchema.safeParse(rawBody ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный формат оповещения об овердрафте",
				details: parsed.error.errors,
			});
		}

		const data = parsed.data;
		const safeVisitId = toValidUuid(data.visitId);
		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = toValidUuid(identity.userId ?? userContext?.id ?? null);

		try {
			let recordedCount = 0;
			if (data.items && data.items.length > 0) {
				await db.transaction(async (tx) => {
					for (const it of data.items) {
						const rawItemId = it.itemId || it.inventoryItemId;
						const validItemId = toValidUuid(rawItemId);
						const deficit = it.deficitQty ?? it.quantity ?? 1;

						await tx.insert(inventoryTransactions).values({
							organizationId,
							itemId: validItemId,
							inventoryItemId: validItemId,
							visitId: safeVisitId,
							transactionType: "emergency_overdraft",
							quantityChanged: `-${deficit}`,
							qty: `-${deficit}`,
							isOverdraft: true,
							notes: `[Дефицит/Овердрафт] ${it.itemName ? `Материал: ${it.itemName}. ` : ""}${data.cabinetId ? `Кабинет: ${data.cabinetId}. ` : ""}${data.chairId ? `Кресло: ${data.chairId}. ` : ""}${data.message ?? ""}`.trim(),
							userId: effectiveUserId,
						});
						recordedCount++;
					}
				});
			}

			return reply.status(200).send({
				success: true,
				status: "recorded",
				recordedCount,
				isOverdraft: true,
				message: `Зафиксирован мягкий овердрафт: ${recordedCount} поз. (клинический прием не прерывается)`,
			});
		} catch (error) {
			request.log.error(error, "Failed to record inventory overdraft alert");
			return reply.status(500).send({
				error: "OverdraftAlertFailed",
				message: "Ошибка фиксации овердрафта в журнале склада",
			});
		}
	};

	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/overdraft-alert",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"inventory overdraft alert",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleOverdraftAlertRequest(organizationId, request.body, request, reply);
		},
	);

	server.post("/overdraft-alert", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory overdraft alert",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleOverdraftAlertRequest(targetOrgId, request.body, request, reply);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// POST /:organizationId/storno — Автоматическое сторно при отмене услуг (Мандаты 8e, 8n)
	// ─────────────────────────────────────────────────────────────────────────
	const handleStornoRequest = async (
		organizationId: string,
		rawBody: unknown,
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const parsed = inventoryStornoBodySchema.safeParse(rawBody ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры запроса сторно",
				details: parsed.error.errors,
			});
		}

		const data = parsed.data;
		const safeVisitId = toValidUuid(data.visitId);
		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = identity.userId ?? userContext?.id ?? null;

		try {
			const stornoResult = await db.transaction(async (tx) => {
				const materialsToRestore: Array<{
					inventoryItemId?: string | undefined;
					name?: string | undefined;
					quantity: number;
					serviceTitle?: string | undefined;
				}> = [];

				// 1. Direct items / materials passed
				const directItems = data.items ?? data.materials ?? [];
				for (const it of directItems) {
					materialsToRestore.push({
						inventoryItemId: it.inventoryItemId || it.id,
						name: it.name,
						quantity: it.quantity,
						serviceTitle: "Ручное сторно",
					});
				}

				// 2. Services passed (single or array)
				const servicesList = data.services ?? (data.service ? [data.service] : []);
				for (const srv of servicesList) {
					const srvQty = srv.quantity ?? 1;
					const srvCode = (srv.code804n || srv.serviceCode || "").trim().toUpperCase();
					const srvTitle = srv.title || srvCode || "Стоматологическая услуга";

					// 2a. Ищем правила в БД (procedureMaterialRules)
					let dbRules: Array<{
						inventoryItemId: string | null;
						materialItemId: string | null;
						quantityToDeduct: string | null;
						requiredQty: string | null;
						materialName: string | null;
					}> = [];

					if (srv.serviceId || srvCode) {
						const conditions = [
							eq(procedureMaterialRules.organizationId, organizationId),
						];
						if (srv.serviceId && srvCode) {
							conditions.push(
								or(
									eq(procedureMaterialRules.serviceId, srv.serviceId),
									eq(procedureMaterialRules.serviceCode, srvCode),
								)!,
							);
						} else if (srv.serviceId) {
							conditions.push(eq(procedureMaterialRules.serviceId, srv.serviceId));
						} else {
							conditions.push(eq(procedureMaterialRules.serviceCode, srvCode));
						}
						dbRules = await tx
							.select({
								inventoryItemId: procedureMaterialRules.inventoryItemId,
								materialItemId: procedureMaterialRules.materialItemId,
								quantityToDeduct: procedureMaterialRules.quantityToDeduct,
								requiredQty: procedureMaterialRules.requiredQty,
								materialName: procedureMaterialRules.materialName,
							})
							.from(procedureMaterialRules)
							.where(and(...conditions));
					}

					if (dbRules.length > 0) {
						for (const r of dbRules) {
							const itemId = r.inventoryItemId || r.materialItemId;
							const unitQty = Number(r.quantityToDeduct ?? r.requiredQty ?? 1);
							materialsToRestore.push({
								inventoryItemId: itemId ?? undefined,
								name: r.materialName ?? undefined,
								quantity: Number((unitQty * srvQty).toFixed(4)),
								serviceTitle: srvTitle,
							});
						}
					} else {
						// 2b. Статутные техкарты 804н (DEFAULT_804N_CONSUMABLE_LINKS & fallback)
						const matchedLinks = DEFAULT_804N_CONSUMABLE_LINKS.filter(
							(l) =>
								l.service804nCode.toUpperCase() === srvCode ||
								srvCode.startsWith(l.service804nCode.toUpperCase()),
						);

						if (matchedLinks.length > 0) {
							for (const link of matchedLinks) {
								materialsToRestore.push({
									name: link.itemName,
									quantity: Number((link.quantityPerService * srvQty).toFixed(4)),
									serviceTitle: srvTitle,
								});
							}
						} else {
							// 2c. Fallback по ключевым клиническим словам
							const normName = srvTitle.toLowerCase();
							if (
								normName.includes("анестез") ||
								srvCode.includes("004") ||
								srvCode.includes("012")
							) {
								materialsToRestore.push(
									{
										name: "Анестетик артикаиновый 4% Ультракаин Д-С 1.7 мл",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
									{
										name: "Игла карпульная стоматологическая 30G",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
								);
							} else if (
								normName.includes("кариес") ||
								normName.includes("пломб") ||
								srvCode.includes("002")
							) {
								materialsToRestore.push(
									{
										name: "Композит светоотверждаемый Filtek / Estelite",
										quantity: Number((0.4 * srvQty).toFixed(2)),
										serviceTitle: srvTitle,
									},
									{
										name: "Анестетик артикаиновый 4% Ультракаин Д-С 1.7 мл",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
									{
										name: "Полировочная головка Enhance",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
								);
							} else if (normName.includes("гигиен") || srvCode.includes("051")) {
								materialsToRestore.push(
									{
										name: "Порошок для Air-Flow",
										quantity: 25 * srvQty,
										serviceTitle: srvTitle,
									},
									{
										name: "Паста полировочная Cleanic",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
								);
							} else if (
								normName.includes("удален") ||
								normName.includes("экстракц") ||
								srvCode.includes("001")
							) {
								materialsToRestore.push(
									{
										name: "Анестетик артикаиновый 4% Ультракаин Д-С 1.7 мл",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
									{
										name: "Игла карпульная стоматологическая",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
									{
										name: "Гемостатическая губка Альвостаз",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
								);
							} else if (
								normName.includes("визиограф") ||
								normName.includes("снимок") ||
								srvCode.includes("003")
							) {
								materialsToRestore.push({
									name: "Чехол защитный для датчика визиографа",
									quantity: 1 * srvQty,
									serviceTitle: srvTitle,
								});
							} else {
								materialsToRestore.push({
									name: "Стандартный набор расходников приёма",
									quantity: 1 * srvQty,
									serviceTitle: srvTitle,
								});
							}
						}
					}
				}

				// 3. Отмена всего визита по visitId (если не были переданы конкретные услуги/позиции)
				if (materialsToRestore.length === 0 && safeVisitId) {
					const visitTxs = await tx
						.select()
						.from(inventoryTransactions)
						.where(
							and(
								eq(inventoryTransactions.organizationId, organizationId),
								eq(inventoryTransactions.visitId, safeVisitId),
							),
						);

					// Находим списания, по которым еще не было сделано сторно
					const deductedByItem = new Map<string, number>();
					for (const t of visitTxs) {
						const itId = t.itemId ?? t.inventoryItemId;
						if (!itId) continue;
						const change = Number(t.quantityChanged ?? t.qty ?? 0);
						if (t.transactionType === "storno") {
							const curr = deductedByItem.get(itId) ?? 0;
							deductedByItem.set(itId, curr - Math.abs(change));
						} else if (
							change < 0 ||
							[
								"auto_deduct",
								"emergency_overdraft",
								"treatment_consumable",
							].includes(t.transactionType)
						) {
							const curr = deductedByItem.get(itId) ?? 0;
							deductedByItem.set(itId, curr + Math.abs(change));
						}
					}

					for (const [itId, netDeducted] of deductedByItem.entries()) {
						if (netDeducted > 0) {
							materialsToRestore.push({
								inventoryItemId: itId,
								quantity: netDeducted,
								serviceTitle: `Отмена визита ${data.visitId}`,
							});
						}
					}
				}

				// 4. Физическое возвращение материалов на склад (сторно)
				const restoredItems: Array<{
					inventoryItemId: string;
					name: string;
					quantityRestored: number;
					previousStock: number;
					newStock: number;
					overdraftCleared: boolean;
				}> = [];

				for (const m of materialsToRestore) {
					if (!m.quantity || m.quantity <= 0) continue;

					let targetItem: typeof inventoryItems.$inferSelect | undefined;

					if (m.inventoryItemId) {
						const [found] = await tx
							.select()
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.id, m.inventoryItemId),
									eq(inventoryItems.organizationId, organizationId),
								),
							)
							.for("update");
						targetItem = found;
					}

					if (!targetItem && m.name?.trim()) {
						const searchName = m.name.trim();
						const [foundByName] = await tx
							.select()
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.organizationId, organizationId),
									sql`lower(${inventoryItems.name}) = lower(${searchName})`,
								),
							)
							.limit(1)
							.for("update");
						targetItem = foundByName;

						if (!targetItem) {
							const [partial] = await tx
								.select()
								.from(inventoryItems)
								.where(
									and(
										eq(inventoryItems.organizationId, organizationId),
										sql`lower(${inventoryItems.name}) LIKE lower(${'%' + searchName + '%'}) OR lower(${searchName}) LIKE ('%' || lower(${inventoryItems.name}) || '%')`,
									),
								)
								.limit(1)
								.for("update");
							targetItem = partial;
						}
					}

					if (!targetItem) {
						// Если карточки нет, создаем ее со сторно-остатком
						const [created] = await tx
							.insert(inventoryItems)
							.values({
								organizationId,
								name: m.name?.trim() || "Сторнированный материал",
								stockQuantity: String(m.quantity),
								currentQty: String(m.quantity),
								criticalThreshold: "0",
								unitCostRub: "0",
							})
							.returning();
						targetItem = created;
					}

					if (!targetItem) continue;

					const prevStock = Number(targetItem.stockQuantity ?? targetItem.currentQty ?? 0);
					const newStock = Number((prevStock + m.quantity).toFixed(4));
					const wasOverdraft = prevStock < 0;
					const overdraftCleared = wasOverdraft && newStock >= 0;

					await tx
						.update(inventoryItems)
						.set({
							stockQuantity: String(newStock),
							currentQty: String(newStock),
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(inventoryItems.id, targetItem.id),
								eq(inventoryItems.organizationId, organizationId),
							),
						);

					// Фиксируем сторно в журнале движений (положительное количество, тип "storno")
					await tx.insert(inventoryTransactions).values({
						organizationId,
						itemId: targetItem.id,
						inventoryItemId: targetItem.id,
						visitId: safeVisitId ?? null,
						quantityChanged: String(m.quantity),
						qty: String(m.quantity),
						unitCostRub: targetItem.unitCostRub ?? targetItem.pricePerUnit ?? "0",
						transactionType: "storno",
						isOverdraft: false,
						notes:
							data.notes ||
							data.reason ||
							`Списание материалов по услуге отменено: автоматическое сторно при отмене услуги «${m.serviceTitle || "услуга"}» (+${m.quantity} ${targetItem.unit ?? "ед."}, Мандаты 8e, 8n)`,
						userId: effectiveUserId,
					});

					restoredItems.push({
						inventoryItemId: targetItem.id,
						name: targetItem.name,
						quantityRestored: m.quantity,
						previousStock: prevStock,
						newStock,
						overdraftCleared,
					});
				}

				return restoredItems;
			});

			return reply.status(200).send({
				success: true,
				stornoCount: stornoResult.length,
				restoredItems: stornoResult,
				message:
					stornoResult.length > 0
						? `Сторно выполнено: ${stornoResult.length} позиций материалов возвращены на склад`
						: "Нет материалов для сторнирования",
			});
		} catch (error) {
			request.log.error(error, "Failed to execute inventory storno");
			const msg =
				error instanceof Error ? error.message : "Не удалось провести сторно материалов";
			return reply.status(400).send({
				error: "StornoFailed",
				message: msg,
			});
		}
	};

	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/storno", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(organizationId, request.body, request, reply);
	});

	server.post("/storno", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(targetOrgId, request.body, request, reply);
	});

	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/storno/service", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno service",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(organizationId, request.body, request, reply);
	});

	server.post("/storno/service", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno service",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(targetOrgId, request.body, request, reply);
	});

	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/storno/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno visit",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(organizationId, request.body, request, reply);
	});

	server.post("/storno/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno visit",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(targetOrgId, request.body, request, reply);
	});
};

