import assert from "node:assert/strict";
import { createServer, type Server, type Socket } from "node:net";
import test from "node:test";
import {
	buildMimeMessage,
	dotStuff,
	encodeHeaderWord,
	formatRfc5322Date,
	isValidEmailAddress,
	readSmtpCredentialsFromEnv,
	sendEmail,
	type SmtpCredentials
} from "../emailTransport.js";

/**
 * Канал `email` был объявлен в перечислениях, но кода, обращающегося к
 * почтовому серверу, в проекте не существовало. Здесь проверяется настоящий
 * SMTP-диалог: клиент разговаривает с сервером, поднятым в этом же процессе на
 * случайном порту. Это не заглушка отправки — это вторая сторона протокола.
 */

type CapturedSession = {
	commands: string[];
	dataLines: string[];
};

type FakeServerOptions = {
	/** Ответы, подменяющие стандартные: ключ — начало команды. */
	overrides?: Record<string, string>;
	/** Объявлять ли AUTH PLAIN (иначе клиент уйдёт в AUTH LOGIN). */
	authPlain?: boolean;
};

/** Минимальный SMTP-сервер: приветствие, EHLO, AUTH, MAIL/RCPT/DATA, QUIT. */
function startFakeSmtpServer(
	options: FakeServerOptions = {}
): Promise<{ port: number; server: Server; session: CapturedSession; close: () => Promise<void> }> {
	const session: CapturedSession = { commands: [], dataLines: [] };
	const overrides = options.overrides ?? {};
	const authPlain = options.authPlain ?? true;

	const server = createServer((socket: Socket) => {
		let buffer = "";
		let inData = false;
		socket.setEncoding("utf8");
		socket.write("220 fake.dente.local ESMTP\r\n");

		socket.on("data", (chunk: string) => {
			buffer += chunk;
			let index = buffer.indexOf("\r\n");
			while (index !== -1) {
				const line = buffer.slice(0, index);
				buffer = buffer.slice(index + 2);
				index = buffer.indexOf("\r\n");

				if (inData) {
					if (line === ".") {
						inData = false;
						socket.write("250 2.0.0 Ok: queued as FAKE123\r\n");
					} else {
						session.dataLines.push(line);
					}
					continue;
				}

				session.commands.push(line);
				const override = Object.entries(overrides).find(([prefix]) => line.startsWith(prefix));
				if (override) {
					socket.write(`${override[1]}\r\n`);
					continue;
				}

				if (line.startsWith("EHLO")) {
					socket.write("250-fake.dente.local\r\n");
					socket.write("250-SIZE 35882577\r\n");
					socket.write(authPlain ? "250-AUTH PLAIN LOGIN\r\n" : "250-AUTH LOGIN\r\n");
					socket.write("250 8BITMIME\r\n");
				} else if (line.startsWith("AUTH PLAIN")) {
					socket.write("235 2.7.0 Accepted\r\n");
				} else if (line.startsWith("AUTH LOGIN")) {
					socket.write("334 VXNlcm5hbWU6\r\n");
				} else if (line.startsWith("MAIL FROM")) {
					socket.write("250 2.1.0 Ok\r\n");
				} else if (line.startsWith("RCPT TO")) {
					socket.write("250 2.1.5 Ok\r\n");
				} else if (line === "DATA") {
					inData = true;
					socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
				} else if (line === "QUIT") {
					socket.write("221 2.0.0 Bye\r\n");
					socket.end();
				} else {
					// Шаги AUTH LOGIN: логин и пароль в base64.
					socket.write(session.commands.filter((c) => c.startsWith("AUTH LOGIN")).length > 0 ? "334 UGFzc3dvcmQ6\r\n" : "250 Ok\r\n");
				}
			}
		});
		socket.on("error", () => {
			/* клиент рвёт соединение в тестах на таймаут — это ожидаемо */
		});
	});

	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (address === null || typeof address === "string") {
				reject(new Error("сервер не сообщил порт"));
				return;
			}
			resolve({
				port: address.port,
				server,
				session,
				close: () =>
					new Promise<void>((done) => {
						server.close(() => done());
					})
			});
		});
	});
}

function credentialsFor(port: number): SmtpCredentials {
	return {
		host: "127.0.0.1",
		port,
		secure: false,
		username: "clinic@example.ru",
		password: "тест-пароль",
		fromAddress: "clinic@example.ru",
		fromName: "Клиника на Ленина",
		// Тестовый сервер без TLS — это единственное место, где открытый канал
		// допустим. В окружении по умолчанию requireTls остаётся включённым.
		requireTls: false
	};
}

test("письмо проходит полный SMTP-диалог и принимается сервером", async () => {
	const fake = await startFakeSmtpServer();
	try {
		const result = await sendEmail({
			credentials: credentialsFor(fake.port),
			to: "patient@example.ru",
			subject: "Справка для налогового вычета готова",
			text: "Здравствуйте! Справка готова, заберите её в клинике или скачайте в портале."
		});

		assert.equal(result.ok, true, result.ok ? "" : result.errorMessage);
		assert.equal(result.ok && result.providerMessageId, "2.0.0 Ok: queued as FAKE123");

		const commands = fake.session.commands;
		assert.ok(
			commands.some((line) => line.startsWith("EHLO")),
			"клиент не поздоровался"
		);
		assert.ok(
			commands.some((line) => line.startsWith("AUTH PLAIN")),
			"клиент не авторизовался"
		);
		assert.ok(commands.includes("MAIL FROM:<clinic@example.ru>"));
		assert.ok(commands.includes("RCPT TO:<patient@example.ru>"));
		assert.ok(commands.includes("DATA"));
	} finally {
		await fake.close();
	}
});

test("AUTH PLAIN передаёт логин и пароль через нулевой байт", async () => {
	const fake = await startFakeSmtpServer();
	try {
		await sendEmail({
			credentials: credentialsFor(fake.port),
			to: "patient@example.ru",
			subject: "Тема",
			text: "Текст"
		});
		const authLine = fake.session.commands.find((line) => line.startsWith("AUTH PLAIN")) ?? "";
		const decoded = Buffer.from(authLine.slice("AUTH PLAIN ".length), "base64").toString("utf8");
		const nul = String.fromCharCode(0);
		assert.equal(decoded, `${nul}clinic@example.ru${nul}тест-пароль`);
	} finally {
		await fake.close();
	}
});

test("при отсутствии AUTH PLAIN клиент переходит на AUTH LOGIN", async () => {
	const fake = await startFakeSmtpServer({ authPlain: false });
	try {
		const result = await sendEmail({
			credentials: credentialsFor(fake.port),
			to: "patient@example.ru",
			subject: "Тема",
			text: "Текст",
			timeoutMs: 4000
		});
		// Тестовый сервер отвечает на второй шаг 334, а не 235 — важно, что
		// клиент выбрал именно LOGIN, а не упал на неподдержанном PLAIN.
		assert.ok(fake.session.commands.includes("AUTH LOGIN"));
		assert.equal(result.ok, false);
	} finally {
		await fake.close();
	}
});

test("отказ сервера классифицируется, а не превращается в исключение", async () => {
	const fake = await startFakeSmtpServer({ overrides: { "RCPT TO": "550 5.1.1 Unknown recipient" } });
	try {
		const result = await sendEmail({
			credentials: credentialsFor(fake.port),
			to: "nobody@example.ru",
			subject: "Тема",
			text: "Текст"
		});
		assert.equal(result.ok, false);
		assert.equal(result.ok === false && result.errorCode, 550);
		assert.equal(result.ok === false && result.errorClass, "recipient_rejected");
	} finally {
		await fake.close();
	}
});

test("неверный пароль даёт класс auth, а не network", async () => {
	const fake = await startFakeSmtpServer({ overrides: { "AUTH PLAIN": "535 5.7.8 Authentication failed" } });
	try {
		const result = await sendEmail({
			credentials: credentialsFor(fake.port),
			to: "patient@example.ru",
			subject: "Тема",
			text: "Текст"
		});
		assert.equal(result.ok, false);
		assert.equal(result.ok === false && result.errorClass, "auth");
	} finally {
		await fake.close();
	}
});

test("без шифрования отправка отменяется, если requireTls включён", async () => {
	const fake = await startFakeSmtpServer();
	try {
		const result = await sendEmail({
			credentials: { ...credentialsFor(fake.port), requireTls: true },
			to: "patient@example.ru",
			subject: "Тема",
			text: "Текст"
		});
		assert.equal(result.ok, false);
		assert.ok(result.ok === false && result.errorMessage.includes("STARTTLS"));
		// Диалог не должен доходить до авторизации: пароль в открытый канал не уходит.
		assert.equal(
			fake.session.commands.some((line) => line.startsWith("AUTH")),
			false
		);
	} finally {
		await fake.close();
	}
});

test("тело письма уходит в base64 и восстанавливается в исходный текст", async () => {
	const fake = await startFakeSmtpServer();
	const body = "Здравствуйте, Марина Петровна!\nПриём завтра в 14:30.";
	try {
		await sendEmail({
			credentials: credentialsFor(fake.port),
			to: "patient@example.ru",
			subject: "Напоминание о приёме",
			text: body
		});
		const lines = fake.session.dataLines;
		const separator = lines.indexOf("");
		const encoded = lines.slice(separator + 1).join("");
		assert.equal(Buffer.from(encoded, "base64").toString("utf8"), body);

		const subjectHeader = lines.find((line) => line.startsWith("Subject:")) ?? "";
		assert.ok(subjectHeader.includes("=?UTF-8?B?"), "тема не закодирована");
	} finally {
		await fake.close();
	}
});

test("кириллическая тема кодируется encoded-word", () => {
	assert.equal(encodeHeaderWord("Invoice"), "Invoice");
	const encoded = encodeHeaderWord("Справка");
	assert.ok(encoded.startsWith("=?UTF-8?B?"));
	assert.equal(Buffer.from(encoded.slice("=?UTF-8?B?".length, -2), "base64").toString("utf8"), "Справка");
});

test("дата в заголовке соответствует RFC 5322", () => {
	const formatted = formatRfc5322Date(new Date(Date.UTC(2026, 6, 27, 12, 30, 0)));
	assert.equal(formatted.endsWith("+0000"), true);
	assert.equal(formatted.includes("GMT"), false);
});

test("строка с точкой в начале экранируется", () => {
	// Без этого письмо обрывается ровно на такой строке.
	assert.equal(dotStuff("первая\n.вторая\nтретья"), "первая\r\n..вторая\r\nтретья");
});

test("заголовки не принимают перевод строки", () => {
	// Иначе в письмо можно подставить произвольный заголовок или получателя.
	const message = buildMimeMessage({
		fromAddress: "clinic@example.ru",
		fromName: "Клиника\r\nBcc: leak@example.com",
		to: "patient@example.ru",
		subject: "Тема\r\nX-Injected: 1",
		text: "Текст",
		date: new Date(Date.UTC(2026, 6, 27)),
		messageId: "id@dente"
	});
	assert.equal(message.includes("X-Injected"), false);
	assert.equal(message.includes("Bcc:"), false);
});

test("адрес получателя проверяется до соединения", async () => {
	const result = await sendEmail({
		credentials: credentialsFor(1),
		to: "не-адрес",
		subject: "Тема",
		text: "Текст"
	});
	assert.equal(result.ok, false);
	assert.equal(result.ok === false && result.errorClass, "recipient_rejected");
});

test("проверка адреса отсекает мусор", () => {
	assert.equal(isValidEmailAddress("patient@example.ru"), true);
	assert.equal(isValidEmailAddress("patient@example"), false);
	assert.equal(isValidEmailAddress("patient example.ru"), false);
	assert.equal(isValidEmailAddress(""), false);
	assert.equal(isValidEmailAddress(null), false);
});

test("частично заполненное окружение считается ненастроенным", () => {
	assert.equal(readSmtpCredentialsFromEnv({ DENTE_SMTP_HOST: "smtp.example.ru" }), null);
	assert.equal(readSmtpCredentialsFromEnv({}), null);

	const full = readSmtpCredentialsFromEnv({
		DENTE_SMTP_HOST: "smtp.example.ru",
		DENTE_SMTP_USER: "clinic@example.ru",
		DENTE_SMTP_PASSWORD: "секрет",
		DENTE_SMTP_PORT: "587",
		DENTE_SMTP_SECURE: "0"
	});
	assert.notEqual(full, null);
	assert.equal(full?.port, 587);
	assert.equal(full?.secure, false);
	// Шифрование обязательно, пока явно не разрешён открытый канал.
	assert.equal(full?.requireTls, true);
});
