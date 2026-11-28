import {
	kopecksToRubles,
	multiplyKopecksFractional,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { withTenantCtx, withTenantReadCtx, type TenantDb } from "../rls.js";
import * as schema from "../schema.js";
import {
	selectOwnedServiceCatalogRow,
	useInMemory,
} from "./pricelistReadQueries.js";
import {
	ServiceCatalogItemNotFoundError,
	ServiceCatalogStorageDisabledError,
} from "./pricelistWriteMutations.js";

export interface ServiceBomItemPayload {
	readonly id?: string | undefined;
	readonly inventoryItemId: string;
	readonly materialName?: string | undefined;
	readonly quantity: number;
	readonly unit?: string | undefined;
	readonly isMdlpRequired?: boolean | undefined;
	readonly notes?: string | null | undefined;
	readonly costRub?: number | undefined;
}

export interface ServiceBomDetails {
	readonly serviceId: string;
	readonly techCardId?: string | undefined;
	readonly title: string;
	readonly status: string;
	readonly description?: string | null | undefined;
	readonly items: ServiceBomItemPayload[];
	readonly totalMaterialsCostRub: number;
}

export interface UpsertServiceBomInput {
	title?: string | undefined;
	description?: string | null | undefined;
	status?: "active" | "draft" | "archived" | string | undefined;
	items: Array<{
		inventoryItemId: string;
		quantity: number;
		unit?: string | undefined;
		isMdlpRequired?: boolean | undefined;
		notes?: string | null | undefined;
	}>;
}

function resolveInventoryUnitCostKopecks(inv: {
	pricePerUnit?: string | number | null | undefined;
	pricePerUnitKopecks?: bigint | number | null | undefined;
	unitCostRub?: string | number | null | undefined;
	unitCostKopecks?: bigint | number | null | undefined;
}): number {
	const priceKopecks = Number(inv.pricePerUnitKopecks ?? 0);
	if (Number.isFinite(priceKopecks) && priceKopecks > 0) {
		return priceKopecks;
	}
	const unitKopecks = Number(inv.unitCostKopecks ?? 0);
	if (Number.isFinite(unitKopecks) && unitKopecks > 0) {
		return unitKopecks;
	}
	const fallbackRub = Number(inv.pricePerUnit ?? inv.unitCostRub ?? 0);
	return rublesToKopecks(Number.isFinite(fallbackRub) ? fallbackRub : 0);
}

export async function getServiceBomFromDb(
	organizationId: string,
	serviceId: string,
	externalTx?: TenantDb,
): Promise<ServiceBomDetails | null> {
	if (useInMemory()) return null;
	const runQuery = async (tx: TenantDb) => {
		const service = await selectOwnedServiceCatalogRow(
			organizationId,
			serviceId,
			tx,
		);
		if (!service) return null;

		const [techCard] = await tx
			.select()
			.from(schema.procedureTechCards)
			.where(
				and(
					eq(schema.procedureTechCards.organizationId, organizationId),
					eq(schema.procedureTechCards.serviceId, serviceId),
				),
			)
			.limit(1);

		if (techCard) {
			const cardItems = await tx
				.select({
					id: schema.procedureTechCardItems.id,
					inventoryItemId: schema.procedureTechCardItems.inventoryItemId,
					quantity: schema.procedureTechCardItems.quantity,
					unit: schema.procedureTechCardItems.unit,
					isMdlpRequired: schema.procedureTechCardItems.isMdlpRequired,
					notes: schema.procedureTechCardItems.notes,
					itemName: schema.inventoryItems.name,
					pricePerUnit: schema.inventoryItems.pricePerUnit,
					pricePerUnitKopecks: schema.inventoryItems.pricePerUnitKopecks,
					unitCostRub: schema.inventoryItems.unitCostRub,
					unitCostKopecks: schema.inventoryItems.unitCostKopecks,
				})
				.from(schema.procedureTechCardItems)
				.leftJoin(
					schema.inventoryItems,
					and(
						eq(
							schema.procedureTechCardItems.inventoryItemId,
							schema.inventoryItems.id,
						),
						eq(schema.inventoryItems.organizationId, organizationId),
					),
				)
				.where(eq(schema.procedureTechCardItems.techCardId, techCard.id));

			let totalCostKopecks = 0;
			const items: ServiceBomItemPayload[] = cardItems.map((ci) => {
				const qty = Number(ci.quantity) || 1;
				const unitCostKopecks = resolveInventoryUnitCostKopecks(ci);
				const lineCostKopecks = multiplyKopecksFractional(unitCostKopecks, qty);
				totalCostKopecks += lineCostKopecks;
				return {
					id: ci.id,
					inventoryItemId: ci.inventoryItemId,
					materialName: ci.itemName || undefined,
					quantity: qty,
					unit: ci.unit,
					isMdlpRequired: ci.isMdlpRequired,
					notes: ci.notes,
					costRub: kopecksToRubles(lineCostKopecks),
				};
			});

			return {
				serviceId,
				techCardId: techCard.id,
				title: techCard.title,
				status: techCard.status,
				description: techCard.description,
				items,
				totalMaterialsCostRub: kopecksToRubles(totalCostKopecks),
			};
		}

		const rules = await tx
			.select()
			.from(schema.procedureMaterialRules)
			.where(
				and(
					eq(schema.procedureMaterialRules.organizationId, organizationId),
					eq(schema.procedureMaterialRules.serviceId, serviceId),
				),
			);

		const items: ServiceBomItemPayload[] = rules.map((r) => ({
			id: r.id,
			inventoryItemId: r.inventoryItemId || r.materialItemId || serviceId,
			materialName: r.materialName || undefined,
			quantity: Number(r.quantityToDeduct || r.requiredQty || 1),
			unit: r.unit || "шт",
			isMdlpRequired: Boolean(r.isMdlpRequired),
			costRub: 0,
		}));

		return {
			serviceId,
			title: `Техкарта: ${service.title}`,
			status: items.length > 0 ? "active" : "draft",
			description:
				items.length > 0
					? "Автоматическая спецификация по правилам списания"
					: null,
			items,
			totalMaterialsCostRub: 0,
		};
	};
	return externalTx ? await runQuery(externalTx) : await withTenantReadCtx(organizationId, runQuery);
}

export async function upsertServiceBomInDb(
	organizationId: string,
	serviceId: string,
	input: UpsertServiceBomInput,
): Promise<ServiceBomDetails> {
	if (useInMemory()) throw new ServiceCatalogStorageDisabledError();

	return await withTenantCtx(organizationId, async (tx) => {
		const service = await selectOwnedServiceCatalogRow(
			organizationId,
			serviceId,
			tx,
		);
		if (!service) throw new ServiceCatalogItemNotFoundError();

		let [techCard] = await tx
			.select()
			.from(schema.procedureTechCards)
			.where(
				and(
					eq(schema.procedureTechCards.organizationId, organizationId),
					eq(schema.procedureTechCards.serviceId, serviceId),
				),
			)
			.limit(1);

		const title = input.title?.trim() || `Техкарта: ${service.title}`;
		const status = input.status || "active";
		const description =
			input.description !== undefined
				? input.description
				: (techCard?.description ?? null);

		if (techCard) {
			const [updated] = await tx
				.update(schema.procedureTechCards)
				.set({
					title,
					status,
					description,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(schema.procedureTechCards.id, techCard.id),
						eq(schema.procedureTechCards.organizationId, organizationId),
					),
				)
				.returning();
			if (!updated) {
				throw new Error(
					`Не удалось обновить технологическую карту для услуги: ${serviceId}`,
				);
			}
			techCard = updated;
			await tx
				.delete(schema.procedureTechCardItems)
				.where(eq(schema.procedureTechCardItems.techCardId, techCard.id));
		} else {
			const [inserted] = await tx
				.insert(schema.procedureTechCards)
				.values({
					organizationId,
					serviceId,
					serviceCode: service.code,
					title,
					status,
					description,
				})
				.returning();
			if (!inserted) {
				throw new Error(
					`Не удалось создать технологическую карту для услуги: ${serviceId}`,
				);
			}
			techCard = inserted;
		}

		let totalCostKopecks = 0;
		const insertedItems: ServiceBomItemPayload[] = [];

		for (const item of input.items) {
			const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
			const unit = item.unit || "шт";
			const isMdlpRequired = Boolean(item.isMdlpRequired);
			const notes = item.notes || null;

			const [insertedItem] = await tx
				.insert(schema.procedureTechCardItems)
				.values({
					techCardId: techCard.id,
					inventoryItemId: item.inventoryItemId,
					quantity: String(qty),
					unit,
					isMdlpRequired,
					notes,
				})
				.returning();

			if (!insertedItem) {
				continue;
			}

			const [inv] = await tx
				.select({
					pricePerUnit: schema.inventoryItems.pricePerUnit,
					pricePerUnitKopecks: schema.inventoryItems.pricePerUnitKopecks,
					unitCostRub: schema.inventoryItems.unitCostRub,
					unitCostKopecks: schema.inventoryItems.unitCostKopecks,
					name: schema.inventoryItems.name,
				})
				.from(schema.inventoryItems)
				.where(
					and(
						eq(schema.inventoryItems.id, item.inventoryItemId),
						eq(schema.inventoryItems.organizationId, organizationId),
					),
				)
				.limit(1);

			const unitKopecks = inv ? resolveInventoryUnitCostKopecks(inv) : 0;
			const lineCostKopecks = multiplyKopecksFractional(unitKopecks, qty);
			totalCostKopecks += lineCostKopecks;

			insertedItems.push({
				id: insertedItem.id,
				inventoryItemId: item.inventoryItemId,
				...(inv?.name ? { materialName: inv.name } : {}),
				quantity: qty,
				unit,
				isMdlpRequired,
				notes,
				costRub: kopecksToRubles(lineCostKopecks),
			});
		}

		const calculatedMaterialsCost = kopecksToRubles(totalCostKopecks);
		const calculatedMaterialsCostKopecks = BigInt(totalCostKopecks);
		await tx
			.update(schema.serviceCatalogItems)
			.set({
				materialsCostRub: calculatedMaterialsCost,
				materialsCostKopecks: calculatedMaterialsCostKopecks,
			})
			.where(
				and(
					eq(schema.serviceCatalogItems.id, serviceId),
					eq(schema.serviceCatalogItems.organizationId, organizationId),
				),
			);

		return {
			serviceId,
			techCardId: techCard.id,
			title: techCard.title,
			status: techCard.status,
			description: techCard.description,
			items: insertedItems,
			totalMaterialsCostRub: calculatedMaterialsCost,
		};
	});
}
