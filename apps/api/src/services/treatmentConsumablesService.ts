/**
 * treatmentConsumablesService.ts — Service for Treatment Consumables & Stock Auto-Deductions.
 *
 * Capabilities:
 * 1. Link price list services (e.g. "Световая пломба Filtek", "Анестезия Убистезин") to consumable BOM (recipes).
 * 2. Deduct batch quantities from warehouse stock when a visit or tooth treatment is completed.
 * 3. Low stock warnings and batch expiration alerts.
 * 4. Pre-flight stock availability checks.
 * 5. Idempotent execution, multi-tenant isolation, and deadlock-free locking (FOR UPDATE in sorted key order).
 */

import {
	type ConsumableLinkCreate,
	type ConsumableLinkDetailed,
	type ConsumableLinkUpdate,
	type InventoryAlertItem,
	type InventoryAlertSummary,
	type InventoryAlertsResponse,
	type LinkOptionsItem,
	type LinkOptionsResponse,
	type LinkOptionsTreatment,
	type RequiredMaterialItem,
	type StockAvailabilityCheckResponse,
	type StockDeductionRecord,
	type StockDeductionResult,
	type StockDeductionWarning,
	calculateRecipeEstimatedCost,
	categorizeInventoryExpiry,
	isDeductibleQuantity,
} from "@dental/shared";
import { and, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { db } from "../db/client.js";
import type { TenantDb } from "../db/rls.js";
import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	serviceCatalogItems,
	treatmentItems,
} from "../db/schema.js";
import { InsufficientStockError } from "./inventory/materialDeduction.js";

export { InsufficientStockError };

export type DbExecutor =
	| typeof db
	| Parameters<Parameters<typeof db.transaction>[0]>[0]
	| TenantDb;

export class TreatmentConsumablesServiceError extends Error {
	readonly statusCode: number;
	readonly code: string;

	constructor(message: string, statusCode = 400, code = "TreatmentConsumablesError") {
		super(message);
		this.name = "TreatmentConsumablesServiceError";
		this.statusCode = statusCode;
		this.code = code;
	}
}

export class TreatmentConsumablesService {
	/**
	 * List all consumable links for an organization with optional filtering and pagination.
	 */
	static async listLinks(
		executor: DbExecutor,
		organizationId: string,
		options: {
			serviceId?: string | undefined;
			inventoryItemId?: string | undefined;
			page?: number | undefined;
			pageSize?: number | undefined;
		} = {},
	): Promise<{
		items: ConsumableLinkDetailed[];
		total: number;
		page: number;
		pageSize: number;
	}> {
		const page = Math.max(1, options.page ?? 1);
		const pageSize = Math.max(1, Math.min(100, options.pageSize ?? 50));
		const offset = (page - 1) * pageSize;

		const conditions = [
			eq(procedureMaterialRules.organizationId, organizationId),
			eq(inventoryItems.organizationId, organizationId),
			eq(serviceCatalogItems.organizationId, organizationId),
		];

		if (options.serviceId) {
			conditions.push(eq(procedureMaterialRules.serviceId, options.serviceId));
		}
		if (options.inventoryItemId) {
			conditions.push(
				eq(procedureMaterialRules.inventoryItemId, options.inventoryItemId),
			);
		}

		// Count query
		const [countResult] = await executor
			.select({ count: sql<number>`count(*)::int` })
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

		const total = Number(countResult?.count ?? 0);

		// Data query
		const rows = await executor
			.select({
				id: procedureMaterialRules.id,
				organizationId: procedureMaterialRules.organizationId,
				serviceId: procedureMaterialRules.serviceId,
				inventoryItemId: procedureMaterialRules.inventoryItemId,
				quantityToDeduct: procedureMaterialRules.quantityToDeduct,
				requiredQty: procedureMaterialRules.requiredQty,
				createdAt: procedureMaterialRules.createdAt,
				serviceCode: serviceCatalogItems.code,
				serviceTitle: serviceCatalogItems.title,
				serviceCategory: serviceCatalogItems.category,
				specialty: serviceCatalogItems.specialty,
				itemName: inventoryItems.name,
				itemCategory: inventoryItems.category,
				itemUnit: inventoryItems.unit,
				stockQuantity: inventoryItems.stockQuantity,
				unitCostRub: inventoryItems.unitCostRub,
				criticalThreshold: inventoryItems.criticalThreshold,
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
			.orderBy(serviceCatalogItems.title, inventoryItems.name)
			.limit(pageSize)
			.offset(offset);

		const items: ConsumableLinkDetailed[] = rows.map((r) => {
			const qty = Number(r.quantityToDeduct ?? r.requiredQty ?? 1);
			const stock = Number(r.stockQuantity ?? 0);
			const cost = Number(r.unitCostRub ?? 0);
			const threshold = Number(r.criticalThreshold ?? 0);

			return {
				id: r.id,
				organizationId: r.organizationId ?? organizationId,
				serviceId: r.serviceId ?? "",
				inventoryItemId: r.inventoryItemId ?? "",
				quantity: qty,
				note: null,
				createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
				serviceCode: r.serviceCode,
				serviceTitle: r.serviceTitle,
				serviceCategory: r.serviceCategory,
				specialty: r.specialty,
				itemName: r.itemName,
				itemCategory: r.itemCategory,
				itemUnit: r.itemUnit,
				stockQuantity: stock,
				unitCostRub: cost,
				criticalThreshold: threshold,
				totalCostRub: Number((qty * cost).toFixed(2)),
				isLowStock: stock <= threshold,
			};
		});

		return {
			items,
			total,
			page,
			pageSize,
		};
	}

	/**
	 * Get a single consumable link by ID.
	 */
	static async getLink(
		executor: DbExecutor,
		organizationId: string,
		linkId: string,
	): Promise<ConsumableLinkDetailed | null> {
		const [row] = await executor
			.select({
				id: procedureMaterialRules.id,
				organizationId: procedureMaterialRules.organizationId,
				serviceId: procedureMaterialRules.serviceId,
				inventoryItemId: procedureMaterialRules.inventoryItemId,
				quantityToDeduct: procedureMaterialRules.quantityToDeduct,
				requiredQty: procedureMaterialRules.requiredQty,
				createdAt: procedureMaterialRules.createdAt,
				serviceCode: serviceCatalogItems.code,
				serviceTitle: serviceCatalogItems.title,
				serviceCategory: serviceCatalogItems.category,
				specialty: serviceCatalogItems.specialty,
				itemName: inventoryItems.name,
				itemCategory: inventoryItems.category,
				itemUnit: inventoryItems.unit,
				stockQuantity: inventoryItems.stockQuantity,
				unitCostRub: inventoryItems.unitCostRub,
				criticalThreshold: inventoryItems.criticalThreshold,
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
			.where(
				and(
					eq(procedureMaterialRules.id, linkId),
					eq(procedureMaterialRules.organizationId, organizationId),
					eq(inventoryItems.organizationId, organizationId),
					eq(serviceCatalogItems.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!row) return null;

		const qty = Number(row.quantityToDeduct ?? row.requiredQty ?? 1);
		const stock = Number(row.stockQuantity ?? 0);
		const cost = Number(row.unitCostRub ?? 0);
		const threshold = Number(row.criticalThreshold ?? 0);

		return {
			id: row.id,
			organizationId: row.organizationId ?? organizationId,
			serviceId: row.serviceId ?? "",
			inventoryItemId: row.inventoryItemId ?? "",
			quantity: qty,
			note: null,
			createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
			serviceCode: row.serviceCode,
			serviceTitle: row.serviceTitle,
			serviceCategory: row.serviceCategory,
			specialty: row.specialty,
			itemName: row.itemName,
			itemCategory: row.itemCategory,
			itemUnit: row.itemUnit,
			stockQuantity: stock,
			unitCostRub: cost,
			criticalThreshold: threshold,
			totalCostRub: Number((qty * cost).toFixed(2)),
			isLowStock: stock <= threshold,
		};
	}

	/**
	 * Create a new consumable recipe link for a price list service.
	 */
	static async createLink(
		executor: DbExecutor,
		organizationId: string,
		payload: ConsumableLinkCreate,
	): Promise<ConsumableLinkDetailed> {
		if (!isDeductibleQuantity(payload.quantity)) {
			throw new TreatmentConsumablesServiceError(
				"Количество расходуемого материала должно быть положительным числом",
				400,
				"InvalidQuantity",
			);
		}

		// 1. Verify service exists and belongs to this organization
		const [service] = await executor
			.select()
			.from(serviceCatalogItems)
			.where(
				and(
					eq(serviceCatalogItems.id, payload.serviceId),
					eq(serviceCatalogItems.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!service) {
			throw new TreatmentConsumablesServiceError(
				"Услуга не найдена в прейскуранте клиники",
				404,
				"ServiceNotFound",
			);
		}

		// 2. Verify inventory item exists and belongs to this organization
		const [item] = await executor
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, payload.inventoryItemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!item) {
			throw new TreatmentConsumablesServiceError(
				"Расходный материал не найден на складе клиники",
				404,
				"ItemNotFound",
			);
		}

		// 3. Check for existing link
		const [existing] = await executor
			.select()
			.from(procedureMaterialRules)
			.where(
				and(
					eq(procedureMaterialRules.organizationId, organizationId),
					eq(procedureMaterialRules.serviceId, payload.serviceId),
					eq(procedureMaterialRules.inventoryItemId, payload.inventoryItemId),
				),
			)
			.limit(1);

		const normalizedQty = String(payload.quantity);

		if (existing) {
			throw new TreatmentConsumablesServiceError(
				"Эта услуга уже содержит данный расходный материал в рецепте",
				409,
				"LinkAlreadyExists",
			);
		}

		// 4. Insert new rule
		const [created] = await executor
			.insert(procedureMaterialRules)
			.values({
				organizationId,
				serviceId: service.id,
				inventoryItemId: item.id,
				serviceCode: service.code,
				materialItemId: item.id,
				materialName: item.name,
				quantityToDeduct: normalizedQty,
				requiredQty: normalizedQty,
			})
			.returning();

		if (!created) {
			throw new TreatmentConsumablesServiceError(
				"Не удалось сохранить связь расходного материала с услугой",
				500,
				"SaveFailed",
			);
		}

		const detailed = await TreatmentConsumablesService.getLink(
			executor,
			organizationId,
			created.id,
		);

		if (!detailed) {
			throw new TreatmentConsumablesServiceError(
				"Связь создана, но не найдена при верификации",
				500,
				"FetchFailed",
			);
		}

		return detailed;
	}

	/**
	 * Update an existing consumable recipe link.
	 */
	static async updateLink(
		executor: DbExecutor,
		organizationId: string,
		linkId: string,
		payload: ConsumableLinkUpdate,
	): Promise<ConsumableLinkDetailed> {
		const [existing] = await executor
			.select()
			.from(procedureMaterialRules)
			.where(
				and(
					eq(procedureMaterialRules.id, linkId),
					eq(procedureMaterialRules.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!existing) {
			throw new TreatmentConsumablesServiceError(
				"Связь расходного материала не найдена",
				404,
				"LinkNotFound",
			);
		}

		const updateValues: Partial<typeof procedureMaterialRules.$inferInsert> = {};

		if (payload.quantity !== undefined) {
			if (!isDeductibleQuantity(payload.quantity)) {
				throw new TreatmentConsumablesServiceError(
					"Количество расходуемого материала должно быть положительным числом",
					400,
					"InvalidQuantity",
				);
			}
			updateValues.quantityToDeduct = String(payload.quantity);
			updateValues.requiredQty = String(payload.quantity);
		}

		if (Object.keys(updateValues).length > 0) {
			await executor
				.update(procedureMaterialRules)
				.set(updateValues)
				.where(
					and(
						eq(procedureMaterialRules.id, linkId),
						eq(procedureMaterialRules.organizationId, organizationId),
					),
				);
		}

		const updated = await TreatmentConsumablesService.getLink(
			executor,
			organizationId,
			linkId,
		);

		if (!updated) {
			throw new TreatmentConsumablesServiceError(
				"Не удалось получить обновлённые данные связи",
				500,
				"FetchFailed",
			);
		}

		return updated;
	}

	/**
	 * Delete a consumable recipe link.
	 */
	static async deleteLink(
		executor: DbExecutor,
		organizationId: string,
		linkId: string,
	): Promise<{ success: boolean }> {
		const [deleted] = await executor
			.delete(procedureMaterialRules)
			.where(
				and(
					eq(procedureMaterialRules.id, linkId),
					eq(procedureMaterialRules.organizationId, organizationId),
				),
			)
			.returning({ id: procedureMaterialRules.id });

		if (!deleted) {
			throw new TreatmentConsumablesServiceError(
				"Связь расходного материала не найдена",
				404,
				"LinkNotFound",
			);
		}

		return { success: true };
	}

	/**
	 * Get the complete consumable BOM recipe for a specific service.
	 */
	static async getRecipeForService(
		executor: DbExecutor,
		organizationId: string,
		serviceId: string,
	): Promise<{
		service: {
			id: string;
			code: string | null;
			title: string;
			category: string | null;
			priceRub: number;
		};
		consumables: ConsumableLinkDetailed[];
		totalEstimatedCostRub: number;
	}> {
		const [service] = await executor
			.select()
			.from(serviceCatalogItems)
			.where(
				and(
					eq(serviceCatalogItems.id, serviceId),
					eq(serviceCatalogItems.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!service) {
			throw new TreatmentConsumablesServiceError(
				"Услуга не найдена в прейскуранте",
				404,
				"ServiceNotFound",
			);
		}

		const { items: consumables } = await TreatmentConsumablesService.listLinks(
			executor,
			organizationId,
			{ serviceId, pageSize: 100 },
		);

		const totalEstimatedCostRub = calculateRecipeEstimatedCost(
			consumables.map((c) => ({
				quantity: c.quantity,
				unitCostRub: c.unitCostRub,
			})),
		);

		return {
			service: {
				id: service.id,
				code: service.code,
				title: service.title,
				category: service.category,
				priceRub: Number(service.priceRub ?? service.basePriceRub ?? 0),
			},
			consumables,
			totalEstimatedCostRub,
		};
	}

	/**
	 * Get picker options (services and items) for building consumable links.
	 */
	static async getLinkOptions(
		executor: DbExecutor,
		organizationId: string,
		query?: string | undefined,
		limit = 30,
	): Promise<LinkOptionsResponse> {
		const trimmedQuery = query?.trim() || "";

		// Fetch services
		const serviceConditions = [
			eq(serviceCatalogItems.organizationId, organizationId),
			eq(serviceCatalogItems.isActive, true),
		];
		if (trimmedQuery) {
			serviceConditions.push(
				or(
					ilike(serviceCatalogItems.title, `%${trimmedQuery}%`),
					ilike(serviceCatalogItems.code, `%${trimmedQuery}%`),
				)!,
			);
		}

		const services = await executor
			.select({
				id: serviceCatalogItems.id,
				title: serviceCatalogItems.title,
				code: serviceCatalogItems.code,
				category: serviceCatalogItems.category,
				priceRub: serviceCatalogItems.priceRub,
				basePriceRub: serviceCatalogItems.basePriceRub,
			})
			.from(serviceCatalogItems)
			.where(and(...serviceConditions))
			.orderBy(serviceCatalogItems.title)
			.limit(limit);

		// Fetch inventory items
		const itemConditions = [eq(inventoryItems.organizationId, organizationId)];
		if (trimmedQuery) {
			itemConditions.push(
				or(
					ilike(inventoryItems.name, `%${trimmedQuery}%`),
					ilike(inventoryItems.category, `%${trimmedQuery}%`),
					ilike(inventoryItems.sku, `%${trimmedQuery}%`),
					ilike(inventoryItems.barcode, `%${trimmedQuery}%`),
				)!,
			);
		}

		const items = await executor
			.select({
				id: inventoryItems.id,
				name: inventoryItems.name,
				unit: inventoryItems.unit,
				category: inventoryItems.category,
				stockQuantity: inventoryItems.stockQuantity,
				unitCostRub: inventoryItems.unitCostRub,
				expirationDate: inventoryItems.expirationDate,
			})
			.from(inventoryItems)
			.where(and(...itemConditions))
			.orderBy(inventoryItems.name)
			.limit(limit);

		return {
			treatments: services.map(
				(s): LinkOptionsTreatment => ({
					id: s.id,
					name: s.title,
					code: s.code,
					category: s.category,
					priceRub: Number(s.priceRub ?? s.basePriceRub ?? 0),
				}),
			),
			items: items.map(
				(i): LinkOptionsItem => ({
					id: i.id,
					name: i.name,
					unit: i.unit,
					category: i.category,
					stockQuantity: Number(i.stockQuantity ?? 0),
					unitCostRub: Number(i.unitCostRub ?? 0),
					expirationDate: i.expirationDate,
				}),
			),
		};
	}

	/**
	 * Deduct batch quantities from warehouse stock when a visit is completed.
	 */
	static async deductForVisit(
		tx: DbExecutor,
		params: {
			organizationId: string;
			visitId: string;
			userId?: string | null | undefined;
			transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
		},
	): Promise<StockDeductionResult> {
		const {
			organizationId,
			visitId,
			userId = null,
			transactionType = "auto_deduct",
		} = params;

		// 1. Fetch uncompleted treatment items for visit
		const uncompletedItems = await tx
			.select()
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.visitId, visitId),
					eq(treatmentItems.organizationId, organizationId),
					ne(treatmentItems.status, "completed"),
				),
			);

		if (uncompletedItems.length === 0) {
			return { completedTreatmentItems: 0, deductions: [], warnings: [] };
		}

		// Mark treatment items as completed
		await tx
			.update(treatmentItems)
			.set({ status: "completed" })
			.where(
				and(
					eq(treatmentItems.visitId, visitId),
					eq(treatmentItems.organizationId, organizationId),
				),
			);

		// 2. Gather service IDs
		const serviceIds = uncompletedItems
			.map((it) => it.serviceId)
			.filter((id): id is string => typeof id === "string" && id.length > 0);

		if (serviceIds.length === 0) {
			return {
				completedTreatmentItems: uncompletedItems.length,
				deductions: [],
				warnings: [],
			};
		}

		// 3. Find procedure material rules
		const rules = await tx
			.select()
			.from(procedureMaterialRules)
			.where(
				and(
					inArray(procedureMaterialRules.serviceId, serviceIds),
					or(
						eq(procedureMaterialRules.organizationId, organizationId),
						isNull(procedureMaterialRules.organizationId),
					),
				),
			);

		if (rules.length === 0) {
			return {
				completedTreatmentItems: uncompletedItems.length,
				deductions: [],
				warnings: [],
			};
		}

		// 4. Aggregate required quantities
		const requiredByItem = new Map<string, number>();

		for (const item of uncompletedItems) {
			if (!item.serviceId) continue;
			const serviceQty = Number(item.quantity ?? 1);
			if (!isDeductibleQuantity(serviceQty)) continue;

			const matchingRules = rules.filter((r) => r.serviceId === item.serviceId);
			for (const rule of matchingRules) {
				const itemId = rule.inventoryItemId ?? rule.materialItemId;
				if (!itemId) continue;
				const ruleQty = Number(rule.quantityToDeduct ?? rule.requiredQty ?? 1);
				if (!isDeductibleQuantity(ruleQty)) continue;

				const deductionAmount = ruleQty * serviceQty;
				const current = requiredByItem.get(itemId) ?? 0;
				requiredByItem.set(itemId, current + deductionAmount);
			}
		}

		if (requiredByItem.size === 0) {
			return {
				completedTreatmentItems: uncompletedItems.length,
				deductions: [],
				warnings: [],
			};
		}

		// 5. Lock inventory items in sorted order (deadlock-free)
		const sortedItemIds = Array.from(requiredByItem.keys()).sort();

		const lockedItems = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					inArray(inventoryItems.id, sortedItemIds),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.for("update");

		const itemMap = new Map(lockedItems.map((it) => [it.id, it]));

		const deductions: StockDeductionRecord[] = [];
		const warnings: StockDeductionWarning[] = [];
		const transactionsToInsert: Array<typeof inventoryTransactions.$inferInsert> = [];

		for (const itemId of sortedItemIds) {
			const requiredQty = requiredByItem.get(itemId);
			if (!requiredQty || requiredQty <= 0) continue;

			const inv = itemMap.get(itemId);
			if (!inv) {
				continue;
			}

			const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
			const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
			const newStock = Number((baseStock - requiredQty).toFixed(4));
			const quantityChanged = String(-requiredQty);
			const threshold = Number(inv.criticalThreshold ?? inv.minQty ?? 0);

			// Дефицит материалов: при нехватке остатка списываем в отрицательный остаток (дефицит),
			// фиксируем предупреждение в результате списания, чтобы врач беспрепятственно завершил прием.
			if (newStock < 0) {
				console.warn(
					`[treatmentConsumablesService] Списание в дефицит по материалу «${inv.name}» (ID: ${inv.id}) ` +
						`для визита ${visitId} (клиника ${organizationId}): в наличии ${baseStock}, требовалось ${requiredQty}, итоговый дефицит: ${newStock}.`,
				);
				warnings.push({
					type: "out_of_stock",
					itemId: inv.id,
					itemName: inv.name,
					message: `Внимание: списание в дефицит по материалу «${inv.name}» (в наличии было ${baseStock}, списано ${requiredQty}, остаток: ${newStock} ${inv.unit ?? "шт"}). Списано под операцию, требуется оприходование.`,
					currentStock: newStock,
					criticalThreshold: threshold,
					expirationDate: inv.expirationDate,
				});
			} else if (newStock <= threshold) {
				warnings.push({
					type: newStock === 0 ? "out_of_stock" : "low_stock",
					itemId: inv.id,
					itemName: inv.name,
					message:
						newStock === 0
							? `Материал «${inv.name}» полностью израсходован на складе.`
							: `Остаток материала «${inv.name}» снизился до критического порога (${newStock} ${inv.unit ?? "шт"}, порог: ${threshold}).`,
					currentStock: newStock,
					criticalThreshold: threshold,
					expirationDate: inv.expirationDate,
				});
			}

			// Check expiration warning
			if (inv.expirationDate) {
				const expiry = categorizeInventoryExpiry(inv.expirationDate);
				if (expiry.status === "expired") {
					warnings.push({
						type: "expired",
						itemId: inv.id,
						itemName: inv.name,
						message: `Внимание: партия материала «${inv.name}» просрочена (срок: ${inv.expirationDate}).`,
						expirationDate: inv.expirationDate,
					});
				} else if (expiry.status === "expiring_soon") {
					warnings.push({
						type: "expiring_soon",
						itemId: inv.id,
						itemName: inv.name,
						message: `Внимание: срок годности партии материала «${inv.name}» истекает через ${expiry.daysRemaining} дн. (${inv.expirationDate}).`,
						expirationDate: inv.expirationDate,
					});
				}
			}

			// Update warehouse stock
			await tx
				.update(inventoryItems)
				.set({
					stockQuantity: String(newStock),
					currentQty: String(newStock),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, inv.id),
						eq(inventoryItems.organizationId, organizationId),
					),
				);

			const isOverdraft = newStock < 0;
			transactionsToInsert.push({
				organizationId,
				visitId,
				itemId: inv.id,
				inventoryItemId: inv.id,
				quantityChanged,
				qty: quantityChanged,
				unitCostRub: inv.unitCostRub ?? inv.pricePerUnit ?? "0",
				transactionType: isOverdraft ? "emergency_overdraft" : transactionType,
				isOverdraft,
				userId,
				notes: isOverdraft
					? `Списано под операцию, требуется оприходование (мягкий овердрафт склада по приёму ${visitId}): дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."}`
					: `Автосписание по приёму ${visitId}`,
			});

			deductions.push({
				inventoryItemId: inv.id,
				inventoryItemName: inv.name,
				quantityChanged,
				unitCostRub: inv.unitCostRub,
				lotNumber: inv.lotNumber,
				remainingStock: newStock,
			});
		}

		if (transactionsToInsert.length > 0) {
			await tx.insert(inventoryTransactions).values(transactionsToInsert);
		}

		return {
			completedTreatmentItems: uncompletedItems.length,
			deductions,
			warnings,
		};
	}

	/**
	 * Deduct batch quantities for a single tooth treatment item.
	 */
	static async deductForToothTreatment(
		tx: DbExecutor,
		params: {
			organizationId: string;
			treatmentItemId: string;
			serviceId: string;
			visitId?: string | null | undefined;
			toothNumber?: number | null | undefined;
			quantity?: number | undefined;
			userId?: string | null | undefined;
			transactionType?: "auto_deduct" | "manual_writeoff" | undefined;
		},
	): Promise<StockDeductionResult> {
		const {
			organizationId,
			treatmentItemId,
			serviceId,
			visitId = null,
			toothNumber = null,
			quantity = 1,
			userId = null,
			transactionType = "auto_deduct",
		} = params;

		// 1. Fetch rules for service
		const rules = await tx
			.select()
			.from(procedureMaterialRules)
			.where(
				and(
					eq(procedureMaterialRules.serviceId, serviceId),
					or(
						eq(procedureMaterialRules.organizationId, organizationId),
						isNull(procedureMaterialRules.organizationId),
					),
				),
			);

		if (rules.length === 0) {
			return { completedTreatmentItems: 1, deductions: [], warnings: [] };
		}

		// 2. Calculate required quantities
		const requiredByItem = new Map<string, number>();
		for (const rule of rules) {
			const itemId = rule.inventoryItemId ?? rule.materialItemId;
			if (!itemId) continue;
			const ruleQty = Number(rule.quantityToDeduct ?? rule.requiredQty ?? 1);
			if (!isDeductibleQuantity(ruleQty)) continue;

			const deductionAmount = ruleQty * quantity;
			const current = requiredByItem.get(itemId) ?? 0;
			requiredByItem.set(itemId, current + deductionAmount);
		}

		if (requiredByItem.size === 0) {
			return { completedTreatmentItems: 1, deductions: [], warnings: [] };
		}

		// 3. Lock items in sorted order
		const sortedItemIds = Array.from(requiredByItem.keys()).sort();

		const lockedItems = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					inArray(inventoryItems.id, sortedItemIds),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.for("update");

		const itemMap = new Map(lockedItems.map((it) => [it.id, it]));

		const deductions: StockDeductionRecord[] = [];
		const warnings: StockDeductionWarning[] = [];
		const transactionsToInsert: Array<typeof inventoryTransactions.$inferInsert> = [];

		for (const itemId of sortedItemIds) {
			const requiredQty = requiredByItem.get(itemId);
			if (!requiredQty || requiredQty <= 0) continue;

			const inv = itemMap.get(itemId);
			if (!inv) continue;

			const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
			const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
			const newStock = Number((baseStock - requiredQty).toFixed(4));
			const quantityChanged = String(-requiredQty);
			const threshold = Number(inv.criticalThreshold ?? inv.minQty ?? 0);

			if (newStock < 0) {
				console.warn(
					`[treatmentConsumablesService] Списание в дефицит по материалу «${inv.name}» (ID: ${inv.id}) ` +
						`по позиции лечения ${treatmentItemId}: в наличии ${baseStock}, требовалось ${requiredQty}, итоговый дефицит: ${newStock}.`,
				);
				warnings.push({
					type: "out_of_stock",
					itemId: inv.id,
					itemName: inv.name,
					message: `Внимание: списание в дефицит по материалу «${inv.name}» (в наличии было ${baseStock}, списано ${requiredQty}, остаток: ${newStock} ${inv.unit ?? "шт"}). Списано под операцию, требуется оприходование.`,
					currentStock: newStock,
					criticalThreshold: threshold,
					expirationDate: inv.expirationDate,
				});
			} else if (newStock <= threshold) {
				warnings.push({
					type: newStock === 0 ? "out_of_stock" : "low_stock",
					itemId: inv.id,
					itemName: inv.name,
					message:
						newStock === 0
							? `Материал «${inv.name}» полностью израсходован.`
							: `Остаток материала «${inv.name}» ниже нормы (${newStock} ${inv.unit ?? "шт"}).`,
					currentStock: newStock,
					criticalThreshold: threshold,
					expirationDate: inv.expirationDate,
				});
			}

			await tx
				.update(inventoryItems)
				.set({
					stockQuantity: String(newStock),
					currentQty: String(newStock),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, inv.id),
						eq(inventoryItems.organizationId, organizationId),
					),
				);

			const isOverdraft = newStock < 0;
			transactionsToInsert.push({
				organizationId,
				visitId: visitId || null,
				itemId: inv.id,
				inventoryItemId: inv.id,
				quantityChanged,
				qty: quantityChanged,
				unitCostRub: inv.unitCostRub ?? "0",
				transactionType: isOverdraft ? "emergency_overdraft" : transactionType,
				isOverdraft,
				userId,
				notes: isOverdraft
					? `Списано под операцию, требуется оприходование (мягкий овердрафт склада по позиции лечения ${treatmentItemId}${toothNumber ? ` зуб ${toothNumber}` : ""}): дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."}`
					: `Списание по позиции лечения ${treatmentItemId}${toothNumber ? ` (зуб ${toothNumber})` : ""}`,
			});

			deductions.push({
				inventoryItemId: inv.id,
				inventoryItemName: inv.name,
				quantityChanged,
				unitCostRub: inv.unitCostRub,
				lotNumber: inv.lotNumber,
				remainingStock: newStock,
			});
		}

		if (transactionsToInsert.length > 0) {
			await tx.insert(inventoryTransactions).values(transactionsToInsert);
		}

		return {
			completedTreatmentItems: 1,
			deductions,
			warnings,
		};
	}

	/**
	 * Pre-flight stock availability check for upcoming treatments.
	 */
	static async checkStockSufficiency(
		executor: DbExecutor,
		organizationId: string,
		services: Array<{ serviceId: string; quantity: number }>,
	): Promise<StockAvailabilityCheckResponse> {
		const serviceIds = services.map((s) => s.serviceId).filter(Boolean);
		if (serviceIds.length === 0) {
			return { sufficient: true, requiredMaterials: [], warnings: [] };
		}

		const rules = await executor
			.select()
			.from(procedureMaterialRules)
			.where(
				and(
					inArray(procedureMaterialRules.serviceId, serviceIds),
					or(
						eq(procedureMaterialRules.organizationId, organizationId),
						isNull(procedureMaterialRules.organizationId),
					),
				),
			);

		const requiredByItem = new Map<string, number>();
		for (const s of services) {
			const matching = rules.filter((r) => r.serviceId === s.serviceId);
			for (const r of matching) {
				const itemId = r.inventoryItemId ?? r.materialItemId;
				if (!itemId) continue;
				const qtyPerUnit = Number(r.quantityToDeduct ?? r.requiredQty ?? 1);
				const totalNeeded = qtyPerUnit * s.quantity;
				const cur = requiredByItem.get(itemId) ?? 0;
				requiredByItem.set(itemId, cur + totalNeeded);
			}
		}

		const itemIds = Array.from(requiredByItem.keys());
		if (itemIds.length === 0) {
			return { sufficient: true, requiredMaterials: [], warnings: [] };
		}

		const items = await executor
			.select()
			.from(inventoryItems)
			.where(
				and(
					inArray(inventoryItems.id, itemIds),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		const itemMap = new Map(items.map((it) => [it.id, it]));
		const requiredMaterials: RequiredMaterialItem[] = [];
		const warnings: string[] = [];
		let allSufficient = true;

		for (const itemId of itemIds) {
			const requiredQty = requiredByItem.get(itemId) ?? 0;
			const inv = itemMap.get(itemId);
			const availableQty = Number(inv?.stockQuantity ?? inv?.currentQty ?? 0);
			const isSufficient = availableQty >= requiredQty;
			const deficit = isSufficient ? 0 : Number((requiredQty - availableQty).toFixed(4));

			if (!isSufficient) {
				allSufficient = false;
				warnings.push(
					`Внимание: дефицит материала «${inv?.name ?? itemId}»: требуется ${requiredQty}, в наличии ${availableQty} (дефицит: ${deficit} ${inv?.unit ?? "шт"}). Списано под операцию, требуется оприходование (мягкий овердрафт разрешён).`,
				);
			}

			requiredMaterials.push({
				inventoryItemId: itemId,
				itemName: inv?.name ?? "Неизвестный материал",
				requiredQty,
				availableQty,
				isSufficient,
				deficit,
				unit: inv?.unit,
				unitCostRub: Number(inv?.unitCostRub ?? 0),
			});
		}

		return {
			sufficient: allSufficient,
			requiredMaterials,
			warnings,
		};
	}

	/**
	 * Get inventory alerts summary: low stock and expiring/expired items.
	 */
	static async getInventoryAlerts(
		executor: DbExecutor,
		organizationId: string,
		params: { expiringWithinDays?: number | undefined } = {},
	): Promise<InventoryAlertsResponse> {
		const items = await executor
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.organizationId, organizationId))
			.orderBy(inventoryItems.name);

		const now = new Date();
		const daysAhead = params.expiringWithinDays ?? 30;

		const lowStockItems: InventoryAlertItem[] = [];
		const outOfStockItems: InventoryAlertItem[] = [];
		const expiredItems: InventoryAlertItem[] = [];
		const expiringSoonItems: InventoryAlertItem[] = [];

		let totalValuationRub = 0;

		for (const item of items) {
			const stock = Number(item.stockQuantity ?? item.currentQty ?? 0);
			const threshold = Number(item.criticalThreshold ?? item.minQty ?? 0);
			const cost = Number(item.unitCostRub ?? item.pricePerUnit ?? 0);

			if (Number.isFinite(stock) && Number.isFinite(cost)) {
				totalValuationRub += Math.max(0, stock) * Math.max(0, cost);
			}

			const alertItem: InventoryAlertItem = {
				id: item.id,
				name: item.name,
				category: item.category,
				unit: item.unit,
				stockQuantity: stock,
				criticalThreshold: threshold,
				unitCostRub: cost,
				sku: item.sku,
				barcode: item.barcode,
				lotNumber: item.lotNumber,
				expirationDate: item.expirationDate,
				daysUntilExpiration: null,
			};

			if (stock <= 0) {
				outOfStockItems.push(alertItem);
			} else if (threshold > 0 && stock <= threshold) {
				lowStockItems.push(alertItem);
			}

			if (item.expirationDate) {
				const expiry = categorizeInventoryExpiry(item.expirationDate, now);
				alertItem.daysUntilExpiration = expiry.daysRemaining;

				if (expiry.status === "expired") {
					expiredItems.push(alertItem);
				} else if (expiry.status === "expiring_soon") {
					expiringSoonItems.push(alertItem);
				}
			}
		}

		const summary: InventoryAlertSummary = {
			totalItems: items.length,
			totalValuationRub: Number(totalValuationRub.toFixed(2)),
			lowStockCount: lowStockItems.length,
			outOfStockCount: outOfStockItems.length,
			expiredCount: expiredItems.length,
			expiringSoonCount: expiringSoonItems.length,
		};

		return {
			summary,
			lowStockItems,
			outOfStockItems,
			expiredItems,
			expiringSoonItems,
		};
	}

	/**
	 * 1-клик быстрое списание базового набора приёма медсестрой/ассистентом:
	 * перчатки (2 пары), маска (2 шт.), слюноотсос (1 шт.), нагрудник (1 шт.), валики (6 шт.).
	 * Реализует мягкий овердрафт склада без комиссии из 3 человек.
	 */
	static async quickWriteoffStandardKit(
		tx: DbExecutor,
		params: {
			organizationId: string;
			userId?: string | null | undefined;
			visitId?: string | null | undefined;
			notes?: string | null | undefined;
		},
	): Promise<{
		success: boolean;
		deductedItems: Array<{
			itemId: string;
			itemName: string;
			quantity: number;
			unit: string;
			remainingStock: number;
			isOverdraft: boolean;
		}>;
		warnings: string[];
		message: string;
	}> {
		const { organizationId, userId = null, visitId = null, notes = null } = params;

		const kitDefinitions = [
			{
				patterns: ["перчатк", "gloves"],
				defaultName: "Перчатки нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пары",
				qty: 2,
				defaultCost: "35",
			},
			{
				patterns: ["маск", "mask"],
				defaultName: "Маска медицинская защитная трехслойная",
				category: "ppe",
				unit: "шт.",
				qty: 2,
				defaultCost: "15",
			},
			{
				patterns: ["слюноотсос", "saliva"],
				defaultName: "Слюноотсос одноразовый с гибким наконечником",
				category: "ppe",
				unit: "шт.",
				qty: 1,
				defaultCost: "12.5",
			},
			{
				patterns: ["нагрудник", "салфетка нагрудная", "салфетка под шею", "bib"],
				defaultName: "Нагрудник стоматологический (салфетка двухслойная)",
				category: "ppe",
				unit: "шт.",
				qty: 1,
				defaultCost: "18",
			},
			{
				patterns: ["валик", "ватные валики", "cotton"],
				defaultName: "Валики ватные стоматологические стерильные",
				category: "ppe",
				unit: "шт.",
				qty: 6,
				defaultCost: "3.5",
			},
		];

		// 1. Получаем существующую номенклатуру организации
		const allOrgItems = await tx
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.organizationId, organizationId));

		const resolvedItems: Array<{
			item: typeof inventoryItems.$inferSelect;
			qty: number;
		}> = [];

		for (const def of kitDefinitions) {
			let matched = allOrgItems.find((inv) =>
				def.patterns.some((p) => inv.name.toLowerCase().includes(p.toLowerCase())),
			);

			// Если позиция отсутствует, мгновенно создаем (Zero-friction)
			if (!matched) {
				const [created] = await tx
					.insert(inventoryItems)
					.values({
						organizationId,
						name: def.defaultName,
						category: def.category,
						unit: def.unit,
						stockQuantity: "0",
						currentQty: "0",
						criticalThreshold: "10",
						unitCostRub: def.defaultCost,
					})
					.returning();
				if (created) {
					matched = created;
					allOrgItems.push(created);
				}
			}

			if (matched) {
				resolvedItems.push({ item: matched, qty: def.qty });
			}
		}

		// 2. Блокируем строки FOR UPDATE в сортированном порядке ID (deadlock-free)
		const sortedIds = resolvedItems.map((r) => r.item.id).sort();
		const lockedRows = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					inArray(inventoryItems.id, sortedIds),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.for("update");

		const lockedMap = new Map(lockedRows.map((r) => [r.id, r]));

		const deductedItems: Array<{
			itemId: string;
			itemName: string;
			quantity: number;
			unit: string;
			remainingStock: number;
			isOverdraft: boolean;
		}> = [];
		const warnings: string[] = [];
		const txRows: Array<typeof inventoryTransactions.$inferInsert> = [];

		for (const target of resolvedItems) {
			const inv = lockedMap.get(target.item.id);
			if (!inv) continue;

			const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
			const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
			const newStock = Number((baseStock - target.qty).toFixed(4));
			const isOverdraft = newStock < 0;

			await tx
				.update(inventoryItems)
				.set({
					stockQuantity: String(newStock),
					currentQty: String(newStock),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, inv.id),
						eq(inventoryItems.organizationId, organizationId),
					),
				);

			txRows.push({
				organizationId,
				visitId,
				itemId: inv.id,
				inventoryItemId: inv.id,
				quantityChanged: String(-target.qty),
				qty: String(-target.qty),
				unitCostRub: inv.unitCostRub ?? "0",
				transactionType: isOverdraft ? "emergency_overdraft" : "nurse_quick_writeoff",
				isOverdraft,
				userId,
				notes: isOverdraft
					? `Списано под операцию, требуется оприходование (базовый набор приёма: дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."})`
					: (notes || "Списание базового набора приёма медсестрой (1 клик)"),
			});

			if (isOverdraft) {
				warnings.push(
					`Позиция «${inv.name}»: списано под операцию, требуется оприходование (остаток: ${newStock} ${inv.unit ?? "ед."}).`,
				);
			}

			deductedItems.push({
				itemId: inv.id,
				itemName: inv.name,
				quantity: target.qty,
				unit: inv.unit ?? "шт.",
				remainingStock: newStock,
				isOverdraft,
			});
		}

		if (txRows.length > 0) {
			await tx.insert(inventoryTransactions).values(txRows);
		}

		return {
			success: true,
			deductedItems,
			warnings,
			message: "Базовый набор приёма списан (перчатки 2 пары, маска 2 шт., слюноотсос 1 шт., нагрудник 1 шт., валики 6 шт.).",
		};
	}

	/**
	 * 1-клик списание пустых карпул анестетиков медсестрой (СанПиН 3.3686-21, ПКУ).
	 * Ликвидирует требование комиссии из 3 человек.
	 * Реализует мягкий овердрафт склада без блокировки операций.
	 */
	static async quickWriteoffCarpules(
		tx: DbExecutor,
		params: {
			organizationId: string;
			carpulesCount?: number | undefined;
			drugName?: string | undefined;
			userId?: string | null | undefined;
			visitId?: string | null | undefined;
			notes?: string | null | undefined;
		},
	): Promise<{
		success: boolean;
		deductedItems: Array<{
			itemId: string;
			itemName: string;
			quantity: number;
			unit: string;
			remainingStock: number;
			isOverdraft: boolean;
		}>;
		warnings: string[];
		message: string;
	}> {
		const {
			organizationId,
			carpulesCount = 1,
			drugName,
			userId = null,
			visitId = null,
			notes = null,
		} = params;

		const count = Math.max(1, Math.min(20, carpulesCount));

		// 1. Ищем позицию анестетика на складе
		const allOrgItems = await tx
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.organizationId, organizationId));

		let matched = drugName
			? allOrgItems.find((i) => i.name.toLowerCase().includes(drugName.toLowerCase()))
			: undefined;

		if (!matched) {
			const searchWords = [
				"артикаин",
				"анестетик",
				"убистезин",
				"септонест",
				"скандонест",
				"ультракаин",
				"карпул",
			];
			matched = allOrgItems.find((i) =>
				searchWords.some((w) => i.name.toLowerCase().includes(w)),
			);
		}

		if (!matched) {
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					organizationId,
					name: "Анестетик артикаиновый 4% (карпула 1.7 мл)",
					category: "anesthesia",
					unit: "карп.",
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "20",
					unitCostRub: "220",
				})
				.returning();
			matched = created;
		}

		if (!matched) {
			throw new TreatmentConsumablesServiceError(
				"Не удалось определить позицию анестетика на складе",
				500,
				"CarpuleItemNotFound",
			);
		}

		// 2. Блокируем строку FOR UPDATE
		const [locked] = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, matched.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.for("update");

		const currentStock = Number(locked?.stockQuantity ?? locked?.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const newStock = Number((baseStock - count).toFixed(4));
		const isOverdraft = newStock < 0;

		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, matched.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		await tx.insert(inventoryTransactions).values({
			organizationId,
			visitId,
			itemId: matched.id,
			inventoryItemId: matched.id,
			quantityChanged: String(-count),
			qty: String(-count),
			unitCostRub: matched.unitCostRub ?? "0",
			transactionType: isOverdraft ? "emergency_overdraft" : "carpule_disposal",
			isOverdraft,
			userId,
			notes: isOverdraft
				? `Списано под операцию, требуется оприходование (списание пустых карпул анестетика медсестрой в 1 клик, без комиссии: дефицит ${Math.abs(newStock)} карп.)`
				: (notes || "Списание пустых карпул анестетика медсестрой в 1 клик (СанПиН 3.3686-21, ПКУ без комиссии из 3 человек)"),
		});

		const warnings: string[] = [];
		if (isOverdraft) {
			warnings.push(
				`Внимание: списание пустых карпул в дефицит по «${matched.name}» (остаток: ${newStock} карп.). Списано под операцию, требуется оприходование.`,
			);
		}

		return {
			success: true,
			deductedItems: [
				{
					itemId: matched.id,
					itemName: matched.name,
					quantity: count,
					unit: matched.unit ?? "карп.",
					remainingStock: newStock,
					isOverdraft,
				},
			],
			warnings,
			message: `Списано пустых карпул анестетика: ${count} шт. (СанПиН 3.3686-21, ПКУ без комиссии из 3 человек).`,
		};
	}
}
