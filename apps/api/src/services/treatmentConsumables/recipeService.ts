/**
 * recipeService.ts — Layer 2: Service for Consumable BOM Recipes & Link Management.
 * Handles binding price list services to inventory items, recipe CRUD, and picker options.
 */

import {
	type ConsumableLinkCreate,
	type ConsumableLinkDetailed,
	type ConsumableLinkUpdate,
	type LinkOptionsItem,
	type LinkOptionsResponse,
	type LinkOptionsTreatment,
	calculateRecipeEstimatedCost,
	isDeductibleQuantity,
} from "@dental/shared";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import {
	inventoryItems,
	procedureMaterialRules,
	serviceCatalogItems,
} from "../../db/schema.js";
import {
	type DbExecutor,
	TreatmentConsumablesServiceError,
} from "./types.js";

/**
 * List all consumable links for an organization with optional filtering and pagination.
 */
export async function listLinks(
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
export async function getLink(
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
export async function createLink(
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

	const detailed = await getLink(
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
export async function updateLink(
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

	const updated = await getLink(
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
export async function deleteLink(
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
export async function getRecipeForService(
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

	const { items: consumables } = await listLinks(
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
export async function getLinkOptions(
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
