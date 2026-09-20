/**
 * statutoryCatalogsTurboCache.test.ts — Comprehensive test suite for statutory reference catalogs
 * (Nomenclature 804n, ICD-10, EMR 043/u templates) offline caching & 0ms L1 RAM turbo access.
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8c: Low-spec 5400 RPM HDD zero-seek optimization, zero disk thrashing.
 * - Mandate 8e: Doctor autonomy, instant search across 804n & ICD-10 without UI freezes.
 * - Mandate 8n: Solo doctor & small clinic resilience during offline or low-spec laptop operation.
 */

import assert from "node:assert";
import test from "node:test";
import {
	getCachedApiResponse,
	setCachedApiResponse,
	clearApiCache,
	cachedApiFetch,
	isCacheableCatalogUrl,
	notifyApiMutation,
	readCatalogFromPersistentStorage,
	saveCatalogToPersistentStorage,
} from "../lib/apiCacheEngine";
import {
	getCached804nSync,
	getCachedIcd10Sync,
	getCachedTemplatesSync,
	searchCached804nSync,
	searchCachedIcd10Sync,
	getOrLoadNomenclature804n,
	getOrLoadIcd10Dictionary,
	getOrLoadClinical043Templates,
	seedAllStatutoryCatalogsInIndexedDb,
	clearStatutoryCatalogsCache,
	getStatutoryCatalogCacheStats,
	setStatutoryCatalogInRam,
} from "../services/storage/statutoryCatalogCache";
import {
	cacheStatutoryCatalog,
	getCachedStatutoryCatalog,
} from "../services/storage/clinicalCacheStorage";

test("Statutory Catalogs Turbo Cache & L1 RAM Zero-Seek Latency Suite", async (t) => {
	t.beforeEach(async () => {
		clearApiCache();
		await clearStatutoryCatalogsCache();
	});

	await t.test("1. Catalog URL patterns are correctly identified as statutory cacheable", () => {
		assert.strictEqual(isCacheableCatalogUrl("/api/clinical/804n"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/clinical/nomenclature"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/804n"), true);

		assert.strictEqual(isCacheableCatalogUrl("/api/clinical/icd10"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/catalogs/icd10"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/icd10"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/mkb10"), true);

		assert.strictEqual(isCacheableCatalogUrl("/api/emr/templates"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/templates"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/document-templates"), true);

		// Non-catalog endpoints should NOT be intercepted as static statutory catalogs
		assert.strictEqual(isCacheableCatalogUrl("/api/patients"), false);
		assert.strictEqual(isCacheableCatalogUrl("/api/billing/invoices"), false);
	});

	await t.test("2. /api/clinical/804n populates L1 RAM immediately and provides 0ms synchronous access", async () => {
		const sample804n = [
			{ code: "A16.07.002.001", name: "Восстановление зуба пломбой (кариес эмали)", serviceName: "Пломба I класс" },
			{ code: "A16.07.030.001", name: "Инструментальная и медикаментозная обработка канала", serviceName: "Эндодонтия 1 канал" },
		];

		// First response arrives
		setCachedApiResponse("/api/clinical/804n", sample804n);

		// 1. Instant L1 RAM hit via apiCacheEngine
		const ramHit = getCachedApiResponse<typeof sample804n>("/api/clinical/804n");
		assert.ok(ramHit, "Must hit apiCacheEngine in-memory cache");
		assert.strictEqual(ramHit.data.length, 2);

		// 2. Instant 0ms synchronous access via statutoryCatalogCache
		const syncHit = getCached804nSync<typeof sample804n[0]>();
		assert.ok(syncHit, "Must synchronize with getCached804nSync synchronously");
		assert.strictEqual(syncHit.length, 2);
		assert.strictEqual(syncHit[0].code, "A16.07.002.001");

		// 3. Instant 0ms synchronous search
		const searchResults = searchCached804nSync("обработка");
		assert.strictEqual(searchResults.length, 1);
		assert.strictEqual(searchResults[0].code, "A16.07.030.001");

		const searchByCode = searchCached804nSync("A16.07.002");
		assert.strictEqual(searchByCode.length, 1);
	});

	await t.test("3. /api/clinical/icd10 populates L1 RAM immediately and provides 0ms synchronous search", async () => {
		const sampleIcd10 = [
			{ code: "K02.1", name: "Кариес дентина", description: "Средний кариес" },
			{ code: "K04.0", name: "Пульпит", description: "Острый очаговый пульпит" },
			{ code: "K05.3", name: "Хронический пародонтит", description: "Пародонтит средней степени" },
		];

		setCachedApiResponse("/api/clinical/icd10", sampleIcd10);

		// Synchronous RAM hit
		const syncHit = getCachedIcd10Sync<typeof sampleIcd10[0]>();
		assert.ok(syncHit);
		assert.strictEqual(syncHit.length, 3);

		// Synchronous search
		const foundPulpit = searchCachedIcd10Sync("Пульпит");
		assert.strictEqual(foundPulpit.length, 1);
		assert.strictEqual(foundPulpit[0].code, "K04.0");

		const foundByCode = searchCachedIcd10Sync("K02");
		assert.strictEqual(foundByCode.length, 1);
		assert.strictEqual(foundByCode[0].code, "K02.1");
	});

	await t.test("4. /api/emr/templates populates L1 RAM and synchronizes across getters", async () => {
		const sampleTemplates = [
			{ id: "tmpl-caries-1", title: "Лечение поверхностного кариеса", category: "therapy" },
			{ id: "tmpl-hygiene-1", title: "Комплексная профессиональная гигиена", category: "hygiene" },
		];

		setCachedApiResponse("/api/emr/templates", sampleTemplates);

		const syncTemplates = getCachedTemplatesSync<typeof sampleTemplates[0]>();
		assert.ok(syncTemplates);
		assert.strictEqual(syncTemplates.length, 2);
		assert.strictEqual(syncTemplates[0].id, "tmpl-caries-1");

		// Stats must show all cached in RAM
		const stats = getStatutoryCatalogCacheStats();
		assert.strictEqual(stats.hasTemplatesInRam, true);
	});

	await t.test("5. Cross-subsystem persistence: clinicalCacheStorage and apiCacheEngine link transparently", async () => {
		const sampleCatalog = [
			{ code: "A16.07.001", name: "Удаление постоянного зуба" },
		];

		// Save into clinicalCacheStorage
		await cacheStatutoryCatalog("catalog_804n", sampleCatalog);

		// Read from apiCacheEngine persistent storage
		const readBack = await readCatalogFromPersistentStorage<typeof sampleCatalog>("/api/clinical/804n");
		assert.ok(readBack, "readCatalogFromPersistentStorage must find records stored in clinicalCacheStorage");
		assert.strictEqual(readBack.data.length, 1);
		assert.strictEqual(readBack.data[0].code, "A16.07.001");
	});

	await t.test("6. Fallback seeding guarantees offline operation when cold-booting without network", async () => {
		// Cold boot: clean slate
		clearApiCache();
		await clearStatutoryCatalogsCache();

		const seeded = await seedAllStatutoryCatalogsInIndexedDb();
		assert.ok(seeded.nomenclatureCount > 0, "Nomenclature 804n must seed static presets");
		assert.ok(seeded.icd10Count > 0, "ICD-10 must seed static presets");
		assert.ok(seeded.templatesCount > 0, "EMR templates must seed static presets");

		// After seeding, synchronous RAM access must be instantly ready
		const stats = getStatutoryCatalogCacheStats();
		assert.strictEqual(stats.has804nInRam, true);
		assert.strictEqual(stats.hasIcd10InRam, true);
		assert.strictEqual(stats.hasTemplatesInRam, true);
		assert.ok(stats.ramItemCount >= seeded.nomenclatureCount + seeded.icd10Count + seeded.templatesCount);

		// 0ms synchronous search works out of the box
		const k02Search = searchCachedIcd10Sync("K02");
		assert.ok(k02Search.length > 0);
	});

	await t.test("7. Automatic invalidation on mutation resets affected catalog while preserving others", () => {
		setCachedApiResponse("/api/settings/price", [{ id: "p1", price: 1000 }]);
		setCachedApiResponse("/api/emr/templates", [{ id: "t1", title: "Терапия" }]);
		setCachedApiResponse("/api/clinical/icd10", [{ code: "K02", name: "Кариес" }]);

		assert.ok(getCachedApiResponse("/api/settings/price"));
		assert.ok(getCachedApiResponse("/api/emr/templates"));
		assert.ok(getCachedApiResponse("/api/clinical/icd10"));

		// Doctor or admin updates template via POST /api/templates
		notifyApiMutation("/api/templates", "POST");

		// EMR templates must be purged
		assert.strictEqual(getCachedApiResponse("/api/emr/templates"), undefined);

		// Unrelated catalogs (ICD-10, prices) must remain untouched in RAM
		assert.ok(getCachedApiResponse("/api/clinical/icd10"));
		assert.ok(getCachedApiResponse("/api/settings/price"));
	});
});
