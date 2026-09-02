import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { collaborativeChatProcessingStates, organizations } from "../../db/schema.js";
import { registerCommunicationRoutes } from "../../routes/communications.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const ORG_ID_1 = "dce70000-0000-4000-8000-000000000901";
const ORG_ID_2 = "dce70000-0000-4000-8000-000000000902";
const HEADERS_ORG_1 = { "x-organization-id": ORG_ID_1 };
const HEADERS_ORG_2 = { "x-organization-id": ORG_ID_2 };

const CHAT_ID_A = "dce70000-0000-4000-8000-000000000911";
const CHAT_ID_RACE = "dce70000-0000-4000-8000-000000000999";

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(
		message,
	);
}

async function purgeFixtures(): Promise<void> {
	for (const orgId of [ORG_ID_1, ORG_ID_2]) {
		await withFixtureTenant(orgId, async (tx) => {
			await tx
				.delete(collaborativeChatProcessingStates)
				.where(eq(collaborativeChatProcessingStates.organizationId, orgId));
			await tx.delete(organizations).where(eq(organizations.id, orgId));
		});
	}
}

describe("Collaborative Chat Concurrency Locking (PostgreSQL 18)", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await registerCommunicationRoutes(app);

		try {
			await purgeFixtures();

			await withFixtureTenant(ORG_ID_1, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG_ID_1, name: "Клиника Чат-Лок 1" })
					.onConflictDoNothing();
			});

			await withFixtureTenant(ORG_ID_2, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG_ID_2, name: "Клиника Чат-Лок 2" })
					.onConflictDoNothing();
			});
		} catch (error) {
			if (isMissingDatabase(error)) {
				databaseAvailable = false;
				return;
			}
			throw error;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtures();
		}
		await app?.close();
	});

	test("начальный статус: чат свободен", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const res = await app.inject({
			method: "GET",
			url: `/api/communications/chats/${CHAT_ID_A}/lock-status`,
			headers: HEADERS_ORG_1,
		});

		assert.equal(res.statusCode, 200, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.isLocked, false);
		assert.equal(body.lockedByAgent, null);
		assert.equal(body.remainingSeconds, 0);
	});

	test("оператор успешно захватывает блокировку чата на 5 минут", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${CHAT_ID_A}/lock`,
			headers: HEADERS_ORG_1,
			payload: {
				agentName: "Анна Смирнова",
				durationMinutes: 5,
			},
		});

		assert.equal(res.statusCode, 200, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.lockedByAgent, "Анна Смирнова");
		assert.ok(body.lockExpiresAt);

		// Проверяем lock-status
		const statusRes = await app.inject({
			method: "GET",
			url: `/api/communications/chats/${CHAT_ID_A}/lock-status`,
			headers: HEADERS_ORG_1,
		});
		const statusBody = JSON.parse(statusRes.body);
		assert.equal(statusBody.isLocked, true);
		assert.equal(statusBody.lockedByAgent, "Анна Смирнова");
		assert.ok(statusBody.remainingSeconds > 280);
	});

	test("повторный захват тем же оператором продлевает блокировку (идемпотентность)", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${CHAT_ID_A}/lock`,
			headers: HEADERS_ORG_1,
			payload: {
				agentName: "Анна Смирнова",
				durationMinutes: 10,
			},
		});

		assert.equal(res.statusCode, 200, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.lockedByAgent, "Анна Смирнова");
	});

	test("второй оператор получает 409 Conflict при попытке захвата занятого чата", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${CHAT_ID_A}/lock`,
			headers: HEADERS_ORG_1,
			payload: {
				agentName: "Борис Иванов",
				durationMinutes: 5,
			},
		});

		assert.equal(res.statusCode, 409, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ChatAlreadyLockedError");
		assert.equal(body.lockedByAgent, "Анна Смирнова");
		assert.ok(body.expiresAtIso);
		assert.ok(body.message.includes("Анна Смирнова"));
	});

	test("heartbeat от активного оператора продлевает блокировку", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${CHAT_ID_A}/heartbeat`,
			headers: HEADERS_ORG_1,
			payload: {
				agentName: "Анна Смирнова",
				durationMinutes: 7,
			},
		});

		assert.equal(res.statusCode, 200, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.lockedByAgent, "Анна Смирнова");
	});

	test("чужой оператор не может отправить heartbeat на заблокированный чат (409 Conflict)", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${CHAT_ID_A}/heartbeat`,
			headers: HEADERS_ORG_1,
			payload: {
				agentName: "Борис Иванов",
			},
		});

		assert.equal(res.statusCode, 409, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ChatLockMismatchError");
	});

	test("чужой оператор без флага force не может освободить чужую блокировку (409 Conflict)", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${CHAT_ID_A}/unlock`,
			headers: HEADERS_ORG_1,
			payload: {
				agentName: "Борис Иванов",
				force: false,
			},
		});

		assert.equal(res.statusCode, 409, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ChatLockMismatchError");
		assert.equal(body.lockedByAgent, "Анна Смирнова");
	});

	test("активный оператор успешно освобождает блокировку (unlock)", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${CHAT_ID_A}/unlock`,
			headers: HEADERS_ORG_1,
			payload: {
				agentName: "Анна Смирнова",
			},
		});

		assert.equal(res.statusCode, 200, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.released, true);

		// Проверяем lock-status: чат теперь свободен
		const statusRes = await app.inject({
			method: "GET",
			url: `/api/communications/chats/${CHAT_ID_A}/lock-status`,
			headers: HEADERS_ORG_1,
		});
		const statusBody = JSON.parse(statusRes.body);
		assert.equal(statusBody.isLocked, false);
		assert.equal(statusBody.lockedByAgent, null);
	});

	test("после освобождения второй оператор может захватить чат", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${CHAT_ID_A}/lock`,
			headers: HEADERS_ORG_1,
			payload: {
				agentName: "Борис Иванов",
				durationMinutes: 5,
			},
		});

		assert.equal(res.statusCode, 200, res.body);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.lockedByAgent, "Борис Иванов");
	});

	test("мультитенантная изоляция: блокировка в клинике 1 не видна и не мешает клинике 2", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// CHAT_ID_A занят Борисом в клинике 1 (ORG_ID_1).
		// В клинике 2 (ORG_ID_2) тот же самый CHAT_ID_A должен быть свободен:
		const statusResOrg2 = await app.inject({
			method: "GET",
			url: `/api/communications/chats/${CHAT_ID_A}/lock-status`,
			headers: HEADERS_ORG_2,
		});
		assert.equal(statusResOrg2.statusCode, 200);
		const statusBodyOrg2 = JSON.parse(statusResOrg2.body);
		assert.equal(statusBodyOrg2.isLocked, false);

		// Оператор из клиники 2 может свободно захватить этот чат в своей клинике:
		const lockResOrg2 = await app.inject({
			method: "POST",
			url: `/api/communications/chats/${CHAT_ID_A}/lock`,
			headers: HEADERS_ORG_2,
			payload: {
				agentName: "Клиника2 Оператор",
				durationMinutes: 5,
			},
		});
		assert.equal(lockResOrg2.statusCode, 200);
		const lockBodyOrg2 = JSON.parse(lockResOrg2.body);
		assert.equal(lockBodyOrg2.lockedByAgent, "Клиника2 Оператор");

		// А в клинике 1 блокировка Бориса осталась нетронутой:
		const statusResOrg1 = await app.inject({
			method: "GET",
			url: `/api/communications/chats/${CHAT_ID_A}/lock-status`,
			headers: HEADERS_ORG_1,
		});
		const statusBodyOrg1 = JSON.parse(statusResOrg1.body);
		assert.equal(statusBodyOrg1.isLocked, true);
		assert.equal(statusBodyOrg1.lockedByAgent, "Борис Иванов");
	});

	test("СТРЕСС-ТЕСТ RACE CONDITION: 5 параллельных операторов борются за один чат", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const agents = [
			"Оператор 1 (Алексей)",
			"Оператор 2 (Дарья)",
			"Оператор 3 (Елена)",
			"Оператор 4 (Михаил)",
			"Оператор 5 (Светлана)",
		];

		// 5 одновременных запросов на захват одного чата
		const requests = agents.map((agentName) =>
			app.inject({
				method: "POST",
				url: `/api/communications/chats/${CHAT_ID_RACE}/lock`,
				headers: HEADERS_ORG_1,
				payload: {
					agentName,
					durationMinutes: 5,
				},
			}),
		);

		const responses = await Promise.all(requests);

		const successResponses = responses.filter((r) => r.statusCode === 200);
		const conflictResponses = responses.filter((r) => r.statusCode === 409);

		// РОГО ЗОЛОТОЕ ПРАВИЛО: ровно 1 победитель (HTTP 200) и ровно 4 проигравших (HTTP 409)
		assert.equal(
			successResponses.length,
			1,
			`Ожидался ровно 1 успешный захват (200 OK), получено: ${successResponses.length}`,
		);
		assert.equal(
			conflictResponses.length,
			4,
			`Ожидались 4 отказа с кодом 409 Conflict, получено: ${conflictResponses.length}`,
		);

		const winnerBody = JSON.parse(successResponses[0].body);
		const winnerAgent = winnerBody.lockedByAgent;
		assert.ok(agents.includes(winnerAgent));

		// Все 4 проигравших должны указывать на победителя
		for (const conflictRes of conflictResponses) {
			const conflictBody = JSON.parse(conflictRes.body);
			assert.equal(conflictBody.error, "ChatAlreadyLockedError");
			assert.equal(
				conflictBody.lockedByAgent,
				winnerAgent,
				"Ответ 409 должен называть победителя гонки",
			);
		}

		// Физическая проверка в БД: ровно 1 запись в collaborative_chat_processing_states
		const dbRows = await withFixtureTenant(ORG_ID_1, async (tx) =>
			tx
				.select()
				.from(collaborativeChatProcessingStates)
				.where(eq(collaborativeChatProcessingStates.chatId, CHAT_ID_RACE)),
		);

		assert.equal(dbRows.length, 1, "В БД должна быть ровно 1 запись состояния чата");
		assert.equal(dbRows[0].processingAgent, winnerAgent);
		assert.ok(dbRows[0].lockExpiresAt);
	});
});
