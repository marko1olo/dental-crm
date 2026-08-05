import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations, patients, portalOtpCodes } from "../../db/schema.js";
import { portalRoutes } from "../../routes/portal.js";
import {
	LEGACY_SHARED_FIXTURE_ORGANIZATION_IDS,
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

/**
 * Одноразовый код входа в личный кабинет пациента.
 *
 * ЗАЧЕМ ЭТОТ ТЕСТ. До правки routes/portal.ts выдавал сессию личного кабинета
 * по коду «0000»: configuredPortalOtpCode() при NODE_ENV != "production"
 * возвращал `code || "0000"`, а .env задаёт именно development. Любой человек,
 * знающий чужой номер телефона, читал визиты, планы лечения, счета и выданные
 * документы. Тест закрепляет, что этот вход мёртв и что новый код обладает
 * всеми четырьмя свойствами, которых не было: одноразовость, срок годности,
 * потолок попыток и хранение только в виде хеша.
 *
 * ЗАЧЕМ ПО ЖИВОЙ БАЗЕ. Одноразовость обеспечивается условным UPDATE в
 * PostgreSQL, срок годности — сравнением timestamptz на стороне базы, а
 * ограничение CHECK на code_hash тоже живёт в базе. На моках проверялся бы мок.
 *
 * ПОЧЕМУ ИДЕНТИФИКАТОРЫ СЧИТАЮТСЯ, А НЕ ВПИСАНЫ. Здесь стояла организация
 * `dce70000-…-0901`, та же самая, что в patientCreateDuplicateGuard.test.ts и в
 * speechTranscribeChunkAccess.test.ts, а пациент `dce70000-…-0902` совпадал с
 * ОРГАНИЗАЦИЕЙ теста диктовки. Файлы идут параллельно, и получалось так:
 * `after` соседа удалял организацию `…-0901`, после чего вставка пациента здесь
 * падала на `patients_organization_id_organizations_id_fk`, а соседняя уборка
 * «пациентов организации 0901» сносила пациента `…-0902` вместе с ссылками на
 * него и валилась на `portal_otp_codes_patient_id_fkey`. Блок теперь выводится
 * из имени файла, см. tests/support/fixtureOrganizations.ts.
 */

const FIXTURE = "portalOtp";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const PATIENT_ID = fixtureUuid(FIXTURE, 2);
// Суффикс проверен запросом: ни одного другого пациента с такими цифрами нет.
// Маршрут требует ровно одного совпадения, неоднозначность он отвергает.
const PATIENT_PHONE = "+7 913 770-41-58";
const UNKNOWN_PHONE = "+7 999 888-77-66";

describe("одноразовый код входа в личный кабинет", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const logLines: string[] = [];
	const originalEnv = { ...process.env };

	/**
	 * Код в ветке для разработки уходит ТОЛЬКО в журнал сервера — в теле ответа
	 * его нет. Поэтому тест читает его оттуда же, откуда его читает разработчик.
	 */
	function lastDeveloperCode(): string {
		for (let index = logLines.length - 1; index >= 0; index -= 1) {
			try {
				const parsed = JSON.parse(logLines[index] ?? "") as {
					portalOtpDeveloperCode?: unknown;
				};
				if (typeof parsed.portalOtpDeveloperCode === "string") {
					return parsed.portalOtpDeveloperCode;
				}
			} catch {
				// Не JSON-строка журнала — пропускаем.
			}
		}
		throw new Error("В журнале нет кода: ветка для разработки не сработала.");
	}

	async function sendOtp(phone: string) {
		return app.inject({
			method: "POST",
			url: "/api/portal/auth/send-otp",
			payload: { phone },
		});
	}

	async function verifyOtp(phone: string, code: string) {
		return app.inject({
			method: "POST",
			url: "/api/portal/auth/verify-otp",
			payload: { phone, code },
		});
	}

	/**
	 * Сдвигает выданные коды в прошлое, чтобы обойти паузу между отправками и
	 * часовой потолок, не выжидая их в реальном времени.
	 */
	async function shiftIssuedCodesIntoPast(): Promise<void> {
		// UPDATE без тенант-контекста не падает, а трогает НОЛЬ строк: политика
		// скрывает их от запроса, а «ноль изменённых» ошибкой не считается. Коды
		// остались бы свежими, и следующая отправка упёрлась бы в паузу.
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(portalOtpCodes)
				.set({ createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
				.where(eq(portalOtpCodes.patientId, PATIENT_ID));
		});
	}

	async function freshCode(): Promise<string> {
		await shiftIssuedCodesIntoPast();
		const response = await sendOtp(PATIENT_PHONE);
		assert.equal(response.statusCode, 202);
		return lastDeveloperCode();
	}

	before(async () => {
		process.env.NODE_ENV = "development";
		// Ветка реальной отправки требует настроенного шлюза; здесь его быть не
		// должно, иначе тест начнёт слать настоящие SMS и тратить деньги клиники.
		process.env.DENTE_SMS_PROVIDER = "";
		process.env.DENTE_SMS_API_ID = "";
		process.env.DENTE_SMS_LOGIN = "";
		process.env.DENTE_SMS_PASSWORD = "";

		app = Fastify({
			logger: {
				level: "warn",
				stream: {
					write: (line: string) => {
						logLines.push(line);
					},
				},
			},
		});
		await app.register(portalRoutes, { prefix: "/api/portal" });
		await app.ready();

		try {
			// Уборка НА ВХОДЕ: прерванный прогон до after не доходит, а выданные им
			// коды входа ссылаются на пациента и не дают его удалить. Общая клиника
			// прежнего блока снимается тем же вызовом — она осталась от таких обрывов.
			await purgeFixtureOrganizations([
				ORG_ID,
				...LEGACY_SHARED_FIXTURE_ORGANIZATION_IDS,
			]);
			// Сев идёт под тенант-контекстом: в WITH CHECK тенант-таблиц дизъюнкта
			// обхода нет, поэтому вставка без `app.current_tenant` отвергается кодом
			// 42501, а под обходом — тоже 42501 на всём, кроме `organizations`.
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG_ID, name: "Клиника личного кабинета" });
				// Без onConflictDoNothing: молчащий конфликт первичного ключа и оставлял
				// тест работать с чужой строкой вместо своей.
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Портнов Олег Иванович",
					phone: PATIENT_PHONE,
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		// Каталожная уборка снимает и коды входа, и пациента, и саму организацию:
		// порядок удаления она выводит из ссылок, а не из порядка строк здесь.
		if (databaseAvailable) await purgeFixtureOrganizations([ORG_ID]);
		await app?.close();
		process.env = originalEnv;
	});

	test("«0000» больше не открывает чужую медкарту", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Код запрошен по-настоящему: проверяем не «нет кода вообще», а именно то,
		// что прежний универсальный «0000» к действующему коду не подходит.
		await freshCode();

		const response = await verifyOtp(PATIENT_PHONE, "0000");
		assert.equal(response.statusCode, 401);
		assert.equal(response.json().error, "InvalidOtp");
	});

	test("каждый запрос выдаёт новый код, а не общий секрет", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const first = await freshCode();
		const second = await freshCode();

		assert.notEqual(first, second, "два запроса дали один и тот же код");
		assert.match(first, /^\d{6}$/);
		assert.match(second, /^\d{6}$/);
	});

	test("код принимается ровно один раз", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const code = await freshCode();

		const accepted = await verifyOtp(PATIENT_PHONE, code);
		assert.equal(accepted.statusCode, 200);
		const body = accepted.json() as { success: boolean; token: string };
		assert.equal(body.success, true);
		assert.ok(body.token.length > 0, "сессия не выдана");

		// Повтор тем же кодом: строка уже погашена условным UPDATE.
		const replayed = await verifyOtp(PATIENT_PHONE, code);
		assert.equal(replayed.statusCode, 401);
	});

	test("просроченный код не принимается", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const code = await freshCode();
		// Тот же тенант-контекст, что у сева: без него срок годности сдвинулся бы у
		// нуля строк, код остался бы действующим, и проверка стала бы бессмысленной.
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(portalOtpCodes)
				.set({ expiresAt: new Date(Date.now() - 1000) })
				.where(
					and(
						eq(portalOtpCodes.patientId, PATIENT_ID),
						eq(portalOtpCodes.deliveryStatus, "sent"),
					),
				);
		});

		const response = await verifyOtp(PATIENT_PHONE, code);
		assert.equal(response.statusCode, 401);
	});

	test("потолок попыток сжигает код: верный код после перебора уже не примут", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const code = await freshCode();

		// Пять неверных попыток — это ровно потолок по умолчанию.
		for (let attempt = 1; attempt <= 5; attempt += 1) {
			const wrong = await verifyOtp(PATIENT_PHONE, code === "000001" ? "000002" : "000001");
			assert.equal(wrong.statusCode, 401, `попытка ${attempt} должна быть отвергнута`);
		}

		// Шестая попытка — уже с ВЕРНЫМ кодом. Он не должен пройти: иначе потолок
		// попыток не защищает, а лишь замедляет перебор.
		const burned = await verifyOtp(PATIENT_PHONE, code);
		assert.equal(burned.statusCode, 401, "верный код прошёл после исчерпания попыток");

		// Чтение тоже под контекстом: без него политика вернула бы пустой список, и
		// «все коды погашены» оказалось бы истиной на пустом множестве.
		const rows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ consumedAt: portalOtpCodes.consumedAt })
				.from(portalOtpCodes)
				.where(eq(portalOtpCodes.patientId, PATIENT_ID)),
		);
		assert.ok(
			rows.every((row) => row.consumedAt !== null),
			"код не погашен после исчерпания попыток — перебор можно продолжить",
		);
	});

	test("в базе не лежит открытый код", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const code = await freshCode();
		// Без контекста запрос вернул бы ноль строк, и проверка «код не лежит
		// открытым» прошла бы, ни одной сохранённой строки не прочитав.
		const rows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ codeHash: portalOtpCodes.codeHash })
				.from(portalOtpCodes)
				.where(
					and(
						eq(portalOtpCodes.patientId, PATIENT_ID),
						eq(portalOtpCodes.deliveryStatus, "sent"),
					),
				),
		);

		assert.ok(rows.length > 0, "код не сохранён");
		for (const row of rows) {
			assert.notEqual(row.codeHash, code, "код сохранён открытым текстом");
			assert.ok(
				!row.codeHash.includes(code),
				"открытый код виден внутри сохранённого значения",
			);
			// PBKDF2 из utils/cryptoHelper.ts: «соль:хеш», 64 + 1 + 128 символов.
			assert.match(row.codeHash, /^[0-9a-f]{64}:[0-9a-f]{128}$/);
		}
	});

	test("ответ не выдаёт, есть ли такой пациент в клинике", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		await shiftIssuedCodesIntoPast();
		const known = await sendOtp(PATIENT_PHONE);
		const unknown = await sendOtp(UNKNOWN_PHONE);

		assert.equal(known.statusCode, unknown.statusCode);
		// Побайтовое равенство, а не «похожесть»: первая версия дописывала поле
		// delivery только в ветке найденного пациента, и один лишний ключ в JSON
		// превращал публичный маршрут в справочник «лечится ли здесь этот человек».
		assert.equal(known.body, unknown.body);

		// И тот же ответ, когда пациент найден, но пауза между отправками ещё не
		// истекла: иначе повторный запрос отличал бы существующий номер.
		const throttled = await sendOtp(PATIENT_PHONE);
		assert.equal(throttled.statusCode, unknown.statusCode);
		assert.equal(throttled.body, unknown.body);
	});
});
