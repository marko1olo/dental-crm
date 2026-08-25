import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	formatCurrencyNumeric,
	formatOmsPolicy,
	formatPhoneNumber,
	formatRussianPassport,
	formatSnils,
	formatTaxpayerInn,
} from "../utils/inputSanitation";

describe("inputSanitation — медицинские форматы и реквизиты пациента", () => {
	describe("formatPhoneNumber", () => {
		it("форматирует российский номер телефона с 8", () => {
			assert.equal(formatPhoneNumber("89123456789"), "+7 (912) 345-67-89");
		});

		it("форматирует российский номер телефона с 7", () => {
			assert.equal(formatPhoneNumber("79997776655"), "+7 (999) 777-66-55");
		});

		it("корректно обрабатывает пустые и неполные строки", () => {
			assert.equal(formatPhoneNumber(""), "");
			assert.equal(formatPhoneNumber("79"), "+7 (9");
		});
	});

	describe("formatSnils", () => {
		it("форматирует 11 цифр СНИЛС в формат XXX-XXX-XXX XX", () => {
			assert.equal(formatSnils("12345678901"), "123-456-789 01");
			assert.equal(formatSnils("123-456-789 01"), "123-456-789 01");
		});

		it("форматирует частичный ввод СНИЛС по мере набора", () => {
			assert.equal(formatSnils("123"), "123");
			assert.equal(formatSnils("1234"), "123-4");
			assert.equal(formatSnils("1234567"), "123-456-7");
			assert.equal(formatSnils("1234567890"), "123-456-789 0");
		});

		it("обрезает лишние символы сверх 11 цифр", () => {
			assert.equal(formatSnils("12345678901999"), "123-456-789 01");
		});
	});

	describe("formatRussianPassport", () => {
		it("форматирует 10 цифр серии и номера: 4 цифры + пробел + 6 цифр", () => {
			assert.equal(formatRussianPassport("4510123456"), "4510 123456");
			assert.equal(formatRussianPassport("45 10 123456"), "4510 123456");
		});

		it("сохраняет нецифровой тип документа без повреждения текста", () => {
			assert.equal(
				formatRussianPassport("Свидетельство о рождении I-МЮ №123456"),
				"Свидетельство о рождении I-МЮ №123456",
			);
			assert.equal(
				formatRussianPassport("Загранпаспорт 51 №1234567"),
				"Загранпаспорт 51 №1234567",
			);
		});
	});

	describe("formatTaxpayerInn", () => {
		it("оставляет только цифры и ограничивает длину 12 символами", () => {
			assert.equal(formatTaxpayerInn("7701234567"), "7701234567");
			assert.equal(formatTaxpayerInn("770123456789"), "770123456789");
			assert.equal(formatTaxpayerInn("7701-234-567-89000"), "770123456789");
		});
	});

	describe("formatOmsPolicy", () => {
		it("форматирует 16 цифр единого полиса ОМС по 4 блока", () => {
			assert.equal(
				formatOmsPolicy("1234567890123456"),
				"1234 5678 9012 3456",
			);
		});
	});

	describe("formatCurrencyNumeric", () => {
		it("очищает нечисловые символы в денежных суммах", () => {
			assert.equal(formatCurrencyNumeric("15 000 руб."), "15000");
			assert.equal(formatCurrencyNumeric(2500.8), "2501");
		});
	});
});
