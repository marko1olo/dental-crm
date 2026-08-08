/**
 * smsTransport.ts — фактическая отправка SMS через шлюз оператора.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ
 * SMS есть в перечислении каналов с нулевой ревизии, шаблон «Напоминание об
 * оплате» засеян именно с `channel: "sms"`, фронтенд рисует канал в фильтрах —
 * но кода, который обращается к какому-либо шлюзу, в проекте не существовало.
 * Ни одной SMS не уходило. При этом напоминание о приёме за сутки и код
 * подтверждения — это то, на чём держится ежедневная работа регистратуры, и в
 * России это по-прежнему SMS, а не мессенджер.
 *
 * Поддержаны два шлюза, покрывающие подавляющее большинство клиник:
 *   - SMS.RU   — https://sms.ru/api/send
 *   - SMSC.RU  — https://smsc.ru/api/http/
 *
 * Устройство повторяет telegramTransport.ts и whatsappTransport.ts: тайм-аут,
 * разбор ответа, классификация ошибки, никаких исключений наружу. Отдельно
 * выделен класс `insufficient_funds`: повторять такую отправку бессмысленно,
 * пока клиника не пополнит счёт, и администратор должен увидеть причину, а не
 * бесконечные попытки.
 *
 * Ключи шлюза читаются из окружения и никогда не попадают ни в лог, ни в ответ
 * API, ни в текст ошибки.
 */

type SmsProviderId = "smsru" | "smsc";

type SmsErrorClass =
	| "not_configured"
	| "rate_limited"
	| "auth"
	| "insufficient_funds"
	| "recipient_unavailable"
	| "bad_request"
	| "timeout"
	| "network"
	| "server"
	| "unknown";

export type SmsTransportResult =
	| {
			ok: true;
			providerMessageId: string | null;
			/** Сегментов, за которые выставит счёт оператор, если шлюз их вернул. */
			segments: number | null;
			errorCode: null;
			errorClass: null;
			errorMessage: null;
	  }
	| {
			ok: false;
			providerMessageId: null;
			segments: null;
			errorCode: number | null;
			errorClass: SmsErrorClass;
			errorMessage: string;
	  };

export type SmsCredentials = {
	readonly provider: SmsProviderId;
	/** SMS.RU: api_id. */
	readonly apiId: string | null;
	/** SMSC.RU: логин. */
	readonly login: string | null;
	/** SMSC.RU: пароль или его MD5. */
	readonly password: string | null;
	/** Имя отправителя, согласованное с оператором. */
	readonly sender: string | null;
	/**
	 * Базовый адрес шлюза. Нужен для зеркал (smsc.kz, smsc.ua) и для клиник,
	 * которые ходят наружу через собственный прокси.
	 */
	readonly baseUrl: string;
};

const DEFAULT_SMS_BASE_URL: Readonly<Record<SmsProviderId, string>> = {
	smsru: "https://sms.ru",
	smsc: "https://smsc.ru",
};

export type SendSmsInput = {
	readonly credentials: SmsCredentials;
	/** Номер получателя, только цифры, в формате 7XXXXXXXXXX. */
	readonly toMsisdn: string;
	readonly text: string;
	readonly timeoutMs?: number;
	/**
	 * Ключ, по которому шлюз отбрасывает дубли. Дублирующее напоминание —
	 * это и лишние деньги, и раздражённый пациент.
	 */
	readonly idempotencyKey?: string | null;
};

/**
 * «+7 (916) 123-45-67», «8 916 123 45 67» → «79161234567».
 * Возвращает null, если номер не похож на российский мобильный: отправлять
 * «куда получится» дороже, чем не отправить и показать администратору ошибку.
 */
export function normalizeRussianMsisdn(
	raw: string | null | undefined,
): string | null {
	const digits = (raw ?? "").replace(/\D/g, "");
	if (
		digits.length === 11 &&
		(digits.startsWith("7") || digits.startsWith("8"))
	) {
		return `7${digits.slice(1)}`;
	}
	if (digits.length === 10 && digits.startsWith("9")) {
		return `7${digits}`;
	}
	// Международные номера длиннее 11 цифр шлюзы принимают как есть.
	if (digits.length >= 11 && digits.length <= 15) return digits;
	return null;
}

/**
 * Пустая строка в переменной окружения — это «не настроено», а не «настроено
 * пустым значением». Иначе отправка молча уходит в шлюз без ключа и падает с
 * невнятным «auth» на каждом сообщении.
 */
export function readSmsCredentialsFromEnv(
	env: NodeJS.ProcessEnv = process.env,
): SmsCredentials | null {
	const provider = env.DENTE_SMS_PROVIDER?.trim().toLowerCase();
	const sender = env.DENTE_SMS_SENDER?.trim() || null;

	const rawBaseUrl = env.DENTE_SMS_BASE_URL?.trim() ?? "";
	const baseUrlOverride = rawBaseUrl ? rawBaseUrl.replace(/[/]+$/, "") : null;

	if (provider === "smsru") {
		const apiId = env.DENTE_SMS_API_ID?.trim();
		if (!apiId) return null;
		return {
			provider: "smsru",
			apiId,
			login: null,
			password: null,
			sender,
			baseUrl: baseUrlOverride ?? DEFAULT_SMS_BASE_URL.smsru,
		};
	}

	if (provider === "smsc") {
		const login = env.DENTE_SMS_LOGIN?.trim();
		const password = env.DENTE_SMS_PASSWORD?.trim();
		if (!login || !password) return null;
		return {
			provider: "smsc",
			apiId: null,
			login,
			password,
			sender,
			baseUrl: baseUrlOverride ?? DEFAULT_SMS_BASE_URL.smsc,
		};
	}

	return null;
}

/**
 * Коды SMS.RU. Расшифровка: https://sms.ru/api/status
 * Классификация нужна диспетчеру: `auth` и `insufficient_funds` повторять
 * бесполезно, `rate_limited` и `server` — можно и нужно.
 */
function classifySmsRuStatus(statusCode: number): SmsErrorClass {
	switch (statusCode) {
		case 200:
		case 300:
		case 301:
		case 302:
			return "auth";
		case 201:
			return "insufficient_funds";
		case 202:
		case 207:
		case 209:
			return "recipient_unavailable";
		case 203:
		case 204:
		case 205:
		case 208:
		case 210:
		case 211:
			return "bad_request";
		case 206:
		case 230:
			return "rate_limited";
		case 220:
			return "server";
		default:
			return "unknown";
	}
}

const SMS_RU_STATUS_TEXT: Readonly<Record<number, string>> = {
	200: "Шлюз SMS.RU не принял ключ доступа.",
	201: "На счету SMS.RU недостаточно средств.",
	202: "Шлюз SMS.RU считает номер получателя некорректным.",
	203: "Пустой текст сообщения.",
	204: "Имя отправителя не согласовано с оператором.",
	205: "Сообщение слишком длинное для шлюза.",
	206: "Исчерпан дневной лимит сообщений.",
	207: "На этот номер отправка запрещена.",
	208: "Отправка в это время суток запрещена настройками шлюза.",
	209: "Номер в чёрном списке шлюза.",
	210: "Шлюз ожидает POST-запрос.",
	211: "Метод шлюза не найден.",
	220: "Шлюз SMS.RU временно недоступен.",
	230: "Превышен дневной лимит сообщений на этот номер.",
	300: "Ключ доступа SMS.RU недействителен.",
	301: "Неверный пароль SMS.RU.",
	302: "Пользователь SMS.RU авторизован, но аккаунт не подтверждён.",
};

/**
 * Коды SMSC.RU. Расшифровка: https://smsc.ru/api/http/#errors
 */
function classifySmscError(errorCode: number): SmsErrorClass {
	switch (errorCode) {
		case 2:
		case 4:
			return "auth";
		case 3:
			return "insufficient_funds";
		case 7:
		case 8:
			return "recipient_unavailable";
		case 1:
		case 5:
		case 6:
			return "bad_request";
		case 9:
			return "rate_limited";
		default:
			return "unknown";
	}
}

const SMSC_ERROR_TEXT: Readonly<Record<number, string>> = {
	1: "Шлюз SMSC отклонил параметры запроса.",
	2: "Шлюз SMSC не принял логин или пароль.",
	3: "На счету SMSC недостаточно средств.",
	4: "IP-адрес заблокирован на стороне SMSC.",
	5: "Неверный формат даты отправки.",
	6: "Сообщение запрещено настройками аккаунта SMSC.",
	7: "Шлюз SMSC считает номер получателя некорректным.",
	8: "Сообщение невозможно доставить на этот номер.",
	9: "Слишком много запросов к SMSC за короткое время.",
};

function abortableTimeout(timeoutMs: number) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	return { controller, done: () => clearTimeout(timer) };
}

function networkFailure(
	error: unknown,
	timeoutMs: number,
	gateway: string,
): Extract<SmsTransportResult, { ok: false }> {
	const aborted = error instanceof Error && error.name === "AbortError";
	return {
		ok: false,
		providerMessageId: null,
		segments: null,
		errorCode: null,
		errorClass: aborted ? "timeout" : "network",
		errorMessage: aborted
			? `Шлюз ${gateway} не ответил за ${timeoutMs} мс`
			: `Сеть недоступна: ${error instanceof Error ? error.message : String(error)}`,
	};
}

async function sendViaSmsRu(
	input: SendSmsInput,
	timeoutMs: number,
): Promise<SmsTransportResult> {
	const { controller, done } = abortableTimeout(timeoutMs);
	const form = new URLSearchParams({
		api_id: input.credentials.apiId ?? "",
		to: input.toMsisdn,
		msg: input.text,
		json: "1",
	});
	if (input.credentials.sender) form.set("from", input.credentials.sender);

	try {
		const response = await fetch(`${input.credentials.baseUrl}/sms/send`, {
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded; charset=utf-8",
			},
			body: form.toString(),
			signal: controller.signal,
		});

		if (!response.ok) {
			return {
				ok: false,
				providerMessageId: null,
				segments: null,
				errorCode: response.status,
				errorClass: response.status >= 500 ? "server" : "bad_request",
				errorMessage: `Шлюз SMS.RU ответил ${response.status}`,
			};
		}

		const payload = (await response.json().catch(() => ({}))) as {
			status?: unknown;
			status_code?: unknown;
			status_text?: unknown;
			sms?: Record<
				string,
				{
					status?: unknown;
					status_code?: unknown;
					status_text?: unknown;
					sms_id?: unknown;
				}
			>;
		};

		// Ответ двухуровневый: общий статус запроса и статус по каждому номеру.
		// Общий OK при отказе по конкретному номеру — обычное дело.
		const perRecipient = payload.sms?.[input.toMsisdn];
		const statusCode =
			typeof perRecipient?.status_code === "number"
				? perRecipient.status_code
				: typeof payload.status_code === "number"
					? payload.status_code
					: null;

		if (statusCode === 100) {
			const smsId = perRecipient?.sms_id;
			return {
				ok: true,
				providerMessageId: typeof smsId === "string" ? smsId : null,
				segments: null,
				errorCode: null,
				errorClass: null,
				errorMessage: null,
			};
		}

		const statusText =
			typeof perRecipient?.status_text === "string"
				? perRecipient.status_text
				: typeof payload.status_text === "string"
					? payload.status_text
					: null;

		return {
			ok: false,
			providerMessageId: null,
			segments: null,
			errorCode: statusCode,
			errorClass:
				statusCode === null ? "unknown" : classifySmsRuStatus(statusCode),
			errorMessage:
				(statusCode !== null ? SMS_RU_STATUS_TEXT[statusCode] : null) ??
				statusText ??
				`Шлюз SMS.RU вернул код ${statusCode ?? "без кода"}`,
		};
	} catch (error) {
		return networkFailure(error, timeoutMs, "SMS.RU");
	} finally {
		done();
	}
}

async function sendViaSmsc(
	input: SendSmsInput,
	timeoutMs: number,
): Promise<SmsTransportResult> {
	const { controller, done } = abortableTimeout(timeoutMs);
	const form = new URLSearchParams({
		login: input.credentials.login ?? "",
		psw: input.credentials.password ?? "",
		phones: input.toMsisdn,
		mes: input.text,
		charset: "utf-8",
		// fmt=3 — ответ в JSON, cost=3 — вместе со стоимостью и числом частей.
		fmt: "3",
		cost: "3",
	});
	if (input.credentials.sender) form.set("sender", input.credentials.sender);
	if (input.idempotencyKey)
		form.set("id", numericIdFromKey(input.idempotencyKey));

	try {
		const response = await fetch(`${input.credentials.baseUrl}/sys/send.php`, {
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded; charset=utf-8",
			},
			body: form.toString(),
			signal: controller.signal,
		});

		if (!response.ok) {
			return {
				ok: false,
				providerMessageId: null,
				segments: null,
				errorCode: response.status,
				errorClass: response.status >= 500 ? "server" : "bad_request",
				errorMessage: `Шлюз SMSC ответил ${response.status}`,
			};
		}

		const payload = (await response.json().catch(() => ({}))) as {
			id?: unknown;
			cnt?: unknown;
			error?: unknown;
			error_code?: unknown;
		};

		if (payload.error !== undefined || typeof payload.error_code === "number") {
			const errorCode =
				typeof payload.error_code === "number" ? payload.error_code : null;
			return {
				ok: false,
				providerMessageId: null,
				segments: null,
				errorCode,
				errorClass:
					errorCode === null ? "unknown" : classifySmscError(errorCode),
				errorMessage:
					(errorCode !== null ? SMSC_ERROR_TEXT[errorCode] : null) ??
					(typeof payload.error === "string"
						? payload.error
						: "Шлюз SMSC отклонил отправку"),
			};
		}

		return {
			ok: true,
			providerMessageId:
				payload.id === undefined || payload.id === null
					? null
					: String(payload.id),
			segments:
				typeof payload.cnt === "number" && Number.isFinite(payload.cnt)
					? payload.cnt
					: null,
			errorCode: null,
			errorClass: null,
			errorMessage: null,
		};
	} catch (error) {
		return networkFailure(error, timeoutMs, "SMSC");
	} finally {
		done();
	}
}

/**
 * SMSC принимает только числовой идентификатор сообщения. Свёртка ключа
 * идемпотентности в 31-битное число: столкновения возможны, но шлюз отбрасывает
 * дубли лишь в пределах суток, а этого достаточно, чтобы одно и то же
 * напоминание не ушло дважды при повторе задачи.
 */
function numericIdFromKey(key: string): string {
	let hash = 0;
	for (let index = 0; index < key.length; index += 1) {
		hash = (hash * 31 + key.charCodeAt(index)) | 0;
	}
	return String(Math.abs(hash));
}

export async function sendSms(
	input: SendSmsInput,
): Promise<SmsTransportResult> {
	const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 12_000));

	if (!input.text.trim()) {
		return {
			ok: false,
			providerMessageId: null,
			segments: null,
			errorCode: null,
			errorClass: "bad_request",
			errorMessage: "Пустой текст сообщения.",
		};
	}
	if (!/^\d{10,15}$/.test(input.toMsisdn)) {
		return {
			ok: false,
			providerMessageId: null,
			segments: null,
			errorCode: null,
			errorClass: "recipient_unavailable",
			errorMessage: "Номер получателя не приведён к международному формату.",
		};
	}

	switch (input.credentials.provider) {
		case "smsru":
			return sendViaSmsRu(input, timeoutMs);
		case "smsc":
			return sendViaSmsc(input, timeoutMs);
		default:
			return {
				ok: false,
				providerMessageId: null,
				segments: null,
				errorCode: null,
				errorClass: "not_configured",
				errorMessage: "SMS-шлюз не настроен.",
			};
	}
}

export type SmsBalanceResult =
	| { ok: true; balanceRub: number; currency: string }
	| { ok: false; errorClass: SmsErrorClass; errorMessage: string };

/**
 * Остаток на счету шлюза. Клинике это нужно не из любопытства: закончившиеся
 * деньги на SMS означают, что завтра никто не получит напоминание о приёме, а
 * узнают об этом по пустым креслам.
 */
export async function fetchSmsBalance(
	credentials: SmsCredentials,
	timeoutMs = 8000,
): Promise<SmsBalanceResult> {
	const { controller, done } = abortableTimeout(
		Math.max(1000, Math.min(30_000, timeoutMs)),
	);

	try {
		if (credentials.provider === "smsru") {
			const form = new URLSearchParams({
				api_id: credentials.apiId ?? "",
				json: "1",
			});
			const response = await fetch(`${credentials.baseUrl}/my/balance`, {
				method: "POST",
				headers: {
					"content-type": "application/x-www-form-urlencoded; charset=utf-8",
				},
				body: form.toString(),
				signal: controller.signal,
			});
			const payload = (await response.json().catch(() => ({}))) as {
				status_code?: unknown;
				balance?: unknown;
			};
			if (payload.status_code !== 100 || typeof payload.balance !== "number") {
				const statusCode =
					typeof payload.status_code === "number" ? payload.status_code : null;
				return {
					ok: false,
					errorClass:
						statusCode === null ? "unknown" : classifySmsRuStatus(statusCode),
					errorMessage:
						(statusCode !== null ? SMS_RU_STATUS_TEXT[statusCode] : null) ??
						"Шлюз SMS.RU не вернул баланс.",
				};
			}
			return { ok: true, balanceRub: payload.balance, currency: "RUB" };
		}

		const form = new URLSearchParams({
			login: credentials.login ?? "",
			psw: credentials.password ?? "",
			fmt: "3",
		});
		const response = await fetch(`${credentials.baseUrl}/sys/balance.php`, {
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded; charset=utf-8",
			},
			body: form.toString(),
			signal: controller.signal,
		});
		const payload = (await response.json().catch(() => ({}))) as {
			balance?: unknown;
			currency?: unknown;
			error_code?: unknown;
			error?: unknown;
		};
		if (typeof payload.error_code === "number") {
			return {
				ok: false,
				errorClass: classifySmscError(payload.error_code),
				errorMessage:
					SMSC_ERROR_TEXT[payload.error_code] ?? "Шлюз SMSC не вернул баланс.",
			};
		}
		const balance =
			typeof payload.balance === "string"
				? Number.parseFloat(payload.balance)
				: payload.balance;
		if (typeof balance !== "number" || !Number.isFinite(balance)) {
			return {
				ok: false,
				errorClass: "unknown",
				errorMessage: "Шлюз SMSC не вернул баланс.",
			};
		}
		return {
			ok: true,
			balanceRub: balance,
			currency: typeof payload.currency === "string" ? payload.currency : "RUB",
		};
	} catch (error) {
		const aborted = error instanceof Error && error.name === "AbortError";
		return {
			ok: false,
			errorClass: aborted ? "timeout" : "network",
			errorMessage: aborted ? "Шлюз не ответил вовремя." : "Шлюз недоступен.",
		};
	} finally {
		done();
	}
}
