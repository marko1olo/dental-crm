/**
 * НАСТРОЙКИ РАБОЧЕГО МЕСТА: УСТАРЕВШЕЕ СОХРАНЕНИЕ НЕ ИМЕЕТ ПРАВА ЗАТИРАТЬ СВЕЖЕЕ.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx --test src/tests/routes/uiPreferencesStaleSaveGuard.test.ts
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. `PUT /api/settings/preferences` принимал
 * `savedAt` от клиента как есть и писал тело в базу без единого сравнения
 * времени. Администратор открывает настройки в двух вкладках, в первой меняет
 * роль рабочего места и фильтры расписания, вторая всё это время держит копию,
 * снятую ДО правки. Любое сохранение из второй вкладки — в том числе то, которое
 * клиент досылает сам, отложенной синхронизацией
 * (`apps/web/src/useAppLogic.tsx`, `flushPendingUiPreferencesServerSync`) —
 * затирало правку первой вкладки и получало 200. Ролью рабочего места
 * (`selectedWorkspaceRole`) решается, какой набор разделов человек видит, поэтому
 * откат «владелец» → «ассистент» тихо меняет то, что администратор только что
 * настроил.
 *
 * ЧТО ПРОВЕРЯЕТСЯ ЗДЕСЬ, И ПОЧЕМУ ИМЕННО ТАК.
 *
 *  1. ОБА ПОРЯДКА, а не только удобный: свежее поверх старого обязано пройти,
 *     старое поверх свежего обязано быть отвергнуто, и в хранилище обязано
 *     остаться СВЕЖЕЕ значение. Проверка только одного порядка зелена и у
 *     сервера, который просто перестал принимать сохранения.
 *
 *  2. ОДИНАКОВОЕ `savedAt` — отдельный случай с отдельным обещанием оператору:
 *     «оба прошли, последний победил». Правило то же, что в памяти
 *     (`sampleData.ts`, `saveUiPreferences`): сравнение СТРОГОЕ, `<`, поэтому
 *     равенство проходит. Это не мелочь: живой клиент повторяет неудавшуюся
 *     синхронизацию ТЕМ ЖЕ телом с тем же `savedAt`
 *     (`useAppLogic.tsx`: `delayMs: pending.savedAt === preferences.savedAt`).
 *     Отвергай равенство — и повтор сохранения, чей ответ потерялся в сети,
 *     отвергался бы навсегда, показывая «не синхронизировано» на сохранённом.
 *
 *  3. `savedAt`, которого нет или который не разбирается как время, штампуется
 *     сервером и проходит. Иначе клиент постарше, не присылающий поле, потерял
 *     бы возможность сохранять настройки вообще. Отдельно важно, что мусорная
 *     строка НЕ ложится в хранилище: пролежав там, она сломала бы сравнение для
 *     всех последующих сохранений.
 *
 *     ПОЧЕМУ ЗДЕСЬ ШТАМП СЕРВЕРА МОЖНО, А В ЗАПИСИ ИСТОРИИ НЕЛЬЗЯ. В этом дереве
 *     «нечитаемое время — это неизвестно, а не сейчас» — закреплённое правило:
 *     `transferredMoment` (`apps/api/src/migration/loader.ts`) отвечает
 *     `{ known: false }` и на пустое, и на нечитаемое значение, а платёж без даты
 *     оплаты уходит в карантин, потому что иначе он сел бы в кассу ДНЯ ПЕРЕНОСА и
 *     раздул выручку этого дня. Разница не в удобстве, а в том, ЧТО ЗНАЧИТ
 *     колонка. `payments.paid_at` и `visits.signed_at` — записи о прошлом
 *     клиники: когда взяли деньги, когда подписали документ. `savedAt` у
 *     настроек рабочего места — не факт о клинике, а отметка порядка ЭТОГО
 *     сохранения: единственные её читатели сравнивают её с другой такой же
 *     отметкой, решая, какая копия новее (`apps/web/src/AppHelpers.tsx`,
 *     `mergeLocalOnboardingDismissal` и `localSavedAtFresh`). Момент этого
 *     сохранения сервером не угадывается — он измеряется по его же часам, и
 *     «сейчас» здесь истина, а не подстановка.
 *
 *     «Неизвестно» эта колонка выразить не умеет вовсе: в контракте
 *     `savedAt: z.string().default("")`, и пустая строка выключает сравнение
 *     ровно так же, как мусор. Значит выбор стоит не между «сейчас» и
 *     «неизвестно», а между работающим сравнением и выключенным. Тем же способом
 *     чинит пустое значение и сам `sampleData.ts`
 *     (`normalizeMutableScheduleState`: `savedAt || new Date().toISOString()`).
 *
 *  4. ПУТЬ С БАЗОЙ И ПУТЬ БЕЗ БАЗЫ (`DENTAL_STATE_PERSISTENCE=off`) сверяются
 *     РОВНЫМ РАВЕНСТВОМ записей одного и того же прогона сценариев. Расхождение
 *     этих двух путей — отдельный класс дефекта, в этом дереве его ловили дважды,
 *     и здесь он был живым: защита от устаревшей записи существовала в
 *     `sampleData.ts`, но НИ ОДИН маршрут её не зовёт (единственный вызывающий
 *     вне самого файла — `tests/mutableStateFlushCoalescing.test.ts`). Маршрут
 *     без базы писал в свой собственный `Map` в `db/settingsQuery.ts`, тоже без
 *     сравнения. То есть обе достижимые ветки были одинаково слепы.
 *
 *  5. ОДНОВРЕМЕННОСТЬ, а не только «старое пришло позже». Два сохранения,
 *     отправленные одновременно, — это ровно исходный сценарий двух вкладок.
 *     Сравнение «прочитал, решил, записал» без атомарности его не закрывает:
 *     оба читают старое значение, оба считают себя свежими, и побеждает тот, чья
 *     запись доехала последней. Поэтому запись условная (сверка прежнего значения
 *     в WHERE) с повторным решением на проигранной сверке, а проверка ниже
 *     стреляет двумя `PUT` через `Promise.all`.
 *
 * ПОЧЕМУ СВЕРКА ИДЁТ И НЕЗАВИСИМЫМ SQL. Ответ маршрута и чтение маршрута
 * пользуются одним и тем же кодом: если он выбирает не ту строку `users`, оба
 * соврут согласованно. Независимый запрос написан руками, без построителя
 * drizzle, и читает ровно ту колонку, в которую пишет маршрут.
 *
 * СВОИ СТРОКИ УБИРАЮТСЯ. Прогон создаёт свои организации и своих сотрудников и
 * удаляет их в `after`, включая следы прерванного прогона перед началом: база
 * разработки одна на всех агентов.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { organizations, users } from "../../db/schema.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * ИДЕНТИФИКАТОРЫ КЛИНИК ПРОГОНА ЗАДАЮТСЯ ЗАРАНЕЕ, А НЕ БЕРУТСЯ ИЗ БАЗЫ.
 *
 * Раньше организация создавалась без `id` и получала случайный, а уборка искала
 * свои строки по НАЗВАНИЮ. Под FORCE RLS ни то, ни другое не работает: вставка
 * проходит только при `id = current_tenant` (иначе 42501), а поиск по названию
 * без тенант-контекста возвращает ноль строк и удаляет ноль, не сообщая об этом.
 * `fixtureUuid` выводит идентификатор из имени этого файла, поэтому и сев, и
 * уборка на входе знают, что именно искать.
 */
const NAMESPACE = "uiPreferencesStaleSaveGuard";

/** Секрет администратора настроек на прогон. В вывод не попадает никогда. */
const settingsAdminSecret = randomBytes(24).toString("hex");

/**
 * Время «копии первой вкладки». Дата взята постоянной, а не от `Date.now()`:
 * сравнение обязано опираться на присланное значение, а не на близость к
 * текущему времени.
 */
const BASE_SAVED_AT = "2026-05-20T11:00:00.000Z";
const FRESH_SAVED_AT = "2026-05-20T11:01:00.000Z";
const STALE_SAVED_AT = "2026-05-20T10:59:00.000Z";

/** Значение, которым отмечен штамп сервера: настоящее время прогона сравнивать нечем. */
const SERVER_STAMP = "<штамп сервера>";

type Scenario = {
	key: string;
	label: string;
	/** Клиника сценария: идентификатор выведен из имени файла, а не из базы. */
	organizationId: string;
	/** Название организации прогона: удаляется по точному равенству, без маски. */
	organizationName: string;
	/** `savedAt` второго сохранения. `null` — поля в теле нет вовсе. */
	incomingSavedAt: string | null;
	expectedStatus: number;
	/** Каким `savedAt` обязано остаться хранилище. `SERVER_STAMP` — штамп сервера. */
	expectedStoredSavedAt: string;
	/** Какая роль рабочего места обязана остаться в хранилище. */
	expectedStoredRole: "owner" | "assistant";
};

const SCENARIOS: Scenario[] = [
	{
		key: "fresh",
		label: "свежее поверх старого сохраняется",
		organizationId: fixtureUuid(NAMESPACE, 1),
		organizationName:
			"Проверка настроек рабочего места — свежее поверх старого",
		incomingSavedAt: FRESH_SAVED_AT,
		expectedStatus: 200,
		expectedStoredSavedAt: FRESH_SAVED_AT,
		expectedStoredRole: "assistant",
	},
	{
		key: "stale",
		label: "старое поверх свежего отвергается",
		organizationId: fixtureUuid(NAMESPACE, 2),
		organizationName:
			"Проверка настроек рабочего места — старое поверх свежего",
		incomingSavedAt: STALE_SAVED_AT,
		expectedStatus: 409,
		expectedStoredSavedAt: BASE_SAVED_AT,
		expectedStoredRole: "owner",
	},
	{
		key: "equal",
		label: "одинаковое время сохранения проходит, побеждает последний",
		organizationId: fixtureUuid(NAMESPACE, 3),
		organizationName: "Проверка настроек рабочего места — одинаковое время",
		incomingSavedAt: BASE_SAVED_AT,
		expectedStatus: 200,
		expectedStoredSavedAt: BASE_SAVED_AT,
		expectedStoredRole: "assistant",
	},
	{
		key: "absent",
		label: "сохранение без поля времени штампуется сервером и проходит",
		organizationId: fixtureUuid(NAMESPACE, 4),
		organizationName: "Проверка настроек рабочего места — без поля времени",
		incomingSavedAt: null,
		expectedStatus: 200,
		expectedStoredSavedAt: SERVER_STAMP,
		expectedStoredRole: "assistant",
	},
	{
		key: "garbage",
		label:
			"нечитаемая отметка порядка не ложится в хранилище, сохранение получает время сервера",
		organizationId: fixtureUuid(NAMESPACE, 5),
		organizationName: "Проверка настроек рабочего места — время не разбирается",
		incomingSavedAt: "позавчера вечером",
		expectedStatus: 200,
		expectedStoredSavedAt: SERVER_STAMP,
		expectedStoredRole: "assistant",
	},
];

const CONCURRENT_ORGANIZATION_ID = fixtureUuid(NAMESPACE, 90);
const CONCURRENT_ORGANIZATION_NAME =
	"Проверка настроек рабочего места — одновременно";

const PROOF_ORGANIZATION_IDS = [
	...SCENARIOS.map((scenario) => scenario.organizationId),
	CONCURRENT_ORGANIZATION_ID,
];

/** Что записано по итогу одного сценария. Формат один для обоих путей. */
type ScenarioRecord = {
	key: string;
	secondSaveStatus: number;
	storedSavedAt: string;
	storedRole: string;
	/** Есть ли в ответе текст для человека: у 200 его нет и быть не должно. */
	refusalHasRussianText: boolean;
};

let app: FastifyInstance;
const savedEnv: Record<string, string | undefined> = {};
/** Идентификаторы организаций прогона по ключу сценария. */
const organizationIdByKey = new Map<string, string>();

function headersFor(
	organizationId: string,
	withBody: boolean,
): Record<string, string> {
	const headers: Record<string, string> = {
		"x-dente-admin-secret": settingsAdminSecret,
		[CLINIC_TOKEN_HEADER]: signToken({ organizationId }, authTokenSecret()),
	};
	if (withBody) headers["content-type"] = "application/json";
	return headers;
}

/**
 * Тело сохранения ровно в той форме, в которой его шлёт интерфейс: роль рабочего
 * места, фильтр расписания и отметка времени. Остальные поля схема заполняет
 * значениями по умолчанию — это её штатное поведение, а не упрощение проверки.
 */
function preferencesPayload(
	role: "owner" | "assistant",
	scheduleDateFilter: string,
	savedAt: string | null,
): Record<string, unknown> {
	return {
		selectedWorkspaceRole: role,
		scheduleDateFilter,
		...(savedAt === null ? {} : { savedAt }),
	};
}

type Injected = {
	statusCode: number;
	json: Record<string, unknown>;
	body: string;
};

async function putPreferences(
	organizationId: string,
	payload: Record<string, unknown>,
): Promise<Injected> {
	const response = await app.inject({
		method: "PUT",
		url: "/api/settings/preferences",
		headers: headersFor(organizationId, true),
		payload: JSON.stringify(payload),
	});
	let json: Record<string, unknown>;
	try {
		json = JSON.parse(response.body) as Record<string, unknown>;
	} catch {
		json = {};
	}
	return { statusCode: response.statusCode, json, body: response.body };
}

async function getPreferences(
	organizationId: string,
): Promise<Record<string, unknown> | null> {
	const response = await app.inject({
		method: "GET",
		url: "/api/settings/preferences",
		headers: headersFor(organizationId, false),
	});
	assert.equal(
		response.statusCode,
		200,
		`чтение настроек не удалось: ${response.body}`,
	);
	const payload = JSON.parse(response.body) as {
		preferences?: Record<string, unknown> | null;
	};
	return payload.preferences ?? null;
}

/**
 * Независимый SQL: написан руками, без построителя drizzle и без проекции через
 * схему. Читает ту самую колонку `users.ui_preferences`, в которую пишет
 * маршрут, по всем сотрудникам организации — расхождение копий между строками
 * тоже видно.
 */
async function independentStoredPreferences(
	organizationId: string,
): Promise<{ saved_at: string | null; role: string | null }[]> {
	// Под тенант-контекстом: без него независимая сверка вернула бы пустой список
	// на любых данных, то есть перестала бы быть сверкой.
	const result = await withFixtureTenant(organizationId, async () =>
		db.execute(sql`
			select ui_preferences->>'savedAt' as saved_at,
			       ui_preferences->>'selectedWorkspaceRole' as role
			  from users
			 where organization_id = ${organizationId}
			   and ui_preferences is not null
		`),
	);
	return result.rows as { saved_at: string | null; role: string | null }[];
}

function russianTextPresent(value: unknown): boolean {
	return typeof value === "string" && /[А-Яа-яЁё]/.test(value);
}

/**
 * Один сценарий целиком: посев копии первой вкладки, затем сохранение из второй.
 * Возвращает запись, которая у обоих путей обязана совпасть.
 */
async function runScenario(scenario: Scenario): Promise<ScenarioRecord> {
	const organizationId = organizationIdByKey.get(scenario.key);
	assert.ok(
		organizationId,
		`организация сценария «${scenario.key}» не создана`,
	);

	// Первая вкладка: роль владельца и выбранная дата расписания.
	const seed = await putPreferences(
		organizationId,
		preferencesPayload("owner", "2026-05-20", BASE_SAVED_AT),
	);
	assert.equal(seed.statusCode, 200, `посев копии не сохранился: ${seed.body}`);
	assert.equal(
		(seed.json as { savedAt?: unknown }).savedAt,
		BASE_SAVED_AT,
		`посев вернул не то время, что прислали: ${seed.body}`,
	);

	// Вторая вкладка: своя копия, со своим временем.
	const second = await putPreferences(
		organizationId,
		preferencesPayload("assistant", "", scenario.incomingSavedAt),
	);

	const stored = await getPreferences(organizationId);
	assert.ok(
		stored,
		`после сохранения настройки не читаются вовсе (${scenario.key})`,
	);
	const storedSavedAt = String(stored.savedAt ?? "");
	const storedRole = String(stored.selectedWorkspaceRole ?? "");

	return {
		key: scenario.key,
		secondSaveStatus: second.statusCode,
		storedSavedAt,
		storedRole,
		refusalHasRussianText: russianTextPresent(
			(second.json as { message?: unknown }).message,
		),
	};
}

/**
 * Штамп сервера заменяется постоянной пометкой — но только после проверки, что
 * это действительно разбираемое время и что мусорная строка в хранилище не
 * лежит. Без этой проверки пометка спрятала бы ровно тот дефект, который ищем.
 */
function normalizeRecord(
	record: ScenarioRecord,
	scenario: Scenario,
): ScenarioRecord {
	if (scenario.expectedStoredSavedAt !== SERVER_STAMP) return record;
	assert.ok(
		Number.isFinite(Date.parse(record.storedSavedAt)),
		`сервер положил в хранилище неразбираемое время «${record.storedSavedAt}» (${scenario.key}) — ` +
			"следующее сохранение сравнивать будет не с чем",
	);
	assert.notEqual(
		record.storedSavedAt,
		scenario.incomingSavedAt,
		`мусорная строка клиента легла в хранилище как время (${scenario.key})`,
	);
	return { ...record, storedSavedAt: SERVER_STAMP };
}

function assertRecordMatchesScenario(
	record: ScenarioRecord,
	scenario: Scenario,
	path: string,
): void {
	assert.equal(
		record.secondSaveStatus,
		scenario.expectedStatus,
		`${path}: «${scenario.label}» — код ответа ${record.secondSaveStatus}, ожидался ${scenario.expectedStatus}`,
	);
	assert.equal(
		record.storedSavedAt,
		scenario.expectedStoredSavedAt,
		`${path}: «${scenario.label}» — в хранилище время ${record.storedSavedAt}, ожидалось ${scenario.expectedStoredSavedAt}`,
	);
	assert.equal(
		record.storedRole,
		scenario.expectedStoredRole,
		`${path}: «${scenario.label}» — роль рабочего места ${record.storedRole}, ожидалась ${scenario.expectedStoredRole}`,
	);
}

async function seedOrganizations(): Promise<void> {
	// Каждая клиника — свой вызов: `app.current_tenant` хранит ровно одного
	// арендатора, и общий сев списком отвергался бы кодом 42501 на второй строке.
	// Сотрудник заводится под тем же контекстом: настройки живут в его строке.
	for (const scenario of SCENARIOS) {
		const [org] = await withFixtureTenant(scenario.organizationId, async () => {
			const inserted = await db
				.insert(organizations)
				.values({
					id: scenario.organizationId,
					name: scenario.organizationName,
				})
				.returning({ id: organizations.id });
			await db.insert(users).values({
				organizationId: scenario.organizationId,
				fullName: "Владелец клиники проверки настроек",
				role: "owner",
			});
			return inserted;
		});
		if (!org)
			throw new Error(
				`Посев не состоялся: организация «${scenario.organizationName}»`,
			);
		organizationIdByKey.set(scenario.key, org.id);
	}
	const [concurrent] = await withFixtureTenant(
		CONCURRENT_ORGANIZATION_ID,
		async () => {
			const inserted = await db
				.insert(organizations)
				.values({
					id: CONCURRENT_ORGANIZATION_ID,
					name: CONCURRENT_ORGANIZATION_NAME,
				})
				.returning({ id: organizations.id });
			await db.insert(users).values({
				organizationId: CONCURRENT_ORGANIZATION_ID,
				fullName: "Владелец клиники проверки одновременности",
				role: "owner",
			});
			return inserted;
		},
	);
	if (!concurrent)
		throw new Error(
			`Посев не состоялся: организация «${CONCURRENT_ORGANIZATION_NAME}»`,
		);
	organizationIdByKey.set("concurrent", concurrent.id);
}

/**
 * Уборка клиник прогона.
 *
 * Идёт по идентификаторам, а не по названиям: под FORCE RLS выборка по названию
 * без тенант-контекста не видит ни одной чужой строки, а `DELETE`, не увидевший
 * строку, снимает ноль и ошибкой это не считается. Каталожная уборка ставит
 * контекст каждой клиники сама и перечитывает результат под обходом RLS, то есть
 * отвечает измеренным числом, а не фактом возврата из функции.
 */
async function removeProofOrganizations() {
	return purgeFixtureOrganizations(PROOF_ORGANIZATION_IDS);
}

before(async () => {
	for (const name of [
		"DENTE_SETTINGS_ADMIN_SECRET",
		"DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS",
		"DENTAL_STATE_PERSISTENCE",
	]) {
		savedEnv[name] = process.env[name];
	}
	delete process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;
	delete process.env.DENTAL_STATE_PERSISTENCE;
	process.env.DENTE_SETTINGS_ADMIN_SECRET = settingsAdminSecret;

	app = createTenantTestApp();
	await registerSettingsRoutes(app);
	await app.ready();

	// Следы прерванного прогона: он не доходит до after и оставил бы свои клиники
	// в общей базе разработки.
	await removeProofOrganizations();
	await seedOrganizations();
});

after(async () => {
	await app.close();
	const purged = await removeProofOrganizations();
	for (const [name, value] of Object.entries(savedEnv)) {
		if (value === undefined) delete process.env[name];
		else process.env[name] = value;
	}
	assert.equal(
		purged.organizationsRemoved,
		PROOF_ORGANIZATION_IDS.length,
		"организации прогона остались в базе",
	);
	await pool.end();
});

describe("настройки рабочего места: устаревшее сохранение не затирает свежее", () => {
	/** Записи пути с базой — их же сверяет проверка равенства путей. */
	const databaseRecords: ScenarioRecord[] = [];

	for (const scenario of SCENARIOS) {
		test(`с базой: ${scenario.label}`, async () => {
			const record = normalizeRecord(await runScenario(scenario), scenario);
			assertRecordMatchesScenario(record, scenario, "путь с базой");
			databaseRecords.push(record);

			// Независимая сверка: в колонке лежит то же, что отдало чтение маршрута.
			const organizationId = organizationIdByKey.get(scenario.key) ?? "";
			const rows = await independentStoredPreferences(organizationId);
			assert.equal(
				rows.length,
				1,
				`копий настроек в базе ${rows.length}, ожидалась одна`,
			);
			const row = rows[0];
			assert.ok(row, "независимый SQL не вернул строку настроек");
			assert.equal(
				row.role,
				scenario.expectedStoredRole,
				`независимый SQL: роль ${row.role}, ожидалась ${scenario.expectedStoredRole}`,
			);
			if (scenario.expectedStoredSavedAt === SERVER_STAMP) {
				assert.ok(
					Number.isFinite(Date.parse(String(row.saved_at ?? ""))),
					`независимый SQL: в колонке неразбираемое время «${row.saved_at}»`,
				);
			} else {
				assert.equal(
					row.saved_at,
					scenario.expectedStoredSavedAt,
					`независимый SQL: время ${row.saved_at}, ожидалось ${scenario.expectedStoredSavedAt}`,
				);
			}
		});
	}

	test("отказ называет причину и следующее действие по-русски, без латиницы", async () => {
		const organizationId = organizationIdByKey.get("stale") ?? "";
		const refusal = await putPreferences(
			organizationId,
			preferencesPayload("assistant", "", STALE_SAVED_AT),
		);
		assert.equal(
			refusal.statusCode,
			409,
			`ожидался отказ по устаревшей копии: ${refusal.body}`,
		);
		const message = String(
			(refusal.json as { message?: unknown }).message ?? "",
		);
		assert.ok(
			/[А-Яа-яЁё]/.test(message),
			`текст отказа обязан быть русским: «${message}»`,
		);
		assert.ok(
			!/[A-Za-z]/.test(message),
			`латиница в тексте для человека гасит фразу на экране целиком: «${message}»`,
		);
		// Причина: копия устарела, потому что настройки изменили позже.
		assert.ok(
			/устарел/.test(message),
			`отказ не называет причину: «${message}»`,
		);
		// Действие: перечитать настройки и повторить правку.
		assert.ok(
			/Обновите|перечитайте|Откройте/.test(message),
			`отказ не называет следующее действие: «${message}»`,
		);
		// Действующее значение приложено к отказу: клиенту не нужен второй запрос,
		// чтобы узнать, чем именно его копия перебита.
		const attached = (refusal.json as { preferences?: { savedAt?: unknown } })
			.preferences;
		assert.equal(
			attached?.savedAt,
			BASE_SAVED_AT,
			`к отказу не приложено действующее значение настроек: ${refusal.body}`,
		);
	});

	test("одновременные сохранения: свежее выживает, устаревшее не ложится в базу", async () => {
		const organizationId = organizationIdByKey.get("concurrent") ?? "";
		const seed = await putPreferences(
			organizationId,
			preferencesPayload("owner", "2026-05-20", BASE_SAVED_AT),
		);
		assert.equal(
			seed.statusCode,
			200,
			`посев копии не сохранился: ${seed.body}`,
		);

		const [fresh, stale] = await Promise.all([
			putPreferences(
				organizationId,
				preferencesPayload("owner", "2026-05-21", FRESH_SAVED_AT),
			),
			putPreferences(
				organizationId,
				preferencesPayload("assistant", "", STALE_SAVED_AT),
			),
		]);

		/*
		 * Код ответа устаревшего сохранения не закрепляется: при истинном
		 * пересечении оно может успеть записаться ПЕРВЫМ и получить 200, после чего
		 * свежее его перебьёт. Закрепляется то, что действительно обязано быть
		 * одинаковым при любом порядке: свежее принято, а в базе осталось свежее.
		 */
		assert.equal(
			fresh.statusCode,
			200,
			`свежее сохранение отвергнуто: ${fresh.body}`,
		);
		assert.ok(
			stale.statusCode === 409 || stale.statusCode === 200,
			`неожиданный код у устаревшего сохранения: ${stale.body}`,
		);

		const stored = await getPreferences(organizationId);
		assert.equal(
			stored?.savedAt,
			FRESH_SAVED_AT,
			"в хранилище осталось не свежее время",
		);
		assert.equal(
			stored?.selectedWorkspaceRole,
			"owner",
			"роль рабочего места откатилась",
		);
		assert.equal(
			stored?.scheduleDateFilter,
			"2026-05-21",
			"фильтр расписания откатился",
		);

		const rows = await independentStoredPreferences(organizationId);
		assert.equal(
			rows.length,
			1,
			`копий настроек в базе ${rows.length}, ожидалась одна`,
		);
		assert.equal(
			rows[0]?.saved_at,
			FRESH_SAVED_AT,
			"независимый SQL: в базе не свежее время",
		);
		assert.equal(
			rows[0]?.role,
			"owner",
			"независимый SQL: в базе откатившаяся роль",
		);
	});

	test("путь без базы ведёт себя РОВНО так же, как путь с базой", async () => {
		assert.equal(
			databaseRecords.length,
			SCENARIOS.length,
			"путь с базой прошёл не все сценарии — сверять пути нечем",
		);

		process.env.DENTAL_STATE_PERSISTENCE = "off";
		const memoryRecords: ScenarioRecord[] = [];
		try {
			for (const scenario of SCENARIOS) {
				const record = normalizeRecord(await runScenario(scenario), scenario);
				assertRecordMatchesScenario(record, scenario, "путь без базы");
				memoryRecords.push(record);
			}
		} finally {
			delete process.env.DENTAL_STATE_PERSISTENCE;
		}

		assert.deepEqual(
			memoryRecords,
			databaseRecords,
			"путь без базы и путь с базой разошлись — это отдельный класс дефекта, " +
				"его в этом дереве ловили дважды: правило обязано быть ОДНО, а не два похожих",
		);
	});
});
