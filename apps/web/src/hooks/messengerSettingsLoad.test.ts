import assert from "node:assert/strict";
import test from "node:test";
import {
	MAX_SETTINGS_SAVE_BLOCKED_MESSAGE,
	MAX_SETTINGS_SAVE_WHILE_LOADING_MESSAGE,
	maxSaveGuardVerdict,
	normalizeMaxStaffRouting,
	parseMaxSettingsPayload,
} from "./useMaxSettings.js";
import {
	normalizeWhatsappStaffRouting,
	parseWhatsappSettingsPayload,
	WHATSAPP_SETTINGS_SAVE_BLOCKED_MESSAGE,
	WHATSAPP_SETTINGS_SAVE_WHILE_LOADING_MESSAGE,
	whatsappSaveGuardVerdict,
} from "./useWhatsappSettings.js";

/**
 * Чтение настроек мессенджеров и запрет сохранения непрочитанного.
 *
 * ЧТО ПРОВЕРЯЕТСЯ ПО ПАМЯТИ О КОНКРЕТНОМ ДЕФЕКТЕ. Оба хука настроек глотали
 * провал чтения (`console.error` и всё), отдавали наружу пустые черновики — и
 * следом PUT отправлял эти черновики целиком. Сервер пишет каждое присутствующее
 * поле, поэтому за одно нажатие «Сохранить» обнулялись webhookUrl и роутинг MAX,
 * а у WhatsApp ещё phoneNumberId, verify-токен и список включённых функций.
 *
 * Отсюда два обязательных утверждения, и оба про подмену состояний:
 *
 *   1. Ответ-отказ (401/403/500, пустое тело, HTML от прокси) НИКОГДА не
 *      разбирается как «настроек нет». 404 — единственный код, при котором
 *      пустота законна.
 *   2. Пока черновики не заполнены ответом сервера, сохранение запрещено, и
 *      запрет объясняется человеческим текстом с подсказкой, что делать.
 *
 * Хук целиком (эффект, состояния React) здесь не запускается: в проекте нет ни
 * jsdom, ни testing-library. Поэтому решения вынесены в чистые функции и
 * проверяются они; то, что `save()` вызывает запрет ДО fetch, проверено чтением
 * кода, а не этим тестом.
 */

const LATIN_EXCEPT_CHANNEL_NAMES = /[A-Za-z]/;

/* ------------------------------------------------------------------ */
/*  Отказ чтения не имеет права выглядеть как «канал не настроен»      */
/* ------------------------------------------------------------------ */

test("отказ сервера не разбирается как «настроек нет» (MAX)", () => {
	// Ровно тот ответ, который раньше уходил в console.error и оставлял пустые
	// черновики: тело — корректный JSON-объект, и прежний код на него не смотрел.
	const denied = parseMaxSettingsPayload(
		403,
		'{"error":"Forbidden","message":"Нет доступа"}',
	);
	assert.equal(denied.ok, false);
	assert.equal(denied.ok === false && denied.status, 403);

	const failed = parseMaxSettingsPayload(500, '{"message":"Сбой базы"}');
	assert.equal(failed.ok, false);
	assert.equal(failed.ok === false && failed.status, 500);

	// Пустое тело на успешном статусе — испорченный ответ, а не отсутствие бота.
	assert.equal(parseMaxSettingsPayload(200, "").ok, false);
	assert.equal(parseMaxSettingsPayload(200, "   ").ok, false);
	// HTML от прокси: раньше на нём падал res.json().
	assert.equal(parseMaxSettingsPayload(200, "<html>502</html>").ok, false);
	// Массив вместо объекта настроек — тоже не настройки.
	assert.equal(parseMaxSettingsPayload(200, "[]").ok, false);
});

test("отказ сервера не разбирается как «настроек нет» (WhatsApp)", () => {
	const denied = parseWhatsappSettingsPayload(401, '{"message":"Нет доступа"}');
	assert.equal(denied.ok, false);
	assert.equal(denied.ok === false && denied.status, 401);

	assert.equal(parseWhatsappSettingsPayload(503, "").ok, false);
	assert.equal(parseWhatsappSettingsPayload(200, "").ok, false);
	assert.equal(parseWhatsappSettingsPayload(200, "не json").ok, false);
	assert.equal(parseWhatsappSettingsPayload(200, "null").ok, false);
});

test("404 — это прочитанная пустота: канал ещё не настроен", () => {
	const max = parseMaxSettingsPayload(
		404,
		'{"error":"MaxConfigNotFound","message":"MAX-бот не настроен."}',
	);
	assert.equal(max.ok, true);
	assert.equal(max.ok === true && max.settings, null);

	const whatsapp = parseWhatsappSettingsPayload(404, "");
	assert.equal(whatsapp.ok, true);
	assert.equal(whatsapp.ok === true && whatsapp.settings, null);
});

/* ------------------------------------------------------------------ */
/*  Приведение полей: в разметке не должно остаться неизвестных типов   */
/* ------------------------------------------------------------------ */

test("настройки MAX читаются полностью и приводятся к типам", () => {
	const outcome = parseMaxSettingsPayload(
		200,
		JSON.stringify({
			id: "cfg-1",
			organizationId: "org-1",
			botId: " bot-42 ",
			hasToken: true,
			webhookUrl: "https://clinic.example/api/max/webhook",
			enabledFeatures: ["appointment_reminders", 7, null],
			staffRouting: {
				defaultUserId: "11111111-1111-1111-1111-111111111111",
				rules: [
					{ intent: "appointment_booking", assignToUserId: null },
					{ intent: "", assignToUserId: "x" },
					"мусор",
				],
			},
			isActive: true,
			updatedAt: "2026-07-27T10:00:00.000Z",
		}),
	);
	assert.equal(outcome.ok, true);
	if (!outcome.ok || outcome.settings === null) return;
	const settings = outcome.settings;
	assert.equal(settings.botId, "bot-42");
	assert.equal(settings.hasToken, true);
	assert.equal(settings.isActive, true);
	assert.equal(settings.webhookUrl, "https://clinic.example/api/max/webhook");
	// Мусор в списке функций отброшен, а не доехал до `.includes` в разметке.
	assert.deepEqual(settings.enabledFeatures, ["appointment_reminders"]);
	// Правило без типа запроса и не-объект отброшены: MessengerRoutingRules
	// печатает rules напрямую, и такое правило меняло бы чужое при первом клике.
	assert.deepEqual(settings.staffRouting.rules, [
		{ intent: "appointment_booking", assignToUserId: null },
	]);
});

test("настройки WhatsApp читаются полностью и приводятся к типам", () => {
	const outcome = parseWhatsappSettingsPayload(
		200,
		JSON.stringify({
			id: "cfg-2",
			organizationId: "org-1",
			phoneNumberId: "123456789",
			hasToken: "да",
			webhookVerifyToken: "  секрет  ",
			enabledFeatures: "recalls",
			staffRouting: null,
			isActive: false,
			updatedAt: "2026-07-27T10:00:00.000Z",
		}),
	);
	assert.equal(outcome.ok, true);
	if (!outcome.ok || outcome.settings === null) return;
	const settings = outcome.settings;
	assert.equal(settings.phoneNumberId, "123456789");
	assert.equal(settings.webhookVerifyToken, "секрет");
	// hasToken приходит не булевым — бейдж «установлен» не имеет права загораться
	// от строки.
	assert.equal(settings.hasToken, false);
	// enabledFeatures не массив: в разметке `.includes` уронил бы весь раздел.
	assert.deepEqual(settings.enabledFeatures, []);
});

test("staffRouting = null из parseJsonSafe не роняет список правил", () => {
	// routes/max.ts и routes/whatsapp.ts собирают это поле через parseJsonSafe: на
	// испорченной строке в БД оттуда законно приходит null, а панель передаёт
	// значение прямо в MessengerRoutingRules, где routing.rules.map(...) падает.
	for (const routing of [
		normalizeMaxStaffRouting(null),
		normalizeMaxStaffRouting("[]"),
		normalizeMaxStaffRouting({ rules: "нет" }),
		normalizeWhatsappStaffRouting(undefined),
		normalizeWhatsappStaffRouting(42),
	]) {
		assert.equal(routing.defaultUserId, null);
		assert.ok(Array.isArray(routing.rules));
		assert.equal(routing.rules.length, 0);
	}
});

/* ------------------------------------------------------------------ */
/*  Запрет сохранения непрочитанных настроек                           */
/* ------------------------------------------------------------------ */

test("сохранение запрещено, пока черновики не заполнены с сервера", () => {
	// Провал чтения: запрос закончился, черновики так и остались пустыми. Это тот
	// самый случай, в котором PUT затирал живые настройки клиники.
	const maxBlocked = maxSaveGuardVerdict({
		loading: false,
		draftsSeeded: false,
	});
	assert.equal(maxBlocked.allowed, false);
	assert.equal(
		maxBlocked.allowed === false && maxBlocked.message,
		MAX_SETTINGS_SAVE_BLOCKED_MESSAGE,
	);

	const whatsappBlocked = whatsappSaveGuardVerdict({
		loading: false,
		draftsSeeded: false,
	});
	assert.equal(whatsappBlocked.allowed, false);
	assert.equal(
		whatsappBlocked.allowed === false && whatsappBlocked.message,
		WHATSAPP_SETTINGS_SAVE_BLOCKED_MESSAGE,
	);
});

test("во время чтения сохранение тоже запрещено, и текст другой", () => {
	// Иначе правки администратора перезаписались бы ответом, который уже в пути.
	for (const verdict of [
		maxSaveGuardVerdict({ loading: true, draftsSeeded: true }),
		maxSaveGuardVerdict({ loading: true, draftsSeeded: false }),
	]) {
		assert.equal(verdict.allowed, false);
		assert.equal(
			verdict.allowed === false && verdict.message,
			MAX_SETTINGS_SAVE_WHILE_LOADING_MESSAGE,
		);
	}
	const whatsapp = whatsappSaveGuardVerdict({
		loading: true,
		draftsSeeded: true,
	});
	assert.equal(whatsapp.allowed, false);
	assert.equal(
		whatsapp.allowed === false && whatsapp.message,
		WHATSAPP_SETTINGS_SAVE_WHILE_LOADING_MESSAGE,
	);
	// Два запрета — два РАЗНЫХ текста: «дождитесь» и «нажмите Обновить» — это
	// разные действия администратора.
	assert.notEqual(
		MAX_SETTINGS_SAVE_WHILE_LOADING_MESSAGE,
		MAX_SETTINGS_SAVE_BLOCKED_MESSAGE,
	);
	assert.notEqual(
		WHATSAPP_SETTINGS_SAVE_WHILE_LOADING_MESSAGE,
		WHATSAPP_SETTINGS_SAVE_BLOCKED_MESSAGE,
	);
});

test("после успешного чтения сохранение разрешено", () => {
	// В том числе после 404: настроек ещё нет, и PUT их создаёт.
	assert.equal(
		maxSaveGuardVerdict({ loading: false, draftsSeeded: true }).allowed,
		true,
	);
	assert.equal(
		whatsappSaveGuardVerdict({ loading: false, draftsSeeded: true }).allowed,
		true,
	);
});

test("текст запрета говорит человеку, что делать, и без машинных слов", () => {
	const messages = [
		MAX_SETTINGS_SAVE_BLOCKED_MESSAGE,
		MAX_SETTINGS_SAVE_WHILE_LOADING_MESSAGE,
		WHATSAPP_SETTINGS_SAVE_BLOCKED_MESSAGE,
		WHATSAPP_SETTINGS_SAVE_WHILE_LOADING_MESSAGE,
	];
	for (const message of messages) {
		// Ни кода ответа, ни английского исключения — их место в console.error.
		assert.equal(/[0-9]/.test(message), false, message);
		assert.equal(
			LATIN_EXCEPT_CHANNEL_NAMES.test(message.replace(/MAX|WhatsApp/g, "")),
			false,
			message,
		);
		// Подсказка обязательна: запрет без действия — тупик.
		assert.ok(
			message.includes("Нажмите «Обновить»") ||
				message.includes("Дождитесь загрузки"),
			message,
		);
	}
});
