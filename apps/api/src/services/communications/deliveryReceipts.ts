/**
 * Квитанции о доставке от провайдеров.
 *
 * ЗАЧЕМ ЭТО НУЖНО
 * Статус `sent` означает «шлюз принял сообщение», а не «пациент его получил».
 * SMS на выключенный или заблокированный телефон шлюз принимает и берёт за неё
 * деньги, а до человека она не доходит. Для напоминания о приёме разница
 * решающая: администратор считает пациента предупреждённым, а тот не придёт.
 *
 * ЧЕСТНО О ГРАНИЦАХ РЕАЛИЗАЦИИ
 * Разбор построен по опубликованной документации SMS.RU и SMSC и проверен на
 * телах запросов из этой документации. Против живых шлюзов он НЕ проверялся:
 * для этого нужны рабочие учётные записи. Поэтому нераспознанные состояния не
 * угадываются — они попадают в `unknown`, статус сообщения не меняется, а текст
 * квитанции сохраняется, чтобы расхождение было видно.
 *
 * Документация:
 *   SMS.RU — https://sms.ru/api/callback
 *   SMSC   — https://smsc.ru/api/http/#callback
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { communicationOutbox } from "../../db/schema.js";

type ReceiptState = "delivered" | "failed" | "in_transit" | "unknown";

export type ParsedReceipt = {
	readonly providerMessageId: string;
	readonly state: ReceiptState;
	/** Код и расшифровка от провайдера — сохраняются как есть. */
	readonly detail: string;
};

/**
 * Коды состояний SMS.RU. Читать их как «больше 100 — плохо» нельзя: 110 это
 * «прочитано», то есть лучший возможный исход.
 */
const SMS_RU_STATES: Readonly<
	Record<number, { state: ReceiptState; text: string }>
> = {
	100: { state: "in_transit", text: "Сообщение принято шлюзом" },
	101: { state: "in_transit", text: "Передаётся оператору" },
	102: { state: "in_transit", text: "Передано оператору" },
	103: { state: "delivered", text: "Доставлено" },
	104: { state: "failed", text: "Не доставлено: истёк срок жизни сообщения" },
	105: { state: "failed", text: "Удалено оператором" },
	106: { state: "failed", text: "Сбой в телефоне получателя" },
	107: { state: "failed", text: "Не доставлено по неизвестной причине" },
	108: { state: "failed", text: "Отклонено" },
	110: { state: "delivered", text: "Прочитано" },
	150: { state: "failed", text: "Не доставлено: номер в чёрном списке" },
};

/**
 * SMS.RU присылает параметр `data` со строками вида `<id>=<код>`.
 * Одним запросом может прийти несколько квитанций.
 */
export function parseSmsRuReceipts(rawData: unknown): ParsedReceipt[] {
	if (typeof rawData !== "string" || !rawData.trim()) return [];

	const receipts: ParsedReceipt[] = [];
	for (const line of rawData.split(/[\r\n]+/)) {
		const trimmed = line.trim();

		const separator = trimmed.lastIndexOf("=");
		if (separator <= 0) continue;

		const providerMessageId = trimmed.slice(0, separator).trim();
		const code = Number.parseInt(trimmed.slice(separator + 1).trim(), 10);
		if (!providerMessageId || !Number.isFinite(code)) continue;

		const known = SMS_RU_STATES[code];
		receipts.push({
			providerMessageId,
			state: known?.state ?? "unknown",
			detail: known
				? `SMS.RU ${code}: ${known.text}`
				: `SMS.RU ${code}: состояние не распознано`,
		});
	}
	return receipts;
}

/**
 * Коды состояний SMSC. Отрицательные — это ещё не отказ: −1 означает «ожидает
 * отправки», и трактовать его как ошибку значит преждевременно признать
 * сообщение потерянным.
 */
const SMSC_STATES: Readonly<
	Record<number, { state: ReceiptState; text: string }>
> = {
	[-3]: { state: "unknown", text: "Сообщение не найдено у провайдера" },
	[-1]: { state: "in_transit", text: "Ожидает отправки" },
	0: { state: "in_transit", text: "Передано оператору" },
	1: { state: "delivered", text: "Доставлено" },
	2: { state: "delivered", text: "Прочитано" },
	3: { state: "failed", text: "Просрочено" },
	20: { state: "failed", text: "Невозможно доставить" },
	22: { state: "failed", text: "Неверный номер" },
	23: { state: "failed", text: "Отправка запрещена" },
	24: { state: "failed", text: "Недостаточно средств" },
	25: { state: "failed", text: "Недоступный номер" },
};

/** SMSC присылает по одной квитанции: `id`, `status`, при отказе — `err`. */
export function parseSmscReceipt(
	params: Record<string, unknown>,
): ParsedReceipt | null {
	const rawId = params.id;
	const providerMessageId =
		typeof rawId === "string"
			? rawId.trim()
			: typeof rawId === "number"
				? String(rawId)
				: "";
	if (!providerMessageId) return null;

	const rawStatus = params.status;
	const status =
		typeof rawStatus === "number"
			? rawStatus
			: typeof rawStatus === "string"
				? Number.parseInt(rawStatus.trim(), 10)
				: Number.NaN;
	if (!Number.isFinite(status)) return null;

	const known = SMSC_STATES[status];
	const errorCode =
		params.err === undefined || params.err === null ? null : String(params.err);
	const suffix =
		errorCode && errorCode !== "0" ? `, код ошибки ${errorCode}` : "";

	return {
		providerMessageId,
		state: known?.state ?? "unknown",
		detail: known
			? `SMSC ${status}: ${known.text}${suffix}`
			: `SMSC ${status}: состояние не распознано${suffix}`,
	};
}

/**
 * Причины отказа WhatsApp Cloud API, которые администратор клиники должен
 * понимать без чтения документации Meta. «131026» на экране бесполезен: он не
 * говорит, что делать. «У пациента нет WhatsApp — напишите SMS» говорит.
 */
const WHATSAPP_ERRORS: Readonly<Record<number, string>> = {
	131026:
		"у получателя нет WhatsApp или он не может принять сообщение — нужен другой канал",
	131047:
		"прошло больше 24 часов с последнего ответа пациента: свободный текст запрещён, нужен согласованный шаблон",
	131049:
		"Meta ограничила доставку этому получателю, чтобы снизить долю рассылок",
	131051: "тип сообщения не поддерживается получателем",
	131053: "вложение не принято: неподходящий формат или размер",
	132000: "число значений не совпадает с шаблоном",
	132001: "шаблон не найден или не одобрен",
	133010: "номер отправителя не зарегистрирован в WhatsApp Business",
	470: "истекло окно свободной переписки — нужен шаблон",
};

/**
 * Квитанции WhatsApp Cloud API из `value.statuses` вебхука.
 *
 * ЧТО БЫЛО. Вебхук разбирал только `value.messages`, а `value.statuses`
 * отбрасывал молча. Из-за этого сообщение, отправленное в WhatsApp, навсегда
 * оставалось «отправлено»: доставлено оно, прочитано или отвергнуто — в журнале
 * не отличалось. Для SMS это работало, для WhatsApp нет.
 *
 * `read` считается доставкой, а не отдельным состоянием: для напоминания о
 * приёме «прочитано» — тот же успех, что «доставлено», и понижать одно до
 * другого нельзя (порядок запросов Meta не гарантирует).
 */
export function parseWhatsappStatuses(rawStatuses: unknown): ParsedReceipt[] {
	if (!Array.isArray(rawStatuses)) return [];

	const receipts: ParsedReceipt[] = [];
	for (const item of rawStatuses) {
		if (!item || typeof item !== "object") continue;
		const entry = item as Record<string, unknown>;

		const providerMessageId =
			typeof entry.id === "string" ? entry.id.trim() : "";
		if (!providerMessageId) continue;

		const status =
			typeof entry.status === "string" ? entry.status.trim().toLowerCase() : "";

		// Расшифровка ошибки берётся из первой записи errors: Meta присылает их
		// массивом, но для одного сообщения причина одна.
		const errors = Array.isArray(entry.errors) ? entry.errors : [];
		const firstError =
			errors.length > 0 && errors[0] && typeof errors[0] === "object"
				? (errors[0] as Record<string, unknown>)
				: null;
		const errorCode =
			typeof firstError?.code === "number" ? firstError.code : null;
		const errorTitle =
			typeof firstError?.title === "string" ? firstError.title : null;

		if (status === "delivered") {
			receipts.push({
				providerMessageId,
				state: "delivered",
				detail: "WhatsApp: доставлено",
			});
			continue;
		}
		if (status === "read") {
			receipts.push({
				providerMessageId,
				state: "delivered",
				detail: "WhatsApp: прочитано",
			});
			continue;
		}
		if (status === "sent") {
			receipts.push({
				providerMessageId,
				state: "in_transit",
				detail: "WhatsApp: передано в сеть",
			});
			continue;
		}
		if (status === "failed") {
			const human = errorCode !== null ? WHATSAPP_ERRORS[errorCode] : undefined;
			const explanation = human ?? errorTitle ?? "причина не указана";
			receipts.push({
				providerMessageId,
				state: "failed",
				detail: `WhatsApp: не доставлено — ${explanation}${errorCode !== null ? ` (код ${errorCode})` : ""}`,
			});
			continue;
		}

		// Неизвестное состояние статус не меняет, но текст сохраняется: иначе
		// расхождение с документацией Meta осталось бы невидимым.
		receipts.push({
			providerMessageId,
			state: "unknown",
			detail: `WhatsApp: состояние «${status || "не указано"}» не распознано`,
		});
	}
	return receipts;
}

export type ApplyReceiptsReport = {
	readonly applied: number;
	readonly delivered: number;
	readonly failed: number;
	/** Квитанции, для которых сообщение в очереди не нашлось. */
	readonly unmatched: number;
	/** Квитанции, не изменившие статус: сообщение ещё в пути или код неясен. */
	readonly ignored: number;
};

/**
 * Применение квитанций к очереди.
 *
 * ПРАВИЛА, ЗАЩИЩАЮЩИЕ ЖУРНАЛ ОТ ПОРЧИ:
 *
 * 1. Меняются только строки в состоянии `sent` или `delivered`. Квитанция не
 *    может воскресить отменённое сообщение или отправить то, что стоит в
 *    очереди: провайдер о них ничего не знает.
 * 2. Доставленное не понижается обратно до отправленного. Провайдер вправе
 *    прислать «передано оператору» после «доставлено», и порядок запросов не
 *    гарантирован.
 * 3. Нераспознанное состояние не меняет статус, но текст квитанции пишется.
 *    Иначе расхождение с документацией провайдера осталось бы невидимым.
 * 4. Организация не принимается извне: она берётся из найденной строки. Иначе
 *    вызывающий мог бы менять статусы чужой клиники, зная идентификатор.
 */
export async function applyReceipts(
	receipts: readonly ParsedReceipt[],
	now = new Date(),
): Promise<ApplyReceiptsReport> {
	const report = {
		applied: 0,
		delivered: 0,
		failed: 0,
		unmatched: 0,
		ignored: 0,
	};
	if (receipts.length === 0) return report;

	const byId = new Map<string, ParsedReceipt>();
	for (const receipt of receipts) byId.set(receipt.providerMessageId, receipt);

	/*
	 * ОПЕРАЦИЯ «ДО АРЕНДАТОРА». Квитанцию присылает шлюз связи на публичный
	 * адрес обратного вызова: токена нет, `request.tenantId` не выставлен, и
	 * глобальная обёртка server.ts обработчик не оборачивает. Клиника станет
	 * известна ТОЛЬКО из найденной строки — правило 4 выше именно про это.
	 *
	 * Под FORCE RLS этот поиск без контекста отдавал ноль строк, и КАЖДАЯ
	 * квитанция считалась ничейной: `unmatched === receipts.length`, ответ шлюзу
	 * 200 «принято, применено 0», повтора не будет. Сообщения навсегда
	 * оставались в состоянии «отправлено», а экран подтверждений дня, который
	 * решает, кому звонить, по признаку «доставлено», врал по каждому приёму.
	 *
	 * Обход накрывает РОВНО этот SELECT и добирает `organization_id` — он и есть
	 * ответ на вопрос «чьё это сообщение». Все записи ниже идут под контекстом
	 * найденной клиники: под одним лишь обходом `UPDATE` был бы отвергнут кодом
	 * 42501, потому что дизъюнкта обхода в `WITH CHECK` нет.
	 */
	const rows = await withSuperuserBypass(async (tx) =>
		tx
			.select({
				id: communicationOutbox.id,
				organizationId: communicationOutbox.organizationId,
				status: communicationOutbox.status,
				providerMessageId: communicationOutbox.providerMessageId,
			})
			.from(communicationOutbox)
			.where(
				and(
					sql`${communicationOutbox.providerMessageId} is not null`,
					inArray(communicationOutbox.providerMessageId, [...byId.keys()]),
					// Провайдер знает только об отправленных сообщениях.
					inArray(communicationOutbox.status, ["sent", "delivered"]),
				),
			),
	);

	const matchedIds = new Set(
		rows
			.map((row) => row.providerMessageId)
			.filter((id): id is string => Boolean(id)),
	);
	report.unmatched = [...byId.keys()].filter(
		(id) => !matchedIds.has(id),
	).length;

	for (const row of rows) {
		const receipt = row.providerMessageId
			? byId.get(row.providerMessageId)
			: undefined;
		if (!receipt) continue;

		// Одна квитанция — одна клиника. Контекст ставится по организации самой
		// найденной строки, поэтому изменить чужую строку этот проход не может.
		await withTenantCtx(row.organizationId, async (tx) => {
			if (receipt.state === "delivered") {
				await tx
					.update(communicationOutbox)
					.set({
						status: "delivered",
						deliveredAt: now,
						receiptDetail: receipt.detail,
						updatedAt: now,
					})
					.where(eq(communicationOutbox.id, row.id));
				report.applied += 1;
				report.delivered += 1;
				return;
			}

			if (receipt.state === "failed") {
				// Доставленное не отменяется поздней квитанцией об ошибке: порядок
				// запросов от провайдера не гарантирован.
				if (row.status === "delivered") {
					await tx
						.update(communicationOutbox)
						.set({ receiptDetail: receipt.detail, updatedAt: now })
						.where(eq(communicationOutbox.id, row.id));
					report.ignored += 1;
					return;
				}
				await tx
					.update(communicationOutbox)
					.set({
						status: "failed",
						lastErrorClass: "not_delivered",
						lastErrorMessage: receipt.detail,
						receiptDetail: receipt.detail,
						updatedAt: now,
					})
					.where(eq(communicationOutbox.id, row.id));
				report.applied += 1;
				report.failed += 1;
				return;
			}

			// in_transit и unknown статус не меняют, но текст сохраняют.
			await tx
				.update(communicationOutbox)
				.set({ receiptDetail: receipt.detail, updatedAt: now })
				.where(eq(communicationOutbox.id, row.id));
			report.ignored += 1;
		});
	}

	return report;
}

/**
 * Секрет для проверки вызова провайдера.
 *
 * У SMS.RU и SMSC нет подписи запроса, поэтому единственный доступный способ —
 * секрет в адресе обратного вызова. Без настроенного секрета обработчик
 * отказывает: открытый эндпоинт позволил бы кому угодно помечать сообщения
 * доставленными, то есть скрывать недоставку.
 */
export function readReceiptSecret(
	env: NodeJS.ProcessEnv = process.env,
): string | null {
	const secret = env.DENTE_COMMUNICATION_RECEIPT_SECRET?.trim();
	return secret && secret.length >= 16 ? secret : null;
}

/** Сравнение за постоянное время: длина секрета не должна утекать по таймингу. */
export function receiptSecretMatches(
	provided: unknown,
	expected: string,
): boolean {
	if (typeof provided !== "string" || provided.length !== expected.length)
		return false;
	let difference = 0;
	for (let index = 0; index < expected.length; index += 1) {
		difference |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
	}
	return difference === 0;
}
