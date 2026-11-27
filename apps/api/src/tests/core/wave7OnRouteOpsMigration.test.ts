import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { db, pool, tenantAlsStorage } from "../../db/client.js";
import {
	clinics,
	familyGroups,
	organizations,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { registerAuthRoutes } from "../../routes/auth/index.js";
import { registerEgiszOutboxRoutes } from "../../routes/egisz/outboxRoutes.js";
import { registerFamilyGroupReadRoutes } from "../../routes/family/familyGroupReadRoutes.js";
import { registerFamilyGroupWriteRoutes } from "../../routes/family/familyGroupWriteRoutes.js";
import { registerFamilyWalletOperationsRoutes } from "../../routes/family/familyWalletOperationsRoutes.js";
import { registerFamilyWalletRoutes } from "../../routes/family/familyWalletRoutes.js";
import { registerFinancialPnlRoutes } from "../../routes/financialPnl.js";
import { registerHealthRoutes } from "../../routes/health.js";
import {
	type DbGuaranteeLetterRow,
	type DbInsuranceContractRow,
	formatGuaranteeLetterResponse,
	formatInsuranceContractResponse,
} from "../../routes/insuranceRoutes/guaranteeLetterModules/guaranteeLetterFormatters.js";
import { registerInsuranceRoutes } from "../../routes/insuranceRoutes/index.js";
import { registerDadataLandingIntegrationRoutes } from "../../routes/integrations/dadataLandingIntegrationRoutes.js";
import { registerFlexbeRoutes } from "../../routes/integrations/flexbe.js";
import { registerInvoiceRoutes } from "../../routes/invoiceRoutes/index.js";
import { registerLeadsRoutes } from "../../routes/leadsModules/index.js";
import { registerMdlpRoutes } from "../../routes/mdlp.js";
import { registerSberbankStatusRoutes } from "../../routes/sberbankRoutes/sberbankStatusRoute.js";
import { registerSettingsRoutes } from "../../routes/settings/index.js";
import { registerStaffDomainRoutes } from "../../routes/staff/index.js";
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

const NAMESPACE = "wave7OnRouteOpsMigration";
const ORG_A = fixtureUuid(NAMESPACE, 1);
const CLINIC_A = fixtureUuid(NAMESPACE, 2);
const USER_A = fixtureUuid(NAMESPACE, 3);
const PATIENT_A = fixtureUuid(NAMESPACE, 4);
const PAYMENT_A = fixtureUuid(NAMESPACE, 5);
const FAMILY_A = fixtureUuid(NAMESPACE, 6);

const ORG_B = fixtureUuid(NAMESPACE, 11);
const CLINIC_B = fixtureUuid(NAMESPACE, 12);
const USER_B = fixtureUuid(NAMESPACE, 13);
const PATIENT_B = fixtureUuid(NAMESPACE, 14);
const PAYMENT_B = fixtureUuid(NAMESPACE, 15);
const FAMILY_B = fixtureUuid(NAMESPACE, 16);

const ACTIVE_SESSION_A = randomUUID();
const ACTIVE_SESSION_B = randomUUID();
const TEST_SECRET = "wave7-ops-onroute-live-pg-secret-".padEnd(48, "m");

interface ObservedTxMode {
	sawReadOnly: boolean;
	sawReadWrite: boolean;
	txidAtReadOnlyEnd: string | null;
	readOnlyFlag: string | null;
}

describe("Wave 7 Ops/CRM/Settings OnRoute Migration: Live PG18 READ ONLY, FORCE RLS & Zero-Held-TX I/O", () => {
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
		process.env.SBERBANK_TERMINAL_TOKEN = "synthetic-sberbank-test-token";
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		resetAuthSecretCacheForTests();

		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);

			await withFixtureTenant(ORG_A, async () => {
				await db
					.insert(organizations)
					.values({
						id: ORG_A,
						name: "Клиника Альфа (Wave 7 Ops)",
						clinicMode: "small_clinic",
					})
					.onConflictDoNothing();
				await db
					.insert(clinics)
					.values({
						id: CLINIC_A,
						organizationId: ORG_A,
						name: "Филиал Альфа-Опс",
						timezone: "Europe/Moscow",
					})
					.onConflictDoNothing();
				await db
					.insert(users)
					.values({
						id: USER_A,
						organizationId: ORG_A,
						fullName: "Владелец Альфа-Опс",
						role: "owner",
						passwordHash: "synthetic-hash-ops-a",
						currentSessionId: ACTIVE_SESSION_A,
						isActive: true,
					})
					.onConflictDoUpdate({
						target: users.id,
						set: { currentSessionId: ACTIVE_SESSION_A, isActive: true },
					});
				await db
					.insert(patients)
					.values({
						id: PATIENT_A,
						organizationId: ORG_A,
						fullName: "Альфов Семейный Пациент",
						phone: "+79990003301",
					})
					.onConflictDoNothing();
				await db
					.insert(familyGroups)
					.values({
						id: FAMILY_A,
						organizationId: ORG_A,
						name: "Семья Альфа",
						groupName: "Семья Альфа",
						headPatientId: PATIENT_A,
						primaryPatientId: PATIENT_A,
						balance: "500.00",
						balanceKopecks: 50_000,
					})
					.onConflictDoNothing();
				await db
					.insert(payments)
					.values({
						id: PAYMENT_A,
						organizationId: ORG_A,
						patientId: PATIENT_A,
						amountRub: 1250,
						amountKopecks: 125_000n,
						method: "card",
						status: "paid",
						paidAt: new Date(),
					})
					.onConflictDoUpdate({
						target: payments.id,
						set: { amountRub: 1250, amountKopecks: 125_000n, status: "paid" },
					});
			});

			await withFixtureTenant(ORG_B, async () => {
				await db
					.insert(organizations)
					.values({
						id: ORG_B,
						name: "Клиника Бета (Wave 7 Ops)",
						clinicMode: "small_clinic",
					})
					.onConflictDoNothing();
				await db
					.insert(clinics)
					.values({
						id: CLINIC_B,
						organizationId: ORG_B,
						name: "Филиал Бета-Опс",
						timezone: "Europe/Moscow",
					})
					.onConflictDoNothing();
				await db
					.insert(users)
					.values({
						id: USER_B,
						organizationId: ORG_B,
						fullName: "Владелец Бета-Опс",
						role: "owner",
						passwordHash: "synthetic-hash-ops-b",
						currentSessionId: ACTIVE_SESSION_B,
						isActive: true,
					})
					.onConflictDoUpdate({
						target: users.id,
						set: { currentSessionId: ACTIVE_SESSION_B, isActive: true },
					});
				await db
					.insert(patients)
					.values({
						id: PATIENT_B,
						organizationId: ORG_B,
						fullName: "Бетов Семейный Пациент",
						phone: "+79990004402",
					})
					.onConflictDoNothing();
				await db
					.insert(familyGroups)
					.values({
						id: FAMILY_B,
						organizationId: ORG_B,
						name: "Семья Бета",
						groupName: "Семья Бета",
						headPatientId: PATIENT_B,
						primaryPatientId: PATIENT_B,
						balance: "900.00",
						balanceKopecks: 90_000,
					})
					.onConflictDoNothing();
				await db
					.insert(payments)
					.values({
						id: PAYMENT_B,
						organizationId: ORG_B,
						patientId: PATIENT_B,
						amountRub: 987,
						amountKopecks: 98_700n,
						method: "cash",
						status: "paid",
						paidAt: new Date(),
					})
					.onConflictDoUpdate({
						target: payments.id,
						set: { amountRub: 987, amountKopecks: 98_700n, status: "paid" },
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
				fullName: "Владелец Альфа-Опс",
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
				fullName: "Владелец Альфа-Опс",
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
				fullName: "Владелец Бета-Опс",
				sessionId: ACTIVE_SESSION_B,
			},
			TEST_SECRET,
			3600,
		);

		app = Fastify({ logger: false });
		registerLifecycleHooks(app);
		app.addHook("onRoute", (routeOptions) => {
			const methods = Array.isArray(routeOptions.method)
				? routeOptions.method
				: [routeOptions.method];
			for (const m of methods) {
				recordedRouteConfigs.set(
					`${String(m).toUpperCase()} ${routeOptions.url}`,
					routeOptions.config?.tenantTxSelfManaged === true,
				);
			}
		});

		await registerHealthRoutes(app);
		await registerAuthRoutes(app);
		await registerSettingsRoutes(app);
		await registerStaffDomainRoutes(app);
		await registerInvoiceRoutes(app);
		await registerFinancialPnlRoutes(app);
		await registerMdlpRoutes(app);
		registerEgiszOutboxRoutes(app);
		await registerLeadsRoutes(app);
		registerFamilyGroupReadRoutes(app);
		registerFamilyGroupWriteRoutes(app);
		registerFamilyWalletRoutes(app);
		registerFamilyWalletOperationsRoutes(app);
		await registerDadataLandingIntegrationRoutes(app);
		await registerFlexbeRoutes(app);
		await registerSberbankStatusRoutes(app);
		await registerInsuranceRoutes(app);
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

	test("1. All migrated Ops/Settings/CRM/Auth/Integrations routes mark tenantTxSelfManaged: true", () => {
		const expectedSelfManaged = [
			"GET /api/health",
			"POST /api/auth/login",
			"GET /api/settings/chairs",
			"GET /api/branches",
			"GET /api/staff/extended",
			"GET /api/invoices",
			"GET /api/reports/pnl",
			"GET /api/mdlp/items",
			"GET /api/egisz/outbox",
			"GET /api/leads/pipeline-metrics",
			"GET /api/finance/family",
			"GET /api/integrations/dadata-addresses",
			"POST /api/integrations/flexbe/webhook",
			"GET /api/sberbank/status/:orderId",
			"GET /api/insurance/registry",
		];
		for (const key of expectedSelfManaged) {
			assert.equal(
				recordedRouteConfigs.get(key),
				true,
				`Route "${key}" must be self-managed (tenantTxSelfManaged: true)`,
			);
		}
	});

	test("2. Migrated Ops/Settings/CRM GET routes run PG18 READ ONLY (txid IS NULL) and enforce FORCE RLS", async (t) => {
		if (!databaseAvailable) return t.skip("PostgreSQL 18 недоступен");

		const observePoolQueries = async (runRequest: () => Promise<void>): Promise<ObservedTxMode> => {
			const observed: ObservedTxMode = {
				sawReadOnly: false,
				sawReadWrite: false,
				txidAtReadOnlyEnd: null,
				readOnlyFlag: null,
			};
			const originalConnect = pool.connect.bind(pool);
			const wrappedClients = new WeakSet<object>();

			const patchedConnect = (async (...args: unknown[]) => {
				const client = await (originalConnect as (...a: unknown[]) => Promise<{
					query: (...qArgs: unknown[]) => Promise<unknown>;
					release: (...rArgs: unknown[]) => void;
				}>)(...args);
				if (wrappedClients.has(client)) return client;
				wrappedClients.add(client);

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

					if (/\b(?:begin|set\s+transaction)\b.*\bread\s+only\b/i.test(sqlText)) {
						observed.sawReadOnly = true;
						inReadOnlyTx = true;
					} else if (
						/\b(?:begin|set\s+transaction)\b.*\bread\s+write\b/i.test(sqlText) ||
						(/^\s*begin\b/i.test(sqlText) && !/\bread\s+only\b/i.test(sqlText))
					) {
						observed.sawReadWrite = true;
					} else if (/^\s*commit\s*$/i.test(sqlText) && inReadOnlyTx) {
						inReadOnlyTx = false;
						if (!capturedEndState) {
							capturedEndState = true;
							const probe = (await origQuery(
								"SELECT txid_current_if_assigned()::text AS txid, current_setting('transaction_read_only') AS ro",
							)) as { rows: Array<{ txid: string | null; ro: string }> };
							observed.txidAtReadOnlyEnd = probe.rows[0]?.txid ?? null;
							observed.readOnlyFlag = probe.rows[0]?.ro ?? null;
						}
					} else if (/^\s*rollback\s*$/i.test(sqlText)) {
						inReadOnlyTx = false;
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

		// A. GET /api/branches — READ ONLY + FORCE RLS isolation
		const branchesTx = await observePoolQueries(async () => {
			const resA = await app.inject({ method: "GET", url: "/api/branches", headers: headersA });
			assert.equal(resA.statusCode, 200, resA.body);
			const bodyA = resA.json() as { data: Array<{ id: string }> };
			assert.ok(bodyA.data.some((b) => b.id === CLINIC_A), "ORG_A must see CLINIC_A");
			assert.ok(!bodyA.data.some((b) => b.id === CLINIC_B), "ORG_A must NOT see CLINIC_B");

			const resB = await app.inject({ method: "GET", url: "/api/branches", headers: headersB });
			assert.equal(resB.statusCode, 200, resB.body);
			const bodyB = resB.json() as { data: Array<{ id: string }> };
			assert.ok(bodyB.data.some((b) => b.id === CLINIC_B), "ORG_B must see CLINIC_B");
			assert.ok(!bodyB.data.some((b) => b.id === CLINIC_A), "ORG_B must NOT see CLINIC_A");
		});
		assert.equal(branchesTx.sawReadOnly, true, "GET /api/branches must use READ ONLY TX");
		assert.equal(branchesTx.sawReadWrite, false, "GET /api/branches must NOT use READ WRITE TX");
		assert.equal(branchesTx.readOnlyFlag, "on");
		assert.equal(branchesTx.txidAtReadOnlyEnd, null);

		// B. GET /api/staff/extended — READ ONLY + FORCE RLS isolation
		const staffTx = await observePoolQueries(async () => {
			const resA = await app.inject({ method: "GET", url: "/api/staff/extended", headers: headersA });
			assert.equal(resA.statusCode, 200, resA.body);
			const listA = resA.json() as Array<{ id: string }>;
			assert.ok(listA.some((u) => u.id === USER_A), "ORG_A must see USER_A");
			assert.ok(!listA.some((u) => u.id === USER_B), "ORG_A must NOT see USER_B");
		});
		assert.equal(staffTx.sawReadOnly, true, "GET /api/staff/extended must use READ ONLY TX");
		assert.equal(staffTx.sawReadWrite, false);
		assert.equal(staffTx.txidAtReadOnlyEnd, null);

		// C. GET /api/reports/pnl — READ ONLY + FORCE RLS isolation on revenue
		const pnlTx = await observePoolQueries(async () => {
			const resA = await app.inject({ method: "GET", url: "/api/reports/pnl", headers: headersA });
			assert.equal(resA.statusCode, 200, resA.body);
			const bodyA = resA.json() as { data: { grossRevenueRub: number } };
			assert.equal(bodyA.data.grossRevenueRub, 1250);

			const resB = await app.inject({ method: "GET", url: "/api/reports/pnl", headers: headersB });
			assert.equal(resB.statusCode, 200, resB.body);
			const bodyB = resB.json() as { data: { grossRevenueRub: number } };
			assert.equal(bodyB.data.grossRevenueRub, 987);
		});
		assert.equal(pnlTx.sawReadOnly, true, "GET /api/reports/pnl must use READ ONLY TX");
		assert.equal(pnlTx.sawReadWrite, false);
		assert.equal(pnlTx.txidAtReadOnlyEnd, null);

		// D. GET /api/finance/family — READ ONLY + FORCE RLS isolation
		const familyTx = await observePoolQueries(async () => {
			const resA = await app.inject({ method: "GET", url: "/api/finance/family", headers: headersA });
			assert.equal(resA.statusCode, 200, resA.body);
			const bodyA = resA.json() as { data: Array<{ id: string }> };
			assert.ok(bodyA.data.some((f) => f.id === FAMILY_A), "ORG_A must see FAMILY_A");
			assert.ok(!bodyA.data.some((f) => f.id === FAMILY_B), "ORG_A must NOT see FAMILY_B");

			const resB = await app.inject({ method: "GET", url: "/api/finance/family", headers: headersB });
			assert.equal(resB.statusCode, 200, resB.body);
			const bodyB = resB.json() as { data: Array<{ id: string }> };
			assert.ok(bodyB.data.some((f) => f.id === FAMILY_B), "ORG_B must see FAMILY_B");
			assert.ok(!bodyB.data.some((f) => f.id === FAMILY_A), "ORG_B must NOT see FAMILY_A");
		});
		assert.equal(familyTx.sawReadOnly, true, "GET /api/finance/family must use READ ONLY TX");
		assert.equal(familyTx.sawReadWrite, false);
		assert.equal(familyTx.txidAtReadOnlyEnd, null);

		// E. GET /api/egisz/outbox, /api/leads/pipeline-metrics, /api/invoices — pure READ ONLY
		for (const url of [
			"/api/egisz/outbox",
			"/api/leads/pipeline-metrics",
			"/api/invoices",
		]) {
			const txRes = await observePoolQueries(async () => {
				const res = await app.inject({ method: "GET", url, headers: headersA });
				assert.equal(res.statusCode, 200, `${url}: ${res.body}`);
			});
			assert.equal(txRes.sawReadOnly, true, `${url} must use READ ONLY TX`);
			assert.equal(txRes.sawReadWrite, false, `${url} must NOT use READ WRITE TX`);
			assert.equal(txRes.txidAtReadOnlyEnd, null);
		}
	});

	test("3. Revoked staff sessionId is rejected with 401 across migrated Ops/Settings/CRM routes", async (t) => {
		if (!databaseAvailable) return t.skip("PostgreSQL 18 недоступен");

		const revokedHeaders = {
			[CLINIC_TOKEN_HEADER]: clinicTokenA,
			[STAFF_TOKEN_HEADER]: revokedStaffTokenA,
		};

		for (const url of [
			"/api/settings/chairs",
			"/api/branches",
			"/api/staff/extended",
			"/api/invoices",
			"/api/reports/pnl",
			"/api/leads/pipeline-metrics",
			"/api/finance/family",
			"/api/insurance/registry",
		]) {
			const res = await app.inject({ method: "GET", url, headers: revokedHeaders });
			assert.equal(res.statusCode, 401, `${url} must reject revoked sessionId with 401`);
		}
	});

	test("4. External fetch() in Sberbank gateway & /api/health hold ZERO PG TX / pool connections", async (t) => {
		if (!databaseAvailable) return t.skip("PostgreSQL 18 недоступен");

		const originalFetch = globalThis.fetch;
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

			return new Response(
				JSON.stringify({
					errorCode: "0",
					orderStatus: 2,
					orderNumber: "order-wave7-test",
					amount: 125000,
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			);
		}) as typeof fetch;

		const headersA = {
			[CLINIC_TOKEN_HEADER]: clinicTokenA,
			[STAFF_TOKEN_HEADER]: staffTokenA,
		};

		try {
			const healthRes = await app.inject({ method: "GET", url: "/api/health" });
			assert.equal(healthRes.statusCode, 200);
			assert.equal(tenantAlsStorage.getStore(), undefined);
			assert.equal(pool.totalCount - pool.idleCount, 0);

			const sberRes = await app.inject({
				method: "GET",
				url: "/api/sberbank/status/order-wave7-test",
				headers: headersA,
			});
			assert.equal(sberRes.statusCode, 404, sberRes.body);
			assert.equal(tenantAlsStorage.getStore(), undefined);
			assert.equal(pool.totalCount - pool.idleCount, 0);

			assert.ok(
				fetchSnapshots.some((s) => s.url.includes("getOrderStatusExtended.do")),
				"Expected GET /api/sberbank/status/:orderId to invoke external fetch()",
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
		}
	});

	test("5. guaranteeLetterFormatters prioritizes BIGINT *Kopecks over stale legacy *Rub columns", () => {
		const contractRow: DbInsuranceContractRow = {
			id: randomUUID(),
			organizationId: ORG_A,
			companyName: "СОГАЗ ДМС Тест",
			policyNumberMask: null,
			coverageTherapyPct: 80,
			coverageSurgeryPct: 70,
			coverageOrthoPct: 0,
			coverageHygienePct: 100,
			annualLimitRub: 9999,
			annualLimitKopecks: 500_000n,
			patientFranchisePct: 10,
			requiresGuaranteeLetter: true,
			isActive: true,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
		};

		const formattedContract = formatInsuranceContractResponse(contractRow);
		assert.equal(formattedContract.annualLimitKopecks, 500_000);
		assert.equal(formattedContract.annualLimitRub, 5000);

		const letterRow: DbGuaranteeLetterRow = {
			id: randomUUID(),
			organizationId: ORG_A,
			contractId: contractRow.id,
			patientId: PATIENT_A,
			patientFullName: "Пациент ДМС",
			patientBirthDate: null,
			policyNumber: "POL-12345",
			insurerKey: "sogaz",
			insurerName: "СОГАЗ",
			letterNumber: "GP-001",
			issueDate: "2026-01-01",
			validFrom: "2026-01-01",
			validUntil: "2099-12-31",
			maxCoverageRub: 99999,
			maxCoverageKopecks: 1_000_000n,
			usedAmountRub: 8888,
			usedAmountKopecks: 250_000n,
			franchisePct: 0,
			franchiseType: "fixed_rub",
			franchiseFixedRub: 777,
			franchiseFixedKopecks: 150_000n,
			programExclusions: [],
			approvedServiceCodes: [],
			approvedTeethFdi: [],
			approvedDiagnosisCodes: [],
			curatorFullName: null,
			curatorPhone: null,
			notes: "",
			status: "active",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		};

		const formattedLetter = formatGuaranteeLetterResponse(letterRow, "2026-06-01");
		assert.equal(formattedLetter.maxCoverageKopecks, 1_000_000);
		assert.equal(formattedLetter.maxCoverageRub, 10_000);
		assert.equal(formattedLetter.usedAmountKopecks, 250_000);
		assert.equal(formattedLetter.usedAmountRub, 2500);
		assert.equal(formattedLetter.remainingLimitKopecks, 750_000);
		assert.equal(formattedLetter.franchiseFixedKopecks, 150_000);
		assert.equal(formattedLetter.franchiseFixedRub, 1500);
	});
});
