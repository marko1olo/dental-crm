import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	formatRussianDate,
	formatRussianPhone,
	generateBookingReference,
	generateEmbedSnippet,
	isValidRussianPhone,
	localDateString,
} from "../../PublicOnlineBookingWidget";

describe("Booking Steps: Utility Functions", () => {
	it("localDateString produces valid YYYY-MM-DD format", () => {
		const fixedDate = new Date(2026, 7, 18);
		assert.equal(localDateString(fixedDate), "2026-08-18");
	});

	it("formatRussianDate converts YYYY-MM-DD into human-readable Russian date", () => {
		const formatted = formatRussianDate("2026-08-18");
		assert.ok(formatted.includes("август") || formatted.includes("18"));
	});

	it("formatRussianPhone standardizes Russian telephone numbers", () => {
		assert.equal(formatRussianPhone("9991234567"), "+7 (999) 123-45-67");
		assert.equal(formatRussianPhone("89991234567"), "+7 (999) 123-45-67");
		assert.equal(formatRussianPhone("+7 (999) 123-45-67"), "+7 (999) 123-45-67");
		assert.equal(formatRussianPhone(""), "");
	});

	it("isValidRussianPhone correctly validates Russian phone formats", () => {
		assert.equal(isValidRussianPhone("+7 (999) 123-45-67"), true);
		assert.equal(isValidRussianPhone("89991234567"), true);
		assert.equal(isValidRussianPhone("79991234567"), true);
		assert.equal(isValidRussianPhone("9991234567"), true);
		assert.equal(isValidRussianPhone("+7 (999) 123-45-6"), false);
		assert.equal(isValidRussianPhone(""), false);
	});

	it("generateBookingReference generates structured ticket numbers", () => {
		const ref = generateBookingReference();
		assert.ok(ref.startsWith("DNT-"));
		assert.ok(ref.includes(String(new Date().getFullYear())));
	});

	it("generateEmbedSnippet produces valid HTML snippet for third-party websites", () => {
		const snippet = generateEmbedSnippet({
			clinicId: "clinic-123",
			primaryColor: "#0d9488",
			theme: "calm_teal",
		});
		assert.ok(snippet.includes("booking.js"));
		assert.ok(snippet.includes('data-clinic-id="clinic-123"'));
		assert.ok(snippet.includes('data-primary-color="#0d9488"'));
	});
});
