import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	dayConfirmationsRequestPath,
	dayConfirmationsShownDay,
} from "../components/schedule/DayConfirmationsPanel";

/**
 * ДЕНЬ УТРЕННЕГО ОБЗВОНА СЧИТАЕТ СЕРВЕР, А НЕ БРАУЗЕР.
 *
 * Запуск: из apps/web
 *   node --import tsx --import ./testCssStub.mjs --test \
 *     src/tests/dayConfirmationsPanelDefaultDay.test.ts
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. В панели стояла своя функция tomorrowIsoDate:
 *   const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
 * Сутки не всегда равны 24 часам — в день перехода на зимнее время их 25, и
 * прибавленные 24 часа не доводят до следующей календарной даты. Плюс день
 * раскладывался местными полями Date, то есть в поясе БРАУЗЕРА, а не в поясе
 * клиники.
 *
 * И самое дорогое: посчитанная дата всегда уходила в запрос параметром date,
 * поэтому серверный расчёт «даты нет — считаю завтра календарно в поясе
 * клиники» (apps/api/src/routes/dayConfirmations.ts, tomorrowInTimeZone) в
 * рабочем пути не исполнялся НИ РАЗУ. Починка на сервере существовала и не
 * работала. Ошибка тихая: администратор обзванивает не тот день, а завтрашние
 * приёмы остаются без подтверждения.
 *
 * Поэтому сторож проверяет два разных утверждения:
 *   1. поведение — за первым запросом дня нет, и поле ввода берёт день из
 *      ответа сервера;
 *   2. текст модуля — в панели не осталось расчёта календарного дня по
 *      миллисекундам. Без второй проверки прежний расчёт можно вернуть в обход
 *      этих функций, и первая проверка этого не заметит.
 */

describe("панель обзвона: день выбирает сервер", () => {
	it("без выбранного дня запрос идёт БЕЗ параметра date", () => {
		const path = dayConfirmationsRequestPath("");
		assert.equal(path, "/api/schedule/day-confirmations");
		// Именно отсутствие date включает серверный tomorrowInTimeZone.
		assert.ok(
			!path.includes("date="),
			`в первом запросе не должно быть дня: ${path}`,
		);
	});

	it("пробелы вместо дня — это тоже «дня нет»", () => {
		assert.equal(
			dayConfirmationsRequestPath("   "),
			"/api/schedule/day-confirmations",
		);
	});

	it("выбранный человеком день уходит в запрос закодированным", () => {
		assert.equal(
			dayConfirmationsRequestPath("2026-11-01"),
			"/api/schedule/day-confirmations?date=2026-11-01",
		);
	});

	it("поле ввода показывает день из ответа сервера, пока никто не выбирал", () => {
		assert.equal(
			dayConfirmationsShownDay("", { date: "2026-11-02" }),
			"2026-11-02",
		);
	});

	it("выбор человека главнее ответа сервера", () => {
		assert.equal(
			dayConfirmationsShownDay("2026-12-31", { date: "2026-11-02" }),
			"2026-12-31",
		);
	});

	it("до первого ответа поле пусто, а не заполнено выдуманным днём", () => {
		assert.equal(dayConfirmationsShownDay("", null), "");
	});
});

describe("панель обзвона: календарного дня по миллисекундам в модуле нет", () => {
	const source = readFileSync(
		join(
			dirname(fileURLToPath(import.meta.url)),
			"..",
			"components",
			"schedule",
			"DayConfirmationsPanel.tsx",
		),
		"utf8",
	);

	/**
	 * Ищем только в коде: разбор дефекта в комментариях обязан называть прежний
	 * расчёт дословно, иначе следующий агент не поймёт, что именно было сломано.
	 */
	const code = source
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/^\s*\/\/.*$/gm, " ")
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

	it("нет прибавления суток в миллисекундах", () => {
		assert.ok(
			!/24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(code),
			"сутки нельзя прибавлять как 24 часа: в день перехода на зимнее время их 25",
		);
		assert.ok(
			!/86_?400_?000/.test(code),
			"86400000 — те же 24 часа, записанные числом",
		);
	});

	it("панель не собирает календарный день из полей Date", () => {
		assert.ok(
			!/getDate\(\)/.test(code),
			"день клиники в браузере не вычисляется — его отдаёт сервер",
		);
		assert.ok(
			!/getMonth\(\)/.test(code),
			"месяц клиники в браузере не вычисляется — его отдаёт сервер",
		);
		assert.ok(
			!/toISOString\(\)/.test(code),
			"toISOString даёт день по UTC, а не день клиники",
		);
	});
});
