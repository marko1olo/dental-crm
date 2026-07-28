/**
 * «Профиль не найден. Войдите через PIN или перезайдите в систему.» не имеет
 * права появляться при отказе сервера — это совет выйти из программы, в которую
 * человек потом может не войти.
 *
 * Проверяется то, что было сломано: любой исход чтения профиля, кроме успеха,
 * давал один и тот же экран, а без токена сотрудника признак загрузки не
 * снимался вовсе и вкладка крутила «Загрузка профиля...» до закрытия страницы.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
	parseProfilePayload,
	passwordStrength,
	PROFILE_PANEL_SUBJECT,
} from "./settingsProfileLoad";

describe("чтение своего профиля", () => {
	test("401 при истёкшем входе — отказ, а не «профиля нет»", () => {
		const outcome = parseProfilePayload(
			401,
			'{"error":"AuthRequired","message":"Требуется авторизация."}',
		);
		assert.equal(outcome.ok, false);
		assert.equal(outcome.ok === false && outcome.status, 401);
	});

	test("500 при сбое базы — отказ", () => {
		const outcome = parseProfilePayload(500, "");
		assert.equal(outcome.ok, false);
	});

	test("HTML от прокси не роняет разбор", () => {
		const outcome = parseProfilePayload(200, "<html>504</html>");
		assert.equal(outcome.ok, false);
	});

	test("успех без user — отказ: пустые ФИО и роль своими данными не показываем", () => {
		const outcome = parseProfilePayload(200, '{"ok":true}');
		assert.equal(outcome.ok, false);
	});

	test("профиль без id не годится: он ничего не идентифицирует", () => {
		const outcome = parseProfilePayload(200, '{"ok":true,"user":{"fullName":"Иванов"}}');
		assert.equal(outcome.ok, false);
	});

	test("профиль разобран, пустое ФИО не выдаётся за имя", () => {
		const outcome = parseProfilePayload(
			200,
			'{"ok":true,"user":{"id":"u1","fullName":"  ","role":"administrator","email":null}}',
		);
		assert.equal(outcome.ok, true);
		assert.equal(outcome.ok === true && outcome.profile.fullName, "ФИО не заполнено");
		assert.equal(outcome.ok === true && outcome.profile.email, null);
	});

	test("обычный профиль разобран полностью", () => {
		const outcome = parseProfilePayload(
			200,
			'{"ok":true,"user":{"id":"u1","fullName":"Иванова М. П.","role":"doctor","email":"m@clinic.ru","organizationId":"o1"}}',
		);
		assert.equal(outcome.ok, true);
		assert.deepEqual(outcome.ok === true && outcome.profile, {
			id: "u1",
			fullName: "Иванова М. П.",
			role: "doctor",
			email: "m@clinic.ru",
			organizationId: "o1",
		});
	});
});

describe("тексты состояний вкладки «Мой профиль»", () => {
	test("отказ предупреждает, что показанные данные могут быть устаревшими", () => {
		const hint = PROFILE_PANEL_SUBJECT.failureConsequence;
		assert.ok(hint.includes("устаревш"));
		// И не отправляет выходить из программы: совет войти уместен только когда
		// входа действительно нет, а это отдельное состояние.
		assert.ok(!/перезайдите|выйдите/i.test(hint));
	});

	test("«входа нет» даёт оба способа войти", () => {
		assert.ok(PROFILE_PANEL_SUBJECT.emptyHint.includes("PIN"));
		assert.ok(PROFILE_PANEL_SUBJECT.emptyHint.includes("почт"));
	});

	test("в текстах нет кода ответа", () => {
		for (const text of Object.values(PROFILE_PANEL_SUBJECT)) {
			assert.doesNotMatch(text, /\b[45]\d\d\b/, `код ответа в «${text}»`);
		}
	});
});

describe("надёжность пароля", () => {
	test("короткий пароль — слабый", () => {
		assert.equal(passwordStrength("1234").score, 1);
		assert.equal(passwordStrength("1234").label, "Слабый");
	});

	test("восемь знаков с цифрой — средний", () => {
		assert.equal(passwordStrength("parolik1").score, 2);
	});

	test("длинный со заглавной, цифрой и знаком — надёжный", () => {
		assert.equal(passwordStrength("Klinika2026!").score, 3);
		assert.equal(passwordStrength("Klinika2026!").label, "Надёжный");
	});

	/**
	 * Пароль набирают в русской раскладке чаще, чем ожидают: заглавная «К» и
	 * кириллический знак считались отсутствующими, и надёжный пароль показывался
	 * слабым. Оценка на экране, которая занижает вдвое, учит не доверять оценке.
	 */
	test("кириллица считается: заглавная буква и знак распознаны", () => {
		assert.equal(passwordStrength("Клиника2026!").score, 3);
		assert.ok(passwordStrength("Клиника2026").score >= 2);
	});

	test("подписи по-русски, без латиницы", () => {
		for (const password of ["1234", "parolik1", "Klinika2026!"]) {
			assert.doesNotMatch(passwordStrength(password).label, /[A-Za-z]/);
		}
	});
});
