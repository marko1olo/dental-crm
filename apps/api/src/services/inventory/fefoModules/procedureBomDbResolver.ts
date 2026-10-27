/**
 * @file procedureBomDbResolver.ts
 * Поиск техкарт процедур и правил списания в таблицах БД (Мандат 8b).
 */

import { and, eq, isNull, or } from "drizzle-orm";
import {
	procedureMaterialRules,
	procedureTechCardItems,
	procedureTechCards,
} from "../../../db/schema/inventory.js";
import { serviceCatalogItems } from "../../../db/schema/clinical.js";
import type { DbTransaction } from "./types.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ServiceMeta {
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly order804nCode: string;
}

export async function resolveServiceMeta(
	tx: DbTransaction,
	organizationId: string,
	serviceId: string,
): Promise<ServiceMeta> {
	let serviceCode = serviceId;
	let serviceTitle = "";
	let order804nCode = "";

	if (UUID_REGEX.test(serviceId)) {
		const [catalogItem] = await tx
			.select({
				code: serviceCatalogItems.code,
				title: serviceCatalogItems.title,
				order804nCode: serviceCatalogItems.order804nCode,
			})
			.from(serviceCatalogItems)
			.where(
				and(
					eq(serviceCatalogItems.id, serviceId),
					eq(serviceCatalogItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (catalogItem) {
			serviceCode = catalogItem.code;
			serviceTitle = catalogItem.title;
			order804nCode = catalogItem.order804nCode ?? "";
		}
	}

	return { serviceCode, serviceTitle, order804nCode };
}

export async function findDbProcedureItems(
	tx: DbTransaction,
	organizationId: string,
	serviceId: string,
	meta: ServiceMeta,
	serviceQuantity: number,
): Promise<Array<{ inventoryItemId: string; quantity: number }>> {
	const isUuid = UUID_REGEX.test(serviceId);
	const techCardCond = isUuid
		? and(
				eq(procedureTechCards.organizationId, organizationId),
				or(
					eq(procedureTechCards.serviceId, serviceId),
					eq(procedureTechCards.serviceCode, serviceId),
					...(meta.serviceCode !== serviceId ? [eq(procedureTechCards.serviceCode, meta.serviceCode)] : []),
					...(meta.order804nCode ? [eq(procedureTechCards.serviceCode, meta.order804nCode)] : []),
				),
				eq(procedureTechCards.status, "active"),
			)
		: and(
				eq(procedureTechCards.organizationId, organizationId),
				eq(procedureTechCards.serviceCode, serviceId),
				eq(procedureTechCards.status, "active"),
			);

	const [techCard] = await tx.select().from(procedureTechCards).where(techCardCond).limit(1);

	if (techCard) {
		const cardItems = await tx
			.select()
			.from(procedureTechCardItems)
			.where(eq(procedureTechCardItems.techCardId, techCard.id));

		return cardItems.map((ci) => ({
			inventoryItemId: ci.inventoryItemId,
			quantity: Number(ci.quantity) * serviceQuantity,
		}));
	}

	const ruleCond = isUuid
		? and(
				or(
					eq(procedureMaterialRules.serviceId, serviceId),
					eq(procedureMaterialRules.serviceCode, serviceId),
					...(meta.serviceCode !== serviceId ? [eq(procedureMaterialRules.serviceCode, meta.serviceCode)] : []),
					...(meta.order804nCode ? [eq(procedureMaterialRules.serviceCode, meta.order804nCode)] : []),
				),
				or(eq(procedureMaterialRules.organizationId, organizationId), isNull(procedureMaterialRules.organizationId)),
			)
		: and(
				eq(procedureMaterialRules.serviceCode, serviceId),
				or(eq(procedureMaterialRules.organizationId, organizationId), isNull(procedureMaterialRules.organizationId)),
			);

	const rules = await tx.select().from(procedureMaterialRules).where(ruleCond);
	return rules
		.filter((r) => r.inventoryItemId || r.materialItemId)
		.map((r) => ({
			inventoryItemId: (r.inventoryItemId ?? r.materialItemId)!,
			quantity: Number(r.quantityToDeduct ?? r.requiredQty ?? 1) * serviceQuantity,
		}));
}
