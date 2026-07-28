/**
 * «Договоров ДМС нет» не имеет права появляться при отказе сервера.
 *
 * Проверяется то, что было сломано: список оставался пустым при любом отказе
 * чтения, и панель показывала честную пустоту с приглашением завести договоры
 * заново — при живых договорах в базе. Покрытие по ДМС применяется в сметах,
 * поэтому цена такой пустоты — дубли договоров и неверная сумма пациенту.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
	annualLimitOrNull,
	coveragePercent,
	INSURANCE_CONTRACTS_PANEL_SUBJECT,
	normalizeInsuranceContract,
	parseInsuranceContractsPayload,
} from "./insuranceContractsPanelData";

describe("чтение списка договоров ДМС", () => {
	test("401 у незакрытой смены — отказ, а не «договоров нет»", () => {
		const outcome = parseInsuranceContractsPayload(401, "");
		assert.equal(outcome.ok, false);
		assert.equal(outcome.ok === false && outcome.status, 401);
	});

	test("500 при сбое базы — отказ", () => {
		const outcome = parseInsuranceContractsPayload(500, '{"error":"boom"}');
		assert.equal(outcome.ok, false);
	});

	test("HTML от прокси не роняет разбор", () => {
		const outcome = parseInsuranceContractsPayload(200, "<html>504</html>");
		assert.equal(outcome.ok, false);
	});

	test("пустое тело на успешном статусе не считается пустым списком", () => {
		const outcome = parseInsuranceContractsPayload(200, "");
		assert.equal(outcome.ok, false);
	});

	test("объект вместо массива — ответ не того вида, а не пустота", () => {
		// Раньше `Array.isArray(data) ? data : []` превращал это в «договоров нет».
		const outcome = parseInsuranceContractsPayload(200, '{"contracts":[]}');
		assert.equal(outcome.ok, false);
	});

	test("пустой массив — честная пустота", () => {
		const outcome = parseInsuranceContractsPayload(200, "[]");
		assert.equal(outcome.ok, true);
		assert.deepEqual(outcome.ok === true && outcome.contracts, []);
	});

	test("договор без id отбрасывается: его кнопки уйдут на .../undefined", () => {
		const outcome = parseInsuranceContractsPayload(
			200,
			'[{"companyName":"Без ключа"},{"id":"c1","companyName":"СОГАЗ"}]',
		);
		assert.equal(outcome.ok, true);
		const rows = outcome.ok === true ? outcome.contracts : [];
		assert.equal(rows.length, 1);
		assert.equal(rows[0]?.companyName, "СОГАЗ");
	});

	test("договор без названия компании остаётся: его надо дать исправить", () => {
		const row = normalizeInsuranceContract({ id: "c2" });
		assert.equal(row?.companyName, "Страховая компания не указана");
	});
});

describe("процент покрытия", () => {
	test("число из базы строкой приводится к числу", () => {
		assert.equal(coveragePercent("40"), 40);
		assert.equal(coveragePercent("40.5"), 40.5);
	});

	test("мусор не даёт полоски шириной NaN%", () => {
		assert.equal(coveragePercent("——"), 0);
		assert.equal(coveragePercent(null), 0);
		assert.equal(coveragePercent(undefined), 0);
		assert.equal(coveragePercent({}), 0);
	});

	test("значения вне 0…100 обрезаются", () => {
		assert.equal(coveragePercent(-5), 0);
		assert.equal(coveragePercent(140), 100);
	});
});

describe("годовой лимит", () => {
	test("не задан — это null, а не ноль", () => {
		assert.equal(annualLimitOrNull(null), null);
		assert.equal(annualLimitOrNull(""), null);
		assert.equal(annualLimitOrNull("не знаю"), null);
	});

	test("ноль остаётся нулём: «страховая не платит» — не то же, что «лимита нет»", () => {
		assert.equal(annualLimitOrNull(0), 0);
		assert.equal(annualLimitOrNull("0"), 0);
	});

	test("число строкой приводится к числу", () => {
		assert.equal(annualLimitOrNull("120000"), 120000);
	});
});

describe("тексты состояний панели", () => {
	test("отказ прямо запрещает заводить договоры заново", () => {
		const hint = INSURANCE_CONTRACTS_PANEL_SUBJECT.failureConsequence;
		assert.ok(hint.includes("Не считайте, что договоров нет"));
		assert.ok(hint.includes("дубли"));
	});

	test("пустота не оставлена без следующего шага", () => {
		assert.ok(
			INSURANCE_CONTRACTS_PANEL_SUBJECT.emptyHint.includes("Добавить договор"),
		);
	});

	test("ни в одном тексте нет латиницы и кода ответа", () => {
		for (const text of Object.values(INSURANCE_CONTRACTS_PANEL_SUBJECT)) {
			// ДМС — кириллица; латинских слов вроде ContractNotFound быть не должно.
			assert.doesNotMatch(text, /[A-Za-z]/, `латиница в «${text}»`);
			assert.doesNotMatch(text, /\b[45]\d\d\b/, `код ответа в «${text}»`);
		}
	});
});
