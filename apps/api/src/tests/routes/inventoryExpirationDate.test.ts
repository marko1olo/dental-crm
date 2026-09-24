import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	INVALID_DATE,
	normalizedExpirationDate,
} from "../../routes/inventory.js";

describe("normalizedExpirationDate: парсинг срока годности YYYY-MM-DD и DD.MM.YYYY", () => {
	it("успешно парсит стандартный ISO-формат YYYY-MM-DD", () => {
		assert.equal(normalizedExpirationDate("2027-03-31"), "2027-03-31");
		assert.equal(normalizedExpirationDate("2026-12-01"), "2026-12-01");
		assert.equal(normalizedExpirationDate("2024-02-29"), "2024-02-29"); // високосный год
	});

	it("успешно парсит российский формат DD.MM.YYYY и нормализует в YYYY-MM-DD", () => {
		assert.equal(normalizedExpirationDate("31.03.2027"), "2027-03-31");
		assert.equal(normalizedExpirationDate("01.12.2026"), "2026-12-01");
		assert.equal(normalizedExpirationDate("29.02.2024"), "2024-02-29"); // високосный год 29 февраля
		assert.equal(normalizedExpirationDate("15.08.2030"), "2030-08-15");
	});

	it("возвращает null для пустых значений, null и undefined", () => {
		assert.equal(normalizedExpirationDate(null), null);
		assert.equal(normalizedExpirationDate(undefined), null);
		assert.equal(normalizedExpirationDate(""), null);
		assert.equal(normalizedExpirationDate("   "), null);
	});

	it("бракует невалидные даты и мусор (возвращает INVALID_DATE)", () => {
		assert.equal(normalizedExpirationDate("invalid"), INVALID_DATE);
		assert.equal(normalizedExpirationDate("31/03/2027"), INVALID_DATE);
		assert.equal(normalizedExpirationDate("2027.03.31"), INVALID_DATE);
		assert.equal(normalizedExpirationDate("32.01.2027"), INVALID_DATE); // нет 32 января
		assert.equal(normalizedExpirationDate("31.02.2027"), INVALID_DATE); // в феврале не бывает 31 числа
		assert.equal(normalizedExpirationDate("29.02.2025"), INVALID_DATE); // 2025 не високосный год
		assert.equal(normalizedExpirationDate("2027-02-31"), INVALID_DATE); // в феврале не бывает 31 числа в ISO
		assert.equal(normalizedExpirationDate("2025-02-29"), INVALID_DATE); // 2025 не високосный в ISO
	});
});
