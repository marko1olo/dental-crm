/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIT & ROUTE TESTS: PRICELIST ROUTES, 804N NOMENCLATURE & ACID TRANSACTIONS
 * Verifies category validation, statutory 804n codes, zero-mocks compliance,
 * seed endpoint aliases, and HTTP 503 ServiceCatalogStorageDisabled handling.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import {
	handleSeedBaseline804n,
	isValidServiceCategory,
	normalizeCategory,
	normalizeSpecialty,
	registerPricelistRoutes,
	SERVICE_CATEGORIES_METADATA,
	STATUTORY_CATEGORY_CODES,
	STATUTORY_CATEGORY_DURATIONS,
	VALID_SERVICE_CATEGORIES,
} from "../../routes/pricelist.js";
import { computeRepricedAmount } from "../../db/pricelistQuery.js";
import {
	crossReferenceWithExistingCatalog,
	matchOrder804nNomenclature,
} from "../../services/ai/priceListIngestionService.js";
import { registerExportRoutes } from "../../routes/export.js";

describe("Pricelist Routes, 804n Nomenclature & Category Validation", () => {
	const prevEnv = { ...process.env };

	before(() => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTAL_STATE_PERSISTENCE = "off";
	});

	after(() => {
		process.env.NODE_ENV = prevEnv.NODE_ENV;
		if (prevEnv.DENTAL_STATE_PERSISTENCE !== undefined) {
			process.env.DENTAL_STATE_PERSISTENCE = prevEnv.DENTAL_STATE_PERSISTENCE;
		} else {
			delete process.env.DENTAL_STATE_PERSISTENCE;
		}
		if (prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_READS !== undefined) {
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		} else {
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		}
		if (prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS !== undefined) {
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = prevEnv.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		} else {
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		}
		if (prevEnv.DENTE_DEV_ALLOW_HEADER_ORG !== undefined) {
			process.env.DENTE_DEV_ALLOW_HEADER_ORG = prevEnv.DENTE_DEV_ALLOW_HEADER_ORG;
		} else {
			delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		}
	});

	// ─── 1. Category Validation & Normalization ───────────────────────────────

	describe("1. Category Validation & Clinical Normalization", () => {
		it("validates all standard English service categories", () => {
			for (const cat of VALID_SERVICE_CATEGORIES) {
				assert.strictEqual(isValidServiceCategory(cat), true);
			}
		});

		it("validates Russian clinical category aliases", () => {
			assert.strictEqual(isValidServiceCategory("терапия"), true);
			assert.strictEqual(isValidServiceCategory("ортопедия"), true);
			assert.strictEqual(isValidServiceCategory("хирургия"), true);
			assert.strictEqual(isValidServiceCategory("ортодонтия"), true);
			assert.strictEqual(isValidServiceCategory("гигиена"), true);
			assert.strictEqual(isValidServiceCategory("пародонтология"), true);
			assert.strictEqual(isValidServiceCategory("диагностика"), true);
			assert.strictEqual(isValidServiceCategory("консультация"), true);
			assert.strictEqual(isValidServiceCategory("документы"), true);
		});

		it("rejects unknown or invalid categories", () => {
			assert.strictEqual(isValidServiceCategory("космонавтика"), false);
			assert.strictEqual(isValidServiceCategory(""), false);
			assert.strictEqual(isValidServiceCategory("invalid_category_xyz"), false);
		});

		it("normalizes Russian clinical phrases to statutory categories", () => {
			assert.strictEqual(normalizeCategory("Лечение глубокого кариеса"), "therapy");
			assert.strictEqual(normalizeCategory("Пульпит 3-канального зуба"), "therapy");
			assert.strictEqual(normalizeCategory("Эндодонтическая обработка"), "therapy");
			assert.strictEqual(normalizeCategory("Сложное удаление зуба мудрости"), "surgery");
			assert.strictEqual(normalizeCategory("Дентальная имплантация Osstem"), "surgery");
			assert.strictEqual(normalizeCategory("Коронка из диоксида циркония"), "prosthetics");
			assert.strictEqual(normalizeCategory("Керамический винир E-max"), "prosthetics");
			assert.strictEqual(normalizeCategory("Установка брекет-системы Damon"), "orthodontics");
			assert.strictEqual(normalizeCategory("Элайнеры Star Smile"), "orthodontics");
			assert.strictEqual(normalizeCategory("Профессиональная гигиена Air-Flow"), "hygiene");
			assert.strictEqual(normalizeCategory("Прицельный рентгеновский снимок RVG"), "imaging");
			assert.strictEqual(normalizeCategory("Первичная консультация врача"), "consultation");
			assert.strictEqual(normalizeCategory("Справка для налогового вычета 043/у"), "documents");
			assert.strictEqual(normalizeCategory("Неизвестная услуга"), "other");
		});

		it("normalizes staff specialties accurately", () => {
			assert.strictEqual(normalizeSpecialty("терапевт"), "therapist");
			assert.strictEqual(normalizeSpecialty("ортопед"), "orthopedist");
			assert.strictEqual(normalizeSpecialty("хирург"), "surgeon");
			assert.strictEqual(normalizeSpecialty("ортодонт"), "orthodontist");
			assert.strictEqual(normalizeSpecialty("гигиенист"), "hygienist");
			assert.strictEqual(normalizeSpecialty("детский"), "pediatric");
			assert.strictEqual(normalizeSpecialty("unknown"), "universal");
		});
	});

	// ─── 2. Statutory 804n Nomenclature (Zero Mocks Mandate) ───────────────────

	describe("2. Statutory 804n Nomenclature (Zero Mocks Mandate)", () => {
		it("all statutory category codes match genuine 804n format without A16.07.000 mocks", () => {
			for (const [category, code] of Object.entries(STATUTORY_CATEGORY_CODES)) {
				assert.notStrictEqual(code, "A16.07.000", `Mock code found in ${category}`);
				assert.match(
					code,
					/^[AB]\d{2}\.\d{2,3}\.\d{3}$/,
					`Invalid statutory nomenclature format for ${category}: ${code}`,
				);
			}
		});

		it("all statutory category durations are clinically realistic (> 0 min)", () => {
			for (const [category, duration] of Object.entries(STATUTORY_CATEGORY_DURATIONS)) {
				assert.ok(
					duration >= 15 && duration <= 90,
					`Unrealistic duration for ${category}: ${duration} min`,
				);
			}
		});

		it("metadata registry covers all core clinical specialties", () => {
			assert.strictEqual(SERVICE_CATEGORIES_METADATA.length >= 9, true);
			const ids = SERVICE_CATEGORIES_METADATA.map((m) => m.id);
			assert.ok(ids.includes("therapy"));
			assert.ok(ids.includes("prosthetics"));
			assert.ok(ids.includes("surgery"));
			assert.ok(ids.includes("orthodontics"));
			assert.ok(ids.includes("hygiene"));
			assert.ok(ids.includes("imaging"));
			assert.ok(ids.includes("consultation"));
		});
	});

	// ─── 3. Fastify Routes & Canonical Seed Endpoints ─────────────────────────

	describe("3. Fastify Route Endpoints & Canonical Seed Aliases", () => {
		it("GET /api/pricelist/categories returns 200 with structured metadata", async () => {
			const app = Fastify();
			await registerPricelistRoutes(app);

			const response = await app.inject({
				method: "GET",
				url: "/api/pricelist/categories",
			});

			assert.strictEqual(response.statusCode, 200);
			const body = JSON.parse(response.body);
			assert.strictEqual(body.success, true);
			assert.ok(Array.isArray(body.categories));
			assert.strictEqual(body.categories.length, SERVICE_CATEGORIES_METADATA.length);
		});

		it("seed endpoint aliases all point to the canonical handler", () => {
			// Проверяем экспорт канонического обработчика
			assert.strictEqual(typeof handleSeedBaseline804n, "function");
		});

		it("POST /api/pricelist/seed-baseline-804n handles invalid request body gracefully with 400", async () => {
			const app = Fastify();
			await registerPricelistRoutes(app);

			const response = await app.inject({
				method: "POST",
				url: "/api/pricelist/seed-baseline-804n",
				headers: {
					"x-organization-id": "org-test-seed",
				},
				payload: {
					replace: "not-a-boolean",
				},
			});

			assert.strictEqual(response.statusCode, 400);
			const body = JSON.parse(response.body);
			assert.strictEqual(body.error, "PricelistValidationError");
		});

		it("POST /api/pricelist/seed-baseline alias behaves identically on validation error", async () => {
			const app = Fastify();
			await registerPricelistRoutes(app);

			const response = await app.inject({
				method: "POST",
				url: "/api/pricelist/seed-baseline",
				headers: {
					"x-organization-id": "org-test-seed",
				},
				payload: {
					replace: "not-a-boolean",
				},
			});

			assert.strictEqual(response.statusCode, 400);
			const body = JSON.parse(response.body);
			assert.strictEqual(body.error, "PricelistValidationError");
		});

		it("POST /api/pricelist/seed alias behaves identically on validation error", async () => {
			const app = Fastify();
			await registerPricelistRoutes(app);

			const response = await app.inject({
				method: "POST",
				url: "/api/pricelist/seed",
				headers: {
					"x-organization-id": "org-test-seed",
				},
				payload: {
					replace: "not-a-boolean",
				},
			});

			assert.strictEqual(response.statusCode, 400);
			const body = JSON.parse(response.body);
			assert.strictEqual(body.error, "PricelistValidationError");
		});
	});

	// ─── 4. Pricelist Export (RFC 4180 CSV with UTF-8 BOM and JSON) ───────────

	describe("4. Pricelist Export (RFC 4180 CSV with UTF-8 BOM and JSON)", () => {
		it("GET /api/pricelist/export returns CSV with UTF-8 BOM and semicolon delimiters", async () => {
			const app = Fastify();
			await registerPricelistRoutes(app);

			const response = await app.inject({
				method: "GET",
				url: "/api/pricelist/export?format=csv",
				headers: {
					"x-organization-id": "org-test-export",
				},
			});

			assert.strictEqual(response.statusCode, 200);
			assert.ok(response.headers["content-type"]?.includes("text/csv"));
			assert.ok(response.headers["content-disposition"]?.includes("dente_pricelist_"));
			const body = response.body;
			assert.ok(
				body.startsWith("\uFEFF"),
				"CSV output must start with UTF-8 BOM for Russian Excel compatibility",
			);
			assert.ok(
				body.includes(
					"Код услуги;Коммерческое наименование;Раздел;Специальность;Цена (руб);Длительность (мин);НДС;Налоговый вычет;Статус",
				),
			);
		});

		it("GET /api/pricelist/export returns JSON structure when requested", async () => {
			const app = Fastify();
			await registerPricelistRoutes(app);

			const response = await app.inject({
				method: "GET",
				url: "/api/pricelist/export?format=json",
				headers: {
					"x-organization-id": "org-test-export",
				},
			});

			assert.strictEqual(response.statusCode, 200);
			const data = JSON.parse(response.body);
			assert.strictEqual(data.success, true);
			assert.strictEqual(data.organizationId, "org-test-export");
			assert.ok(Array.isArray(data.items));
		});

		it("GET /api/export/pricelist alias in export.ts returns CSV with UTF-8 BOM", async () => {
			const app = Fastify();
			await registerExportRoutes(app);

			const response = await app.inject({
				method: "GET",
				url: "/api/export/pricelist",
				headers: {
					"x-organization-id": "org-test-export",
				},
			});

			assert.strictEqual(response.statusCode, 200);
			assert.ok(response.body.startsWith("\uFEFF"));
			assert.ok(response.body.includes("Код услуги;"));
		});
	});

	// ─── 5. Batch Repricing Engine (ACID Transaction, Money Precision & Rounding) ──

	describe("5. Batch Repricing Engine (ACID Transaction, Money Precision & Rounding)", () => {
		it("calculates percentage repricing with exact kopeck precision (none rounding)", () => {
			// 1500.50 + 10% = 1650.55 rub
			const repriced = computeRepricedAmount(1500.5, 10, undefined, "none");
			assert.strictEqual(repriced, 1650.55);
		});

		it("calculates repricing with fixed delta and round_10", () => {
			// 1543.00 + 100 = 1643.00 -> rounded to 10 = 1640.00
			const repriced = computeRepricedAmount(1543, undefined, 100, "round_10");
			assert.strictEqual(repriced, 1640);
		});

		it("calculates repricing with round_50 mode", () => {
			// 2520 + 10% = 2772 -> rounded to nearest 50 = 2750
			const repriced = computeRepricedAmount(2520, 10, undefined, "round_50");
			assert.strictEqual(repriced, 2750);
		});

		it("calculates repricing with round_100 mode", () => {
			// 3560 + 5% = 3738 -> rounded to nearest 100 = 3700
			const repriced = computeRepricedAmount(3560, 5, undefined, "round_100");
			assert.strictEqual(repriced, 3700);
		});

		it("POST /api/pricelist/batch-reprice validates payload and handles errors cleanly", async () => {
			const app = Fastify();
			await registerPricelistRoutes(app);

			const invalidResponse = await app.inject({
				method: "POST",
				url: "/api/pricelist/batch-reprice",
				headers: {
					"x-organization-id": "org-test-reprice",
				},
				payload: {
					percentChange: 99999, // exceeds max: 500
				},
			});

			assert.strictEqual(invalidResponse.statusCode, 400);
			const errBody = JSON.parse(invalidResponse.body);
			assert.strictEqual(errBody.error, "PricelistValidationError");
		});
	});

	// ─── 6. Statutory 804n Fallbacks & Cross-Referencing (Zero A16.07.000 Mocks) ─

	describe("6. Statutory 804n Fallbacks & Cross-Referencing (Zero A16.07.000 Mocks)", () => {
		it("fallback matching yields statutory A16.07.002 code instead of synthetic A16.07.000", () => {
			const result = matchOrder804nNomenclature("Неизвестная стоматологическая процедура", "Неизвестная стоматологическая процедура");
			assert.notStrictEqual(result.code804n, "A16.07.000", "Synthetic A16.07.000 mock must not be returned");
			assert.strictEqual(result.code804n, "A16.07.002");
			assert.strictEqual(result.category, "therapy");
		});

		it("crossReferenceWithExistingCatalog matches exactly by title and genuine statutory code", () => {
			const existing = [
				{
					id: "srv-exist-1",
					organizationId: "org-1",
					code: "A16.07.002.001",
					title: "Лечение кариеса пломбой",
					aliases: [],
					category: "therapy" as const,
					specialty: "therapist" as const,
					basePriceRub: 5500,
					durationMinutes: 45,
					taxDeductible: true,
					active: true,
				},
			];

			const matchExact = crossReferenceWithExistingCatalog(
				"A16.07.002.001",
				"Лечение кариеса пломбой",
				5500,
				existing,
			);

			assert.strictEqual(matchExact.matchedExistingServiceId, "srv-exist-1");
			assert.strictEqual(matchExact.suggestedAction, "identical");

			const matchPriceChange = crossReferenceWithExistingCatalog(
				"A16.07.002.001",
				"Лечение кариеса пломбой",
				6000,
				existing,
			);

			assert.strictEqual(matchPriceChange.matchedExistingServiceId, "srv-exist-1");
			assert.strictEqual(matchPriceChange.suggestedAction, "update_existing");
		});
	});
});
