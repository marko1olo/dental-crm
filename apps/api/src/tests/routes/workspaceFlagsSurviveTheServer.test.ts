import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import {
	DEFAULT_WORKSPACE_FEATURE_FLAGS,
	workspaceFlagsFromStorage,
	workspaceProfileRoutes,
} from "../../routes/workspaceProfile.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * СВЯЗЬ ДВУХ ПОЛОВИН: ПРИЗНАК, КОТОРЫЙ КЛИНИКА ВКЛЮЧИЛА, ОБЯЗАН ДОЖИТЬ ДО БАЗЫ.
 *
 * Запуск: из apps/api
 *   node --import tsx --test src/tests/routes/workspaceFlagsSurviveTheServer.test.ts
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Клиент держит 28 признаков рабочего пространства
 * (DEFAULT_FLAGS в apps/web/src/hooks/useWorkspaceProfile.ts), сервер знал 19.
 * workspaceFlagsFromStorage перебирает ключи ТОЛЬКО серверного набора, поэтому
 * девять признаков выбрасывались молча — и на записи, и на чтении. Маршрут при
 * этом отвечал 200, а клиент по любому `response.ok` ставил
 * savedOnServer = true (useWorkspaceProfile.ts:307-308) и показывал галочку
 * «сохранено».
 *
 * Дороже всего обошёлся hasClinicalRules. Он закрывает вкладку клинических
 * правил и её панель: apps/web/src/components/settings/SettingsRulesTab.tsx:119-121
 * возвращает SettingsModuleDisabled, пока признак выключен, а выключен он по
 * умолчанию. Переключатель существует
 * (components/workspace/WorkspaceFeaturesSelector.tsx:232-239, «Клинические
 * правила и протоколы») и ничего не сохранял. Значит предупреждения по
 * протоколам лечения — живая таблица и четыре живых маршрута
 * (routes/clinical.ts:51,80,92,124) — включались в одном браузере одного
 * сотрудника и исчезали на втором устройстве, у второго врача и после очистки
 * браузера. Тем же путём терялся hasEngineeringStatus — признак, открывающий
 * врачу состояние отправки документа в ЕГИСЗ
 * (components/visit/VisitOdontogramTab.tsx:97-104).
 *
 * ПОЧЕМУ ПРОВЕРЯЕТСЯ СВЯЗЬ, А НЕ НАЛИЧИЕ КЛЮЧЕЙ. Набор клиента читается из его
 * живого исходника, а не переписывается сюда: копия разошлась бы точно так же,
 * как разошлись два набора. Добавит клиент двадцать девятый признак — этот тест
 * покраснеет ДО того, как переключатель обманет клинику ещё раз.
 *
 * ПОЧЕМУ БЕЗ ЗАПИСИ В БАЗУ. База разработки одна на всех агентов. Слияние
 * доказывается на той самой функции, которой пользуются оба обработчика
 * (workspaceFlagsFromStorage), а маршрут — ответами, которым база не нужна:
 * 401 без токена и 404 по неизвестной клинике из тела обработчика.
 */

const here = dirname(fileURLToPath(import.meta.url));
const webHooks = join(
	here,
	"..",
	"..",
	"..",
	"..",
	"web",
	"src",
	"hooks",
	"useWorkspaceProfile.ts",
);

const ORG_UNKNOWN = "aa880000-0000-4000-8000-0000000000a1";
const TEST_SECRET = "workspace-flags-survive-server-proof".padEnd(48, "z");

/** Ключи набора DEFAULT_FLAGS из живого исходника клиента. */
function clientFlagKeys(): string[] {
	const source = readFileSync(webHooks, "utf8");
	const start = source.indexOf("const DEFAULT_FLAGS");
	assert.notEqual(
		start,
		-1,
		"в apps/web/src/hooks/useWorkspaceProfile.ts больше нет DEFAULT_FLAGS — " +
			"проверка связи потеряла свой предмет и должна быть переписана под новый способ.",
	);
	const open = source.indexOf("{", start);
	const close = source.indexOf("\n};", open);
	const body = source.slice(open, close);
	const keys = [...body.matchAll(/^\t([A-Za-z][A-Za-z0-9]*)\s*:/gm)].map(
		(match) => match[1] ?? "",
	);
	assert.ok(
		keys.length >= 25,
		`разбор DEFAULT_FLAGS дал ${keys.length} ключей — разбор сломался`,
	);
	return keys;
}

describe("признаки рабочего пространства не теряются между клиентом и сервером", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		resetAuthSecretCacheForTests();

		clinicToken = signToken({ organizationId: ORG_UNKNOWN }, TEST_SECRET, 3600);

		app = Fastify({ logger: false });
		await workspaceProfileRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	test("каждый признак, который присылает клиент, известен серверу", () => {
		const serverKeys = new Set(Object.keys(DEFAULT_WORKSPACE_FEATURE_FLAGS));
		const dropped = clientFlagKeys().filter((key) => !serverKeys.has(key));

		assert.deepEqual(
			dropped,
			[],
			"сервер молча выбросит эти признаки: workspaceFlagsFromStorage перебирает только " +
				"свой набор, а маршрут всё равно ответит 200 — клиника увидит «сохранено» и " +
				"потеряет выбор при следующем входе. Добавьте признак в " +
				`DEFAULT_WORKSPACE_FEATURE_FLAGS: ${dropped.join(", ")}`,
		);
	});

	test("включённый признак доживает до сохранённого набора, а не сбрасывается в умолчание", () => {
		// Ровно то преобразование, которое делает обработчик POST: слияние
		// сохранённого набора с телом запроса через workspaceFlagsFromStorage.
		for (const key of clientFlagKeys()) {
			const fallback = (
				DEFAULT_WORKSPACE_FEATURE_FLAGS as unknown as Record<string, unknown>
			)[key];
			let sent: unknown;
			if (typeof fallback === "boolean") sent = !fallback;
			else if (typeof fallback === "number") sent = fallback + 1;
			else if (typeof fallback === "string") sent = "solo_therapist";
			else continue;

			const merged = workspaceFlagsFromStorage({
				...workspaceFlagsFromStorage(null),
				[key]: sent,
			}) as unknown as Record<string, unknown>;

			assert.equal(
				merged[key],
				sent,
				`${key}: значение из запроса клиента не дошло до сохранённого набора`,
			);
		}
	});

	test("клинические правила и статус ЕГИСЗ включаются — это их точки входа", () => {
		// Названы отдельно, потому что именно они закрывают экраны. Тест обязан
		// упасть на них по имени, а не только в общем списке: следующий читатель
		// должен видеть, ЧТО именно перестанет открываться.
		const saved = workspaceFlagsFromStorage({
			hasClinicalRules: true,
			hasEngineeringStatus: true,
		}) as unknown as Record<string, unknown>;

		assert.equal(
			saved.hasClinicalRules,
			true,
			"вкладка клинических правил снова недостижима",
		);
		assert.equal(
			saved.hasEngineeringStatus,
			true,
			"состояние отправки в ЕГИСЗ снова скрыто от врача",
		);

		// Связь с точкой входа: гейт читает именно этот признак.
		const rulesTab = readFileSync(
			join(
				here,
				"..",
				"..",
				"..",
				"..",
				"web",
				"src",
				"components",
				"settings",
				"SettingsRulesTab.tsx",
			),
			"utf8",
		);
		assert.match(rulesTab, /if \(!flags\.hasClinicalRules\)/);
	});

	test("мусор из базы и чужие ключи по-прежнему отбрасываются", () => {
		// Расширение контракта не должно превратить набор в свалку: значение не
		// того типа и неизвестный ключ обязаны отсеиваться, иначе строка вместо
		// true вернётся на клиент, где признак читается как булев.
		const merged = workspaceFlagsFromStorage({
			hasClinicalRules: "да",
			numberOfDoctors: "четыре",
			hasVampireMode: true,
		}) as unknown as Record<string, unknown>;

		assert.equal(
			merged.hasClinicalRules,
			DEFAULT_WORKSPACE_FEATURE_FLAGS.hasClinicalRules,
		);
		assert.equal(
			merged.numberOfDoctors,
			DEFAULT_WORKSPACE_FEATURE_FLAGS.numberOfDoctors,
		);
		assert.equal("hasVampireMode" in merged, false);

		// NaN/Infinity в jsonb попасть могут; числом врачей быть не могут.
		for (const broken of [Number.NaN, Number.POSITIVE_INFINITY]) {
			const guarded = workspaceFlagsFromStorage({
				numberOfDoctors: broken,
			}) as unknown as Record<string, unknown>;
			assert.equal(
				guarded.numberOfDoctors,
				DEFAULT_WORKSPACE_FEATURE_FLAGS.numberOfDoctors,
			);
		}
	});

	test("адрес сохранения признаков обслуживается и закрыт токеном", async () => {
		const anonymous = await app.inject({
			method: "POST",
			url: "/api/workspace/profile",
			payload: { hasClinicalRules: true },
		});
		assert.equal(anonymous.statusCode, 401, anonymous.body);

		// С токеном запрос доходит до тела обработчика: 404 по неизвестной клинике
		// приходит уже после поиска организации, то есть маршрут живой.
		const withToken = await app.inject({
			method: "POST",
			url: "/api/workspace/profile",
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken },
			payload: { hasClinicalRules: true },
		});
		assert.equal(withToken.statusCode, 404, withToken.body);
		assert.equal(withToken.json().error, "OrganizationNotFound");
	});
});
