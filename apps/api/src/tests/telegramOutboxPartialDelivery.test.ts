import assert from "node:assert";
import { describe, test } from "node:test";
import type { DenteTelegramOutboxDeliveryReceipt } from "@dental/shared";
import {
	deliverTelegramOutboxParts,
	telegramOutboxDeliveredParts,
	telegramOutboxDeliveredPartsForItem,
	telegramOutboxScheduleState,
	telegramPhotoSentTextFailedBlockedReason,
} from "../routes/telegram.js";
import { denteTelegramOutboxDeliveryReceipts } from "../sampleData.js";
import type { TelegramTransportResult } from "../telegramTransport.js";

/**
 * Замок на defect (c) пакета R5: сообщение «фото + длинный текст» уходит пациенту двумя вызовами
 * Telegram. Провал ВТОРОГО вызова помечал всю позицию как полностью проваленную, message_id уже
 * доставленного фото выбрасывался, и повторная отправка (её включает clientMutationId с префиксом
 * "due-") звала sendPhoto заново — пациент получал фото второй раз.
 *
 * Ни один тест здесь не обращается к api.telegram.org: отправители внедряются параметром `senders`,
 * тот же шов, который в бою получает настоящие sendTelegramPhotoMessage / sendTelegramTextMessage.
 */

const telegramSendOk = (telegramMessageId: number | null): TelegramTransportResult => ({
	ok: true,
	telegramMessageId,
	retryAfterSeconds: null,
	errorCode: null,
	errorClass: null,
});

const telegramRateLimited = (retryAfterSeconds: number): TelegramTransportResult => ({
	ok: false,
	telegramMessageId: null,
	retryAfterSeconds,
	errorCode: 429,
	errorClass: "rate_limited",
});

type RecordedCall = { readonly kind: "photo" | "text"; readonly caption?: string; readonly text?: string };

/** Пишет фактическую последовательность вызовов Telegram, чтобы её можно было предъявить. */
function recordingSenders(
	photoResults: TelegramTransportResult[],
	textResults: TelegramTransportResult[],
): {
	senders: { sendPhoto: (input: { caption: string }) => Promise<TelegramTransportResult>; sendText: (input: { text: string }) => Promise<TelegramTransportResult> };
	calls: RecordedCall[];
} {
	const calls: RecordedCall[] = [];
	let photoIndex = 0;
	let textIndex = 0;
	return {
		calls,
		senders: {
			sendPhoto: async (input: { caption: string }) => {
				calls.push({ kind: "photo", caption: input.caption });
				const result = photoResults[photoIndex];
				photoIndex += 1;
				assert.ok(result, "тест не задал результат для этого вызова sendPhoto");
				return result;
			},
			sendText: async (input: { text: string }) => {
				calls.push({ kind: "text", text: input.text });
				const result = textResults[textIndex];
				textIndex += 1;
				assert.ok(result, "тест не задал результат для этого вызова sendText");
				return result;
			},
		},
	};
}

// Текст длиннее 1024 символов — только тогда полный текст не влезает в подпись к фото и уходит
// вторым сообщением. Именно эта развилка и ломалась.
const longPatientText = `Иван Иванович, ваш снимок готов. ${"Подробное описание плана лечения и рекомендаций после приема. ".repeat(20)}`;
const photoUrl = "https://clinic.example.org/cards/care.png";

const basePlan = {
	botToken: "не_настоящий_токен_бота",
	chatId: "не_настоящий_чат",
	replyMarkup: null,
	timeoutMs: 1000,
	warnings: [] as readonly string[],
};

describe("частичная доставка «фото + текст» в очереди Telegram", () => {
	test("текст длиннее подписи действительно уходит вторым сообщением", () => {
		assert.ok(
			longPatientText.length > 1024,
			`длина текста ${longPatientText.length} должна быть больше 1024, иначе развилка не проверяется`,
		);
	});

	test("первая попытка: фото принято, текст отбит 429 — фиксируется доставленное фото, а не полный провал", async () => {
		const { senders, calls } = recordingSenders([telegramSendOk(555)], [telegramRateLimited(30)]);

		const outcome = await deliverTelegramOutboxParts({
			...basePlan,
			text: longPatientText,
			photoUrl,
			alreadyDelivered: telegramOutboxDeliveredParts(null),
			senders,
		});

		assert.deepStrictEqual(
			calls.map((call) => call.kind),
			["photo", "text"],
			"первая попытка обязана позвать оба вызова",
		);
		assert.strictEqual(outcome.transport.ok, false, "итог попытки — провал, текст не ушёл");
		assert.strictEqual(outcome.delivered.photoDelivered, true, "фото доставлено и это должно быть зафиксировано");
		assert.strictEqual(outcome.delivered.photoMessageId, 555, "message_id доставленного фото не должен теряться");
		assert.ok(
			outcome.warnings.some((warning) => warning.includes("Частичная доставка")),
			`частичная доставка обязана быть видна оператору, получено: ${JSON.stringify(outcome.warnings)}`,
		);
	});

	test("повтор по квитанции частичной доставки досылает ТОЛЬКО текст — фото второй раз не уходит", async () => {
		const receiptAfterPartial: DenteTelegramOutboxDeliveryReceipt = {
			outboxItemId: "task:партиальная-позиция",
			status: "failed",
			outboxItem: null,
			taskId: null,
			eventId: null,
			telegramMessageId: 555,
			clientMutationId: "due-повтор",
			warnings: [],
			blockedReason: telegramPhotoSentTextFailedBlockedReason,
			createdAt: new Date("2026-07-28T02:00:00+04:00").toISOString(),
		};

		const delivered = telegramOutboxDeliveredParts(receiptAfterPartial);
		assert.strictEqual(delivered.photoDelivered, true, "квитанция обязана сообщить, что фото уже у пациента");
		assert.strictEqual(delivered.photoMessageId, 555);

		const { senders, calls } = recordingSenders([], [telegramSendOk(556)]);

		const outcome = await deliverTelegramOutboxParts({
			...basePlan,
			text: longPatientText,
			photoUrl,
			alreadyDelivered: delivered,
			senders,
		});

		assert.deepStrictEqual(
			calls.map((call) => call.kind),
			["text"],
			"повтор не имеет права звать sendPhoto второй раз",
		);
		assert.strictEqual(calls.filter((call) => call.kind === "photo").length, 0, "фото повторно не отправлено");
		assert.strictEqual(calls[0]?.text, longPatientText, "досылается именно недоставленная часть — полный текст");
		assert.strictEqual(outcome.transport.ok, true, "вторая часть доставлена, позиция закрывается");
		assert.strictEqual(outcome.transport.telegramMessageId, 556);
		assert.ok(
			outcome.warnings.some((warning) => warning.includes("предыдущей попытке")),
			`пропуск фото обязан быть объяснён, получено: ${JSON.stringify(outcome.warnings)}`,
		);
	});

	test("повтор пропускает фото и когда Telegram не вернул message_id — признак берётся из причины отказа", async () => {
		const receiptWithoutMessageId: DenteTelegramOutboxDeliveryReceipt = {
			outboxItemId: "task:без-message-id",
			status: "failed",
			outboxItem: null,
			taskId: null,
			eventId: null,
			telegramMessageId: null,
			clientMutationId: "due-повтор",
			warnings: [],
			blockedReason: telegramPhotoSentTextFailedBlockedReason,
			createdAt: new Date("2026-07-28T02:00:00+04:00").toISOString(),
		};

		const delivered = telegramOutboxDeliveredParts(receiptWithoutMessageId);
		assert.strictEqual(delivered.photoDelivered, true, "нет message_id — доставка фото всё равно состоялась");
		assert.strictEqual(delivered.photoMessageId, null);

		const { senders, calls } = recordingSenders([], [telegramSendOk(557)]);
		await deliverTelegramOutboxParts({
			...basePlan,
			text: longPatientText,
			photoUrl,
			alreadyDelivered: delivered,
			senders,
		});

		assert.strictEqual(calls.filter((call) => call.kind === "photo").length, 0, "фото повторно не отправлено");
	});

	test("если фото так и не дошло, повтор обязан отправить его снова", async () => {
		const receiptAfterTotalFailure: DenteTelegramOutboxDeliveryReceipt = {
			outboxItemId: "task:ничего-не-дошло",
			status: "failed",
			outboxItem: null,
			taskId: null,
			eventId: null,
			telegramMessageId: null,
			clientMutationId: "due-повтор",
			warnings: [],
			blockedReason: "telegram_transport_failed",
			createdAt: new Date("2026-07-28T02:00:00+04:00").toISOString(),
		};

		const delivered = telegramOutboxDeliveredParts(receiptAfterTotalFailure);
		assert.strictEqual(delivered.photoDelivered, false, "обычный транспортный провал не означает доставленное фото");

		const { senders, calls } = recordingSenders([telegramSendOk(601)], [telegramSendOk(602)]);
		await deliverTelegramOutboxParts({
			...basePlan,
			text: longPatientText,
			photoUrl,
			alreadyDelivered: delivered,
			senders,
		});

		assert.deepStrictEqual(
			calls.map((call) => call.kind),
			["photo", "text"],
			"недоставленное фото обязано уйти при повторе",
		);
	});

	test("короткий текст влезает в подпись: один вызов, второго сообщения нет", async () => {
		const shortText = "Иван Иванович, ваш снимок готов.";
		const { senders, calls } = recordingSenders([telegramSendOk(700)], []);

		const outcome = await deliverTelegramOutboxParts({
			...basePlan,
			text: shortText,
			photoUrl,
			alreadyDelivered: telegramOutboxDeliveredParts(null),
			senders,
		});

		assert.deepStrictEqual(calls.map((call) => call.kind), ["photo"]);
		assert.strictEqual(calls[0]?.caption, shortText, "короткий текст уходит подписью к фото");
		assert.strictEqual(outcome.transport.ok, true);
		assert.strictEqual(outcome.delivered.photoDelivered, false, "единственное сообщение — не частичная доставка");
	});

	test("фото отбито, текст ушёл: частичной доставки нет, помечать нечего", async () => {
		const { senders, calls } = recordingSenders([telegramRateLimited(10)], [telegramSendOk(800)]);

		const outcome = await deliverTelegramOutboxParts({
			...basePlan,
			text: longPatientText,
			photoUrl,
			alreadyDelivered: telegramOutboxDeliveredParts(null),
			senders,
		});

		assert.deepStrictEqual(calls.map((call) => call.kind), ["photo", "text"]);
		assert.strictEqual(outcome.transport.ok, true);
		assert.strictEqual(outcome.delivered.photoDelivered, false, "фото не дошло — частичной доставки нет");
	});

	test("успешная квитанция не выдаётся за частичную доставку", () => {
		const sentReceipt: DenteTelegramOutboxDeliveryReceipt = {
			outboxItemId: "task:отправлено",
			status: "sent",
			outboxItem: null,
			taskId: null,
			eventId: null,
			telegramMessageId: 900,
			clientMutationId: "due-повтор",
			warnings: [],
			blockedReason: telegramPhotoSentTextFailedBlockedReason,
			createdAt: new Date("2026-07-28T02:00:00+04:00").toISOString(),
		};

		assert.strictEqual(telegramOutboxDeliveredParts(sentReceipt).photoDelivered, false);
		assert.strictEqual(telegramOutboxDeliveredParts(null).photoDelivered, false);
		assert.strictEqual(telegramOutboxDeliveredParts(undefined).photoDelivered, false);
	});
});

/**
 * Замок на дефект (b) пакета S5: нечитаемое время отправки считалось наступившим, то есть отказ
 * прочитать дату означал «отправить сейчас». Часы здесь фиксированные — ни один тест ниже не зовёт
 * Date.now(), иначе проверка «будущее ещё не наступило» ломалась бы на границе суток.
 */
const fixedNowMs = Date.parse("2026-07-28T02:00:00+04:00");

describe("состояние запланированного времени отправки Telegram", () => {
	test("часы теста действительно фиксированы", () => {
		assert.ok(Number.isFinite(fixedNowMs), "фиксированные часы обязаны разбираться");
	});

	test("нечитаемое время НЕ считается наступившим — иначе сообщение уходит не в свой день", () => {
		for (const unreadable of ["следующий вторник", "not-a-date", "", "   ", "2026-13-45T99:99:99Z"]) {
			assert.strictEqual(
				telegramOutboxScheduleState(unreadable, fixedNowMs),
				"unreadable",
				`значение ${JSON.stringify(unreadable)} обязано попасть в отдельное состояние, а не в «пора»`,
			);
			assert.notStrictEqual(
				telegramOutboxScheduleState(unreadable, fixedNowMs),
				"due",
				`значение ${JSON.stringify(unreadable)} не имеет права считаться наступившим`,
			);
		}
	});

	test("прошедшее время — пора, будущее — не пора, ровно текущее — пора", () => {
		assert.strictEqual(telegramOutboxScheduleState("2026-07-28T01:59:59+04:00", fixedNowMs), "due");
		assert.strictEqual(telegramOutboxScheduleState("2026-07-28T02:00:00+04:00", fixedNowMs), "due");
		assert.strictEqual(telegramOutboxScheduleState("2026-07-28T02:00:01+04:00", fixedNowMs), "not_due");
		// Напоминание на следующий вторник: раньше нечитаемая дата давала «пора», а читаемая будущая —
		// нет. Проверяем именно читаемую будущую, чтобы fail-closed не съел нормальное планирование.
		assert.strictEqual(telegramOutboxScheduleState("2026-08-04T10:00:00+04:00", fixedNowMs), "not_due");
	});

	test("состояние считается от переданных часов, а не от системных", () => {
		const scheduledAt = "2026-07-28T03:00:00+04:00";
		assert.strictEqual(telegramOutboxScheduleState(scheduledAt, fixedNowMs), "not_due");
		assert.strictEqual(telegramOutboxScheduleState(scheduledAt, fixedNowMs + 60 * 60 * 1000), "due");
	});
});

/**
 * Замок на F3 ревьюера: признак «фото уже у пациента» жил в паре (позиция, clientMutationId), а
 * оператор из интерфейса берёт новый crypto.randomUUID() на каждый клик, поэтому его повтор признака
 * не находил и пациент получал фото второй раз.
 */
function withReceipt<T>(receipt: DenteTelegramOutboxDeliveryReceipt, run: () => T): T {
	denteTelegramOutboxDeliveryReceipts.unshift(receipt);
	try {
		return run();
	} finally {
		const index = denteTelegramOutboxDeliveryReceipts.indexOf(receipt);
		if (index >= 0) denteTelegramOutboxDeliveryReceipts.splice(index, 1);
	}
}

function partialDeliveryReceipt(
	outboxItemId: string,
	clientMutationId: string,
	telegramMessageId: number | null,
): DenteTelegramOutboxDeliveryReceipt {
	return {
		outboxItemId,
		status: "failed",
		outboxItem: null,
		taskId: null,
		eventId: null,
		telegramMessageId,
		clientMutationId,
		warnings: [],
		blockedReason: telegramPhotoSentTextFailedBlockedReason,
		createdAt: new Date(fixedNowMs).toISOString(),
	};
}

describe("признак частичной доставки принадлежит позиции, а не попытке", () => {
	test("повтор с ДРУГИМ clientMutationId находит доставленное фото", () => {
		const itemId = "document-ready:позиция-оператора:пациент";
		const receipt = partialDeliveryReceipt(itemId, "due-первая-попытка", 555);

		withReceipt(receipt, () => {
			// Так вело себя R5: у нового mutation id квитанции нет, признака нет, фото уйдёт снова.
			assert.strictEqual(
				telegramOutboxDeliveredParts(null).photoDelivered,
				false,
				"поиск по паре (позиция, mutation id) у нового клика оператора не находит ничего — это и был дефект",
			);

			const delivered = telegramOutboxDeliveredPartsForItem(itemId, null);
			assert.strictEqual(delivered.photoDelivered, true, "фото уже в чате пациента, повтор обязан это знать");
			assert.strictEqual(delivered.photoMessageId, 555, "message_id доставленного фото обязан сохраниться");
		});
	});

	test("повтор оператора с новым mutation id досылает ТОЛЬКО текст — фото второй раз не уходит", async () => {
		const itemId = "appointment-reminder:позиция-повтора:24h:пациент";
		const receipt = partialDeliveryReceipt(itemId, "due-первая-попытка", 555);

		const { senders, calls } = recordingSenders([], [telegramSendOk(556)]);
		await withReceipt(receipt, async () => {
			const outcome = await deliverTelegramOutboxParts({
				...basePlan,
				text: longPatientText,
				photoUrl,
				alreadyDelivered: telegramOutboxDeliveredPartsForItem(itemId, null),
				senders,
			});
			assert.strictEqual(outcome.transport.ok, true);
		});

		assert.deepStrictEqual(
			calls.map((call) => call.kind),
			["text"],
			"повтор оператора не имеет права звать sendPhoto",
		);
		assert.strictEqual(calls.filter((call) => call.kind === "photo").length, 0, "фото повторно не отправлено");
	});

	test("сдвиг scheduledAt меняет due-ключ, но признак всё равно находится", () => {
		const itemId = "recall:позиция-со-сдвигом:пациент";
		// dueOutboxClientMutationId = sha256(id:scheduledAt): при сдвиге времени ключ другой.
		const receipt = partialDeliveryReceipt(itemId, "due-ключ-до-сдвига", 777);

		withReceipt(receipt, () => {
			const delivered = telegramOutboxDeliveredPartsForItem(itemId, null);
			assert.strictEqual(delivered.photoDelivered, true, "смена времени не выкладывает фото из чата пациента");
			assert.strictEqual(delivered.photoMessageId, 777);
		});
	});

	test("квитанция ЧУЖОЙ позиции не отменяет отправку фото", () => {
		const otherItemId = "recall:чужая-позиция:пациент";
		const receipt = partialDeliveryReceipt(otherItemId, "due-чужая-попытка", 999);

		withReceipt(receipt, () => {
			const delivered = telegramOutboxDeliveredPartsForItem("recall:моя-позиция:пациент", null);
			assert.strictEqual(delivered.photoDelivered, false, "признак не имеет права протекать между позициями");
			assert.strictEqual(delivered.photoMessageId, null);
		});
	});

	test("нет ни одной квитанции по позиции — фото обязано уйти", () => {
		const delivered = telegramOutboxDeliveredPartsForItem("post-visit:позиция-без-квитанций:пациент", null);
		assert.strictEqual(delivered.photoDelivered, false);
		assert.strictEqual(delivered.photoMessageId, null);
	});

	test("квитанция с message_id предпочтительнее квитанции без него", () => {
		const itemId = "post-visit-checkup:позиция-двух-попыток:пациент";
		const newest = partialDeliveryReceipt(itemId, "due-вторая-попытка", null);
		const oldest = partialDeliveryReceipt(itemId, "due-первая-попытка", 555);

		withReceipt(oldest, () => {
			withReceipt(newest, () => {
				const delivered = telegramOutboxDeliveredPartsForItem(itemId, null);
				assert.strictEqual(delivered.photoDelivered, true);
				assert.strictEqual(delivered.photoMessageId, 555, "message_id есть хотя бы в одной попытке — его и показываем");
			});
		});
	});
});
