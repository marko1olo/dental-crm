import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { definePublicRoute, defineTenantQuery } from "../../core/routeFactories.js";
import {
	db,
	runWithStrictUnscopedDbTrap,
	UnscopedTenantDbAccessError,
} from "../../db/client.js";
import { getCustomCrmTaskTypesFromDb } from "../../db/customCrmTaskTypesQuery.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { registerLifecycleHooks } from "../../serverModules/lifecycleHooks.js";
import { CallerLookupService } from "../../services/telephony/callerLookupService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
} from "../support/fixtureOrganizations.js";

const ORG_ID = fixtureUuid("wave8-onroute-strict-trap", 1);

describe("Wave 8: onRoute=OFF, 100% routeFactories и DENTE_STRICT_TENANT_DB_TRAP", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const capturedErrors: unknown[] = [];

	before(async () => {
		process.env.AUTH_TOKEN_SECRET ??= "wave8-strict-trap-test-secret";
		app = Fastify({ logger: false });
		app.addHook("onError", async (_request, _reply, error) => {
			capturedErrors.push(error);
		});
		registerLifecycleHooks(app);

		app.get("/probe/raw-no-onroute", async () => {
			const seen = await db.execute<{ tenant: string | null }>(
				sql`SELECT current_setting('app.current_tenant', true) AS tenant`,
			);
			return { ok: true, tenant: seen.rows[0]?.tenant ?? null };
		});

		definePublicRoute(app, {
			method: "GET",
			path: "/probe/public-strict-trap",
			handler: async () => {
				await db.execute(sql`SELECT 1`);
				return { ok: true };
			},
		});

		defineTenantQuery(app, {
			path: "/probe/factory-read-only",
			authOptions: { allowClinicTokenWithoutStaff: true },
			permission: { customCheck: () => true },
			handler: async ({ tx, organizationId }) => {
				const seen = await tx.execute<{ tenant: string | null; ro: string | null }>(
					sql`SELECT current_setting('app.current_tenant', true) AS tenant, current_setting('transaction_read_only', true) AS ro`,
				);
				return {
					organizationId,
					tenant: seen.rows[0]?.tenant ?? null,
					readOnly: seen.rows[0]?.ro ?? null,
				};
			},
		});

		try {
			await db.execute(sql`SELECT 1`);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		await app.close();
	});

	test("lifecycleHooks.ts не оборачивает голые маршруты через onRoute; db.* под строгой ловушкой падает", async () => {
		capturedErrors.length = 0;
		const token = signToken({ organizationId: ORG_ID }, authTokenSecret());

		if (databaseAvailable) {
			const noOnRouteRes = await app.inject({
				method: "GET",
				url: "/probe/raw-no-onroute",
				headers: { "x-dente-clinic-token": token },
			});
			assert.equal(noOnRouteRes.statusCode, 200, noOnRouteRes.body);
			const parsed = JSON.parse(noOnRouteRes.body) as { tenant: string | null };
			assert.ok(
				parsed.tenant === "" || parsed.tenant === null,
				`Expected empty tenant with onRoute=OFF, got ${parsed.tenant}`,
			);
		}

		const prev = process.env.DENTE_STRICT_TENANT_DB_TRAP;
		process.env.DENTE_STRICT_TENANT_DB_TRAP = "1";
		try {
			const response = await app.inject({
				method: "GET",
				url: "/probe/raw-no-onroute",
				headers: { "x-dente-clinic-token": token },
			});

			assert.equal(response.statusCode, 500, response.body);
			assert.ok(
				capturedErrors.some((err) => err instanceof UnscopedTenantDbAccessError),
				`Expected UnscopedTenantDbAccessError in onError, got: ${String(capturedErrors[0])}`,
			);
		} finally {
			if (prev === undefined) delete process.env.DENTE_STRICT_TENANT_DB_TRAP;
			else process.env.DENTE_STRICT_TENANT_DB_TRAP = prev;
		}
	});

	test("definePublicRoute принудительно включает runWithStrictUnscopedDbTrap на голый db.*", async () => {
		capturedErrors.length = 0;
		const response = await app.inject({
			method: "GET",
			url: "/probe/public-strict-trap",
		});

		assert.equal(response.statusCode, 500, response.body);
		assert.ok(
			capturedErrors.some((err) => err instanceof UnscopedTenantDbAccessError),
			`Expected UnscopedTenantDbAccessError in onError, got: ${String(capturedErrors[0])}`,
		);
	});

	test("defineTenantQuery работает без onRoute, выставляя tenant и READ ONLY в PG18", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const token = signToken({ organizationId: ORG_ID }, authTokenSecret());
		const response = await runWithStrictUnscopedDbTrap(() =>
			app.inject({
				method: "GET",
				url: "/probe/factory-read-only",
				headers: { "x-dente-clinic-token": token },
			}),
		);

		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body) as {
			organizationId: string;
			tenant: string | null;
			readOnly: string | null;
		};
		assert.equal(body.organizationId, ORG_ID);
		assert.equal(body.tenant, ORG_ID);
		assert.equal(body.readOnly, "on");
	});

	test("DENTE_STRICT_TENANT_DB_TRAP=1 блокирует голый db.*, но пропускает withTenantReadCtx и withTenantWriteCtx", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const prev = process.env.DENTE_STRICT_TENANT_DB_TRAP;
		process.env.DENTE_STRICT_TENANT_DB_TRAP = "1";
		try {
			assert.throws(
				() => {
					void db.execute(sql`SELECT 1`);
				},
				UnscopedTenantDbAccessError,
			);

			const readRo = await withTenantReadCtx(ORG_ID, async (tx) => {
				const res = await tx.execute<{ ro: string | null; tenant: string | null }>(
					sql`SELECT current_setting('transaction_read_only', true) AS ro, current_setting('app.current_tenant', true) AS tenant`,
				);
				return res.rows[0];
			});
			assert.equal(readRo?.ro, "on");
			assert.equal(readRo?.tenant, ORG_ID);

			const writeRo = await withTenantWriteCtx(ORG_ID, async (tx) => {
				const res = await tx.execute<{ ro: string | null; tenant: string | null }>(
					sql`SELECT current_setting('transaction_read_only', true) AS ro, current_setting('app.current_tenant', true) AS tenant`,
				);
				return res.rows[0];
			});
			assert.equal(writeRo?.ro, "off");
			assert.equal(writeRo?.tenant, ORG_ID);
		} finally {
			if (prev === undefined) delete process.env.DENTE_STRICT_TENANT_DB_TRAP;
			else process.env.DENTE_STRICT_TENANT_DB_TRAP = prev;
		}
	});

	test("рефакторнутые сервисы и запросы (getCustomCrmTaskTypesFromDb, CallerLookupService) не трогают голый db", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const taskTypes = await runWithStrictUnscopedDbTrap(() =>
			getCustomCrmTaskTypesFromDb(ORG_ID),
		);
		assert.ok(Array.isArray(taskTypes));

		const caller = await runWithStrictUnscopedDbTrap(() =>
			CallerLookupService.lookupCaller({
				organizationId: ORG_ID,
				phone: "+79990000001",
			}),
		);
		assert.equal(caller.found, false);
	});
});
