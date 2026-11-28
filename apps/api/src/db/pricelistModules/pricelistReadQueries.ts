import {
	type ServiceCatalogItem,
	kopecksToRubles,
	rublesToKopecks,
	serviceCatalogItemSchema,
	serviceCategorySchema,
} from "@dental/shared";
import { and, asc, eq, gt } from "drizzle-orm";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { schemaIssueWords } from "../../utils/schemaRefusalWords.js";
import { db } from "../client.js";
import { withTenantCtx, withTenantReadCtx, type TenantDb } from "../rls.js";
import * as schema from "../schema.js";

const logger = createApiLogger("pricelistQuery");

/** Строка прайса ровно в той форме, в которой её отдаёт база. */
export type ServiceCatalogRow = typeof schema.serviceCatalogItems.$inferSelect;

/** Услуга, которую не удалось принять, и причина — человеческими словами. */
interface RejectedServiceCatalogRow {
	code: string;
	title: string;
	reason: string;
}

export interface ServiceCatalogProjection {
	items: ServiceCatalogItem[];
	rejected: RejectedServiceCatalogRow[];
}

/**
 * Текст для пустого прайса. Живёт здесь, а не у каждого вызывающего, чтобы на
 * всех поверхностях звучала одна и та же фраза.
 */
export const SERVICE_CATALOG_EMPTY_MESSAGE =
	"Прайс-лист пуст: в справочнике услуг клиники нет ни одной позиции. " +
	"Заполните прайс в настройках — иначе договор, счёт и чек не смогут посчитать сумму, " +
	"а справка для налогового вычета уйдёт с нулём.";

export function useInMemory(): boolean {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

function readMoneyRub(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function readKopecksValue(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	const parsed = typeof value === "bigint" ? Number(value) : typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function resolvePrimaryKopecks(
	kopecksVal: unknown,
	legacyRubVal: unknown,
): number | null {
	const kop = readKopecksValue(kopecksVal);
	const legacyRub = readMoneyRub(legacyRubVal);
	if (kop !== null && (kop !== 0 || legacyRub === null || legacyRub === 0)) {
		return kop;
	}
	return legacyRub !== null ? rublesToKopecks(legacyRub) : null;
}

function readDurationMinutes(value: unknown): number | null {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

const serviceCatalogFieldLabels: Record<string, string> = {
	id: "опознавательный номер услуги",
	organizationId: "клиника услуги",
	code: "код услуги",
	title: "название услуги",
	aliases: "синонимы названия",
	category: "раздел прайса",
	specialty: "специальность врача",
	basePriceRub: "цена услуги",
	durationMinutes: "длительность услуги в минутах",
	taxDeductible: "признак налогового вычета",
	active: "признак «услуга в работе»",
};

function firstIssueMessage(
	issues: readonly { path: (string | number)[]; message: string }[],
): string {
	const issue = issues[0];
	if (!issue)
		return "строка не соответствует контракту услуги, поэтому исправьте её в настройках прайса";
	const words = schemaIssueWords(issue, serviceCatalogFieldLabels);
	return `${words.cause} — ${words.action}`;
}

/**
 * Единая проекция строк прайса. Вызывается и путём экранов
 * (db/domainStateHydration.ts), и путём документов (db/documentQuery.ts через
 * getServiceCatalogForOrganization), и анализом прайса (routes/pricelist.ts).
 */
export function projectServiceCatalogRows(
	rows: readonly ServiceCatalogRow[],
): ServiceCatalogProjection {
	const items: ServiceCatalogItem[] = [];
	const rejected: RejectedServiceCatalogRow[] = [];

	for (const row of rows) {
		const resolvedBasePriceKopecks = resolvePrimaryKopecks(
			row.basePriceKopecks ?? row.priceKopecks,
			row.basePriceRub ?? row.priceRub,
		);
		if (resolvedBasePriceKopecks === null) {
			rejected.push({
				code: row.code,
				title: row.title,
				reason:
					"цена в базе не читается как число, поэтому услугу нельзя посчитать ни в счёте, ни в договоре",
			});
			continue;
		}
		const basePriceRub = kopecksToRubles(resolvedBasePriceKopecks);
		const resolvedPriceKopecks =
			resolvePrimaryKopecks(row.priceKopecks, row.priceRub) ??
			resolvedBasePriceKopecks;
		const resolvedMaterialsCostKopecks =
			resolvePrimaryKopecks(row.materialsCostKopecks, row.materialsCostRub) ?? 0;
		const resolvedLabCostKopecks =
			resolvePrimaryKopecks(row.labCostKopecks, row.labCostRub) ?? 0;
		const durationMinutes = readDurationMinutes(row.durationMinutes);
		if (durationMinutes === null) {
			rejected.push({
				code: row.code,
				title: row.title,
				reason:
					"длительность в базе не читается как число, поэтому услугу нельзя поставить в расписание",
			});
			continue;
		}

		const parsed = serviceCatalogItemSchema.safeParse({
			id: row.id,
			organizationId: row.organizationId,
			code: row.code,
			title: row.title,
			aliases: [],
			category: row.category,
			specialty: row.specialty,
			basePriceRub,
			durationMinutes,
			taxDeductible: row.taxDeductible,
			active: row.isActive,
			order804nCode: row.order804nCode ?? null,
			materialsCostRub: kopecksToRubles(resolvedMaterialsCostKopecks),
			labCostRub: kopecksToRubles(resolvedLabCostKopecks),
			basePriceKopecks: resolvedPriceKopecks,
			materialsCostKopecks: resolvedMaterialsCostKopecks,
			labCostKopecks: resolvedLabCostKopecks,
			salaryPriceKopecks:
				row.salaryPriceKopecks !== null && row.salaryPriceKopecks !== undefined
					? Number(row.salaryPriceKopecks)
					: null,
			tierPrices:
				row.tierPrices && typeof row.tierPrices === "object"
					? (row.tierPrices as Record<string, unknown>)
					: {},
			priceKopecks: resolvedPriceKopecks,
		});

		if (!parsed.success) {
			rejected.push({
				code: row.code,
				title: row.title,
				reason: firstIssueMessage(parsed.error.issues),
			});
			continue;
		}

		items.push(parsed.data);
	}

	return { items, rejected };
}

export async function selectOwnedServiceCatalogRow(
	organizationId: string,
	serviceId: string,
	executor?: TenantDb | typeof db,
): Promise<ServiceCatalogRow | null> {
	const client = executor ?? db;
	const [row] = await client
		.select()
		.from(schema.serviceCatalogItems)
		.where(
			and(
				eq(schema.serviceCatalogItems.id, serviceId),
				eq(schema.serviceCatalogItems.organizationId, organizationId),
			),
		)
		.limit(1);
	return row ?? null;
}

export function projectSingleServiceCatalogRow(
	row: ServiceCatalogRow,
): ServiceCatalogItem {
	const projection = projectServiceCatalogRows([row]);
	const item = projection.items[0];
	if (item) return item;
	const reason =
		projection.rejected[0]?.reason ??
		"строка не соответствует контракту услуги";
	throw new Error(
		`Услуга сохранена в базу, но не проходит контракт прайса: ${reason}`,
	);
}

export interface ServiceCatalogBatchPage {
	readonly items: ServiceCatalogItem[];
	readonly nextCursorId: string | null;
}

/** Потоковая keyset-выборка прайс-листа для экспорта и больших каталогов (без полного дампа в RAM). */
export async function getServiceCatalogBatchForOrganization(
	organizationId: string,
	options: {
		readonly afterId?: string | undefined;
		readonly limit?: number | undefined;
		readonly category?: string | undefined;
		readonly activeOnly?: boolean | undefined;
		readonly tx?: TenantDb | undefined;
	} = {},
): Promise<ServiceCatalogBatchPage> {
	if (useInMemory()) {
		return { items: [], nextCursorId: null };
	}
	const batchLimit = Math.max(1, Math.min(options.limit ?? 500, 1000));
	const runQuery = async (tx: TenantDb): Promise<ServiceCatalogBatchPage> => {
		const conditions = [eq(schema.serviceCatalogItems.organizationId, organizationId)];
		if (options.afterId) {
			conditions.push(gt(schema.serviceCatalogItems.id, options.afterId));
		}
		if (options.category && options.category !== "all") {
			const parsedCategory = serviceCategorySchema.safeParse(options.category);
			if (!parsedCategory.success) {
				return { items: [], nextCursorId: null };
			}
			conditions.push(eq(schema.serviceCatalogItems.category, parsedCategory.data));
		}
		if (options.activeOnly) {
			conditions.push(eq(schema.serviceCatalogItems.isActive, true));
		}

		const rows = await tx
			.select()
			.from(schema.serviceCatalogItems)
			.where(and(...conditions))
			.orderBy(asc(schema.serviceCatalogItems.id))
			.limit(batchLimit + 1);

		const hasMore = rows.length > batchLimit;
		const pageRows = hasMore ? rows.slice(0, batchLimit) : rows;
		const nextCursorId = hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null;
		return {
			items: projectServiceCatalogRows(pageRows).items,
			nextCursorId,
		};
	};
	return options.tx ? await runQuery(options.tx) : await withTenantReadCtx(organizationId, runQuery);
}

/** Прайс организации для документов и анализа прайса. */
export async function getServiceCatalogForOrganization(
	organizationId: string,
	externalTx?: TenantDb,
): Promise<ServiceCatalogItem[]> {
	if (useInMemory()) {
		return [];
	}
	const runQuery = async (tx: TenantDb) => {
		const rows = await tx
			.select()
			.from(schema.serviceCatalogItems)
			.where(eq(schema.serviceCatalogItems.organizationId, organizationId));
		return projectServiceCatalogRows(rows).items;
	};
	return externalTx ? await runQuery(externalTx) : await withTenantReadCtx(organizationId, runQuery);
}

export async function getSingleServiceCatalogItemFromDb(
	organizationId: string,
	serviceId: string,
	externalTx?: TenantDb,
): Promise<ServiceCatalogItem | null> {
	if (useInMemory()) return null;
	const runQuery = async (tx: TenantDb) => {
		const row = await selectOwnedServiceCatalogRow(
			organizationId,
			serviceId,
			tx,
		);
		if (!row) return null;
		return projectSingleServiceCatalogRow(row);
	};
	return externalTx ? await runQuery(externalTx) : await withTenantReadCtx(organizationId, runQuery);
}
