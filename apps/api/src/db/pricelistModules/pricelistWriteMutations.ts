import {
	type DentalSpecialty,
	type ServiceCatalogItem,
	type ServiceCategory,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../client.js";
import { withTenantWriteCtx, type TenantDb } from "../rls.js";
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
	readonly basePriceRub?: number | undefined;
	readonly basePriceKopecks?: number | undefined;
	readonly durationMinutes: number;
	readonly taxDeductible: boolean;
	readonly active: boolean;
	readonly order804nCode?: string | null | undefined;
	readonly materialsCostRub?: number | null | undefined;
	readonly materialsCostKopecks?: number | null | undefined;
	readonly labCostRub?: number | null | undefined;
	readonly labCostKopecks?: number | null | undefined;
	readonly salaryPriceKopecks?: number | null | undefined;
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

export function moneyColumns(basePriceRub?: number, basePriceKopecks?: number) {
	const kopNum =
		basePriceKopecks !== undefined
			? Math.max(0, Math.round(basePriceKopecks))
			: rublesToKopecks(basePriceRub ?? 0);
	const kop = BigInt(kopNum);
	const rub = basePriceKopecks !== undefined ? kopecksToRubles(kopNum) : (basePriceRub ?? 0);
	return {
		basePriceRub: rub,
		priceRub: rub,
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
		const materialsCostKopNum =
			input.materialsCostKopecks !== undefined && input.materialsCostKopecks !== null
				? Math.max(0, Math.round(input.materialsCostKopecks))
				: rublesToKopecks(
						input.materialsCostRub !== undefined && input.materialsCostRub !== null
							? input.materialsCostRub
							: 0,
					);
		const labCostKopNum =
			input.labCostKopecks !== undefined && input.labCostKopecks !== null
				? Math.max(0, Math.round(input.labCostKopecks))
				: rublesToKopecks(
						input.labCostRub !== undefined && input.labCostRub !== null
							? input.labCostRub
							: 0,
					);
		const materialsCostRub = kopecksToRubles(materialsCostKopNum);
		const labCostRub = kopecksToRubles(labCostKopNum);
		const materialsCostKopecks = BigInt(materialsCostKopNum);
		const labCostKopecks = BigInt(labCostKopNum);

		const [row] = await client
			.insert(schema.serviceCatalogItems)
			.values({
				organizationId,
				code: input.code,
				title: input.title,
				category: input.category,
				specialty: input.specialty,
				...moneyColumns(input.basePriceRub, input.basePriceKopecks),
				durationMinutes: input.durationMinutes,
				taxDeductible: input.taxDeductible,
				isActive: input.active,
				order804nCode: input.order804nCode ?? null,
				materialsCostRub,
				labCostRub,
				materialsCostKopecks,
				labCostKopecks,
				salaryPriceKopecks:
					input.salaryPriceKopecks !== undefined && input.salaryPriceKopecks !== null
						? BigInt(Math.round(input.salaryPriceKopecks))
						: null,
				tierPrices: input.tierPrices ?? {},
			})
			.returning();
		if (!row)
			throw new Error("Услуга не создана: база не вернула ни одной строки.");
		return projectSingleServiceCatalogRow(row);
	};

	return executor
		? await run(executor)
		: await withTenantWriteCtx(organizationId, run);
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
		if (patch.basePriceKopecks !== undefined || patch.basePriceRub !== undefined) {
			Object.assign(updates, moneyColumns(patch.basePriceRub, patch.basePriceKopecks));
		}
		if (patch.durationMinutes !== undefined)
			updates.durationMinutes = patch.durationMinutes;
		if (patch.taxDeductible !== undefined)
			updates.taxDeductible = patch.taxDeductible;
		if (patch.active !== undefined) updates.isActive = patch.active;
		if (patch.order804nCode !== undefined)
			updates.order804nCode = patch.order804nCode;
		if (patch.materialsCostKopecks !== undefined) {
			const kop = patch.materialsCostKopecks !== null ? Math.max(0, Math.round(patch.materialsCostKopecks)) : 0;
			updates.materialsCostKopecks = BigInt(kop);
			updates.materialsCostRub = kopecksToRubles(kop);
		} else if (patch.materialsCostRub !== undefined) {
			const rub = patch.materialsCostRub !== null ? patch.materialsCostRub : 0;
			updates.materialsCostRub = rub;
			updates.materialsCostKopecks = BigInt(rublesToKopecks(rub));
		}
		if (patch.labCostKopecks !== undefined) {
			const kop = patch.labCostKopecks !== null ? Math.max(0, Math.round(patch.labCostKopecks)) : 0;
			updates.labCostKopecks = BigInt(kop);
			updates.labCostRub = kopecksToRubles(kop);
		} else if (patch.labCostRub !== undefined) {
			const rub = patch.labCostRub !== null ? patch.labCostRub : 0;
			updates.labCostRub = rub;
			updates.labCostKopecks = BigInt(rublesToKopecks(rub));
		}
		if (patch.salaryPriceKopecks !== undefined) {
			updates.salaryPriceKopecks =
				patch.salaryPriceKopecks !== null
					? BigInt(Math.round(patch.salaryPriceKopecks))
					: null;
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
		: await withTenantWriteCtx(organizationId, run);
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
		: await withTenantWriteCtx(organizationId, run);
}
