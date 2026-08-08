/**
 * emailTransport.ts — фактическая отправка электронной почты.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ
 * `email` есть в перечислении каналов, у пациента есть поле `email`, документы
 * (акт, справка для вычета, план лечения) готовятся к выдаче — но отправить их
 * пациенту было нечем. Ни строчки кода, обращающегося к почтовому серверу, в
 * проекте не было. Справку об оплате для налогового вычета клиника отдавала
 * только из рук в руки.
 *
 * Реализован SMTP-клиент поверх node:net / node:tls, без внешних зависимостей:
 * у клиники обычно есть корпоративный ящик (Яндекс 360, Mail.ru для бизнеса,
 * собственный сервер), а не аккаунт в транзакционном сервисе. Поддержаны оба
 * обычных режима — implicit TLS на 465 и STARTTLS на 587.
 *
 * Заголовки и тело собираются по RFC 5322 / RFC 2045: тема кодируется
 * encoded-word, тело — base64, строки, начинающиеся с точки, экранируются
 * (иначе письмо обрывается на середине). Кириллица без этого превращается в
 * «????» у половины получателей.
 *
 * Пароль ящика читается из окружения и не попадает ни в лог, ни в текст ошибки.
 */

import { randomUUID } from "node:crypto";
import { createConnection, type Socket } from "node:net";
import { connect as connectTls, type TLSSocket } from "node:tls";

type EmailErrorClass =
	| "not_configured"
	| "auth"
	| "recipient_rejected"
	| "sender_rejected"
	| "message_rejected"
	| "rate_limited"
	| "bad_request"
	| "timeout"
	| "network"
	| "server"
	| "unknown";

export type EmailTransportResult =
	| {
			ok: true;
			/** Ответ сервера на DATA — обычно содержит очередной идентификатор. */
			providerMessageId: string | null;
			errorCode: null;
			errorClass: null;
			errorMessage: null;
	  }
	| {
			ok: false;
			providerMessageId: null;
			errorCode: number | null;
			errorClass: EmailErrorClass;
			errorMessage: string;
	  };

export type SmtpCredentials = {
	readonly host: string;
	readonly port: number;
	/** true — TLS с первого байта (465). false — открытое соединение и STARTTLS (587). */
	readonly secure: boolean;
	readonly username: string;
	readonly password: string;
	/** Адрес в поле From. */
	readonly fromAddress: string;
	/** Отображаемое имя отправителя. */
	readonly fromName: string | null;
	/**
	 * Требовать шифрование. По умолчанию true: медицинская переписка не должна
	 * уходить открытым текстом, даже если сервер согласен её принять.
	 */
	readonly requireTls: boolean;
};

export type SendEmailInput = {
	readonly credentials: SmtpCredentials;
	readonly to: string;
	readonly subject: string;
	readonly text: string;
	/** HTML-версия. Если задана, письмо уходит как multipart/alternative. */
	readonly html?: string | null;
	readonly replyTo?: string | null;
	readonly timeoutMs?: number;
};

const EMAIL_PATTERN = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;

export function isValidEmailAddress(value: string | null | undefined): boolean {
	const candidate = (value ?? "").trim();
	return candidate.length <= 254 && EMAIL_PATTERN.test(candidate);
}

/**
 * Пустая строка в окружении — «не настроено». Половина настроек почты без
 * второй половины бесполезна, поэтому конфигурация принимается только целиком.
 */
export function readSmtpCredentialsFromEnv(
	env: NodeJS.ProcessEnv = process.env,
): SmtpCredentials | null {
	const host = env.DENTE_SMTP_HOST?.trim();
	const username = env.DENTE_SMTP_USER?.trim();
	const password = env.DENTE_SMTP_PASSWORD?.trim();
	const fromAddress = env.DENTE_SMTP_FROM?.trim() || username;
	if (!host || !username || !password || !fromAddress) return null;
	if (!isValidEmailAddress(fromAddress)) return null;

	const parsedPort = Number.parseInt(env.DENTE_SMTP_PORT?.trim() ?? "", 10);
	const port =
		Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort < 65_536
			? parsedPort
			: 465;
	// Явное значение важнее догадки по порту, но 465 по умолчанию — implicit TLS.
	const secureRaw = env.DENTE_SMTP_SECURE?.trim().toLowerCase();
	const secure =
		secureRaw === undefined || secureRaw === ""
			? port === 465
			: secureRaw === "1" || secureRaw === "true";

	return {
		host,
		port,
		secure,
		username,
		password,
		fromAddress,
		fromName: env.DENTE_SMTP_FROM_NAME?.trim() || null,
		requireTls: env.DENTE_SMTP_ALLOW_PLAINTEXT?.trim() !== "1",
	};
}

/** RFC 2047: тема письма с кириллицей без этого приходит нечитаемой. */
export function encodeHeaderWord(value: string): string {
	const needsEncoding = [...value].some(
		(character) => (character.codePointAt(0) ?? 0) > 126,
	);
	if (!needsEncoding) return value;
	return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** RFC 5322 требует «+0000», а не «GMT», который отдаёт toUTCString(). */
export function formatRfc5322Date(date: Date): string {
	return date.toUTCString().replace(/GMT$/, "+0000");
}

function encodeBase64Body(value: string): string {
	const encoded = Buffer.from(value, "utf8").toString("base64");
	const lines: string[] = [];
	for (let index = 0; index < encoded.length; index += 76) {
		lines.push(encoded.slice(index, index + 76));
	}
	return lines.join("\r\n");
}

/** Заголовок не должен содержать переводов строк — иначе это инъекция. */
function sanitizeHeaderValue(value: string): string {
	return value.replace(/[\r\n]+/g, " ").trim();
}

export type BuildMimeMessageInput = {
	readonly fromAddress: string;
	readonly fromName: string | null;
	readonly to: string;
	readonly subject: string;
	readonly text: string;
	readonly html?: string | null;
	readonly replyTo?: string | null;
	readonly date: Date;
	readonly messageId: string;
};

export function buildMimeMessage(input: BuildMimeMessageInput): string {
	const fromName = input.fromName ? sanitizeHeaderValue(input.fromName) : null;
	const from = fromName
		? `${encodeHeaderWord(fromName)} <${sanitizeHeaderValue(input.fromAddress)}>`
		: sanitizeHeaderValue(input.fromAddress);

	const headers: string[] = [
		`From: ${from}`,
		`To: ${sanitizeHeaderValue(input.to)}`,
		`Subject: ${encodeHeaderWord(sanitizeHeaderValue(input.subject))}`,
		`Date: ${formatRfc5322Date(input.date)}`,
		`Message-ID: <${input.messageId}>`,
		"MIME-Version: 1.0",
	];
	if (input.replyTo)
		headers.push(`Reply-To: ${sanitizeHeaderValue(input.replyTo)}`);

	if (!input.html) {
		headers.push(
			'Content-Type: text/plain; charset="UTF-8"',
			"Content-Transfer-Encoding: base64",
		);
		return `${headers.join("\r\n")}\r\n\r\n${encodeBase64Body(input.text)}`;
	}

	const boundary = `dente-${randomUUID()}`;
	headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

	const parts = [
		`--${boundary}`,
		'Content-Type: text/plain; charset="UTF-8"',
		"Content-Transfer-Encoding: base64",
		"",
		encodeBase64Body(input.text),
		`--${boundary}`,
		'Content-Type: text/html; charset="UTF-8"',
		"Content-Transfer-Encoding: base64",
		"",
		encodeBase64Body(input.html),
		`--${boundary}--`,
	];

	return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
}

/**
 * Точка в начале строки завершает передачу данных в SMTP. Без экранирования
 * письмо обрывается ровно там, где в тексте оказался перенос перед точкой.
 */
export function dotStuff(body: string): string {
	return body
		.replace(/\r\n/g, "\n")
		.replace(/\n/g, "\r\n")
		.replace(/^\./gm, "..");
}

function classifySmtpCode(code: number): EmailErrorClass {
	if (code === 421) return "server";
	if (code === 450 || code === 451 || code === 452) return "server";
	if (code === 454) return "auth";
	if (code === 471) return "rate_limited";
	if (code === 530 || code === 534 || code === 535 || code === 538)
		return "auth";
	if (code === 550 || code === 551 || code === 553) return "recipient_rejected";
	if (code === 552 || code === 554) return "message_rejected";
	if (code >= 500) return "bad_request";
	if (code >= 400) return "server";
	return "unknown";
}

type SmtpSocket = Socket | TLSSocket;

class SmtpProtocolError extends Error {
	constructor(
		readonly code: number | null,
		message: string,
	) {
		super(message);
		this.name = "SmtpProtocolError";
	}
}

/**
 * Читает ответы сервера построчно. SMTP отвечает либо «250 текст», либо
 * многострочно: «250-CAP», …, «250 LAST». Ответ считается полным на строке с
 * пробелом после кода.
 */
class SmtpConversation {
	private buffer = "";
	private pending: {
		resolve: (value: { code: number; lines: string[] }) => void;
		reject: (error: Error) => void;
	} | null = null;
	private failure: Error | null = null;
	private collected: string[] = [];

	constructor(private socket: SmtpSocket) {
		this.attach(socket);
	}

	private attach(socket: SmtpSocket) {
		socket.setEncoding("utf8");
		socket.on("data", (chunk: string) => this.onData(chunk));
		socket.on("error", (error: Error) => this.onFailure(error));
		socket.on("close", () =>
			this.onFailure(new Error("Почтовый сервер закрыл соединение.")),
		);
	}

	/** После STARTTLS общение продолжается в новом, зашифрованном сокете. */
	replaceSocket(socket: SmtpSocket) {
		this.socket.removeAllListeners("data");
		this.socket.removeAllListeners("error");
		this.socket.removeAllListeners("close");
		this.socket = socket;
		this.buffer = "";
		this.failure = null;
		this.attach(socket);
	}

	private onFailure(error: Error) {
		if (this.failure) return;
		this.failure = error;
		const pending = this.pending;
		this.pending = null;
		pending?.reject(error);
	}

	private onData(chunk: string) {
		this.buffer += chunk;
		let newlineIndex = this.buffer.indexOf("\r\n");
		const lines: string[] = [];
		while (newlineIndex !== -1) {
			lines.push(this.buffer.slice(0, newlineIndex));
			this.buffer = this.buffer.slice(newlineIndex + 2);
			newlineIndex = this.buffer.indexOf("\r\n");
		}
		if (lines.length === 0) return;

		this.collected.push(...lines);
		const last = this.collected[this.collected.length - 1] ?? "";
		// Завершающая строка: код, затем пробел. Дефис означает продолжение.
		if (!/^\d{3} /.test(last)) return;

		const complete = this.collected;
		this.collected = [];
		const code = Number.parseInt(last.slice(0, 3), 10);
		const pending = this.pending;
		this.pending = null;
		pending?.resolve({ code, lines: complete });
	}

	read(): Promise<{ code: number; lines: string[] }> {
		if (this.failure) return Promise.reject(this.failure);
		return new Promise((resolve, reject) => {
			this.pending = { resolve, reject };
		});
	}

	write(line: string) {
		this.socket.write(`${line}\r\n`);
	}

	async command(
		line: string,
		expected: number[],
	): Promise<{ code: number; lines: string[] }> {
		this.write(line);
		const response = await this.read();
		if (!expected.includes(response.code)) {
			throw new SmtpProtocolError(
				response.code,
				response.lines.join(" ").slice(0, 300),
			);
		}
		return response;
	}

	get raw(): SmtpSocket {
		return this.socket;
	}
}

function connectPlain(
	host: string,
	port: number,
	timeoutMs: number,
): Promise<Socket> {
	return new Promise((resolve, reject) => {
		const socket = createConnection({ host, port });
		const timer = setTimeout(() => {
			socket.destroy();
			reject(
				new Error(
					`Почтовый сервер ${host}:${port} не ответил за ${timeoutMs} мс`,
				),
			);
		}, timeoutMs);
		socket.once("connect", () => {
			clearTimeout(timer);
			resolve(socket);
		});
		socket.once("error", (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}

function connectSecure(
	host: string,
	port: number,
	timeoutMs: number,
): Promise<TLSSocket> {
	return new Promise((resolve, reject) => {
		const socket = connectTls({ host, port, servername: host });
		const timer = setTimeout(() => {
			socket.destroy();
			reject(
				new Error(
					`Почтовый сервер ${host}:${port} не ответил за ${timeoutMs} мс`,
				),
			);
		}, timeoutMs);
		socket.once("secureConnect", () => {
			clearTimeout(timer);
			resolve(socket);
		});
		socket.once("error", (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}

function upgradeToTls(
	socket: Socket,
	host: string,
	timeoutMs: number,
): Promise<TLSSocket> {
	return new Promise((resolve, reject) => {
		const secured = connectTls({ socket, servername: host });
		const timer = setTimeout(() => {
			secured.destroy();
			reject(new Error("STARTTLS не завершился вовремя."));
		}, timeoutMs);
		secured.once("secureConnect", () => {
			clearTimeout(timer);
			resolve(secured);
		});
		secured.once("error", (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}

function capabilitiesFrom(lines: string[]): Set<string> {
	const capabilities = new Set<string>();
	for (const line of lines.slice(1)) {
		const value = line.slice(4).trim().toUpperCase();
		if (value) capabilities.add(value.split(" ")[0] ?? value);
		if (value.startsWith("AUTH ")) {
			for (const mechanism of value.slice(5).split(/\s+/))
				capabilities.add(`AUTH-${mechanism}`);
		}
	}
	return capabilities;
}

export async function sendEmail(
	input: SendEmailInput,
): Promise<EmailTransportResult> {
	const timeoutMs = Math.max(
		2000,
		Math.min(120_000, input.timeoutMs ?? 20_000),
	);
	const { credentials } = input;

	if (!isValidEmailAddress(input.to)) {
		return {
			ok: false,
			providerMessageId: null,
			errorCode: null,
			errorClass: "recipient_rejected",
			errorMessage: "Адрес получателя некорректен.",
		};
	}
	if (!input.subject.trim() || !input.text.trim()) {
		return {
			ok: false,
			providerMessageId: null,
			errorCode: null,
			errorClass: "bad_request",
			errorMessage: "Письмо без темы или без текста не отправляется.",
		};
	}

	let socket: SmtpSocket | null = null;
	try {
		socket = credentials.secure
			? await connectSecure(credentials.host, credentials.port, timeoutMs)
			: await connectPlain(credentials.host, credentials.port, timeoutMs);

		const conversation = new SmtpConversation(socket);
		const greeting = await conversation.read();
		if (greeting.code !== 220) {
			throw new SmtpProtocolError(greeting.code, greeting.lines.join(" "));
		}

		const clientName = "dente.local";
		let ehlo = await conversation.command(`EHLO ${clientName}`, [250]);
		let capabilities = capabilitiesFrom(ehlo.lines);
		let encrypted = credentials.secure;

		if (!encrypted && capabilities.has("STARTTLS")) {
			await conversation.command("STARTTLS", [220]);
			const secured = await upgradeToTls(
				conversation.raw as Socket,
				credentials.host,
				timeoutMs,
			);
			conversation.replaceSocket(secured);
			socket = secured;
			encrypted = true;
			// После STARTTLS список возможностей выдаётся заново.
			ehlo = await conversation.command(`EHLO ${clientName}`, [250]);
			capabilities = capabilitiesFrom(ehlo.lines);
		}

		if (!encrypted && credentials.requireTls) {
			throw new SmtpProtocolError(
				null,
				"Сервер не предложил STARTTLS. Отправка отменена: медицинская переписка не уходит открытым текстом.",
			);
		}

		if (capabilities.has("AUTH-PLAIN")) {
			// RFC 4616: authzid NUL authcid NUL passwd. Разделитель — нулевой байт,
			// в исходнике он собирается кодом, а не пишется в файл.
			const nul = String.fromCharCode(0);
			const token = Buffer.from(
				`${nul}${credentials.username}${nul}${credentials.password}`,
				"utf8",
			).toString("base64");
			await conversation.command(`AUTH PLAIN ${token}`, [235]);
		} else {
			await conversation.command("AUTH LOGIN", [334]);
			await conversation.command(
				Buffer.from(credentials.username, "utf8").toString("base64"),
				[334],
			);
			await conversation.command(
				Buffer.from(credentials.password, "utf8").toString("base64"),
				[235],
			);
		}

		await conversation.command(`MAIL FROM:<${credentials.fromAddress}>`, [250]);
		await conversation.command(`RCPT TO:<${input.to.trim()}>`, [250, 251]);
		await conversation.command("DATA", [354]);

		const message = buildMimeMessage({
			fromAddress: credentials.fromAddress,
			fromName: credentials.fromName,
			to: input.to.trim(),
			subject: input.subject,
			text: input.text,
			html: input.html ?? null,
			replyTo: input.replyTo ?? null,
			date: new Date(),
			messageId: `${randomUUID()}@dente`,
		});

		conversation.write(dotStuff(message));
		conversation.write(".");
		const accepted = await conversation.read();
		if (accepted.code !== 250) {
			throw new SmtpProtocolError(
				accepted.code,
				accepted.lines.join(" ").slice(0, 300),
			);
		}

		try {
			await conversation.command("QUIT", [221]);
		} catch {
			// Сервер вправе закрыть соединение молча — письмо уже принято.
		}

		return {
			ok: true,
			providerMessageId:
				(accepted.lines[accepted.lines.length - 1] ?? "").slice(4).trim() ||
				null,
			errorCode: null,
			errorClass: null,
			errorMessage: null,
		};
	} catch (error) {
		if (error instanceof SmtpProtocolError) {
			return {
				ok: false,
				providerMessageId: null,
				errorCode: error.code,
				errorClass:
					error.code === null ? "bad_request" : classifySmtpCode(error.code),
				errorMessage: error.message || "Почтовый сервер отклонил письмо.",
			};
		}
		const message = error instanceof Error ? error.message : String(error);
		return {
			ok: false,
			providerMessageId: null,
			errorCode: null,
			errorClass: message.includes("не ответил за") ? "timeout" : "network",
			errorMessage: message,
		};
	} finally {
		socket?.destroy();
	}
}
