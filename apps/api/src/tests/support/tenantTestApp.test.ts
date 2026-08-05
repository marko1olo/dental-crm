import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, isDatabaseUnavailable } from "./fixtureOrganizations.js";
import { createTenantTestApp } from "./tenantTestApp.js";

/**
 * Проверки на обвязку тестового приложения.
 *
 * ЗАЧЕМ ОНИ. `createTenantTestApp` воспроизводит контур изоляции боевого
 * сервера, и у этого есть две болезни, каждую из которых видно только проверкой:
 *
 *   1. МОЛЧАЛИВОЕ БЕЗДЕЙСТВИЕ. `onRoute` срабатывает в момент регистрации
 *      маршрута. Хук, повешенный после `registerXxxRoutes(app)`, не обернёт
 *      ничего и не пожалуется — приложение соберётся, тесты пойдут, а маршруты
 *      будут читать ноль строк ровно как раньше. Поэтому здесь проверяется не
 *      наличие хука, а РЕЗУЛЬТАТ: значение `app.current_tenant` внутри
 *      обработчика.
 *   2. РАСХОЖДЕНИЕ С `server.ts`. Это второй экземпляр одной логики, и он
 *      обязан оставаться вторым экземпляром ОДНОЙ логики. Если изоляцию в
 *      боевом сервере переделают, а здесь нет, тесты продолжат зеленеть на
 *      контуре, которого в бою больше нет. Сторож внизу читает исходник
 *      `server.ts` и падает, когда обёртка оттуда исчезает или перестаёт быть
 *      `withTenantCtx`.
 */

const ORGANIZATION_ID = fixtureUuid("tenantTestApp", 1);

describe("тестовое приложение с тенант-контекстом", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	before(async () => {
		process.env.AUTH_TOKEN_SECRET ??= "tenant-test-app-secret";
		app = createTenantTestApp();
		// Маршрут отвечает тем, что видит база в переменной сеанса. Ничего не
		// сеет и ничего не читает из таблиц: проверяется сам контекст, а не
		// данные, поэтому проверка не зависит ни от одной фикстуры.
		app.get("/probe/tenant", async () => {
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

	test("обработчик видит организацию из подписанного токена", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/probe/tenant",
			headers: {
				"x-dente-clinic-token": signToken({ organizationId: ORGANIZATION_ID }, authTokenSecret()),
			},
		});

		assert.equal(response.statusCode, 200, response.body);
		// Ровно тот арендатор, что в токене. Пустая строка здесь означала бы, что
		// обёртка не сработала, и все маршрутные тесты по живой базе читали бы
		// ноль строк, не сообщая об этом.
		assert.equal(JSON.parse(response.body).tenant, ORGANIZATION_ID);
	});

	test("запрос без токена контекста не получает, и это не смягчено", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/probe/tenant" });

		assert.equal(response.statusCode, 200, response.body);
		// Реального арендатора у такого запроса нет, придумывать его нельзя:
		// проверки «сессия несуществующей клиники» и «чужой арендатор» держатся
		// именно на том, что здесь пусто. Сброшенный пользовательский параметр
		// сеанса читается пустой строкой, а не NULL.
		const tenant = JSON.parse(response.body).tenant;
		assert.ok(tenant === "" || tenant === null, `ожидался пустой контекст, получен «${tenant}»`);
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
			assert.ok(tenant === "" || tenant === null, `заголовок выдал контекст «${tenant}» без разрешения`);
		} finally {
			if (previous === undefined) delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
			else process.env.DENTE_DEV_ALLOW_HEADER_ORG = previous;
		}
	});

	test("боевой сервер по-прежнему оборачивает обработчики тем же способом", async () => {
		// Сторож против расхождения двух экземпляров одной логики. Он намеренно
		// смотрит в ИСХОДНИК: импортировать server.ts ради проверки нельзя —
		// модуль на импорте поднимает прокси, туннели и семьдесят наборов
		// маршрутов.
		const serverSource = await readFile(new URL("../../server.ts", import.meta.url), "utf8");

		assert.match(
			serverSource,
			/addHook\(\s*["']onRoute["']/,
			"в server.ts исчез хук onRoute — обвязка тестов воспроизводит контур, которого больше нет",
		);
		assert.match(
			serverSource,
			/withTenantCtx\(\s*tenantId/,
			"в server.ts обработчики больше не оборачиваются в withTenantCtx(tenantId, …) — обвязку тестов надо привести к новому способу",
		);
		assert.match(
			serverSource,
			/_req\.tenantId = _identity\.organizationId/,
			"в server.ts изменился способ получения арендатора запроса — сверьте с tenantTestApp.ts",
		);
	});
});
