import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeJournal } from "./journalDigest.js";

describe("журнал связи: недоставленное не выдаётся за успех", () => {
	it("считает упавшие и пропущенные отдельно и снимает зелёный цвет плашки", () => {
		const digest = summarizeJournal([
			{ direction: "outbound", status: "delivered" },
			{ direction: "outbound", status: "failed" },
			{ direction: "outbound", status: "failed" },
			{ direction: "outbound", status: "skipped" },
			{ direction: "inbound", status: "delivered" },
		]);
		assert.equal(digest.phase, "ready");
		assert.equal(digest.total, 5);
		assert.equal(digest.undelivered, 3);
		assert.equal(digest.undeliveredLabel, "3 сообщения не дошли");
		assert.equal(digest.totalPillClass, "status-pill status-cancelled");
	});

	it("оставляет зелёный цвет, когда всё дошло", () => {
		const digest = summarizeJournal([
			{ direction: "outbound", status: "delivered" },
			{ direction: "outbound", status: "completed" },
		]);
		assert.equal(digest.undelivered, 0);
		assert.equal(digest.undeliveredLabel, null);
		assert.equal(digest.totalPillClass, "status-pill status-confirmed");
	});

	it("не путает очередь с отказом: ожидание отправки — не потеря", () => {
		const digest = summarizeJournal([
			{ direction: "outbound", status: "queued" },
			{ direction: "outbound", status: "scheduled" },
			{ direction: "outbound", status: "needs_call" },
		]);
		assert.equal(digest.undelivered, 0);
		assert.equal(digest.pending, 3);
		assert.equal(digest.pendingLabel, "3 сообщения ещё не отправлены");
		assert.equal(digest.totalPillClass, "status-pill status-confirmed");
	});

	it("согласует числительные во всех трёх формах, включая 11-14", () => {
		const one = summarizeJournal([{ status: "failed" }]);
		assert.equal(one.totalLabel, "1 запись");
		assert.equal(one.undeliveredLabel, "1 сообщение не дошло");

		const many = summarizeJournal(Array.from({ length: 5 }, () => ({ status: "failed" as const })));
		assert.equal(many.totalLabel, "5 записей");
		assert.equal(many.undeliveredLabel, "5 сообщений не дошло");

		const teen = summarizeJournal(Array.from({ length: 12 }, () => ({ status: "failed" as const })));
		assert.equal(teen.totalLabel, "12 записей");
		assert.equal(teen.undeliveredLabel, "12 сообщений не дошло");
	});
});

describe("журнал связи: три состояния вместо пустого места", () => {
	it("ответ без списка событий — это отказ, а не «сообщений нет»", () => {
		for (const broken of [undefined, null, {}, "нет"]) {
			const digest = summarizeJournal(broken);
			assert.equal(digest.phase, "failed");
			assert.equal(digest.total, 0);
			assert.match(digest.title, /не прочитан/);
			assert.match(digest.hint, /Не считайте, что сообщений не было/);
			assert.doesNotMatch(digest.title, /[A-Za-z]/);
		}
	});

	it("честная пустота говорит, откуда возьмутся записи", () => {
		const digest = summarizeJournal([]);
		assert.equal(digest.phase, "empty");
		assert.equal(digest.total, 0);
		assert.match(digest.title, /пока нет записей/);
		assert.match(digest.hint, /Отправке сообщений/);
		assert.equal(digest.undeliveredLabel, null);
	});

	it("ни в одном состоянии на экран не уходит латиница или код ответа", () => {
		for (const input of [undefined, [], [{ status: "failed" }]]) {
			const digest = summarizeJournal(input);
			assert.doesNotMatch(digest.title + digest.hint, /[A-Za-z]{3,}/);
		}
	});
});
