import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getExpiryTrafficLight } from "../InventoryStockTable.js";

describe("FEFO Smart Anesthesia & Expiry Traffic Light: Expiry Date Logic", () => {
	const refDate = new Date("2026-09-24T00:00:00Z");

	it("returns green status for expiration date > 6 months (> 180 days)", () => {
		const result = getExpiryTrafficLight("2027-05-01", refDate);
		assert.equal(result.status, "good");
		assert.equal(result.color, "emerald");
		assert.equal(result.isBlocked, false);
		assert.equal(result.badgeTextRu, "Срок в норме (> 6 мес)");
	});

	it("returns amber warning for expiration date < 30 days (FEFO priority)", () => {
		const result = getExpiryTrafficLight("2026-10-10", refDate);
		assert.equal(result.status, "warning_soon");
		assert.equal(result.color, "amber");
		assert.equal(result.isBlocked, false);
		assert.ok(
			result.badgeTextRu === "Истекает скоро — первоочередной отпуск" ||
				result.badgeTextRu === "Истекает скоро (FEFO)",
		);
		assert.ok(result.labelRu.includes("16 дн."));
	});

	it("returns red blocked status for expired batch (daysLeft <= 0)", () => {
		const result = getExpiryTrafficLight("2026-08-01", refDate);
		assert.equal(result.status, "expired");
		assert.equal(result.color, "rose");
		assert.equal(result.isBlocked, true);
		assert.equal(result.badgeTextRu, "Просрочено — отпуск заблокирован");
		assert.ok(result.labelRu.includes("Просрочено"));
	});

	it("correctly handles Russian date format DD.MM.YYYY", () => {
		const resultGreen = getExpiryTrafficLight("31.12.2028", refDate);
		assert.equal(resultGreen.status, "good");
		assert.equal(resultGreen.color, "emerald");

		const resultSoon = getExpiryTrafficLight("15.10.2026", refDate);
		assert.equal(resultSoon.status, "warning_soon");
	});

	it("handles null or empty date gracefully without throwing", () => {
		const resultNull = getExpiryTrafficLight(null, refDate);
		assert.equal(resultNull.status, "unknown");
		assert.equal(resultNull.isBlocked, false);
	});
});
