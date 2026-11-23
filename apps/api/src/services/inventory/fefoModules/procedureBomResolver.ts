/**
 * @file procedureBomResolver.ts
 * Единый резолвер расходных материалов для стоматологической процедуры (Мандаты 8b, 8v, 8bf).
 * Canonical SSOT: procedure_tech_cards и procedure_tech_card_items.
 * Ликвидирован Split-Brain каскад устаревших таблиц.
 */

import { and, eq, or } from "drizzle-orm";
import {
	procedureTechCardItems,
	procedureTechCards,
} from "../../../db/schema/inventory.js";
import { serviceCatalogItems } from "../../../db/schema/clinical.js";
import type { db } from "../../../db/client.js";
import type { DbTransaction } from "./types.js";
import { resolveDefaultFallbackItems } from "./procedureBomDefaultFallback.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DbTxOrClient = DbTransaction | typeof db;

export interface ServiceMeta {
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly order804nCode: string;
}

export interface DbProcedureItem {
	inventoryItemId: string;
	quantity: number;
	unit?: string | undefined;
	name?: string | undefined;
	isMdlpRequired?: boolean | undefined;
	alternativeInventoryItemId?: string | null | undefined;
	isOptional?: boolean | undefined;
}

export async function resolveServiceMeta(
	tx: DbTxOrClient,
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
	tx: DbTxOrClient,
	organizationId: string,
	serviceId: string,
	meta: ServiceMeta,
	serviceQuantity: number,
): Promise<DbProcedureItem[]> {
	const isUuid = UUID_REGEX.test(serviceId);
	const candidateCodes = Array.from(
		new Set([serviceId, meta.serviceCode, meta.order804nCode].filter(Boolean) as string[]),
	);

	const techCardCond = isUuid
		? and(
				eq(procedureTechCards.organizationId, organizationId),
				or(
					eq(procedureTechCards.serviceId, serviceId),
					...candidateCodes.map((c) => eq(procedureTechCards.serviceCode, c)),
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
			unit: ci.unit ?? "pcs",
			isMdlpRequired: Boolean(ci.isMdlpRequired),
			alternativeInventoryItemId: ci.alternativeInventoryItemId ?? null,
			isOptional: Boolean(ci.isOptional),
		}));
	}

	return [];
}

export async function resolveItemsToDeductForProcedure(
	tx: DbTxOrClient,
	organizationId: string,
	serviceId: string,
	serviceQuantity: number,
): Promise<Array<{ inventoryItemId: string; quantity: number }>> {
	const meta = await resolveServiceMeta(tx, organizationId, serviceId);
	const dbItems = await findDbProcedureItems(tx, organizationId, serviceId, meta, serviceQuantity);

	if (dbItems.length > 0) {
		return dbItems;
	}

	return resolveDefaultFallbackItems(tx, organizationId, serviceId, meta, serviceQuantity);
}
