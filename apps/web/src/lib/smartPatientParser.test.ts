import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePatientDictationLocal } from "./smartPatientParser";

/**
 * Разбор диктовки карточки пациента. Живой путь: быстрый ввод на экране
 * «Пациенты» и разбор нового пациента внутри smartBookingParser.
 *
 * Дата рождения в медкарте определяет совершеннолетие, а значит и то, чьё
 * согласие требуется, поэтому неверная дата — не косметика.
 *
 * Проверок у разбора не было. Ожидания получены замерами на живом разборе,
 * scratch/probe-patient-parser.mjs и scratch/probe-patient-edges.mjs.
 */
describe("parsePatientDictationLocal: ФИО", () => {
	it("разбирает фамилию, имя и отчество", () => {
		assert.equal(parsePatientDictationLocal("Иванов Иван Иванович 89161234567 12.05.1980").fullName, "Иванов Иван Иванович");
		assert.equal(parsePatientDictationLocal("Иванов Иван").fullName, "Иванов Иван");
		assert.equal(parsePatientDictationLocal("иванов").fullName, "Иванов");
	});

	it("приводит регистр к виду, принятому в карте", () => {
		assert.equal(parsePatientDictationLocal("ИВАНОВ ИВАН ИВАНОВИЧ").fullName, "Иванов Иван Иванович");
	});

	it("короткие фамилии не теряются", () => {
		assert.equal(parsePatientDictationLocal("Ли Ким 89161234567").fullName, "Ли Ким");
	});

	it("пустой ввод не даёт выдуманных данных", () => {
		const result = parsePatientDictationLocal("");
		assert.equal(result.fullName, "");
		assert.equal(result.phone, "");
		assert.equal(result.birthDate, "");
	});
});

describe("parsePatientDictationLocal: телефон", () => {
	it("приводит запись телефона к единому виду", () => {
		const variants = [
			"Иванов Иван 89161234567",
			"Иванов Иван 79161234567",
			"Иванов Иван 9161234567",
			"Иванов Иван +7 (916) 123-45-67",
			"Иванов Иван 8-916-123-45-67",
			"Иванов Иван +7 916 123 45 67",
		];
		for (const input of variants) {
			assert.equal(parsePatientDictationLocal(input).phone, "+79161234567", `вход «${input}»`);
		}
	});

	it("разбирает телефон, надиктованный словами", () => {
		const result = parsePatientDictationLocal(
			"иванов иван иванович восемь девятьсот шестнадцать сто двадцать три сорок пять шестьдесят семь",
		);
		assert.equal(result.phone, "+79161234567");
		assert.equal(result.fullName, "Иванов Иван Иванович");
	});

	it("не принимает за телефон число неподходящей длины", () => {
		assert.equal(parsePatientDictationLocal("Иванов Иван 1234567").phone, "");
		assert.equal(parsePatientDictationLocal("Иванов Иван 891612345678").phone, "");
	});
});

describe("parsePatientDictationLocal: дата рождения", () => {
	it("разбирает дату цифрами и словами", () => {
		assert.equal(parsePatientDictationLocal("Иванов Иван Иванович 89161234567 12.05.1980").birthDate, "1980-05-12");
		assert.equal(parsePatientDictationLocal("Сидорова Анна Сергеевна 9161234567 05.11.1992").birthDate, "1992-11-05");
		assert.equal(parsePatientDictationLocal("Кузнецов Олег 1 января 2000").birthDate, "2000-01-01");
		assert.equal(parsePatientDictationLocal("Петров Петр 8 916 123 45 67 15 марта 1975").birthDate, "1975-03-15");
	});

	it("двузначный год определяется по текущему году, а не по зашитому порогу", () => {
		/* БЫЛО: порог зашит числом 30 — `y > 30 ? 19xx : 20xx`. Годы от 00 до
		   30 уходили в будущее: «12.05.30» давало 2030-05-12, то есть дату
		   рождения, которая ещё не наступила. */
		assert.equal(parsePatientDictationLocal("Иванов Иван 12.05.30").birthDate, "1930-05-12");
		assert.equal(parsePatientDictationLocal("Иванов Иван 12.05.80").birthDate, "1980-05-12");
		// Годы не больше текущего остаются в этом веке.
		assert.equal(parsePatientDictationLocal("Иванов Иван 12.05.05").birthDate, "2005-05-12");
	});

	it("несуществующая дата не подставляется", () => {
		/* БЫЛО: строка собиралась без проверки, и наружу уходили даты,
		   которых не существует. Сервер их отклоняет, но оператор видел в
		   предпросмотре правдоподобную дату и не понимал, за что отказ. */
		assert.equal(parsePatientDictationLocal("Иванов Иван 31.02.1990").birthDate, "");
		assert.equal(parsePatientDictationLocal("Иванов Иван 12.13.1990").birthDate, "");
		assert.equal(parsePatientDictationLocal("Иванов Иван 00.05.1990").birthDate, "");
	});

	it("дата рождения в будущем не подставляется", () => {
		const nextYear = new Date().getFullYear() + 4;
		assert.equal(parsePatientDictationLocal(`Иванов Иван 12.05.${nextYear}`).birthDate, "");
	});

	it("телефон и дата рождения разбираются вместе и не путаются", () => {
		const result = parsePatientDictationLocal("Иванов Иван 12 мая 1980 89161234567");
		assert.equal(result.birthDate, "1980-05-12");
		assert.equal(result.phone, "+79161234567");
		assert.equal(result.fullName, "Иванов Иван");
	});
});
