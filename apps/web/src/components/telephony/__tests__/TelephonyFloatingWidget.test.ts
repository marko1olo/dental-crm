import assert from "node:assert/strict";
import test from "node:test";
import {
	calculatePatientFinancialStatus,
	formatDurationTimer,
	formatPatientInitials,
	formatPhoneDisplay,
	generateAppointmentConfirmationMessage,
	generateWaveformBars,
	generateWhatsAppConfirmationUrl,
	normalizePhoneDigits,
	resolvePatientFromPhone,
	resolvePatientUpcomingAppointment,
	useTelephonyStore,
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

test("Telephony & WhatsApp - template message generation and URL formatting", () => {
	const msg = generateAppointmentConfirmationMessage({
		patientName: "Алексей Смирнов",
		doctorName: "д-р Петров В.С.",
		appointmentStartsAt: "2026-09-01T10:00:00Z",
		clinicName: "Клиника DENTE",
		templateType: "reminder",
	});

	assert.ok(msg.includes("Алексей Смирнов"));
	assert.ok(msg.includes("д-р Петров В.С."));
	assert.ok(msg.includes("Клиника DENTE"));
	assert.ok(msg.includes("Напоминаем"));

	const waUrl = generateWhatsAppConfirmationUrl("+7 (916) 123-45-67", msg);
	assert.ok(waUrl.startsWith("https://wa.me/79161234567?text="));
	assert.ok(waUrl.includes(encodeURIComponent("Алексей Смирнов")));
});

test("Telephony - resolve patient from phone fuzzy matching", () => {
	const patients = [
		{
			id: "pat-100",
			fullName: "Кузнецов Петр",
			phone: "+7 (926) 555-44-33",
			administrativeProfile: {
				legalRepresentativePhone: "+7 (903) 777-88-99",
			},
		},
	];

	// Match primary phone with 8-prefix
	const match1 = resolvePatientFromPhone(patients as any, "89265554433");
	assert.strictEqual(match1?.id, "pat-100");

	// Match legal representative phone
	const match2 = resolvePatientFromPhone(patients as any, "89037778899");
	assert.strictEqual(match2?.id, "pat-100");

	// Non-matching phone
	const noMatch = resolvePatientFromPhone(patients as any, "+79990000000");
	assert.strictEqual(noMatch, null);
});

test("Telephony - incoming call lifecycle and store transitions", () => {
	useTelephonyStore.getState().clearHistory();

	// 1. Trigger incoming call
	useTelephonyStore.getState().triggerIncomingCall({
		callId: "call-live-1",
		phone: "+79261112233",
		patientId: "pat-1",
		patientName: "Елена Соколова",
		provider: "mango",
		timestamp: new Date().toISOString(),
		status: "ringing",
	});

	let active = useTelephonyStore.getState().activeCall;
	assert.ok(active !== null);
	assert.strictEqual(active?.status, "ringing");
	assert.strictEqual(active?.patientName, "Елена Соколова");

	// 2. Answer call
	useTelephonyStore.getState().answerCall();
	active = useTelephonyStore.getState().activeCall;
	assert.strictEqual(active?.status, "answered");

	// 3. Accept call & close active dialog
	useTelephonyStore.getState().acceptCall();
	assert.strictEqual(useTelephonyStore.getState().activeCall, null);

	const history = useTelephonyStore.getState().callHistory;
	assert.strictEqual(history.length, 1);
	assert.strictEqual(history[0]?.status, "answered");
	assert.strictEqual(history[0]?.actionTaken, "accepted");
});

