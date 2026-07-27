import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import test from "node:test";
import {
	fetchSmsBalance,
	normalizeRussianMsisdn,
	readSmsCredentialsFromEnv,
	sendSms,
	type SmsCredentials
} from "../smsTransport.js";

/**
 * SMS-канал был объявлен в перечислениях и в засеянных шаблонах, но кода,
 * обращающегося к шлюзу, в проекте не существовало: ни одной SMS не уходило.
 * Здесь проверяется настоящий HTTP-обмен со шлюзом — сервер поднимается в этом
 * же процессе и отвечает ровно теми телами, которые отдают SMS.RU и SMSC.
 */

type CapturedRequest = { path: string; body: string };

function startFakeGateway(
	handler: (request: CapturedRequest) => { status?: number; json: unknown }
): Promise<{ baseUrl: string; server: Server; requests: CapturedRequest[]; close: () => Promise<void> }> {
	const requests: CapturedRequest[] = [];
	const server = createServer((request: IncomingMessage, response: ServerResponse) => {
		let body = "";
		request.on("data", (chunk) => {
			body += String(chunk);
		});
		request.on("end", () => {
			const captured = { path: request.url ?? "", body };
			requests.push(captured);
			const result = handler(captured);
			response.writeHead(result.status ?? 200, { "content-type": "application/json; charset=utf-8" });
			response.end(JSON.stringify(result.json));
		});
	});

	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (address === null || typeof address === "string") {
				reject(new Error("шлюз не сообщил порт"));
				return;
			}
			resolve({
				baseUrl: `http://127.0.0.1:${address.port}`,
				server,
				requests,
				close: () =>
					new Promise<void>((done) => {
						server.close(() => done());
					})
			});
		});
	});
}

function smsRuCredentials(baseUrl: string): SmsCredentials {
	return { provider: "smsru", apiId: "test-api-id", login: null, password: null, sender: "CLINIC", baseUrl };
}

function smscCredentials(baseUrl: string): SmsCredentials {
	return { provider: "smsc", apiId: null, login: "clinic", password: "секрет", sender: "CLINIC", baseUrl };
}

test("SMS.RU: успешная отправка возвращает идентификатор сообщения", async () => {
	const gateway = await startFakeGateway(() => ({
		json: {
			status: "OK",
			status_code: 100,
			sms: { "79161234567": { status: "OK", status_code: 100, sms_id: "000000-10000000" } },
			balance: 4122.56
		}
	}));
	try {
		const result = await sendSms({
			credentials: smsRuCredentials(gateway.baseUrl),
			toMsisdn: "79161234567",
			text: "Напоминаем о приёме завтра в 14:30."
		});
		assert.equal(result.ok, true, result.ok ? "" : result.errorMessage);
		assert.equal(result.ok && result.providerMessageId, "000000-10000000");

		const sent = gateway.requests[0];
		assert.equal(sent?.path, "/sms/send");
		assert.ok(sent?.body.includes("api_id=test-api-id"));
		assert.ok(sent?.body.includes("from=CLINIC"));
	} finally {
		await gateway.close();
	}
});

test("SMS.RU: отказ по конкретному номеру важнее общего OK", async () => {
	// Шлюз отвечает status OK на запрос целиком и при этом отклоняет номер.
	// Читать только верхний уровень — значит считать отправленным то, что не ушло.
	const gateway = await startFakeGateway(() => ({
		json: {
			status: "OK",
			status_code: 100,
			sms: { "79161234567": { status: "ERROR", status_code: 207, status_text: "На этот номер нельзя отправлять" } }
		}
	}));
	try {
		const result = await sendSms({
			credentials: smsRuCredentials(gateway.baseUrl),
			toMsisdn: "79161234567",
			text: "Текст"
		});
		assert.equal(result.ok, false);
		assert.equal(result.ok === false && result.errorCode, 207);
		assert.equal(result.ok === false && result.errorClass, "recipient_unavailable");
	} finally {
		await gateway.close();
	}
});

test("SMS.RU: закончившиеся деньги отделены от прочих ошибок", async () => {
	// Диспетчер не должен повторять такую отправку по кругу: она не пройдёт,
	// пока клиника не пополнит счёт, и это нужно показать администратору.
	const gateway = await startFakeGateway(() => ({ json: { status: "ERROR", status_code: 201 } }));
	try {
		const result = await sendSms({
			credentials: smsRuCredentials(gateway.baseUrl),
			toMsisdn: "79161234567",
			text: "Текст"
		});
		assert.equal(result.ok, false);
		assert.equal(result.ok === false && result.errorClass, "insufficient_funds");
	} finally {
		await gateway.close();
	}
});

test("SMS.RU: неверный ключ доступа — это auth, а не unknown", async () => {
	const gateway = await startFakeGateway(() => ({ json: { status: "ERROR", status_code: 200 } }));
	try {
		const result = await sendSms({
			credentials: smsRuCredentials(gateway.baseUrl),
			toMsisdn: "79161234567",
			text: "Текст"
		});
		assert.equal(result.ok === false && result.errorClass, "auth");
	} finally {
		await gateway.close();
	}
});

test("SMSC: успешная отправка возвращает идентификатор и число частей", async () => {
	const gateway = await startFakeGateway(() => ({ json: { id: 12345, cnt: 2 } }));
	try {
		const result = await sendSms({
			credentials: smscCredentials(gateway.baseUrl),
			toMsisdn: "79161234567",
			text: "Длинный текст напоминания",
			idempotencyKey: "outbox-1"
		});
		assert.equal(result.ok, true);
		assert.equal(result.ok && result.providerMessageId, "12345");
		assert.equal(result.ok && result.segments, 2);

		const sent = gateway.requests[0];
		assert.equal(sent?.path, "/sys/send.php");
		assert.ok(sent?.body.includes("charset=utf-8"));
		// Ключ идемпотентности сворачивается в числовой id шлюза.
		assert.ok(/(^|&)id=\d+/.test(sent?.body ?? ""));
	} finally {
		await gateway.close();
	}
});

test("SMSC: код ошибки классифицируется", async () => {
	const gateway = await startFakeGateway(() => ({ json: { error: "not enough credits", error_code: 3 } }));
	try {
		const result = await sendSms({
			credentials: smscCredentials(gateway.baseUrl),
			toMsisdn: "79161234567",
			text: "Текст"
		});
		assert.equal(result.ok === false && result.errorClass, "insufficient_funds");
	} finally {
		await gateway.close();
	}
});

test("ошибка HTTP не превращается в исключение", async () => {
	const gateway = await startFakeGateway(() => ({ status: 503, json: {} }));
	try {
		const result = await sendSms({
			credentials: smsRuCredentials(gateway.baseUrl),
			toMsisdn: "79161234567",
			text: "Текст"
		});
		assert.equal(result.ok === false && result.errorClass, "server");
		assert.equal(result.ok === false && result.errorCode, 503);
	} finally {
		await gateway.close();
	}
});

test("остаток на счету шлюза читается", async () => {
	const gateway = await startFakeGateway(() => ({ json: { status: "OK", status_code: 100, balance: 1543.2 } }));
	try {
		const balance = await fetchSmsBalance(smsRuCredentials(gateway.baseUrl));
		assert.equal(balance.ok, true);
		assert.equal(balance.ok && balance.balanceRub, 1543.2);
	} finally {
		await gateway.close();
	}
});

test("пустой текст и неприведённый номер отсекаются до обращения к шлюзу", async () => {
	const credentials = smsRuCredentials("http://127.0.0.1:1");

	const emptyText = await sendSms({ credentials, toMsisdn: "79161234567", text: "   " });
	assert.equal(emptyText.ok === false && emptyText.errorClass, "bad_request");

	const badNumber = await sendSms({ credentials, toMsisdn: "916123", text: "Текст" });
	assert.equal(badNumber.ok === false && badNumber.errorClass, "recipient_unavailable");
});

test("номера приводятся к международному формату", () => {
	assert.equal(normalizeRussianMsisdn("+7 (916) 123-45-67"), "79161234567");
	assert.equal(normalizeRussianMsisdn("8 916 123 45 67"), "79161234567");
	assert.equal(normalizeRussianMsisdn("9161234567"), "79161234567");
	assert.equal(normalizeRussianMsisdn("123"), null);
	assert.equal(normalizeRussianMsisdn(null), null);
	assert.equal(normalizeRussianMsisdn(""), null);
});

test("шлюз без ключей считается ненастроенным", () => {
	assert.equal(readSmsCredentialsFromEnv({}), null);
	assert.equal(readSmsCredentialsFromEnv({ DENTE_SMS_PROVIDER: "smsru" }), null);
	assert.equal(readSmsCredentialsFromEnv({ DENTE_SMS_PROVIDER: "smsru", DENTE_SMS_API_ID: "   " }), null);
	assert.equal(readSmsCredentialsFromEnv({ DENTE_SMS_PROVIDER: "smsc", DENTE_SMS_LOGIN: "clinic" }), null);

	const configured = readSmsCredentialsFromEnv({
		DENTE_SMS_PROVIDER: "smsru",
		DENTE_SMS_API_ID: "abc",
		DENTE_SMS_SENDER: "CLINIC"
	});
	assert.equal(configured?.provider, "smsru");
	assert.equal(configured?.baseUrl, "https://sms.ru");
});

test("адрес шлюза можно переопределить — для зеркал и прокси клиники", () => {
	const configured = readSmsCredentialsFromEnv({
		DENTE_SMS_PROVIDER: "smsc",
		DENTE_SMS_LOGIN: "clinic",
		DENTE_SMS_PASSWORD: "секрет",
		DENTE_SMS_BASE_URL: "https://smsc.kz/"
	});
	assert.equal(configured?.baseUrl, "https://smsc.kz");
});
