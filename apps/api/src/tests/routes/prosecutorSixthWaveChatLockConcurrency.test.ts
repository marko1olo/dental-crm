import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	clinics,
	collaborativeChatProcessingStates,
	organizations,
	users,
} from "../../db/schema.js";
import { registerCommunicationRoutes } from "../../routes/communications.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * ============================================================================
 * PROSECUTOR 2: ШЕСТАЯ ВОЛНА АТАКИ — CHAT LOCK CONCURRENCY & CROSS-TENANT THEFT
 * ============================================================================
 *
 * 1. 5-поточная параллельная гонка за захват chatId (5 concurrent operators):
 *    - Ровно 1 оператор получает HTTP 200 OK.
 *    - Остальные 4 оператора получают HTTP 409 Conflict (ChatAlreadyLockedError).
 *    - В PostgreSQL в collaborative_chat_processing_states строго 1 запись (0 задвоений).
 *
 * 2. Cross-Tenant Theft Attack (Атака межклинического перехвата):
 *    - Клиника А захватывает chat_id.
 *    - Клиника Б (чужой токен) не может сбросить, перехватить или прочитать чужой операторский контекст.
 *
 * 3. Перехват после истечения таймаута (Expired Lock Steal):
 *    - При наступлении lockExpiresAt второй оператор успешно перехватывает чат без дедлока.
 *    - Попытка старого оператора сделать heartbeat отклоняется кодом 409.
 */

const FIXTURE = "prosecutorWave6";

// Клиника А
const ORG_A = fixtureUuid(FIXTURE, 1);
const CLINIC_A = fixtureUuid(FIXTURE, 2);
const DOCTOR_A = fixtureUuid(FIXTURE, 3);

// Клиника Б (чужой тенант)
const ORG_B = fixtureUuid(FIXTURE, 10);
const CLINIC_B = fixtureUuid(FIXTURE, 11);
const DOCTOR_B = fixtureUuid(FIXTURE, 12);

describe("PROSECUTOR 2: ШЕСТАЯ ВОЛНА (CHAT LOCK CONCURRENCY & THEFT)", () => {
	let app: FastifyInstance;
	let headersClinicA: Record<string, string>;
	let headersClinicB: Record<string, string>;
	let databaseAvailable = true;

	const TARGET_CHAT_ID = fixtureUuid(FIXTURE, 100);

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await registerCommunicationRoutes(app);

		headersClinicA = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_A, clinicId: CLINIC_A },
				authTokenSecret(),
			),
			"x-organization-id": ORG_A,
			"content-type": "application/json",
		};

		headersClinicB = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_B, clinicId: CLINIC_B },
				authTokenSecret(),
			),
			"x-organization-id": ORG_B,
			"content-type": "application/json",
		};

		try {
			await withFixtureTenant(ORG_A, async () => {
				await db
					.delete(collaborativeChatProcessingStates)
					.where(eq(collaborativeChatProcessingStates.organizationId, ORG_A));
			});
			await withFixtureTenant(ORG_B, async () => {
				await db
					.delete(collaborativeChatProcessingStates)
					.where(eq(collaborativeChatProcessingStates.organizationId, ORG_B));
			});
			await purgeFixtureOrganizations([ORG_A, ORG_B]);

			// Посев Клиники А
			await withFixtureTenant(ORG_A, async () => {
				await db.insert(organizations).values({
					id: ORG_A,
					name: "Клиника 'Альфа-Связь' (Wave 6 Org A)",
				});
				await db.insert(clinics).values({
					id: CLINIC_A,
					organizationId: ORG_A,
					name: "Филиал Альфа",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: DOCTOR_A,
					organizationId: ORG_A,
					fullName: "Оператор Главный А.А.",
					role: "staff",
				});
			});

			// Посев Клиники Б
			await withFixtureTenant(ORG_B, async () => {
				await db.insert(organizations).values({
					id: ORG_B,
					name: "Клиника 'Бета-Связь' (Wave 6 Org B)",
				});
				await db.insert(clinics).values({
					id: CLINIC_B,
					organizationId: ORG_B,
					name: "Филиал Бета",
					timezone: "Europe/Moscow",
				});
				await db.insert(users).values({
					id: DOCTOR_B,
					organizationId: ORG_B,
					fullName: "Оператор Злоумышленник Б.Б.",
					role: "staff",
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			try {
				await withFixtureTenant(ORG_A, async () => {
					await db
						.delete(collaborativeChatProcessingStates)
						.where(eq(collaborativeChatProcessingStates.organizationId, ORG_A));
				});
				await withFixtureTenant(ORG_B, async () => {
					await db
						.delete(collaborativeChatProcessingStates)
						.where(eq(collaborativeChatProcessingStates.organizationId, ORG_B));
				});
				await purgeFixtureOrganizations([ORG_A, ORG_B]);
			} catch {
				// cleanup ignore
			}
		}
		await app.close();
	});

	// =========================================================================
	// ТЕСТ 1: 5-ПОТОЧНАЯ ПАРАЛЛЕЛЬНАЯ ГОНКА ЗА ЗАХВАТ ЧАТА
	// =========================================================================

	test("ВЕКТОР 6.1 [RACE CONDITION]: 5 одновременных операторов атакуют один chatId", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const operators = [
			"Оператор 1 (Анна)",
			"Оператор 2 (Борис)",
			"Оператор 3 (Виктор)",
			"Оператор 4 (Дарья)",
			"Оператор 5 (Елена)",
		];

		// Запускаем 5 строго одновременных запросов на блокировку одного и того же чата
		const requests = operators.map((op) =>
			app.inject({
				method: "POST",
				url: `/api/communications/chats/${TARGET_CHAT_ID}/lock`,
				headers: headersClinicA,
				payload: {
					agentName: op,
					durationMinutes: 5,
				},
			}),
		);

		const responses = await Promise.all(requests);
		const statusCodes = responses.map((r) => r.statusCode);
		console.log(`[5-OPERATOR CONCURRENT LOCK RESPONSES]:`, statusCodes);

		// 1. Проверка кодов ответа: ровно 1 успешный (200), ровно 4 отказа (409)
		const successResponses = responses.filter((r) => r.statusCode === 200);
		const conflictResponses = responses.filter((r) => r.statusCode === 409);

		assert.equal(
			successResponses.length,
			1,
			`КРИТИЧЕСКИЙ БРАК: Ровно 1 оператор обязан получить блокировку, получено: ${successResponses.length}`,
		);
		assert.equal(
			conflictResponses.length,
			4,
			`КРИТИЧЕСКИЙ БРАК: Ровно 4 оператора обязаны получить 409 Conflict, получено: ${conflictResponses.length}`,
		);

		// Победитель гонки
		const winnerBody = JSON.parse(successResponses[0]!.body);
		const winnerAgent = winnerBody.lockedByAgent;
		console.log(`[ПОБЕДИТЕЛЬ ГОНКИ ЗАХВАТА]: ${winnerAgent}`);

		// Все 4 проигравших должны указывать на победителя
		for (const conflictRes of conflictResponses) {
			const body = JSON.parse(conflictRes.body);
			assert.equal(body.error, "ChatAlreadyLockedError");
			assert.equal(
				body.lockedByAgent,
				winnerAgent,
				"В ответе об ошибке должен быть указан агент-победитель",
			);
		}

		// 2. СУДЕБНАЯ ИНСПЕКЦИЯ БАЗЫ ДАННЫХ POSTGRESQL
		const rowsInDb = await withFixtureTenant(ORG_A, async () =>
			db
				.select()
				.from(collaborativeChatProcessingStates)
				.where(
					and(
						eq(collaborativeChatProcessingStates.organizationId, ORG_A),
						eq(collaborativeChatProcessingStates.chatId, TARGET_CHAT_ID),
					),
				),
		);

		console.log(`[INSPECT POSTGRESQL CHAT LOCK ROWS]:`, rowsInDb);

		assert.equal(
			rowsInDb.length,
			1,
			`КАТАСТРОФИЧЕСКИЙ БРАК: В базе обнаружено ${rowsInDb.length} записей вместо строго 1! Задвоение блокировок!`,
		);
		assert.equal(
			rowsInDb[0]?.processingAgent,
			winnerAgent,
			`Агент в БД должен совпадать с победителем гонки`,
		);

		console.log(
			`[ВЕКТОР 6.1 ОТБИТ]: Гонка 5 параллельных операторов заблокирована!\n` +
				`- Статусы: 1 x 200 OK, 4 x 409 Conflict\n` +
				`- Победитель: ${winnerAgent}\n` +
				`- Записей в таблице PostgreSQL: ровно 1 (ноль задвоений).\n`,
		);
	});

	// =========================================================================
	// ТЕСТ 2: CROSS-TENANT THEFT ATTACK (МЕЖКЛИНИЧЕСКИЙ ЗАХВАТ ЧУЖОГО ЧАТА)
	// =========================================================================

	test("ВЕКТОР 6.2 [CROSS-TENANT THEFT]: Клиника Б не может перехватить или сбросить чужой чат", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Клиника Б пытается разблокировать чужой чат Клиники А
		const unlockAttempt = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${TARGET_CHAT_ID}/unlock`,
			headers: headersClinicB,
			payload: {
				agentName: "Хакер из Клиники Б",
				force: true,
			},
		});

		assert.equal(unlockAttempt.statusCode, 200);
		const unlockBody = JSON.parse(unlockAttempt.body);
		// В контексте Клиники Б такой блокировки не существует, поэтому released: false
		assert.equal(
			unlockBody.released,
			false,
			"КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Клиника Б смогла снять блокировку чата Клиники А!",
		);

		// Проверяем, что в Клинике А блокировка осталась нетронутой!
		const statusInClinicA = await app.inject({
			method: "GET",
			url: `/api/communications/chats/${TARGET_CHAT_ID}/lock-status`,
			headers: headersClinicA,
		});
		assert.equal(statusInClinicA.statusCode, 200);
		const statusBodyA = JSON.parse(statusInClinicA.body);
		assert.equal(
			statusBodyA.isLocked,
			true,
			"КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Блокировка в Клинике А была повреждена действием Клиники Б!",
		);
		assert.ok(statusBodyA.lockedByAgent);

		// Проверяем, видит ли Клиника Б чужого оператора в статусе блокировки
		const statusInClinicB = await app.inject({
			method: "GET",
			url: `/api/communications/chats/${TARGET_CHAT_ID}/lock-status`,
			headers: headersClinicB,
		});
		assert.equal(statusInClinicB.statusCode, 200);
		const statusBodyB = JSON.parse(statusInClinicB.body);
		assert.equal(
			statusBodyB.isLocked,
			false,
			"КРИТИЧЕСКАЯ УТЕЧКА: Клиника Б видит статус чужой блокировки Клиники А!",
		);
		assert.equal(
			statusBodyB.lockedByAgent,
			null,
			"КРИТИЧЕСКАЯ УТЕЧКА PHI: Имя оператора Клиники А утекло в Клинику Б!",
		);

		console.log(
			`[ВЕКТОР 6.2 ОТБИТ]: Межклиническая изоляция блокировок доказана!\n` +
				`- Чужой сброс блокировки не затронул целевую клинику\n` +
				`- Утечка имени оператора между тенантами отсутствует.\n`,
		);
	});

	// =========================================================================
	// ТЕСТ 3: ПЕРЕХВАТ ПОСЛЕ ИСТЕЧЕНИЯ ТАЙМАУТА (EXPIRED LOCK STEAL)
	// =========================================================================

	test("ВЕКТОР 6.3 [EXPIRED LOCK STEAL]: Перехват чата вторым оператором после истечения срока", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// 1. Искусственно переводим существующую блокировку в статус "истекла"
		await withFixtureTenant(ORG_A, async () => {
			const pastDate = new Date(Date.now() - 60 * 1000); // 1 минута назад
			await db
				.update(collaborativeChatProcessingStates)
				.set({ lockExpiresAt: pastDate })
				.where(
					and(
						eq(collaborativeChatProcessingStates.organizationId, ORG_A),
						eq(collaborativeChatProcessingStates.chatId, TARGET_CHAT_ID),
					),
				);
		});

		// 2. Старый оператор пытается отправить heartbeat — обязан получить 409
		const heartbeatRes = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${TARGET_CHAT_ID}/heartbeat`,
			headers: headersClinicA,
			payload: {
				agentName: "Оператор 1 (Анна)", // Бывший владелец
				durationMinutes: 5,
			},
		});

		assert.equal(
			heartbeatRes.statusCode,
			409,
			`Ожидалось 409 при попытке heartbeat истекшей блокировки, получено: ${heartbeatRes.statusCode}`,
		);
		const hbBody = JSON.parse(heartbeatRes.body);
		assert.match(
			hbBody.message,
			/истекла|другим оператором/i,
			"Должно быть указано, что блокировка истекла",
		);

		// 3. Новый оператор (Ольга) захватывает истекший чат
		const stealRes = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${TARGET_CHAT_ID}/lock`,
			headers: headersClinicA,
			payload: {
				agentName: "Оператор Новый (Ольга)",
				durationMinutes: 10,
			},
		});

		assert.equal(
			stealRes.statusCode,
			200,
			`Новый оператор должен успешно перехватить истекший чат, получено: ${stealRes.statusCode}`,
		);
		const stealBody = JSON.parse(stealRes.body);
		assert.equal(stealBody.lockedByAgent, "Оператор Новый (Ольга)");

		// 4. Проверяем в базе: запись обновилась, а не размножилась
		const rowsAfterSteal = await withFixtureTenant(ORG_A, async () =>
			db
				.select()
				.from(collaborativeChatProcessingStates)
				.where(
					and(
						eq(collaborativeChatProcessingStates.organizationId, ORG_A),
						eq(collaborativeChatProcessingStates.chatId, TARGET_CHAT_ID),
					),
				),
		);

		assert.equal(
			rowsAfterSteal.length,
			1,
			"В базе по-прежнему должна быть строго 1 запись",
		);
		assert.equal(
			rowsAfterSteal[0]?.processingAgent,
			"Оператор Новый (Ольга)",
		);

		console.log(
			`[ВЕКТОР 6.3 ОТБИТ]: Истекшая блокировка успешно перехвачена новым оператором!\n` +
				`- Heartbeat старого оператора отвергнут кодом 409\n` +
				`- Новый оператор захватил чат (HTTP 200 OK)\n` +
				`- Запись в БД обновлена на месте без размножения строк.\n`,
		);
	});

	// =========================================================================
	// ТЕСТ 4: ИДЕМПОТЕНТНОЕ ПРОДЛЕНИЕ И ОСВОБОЖДЕНИЕ ТЕМ ЖЕ ОПЕРАТОРОМ
	// =========================================================================

	test("ВЕКТОР 6.4 [IDEMPOTENCY & UNLOCK]: Тот же оператор может повторно продлить и освободить чат", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const agentName = "Оператор Новый (Ольга)";

		// 1. Повторный вызов /lock тем же оператором (идемпотентность / обновление)
		const reLockRes = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${TARGET_CHAT_ID}/lock`,
			headers: headersClinicA,
			payload: { agentName, durationMinutes: 15 },
		});
		assert.equal(reLockRes.statusCode, 200);

		// 2. Heartbeat тем же оператором
		const hbRes = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${TARGET_CHAT_ID}/heartbeat`,
			headers: headersClinicA,
			payload: { agentName, durationMinutes: 20 },
		});
		assert.equal(hbRes.statusCode, 200);

		// 3. Освобождение чата
		const unlockRes = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${TARGET_CHAT_ID}/unlock`,
			headers: headersClinicA,
			payload: { agentName },
		});
		assert.equal(unlockRes.statusCode, 200);
		const unlockBody = JSON.parse(unlockRes.body);
		assert.equal(unlockBody.released, true);

		// 4. Проверка статуса: чат теперь свободен
		const statusRes = await app.inject({
			method: "GET",
			url: `/api/communications/chats/${TARGET_CHAT_ID}/lock-status`,
			headers: headersClinicA,
		});
		assert.equal(statusRes.statusCode, 200);
		const statusBody = JSON.parse(statusRes.body);
		assert.equal(statusBody.isLocked, false);
		assert.equal(statusBody.lockedByAgent, null);

		console.log(
			`[ВЕКТОР 6.4 ОТБИТ]: Идемпотентность, heartbeat и корректное освобождение чата верифицированы.\n`,
		);
	});
});
