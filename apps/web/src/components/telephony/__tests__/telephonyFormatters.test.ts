import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	formatDurationTimer,
	formatPatientInitials,
	formatPhoneDisplay,
	generateWaveformBars,
	getAvatarColor,
	getNationalPhoneDigits,
	maskPhoneDisplay,
	normalizePhoneDigits,
	fuzzyMatchPhone,
} from "../../../store/telephonyStore.js";

describe("Telephony: Fuzzy Phone Matching & Normalization", () => {
	test("normalizePhoneDigits strips non-digit characters correctly", () => {
		assert.equal(normalizePhoneDigits("+7 (916) 123-45-67"), "79161234567");
		assert.equal(normalizePhoneDigits("8-926-987-65-43"), "89269876543");
		assert.equal(normalizePhoneDigits("9161234567"), "9161234567");
		assert.equal(normalizePhoneDigits(null), "");
		assert.equal(normalizePhoneDigits(undefined), "");
	});

	test("getNationalPhoneDigits extracts 10-digit national suffix", () => {
		assert.equal(getNationalPhoneDigits("+7 (916) 123-45-67"), "9161234567");
		assert.equal(getNationalPhoneDigits("89269876543"), "9269876543");
		assert.equal(getNationalPhoneDigits("9161234567"), "9161234567");
		assert.equal(getNationalPhoneDigits("12345"), "12345");
	});

	test("fuzzyMatchPhone matches varied phone notation formats (+7, 8, spaces, dashes, brackets)", () => {
		assert.equal(fuzzyMatchPhone("+7 (916) 123-45-67", "89161234567"), true);
		assert.equal(fuzzyMatchPhone("+7 916 123 45 67", "79161234567"), true);
		assert.equal(fuzzyMatchPhone("8 (916) 123-45-67", "9161234567"), true);
		assert.equal(fuzzyMatchPhone("+7 (916) 123-45-67", "+7 (926) 123-45-67"), false);
		assert.equal(fuzzyMatchPhone(null, "89161234567"), false);
		assert.equal(fuzzyMatchPhone("+79161234567", ""), false);
	});

	test("formatPhoneDisplay formats 10 and 11-digit phone numbers", () => {
		assert.equal(formatPhoneDisplay("79161234567"), "+7 (916) 123-45-67");
		assert.equal(formatPhoneDisplay("89161234567"), "+7 (916) 123-45-67");
		assert.equal(formatPhoneDisplay("9161234567"), "+7 (916) 123-45-67");
		assert.equal(formatPhoneDisplay(null), "—");
		assert.equal(formatPhoneDisplay(""), "—");
	});

	test("maskPhoneDisplay masks phone numbers for 152-ФЗ compliance", () => {
		assert.equal(maskPhoneDisplay("79161234567"), "+7 (916) ***-**-67");
		assert.equal(maskPhoneDisplay("89161234567"), "+7 (916) ***-**-67");
		assert.equal(maskPhoneDisplay("+7 (916) 123-45-67"), "+7 (916) ***-**-67");
		assert.equal(maskPhoneDisplay("9161234567"), "+7 (916) ***-**-67");
		assert.equal(maskPhoneDisplay("123"), "+7 (***) ***-**-**");
		assert.equal(maskPhoneDisplay(null), "—");
	});

	test("formatPatientInitials & getAvatarColor produce consistent visuals", () => {
		assert.equal(formatPatientInitials("Иванов Иван Иванович"), "ИИ");
		assert.equal(formatPatientInitials("Смирнова Елена"), "СЕ");
		assert.equal(formatPatientInitials("Анна"), "АН");
		assert.equal(formatPatientInitials(null), "??");

		const c1 = getAvatarColor("Иванов Иван");
		const c2 = getAvatarColor("Иванов Иван");
		assert.deepEqual(c1, c2);
		assert.ok(c1.bg.startsWith("rgba"));
		assert.ok(c1.text.startsWith("#"));
	});

	test("formatDurationTimer and generateWaveformBars", () => {
		assert.equal(formatDurationTimer(0), "00:00");
		assert.equal(formatDurationTimer(9), "00:09");
		assert.equal(formatDurationTimer(75), "01:15");
		assert.equal(formatDurationTimer(3600), "01:00:00");
		assert.equal(formatDurationTimer(3725), "01:02:05");

		const bars = generateWaveformBars("mango-call-99", 40);
		assert.equal(bars.length, 40);
		for (const b of bars) {
			assert.ok(b >= 0.15 && b <= 1.0);
		}
	});
});
