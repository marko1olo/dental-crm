import {
	type ServiceCatalogItem,
	rublesToKopecks,
	serviceCatalogItemSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { schemaIssueWords } from "../../utils/schemaRefusalWords.js";
import { db } from "../client.js";
import { withTenantCtx, type TenantDb } from "../rls.js";
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
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
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
		const basePriceRub = readMoneyRub(row.basePriceRub);
		if (basePriceRub === null) {
			rejected.push({
				code: row.code,
				title: row.title,
				reason:
					"цена в базе не читается как число, поэтому услугу нельзя посчитать ни в счёте, ни в договоре",
			});
			continue;
		}
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
			materialsCostRub:
				row.materialsCostRub !== null && row.materialsCostRub !== undefined
					? Number(row.materialsCostRub)
					: 0,
			labCostRub:
				row.labCostRub !== null && row.labCostRub !== undefined
					? Number(row.labCostRub)
					: 0,
			tierPrices:
				row.tierPrices && typeof row.tierPrices === "object"
					? (row.tierPrices as Record<string, unknown>)
					: {},
			priceKopecks: rublesToKopecks(basePriceRub),
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

/** Прайс организации для документов и анализа прайса. */
export async function getServiceCatalogForOrganization(
	organizationId: string,
): Promise<ServiceCatalogItem[]> {
	if (useInMemory()) {
		return [];
	}
	return await withTenantCtx(organizationId, async (tx) => {
		const rows = await tx
			.select()
			.from(schema.serviceCatalogItems)
			.where(eq(schema.serviceCatalogItems.organizationId, organizationId));
		return projectServiceCatalogRows(rows).items;
	});
}

export async function getSingleServiceCatalogItemFromDb(
	organizationId: string,
	serviceId: string,
): Promise<ServiceCatalogItem | null> {
	if (useInMemory()) return null;
	return await withTenantCtx(organizationId, async (tx) => {
		const row = await selectOwnedServiceCatalogRow(
			organizationId,
			serviceId,
			tx,
		);
		if (!row) return null;
		return projectSingleServiceCatalogRow(row);
	});
}
