/**
 * servicePriceListTool.ts — Поиск стоматологических услуг в прейскуранте клиники и нормативном каталоге.
 * Мандаты: 8b (<= 120 строк), 8n (соло-практика), 8x (живой клинический язык).
 */

import { and, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db as defaultDb } from "../../../db/client.js";
import { serviceCatalogItems, services } from "../../../db/schema.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";
import { STANDARD_804N_CATALOG } from "./serviceCatalogData.js";

export * from "./serviceCatalogData.js";

export const searchServicesSchema = z.object({
	codeOrName: z.string().min(1, "Поисковый запрос обязателен").describe("Код услуги (A16.07.002, A16.07.030) или название процедуры"),
	category: z.enum(["therapy", "surgery", "orthopedics", "orthodontics", "hygiene", "all"]).default("all").describe("Категория стоматологических услуг"),
});

export type SearchServicesInput = z.infer<typeof searchServicesSchema>;

export interface SearchServicesResult {
	readonly found: boolean;
	readonly query: string;
	readonly totalCount: number;
	readonly results: readonly {
		readonly code: string;
		readonly title: string;
		readonly category: string;
		readonly priceRub: number | null;
		readonly source: "clinic_pricelist" | "order_804n_standard_catalog";
	}[];
}

export async function handleSearchServices(args: SearchServicesInput, context: DentalToolContext): Promise<SearchServicesResult> {
	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const query = args.codeOrName.trim();
	const searchPattern = `%${query}%`;

	// 1. Поиск в прейскуранте клиники (serviceCatalogItems)
	const clinicItems = await activeDb
		.select()
		.from(serviceCatalogItems)
		.where(and(eq(serviceCatalogItems.organizationId, orgId), or(ilike(serviceCatalogItems.title, searchPattern), ilike(serviceCatalogItems.code, searchPattern), ilike(serviceCatalogItems.order804nCode, searchPattern))))
		.limit(10);

	if (clinicItems.length > 0) {
		return {
			found: true,
			query,
			totalCount: clinicItems.length,
			results: clinicItems.map((item) => ({
				code: item.order804nCode || item.code,
				title: item.title,
				category: item.category,
				priceRub: item.priceRub,
				source: "clinic_pricelist" as const,
			})),
		};
	}

	// 2. Поиск в альтернативной таблице услуг (services)
	const servicesItems = await activeDb
		.select()
		.from(services)
		.where(and(eq(services.organizationId, orgId), or(ilike(services.title, searchPattern), ilike(services.code, searchPattern))))
		.limit(10);

	if (servicesItems.length > 0) {
		return {
			found: true,
			query,
			totalCount: servicesItems.length,
			results: servicesItems.map((item) => ({
				code: item.code || "A16.07.000",
				title: item.title,
				category: item.category,
				priceRub: item.basePriceRub,
				source: "clinic_pricelist" as const,
			})),
		};
	}

	// 3. Мягкий фолбек на нормативный справочник базовых стоматологических процедур
	const normQuery = query.toLowerCase();
	const fallbackMatches = STANDARD_804N_CATALOG.filter((s) => s.code.toLowerCase().includes(normQuery) || s.title.toLowerCase().includes(normQuery));

	return {
		found: fallbackMatches.length > 0,
		query,
		totalCount: fallbackMatches.length,
		results: fallbackMatches.map((m) => ({
			code: m.code,
			title: m.title,
			category: m.category,
			priceRub: null,
			source: "order_804n_standard_catalog" as const,
		})),
	};
}

export const searchServicesTool: DentalToolEntry<typeof searchServicesSchema> = {
	name: "search_clinic_services_and_prices",
	description: "Поиск стоматологических услуг в прейскуранте клиники и базовом каталоге процедур (коды A16.07.002, A16.07.030 и названия).",
	schema: searchServicesSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("search_clinic_services_and_prices", "Поиск услуг и прайса по кодам и каталогу клиники с мягким нормативным фолбеком.", searchServicesSchema),
	handler: handleSearchServices,
};
