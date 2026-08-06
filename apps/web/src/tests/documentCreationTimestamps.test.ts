import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { withDocumentCreationTimestamps } from "../documentLogic";

/**
 * Отметка времени в документе равна моменту создания, а не загрузке страницы.
 *
 * ЧТО БЫЛО. В хранилище документов девятнадцать полей даты и времени
 * вычислялись ОДИН РАЗ при загрузке модуля выражениями вида
 * `(() => new Date().toLocaleString("ru-RU"))()`. Значение равнялось моменту
 * открытия вкладки и больше никогда не обновлялось: соответствующие сеттеры
 * никто не звал вне обработчиков ввода. Администратор открывал вкладку утром,
 * вечером создавал договор — «Подписано», «Дата подтверждения согласия», «Дата и
 * время выдачи расписки» несли утренний час. Отличить подставленное от
 * введённого нельзя: поле выглядит заполненным. Для документа, который
 * подписывают, это подделка отметки времени.
 *
 * ЗАЧЕМ ЭТА ПРОВЕРКА, ЕСЛИ ЕСТЬ ЖИВАЯ. Живая проверка
 * scratch/verify-document-timestamps.mjs доказала в браузере, что поля пусты при
 * загрузке и что нажатие «Создать» больше не проваливается молча. Довести её до
 * СОЗДАННОГО документа не удалось: форма согласия требует заполнить вмешательство
 * и подтверждения, и автоматическое заполнение полей до конца не дошло. Значит
 * саму подстановку надо доказать здесь — иначе она остаётся непроверенной.
 */
describe("подстановка отметок времени при создании документа", () => {
	it("пустая отметка заполняется текущим моментом", () => {
		const before = new Date();
		const filled = withDocumentCreationTimestamps({
			informedConsentConfirmedAt: "",
			paidContractSignedAt: "",
		});

		for (const field of [
			"informedConsentConfirmedAt",
			"paidContractSignedAt",
		]) {
			const value = String(filled[field]);
			assert.match(
				value,
				/^\d{2}\.\d{2}\.\d{4},?\s\d{1,2}:\d{2}/,
				`${field}: ожидалась русская дата со временем, получено «${value}»`,
			);
			const [datePart = "", timePart = ""] = value
				.replace(",", "")
				.split(/\s+/);
			const [day, month, year] = datePart.split(".");
			const [hour, minute] = timePart.split(":");
			const stamped = new Date(
				Number(year),
				Number(month) - 1,
				Number(day),
				Number(hour),
				Number(minute),
			);
			const driftMinutes =
				Math.abs(stamped.getTime() - before.getTime()) / 60000;
			assert.ok(
				driftMinutes <= 2,
				`${field}: отметка отстоит от текущего момента на ${driftMinutes.toFixed(1)} мин`,
			);
		}
	});

	it("введённое человеком не затирается", () => {
		const filled = withDocumentCreationTimestamps({
			paidContractSignedAt: "01.01.2020, 09:15",
			paidContractDate: "   ",
		});
		assert.equal(filled.paidContractSignedAt, "01.01.2020, 09:15");
		// Пробелы — это пусто: строка из пробелов не отметка времени.
		assert.notEqual(String(filled.paidContractDate).trim(), "");
	});

	it("поле ввода типа date получает вид ГГГГ-ММ-ДД по местному дню", () => {
		const filled = withDocumentCreationTimestamps({
			outpatient025uOpenedAt: "",
		});
		const value = String(filled.outpatient025uOpenedAt);
		assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
		const now = new Date();
		const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		/*
		 * Сверяется МЕСТНЫЙ день, не UTC. toISOString().slice(0,10) при
		 * положительном смещении часового пояса вечером даёт уже завтрашнее число:
		 * в Самаре (+04:00) после 20:00 карта 025/у открывалась бы завтра.
		 */
		assert.equal(value, expected);
	});

	it("поле datetime-local получает вид, который браузер разбирает", () => {
		const filled = withDocumentCreationTimestamps({
			taxApplicationRequestedAt: "",
		});
		assert.match(
			String(filled.taxApplicationRequestedAt),
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
		);
	});

	it("исходное состояние не изменяется", () => {
		const state = { informedConsentConfirmedAt: "" };
		withDocumentCreationTimestamps(state);
		assert.equal(
			state.informedConsentConfirmedAt,
			"",
			"хранилище должно остаться пустым, иначе следующий документ унесёт время предыдущего",
		);
	});

	it("в хранилище документов не осталось дат, вычисляемых при загрузке модуля", () => {
		const here = dirname(fileURLToPath(import.meta.url));
		const store = readFileSync(
			join(here, "..", "store", "documentStore.ts"),
			"utf8",
		);
		/*
		 * Ловим именно вычисление при загрузке: `new Date()` в значении поля.
		 * Год налогового документа (new Date().getFullYear()) — не отметка времени
		 * события, а разумное умолчание, и остаётся допустимым.
		 */
		const offenders = store
			.split(/\r?\n/)
			.map((line, index) => ({ line: line.trim(), number: index + 1 }))
			.filter(({ line }) => /:\s*(\(\(\)\s*=>\s*)?new Date\(\)/.test(line))
			.filter(({ line }) => !line.includes("getFullYear()"));
		assert.deepEqual(
			offenders.map((o) => `${o.number}: ${o.line}`),
			[],
			"отметки времени обязаны подставляться при создании документа, а не при загрузке страницы",
		);
	});
});
