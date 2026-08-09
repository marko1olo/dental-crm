/**
 * СТОРОЖ ТЕЛА ДОГОВОРОВ ДМС.
 *
 * Раньше маршруты читали тело через bare destructure:
 *   const { companyName, … } = request.body
 * При null/undefined body (POST/PUT без JSON) TypeError → 500.
 * Zod safeParse после auth-first → 400 CompanyNameRequired с прежним message.
 *
 * Проверки: POST auth-first 401; POST null/{} → 400≠500 CompanyNameRequired;
 * PUT null body → 400≠500 CompanyNameRequired (договор-фикстура есть).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { insuranceContracts, organizations, users } from "../../db/schema.js";
import { registerInsuranceRoutes } from "../../routes/insurance.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "insuranceBody";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const CONTRACT_ID = fixtureUuid(NAMESPACE, 3);

describe("ДМС договоры — Zod body (null → 400, не 500)", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	async function postContract(
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
			withAuth?: boolean;
		} = {},
	) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (opts.withAuth !== false) {
			headers["x-dente-staff-token"] = staffToken;
		}
		const injectOpts: {
			method: "POST";
			url: string;
			headers: Record<string, string>;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			payload?: any;
		} = {
			method: "POST",
			url: "/api/insurance/contracts",
			headers,
		};
		if (opts.rawPayload !== undefined) {
			if (opts.rawPayload !== null) injectOpts.payload = opts.rawPayload;
		} else if (opts.body !== undefined) {
			injectOpts.payload = opts.body;
		}
		const response = await app.inject(injectOpts);
		let json: Record<string, unknown> = {};
		try {
			json = JSON.parse(response.body) as Record<string, unknown>;
		} catch {
			json = {};
		}
		return {
			statusCode: response.statusCode,
			json,
			body: String(response.body || ""),
		};
	}

	async function putContract(
		contractId: string,
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
			withAuth?: boolean;
		} = {},
	) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (opts.withAuth !== false) {
			headers["x-dente-staff-token"] = staffToken;
		}
		const injectOpts: {
			method: "PUT";
			url: string;
			headers: Record<string, string>;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			payload?: any;
		} = {
			method: "PUT",
			url: `/api/insurance/contracts/${contractId}`,
			headers,
		};
		if (opts.rawPayload !== undefined) {
			if (opts.rawPayload !== null) injectOpts.payload = opts.rawPayload;
		} else if (opts.body !== undefined) {
			injectOpts.payload = opts.body;
		}
		const response = await app.inject(injectOpts);
		let json: Record<string, unknown> = {};
		try {
			json = JSON.parse(response.body) as Record<string, unknown>;
		} catch {
			json = {};
		}
		return {
			statusCode: response.statusCode,
			json,
			body: String(response.body || ""),
		};
	}

	before(async () => {
		process.env.NODE_ENV = "test";

		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
		}

		if (databaseReady) {
			/*
			 * Сев под тенант-контекстом: у `users` и `insurance_contracts` в WITH CHECK
			 * стоит только `organization_id = current_tenant`, без дизъюнкта обхода,
			 * поэтому вставка без контекста отвергается кодом 42501.
			 */
			await withFixtureTenant(ORGANIZATION_ID, async () => {
				await db.insert(organizations).values({
					id: ORGANIZATION_ID,
					name: "Клиника сторожа тела ДМС",
				});
				await db.insert(users).values({
					id: STAFF_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Админ сторожа тела ДМС",
					role: "admin",
				});
				await db.insert(insuranceContracts).values({
					id: CONTRACT_ID,
					organizationId: ORGANIZATION_ID,
					companyName: "СОГАЗ",
					isActive: true,
				});
			});
		}

		staffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: STAFF_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		// Оба хука изоляции боевого server.ts: без обёртки `withTenantCtx` маршрут
		// договоров не видит ни одной строки своей же клиники.
		app = createTenantTestApp();
		await registerInsuranceRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	test("POST без токена → 401 (auth-first)", async () => {
		const refused = await postContract({
			body: { companyName: "СОГАЗ" },
			withAuth: false,
		});
		assert.ok(
			refused.statusCode === 401 || refused.statusCode === 403,
			`ожидали 401/403 без токена, получили ${refused.statusCode}: ${refused.body}`,
		);
	});

	test("POST пустое {} → 400 CompanyNameRequired, не 500", async () => {
		const refused = await postContract({ body: {} });
		assert.equal(
			refused.statusCode,
			400,
			`пустой body POST дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "CompanyNameRequired");
		assert.equal(typeof refused.json.message, "string");
		assert.match(String(refused.json.message), /Страховая компания/);
	});

	test("POST JSON null → 400 CompanyNameRequired, не 500", async () => {
		const refused = await postContract({ rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			400,
			`null body POST дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "CompanyNameRequired");
		assert.match(String(refused.json.message), /Страховая компания/);
	});

	test("POST пробел в companyName → 400 CompanyNameRequired", async () => {
		const refused = await postContract({ body: { companyName: "   " } });
		assert.equal(
			refused.statusCode,
			400,
			`пробел companyName дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.equal(refused.json.error, "CompanyNameRequired");
	});

	test("PUT JSON null → 400 CompanyNameRequired, не 500", async () => {
		if (!databaseReady) return;
		const refused = await putContract(CONTRACT_ID, { rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			400,
			`null body PUT дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "CompanyNameRequired");
		assert.match(String(refused.json.message), /Страховая компания/);
	});
});
