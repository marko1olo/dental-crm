/**
 * Проверка того, кого диспетчер пропускает, а кого глушит.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ. dispatchDueMessages решает, уйдёт сообщение живому пациенту
 * или нет, и до сих пор не был покрыт ни одним тестом. Правило про ответ на
 * обращение — исключение из проверки согласия, а исключения без тестов со
 * временем превращаются в лазейки: достаточно одному месту поставить
 * назначение transactional_reply рассылке, и запрет обойдён молча.
 *
 * Сеть здесь не нужна: учётных данных канала в тестовой организации нет,
 * поэтому отправка всё равно не состоится. Проверяется ПРИЧИНА, по которой она
 * не состоялась: «нет согласия» — это подавление по закону, «канал не
 * настроен» — техническая невозможность. Первое для ответа на обращение
 * недопустимо, второе ожидаемо.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	communicationOutbox,
	organizations,
	patientCommunicationConsents,
	patients
} from "../db/schema.js";
import { dispatchDueMessages, enqueueMessage } from "../services/communications/dispatcher.js";

/**
 * Причина отказа по закону, а не по технике. Формулировки две — «отказался от
 * сообщений» и «нет согласия», — поэтому шаблон покрывает обе; ловить одно
 * слово «согласие» недостаточно, что этот тест и показал на себе.
 */
const CONSENT_REASON = /отказал|соглас/i;

const ORG_ID = "d0000000-0000-4000-8000-0000000dc001";
const PATIENT_ID = "d0000000-0000-4000-8000-0000000dc101";

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|does not exist|password authentication|ENOTFOUND/i.test(message);
}

/** Причина, по которой сообщение не ушло, — как её видит администратор. */
async function statusOf(dedupeKey: string): Promise<{ status: string; reason: string | null }> {
	const [row] = await db
		.select({ status: communicationOutbox.status, reason: communicationOutbox.lastErrorMessage })
		.from(communicationOutbox)
		.where(and(eq(communicationOutbox.organizationId, ORG_ID), eq(communicationOutbox.dedupeKey, dedupeKey)))
		.limit(1);
	assert.ok(row, `строки очереди ${dedupeKey} нет`);
	return { status: row.status as string, reason: row.reason };
}

describe("диспетчер: согласие и ответ на обращение", () => {
	let databaseAvailable = true;

	before(async () => {
		try {
			await db.insert(organizations).values({ id: ORG_ID, name: "Клиника согласий" }).onConflictDoNothing();
			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Отказавшийся Пётр Петрович",
					phone: "+7 916 000-07-01"
				})
				.onConflictDoNothing();

			// Пациент отказался от сообщений по SMS в обеих областях — так
			// выглядит база сразу после того, как он написал «СТОП».
			await db
				.insert(patientCommunicationConsents)
				.values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						channel: "sms",
						scope: "service",
						state: "revoked",
						source: "inbound_stop"
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						channel: "sms",
						scope: "marketing",
						state: "revoked",
						source: "inbound_stop"
					}
				])
				.onConflictDoNothing();
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await db.delete(communicationOutbox).where(eq(communicationOutbox.organizationId, ORG_ID));
			await db.delete(patientCommunicationConsents).where(eq(patientCommunicationConsents.organizationId, ORG_ID));
			await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
			await db.delete(organizations).where(eq(organizations.id, ORG_ID));
		}
	});

	test("обычное служебное сообщение после отказа глушится по согласию", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const dedupeKey = "test:service-after-revoke";
		const queued = await enqueueMessage({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			channel: "sms",
			intent: "appointment_confirmation",
			scope: "service",
			body: "Напоминаем о приёме завтра в 10:00.",
			dedupeKey
		});
		assert.ok(queued.ok, JSON.stringify(queued));

		await dispatchDueMessages({ organizationId: ORG_ID, batchSize: 10 });

		const result = await statusOf(dedupeKey);
		assert.equal(result.status, "suppressed", JSON.stringify(result));
		assert.ok(CONSENT_REASON.test(result.reason ?? ""), `ожидалась причина про согласие: ${result.reason}`);
	});

	test("ответ на обращение пациента не глушится отозванным согласием", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const dedupeKey = "test:transactional-after-revoke";
		const queued = await enqueueMessage({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			channel: "sms",
			intent: "transactional_reply",
			scope: "service",
			body: "Клиника: вы отписаны от сообщений. Чтобы вернуть, напишите «СТАРТ».",
			dedupeKey
		});
		assert.ok(queued.ok, JSON.stringify(queued));

		await dispatchDueMessages({ organizationId: ORG_ID, batchSize: 10 });

		const result = await statusOf(dedupeKey);
		// Отправка не состоится: у тестовой организации нет учётных данных шлюза.
		// Но причина обязана быть технической, а не «нет согласия» — иначе
		// пациент никогда не узнает, что его просьба принята.
		assert.ok(
			!CONSENT_REASON.test(result.reason ?? ""),
			`ответ на обращение заглушён по согласию: ${result.status} / ${result.reason}`
		);
	});
});
