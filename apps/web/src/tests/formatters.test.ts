import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	cleanPhoneDigits,
	formatBirthDate,
	formatCurrency,
	formatCurrencyNumeric,
	formatCurrencyRu,
	formatDateRu,
	formatDurationTimer,
	formatIcsDate,
	formatKopecksRu,
	formatKopecksToRubles,
	formatOmsPolicy,
	formatPhoneDisplay,
	formatPhoneNumber,
	formatRussianDate,
	formatRussianDateGost,
	formatRussianDateTime,
	formatRussianInn,
	formatRussianPassport,
	formatRussianPhone,
	formatRubles,
	formatRublesExactRu,
	formatSnils,
	formatTaxpayerInn,
	isValidRussianInn,
	isValidRussianOmsPolicy,
	isValidRussianPassport,
	isValidRussianPhone,
	isValidSnils,
	kopecksToRubles,
	maskRussianOmsPolicy,
	maskRussianPassport,
	maskRussianPhone,
	maskRussianSnils,
	money,
	moneyUnknownLabel,
	normalizePhoneToE164,
	normalizePhoneToNational,
	normalizeSnils,
	rublesToKopecks,
	sanitizeCyrillicText,
	sanitizeNumericInput,
	sanitizePatientName,
} from "../utils/formatters.js";

const plain = (value: string) => value.replace(/[   ]/g, " ");

describe("formatters.ts — Canonical SSOT Formatting Engine", () => {
	describe("1. Currency & Money Formatting (Мандат 8b)", () => {
		it("money() форматирует круглые суммы без копеек", () => {
			assert.equal(plain(money(1500)), "1 500 ₽");
			assert.equal(plain(money(0)), "0 ₽");
			assert.equal(plain(money(1000000)), "1 000 000 ₽");
		});

		it("money() форматирует суммы с копейками ровно двумя знаками", () => {
			assert.equal(plain(money(1500.5)), "1 500,50 ₽");
			assert.equal(plain(money(0.5)), "0,50 ₽");
			assert.equal(plain(money(0.01)), "0,01 ₽");
		});

		it("money() корректно обрабатывает строки от Postgres numeric", () => {
			assert.equal(plain(money("1500.50")), "1 500,50 ₽");
			assert.equal(plain(money("1500")), "1 500 ₽");
		});

		it("money() возвращает 'не определено' для неизвестных сумм (null/undefined/NaN/пусто)", () => {
			assert.equal(money(null), moneyUnknownLabel);
			assert.equal(money(undefined), moneyUnknownLabel);
			assert.equal(money(""), moneyUnknownLabel);
			assert.equal(money("мусор"), moneyUnknownLabel);
			assert.equal(money(Number.NaN), moneyUnknownLabel);
			assert.equal(money(Number.POSITIVE_INFINITY), moneyUnknownLabel);
		});

		it("formatCurrency является каноническим алиасом money", () => {
			assert.equal(formatCurrency(1500), money(1500));
			assert.equal(formatCurrency(null), moneyUnknownLabel);
		});

		it("formatRubles возвращает fallback при неизвестной сумме", () => {
			assert.equal(plain(formatRubles(1500)), "1 500 ₽");
			assert.equal(formatRubles(null), "0 ₽");
			assert.equal(formatRubles(undefined, "Бесплатно"), "Бесплатно");
		});

		it("formatCurrencyRu форматирует стандартную валютную строку с 2 знаками", () => {
			assert.ok(plain(formatCurrencyRu(1500)).includes("1 500,00"));
			assert.ok(plain(formatCurrencyRu(1500)).includes("₽"));
		});

		it("formatKopecksRu форматирует копейки в человекочитаемые рубли", () => {
			assert.equal(plain(formatKopecksRu(150050)), "1 500,50 ₽");
			assert.equal(plain(formatKopecksRu(150000)), "1 500,00 ₽");
			assert.equal(plain(formatKopecksRu(0)), "0,00 ₽");
		});

		it("formatKopecksToRubles переводит копейки в числовую строку", () => {
			assert.equal(formatKopecksToRubles(150050), "1500.50");
			assert.equal(formatKopecksToRubles(0), "0.00");
		});

		it("rublesToKopecks и kopecksToRubles выполняют точные преобразования", () => {
			assert.equal(rublesToKopecks(15.25), 1525);
			assert.equal(kopecksToRubles(1525), 15.25);
			assert.equal(plain(formatRublesExactRu(1500.5)), "1 500,50 ₽");
		});
	});

	describe("2. Date & Time Formatting (ГОСТ и локаль РФ)", () => {
		it("formatRussianDateGost и formatDateRu форматируют ISO дату в ДД.ММ.ГГГГ", () => {
			assert.equal(formatRussianDateGost("2026-05-24"), "24.05.2026");
			assert.equal(formatDateRu("2026-05-24"), "24.05.2026");
			assert.equal(formatRussianDateGost("2026-05-24T14:30:00.000Z"), "24.05.2026");
			assert.equal(formatRussianDateGost(new Date(2026, 4, 24)), "24.05.2026");
			assert.equal(formatRussianDateGost("24.05.2026"), "24.05.2026");
			assert.equal(formatRussianDateGost(null), "—");
			assert.equal(formatRussianDateGost(undefined), "—");
		});

		it("formatRussianDate форматирует дату прописью на русском", () => {
			const str = formatRussianDate("2026-05-24");
			assert.ok(str.includes("24"));
			assert.ok(str.includes("мая"));
			assert.ok(str.includes("2026"));
		});

		it("formatRussianDateTime форматирует дату и время в ДД.ММ.ГГГГ ЧЧ:ММ", () => {
			const d = new Date(Date.UTC(2026, 4, 24, 11, 30)); // 11:30 UTC = 15:30 Samara (+4)
			const res = formatRussianDateTime(d, "Europe/Samara");
			assert.ok(res.includes("24.05.2026"));
			assert.ok(res.includes("15:30"));
		});

		it("formatBirthDate форматирует дату рождения с расчетом возраста", () => {
			assert.equal(formatBirthDate("1990-05-15", false), "15.05.1990");
			const withAge = formatBirthDate("1990-05-15", true);
			assert.ok(withAge.startsWith("15.05.1990"));
			assert.ok(withAge.includes("лет") || withAge.includes("года"));
		});

		it("formatIcsDate форматирует дату в формат календаря iCal UTC", () => {
			const ics = formatIcsDate(new Date(Date.UTC(2026, 4, 24, 14, 30, 0)));
			assert.equal(ics, "20260524T143000Z");
		});

		it("formatDurationTimer форматирует секунды в MM:SS или HH:MM:SS", () => {
			assert.equal(formatDurationTimer(65), "01:05");
			assert.equal(formatDurationTimer(3665), "01:01:05");
			assert.equal(formatDurationTimer(0), "00:00");
		});
	});

	describe("3. Phone Formatting & 152-FZ Masking", () => {
		it("formatPhoneNumber корректно форматирует различные способы ввода", () => {
			assert.equal(formatPhoneNumber("89123456789"), "+7 (912) 345-67-89");
			assert.equal(formatPhoneNumber("79123456789"), "+7 (912) 345-67-89");
			assert.equal(formatPhoneNumber("+7 912 345 67 89"), "+7 (912) 345-67-89");
			// Mobile direct 9xx input
			assert.equal(formatPhoneNumber("9123456789"), "+7 (912) 345-67-89");
		});

		it("cleanPhoneDigits нормализует ведущую 8 в 7", () => {
			assert.equal(cleanPhoneDigits("8 (912) 345-67-89"), "79123456789");
			assert.equal(cleanPhoneDigits("+7 912 345-67-89"), "79123456789");
		});

		it("normalizePhoneToNational возвращает 10 цифр", () => {
			assert.equal(normalizePhoneToNational("+7 (912) 345-67-89"), "9123456789");
			assert.equal(normalizePhoneToNational("89123456789"), "9123456789");
		});

		it("normalizePhoneToE164 возвращает +7XXXXXXXXXX", () => {
			assert.equal(normalizePhoneToE164("89123456789"), "+79123456789");
			assert.equal(normalizePhoneToE164("9123456789"), "+79123456789");
			assert.equal(normalizePhoneToE164(""), null);
		});

		it("isValidRussianPhone валидирует мобильные номера", () => {
			assert.equal(isValidRussianPhone("+7 (912) 345-67-89"), true);
			assert.equal(isValidRussianPhone("89123456789"), true);
			assert.equal(isValidRussianPhone("9123456789"), true);
			assert.equal(isValidRussianPhone("12345"), false);
			assert.equal(isValidRussianPhone(""), false);
		});

		it("maskRussianPhone маскирует номер по 152-ФЗ", () => {
			assert.equal(maskRussianPhone("+7 (912) 345-67-89"), "+7 (912) •••-••-89");
			assert.equal(maskRussianPhone("+7 (912) 345-67-89", true), "+7 (•••) •••-••-89");
			assert.equal(maskRussianPhone(""), "—");
		});

		it("formatPhoneDisplay возвращает прочерк для пустых значений", () => {
			assert.equal(formatPhoneDisplay(""), "—");
			assert.equal(formatPhoneDisplay(null), "—");
			assert.equal(formatPhoneDisplay("89123456789"), "+7 (912) 345-67-89");
		});
	});

	describe("4. SNILS, Passport & Document Requisites", () => {
		it("formatSnils форматирует СНИЛС с защитой от лишних символов", () => {
			assert.equal(formatSnils("12345678901"), "123-456-789 01");
			assert.equal(formatSnils("1234567890199999"), "123-456-789 01");
			assert.equal(formatSnils("123"), "123");
			assert.equal(formatSnils("1234"), "123-4");
		});

		it("maskRussianSnils скрывает первые 9 цифр СНИЛС", () => {
			assert.equal(maskRussianSnils("123-456-789 01"), "•••-•••-••• 01");
			assert.equal(maskRussianSnils("12345678901"), "•••-•••-••• 01");
		});

		it("formatRussianPassport форматирует 10 цифр паспорта и сохраняет иные документы", () => {
			assert.equal(formatRussianPassport("4510123456"), "4510 123456");
			assert.equal(formatRussianPassport("45 10 123456"), "4510 123456");
			assert.equal(formatRussianPassport("Свидетельство о рождении I-МЮ 123456"), "Свидетельство о рождении I-МЮ 123456");
		});

		it("maskRussianPassport маскирует серию и номер паспорта", () => {
			assert.equal(maskRussianPassport("4510 123456"), "45•• ••••56");
		});

		it("formatOmsPolicy и maskRussianOmsPolicy форматируют 16 цифр ОМС", () => {
			assert.equal(formatOmsPolicy("1234567890123456"), "1234 5678 9012 3456");
			assert.equal(maskRussianOmsPolicy("1234567890123456"), "1234 •••• •••• 3456");
			assert.equal(isValidRussianOmsPolicy("1234567890123456"), true);
			assert.equal(isValidRussianOmsPolicy("123"), false);
		});

		it("formatTaxpayerInn и formatRussianInn форматируют ИНН", () => {
			assert.equal(formatTaxpayerInn("770123456789000"), "770123456789");
			assert.equal(formatRussianInn("770123456789"), "7701 2345 6789");
			assert.equal(formatRussianInn("7701234567"), "7701 23456 7");
		});

		it("sanitizePatientName приводит ФИО к аккуратному виду", () => {
			assert.equal(sanitizePatientName("  иванов   иван  иванович  "), "Иванов Иван Иванович");
		});

		it("sanitizeCyrillicText нормализует буквы ё и пробелы", () => {
			assert.equal(sanitizeCyrillicText("  План  лечения   ёлки  "), "План лечения елки");
		});

		it("formatCurrencyNumeric и sanitizeNumericInput очищают числовой ввод", () => {
			assert.equal(formatCurrencyNumeric("15 000 руб."), "15000");
			assert.equal(sanitizeNumericInput("15,50"), "15.50");
			assert.equal(sanitizeNumericInput("15.50.99"), "15.5099");
		});
	});
});
