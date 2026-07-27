/**
 * Состояние автоматической отправки.
 *
 * ЗАЧЕМ ЭТО ПРОВЕРЯТЬ. Обработчик очереди выключен по умолчанию — это верно,
 * рассылка пациентам не должна включаться сама. Но пока состояние не было видно
 * в интерфейсе, возможен был самый дорогой вид сбоя: молчаливый. Администратор
 * уверен, что напоминания уходят; они лежат в очереди; пациенты не приходят, и
 * неделями никто не связывает одно с другим.
 *
 * Проверяется не «функция вернула true», а то, что человеку сказано, что
 * происходит и что делать.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { describeAutomaticSending } from "../services/communications/dispatchWorker.js";

describe("состояние автоматической отправки", () => {
	test("выключено: сказано, что сообщения копятся, и как их отправить", () => {
		const state = describeAutomaticSending({});

		assert.equal(state.enabled, false);
		assert.equal(state.intervalSeconds, null, "интервала у выключенного обработчика нет");
		// Формулировка обязана называть последствие, а не только факт.
		assert.ok(state.detail.includes("копятся"), state.detail);
		// И называть кнопку ТЕМ ЖЕ ИМЕНЕМ, что стоит на экране. Первая редакция
		// этого текста отсылала к кнопке «Отправить сейчас», которой в интерфейсе
		// нет: подсказка в тупик хуже её отсутствия.
		assert.ok(state.detail.includes("Отправить из очереди"), state.detail);
		// И давать выход: имя переменной, а не «обратитесь к администратору».
		assert.equal(state.enableWith, "DENTE_COMMUNICATION_WORKER_ENABLED");
	});

	test("включено: назван интервал, с которым разбирается очередь", () => {
		const state = describeAutomaticSending({
			DENTE_COMMUNICATION_WORKER_ENABLED: "1",
			DENTE_COMMUNICATION_WORKER_INTERVAL_MS: "60000",
			DENTE_COMMUNICATION_WORKER_BATCH_SIZE: "40"
		});

		assert.equal(state.enabled, true);
		assert.equal(state.intervalSeconds, 60);
		assert.equal(state.batchSize, 40);
		assert.ok(state.detail.includes("60"), state.detail);
	});

	test("значения вне допустимых границ не принимаются молча", () => {
		// Интервал в одну секунду означал бы обстрел базы; в сутки — что
		// напоминание о завтрашнем приёме уйдёт послезавтра.
		const tooFast = describeAutomaticSending({
			DENTE_COMMUNICATION_WORKER_ENABLED: "true",
			DENTE_COMMUNICATION_WORKER_INTERVAL_MS: "10"
		});
		assert.equal(tooFast.intervalSeconds, 5, "интервал должен подтягиваться к нижней границе");

		const tooSlow = describeAutomaticSending({
			DENTE_COMMUNICATION_WORKER_ENABLED: "true",
			DENTE_COMMUNICATION_WORKER_INTERVAL_MS: "86400000"
		});
		assert.equal(tooSlow.intervalSeconds, 900, "интервал должен ограничиваться верхней границей");
	});

	test("признак включения читается по-человечески, а не только как «1»", () => {
		for (const value of ["1", "true", "TRUE", "yes"]) {
			assert.equal(describeAutomaticSending({ DENTE_COMMUNICATION_WORKER_ENABLED: value }).enabled, true, value);
		}
		for (const value of ["0", "false", "no", "", "   "]) {
			assert.equal(describeAutomaticSending({ DENTE_COMMUNICATION_WORKER_ENABLED: value }).enabled, false, value);
		}
	});
});
