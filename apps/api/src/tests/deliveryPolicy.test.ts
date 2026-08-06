import assert from "node:assert/strict";
import test from "node:test";
import {
	computeRetryDelaySeconds,
	decideAfterFailure,
	decideConsent,
	decideQuietHours,
	isQuietMinute,
	isRetryableErrorClass,
	minuteOfDayInTimeZone,
	minutesUntilQuietHoursEnd,
	type QuietHoursSettings,
	type RetryPolicySettings,
} from "../services/communications/deliveryPolicy.js";

/**
 * Прежний обработчик очереди (services/notificationWorker.ts) писал в любое
 * время суток, не спрашивал согласия и не повторял отправку: любая ошибка
 * ставила failed навсегда, поэтому секундный сетевой сбой означал, что пациент
 * не узнает о завтрашнем приёме. Здесь закреплены правила, которые это чинят.
 */

const settings: QuietHoursSettings = {
	timezone: "Europe/Moscow",
	quietHoursStartMinute: 21 * 60,
	quietHoursEndMinute: 9 * 60,
	deferServiceInQuietHours: true,
	blockMarketingInQuietHours: true,
};

const retrySettings: RetryPolicySettings = {
	retryBaseSeconds: 60,
	retryMaxSeconds: 3600,
};

test("тихие часы через полночь считаются правильно", () => {
	// Окно 21:00 → 09:00 переходит через полночь: простое «между» здесь врёт.
	assert.equal(isQuietMinute(22 * 60, 21 * 60, 9 * 60), true);
	assert.equal(isQuietMinute(2 * 60, 21 * 60, 9 * 60), true);
	assert.equal(isQuietMinute(8 * 60 + 59, 21 * 60, 9 * 60), true);
	assert.equal(isQuietMinute(9 * 60, 21 * 60, 9 * 60), false);
	assert.equal(isQuietMinute(14 * 60, 21 * 60, 9 * 60), false);
	assert.equal(isQuietMinute(20 * 60 + 59, 21 * 60, 9 * 60), false);
});

test("тихие часы без перехода через полночь считаются правильно", () => {
	// Окно 09:00 → 21:00 (дневной отдых)
	assert.equal(isQuietMinute(8 * 60 + 59, 9 * 60, 21 * 60), false);
	assert.equal(isQuietMinute(9 * 60, 9 * 60, 21 * 60), true);
	assert.equal(isQuietMinute(15 * 60, 9 * 60, 21 * 60), true);
	assert.equal(isQuietMinute(20 * 60 + 59, 9 * 60, 21 * 60), true);
	assert.equal(isQuietMinute(21 * 60, 9 * 60, 21 * 60), false);
	assert.equal(isQuietMinute(22 * 60, 9 * 60, 21 * 60), false);
});

test("тихие часы корректно обрабатывают отрицательные минуты и минуты больше суток", () => {
	assert.equal(isQuietMinute(-60, 21 * 60, 9 * 60), true); // -60 mod 1440 = 1380 (23:00)
	assert.equal(isQuietMinute(-600, 9 * 60, 21 * 60), true); // -600 mod 1440 = 840 (14:00)
	assert.equal(isQuietMinute(1440 + 60, 21 * 60, 9 * 60), true); // 1500 mod 1440 = 60 (01:00)
});

test("окно нулевой длины означает отсутствие тихих часов", () => {
	assert.equal(isQuietMinute(3 * 60, 9 * 60, 9 * 60), false);
});

test("ожидание до конца тихих часов", () => {
	assert.equal(minutesUntilQuietHoursEnd(22 * 60, 21 * 60, 9 * 60), 11 * 60);
	assert.equal(minutesUntilQuietHoursEnd(2 * 60, 21 * 60, 9 * 60), 7 * 60);
	assert.equal(minutesUntilQuietHoursEnd(14 * 60, 21 * 60, 9 * 60), 0);
});

test("время считается в часовом поясе клиники, а не сервера", () => {
	// 2026-07-27 20:30 UTC — это 23:30 в Москве (UTC+3), 00:30 уже следующих
	// суток в Самаре (UTC+4) и 01:30 в Екатеринбурге (UTC+5).
	const moment = new Date("2026-07-27T20:30:00Z");
	assert.equal(minuteOfDayInTimeZone(moment, "Europe/Moscow"), 23 * 60 + 30);
	assert.equal(minuteOfDayInTimeZone(moment, "Europe/Samara"), 30);
	assert.equal(minuteOfDayInTimeZone(moment, "Asia/Yekaterinburg"), 60 + 30);
	assert.equal(minuteOfDayInTimeZone(moment, "UTC"), 20 * 60 + 30);
});

test("корректно обрабатываются дробные смещения часовых поясов", () => {
	const moment = new Date("2026-07-27T12:00:00Z"); // 12:00 UTC
	// Индия: UTC+5:30 -> 17:30
	assert.equal(minuteOfDayInTimeZone(moment, "Asia/Kolkata"), 17 * 60 + 30);
	// Непал: UTC+5:45 -> 17:45
	assert.equal(minuteOfDayInTimeZone(moment, "Asia/Kathmandu"), 17 * 60 + 45);
});

test("корректно обрабатываются переходы на летнее/зимнее время", () => {
	// Нью-Йорк зимой (EST = UTC-5)
	const winter = new Date("2026-01-15T17:00:00Z"); // 17:00 UTC -> 12:00 EST
	assert.equal(minuteOfDayInTimeZone(winter, "America/New_York"), 12 * 60);

	// Нью-Йорк летом (EDT = UTC-4)
	const summer = new Date("2026-07-15T17:00:00Z"); // 17:00 UTC -> 13:00 EDT
	assert.equal(minuteOfDayInTimeZone(summer, "America/New_York"), 13 * 60);
});

test("корректно обрабатывается полночь", () => {
	const midnight = new Date("2026-07-27T00:00:00Z");
	assert.equal(minuteOfDayInTimeZone(midnight, "UTC"), 0); // 00:00 = 0 минут
});

test("неизвестный часовой пояс не роняет рассылку", () => {
	const moment = new Date("2026-07-27T20:30:00Z");
	assert.equal(minuteOfDayInTimeZone(moment, "Марс/Олимп"), 20 * 60 + 30);
});

test("сервисное сообщение в тихие часы откладывается, а не отменяется", () => {
	// Напоминание о завтрашнем приёме нужно доставить — просто не ночью.
	const night = new Date("2026-07-27T20:30:00Z"); // 23:30 по Москве
	const decision = decideQuietHours(night, "service", settings);
	assert.equal(decision.action, "defer");
	if (decision.action === "defer") {
		// До 09:00 по Москве остаётся 9 часов 30 минут.
		assert.equal(
			decision.notBefore.getTime() - night.getTime(),
			(9 * 60 + 30) * 60_000,
		);
	}
});

test("рекламное сообщение в тихие часы не отправляется вовсе", () => {
	const night = new Date("2026-07-27T20:30:00Z");
	const decision = decideQuietHours(night, "marketing", settings);
	assert.equal(decision.action, "suppress");
});

test("днём отправляются оба вида сообщений", () => {
	const day = new Date("2026-07-27T11:00:00Z"); // 14:00 по Москве
	assert.equal(decideQuietHours(day, "service", settings).action, "send");
	assert.equal(decideQuietHours(day, "marketing", settings).action, "send");
});

test("сервисные сообщения допустимы по умолчанию, рекламные — нет", () => {
	// ФЗ «О рекламе» ст. 18 ч. 1: реклама по сетям электросвязи только с
	// предварительного согласия. Напоминание о приёме рекламой не является.
	assert.equal(decideConsent([], "sms", "service").allowed, true);
	assert.equal(decideConsent([], "sms", "marketing").allowed, false);
});

test("явный отказ перекрывает умолчание", () => {
	const records = [
		{ channel: "sms", scope: "service", state: "revoked" } as const,
	];
	assert.equal(decideConsent(records, "sms", "service").allowed, false);
	// Отказ по SMS не запрещает писать в Telegram.
	assert.equal(decideConsent(records, "telegram", "service").allowed, true);
});

test("согласие на рекламу по одному каналу не распространяется на другие", () => {
	const records = [
		{ channel: "email", scope: "marketing", state: "granted" } as const,
	];
	assert.equal(decideConsent(records, "email", "marketing").allowed, true);
	assert.equal(decideConsent(records, "sms", "marketing").allowed, false);
});

test("отказ от рекламы не блокирует сервисные сообщения", () => {
	const records = [
		{ channel: "sms", scope: "marketing", state: "revoked" } as const,
	];
	assert.equal(decideConsent(records, "sms", "service").allowed, true);
	assert.equal(decideConsent(records, "sms", "marketing").allowed, false);
});

test("повторять имеет смысл только преходящие причины", () => {
	assert.equal(isRetryableErrorClass("network"), true);
	assert.equal(isRetryableErrorClass("timeout"), true);
	assert.equal(isRetryableErrorClass("rate_limited"), true);
	assert.equal(isRetryableErrorClass("server"), true);

	// Неверный ключ доступа и заблокированный чат повторами не лечатся.
	assert.equal(isRetryableErrorClass("auth"), false);
	assert.equal(isRetryableErrorClass("chat_blocked"), false);
	assert.equal(isRetryableErrorClass("recipient_unavailable"), false);
	assert.equal(isRetryableErrorClass("bad_request"), false);
	assert.equal(isRetryableErrorClass("not_configured"), false);
});

test("выдержка растёт экспоненциально и упирается в потолок", () => {
	const first = computeRetryDelaySeconds(1, "network", retrySettings, "seed");
	const second = computeRetryDelaySeconds(2, "network", retrySettings, "seed");
	const third = computeRetryDelaySeconds(3, "network", retrySettings, "seed");

	// Разброс ±20 %, поэтому сравниваем с допуском.
	assert.ok(first >= 48 && first <= 72, `первая пауза ${first}`);
	assert.ok(second >= 96 && second <= 144, `вторая пауза ${second}`);
	assert.ok(third >= 192 && third <= 288, `третья пауза ${third}`);

	const far = computeRetryDelaySeconds(20, "network", retrySettings, "seed");
	assert.ok(far <= 3600 * 1.2, `потолок пробит: ${far}`);
});

test("испорченный счётчик попыток не приводит к переполнению", () => {
	const delay = computeRetryDelaySeconds(
		9999,
		"network",
		retrySettings,
		"seed",
	);
	assert.ok(
		Number.isFinite(delay) && delay <= 3600 * 1.2,
		`неожиданная пауза ${delay}`,
	);
});

test("разброс детерминирован, но различается между сообщениями", () => {
	assert.equal(
		computeRetryDelaySeconds(1, "network", retrySettings, "outbox-a"),
		computeRetryDelaySeconds(1, "network", retrySettings, "outbox-a"),
	);
	// Сотня отложенных сообщений не должна вернуться в шлюз одной пачкой.
	const delays = new Set(
		Array.from({ length: 20 }, (_unused, index) =>
			computeRetryDelaySeconds(1, "network", retrySettings, `outbox-${index}`),
		),
	);
	assert.ok(delays.size > 1, "разброс не работает");
});

test("закончившиеся деньги ждут не меньше получаса", () => {
	// Повторять каждую минуту бессмысленно: пока счёт не пополнят, не пройдёт.
	const delay = computeRetryDelaySeconds(
		1,
		"insufficient_funds",
		retrySettings,
		"seed",
	);
	assert.ok(delay >= 1800 * 0.8, `пауза слишком мала: ${delay}`);
});

test("исчерпание попыток превращает повтор в окончательный отказ", () => {
	const outcome = decideAfterFailure({
		attempt: 5,
		maxAttempts: 5,
		errorClass: "network",
		errorMessage: "нет сети",
		settings: retrySettings,
	});
	assert.equal(outcome.kind, "failed");
});

test("непреходящая ошибка не расходует попытки впустую", () => {
	const outcome = decideAfterFailure({
		attempt: 1,
		maxAttempts: 5,
		errorClass: "auth",
		errorMessage: "неверный ключ",
		settings: retrySettings,
	});
	assert.equal(outcome.kind, "failed");
});

test("ненастроенный канал помечается отдельно от отказа", () => {
	// Это не «шлюз отклонил», а «отправлять нечем» — причина другая и
	// действие администратора тоже.
	const outcome = decideAfterFailure({
		attempt: 1,
		maxAttempts: 5,
		errorClass: "not_configured",
		errorMessage: "нет ключей",
		settings: retrySettings,
	});
	assert.equal(outcome.kind, "suppressed");
});

test("преходящая ошибка при незакончившихся попытках даёт повтор", () => {
	const outcome = decideAfterFailure({
		attempt: 2,
		maxAttempts: 5,
		errorClass: "server",
		errorMessage: "шлюз недоступен",
		settings: retrySettings,
		jitterSeed: "row",
	});
	assert.equal(outcome.kind, "retry");
	assert.ok(outcome.kind === "retry" && outcome.delaySeconds > 0);
});
