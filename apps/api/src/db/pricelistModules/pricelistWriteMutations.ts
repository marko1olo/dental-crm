import {
	type DentalSpecialty,
	type ServiceCatalogItem,
	type ServiceCategory,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import { withTenantCtx, type TenantDb } from "../rls.js";
import * as schema from "../schema.js";
import {
	projectSingleServiceCatalogRow,
	selectOwnedServiceCatalogRow,
	useInMemory,
} from "./pricelistReadQueries.js";

/** Поля услуги, которые задаёт оператор в настройках прайса. */
export interface ServiceCatalogItemInput {
	readonly code: string;
	readonly title: string;
	readonly category: ServiceCategory;
	readonly specialty: DentalSpecialty;
	readonly basePriceRub: number;
	readonly durationMinutes: number;
	readonly taxDeductible: boolean;
	readonly active: boolean;
	readonly order804nCode?: string | null | undefined;
	readonly materialsCostRub?: number | null | undefined;
	readonly labCostRub?: number | null | undefined;
	readonly tierPrices?: Record<string, number> | null | undefined;
}

/**
 * Частичная правка: приходит ровно то, что оператор изменил.
 */
export type ServiceCatalogItemPatch = {
	readonly [Field in keyof ServiceCatalogItemInput]?:
		| ServiceCatalogItemInput[Field]
		| undefined;
};

export class ServiceCatalogStorageDisabledError extends Error {
	constructor() {
		super(
			"Прайс не изменён: хранение состояния отключено (DENTAL_STATE_PERSISTENCE=off), " +
				"поэтому услуги существуют только в памяти процесса и записать их некуда.",
		);
		this.name = "ServiceCatalogStorageDisabledError";
	}
}

export class ServiceCatalogItemNotFoundError extends Error {
	constructor() {
		super("Услуга не найдена.");
		this.name = "ServiceCatalogItemNotFoundError";
	}
}

export function moneyColumns(basePriceRub: number) {
	const kop = BigInt(rublesToKopecks(basePriceRub));
	return {
		basePriceRub,
		priceRub: basePriceRub,
		priceKopecks: kop,
		basePriceKopecks: kop,
	};
}

/** Новая услуга прайса. */
export async function createServiceCatalogItemInDb(
	organizationId: string,
	input: ServiceCatalogItemInput,
	executor?: TenantDb | typeof db,
): Promise<ServiceCatalogItem> {
	if (useInMemory()) throw new ServiceCatalogStorageDisabledError();

	const run = async (client: TenantDb | typeof db) => {
		const materialsCostRub =
			input.materialsCostRub !== undefined && input.materialsCostRub !== null
				? input.materialsCostRub
				: 0;
		const labCostRub =
			input.labCostRub !== undefined && input.labCostRub !== null
				? input.labCostRub
				: 0;
		const materialsCostKopecks = BigInt(rublesToKopecks(materialsCostRub));
		const labCostKopecks = BigInt(rublesToKopecks(labCostRub));

		const [row] = await client
			.insert(schema.serviceCatalogItems)
			.values({
				organizationId,
				code: input.code,
				title: input.title,
				category: input.category,
				specialty: input.specialty,
				...moneyColumns(input.basePriceRub),
				durationMinutes: input.durationMinutes,
				taxDeductible: input.taxDeductible,
				isActive: input.active,
				order804nCode: input.order804nCode ?? null,
				materialsCostRub,
				labCostRub,
				materialsCostKopecks,
				labCostKopecks,
				tierPrices: input.tierPrices ?? {},
			})
			.returning();
		if (!row)
			throw new Error("Услуга не создана: база не вернула ни одной строки.");
		return projectSingleServiceCatalogRow(row);
	};

	return executor
		? await run(executor)
		: await withTenantCtx(organizationId, run);
}

/** Правка услуги. Меняются только переданные поля. */
export async function updateServiceCatalogItemInDb(
	organizationId: string,
	serviceId: string,
	patch: ServiceCatalogItemPatch,
	executor?: TenantDb | typeof db,
): Promise<ServiceCatalogItem> {
	if (useInMemory()) throw new ServiceCatalogStorageDisabledError();

	const run = async (client: TenantDb | typeof db) => {
		const existing = await selectOwnedServiceCatalogRow(
			organizationId,
			serviceId,
			client,
		);
		if (!existing) throw new ServiceCatalogItemNotFoundError();

		const updates: Partial<typeof schema.serviceCatalogItems.$inferInsert> = {};
		if (patch.code !== undefined) updates.code = patch.code;
		if (patch.title !== undefined) updates.title = patch.title;
		if (patch.category !== undefined) updates.category = patch.category;
		if (patch.specialty !== undefined) updates.specialty = patch.specialty;
		if (patch.basePriceRub !== undefined)
			Object.assign(updates, moneyColumns(patch.basePriceRub));
		if (patch.durationMinutes !== undefined)
			updates.durationMinutes = patch.durationMinutes;
		if (patch.taxDeductible !== undefined)
			updates.taxDeductible = patch.taxDeductible;
		if (patch.active !== undefined) updates.isActive = patch.active;
		if (patch.order804nCode !== undefined)
			updates.order804nCode = patch.order804nCode;
		if (patch.materialsCostRub !== undefined) {
			const rub = patch.materialsCostRub !== null ? patch.materialsCostRub : 0;
			updates.materialsCostRub = rub;
			updates.materialsCostKopecks = BigInt(rublesToKopecks(rub));
		}
		if (patch.labCostRub !== undefined) {
			const rub = patch.labCostRub !== null ? patch.labCostRub : 0;
			updates.labCostRub = rub;
			updates.labCostKopecks = BigInt(rublesToKopecks(rub));
		}
		if (patch.tierPrices !== undefined)
			updates.tierPrices = patch.tierPrices ?? {};

		const [row] = await client
			.update(schema.serviceCatalogItems)
			.set(updates)
			.where(
				and(
					eq(schema.serviceCatalogItems.id, serviceId),
					eq(schema.serviceCatalogItems.organizationId, organizationId),
				),
			)
			.returning();
		if (!row) throw new ServiceCatalogItemNotFoundError();
		return projectSingleServiceCatalogRow(row);
	};

	return executor
		? await run(executor)
		: await withTenantCtx(organizationId, run);
}

/**
 * Отключение услуги — НЕ физическое удаление.
 */
export async function deactivateServiceCatalogItemInDb(
	organizationId: string,
	serviceId: string,
	executor?: TenantDb | typeof db,
): Promise<ServiceCatalogItem> {
	if (useInMemory()) throw new ServiceCatalogStorageDisabledError();
	const run = async (client: TenantDb | typeof db) => {
		const existing = await selectOwnedServiceCatalogRow(
			organizationId,
			serviceId,
			client,
		);
		if (!existing) throw new ServiceCatalogItemNotFoundError();
		const [row] = await client
			.update(schema.serviceCatalogItems)
			.set({ isActive: false })
			.where(
				and(
					eq(schema.serviceCatalogItems.id, serviceId),
					eq(schema.serviceCatalogItems.organizationId, organizationId),
				),
			)
			.returning();
		if (!row) throw new ServiceCatalogItemNotFoundError();
		return projectSingleServiceCatalogRow(row);
	};

	return executor
		? await run(executor)
		: await withTenantCtx(organizationId, run);
}
