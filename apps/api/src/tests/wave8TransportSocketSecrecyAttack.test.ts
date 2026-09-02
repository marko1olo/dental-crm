/**
 * wave8TransportSocketSecrecyAttack.test.ts
 *
 * ВОЛНА 8 АТАК: АТАКА НА ИСХОДЯЩИЕ ШЛЮЗЫ ТРАНСПОРТА (TELEGRAM, WHATSAPP, SMS)
 * ПЕНТЕСТ АППАРАТНОЙ БЛОКИРОВКИ ВРАЧЕБНОЙ ТАЙНЫ (152-ФЗ / 323-ФЗ ст. 13) ДО ВЫЗОВА СЕТЕВОГО СОКЕТА FETCH
 *
 * Цель атаки:
 * Попытаться отправить через низкоуровневые транспортные функции:
 * 1. sendTelegramTextMessage (диагноз пульпит K04.0, удаление нерва, зуб 46);
 * 2. sendTelegramPhotoMessage (диагноз в подписи снимка: периапикальный абсцесс K04.7);
 * 3. sendWhatsappTextMessage (специальная категория: ВИЧ B20, гепатит B18.2, пародонтит K05.3).
 *
 * Проверка сокета:
 * Если globalThis.fetch вызывается хотя бы 1 раз при наличии медицинского диагноза —
 * фиксируется КРИТИЧЕСКИЙ ПРОБОЙ ПЕРИМЕТРА БЕЗОПАСНОСТИ (утечка незашифрованных ПДн во внешнюю сеть).
 * Транспорт ОБЯЗАН синхронно блокировать отправку до любого сетевого вызова!
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	sendTelegramTextMessage,
	sendTelegramPhotoMessage,
} from "../telegramTransport.js";
import {
	sendWhatsappTextMessage,
} from "../whatsappTransport.js";
import {
	sendSms,
} from "../smsTransport.js";

test("RED-TEAM HAMMER: WAVE 8 — External Transport Socket Secrecy Attack", async (suite) => {
	// =========================================================================
	// АТАКА 1: TELEGRAM TEXT TRANSPORT — ИНЪЕКЦИЯ ПУЛЬПИТА И УДАЛЕНИЯ НЕРВА
	// =========================================================================
	await suite.test("ATTACK 1: Telegram Text Transport Socket Interception", async (t) => {
		let fetchCallCount = 0;
		let interceptedUrl = "";
		let interceptedBody = "";

		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			fetchCallCount++;
			interceptedUrl = String(input);
			interceptedBody = typeof init?.body === "string" ? init.body : "";
			return new Response(JSON.stringify({ ok: true, result: { message_id: 99999 } }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch;

		try {
			const maliciousText = "Уважаемый пациент! У вас острый пульпит K04.0 зуба 46, срочно придите на удаление нерва.";

			const result = await sendTelegramTextMessage({
				botToken: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
				chatId: "987654321",
				text: maliciousText,
			});

			console.log(
				"\n[RED-TEAM AUDIT 1: Telegram Text Transport]\nResult:",
				JSON.stringify(result),
				"\nFetch Called:",
				fetchCallCount,
				"\nIntercepted URL:",
				interceptedUrl,
			);

			if (fetchCallCount > 0) {
				console.error(
					"\n[CRITICAL VULNERABILITY]: Диагноз передан в сокет Telegram API (fetch был вызван)!",
					"\nIntercepted Body:",
					interceptedBody,
				);
				assert.fail(
					`КАТАСТРОФИЧЕСКИЙ БРАК: sendTelegramTextMessage вызвал внешний сетевой сокет fetch с открытым медицинским диагнозом!\nURL: ${interceptedUrl}\nBody: ${interceptedBody}`,
				);
			}

			assert.equal(result.ok, false, "Транспорт должен вернуть ok: false при обнаружении врачебной тайны");
			console.log("✔ sendTelegramTextMessage аппаратно заблокировал отправку до вызова сетевого сокета");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	// =========================================================================
	// АТАКА 2: TELEGRAM PHOTO CAPTION — ИНЪЕКЦИЯ ДИАГНОЗА В ПОДПИСЬ К СНИМКУ
	// =========================================================================
	await suite.test("ATTACK 2: Telegram Photo Caption Socket Interception", async (t) => {
		let fetchCallCount = 0;
		let interceptedUrl = "";
		let interceptedBody = "";

		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			fetchCallCount++;
			interceptedUrl = String(input);
			interceptedBody = typeof init?.body === "string" ? init.body : "";
			return new Response(JSON.stringify({ ok: true, result: { message_id: 88888 } }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch;

		try {
			const maliciousCaption = "Прицельный снимок: периапикальный абсцесс K04.7 зуба 21. Назначена резекция верхушки корня.";

			const result = await sendTelegramPhotoMessage({
				botToken: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
				chatId: "987654321",
				photoUrl: "https://clinic.example.com/xray/21.png",
				caption: maliciousCaption,
			});

			console.log(
				"\n[RED-TEAM AUDIT 2: Telegram Photo Transport]\nResult:",
				JSON.stringify(result),
				"\nFetch Called:",
				fetchCallCount,
				"\nIntercepted URL:",
				interceptedUrl,
			);

			if (fetchCallCount > 0) {
				console.error(
					"\n[CRITICAL VULNERABILITY]: Диагноз и вид операции переданы в сокет Telegram sendPhoto!",
					"\nIntercepted Body:",
					interceptedBody,
				);
				assert.fail(
					`КАТАСТРОФИЧЕСКИЙ БРАК: sendTelegramPhotoMessage отправил диагноз во внешнюю сеть Telegram!\nURL: ${interceptedUrl}\nBody: ${interceptedBody}`,
				);
			}

			assert.equal(result.ok, false, "Транспорт должен вернуть ok: false при обнаружении врачебной тайны");
			console.log("✔ sendTelegramPhotoMessage аппаратно заблокировал отправку до вызова сетевого сокета");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	// =========================================================================
	// АТАКА 3: WHATSAPP CLOUD API — ИНЪЕКЦИЯ СПЕЦКАТЕГОРИИ ПДН (ВИЧ / ГЕПАТИТ)
	// =========================================================================
	await suite.test("ATTACK 3: WhatsApp Cloud API Socket Interception", async (t) => {
		let fetchCallCount = 0;
		let interceptedUrl = "";
		let interceptedBody = "";

		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			fetchCallCount++;
			interceptedUrl = String(input);
			interceptedBody = typeof init?.body === "string" ? init.body : "";
			return new Response(JSON.stringify({ messages: [{ id: "wamid.HBgL..." }] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch;

		try {
			const maliciousWaText = "Результаты анализов: выявлена ВИЧ-инфекция (код B20) и хронический вирусный гепатит C (B18.2). Пародонтит K05.3.";

			const result = await sendWhatsappTextMessage({
				phoneNumberId: "100998877665544",
				accessToken: "EAABwz...",
				toPhoneE164: "79991112233",
				text: maliciousWaText,
			});

			console.log(
				"\n[RED-TEAM AUDIT 3: WhatsApp Text Transport]\nResult:",
				JSON.stringify(result),
				"\nFetch Called:",
				fetchCallCount,
				"\nIntercepted URL:",
				interceptedUrl,
			);

			if (fetchCallCount > 0) {
				console.error(
					"\n[CRITICAL VULNERABILITY]: Специальная категория ПДн (ВИЧ/Гепатит) передана в сокет Meta WhatsApp Graph API!",
					"\nIntercepted Body:",
					interceptedBody,
				);
				assert.fail(
					`КАТАСТРОФИЧЕСКИЙ БРАК: sendWhatsappTextMessage отправил сведения о ВИЧ и Гепатите в Meta Graph API!\nURL: ${interceptedUrl}\nBody: ${interceptedBody}`,
				);
			}

			assert.equal(result.ok, false, "Транспорт должен вернуть ok: false при обнаружении сведений о здоровье");
			console.log("✔ sendWhatsappTextMessage аппаратно заблокировал отправку до вызова сетевого сокета");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	// =========================================================================
	// АТАКА 4: SMS GATEWAY TRANSPORT — ИНЪЕКЦИЯ ДИАГНОЗА В ПРОВАЙДЕРЫ SMS.RU / SMSC
	// =========================================================================
	await suite.test("ATTACK 4: SMS Gateway Transport Socket Interception", async (t) => {
		let fetchCallCount = 0;
		let interceptedUrl = "";
		let interceptedBody = "";

		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			fetchCallCount++;
			interceptedUrl = String(input);
			interceptedBody = typeof init?.body === "string" ? init.body : "";
			return new Response(JSON.stringify({ status: "OK", status_code: 100, sms: { "79991112233": { status: "OK", status_code: 100, sms_id: "000-111" } } }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch;

		try {
			const maliciousSmsText = "Вам необходимо срочно явиться: обострение пульпита K04.0, удаление нерва зуба 36.";

			const result = await sendSms({
				credentials: {
					provider: "smsru",
					apiId: "test-api-id-12345678",
					baseUrl: "https://sms.ru",
				},
				toMsisdn: "79991112233",
				text: maliciousSmsText,
			});

			console.log(
				"\n[RED-TEAM AUDIT 4: SMS Gateway Transport]\nResult:",
				JSON.stringify(result),
				"\nFetch Called:",
				fetchCallCount,
				"\nIntercepted URL:",
				interceptedUrl,
			);

			if (fetchCallCount > 0) {
				console.error(
					"\n[CRITICAL VULNERABILITY]: Диагноз передан в сокет SMS-шлюза (fetch был вызван)!",
					"\nIntercepted Body:",
					interceptedBody,
				);
				assert.fail(
					`КАТАСТРОФИЧЕСКИЙ БРАК: sendSms отправил медицинский диагноз в SMS-шлюз!\nURL: ${interceptedUrl}\nBody: ${interceptedBody}`,
				);
			}

			assert.equal(result.ok, false, "Транспорт SMS должен вернуть ok: false при обнаружении диагноза");
			console.log("✔ sendSms аппаратно заблокировал отправку до вызова сетевого сокета");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
