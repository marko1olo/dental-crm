import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, describe } from "node:test";
import { censusRouteModules, denteApiCensus } from "./routeRegistrationCensus.js";

/**
 * ДОКАЗАТЕЛЬСТВО, ЧТО ПЕРЕПИСЬ УМЕЕТ ПОКРАСНЕТЬ.
 *
 * Перепись маршрутных модулей отвечает на вопрос «модуль подключён к Fastify?».
 * Ответ «подключено всё» получается двумя способами: правило соблюдено — или
 * перепись сломалась и никого не нашла. Отличить их снаружи нельзя, поэтому
 * перепись гоняется по фикстурному дереву, в котором нарушение заведено
 * НАМЕРЕННО, и обязана его найти. Ровно этого не хватало трём сторожам, которые
 * годами показывали «pass, fail 0» при двух неподключённых модулях подписи
 * документов в дереве.
 *
 * Фикстура пишется в системный временный каталог, а не в routes/: файл-сирота
 * внутри routes/ сделал бы живых сторожей вечно красными, а вечно красный
 * сторож охраняет не лучше вечно зелёного — к нему просто привыкают.
 */

const fixtureRoot = mkdtempSync(path.join(tmpdir(), "dente-route-census-"));

after(() => {
	rmSync(fixtureRoot, { recursive: true, force: true });
});

function writeFixture(relative: string, contents: string): void {
	const full = path.join(fixtureRoot, relative);
	mkdirSync(path.dirname(full), { recursive: true });
	writeFileSync(full, contents, "utf8");
}

// Точка входа фикстуры повторяет формы записи, которые реально встречаются в
// apps/api/src/server.ts: именованный экспорт, экспорт по умолчанию,
// пространство имён, монтирование с префиксом и прямой вызов с корневым app.
writeFixture(
	"server.ts",
	`import { registerConnected } from "./routes/connected.js";
import mountedWithPrefix from "./routes/mountedWithPrefix.js";
import { registerHookOwner } from "./routes/hookOwner.js";
import { registerImportedButNeverCalled } from "./routes/importedButNeverCalled.js";
import type { Something } from "./routes/typeOnly.js";

export async function build(app: any) {
	await registerConnected(app);
	await app.register(mountedWithPrefix, { prefix: "/api/prefixed" });
	await registerHookOwner(app);
	const unused: Something | null = null;
	return unused;
}
`,
);

writeFixture(
	"routes/connected.ts",
	`import { register as registerChild } from "./nested/child.js";
export async function registerConnected(app: any) {
	app.get<{ Querystring: Record<string, unknown> }>("/api/connected", async () => ({ ok: true }));
	await registerChild(app);
}
`,
);

// Ребёнок в подкаталоге с экспортом РОВНО `register` — форма, которую старый
// шаблон /register\w+/ не видел вообще.
writeFixture(
	"routes/nested/child.ts",
	`export async function register(app: any) {
	app.post("/api/connected/child", async () => ({ ok: true }));
}
`,
);

// Заведомое нарушение: файл объявляет маршрут и не импортирован никем.
writeFixture(
	"routes/nested/orphan.ts",
	`export async function register(app: any) {
	app.post("/api/orphan/sign", async () => ({ ok: true }));
}
`,
);

// Импортирован, но ни разу не вызван — маршрут всё равно 404.
writeFixture(
	"routes/importedButNeverCalled.ts",
	`export async function registerImportedButNeverCalled(app: any) {
	app.get("/api/imported-but-dead", async () => ({ ok: true }));
}
`,
);

writeFixture(
	"routes/mountedWithPrefix.ts",
	`export default async function mountedWithPrefix(app: any) {
	app.get("/list", async () => ({ ok: true }));
}
`,
);

writeFixture(
	"routes/hookOwner.ts",
	`export async function registerHookOwner(app: any) {
	app.addHook("preHandler", async () => {});
	app.get("/api/hook-owner", async () => ({ ok: true }));
}
`,
);

writeFixture("routes/typeOnly.ts", `export type Something = { readonly id: string };\n`);

const fixtureCensus = censusRouteModules({
	routesDir: path.join(fixtureRoot, "routes"),
	entryFile: path.join(fixtureRoot, "server.ts"),
});

describe("перепись проводки маршрутных модулей", () => {
	test("находит модуль в подкаталоге, который никто не импортирует", () => {
		const orphan = fixtureCensus.byId.get("nested/orphan.ts");
		assert.ok(orphan, "модуль nested/orphan.ts не попал в перепись — обход не рекурсивный");
		assert.equal(orphan.declaresHttpRoutes, true, "маршрут в файле-сироте не распознан");
		assert.equal(
			orphan.registered,
			false,
			"файл-сирота объявлен подключённым — перепись не проверяет проводку, а значит " +
				"отбеливает собственный 404 незарегистрированного модуля",
		);
	});

	test("импорт без вызова не считается проводкой", () => {
		const dead = fixtureCensus.byId.get("importedButNeverCalled.ts");
		assert.ok(dead);
		assert.equal(
			dead.registered,
			false,
			"импортированный, но ни разу не вызванный модуль не обслуживает ни одного адреса",
		);
	});

	test("цепочка через родителя признаётся проводкой", () => {
		const child = fixtureCensus.byId.get("nested/child.ts");
		assert.ok(child);
		assert.equal(child.registered, true, "ребёнок подключённого родителя обязан считаться подключённым");
		assert.deepEqual(child.chain, ["server.ts", "connected.ts", "nested/child.ts"]);
	});

	test("экспорт по умолчанию и префикс монтирования разобраны", () => {
		const prefixed = fixtureCensus.byId.get("mountedWithPrefix.ts");
		assert.ok(prefixed);
		assert.equal(prefixed.registered, true, "экспорт по умолчанию не распознан как регистратор");
		assert.deepEqual(prefixed.prefixes, ["/api/prefixed"]);
		assert.deepEqual(prefixed.routePaths, ["/list"]);
	});

	test("дженерик с вложенными угловыми скобками не выбрасывает маршрут из переписи", () => {
		const connected = fixtureCensus.byId.get("connected.ts");
		assert.ok(connected);
		assert.deepEqual(
			connected.routePaths,
			["/api/connected"],
			"app.get<{ Querystring: Record<string, unknown> }>(…) должен попадать в перепись: " +
				"класс [^>]* обрывался на «>» внутри Record<…>",
		);
	});

	test("прямой вызов с корневым экземпляром отличается от app.register", () => {
		const hookOwner = fixtureCensus.byId.get("hookOwner.ts");
		assert.ok(hookOwner);
		assert.equal(hookOwner.declaresHooks, true, "app.addHook в модуле не распознан");
		assert.equal(
			hookOwner.invokedDirectlyWithRootInstance,
			true,
			"прямой вызов registerHookOwner(app) не отличён от app.register — именно эта " +
				"разница вынесла хук max.ts на весь API и врач получал 403 на /api/health",
		);
		const prefixed = fixtureCensus.byId.get("mountedWithPrefix.ts");
		assert.equal(prefixed?.invokedDirectlyWithRootInstance, false);
	});

	test("импорт только типов не считается проводкой", () => {
		const typeOnly = fixtureCensus.byId.get("typeOnly.ts");
		assert.ok(typeOnly);
		assert.equal(typeOnly.registered, false, "import type не вызывает ничего и проводкой не является");
	});

	test("перепись живого дерева не выродилась", () => {
		const census = denteApiCensus();
		assert.ok(
			census.modules.length > 50,
			`маршрутных модулей найдено ${census.modules.length} — путь к routes/ неверен`,
		);
		// Заведомо существующая цепочка через родителя: children documents/*
		// подключаются из routes/documents.ts, а он — из server.ts.
		const child = census.byId.get("documents/create.ts");
		assert.ok(child, "routes/documents/create.ts не попал в перепись — обход не рекурсивный");
		assert.deepEqual(
			child.chain,
			["server.ts", "documents.ts", "documents/create.ts"],
			"цепочка проводки через routes/documents.ts не распознана — доверять вердиктам нельзя",
		);
		const registeredCount = census.modules.filter((module) => module.registered).length;
		assert.ok(
			registeredCount > 40,
			`подключённых модулей найдено ${registeredCount} — разбор вызовов сломан`,
		);
	});
});
