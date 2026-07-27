import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import fastify from "fastify";

/**
 * Область действия хуков маршрутных модулей.
 *
 * ЧТО БЫЛО. Модули routes/max.ts и routes/whatsapp.ts навешивают внутри себя
 * app.addHook("preHandler", ...) с проверкой requireNonDoctorAccess. В
 * server.ts они вызывались напрямую — registerMaxRoutes(app) — а не через
 * app.register. При прямом вызове хук попадает в КОРНЕВУЮ область Fastify и
 * срабатывает на каждом запросе всего приложения.
 *
 * Наблюдаемое последствие, замеренное на живом сервере
 * (scratch/probe-doctor-403-scope.mjs): врач, разблокировавший смену своим
 * PIN, получал 403 «Доктора не могут выполнять это действие» на ВСЁ, включая
 * /api/health, /api/dashboard, /api/patients и чтение зубной формулы. Без
 * токена сотрудника те же маршруты отвечали 200. Стоматолог, войдя под
 * собой, не мог работать в программе вообще.
 *
 * Первый тест проверяет само поведение Fastify на минимальном приложении:
 * прямой вызов протекает, app.register — нет. Второй следит за фактической
 * проводкой в server.ts, потому что именно она и была нарушена, а поднимать
 * настоящее приложение в модульном тесте нельзя: оно тянет базу и воркеры.
 */

describe("область действия preHandler у маршрутного модуля", () => {
	// Модуль, устроенный как routes/max.ts: свой маршрут и свой хук.
	async function moduleWithOwnHook(app: ReturnType<typeof fastify>) {
		app.addHook("preHandler", async (_request, reply) => {
			reply.code(403).send({ error: "ModuleGuard" });
			return reply;
		});
		app.get("/module/own", async () => ({ ok: true }));
	}

	test("прямой вызов с корневым экземпляром распространяет хук на чужие маршруты", async () => {
		const app = fastify();
		app.get("/outside", async () => ({ ok: true }));
		// Именно так и вызывались registerMaxRoutes и registerWhatsappRoutes.
		await moduleWithOwnHook(app);
		await app.ready();

		const outside = await app.inject({ method: "GET", url: "/outside" });
		assert.equal(outside.statusCode, 403, "хук модуля не должен был затронуть посторонний маршрут, но затронул");
		await app.close();
	});

	test("регистрация через app.register удерживает хук внутри модуля", async () => {
		const app = fastify();
		app.get("/outside", async () => ({ ok: true }));
		await app.register(moduleWithOwnHook);
		await app.ready();

		const outside = await app.inject({ method: "GET", url: "/outside" });
		assert.equal(outside.statusCode, 200, "посторонний маршрут не должен зависеть от хука модуля");

		const own = await app.inject({ method: "GET", url: "/module/own" });
		assert.equal(own.statusCode, 403, "внутри модуля хук обязан работать");
		await app.close();
	});
});

describe("проводка маршрутных модулей со своими хуками", () => {
	const serverSource = readFileSync(new URL("../server.ts", import.meta.url), "utf8");

	function routeModulesWithOwnHooks(): string[] {
		const routesDir = new URL("../routes/", import.meta.url);
		const dir = decodeURIComponent(routesDir.pathname.replace(/^\//, ""));
		const found: string[] = [];
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			if (!statSync(full).isFile() || !entry.endsWith(".ts") || entry.endsWith(".test.ts")) continue;
			const source = readFileSync(full, "utf8");
			/* Любой вид хука, а не только preHandler: маршрутный модуль не должен
			   влиять на чужие маршруты ни проверкой доступа, ни заголовками, ни
			   обработкой ошибок. */
			if (!/app\.addHook\(/.test(source)) continue;
			const exported = /export async function (register\w+)/.exec(source);
			if (exported?.[1]) found.push(exported[1]);
		}
		return found;
	}

	test("каждый модуль со своим хуком регистрируется через app.register", () => {
		const modules = routeModulesWithOwnHooks();
		assert.ok(modules.length > 0, "не нашёл ни одного модуля со своим хуком — проверка потеряла смысл");

		const leaking: string[] = [];
		for (const moduleName of modules) {
			// Прямой вызов: `await registerMaxRoutes(app);`
			const directCall = new RegExp(`(?<!register\\(\\s*)\\b${moduleName}\\s*\\(\\s*app\\s*\\)`);
			if (directCall.test(serverSource)) leaking.push(moduleName);
		}

		assert.deepEqual(
			leaking,
			[],
			`эти модули навешивают свой хук и вызываются напрямую с корневым экземпляром, ` +
				`поэтому их хук действует на весь API: ${leaking.join(", ")}. ` +
				`Регистрируйте их через app.register(...), чтобы хук остался внутри модуля.`,
		);
	});
});
