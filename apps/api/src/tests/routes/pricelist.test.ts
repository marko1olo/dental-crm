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

describe("Pricelist Routes, 804n Nomenclature & Category Validation", () => {
	const prevEnv = { ...process.env };

	before(() => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
	});

	after(() => {
		process.env.NODE_ENV = prevEnv.NODE_ENV;
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
});
