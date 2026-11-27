import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db, pool, tenantAlsStorage } from "../../db/client.js";
import { clinics, organizations, patients, payments, users } from "../../db/schema.js";
import { registerAnalyticsRoutes } from "../../routes/analytics/index.js";
import { registerBillingRoutes } from "../../routes/billingRoutes/index.js";
import { registerHardwareRoutes } from "../../routes/hardware.js";
import { registerMobileOtaRoutes } from "../../routes/mobileOta.js";
import { registerPatientRoutes } from "../../routes/patients/index.js";
import { registerReportRoutes } from "../../routes/reports.js";
import { registerSystemRoutes } from "../../routes/systemRoutes/index.js";
import { registerTelegramRoutes } from "../../routes/telegram/index.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { registerLifecycleHooks } from "../../serverModules/lifecycleHooks.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "wave6ApiRoutes13Migration";
const ORG_A = fixtureUuid(NAMESPACE, 1);
const CLINIC_A = fixtureUuid(NAMESPACE, 2);
const USER_A = fixtureUuid(NAMESPACE, 3);
const PATIENT_A = fixtureUuid(NAMESPACE, 4);
const PAYMENT_A = fixtureUuid(NAMESPACE, 5);

const ORG_B = fixtureUuid(NAMESPACE, 11);
const CLINIC_B = fixtureUuid(NAMESPACE, 12);
const USER_B = fixtureUuid(NAMESPACE, 13);
const PATIENT_B = fixtureUuid(NAMESPACE, 14);
const PAYMENT_B = fixtureUuid(NAMESPACE, 15);

const ACTIVE_SESSION_A = randomUUID();
const ACTIVE_SESSION_B = randomUUID();
const TEST_SECRET = "wave6-api-routes-13-live-pg-secret-".padEnd(48, "k");

interface ObservedTxMode {
	sawReadOnly: boolean;
	sawReadWrite: boolean;
	txidAtReadOnlyEnd: string | null;
	readOnlyFlag: string | null;
}

describe("Wave 6-ApiRoutes-1.3: Live PG18 READ ONLY, FORCE RLS & Zero-Held-TX I/O Verification", () => {
	const originalEnv = { ...process.env };
	const recordedRouteConfigs = new Map<string, boolean>();
	let app: FastifyInstance;
	let databaseAvailable = true;

	let clinicTokenA = "";
	let staffTokenA = "";
	let clinicTokenB = "";
	let staffTokenB = "";
	let revokedStaffTokenA = "";

	before(async () => {
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "0";
		process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE = "1";
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		resetAuthSecretCacheForTests();

		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);

			await withFixtureTenant(ORG_A, async () => {
				await db.insert(organizations).values({
					id: ORG_A,
					name: "Клиника Альфа (Wave 6 Тест)",
					clinicMode: "solo_doctor",
				});
				await db.insert(clinics).values({
					id: CLINIC_A,
					organizationId: ORG_A,
					name: "Филиал Альфа",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: USER_A,
					organizationId: ORG_A,
					login: "wave6-owner-a",
					fullName: "Владелец Клиники Альфа",
					role: "owner",
					passwordHash: "synthetic-hash-a",
					currentSessionId: ACTIVE_SESSION_A,
					isActive: true,
				});
				await db.insert(patients).values({
					id: PATIENT_A,
					organizationId: ORG_A,
					fullName: "Альфов Изолированный Пациент",
					phone: "+79990001101",
				});
				await db.insert(payments).values({
					id: PAYMENT_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					amountRub: "1250.00",
					amountKopecks: 125_000n,
					method: "card",
					status: "paid",
					paidAt: new Date(),
				});
			});

			await withFixtureTenant(ORG_B, async () => {
				await db.insert(organizations).values({
					id: ORG_B,
					name: "Клиника Бета (Wave 6 Тест)",
					clinicMode: "solo_doctor",
				});
				await db.insert(clinics).values({
					id: CLINIC_B,
					organizationId: ORG_B,
					name: "Филиал Бета",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: USER_B,
					organizationId: ORG_B,
					login: "wave6-owner-b",
					fullName: "Владелец Клиники Бета",
					role: "owner",
					passwordHash: "synthetic-hash-b",
					currentSessionId: ACTIVE_SESSION_B,
					isActive: true,
				});
				await db.insert(patients).values({
					id: PATIENT_B,
					organizationId: ORG_B,
					fullName: "Бетов Соседний Пациент",
					phone: "+79990002202",
				});
				await db.insert(payments).values({
					id: PAYMENT_B,
					organizationId: ORG_B,
					patientId: PATIENT_B,
					amountRub: "987.00",
					amountKopecks: 98_700n,
					method: "cash",
					status: "paid",
					paidAt: new Date(),
				});
			});
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				databaseAvailable = false;
			} else {
				throw error;
			}
		}

		clinicTokenA = signToken({ organizationId: ORG_A, role: "clinic" }, TEST_SECRET, 3600);
		staffTokenA = signToken(
			{
				userId: USER_A,
				organizationId: ORG_A,
				role: "owner",
				fullName: "Владелец Клиники Альфа",
				sessionId: ACTIVE_SESSION_A,
			},
			TEST_SECRET,
			3600,
		);
		revokedStaffTokenA = signToken(
			{
				userId: USER_A,
				organizationId: ORG_A,
				role: "owner",
				fullName: "Владелец Клиники Альфа",
				sessionId: randomUUID(),
			},
			TEST_SECRET,
			3600,
		);

		clinicTokenB = signToken({ organizationId: ORG_B, role: "clinic" }, TEST_SECRET, 3600);
		staffTokenB = signToken(
			{
				userId: USER_B,
				organizationId: ORG_B,
				role: "owner",
				fullName: "Владелец Клиники Бета",
				sessionId: ACTIVE_SESSION_B,
			},
			TEST_SECRET,
			3600,
		);

		app = Fastify({ logger: false });
		registerLifecycleHooks(app, { getAllowedCorsOrigins: () => [] });
		app.addHook("onRoute", (routeOptions) => {
			recordedRouteConfigs.set(
				`${String(routeOptions.method).toUpperCase()} ${routeOptions.url}`,
				routeOptions.config?.tenantTxSelfManaged === true,
			);
		});

		await registerSystemRoutes(app);
		await registerTelegramRoutes(app);
		await registerMobileOtaRoutes(app);
		await registerHardwareRoutes(app);
		await registerPatientRoutes(app);
		await registerBillingRoutes(app);
		await registerAnalyticsRoutes(app);
		await registerReportRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		}
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	test("1. All migrated P1/P2 endpoints mark tenantTxSelfManaged: true so global onRoute skips outer TX", () => {
		const expectedSelfManaged = [
			"GET /api/system/local-bridges/readiness",
			"GET /api/system/local-bridges/use-plans",
			"GET /api/system/persistence/verify",
			"GET /api/system/single-session-enforcements",
			"GET /api/mobile/bundle.zip",
			"GET /api/mobile/version.json",
			"GET /api/hardware/devices",
			"POST /api/telegram/bot/test",
			"GET /api/telegram/bot/status",
			"GET /api/patients",
			"GET /api/patients/:patientId/portal",
			"GET /api/billing/payments",
			"GET /api/payments",
			"GET /api/analytics/dashboard",
			"GET /api/reports/revenue",
		];
		for (const key of expectedSelfManaged) {
			assert.equal(
				recordedRouteConfigs.get(key),
				true,
				`Route "${key}" must be self-managed (tenantTxSelfManaged: true)`,
			);
		}
	});

	test("2. Migrated GET routes run PG18 READ ONLY (txid_current_if_assigned() IS NULL) and enforce FORCE RLS isolation", async (t) => {
		if (!databaseAvailable) return t.skip("PostgreSQL 18 недоступен");

		const observePoolQueries = async (runRequest: () => Promise<void>): Promise<ObservedTxMode> => {
			const observed: ObservedTxMode = {
				sawReadOnly: false,
				sawReadWrite: false,
				txidAtReadOnlyEnd: null,
				readOnlyFlag: null,
			};
			const originalConnect = pool.connect.bind(pool);
			let wrapped = false;

			const patchedConnect = (async (...args: unknown[]) => {
				const client = await (originalConnect as (...a: unknown[]) => Promise<{
					query: (...qArgs: unknown[]) => Promise<unknown>;
					release: (...rArgs: unknown[]) => void;
				}>)(...args);
				if (wrapped) return client;
				wrapped = true;

				const origQuery = client.query.bind(client);
				let inReadOnlyTx = false;
				let capturedEndState = false;

				client.query = (async (...qArgs: unknown[]) => {
					const first = qArgs[0];
					const sqlText =
						typeof first === "string"
							? first
							: typeof first === "object" && first !== null && "text" in first
								? String((first as { text: unknown }).text)
								: "";

					if (/SET TRANSACTION READ ONLY/i.test(sqlText)) {
						observed.sawReadOnly = true;
						inReadOnlyTx = true;
					} else if (/SET TRANSACTION READ WRITE/i.test(sqlText)) {
						observed.sawReadWrite = true;
					} else if (/^\s*COMMIT\s*$/i.test(sqlText) && inReadOnlyTx && !capturedEndState) {
						capturedEndState = true;
						const probe = (await origQuery(
							"SELECT txid_current_if_assigned()::text AS txid, current_setting('transaction_read_only') AS ro",
						)) as { rows: Array<{ txid: string | null; ro: string }> };
						observed.txidAtReadOnlyEnd = probe.rows[0]?.txid ?? null;
						observed.readOnlyFlag = probe.rows[0]?.ro ?? null;
					}
					return origQuery(...qArgs);
				}) as typeof client.query;

				return client;
			}) as typeof pool.connect;

			pool.connect = patchedConnect;
			try {
				await runRequest();
			} finally {
				pool.connect = originalConnect;
			}
			return observed;
		};

		const headersA = {
			[CLINIC_TOKEN_HEADER]: clinicTokenA,
			[STAFF_TOKEN_HEADER]: staffTokenA,
		};
		const headersB = {
			[CLINIC_TOKEN_HEADER]: clinicTokenB,
			[STAFF_TOKEN_HEADER]: staffTokenB,
		};

		// A. GET /api/patients — READ ONLY + FORCE RLS isolation
		const patientsTx = await observePoolQueries(async () => {
			const resA = await app.inject({ method: "GET", url: "/api/patients", headers: headersA });
			assert.equal(resA.statusCode, 200, resA.body);
			const listA = resA.json() as Array<{ id: string; fullName: string }>;
			assert.ok(listA.some((p) => p.id === PATIENT_A), "ORG_A must see PATIENT_A");
			assert.ok(!listA.some((p) => p.id === PATIENT_B), "ORG_A must NOT see PATIENT_B");

			const resB = await app.inject({ method: "GET", url: "/api/patients", headers: headersB });
			assert.equal(resB.statusCode, 200, resB.body);
			const listB = resB.json() as Array<{ id: string }>;
			assert.ok(listB.some((p) => p.id === PATIENT_B), "ORG_B must see PATIENT_B");
			assert.ok(!listB.some((p) => p.id === PATIENT_A), "ORG_B must NOT see PATIENT_A");
		});
		assert.equal(patientsTx.sawReadOnly, true, "GET /api/patients must use READ ONLY TX");
		assert.equal(patientsTx.sawReadWrite, false, "GET /api/patients must NOT use READ WRITE TX for reads");
		assert.equal(patientsTx.readOnlyFlag, "on");
		assert.equal(patientsTx.txidAtReadOnlyEnd, null);

		// B. GET /api/billing/payments — READ ONLY + FORCE RLS isolation
		const paymentsTx = await observePoolQueries(async () => {
			const resA = await app.inject({ method: "GET", url: "/api/billing/payments", headers: headersA });
			assert.equal(resA.statusCode, 200, resA.body);
			const bodyA = resA.json() as { data: Array<{ id: string; amountKopecks: number }> };
			assert.ok(bodyA.data.some((p) => p.id === PAYMENT_A && p.amountKopecks === 125_000));
			assert.ok(!bodyA.data.some((p) => p.id === PAYMENT_B));

			const resB = await app.inject({ method: "GET", url: "/api/billing/payments", headers: headersB });
			assert.equal(resB.statusCode, 200, resB.body);
			const bodyB = resB.json() as { data: Array<{ id: string; amountKopecks: number }> };
			assert.ok(bodyB.data.some((p) => p.id === PAYMENT_B && p.amountKopecks === 98_700));
			assert.ok(!bodyB.data.some((p) => p.id === PAYMENT_A));
		});
		assert.equal(paymentsTx.sawReadOnly, true, "GET /api/billing/payments must use READ ONLY TX");
		assert.equal(paymentsTx.sawReadWrite, false);
		assert.equal(paymentsTx.txidAtReadOnlyEnd, null);

		// C. GET /api/analytics/dashboard — READ ONLY + FORCE RLS isolation
		const dashboardTx = await observePoolQueries(async () => {
			const resA = await app.inject({ method: "GET", url: "/api/analytics/dashboard", headers: headersA });
			assert.equal(resA.statusCode, 200, resA.body);
			const bodyA = resA.json() as { data: { kpis: { totalRevenueKopecks: number } } };
			assert.equal(bodyA.data.kpis.totalRevenueKopecks, 125_000);

			const resB = await app.inject({ method: "GET", url: "/api/analytics/dashboard", headers: headersB });
			assert.equal(resB.statusCode, 200, resB.body);
			const bodyB = resB.json() as { data: { kpis: { totalRevenueKopecks: number } } };
			assert.equal(bodyB.data.kpis.totalRevenueKopecks, 98_700);
		});
		assert.equal(dashboardTx.sawReadOnly, true, "GET /api/analytics/dashboard must use READ ONLY TX");
		assert.equal(dashboardTx.sawReadWrite, false);
		assert.equal(dashboardTx.txidAtReadOnlyEnd, null);

		// D. GET /api/reports/revenue — READ ONLY + FORCE RLS isolation
		const revenueTx = await observePoolQueries(async () => {
			const resA = await app.inject({ method: "GET", url: "/api/reports/revenue", headers: headersA });
			assert.equal(resA.statusCode, 200, resA.body);
			const bodyA = resA.json() as { totalRub: number };
			assert.equal(bodyA.totalRub, 1250);

			const resB = await app.inject({ method: "GET", url: "/api/reports/revenue", headers: headersB });
			assert.equal(resB.statusCode, 200, resB.body);
			const bodyB = resB.json() as { totalRub: number };
			assert.equal(bodyB.totalRub, 987);
		});
		assert.equal(revenueTx.sawReadOnly, true, "GET /api/reports/revenue must use READ ONLY TX");
		assert.equal(revenueTx.sawReadWrite, false);
		assert.equal(revenueTx.txidAtReadOnlyEnd, null);
	});

	test("3. Revoked staff sessionId is rejected with 401 across migrated routes", async (t) => {
		if (!databaseAvailable) return t.skip("PostgreSQL 18 недоступен");

		const revokedHeaders = {
			[CLINIC_TOKEN_HEADER]: clinicTokenA,
			[STAFF_TOKEN_HEADER]: revokedStaffTokenA,
		};

		for (const url of [
			"/api/billing/payments",
			"/api/analytics/dashboard",
			"/api/reports/revenue",
			"/api/system/local-bridges/readiness",
		]) {
			const res = await app.inject({ method: "GET", url, headers: revokedHeaders });
			assert.equal(res.statusCode, 401, `${url} must reject revoked sessionId with 401`);
		}
	});

	test("4. External fetch(), TCP/hardware probe & FS bundle stream hold ZERO PG TX / pool connections", async (t) => {
		if (!databaseAvailable) return t.skip("PostgreSQL 18 недоступен");

		const originalFetch = globalThis.fetch;
		const previousWhisperUrl = process.env.DENTAL_LOCAL_WHISPER_HEALTH_URL;
		process.env.DENTAL_LOCAL_WHISPER_HEALTH_URL = "http://127.0.0.1:18999/health";

		const fetchSnapshots: Array<{
			url: string;
			alsStoreDefined: boolean;
			checkedOutConnections: number;
		}> = [];

		globalThis.fetch = (async (input: string | URL | Request) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
			fetchSnapshots.push({
				url,
				alsStoreDefined: tenantAlsStorage.getStore() !== undefined,
				checkedOutConnections: Math.max(0, pool.totalCount - pool.idleCount),
			});

			if (url.includes("api.telegram.org")) {
				return new Response(
					JSON.stringify({ ok: true, result: { id: 42, is_bot: true, username: "dente_test_bot", first_name: "DenteTest" } }),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			return new Response(JSON.stringify({ status: "ok" }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch;

		const headersA = {
			[CLINIC_TOKEN_HEADER]: clinicTokenA,
			[STAFF_TOKEN_HEADER]: staffTokenA,
		};

		try {
			const readinessRes = await app.inject({
				method: "GET",
				url: "/api/system/local-bridges/readiness",
				headers: headersA,
			});
			assert.equal(readinessRes.statusCode, 200, readinessRes.body);

			const tgTestRes = await app.inject({
				method: "POST",
				url: "/api/telegram/bot/test",
				headers: headersA,
				payload: { token: "123456:SYNTHETIC_TELEGRAM_TEST_TOKEN" },
			});
			assert.equal(tgTestRes.statusCode, 200, tgTestRes.body);

			const otaRes = await app.inject({
				method: "GET",
				url: "/api/mobile/bundle.zip",
				headers: headersA,
			});
			assert.equal(otaRes.statusCode, 200);
			assert.equal(tenantAlsStorage.getStore(), undefined);
			assert.equal(pool.totalCount - pool.idleCount, 0);

			const hwRes = await app.inject({
				method: "GET",
				url: "/api/hardware/devices?probeNetwork=false",
				headers: headersA,
			});
			assert.equal(hwRes.statusCode, 200);
			assert.equal(tenantAlsStorage.getStore(), undefined);
			assert.equal(pool.totalCount - pool.idleCount, 0);

			assert.ok(
				fetchSnapshots.some((s) => s.url.includes("18999/health")),
				"Expected local bridge readiness probe to call fetch()",
			);
			assert.ok(
				fetchSnapshots.some((s) => s.url.includes("api.telegram.org")),
				"Expected telegram bot/test to call fetch()",
			);
			for (const snap of fetchSnapshots) {
				assert.equal(
					snap.alsStoreDefined,
					false,
					`PG transaction ALS must NOT be open during fetch(${snap.url})`,
				);
				assert.equal(
					snap.checkedOutConnections,
					0,
					`PG pool must have 0 checked-out connections during fetch(${snap.url})`,
				);
			}
		} finally {
			globalThis.fetch = originalFetch;
			if (previousWhisperUrl === undefined) {
				delete process.env.DENTAL_LOCAL_WHISPER_HEALTH_URL;
			} else {
				process.env.DENTAL_LOCAL_WHISPER_HEALTH_URL = previousWhisperUrl;
			}
		}
	});
});
