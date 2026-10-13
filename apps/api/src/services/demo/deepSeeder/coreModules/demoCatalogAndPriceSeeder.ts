/**
 * demoCatalogAndPriceSeeder.ts — Baseline 804n Services & Pricelist Seeder under RLS (Layer 2).
 */

import { withTenantCtx } from "../../../../db/rls.js";
import { seedBaseline804nServicesInDb } from "../../../../db/pricelistQuery.js";
import { DEMO_SHOWCASE_ORG_ID } from "../types.js";

/**
 * Гарантирует наличие базового клинического справочника услуг Приказа 804н для демо-организации.
 * Выполняется строго под контекстом тенанта (RLS) для предотвращения загрязнения чужих данных.
 */
export async function ensureDemoPricelistCatalog(forceReset = false): Promise<void> {
	try {
		await withTenantCtx(DEMO_SHOWCASE_ORG_ID, async () => {
			await seedBaseline804nServicesInDb(DEMO_SHOWCASE_ORG_ID, {
				replace: forceReset,
			});
		});
	} catch (pricelistErr) {
		console.warn(
			"[DEMO_SEED_PRICELIST_WARN] Не удалось засеять прайс 804н для демо:",
			pricelistErr,
		);
	}
}
