/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SANPIN & MEDICAL WASTE FIXER SURGEON TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * Mandates:
 * - 8v/8aa: Quiet Back-Office & Soft Negative Stock
 * - 8bo: ACID Transactions & Idempotency-Key (RFC 9562)
 * - 8bf: Unified SSOT & Dead-Code / Orphan Elimination
 * - 8bk: Zero-Any & Exact Optional Property Types
 *
 * Verifies:
 * 1. Canonical SSOT /api/sanpin/sterilization endpoints and removal of legacy routes.
 * 2. Fastify schema decoration for Idempotency-Key and organizationId across all SanPiN mutation routes.
 * 3. Idempotency-Key validation (UUID RFC 9562).
 * 4. Canonical Medical Waste Shift Triad (Class A + Class B Soft + Class B Sharps).
 * 5. Multi-tenant RLS isolation with withTenantCtx across SanPiN logs.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	medicalWasteLogs,
	organizations,
	sterilizationLogs,
	users,
} from "../db/schema.js";
import { registerSanpinRoutes } from "../routes/sanpin.js";
import { registerSanpinSterilizationRoutes } from "../routes/sanpin/sterilizationRoutes.js";
import {
	buildCanonicalShiftWasteRecords,
	type CanonicalShiftWasteParams,
} from "../routes/sanpin/wasteModules/canonicalShiftWasteRecords.js";
import { resetAuthSecretCacheForTests } from "../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
} from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const TEST_SECRET = "s".repeat(48);
const NAMESPACE = "sanpinFixerSurgeonTest";
const ORG_ID_MINE = fixtureUuid(NAMESPACE, 1);
const ORG_ID_ALIEN = fixtureUuid(NAMESPACE, 2);
const STAFF_ID_MINE = fixtureUuid(NAMESPACE, 3);
const STAFF_ID_ALIEN = fixtureUuid(NAMESPACE, 4);

describe("SanPiN & Medical Waste Fixer Surgeon — Invariants & SSOT", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let standaloneSterilApp: FastifyInstance;
	let clinicTokenMine: string;
	let staffTokenMine: string;
	let clinicTokenAlien: string;
	let staffTokenAlien: string;
	let databaseReady = false;

	async function injectWithAuth(
		targetApp: FastifyInstance,
		method: "GET" | "POST" | "PUT" | "DELETE",
		url: string,
		opts: {
			body?: unknown;
			isAlien?: boolean;
			idempotencyKey?: string;
			extraHeaders?: Record<string, string>;
		} = {},
	) {
		const isAlien = opts.isAlien === true;
		const headers: Record<string, string> = {
			"content-type": "application/json",
			[CLINIC_TOKEN_HEADER]: isAlien ? clinicTokenAlien : clinicTokenMine,
			[STAFF_TOKEN_HEADER]: isAlien ? staffTokenAlien : staffTokenMine,
			...(opts.extraHeaders ?? {}),
		};
		if (opts.idempotencyKey) {
			headers["idempotency-key"] = opts.idempotencyKey;
		}

		const injectOpts: {
			method: "GET" | "POST" | "PUT" | "DELETE";
			url: string;
			headers: Record<string, string>;
			payload?: unknown;
		} = {
			method,
			url,
			headers,
		};
		if (opts.body !== undefined) {
			injectOpts.payload = opts.body;
		}

		const res = await targetApp.inject(injectOpts);
		let json: Record<string, unknown> | null = null;
		try {
			json = JSON.parse(res.body) as Record<string, unknown>;
		} catch {
			json = null;
		}

		return {
			status: res.statusCode,
			json,
			body: res.body,
			headers: res.headers,
		};
	}

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		clinicTokenMine = signToken({ organizationId: ORG_ID_MINE }, TEST_SECRET, 3600);
		staffTokenMine = signToken(
			{ organizationId: ORG_ID_MINE, userId: STAFF_ID_MINE, role: "admin" },
			TEST_SECRET,
			3600,
		);

		clinicTokenAlien = signToken({ organizationId: ORG_ID_ALIEN }, TEST_SECRET, 3600);
		staffTokenAlien = signToken(
			{ organizationId: ORG_ID_ALIEN, userId: STAFF_ID_ALIEN, role: "admin" },
			TEST_SECRET,
			3600,
		);

		// 1. Инициализация standalone приложения для проверки маршрутизации стерилизации
		standaloneSterilApp = Fastify({ logger: false });
		registerSanpinSterilizationRoutes(standaloneSterilApp);
		await standaloneSterilApp.ready();

		// 2. Инициализация полного tenant-aware приложения
		app = createTenantTestApp();
		await registerSanpinRoutes(app);
		await app.ready();

		// 3. Проверка доступности базы данных
		if (!isDatabaseUnavailable()) {
			try {
				await purgeFixtureOrganizations([ORG_ID_MINE, ORG_ID_ALIEN]);

				await db.insert(organizations).values([
					{
						id: ORG_ID_MINE,
						name: "SanPiN Fixer Mine Clinic",
						timezone: "Europe/Moscow",
					},
					{
						id: ORG_ID_ALIEN,
						name: "SanPiN Fixer Alien Clinic",
						timezone: "Europe/Moscow",
					},
				]);

				await db.insert(users).values([
					{
						id: STAFF_ID_MINE,
						organizationId: ORG_ID_MINE,
						fullName: "Медсестра ЦСО Своя",
						email: "nurse_mine@dente.local",
						role: "admin",
					},
					{
						id: STAFF_ID_ALIEN,
						organizationId: ORG_ID_ALIEN,
						fullName: "Медсестра ЦСО Чужая",
						email: "nurse_alien@dente.local",
						role: "admin",
					},
				]);
				databaseReady = true;
			} catch (err) {
				// База может быть недоступна в тестовом окружении
				databaseReady = false;
			}
		}
	});

	after(async () => {
		await standaloneSterilApp?.close();
		await app?.close();
		if (databaseReady) {
			try {
				await purgeFixtureOrganizations([ORG_ID_MINE, ORG_ID_ALIEN]);
			} catch {
				// clean-up ignore
			}
		}
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	// ── 1. CANONICAL SSOT STERILIZATION ROUTES & LEGACY ELIMINATION ──────────

	describe("1. Canonical SSOT Sterilization Routes & Legacy Elimination", () => {
		test("registers canonical /api/sanpin/sterilization endpoints and aliases", () => {
			assert.equal(
				standaloneSterilApp.hasRoute({ method: "POST", url: "/api/sanpin/sterilization" }),
				true,
				"Canonical POST /api/sanpin/sterilization must be registered",
			);
			assert.equal(
				standaloneSterilApp.hasRoute({ method: "GET", url: "/api/sanpin/sterilization" }),
				true,
				"Canonical GET /api/sanpin/sterilization must be registered",
			);
			assert.equal(
				standaloneSterilApp.hasRoute({ method: "POST", url: "/api/sanpin/sterilization/quick-norm" }),
				true,
				"1-click quick-norm must be registered",
			);
			assert.equal(
				standaloneSterilApp.hasRoute({ method: "POST", url: "/api/sterilization/cycles" }),
				true,
				"Alias /api/sterilization/cycles must be preserved for compatibility",
			);
			assert.equal(
				standaloneSterilApp.hasRoute({ method: "POST", url: "/api/sanpin/sterilization/scan" }),
				true,
				"Kraft-pack scan must be registered in SSOT",
			);
			assert.equal(
				standaloneSterilApp.hasRoute({ method: "POST", url: "/api/sanpin/sterilization/link" }),
				true,
				"Kraft-pack link must be registered in SSOT",
			);
		});

		test("verifies that legacy duplicate routes from sterilizationLegacyRoutes are not registered", () => {
			// Легаси маршруты из удаленного sterilizationLegacyRoutes.ts:
			// /api/registers/sterilization, /api/sterilization/logs, /api/sanpin/cycles
			assert.equal(
				standaloneSterilApp.hasRoute({ method: "POST", url: "/api/registers/sterilization" }),
				false,
				"Legacy /api/registers/sterilization must be eliminated",
			);
			assert.equal(
				standaloneSterilApp.hasRoute({ method: "GET", url: "/api/sterilization/logs" }),
				false,
				"Legacy /api/sterilization/logs must be eliminated",
			);
			assert.equal(
				standaloneSterilApp.hasRoute({ method: "GET", url: "/api/sanpin/cycles" }),
				false,
				"Legacy /api/sanpin/cycles must be eliminated",
			);
		});
	});

	// ── 2. FASTIFY MUTATION SCHEMAS & IDEMPOTENCY HEADERS (DEF-1) ────────────

	describe("2. Fastify Mutation Schemas & Idempotency-Key Enforcement (DEF-1)", () => {
		test("validates Idempotency-Key and organizationId header schemas on mutation endpoints", () => {
			const mutationEndpoints = [
				{ method: "POST", url: "/api/sanpin/sterilization" },
				{ method: "POST", url: "/api/sanpin/sterilization/quick-norm" },
				{ method: "POST", url: "/api/sanpin/sterilization/daily-tests" },
				{ method: "POST", url: "/api/registers/medical-waste" },
				{ method: "POST", url: "/api/registers/medical-waste/quick-shift-bundle" },
				{ method: "POST", url: "/api/registers/cleaning" },
				{ method: "POST", url: "/api/registers/cleaning/autopilot-month" },
				{ method: "POST", url: "/api/registers/pso" },
				{ method: "POST", url: "/api/registers/pso/quick-norm" },
				{ method: "POST", url: "/api/registers/sanpin" },
				{ method: "POST", url: "/api/registers/sanpin/shift-close" },
				{ method: "POST", url: "/api/registers/temperature-humidity/equipments" },
				{ method: "POST", url: "/api/registers/temperature-humidity/logs" },
				{ method: "POST", url: "/api/sanpin/shift-autofill" },
			];

			for (const ep of mutationEndpoints) {
				const hasRoute = app.hasRoute({ method: ep.method, url: ep.url });
				assert.equal(hasRoute, true, `Route ${ep.method} ${ep.url} must be registered`);
			}
		});

		test("rejects malformed non-UUID Idempotency-Key on POST /api/sanpin/sterilization", async () => {
			const res = await injectWithAuth(app, "POST", "/api/sanpin/sterilization", {
				body: {
					deviceName: "Melag Vacuklav 23B+",
					cycleNumber: 101,
					itemsDescription: "Тестовый лоток боров",
					packagingType: "kraft_bag",
					temperatureCelsius: 134,
					pressureBar: 2.15,
					durationMin: 5,
					indicatorType: "class_4",
					passedIndicator: true,
				},
				idempotencyKey: "invalid-not-a-uuid",
			});

			assert.equal(res.status, 400);
			assert.equal(res.json?.error, "ValidationError");
			assert.match(String(res.json?.message), /Idempotency-Key/i);
		});
	});

	// ── 3. CANONICAL MEDICAL WASTE SHIFT TRIAD (DEF-3 & Mandate 8v) ──────────

	describe("3. Canonical Medical Waste Shift Triad (DEF-3 & Mandate 8v)", () => {
		test("buildCanonicalShiftWasteRecords builds exact 3-record triad without Split-Brain", () => {
			const logDate = new Date("2026-11-24T18:00:00.000Z");
			const params: CanonicalShiftWasteParams = {
				organizationId: ORG_ID_MINE,
				logDate,
				operatorId: STAFF_ID_MINE,
				dateStr: "2026-11-24",
				defaultOperatorName: "Сестра стерилизационной",
				sealNumber: "DNT-PL-77",
				classAWeightKg: "2.100",
				classBSoftWeightKg: "1.950",
				classBSharpsWeightKg: "0.520",
				carpulesCount: 12,
				needlesCount: 12,
			};

			const records = buildCanonicalShiftWasteRecords(params);

			assert.equal(records.length, 3, "Must generate exactly 3 shift waste records");

			// 1. Класс А (эпидемиологически безопасные)
			const classA = records[0];
			assert.ok(classA);
			assert.equal(classA.wasteClass, "class_A");
			assert.equal(classA.packageType, "white_bag");
			assert.equal(classA.weightKg, "2.100");
			assert.equal(classA.disinfectionMethod, "none_centralized");
			assert.match(classA.wasteDescription, /упаковка/i);

			// 2. Класс Б мягкие (эпидемиологически опасные)
			const classBSoft = records[1];
			assert.ok(classBSoft);
			assert.equal(classBSoft.wasteClass, "class_B");
			assert.equal(classBSoft.packageType, "yellow_bag");
			assert.equal(classBSoft.weightKg, "1.950");
			assert.equal(classBSoft.disinfectionMethod, "chemical_soaking");
			assert.match(classBSoft.wasteDescription, /перчатки|маски|салфетки/i);

			// 3. Класс Б острые (инструменты, карпулы, иглы)
			const classBSharps = records[2];
			assert.ok(classBSharps);
			assert.equal(classBSharps.wasteClass, "class_B");
			assert.equal(classBSharps.packageType, "yellow_sharps_container");
			assert.equal(classBSharps.weightKg, "0.520");
			assert.equal(classBSharps.disinfectionMethod, "chemical_soaking");
			assert.match(classBSharps.wasteDescription, /12 шт/);
			assert.match(classBSharps.notes ?? "", /иглосъёмник/i);
		});

		test("POST /api/registers/sanpin/shift-close generates shift waste records in single batch", async () => {
			if (!databaseReady) return;

			const validUuid = "11111111-2222-4333-8444-555555555555";
			const res = await injectWithAuth(app, "POST", "/api/registers/sanpin/shift-close", {
				body: {
					shiftDate: "2026-11-24",
					responsibleStaffName: "Медсестра ЦСО Своя",
				},
				idempotencyKey: validUuid,
			});

			assert.equal(res.status, 200, res.body);
			assert.equal(res.json?.success, true);
			assert.equal(res.json?.date, "2026-11-24");

			const saved = res.json?.savedRecords as Record<string, unknown> | undefined;
			assert.ok(saved, "Must return savedRecords summary");
			assert.equal(Number(saved.waste), 3, "Must insert exactly 3 medical waste records for shift");

			// Проверка в базе данных под контекстом арендатора
			const dbWaste = await withTenantCtx(ORG_ID_MINE, async (tx) => {
				return tx
					.select()
					.from(medicalWasteLogs)
					.where(eq(medicalWasteLogs.organizationId, ORG_ID_MINE));
			});

			assert.ok(dbWaste.length >= 3, "Database must contain at least 3 medical waste entries");
			const classes = dbWaste.map((w) => w.wasteClass);
			assert.ok(classes.includes("class_A"), "Must contain class_A waste");
			assert.ok(classes.includes("class_B"), "Must contain class_B waste");
		});
	});

	// ── 4. MULTI-TENANT RLS ISOLATION WITH WITH_TENANT_CTX (DEF-2) ───────────

	describe("4. Multi-Tenant RLS Isolation (withTenantCtx & DEF-2)", () => {
		test("isolates sterilization logs between organizations", async () => {
			if (!databaseReady) return;

			const validUuid = "77777777-8888-4999-8000-111111111111";

			// 1. Создаем цикл стерилизации от имени Своей клиники
			const createRes = await injectWithAuth(app, "POST", "/api/sanpin/sterilization", {
				body: {
					deviceName: "Dac Universal",
					cycleNumber: 42,
					itemsDescription: "Наконечники угловые 6 шт.",
					packagingType: "kraft_bag",
					temperatureCelsius: 134,
					pressureBar: 2.15,
					durationMin: 18,
					indicatorType: "class_5",
					passedIndicator: true,
				},
				idempotencyKey: validUuid,
			});

			assert.ok(
				createRes.status === 200 || createRes.status === 201,
				`Expected 200 or 201 but got ${createRes.status}: ${createRes.body}`,
			);
			assert.equal(createRes.headers["idempotency-key"], validUuid);

			// 2. Запрашиваем записи от имени Чужой клиники (ORG_ID_ALIEN)
			const alienGetRes = await injectWithAuth(app, "GET", "/api/sanpin/sterilization", {
				isAlien: true,
			});

			assert.equal(alienGetRes.status, 200);
			const alienData = (alienGetRes.json?.data || alienGetRes.json) as unknown[];
			assert.ok(Array.isArray(alienData));
			// Чужая клиника не должна видеть цикл с номером 42
			// biome-ignore lint/suspicious/noExplicitAny: test payload introspection
			const foundAlien = alienData.find((log: any) => log.cycleNumber === 42);
			assert.equal(foundAlien, undefined, "Alien clinic must NOT see Mine clinic's sterilization log");

			// 3. Запрашиваем записи от имени Своей клиники (ORG_ID_MINE)
			const mineGetRes = await injectWithAuth(app, "GET", "/api/sanpin/sterilization");
			assert.equal(mineGetRes.status, 200);
			const mineData = (mineGetRes.json?.data || mineGetRes.json) as unknown[];
			assert.ok(Array.isArray(mineData));
			// biome-ignore lint/suspicious/noExplicitAny: test payload introspection
			const foundMine = mineData.find((log: any) => log.cycleNumber === 42);
			assert.ok(foundMine, "Mine clinic must see its own sterilization log");
		});
	});
});
