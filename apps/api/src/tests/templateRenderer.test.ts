import assert from "node:assert/strict";
import test from "node:test";
import {
	channelBodyLimits,
	checkChannelFit,
	findTemplateVariable,
	communicationTemplateVariables,
	describeSmsPayload,
	extractTemplateVariables,
	renderTemplate,
	validateTemplateBody,
} from "../services/communications/templateRenderer.js";

/**
 * Шаблоны сообщений лежали в базе с нулевой ревизии, но подставлять переменные
 * было нечем: notificationWorker брал `payload.text`, а при его отсутствии слал
 * пациенту `JSON.stringify(payload)`. Тесты фиксируют правила, из-за нарушения
 * которых пациент получает испорченный текст или клиника — счёт за лишние
 * сегменты SMS.
 */

test("находит переменные по порядку и без повторов", () => {
	assert.deepEqual(
		extractTemplateVariables(
			"{patient}, приём {date} в {time}. До встречи, {patient}!",
		),
		["patient", "date", "time"],
	);
	assert.deepEqual(extractTemplateVariables("текст без переменных"), []);
});

test("двойные скобки — это литеральные скобки, а не переменная", () => {
	assert.deepEqual(
		extractTemplateVariables("скидка {{ спецпредложение }}"),
		[],
	);
	const rendered = renderTemplate("Формула {{2.6}} — {patient}", {
		patient: "Марина",
	});
	assert.equal(rendered.ok, true);
	assert.equal(rendered.ok && rendered.text, "Формула {2.6} — Марина");
});

test("незаполненная переменная останавливает отправку", () => {
	// Пациент не должен получить «остаток по лечению составляет {amount}».
	const result = renderTemplate("{patient}, остаток {amount}.", {
		patient: "Марина",
	});
	assert.equal(result.ok, false);
	assert.deepEqual(result.ok === false && result.missingVariables, ["amount"]);
});

test("пустая строка и пробелы считаются отсутствующим значением", () => {
	const empty = renderTemplate("Здравствуйте, {patient}.", { patient: "" });
	assert.equal(empty.ok, false);
	const spaces = renderTemplate("Здравствуйте, {patient}.", { patient: "   " });
	assert.equal(spaces.ok, false);
	const nullish = renderTemplate("Здравствуйте, {patient}.", { patient: null });
	assert.equal(nullish.ok, false);
});

test("ноль — это значение, а не пустота", () => {
	const result = renderTemplate("Остаток: {balance} ₽.", { balance: 0 });
	assert.equal(result.ok, true);
	assert.equal(result.ok && result.text, "Остаток: 0 ₽.");
});

test("неизвестная переменная отклоняется на проверке шаблона", () => {
	const validation = validateTemplateBody("Здравствуйте, {pacient}.");
	assert.equal(validation.ok, false);
	assert.deepEqual(validation.unknownVariables, ["pacient"]);
});

test("медицинские переменные не проходят в канал без согласия", () => {
	const denied = validateTemplateBody(
		"Напоминаем о процедуре {procedure}, зуб {tooth}.",
	);
	assert.equal(denied.ok, false);
	assert.deepEqual(denied.phiVariables, ["procedure", "tooth"]);

	const allowed = validateTemplateBody("Напоминаем о процедуре {procedure}.", {
		allowPhi: true,
	});
	assert.equal(allowed.ok, true);
});

test("предпросмотр подставляет примеры вместо пустых значений", () => {
	const preview = renderTemplate(
		"{patient}, приём {date} в {time}.",
		{},
		{ allowEmptyValues: true },
	);
	assert.equal(preview.ok, true);
	assert.equal(preview.ok && preview.text.includes("{"), false);
});

test("у каждой переменной справочника есть подпись и пример", () => {
	for (const variable of communicationTemplateVariables) {
		assert.ok(
			variable.label.trim().length > 0,
			`нет подписи у ${variable.key}`,
		);
		assert.ok(
			variable.example.trim().length > 0,
			`нет примера у ${variable.key}`,
		);
	}
	const keys = communicationTemplateVariables.map((variable) => variable.key);
	assert.equal(new Set(keys).size, keys.length, "ключи переменных повторяются");
});

test("управляющие символы вычищаются, переводы строк остаются", () => {
	const withBell = `Строка${String.fromCharCode(7)}один\n\n\n\nСтрока два`;
	const result = renderTemplate(withBell, {});
	assert.equal(result.ok, true);
	assert.equal(result.ok && result.text, "Строкаодин\n\nСтрока два");
});

test("кириллица считается как UCS-2 по 70 символов", () => {
	// 70 символов кириллицы — ровно один сегмент, 71 — уже два по 67.
	const seventy = "я".repeat(70);
	const first = describeSmsPayload(seventy);
	assert.equal(first.encoding, "ucs2");
	assert.equal(first.segments, 1);
	assert.equal(first.charactersLeftInSegment, 0);

	const seventyOne = describeSmsPayload("я".repeat(71));
	assert.equal(seventyOne.segments, 2);
});

test("латиница считается как GSM-7 по 160 символов", () => {
	const single = describeSmsPayload("a".repeat(160));
	assert.equal(single.encoding, "gsm7");
	assert.equal(single.segments, 1);

	const multipart = describeSmsPayload("a".repeat(161));
	assert.equal(multipart.encoding, "gsm7");
	assert.equal(multipart.segments, 2);
});

test("одна кириллическая буква переводит всё сообщение в UCS-2", () => {
	// Классический источник неожиданного счёта: «ё» в латинском тексте
	// урезает вместимость со 160 символов до 70.
	const mixed = describeSmsPayload(`${"a".repeat(100)}ё`);
	assert.equal(mixed.encoding, "ucs2");
	assert.ok(mixed.segments > 1);
});

test("расширенные символы GSM-7 занимают два места", () => {
	assert.equal(describeSmsPayload("[").characters, 2);
	assert.equal(describeSmsPayload("a").characters, 1);
});

test("длинная SMS отклоняется по числу сегментов", () => {
	const long = checkChannelFit("sms", "я".repeat(400));
	assert.equal(long.ok, false);
	assert.equal(long.sms?.encoding, "ucs2");
	assert.ok(long.sms !== null && long.sms.segments > 4);

	const short = checkChannelFit(
		"sms",
		"Приём завтра в 14:30. Клиника на Ленина.",
	);
	assert.equal(short.ok, true);
	assert.equal(short.sms?.segments, 1);
});

test("превышение предела канала — отказ, а не молчаливое усечение", () => {
	const limit = channelBodyLimits.telegram ?? 4096;
	const result = checkChannelFit("telegram", "я".repeat(limit + 1));
	assert.equal(result.ok, false);
	assert.equal(result.length, limit + 1);
});

test("пустая строка тарифицируется как 0 символов GSM-7", () => {
	const empty = describeSmsPayload("");
	assert.equal(empty.encoding, "gsm7");
	assert.equal(empty.characters, 0);
	assert.equal(empty.segments, 1);
});

test("эмодзи вне BMP занимает две единицы в UCS-2", () => {
	// 🦷 (U+1F9B7) takes 2 code units in UTF-16
	const emoji = describeSmsPayload("🦷");
	assert.equal(emoji.encoding, "ucs2");
	assert.equal(emoji.characters, 2);
	assert.equal(emoji.segments, 1);
});

test("findTemplateVariable находит переменную или возвращает null", () => {
	const patientVar = findTemplateVariable("patient");
	assert.ok(patientVar !== null);
	assert.equal(patientVar.key, "patient");

	const nullVar = findTemplateVariable("unknown_variable");
	assert.equal(nullVar, null);
});

test("пустой текст шаблона возвращает ошибку в validateTemplateBody", () => {
	const validation = validateTemplateBody("   ");
	assert.equal(validation.ok, false);
	assert.ok(validation.problems.includes("Текст шаблона пуст."));
});

test("рендер возвращает ошибку, если после подстановки текст пуст", () => {
	const result = renderTemplate("{patient}", { patient: "" }, { allowEmptyValues: false });
	assert.equal(result.ok, false);
	// In the allowEmptyValues = false case, it will actually trigger missingVariables first, which we already test.

	// How to trigger the block "После подстановки текст оказался пустым."?
	// It happens if body isn't fully empty (so validate passes), but normalizes to empty.
	const result2 = renderTemplate("\x01", {});
	assert.equal(result2.ok, false);
	assert.ok(result2.ok === false && result2.problems.includes("После подстановки текст оказался пустым."));
});

test("базовые символы GSM-7 тарифицируются корректно и бьются на сегменты", () => {
	// Standard GSM-7 string
	const text = "Hello world @$!";
	const payload = describeSmsPayload(text);
	assert.equal(payload.encoding, "gsm7");
	assert.equal(payload.characters, text.length);

	// Test boundary for multi-part GSM-7
	const text160 = "a".repeat(160);
	const payload160 = describeSmsPayload(text160);
	assert.equal(payload160.encoding, "gsm7");
	assert.equal(payload160.segments, 1);
	assert.equal(payload160.charactersLeftInSegment, 0);

	const text161 = "a".repeat(161);
	const payload161 = describeSmsPayload(text161);
	assert.equal(payload161.encoding, "gsm7");
	assert.equal(payload161.segments, 2);
	// multipart is 153 chars per segment, so 2 segments = 306 chars. 306 - 161 = 145 left.
	assert.equal(payload161.charactersLeftInSegment, 145);
});

test("многосоставные сообщения UCS-2 бьются на сегменты по 67 символов", () => {
	// Test boundary for multi-part UCS-2
	const text70 = "я".repeat(70);
	const payload70 = describeSmsPayload(text70);
	assert.equal(payload70.encoding, "ucs2");
	assert.equal(payload70.segments, 1);
	assert.equal(payload70.charactersLeftInSegment, 0);

	const text71 = "я".repeat(71);
	const payload71 = describeSmsPayload(text71);
	assert.equal(payload71.encoding, "ucs2");
	assert.equal(payload71.segments, 2);
	// multipart is 67 chars per segment, so 2 segments = 134 chars. 134 - 71 = 63 left.
	assert.equal(payload71.charactersLeftInSegment, 63);
});
