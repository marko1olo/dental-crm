import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { defineTenantQuery } from "../../core/routeFactories.js";
import { db } from "../../db/client.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, isDatabaseUnavailable } from "./fixtureOrganizations.js";
import { createTenantTestApp } from "./tenantTestApp.js";

const ORGANIZATION_ID = fixtureUuid("tenantTestApp", 1);

describe("тестовое приложение с тенант-контекстом", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	before(async () => {
		process.env.AUTH_TOKEN_SECRET ??= "tenant-test-app-secret";
		app = createTenantTestApp();

		app.get("/probe/tenant", async (request) => {
			const tenantId = (request as { tenantId?: string }).tenantId;
			if (!tenantId) {
				return { tenant: null };
			}
			return withTenantReadCtx(tenantId, async (tx) => {
				const seen = await tx.execute<{ tenant: string | null }>(
					sql`SELECT current_setting('app.current_tenant', true) AS tenant`,
				);
				return { tenant: seen.rows[0]?.tenant ?? null };
			});
		});

		defineTenantQuery(app, {
			path: "/probe/factory-read",
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

		app.get("/probe/legacy-unscoped-no-onroute", async () => {
			const seen = await db.execute<{ tenant: string | null }>(
				sql`SELECT current_setting('app.current_tenant', true) AS tenant`,
			);
			return { tenant: seen.rows[0]?.tenant ?? null };
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

	test("обработчик видит организацию из подписанного токена через withTenantReadCtx", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/probe/tenant",
			headers: {
				"x-dente-clinic-token": signToken(
					{ organizationId: ORGANIZATION_ID },
					authTokenSecret(),
				),
			},
		});

		assert.equal(response.statusCode, 200, response.body);
		assert.equal(JSON.parse(response.body).tenant, ORGANIZATION_ID);
	});

	test("defineTenantQuery выставляет app.current_tenant и PG READ ONLY транзакцию", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/probe/factory-read",
			headers: {
				"x-dente-clinic-token": signToken(
					{ organizationId: ORGANIZATION_ID },
					authTokenSecret(),
				),
			},
		});

		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body) as {
			organizationId: string;
			tenant: string | null;
			readOnly: string | null;
		};
		assert.equal(body.organizationId, ORGANIZATION_ID);
		assert.equal(body.tenant, ORGANIZATION_ID);
		assert.equal(body.readOnly, "on");
	});

	test("запрос без токена контекста не получает, и это не смягчено", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/probe/tenant" });

		assert.equal(response.statusCode, 200, response.body);
		const tenant = JSON.parse(response.body).tenant;
		assert.ok(
			tenant === "" || tenant === null,
			`ожидался пустой контекст, получен «${tenant}»`,
		);
	});

	test("подделать организацию заголовком нельзя без явного разрешения разработки", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const previous = process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		try {
			const response = await app.inject({
				method: "GET",
				url: "/probe/tenant",
				headers: { "x-organization-id": fixtureUuid("tenantTestApp", 2) },
			});
			assert.equal(response.statusCode, 200, response.body);
			const tenant = JSON.parse(response.body).tenant;
			assert.ok(
				tenant === "" || tenant === null,
				`заголовок выдал контекст «${tenant}» без разрешения`,
			);
		} finally {
			if (previous === undefined) delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
			else process.env.DENTE_DEV_ALLOW_HEADER_ORG = previous;
		}
	});

	test("глобальный хук onRoute отключён: голый db-маршрут не получает tenant и падает при DENTE_STRICT_TENANT_DB_TRAP=1", async () => {
		const tokenHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORGANIZATION_ID },
				authTokenSecret(),
			),
		};

		if (databaseAvailable) {
			const noOnRouteRes = await app.inject({
				method: "GET",
				url: "/probe/legacy-unscoped-no-onroute",
				headers: tokenHeaders,
			});
			assert.equal(noOnRouteRes.statusCode, 200, noOnRouteRes.body);
			const tenant = (JSON.parse(noOnRouteRes.body) as { tenant: string | null }).tenant;
			assert.ok(
				tenant === "" || tenant === null,
				`onRoute всё ещё оборачивает голый маршрут: tenant=${tenant}`,
			);
		}

		const prev = process.env.DENTE_STRICT_TENANT_DB_TRAP;
		process.env.DENTE_STRICT_TENANT_DB_TRAP = "1";
		try {
			const strictRes = await app.inject({
				method: "GET",
				url: "/probe/legacy-unscoped-no-onroute",
				headers: tokenHeaders,
			});
			assert.equal(strictRes.statusCode, 500, strictRes.body);
			const payload = JSON.parse(strictRes.body) as { message?: string };
			assert.match(payload.message ?? "", /Forbidden unscoped db\.execute\(\) call/);
		} finally {
			if (prev === undefined) delete process.env.DENTE_STRICT_TENANT_DB_TRAP;
			else process.env.DENTE_STRICT_TENANT_DB_TRAP = prev;
		}
	});
});
