import assert from "node:assert/strict";
import test from "node:test";
import {
	calculatePatientFinancialStatus,
	formatDurationTimer,
	formatPatientInitials,
	formatPhoneDisplay,
	generateWaveformBars,
	normalizePhoneDigits,
} from "../../../store/telephonyStore";

test("Telephony - phone number normalization and formatting", () => {
	const raw1 = "+7 (999) 123-45-67";
	const normalized1 = normalizePhoneDigits(raw1);
	assert.strictEqual(normalized1, "79991234567");

	const formatted1 = formatPhoneDisplay("+79991234567");
	assert.strictEqual(formatted1, "+7 (999) 123-45-67");

	const raw2 = "8 (800) 555-35-35";
	const normalized2 = normalizePhoneDigits(raw2);
	assert.strictEqual(normalized2, "88005553535");
});

test("Telephony - initials formatting and avatar colors", () => {
	const initials1 = formatPatientInitials("Иванов Иван Иванович");
	assert.strictEqual(initials1, "ИИ");

	const initials2 = formatPatientInitials("Смирнова");
	assert.strictEqual(initials2, "СМ");

	const initialsEmpty = formatPatientInitials(null);
	assert.strictEqual(initialsEmpty, "??");
});

test("Telephony - duration timer formatting", () => {
	assert.strictEqual(formatDurationTimer(0), "00:00");
	assert.strictEqual(formatDurationTimer(65), "01:05");
	assert.strictEqual(formatDurationTimer(3665), "01:01:05");
});

test("Telephony - waveform amplitude generator determinism", () => {
	const bars1 = generateWaveformBars("call-123", 20);
	const bars2 = generateWaveformBars("call-123", 20);

	assert.strictEqual(bars1.length, 20);
	assert.strictEqual(bars2.length, 20);
	assert.deepStrictEqual(bars1, bars2);

	for (const amp of bars1) {
		assert.ok(amp >= 0.15 && amp <= 1.0, `Amplitude ${amp} out of bounds`);
	}
});

test("Telephony - patient financial status calculation", () => {
	const patient = {
		id: "pat-1",
		fullName: "Тестовый Пациент",
		phone: "+79991112233",
		balanceRub: -5000,
		insuranceContractId: null,
	};

	const status = calculatePatientFinancialStatus(patient as any, null, []);
	assert.strictEqual(status.hasDebt, true);
	assert.strictEqual(status.debtRub, 5000);
	assert.ok(status.formattedDebt.includes("5") && status.formattedDebt.includes("000"));
});
