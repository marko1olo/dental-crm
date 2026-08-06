/**
 * Отказ сервера не имеет права выглядеть как «сценариев нет».
 *
 * Проверяется ровно то, что было сломано во вкладке «Сценарии»: любой отказ
 * чтения превращался в пустой список, и экран приглашал создать первый сценарий
 * на сервере, у которого нет такого адреса вовсе.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
	normalizeClinicWorkflow,
	parseWorkflowsPayload,
	WORKFLOWS_PANEL_SUBJECT,
	workflowsCountLabel,
	workflowTriggerLabel,
} from "./settingsWorkflowsPanel";

describe("чтение списка сценариев", () => {
	test("404 — это отказ, а не пустой список", () => {
		const outcome = parseWorkflowsPayload(404, "");
		assert.equal(outcome.ok, false);
		assert.equal(outcome.ok === false && outcome.status, 404);
	});

	test("500 с телом-объектом — тоже отказ", () => {
		const outcome = parseWorkflowsPayload(500, '{"error":"boom"}');
		assert.equal(outcome.ok, false);
	});

	test("пустое тело на успешном статусе не считается пустым списком", () => {
		const outcome = parseWorkflowsPayload(200, "   ");
		assert.equal(outcome.ok, false);
	});

	test("успешный ответ без поля workflows — отказ, а не пустота", () => {
		const outcome = parseWorkflowsPayload(200, '{"items":[]}');
		assert.equal(outcome.ok, false);
	});

	test("не-JSON в теле не роняет разбор", () => {
		const outcome = parseWorkflowsPayload(200, "<html>502 Bad Gateway</html>");
		assert.equal(outcome.ok, false);
	});

	test("пустой массив — честная пустота", () => {
		const outcome = parseWorkflowsPayload(200, '{"workflows":[]}');
		assert.equal(outcome.ok, true);
		assert.deepEqual(outcome.ok === true && outcome.workflows, []);
	});

	test("строка без id отбрасывается: иначе кнопки уйдут на .../undefined", () => {
		const outcome = parseWorkflowsPayload(
			200,
			'{"workflows":[{"name":"Без ключа"},{"id":"w1","name":"NPS","trigger":"recall_due","active":true}]}',
		);
		assert.equal(outcome.ok, true);
		const rows = outcome.ok === true ? outcome.workflows : [];
		assert.equal(rows.length, 1);
		assert.deepEqual(rows[0], {
			id: "w1",
			name: "NPS",
			trigger: "recall_due",
			active: true,
		});
	});

	test("сценарий без названия остаётся в списке — его надо дать удалить", () => {
		const row = normalizeClinicWorkflow({
			id: "w2",
			trigger: "invoice_issued",
		});
		assert.equal(row?.name, "Сценарий без названия");
		assert.equal(row?.active, false);
	});

	test("active приходит строкой — это не «включён»", () => {
		const row = normalizeClinicWorkflow({ id: "w3", active: "true" });
		assert.equal(row?.active, false);
	});
});

describe("подпись события", () => {
	test("известный ключ подписан по-русски", () => {
		assert.equal(workflowTriggerLabel("appointment_booked"), "Новая запись");
	});

	test("незнакомый ключ не подаётся как название события", () => {
		const label = workflowTriggerLabel("appointment_cancelled");
		assert.match(label, /^Незнакомое событие/);
		assert.ok(label.includes("appointment_cancelled"));
	});

	test("пустой ключ не даёт пустой подписи", () => {
		assert.equal(
			workflowTriggerLabel("  "),
			"Событие не указано — сообщите администратору",
		);
	});
});

describe("подзаголовок с количеством", () => {
	test("при отказе не утверждается, что сценариев ноль", () => {
		assert.equal(
			workflowsCountLabel({ phase: "failed", status: 404 }, 0),
			"Список не прочитан",
		);
	});

	test("во время чтения не утверждается ничего о количестве", () => {
		assert.equal(
			workflowsCountLabel({ phase: "loading" }, 0),
			"Загружаем список…",
		);
	});

	test("числа согласованы по-русски", () => {
		assert.equal(
			workflowsCountLabel({ phase: "ready" }, 0),
			"Ни одного сценария",
		);
		assert.equal(workflowsCountLabel({ phase: "ready" }, 1), "1 сценарий");
		assert.equal(workflowsCountLabel({ phase: "ready" }, 3), "3 сценария");
		assert.equal(workflowsCountLabel({ phase: "ready" }, 5), "5 сценариев");
		assert.equal(workflowsCountLabel({ phase: "ready" }, 11), "11 сценариев");
		assert.equal(workflowsCountLabel({ phase: "ready" }, 21), "21 сценарий");
	});
});

describe("тексты состояний вкладки", () => {
	test("отказ предупреждает, что пустота не доказана", () => {
		assert.ok(
			WORKFLOWS_PANEL_SUBJECT.failureConsequence.includes(
				"Не считайте, что сценариев нет",
			),
		);
	});

	test("пустота не оставлена без следующего шага", () => {
		assert.ok(WORKFLOWS_PANEL_SUBJECT.emptyHint.length > 20);
		assert.ok(WORKFLOWS_PANEL_SUBJECT.emptyHint.includes("Создать сценарий"));
	});

	test("ни в одном тексте нет латиницы и кода ответа", () => {
		for (const text of Object.values(WORKFLOWS_PANEL_SUBJECT)) {
			assert.doesNotMatch(text, /[A-Za-z]/, `латиница в «${text}»`);
			assert.doesNotMatch(text, /\b[45]\d\d\b/, `код ответа в «${text}»`);
		}
	});
});
