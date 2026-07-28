import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { organizations, patientArchiveReasonsAndBlacklists, patients } from "../../db/schema.js";
import { isPatientBookingBlocked } from "../../db/patientArchiveReasonsAndBlacklistsQuery.js";
import { fixtureUuid, purgeFixtureOrganizations } from "../support/fixtureOrganizations.js";

/**
 * ЧЁРНЫЙ СПИСОК ОБЯЗАН ОТВЕЧАТЬ В БЕЗОПАСНУЮ СТОРОНУ.
 *
 * ЧТО БЫЛО. `isPatientBookingBlocked` глушила ошибки базы двумя `catch` и оба раза
 * отвечала в сторону «разрешено»: внешний возвращал набор из памяти процесса
 * (после перезапуска сервера он ПУСТ), внутренний молча оставлял ФИО пустым, из-за
 * чего правило чёрного списка ПО ИМЕНИ переставало применяться. Клиника внесла
 * человека в чёрный список, база икнула — и запись на приём прошла.
 *
 * Чёрный список защищает персонал и других пациентов, поэтому «не смог проверить»
 * обязано означать отказ, а не разрешение. Доступность от этого не страдает:
 * единственный вызывающий (db/appointmentsQuery.ts) сразу после проверки ВСТАВЛЯЕТ
 * строку в ту же базу, то есть при недоступной базе запись не создалась бы и так.
 *
 * КАК ЗДЕСЬ ПРОВЕРЯЕТСЯ ОТКАЗ БЕЗ МОКОВ. Функция получает организацию, которая не
 * является UUID. PostgreSQL отвергает такое сравнение по типу колонки, то есть
 * возникает НАСТОЯЩАЯ ошибка базы, а не подделанная. Это и есть ветка `catch`.
 * Проверка умеет покраснеть: верни в функцию прежний `return inMemoryBlacklist.has(...)`
 * — и первый тест ниже упадёт, потому что вызов вернёт false вместо отказа.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx --test src/tests/routes/blacklistFailsClosed.test.ts
 */

const NAMESPACE = "blacklistFailsClosed";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_NAME = "Гаврилов Пётр Игнатьевич";

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	// Намеренно узкая проверка: прежняя ловила любое «does not exist», включая
	// отсутствующую КОЛОНКУ, и расхождение схемы с кодом молча уходило в skip.
	return /ECONNREFUSED|ENOTFOUND|password authentication|getaddrinfo|Connection terminated/i.test(message);
}

describe("чёрный список отвечает в безопасную сторону", () => {
	let databaseAvailable = true;

	before(async () => {
		try {
			// Уборка НА ВХОДЕ: прогон, убитый снаружи, до after не доходит.
			await purgeFixtureOrganizations([ORG_ID]);
			await db.insert(organizations).values({ id: ORG_ID, name: "Клиника чёрного списка" });
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: PATIENT_NAME
			});
			await db.insert(patientArchiveReasonsAndBlacklists).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				patientName: PATIENT_NAME,
				archiveReason: "Проверка безопасной стороны",
				isBookingBlocked: true
			});
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) await purgeFixtureOrganizations([ORG_ID]);
	});

	test("сбой базы даёт отказ с человеческой причиной, а не «не запрещено»", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Организация не UUID — PostgreSQL отвергает сравнение по типу колонки.
		// Это настоящая ошибка базы, а не подделанная.
		const thrown = await isPatientBookingBlocked("организация-которой-нет", PATIENT_ID).then(
			(value) => ({ kind: "вернула" as const, value }),
			(error: unknown) => ({ kind: "упала" as const, error })
		);

		assert.equal(
			thrown.kind,
			"упала",
			`при сбое базы проверка обязана отказать, а она вернула ${JSON.stringify(
				thrown.kind === "вернула" ? thrown.value : null
			)} — значит пациента из чёрного списка можно записать`
		);
		const message = thrown.kind === "упала" && thrown.error instanceof Error ? thrown.error.message : "";
		assert.match(message, /чёрный список/i, `причина отказа должна называть чёрный список, получено «${message}»`);
		assert.match(message, /Запись не создана/i, "причина отказа должна называть последствие для записи");
		assert.ok(
			!/undefined|null|Error:|invalid input syntax/i.test(message),
			`в тексте для администратора не должно быть кличек кода, получено «${message}»`
		);
	});

	test("внесённый в чёрный список пациент остаётся запрещённым", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		assert.equal(await isPatientBookingBlocked(ORG_ID, PATIENT_ID), true);
	});

	test("пациент без запрета остаётся разрешённым", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		await db
			.delete(patientArchiveReasonsAndBlacklists)
			.where(eq(patientArchiveReasonsAndBlacklists.organizationId, ORG_ID));
		assert.equal(
			await isPatientBookingBlocked(ORG_ID, PATIENT_ID),
			false,
			"без строки запрета запись обязана остаться доступной — иначе клиника не сможет записать никого"
		);
	});
});
