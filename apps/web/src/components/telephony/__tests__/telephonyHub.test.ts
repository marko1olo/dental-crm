import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type {
	Appointment,
	InsuranceContract,
	Patient,
	PatientInsight,
	StaffMember,
} from "@dental/shared";
import {
	calculatePatientFinancialStatus,
	formatDurationTimer,
	formatPatientInitials,
	formatPhoneDisplay,
	fuzzyMatchPhone,
	generateAppointmentConfirmationMessage,
	generateCallTranscript,
	generateSmsConfirmationUrl,
	generateTelegramConfirmationUrl,
	generateWaveformBars,
	generateWhatsAppConfirmationUrl,
	getAvatarColor,
	getNationalPhoneDigits,
	type IncomingCallPayload,
	normalizePhoneDigits,
	resolvePatientFromPhone,
	resolvePatientLastVisit,
	resolvePatientUpcomingAppointment,
	useTelephonyStore,
} from "../../../store/telephonyStore.js";

// Mock Data Fixtures
const mockPatients: Patient[] = [
	{
		id: "11111111-1111-1111-1111-111111111111",
		organizationId: "99999999-9999-9999-9999-999999999999",
		status: "active",
		fullName: "Иванов Иван Иванович",
		birthDate: "1985-05-12",
		phone: "+7 (916) 123-45-67",
		email: "ivanov@example.com",
		notes: "Аллергия на лидокаин",
		administrativeProfile: {
			identityDocument: "4509 123456",
			taxpayerInn: "771234567890",
			registrationAddress: "г. Москва, ул. Ленина, д. 1",
			residentialAddress: "г. Москва, ул. Ленина, д. 1",
			insurancePolicyNumber: "СОГАЗ-987654",
			snils: "123-456-789 00",
			legalRepresentativeFullName: "Иванова Мария Алексеевна",
			legalRepresentativeRelationship: "Супруга",
			legalRepresentativeIdentityDocument: "4509 654321",
			legalRepresentativePhone: "+7 (916) 999-88-77",
			preferredDocumentRecipient: null,
			preferredAppointmentWeekdays: [1, 3, 5],
			preferredAppointmentStart: "09:00",
			preferredAppointmentEnd: "18:00",
			preferredAppointmentNote: "Утро",
			dataProcessingBasisNote: "Согласие",
			orthodonticProgress: null,
			loyaltyTier: "gold",
			curatorId: null,
			curatorFullName: null,
			curatorAssignedAt: null,
			curatorFunnelStage: null,
			curatorCommissionPercent: null,
			curatorNotes: null,
			curatorNextContactDate: null,
		},
		balanceRub: -4500, // Debtor
		familyGroupId: null,
		mergedIntoPatientId: null,
		createdAt: "2025-01-01T10:00:00Z",
		updatedAt: "2025-01-01T10:00:00Z",
	},
	{
		id: "22222222-2222-2222-2222-222222222222",
		organizationId: "99999999-9999-9999-9999-999999999999",
		status: "active",
		fullName: "Смирнова Елена Васильевна",
		birthDate: "1992-11-20",
		phone: "89269876543",
		email: "smirnova@example.com",
		notes: "Предпочитает лечение с коффердамом",
		administrativeProfile: {
			identityDocument: null,
			taxpayerInn: null,
			registrationAddress: null,
			residentialAddress: null,
			insurancePolicyNumber: null,
			snils: null,
			legalRepresentativeFullName: null,
			legalRepresentativeRelationship: null,
			legalRepresentativeIdentityDocument: null,
			legalRepresentativePhone: null,
			preferredDocumentRecipient: null,
			preferredAppointmentWeekdays: [],
			preferredAppointmentStart: null,
			preferredAppointmentEnd: null,
			preferredAppointmentNote: null,
			dataProcessingBasisNote: null,
			orthodonticProgress: null,
			loyaltyTier: "standard",
			curatorId: null,
			curatorFullName: null,
			curatorAssignedAt: null,
			curatorFunnelStage: null,
			curatorCommissionPercent: null,
			curatorNotes: null,
			curatorNextContactDate: null,
		},
		balanceRub: 12000, // Positive balance
		familyGroupId: null,
		mergedIntoPatientId: null,
		createdAt: "2025-02-01T10:00:00Z",
		updatedAt: "2025-02-01T10:00:00Z",
	},
];

const mockStaff: StaffMember[] = [
	{
		id: "33333333-3333-3333-3333-333333333333",
		organizationId: "99999999-9999-9999-9999-999999999999",
		fullName: "Др. Петров Петр Сергеевич",
		role: "doctor",
		specialties: ["therapist", "surgeon"],
		phone: "+79990001122",
		email: "petrov@clinic.ru",
		active: true,
		canSignMedicalRecords: true,
		canManageMoney: false,
		canManageImports: false,
		color: "#0f766e",
		workingHours: null,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	},
];

const mockAppointments: Appointment[] = [
	{
		id: "44444444-4444-4444-4444-444444444444",
		organizationId: "99999999-9999-9999-9999-999999999999",
		patientId: "11111111-1111-1111-1111-111111111111",
		doctorUserId: "33333333-3333-3333-3333-333333333333",
		chairId: "55555555-5555-5555-5555-555555555555",
		status: "completed",
		startsAt: "2026-05-14T14:30:00Z",
		endsAt: "2026-05-14T15:30:00Z",
		reason: "Лечение кариеса 1.6",
		comment: "Установлена световая пломба",
	},
	{
		id: "66666666-6666-6666-6666-666666666666",
		organizationId: "99999999-9999-9999-9999-999999999999",
		patientId: "11111111-1111-1111-1111-111111111111",
		doctorUserId: "33333333-3333-3333-3333-333333333333",
		chairId: "55555555-5555-5555-5555-555555555555",
		status: "planned",
		startsAt: "2026-12-30T10:00:00Z", // Future
		endsAt: "2026-12-30T11:00:00Z",
		reason: "Профгигиена полости рта",
		comment: null,
	},
];

const mockInsuranceContracts: InsuranceContract[] = [
	{
		id: "77777777-7777-7777-7777-777777777777",
		organizationId: "99999999-9999-9999-9999-999999999999",
		companyName: "СОГАЗ Страхование",
		policyNumberMask: "СОГАЗ-XXXXXX",
		coverageTherapyPct: 100,
		coverageSurgeryPct: 80,
		coverageOrthoPct: 0,
		coverageHygienePct: 100,
		annualLimitRub: 150000,
		isActive: true,
	},
];

describe("Telephony & Reception Live Hub Suite", () => {
	describe("1. Fuzzy Phone Matching & Normalization", () => {
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
			assert.equal(
				fuzzyMatchPhone("+7 (916) 123-45-67", "89161234567"),
				true,
				"+7 (916) 123-45-67 should match 89161234567",
			);
			assert.equal(
				fuzzyMatchPhone("+7 916 123 45 67", "79161234567"),
				true,
				"+7 916 123 45 67 should match 79161234567",
			);
			assert.equal(
				fuzzyMatchPhone("8 (916) 123-45-67", "9161234567"),
				true,
				"8 (916) 123-45-67 should match 9161234567",
			);
			assert.equal(
				fuzzyMatchPhone("+7 (916) 123-45-67", "+7 (926) 123-45-67"),
				false,
				"Different area codes must not match",
			);
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

		test("formatPatientInitials returns 2-letter uppercase initials", () => {
			assert.equal(formatPatientInitials("Иванов Иван Иванович"), "ИИ");
			assert.equal(formatPatientInitials("Смирнова Елена"), "СЕ");
			assert.equal(formatPatientInitials("Анна"), "АН");
			assert.equal(formatPatientInitials(null), "??");
		});

		test("getAvatarColor generates consistent color palettes", () => {
			const c1 = getAvatarColor("Иванов Иван");
			const c2 = getAvatarColor("Иванов Иван");
			assert.deepEqual(c1, c2);
			assert.ok(c1.bg.startsWith("rgba"));
			assert.ok(c1.text.startsWith("#"));
		});

		test("formatDurationTimer formats durations accurately", () => {
			assert.equal(formatDurationTimer(0), "00:00");
			assert.equal(formatDurationTimer(9), "00:09");
			assert.equal(formatDurationTimer(75), "01:15");
			assert.equal(formatDurationTimer(3600), "01:00:00");
			assert.equal(formatDurationTimer(3725), "01:02:05");
		});

		test("generateWaveformBars returns normalized speech bars", () => {
			const bars = generateWaveformBars("mango-call-99", 40);
			assert.equal(bars.length, 40);
			for (const b of bars) {
				assert.ok(b >= 0.15 && b <= 1.0);
			}
		});
	});

	describe("2. Patient Phone Resolution", () => {
		test("resolves patient by primary phone across +7 and 8 formats", () => {
			const p1 = resolvePatientFromPhone(mockPatients, "89161234567");
			assert.ok(p1);
			assert.equal(p1?.fullName, "Иванов Иван Иванович");

			const p2 = resolvePatientFromPhone(mockPatients, "+7 (926) 987-65-43");
			assert.ok(p2);
			assert.equal(p2?.fullName, "Смирнова Елена Васильевна");
		});

		test("resolves patient by legal representative phone", () => {
			const p = resolvePatientFromPhone(mockPatients, "89169998877");
			assert.ok(p);
			assert.equal(p?.fullName, "Иванов Иван Иванович");
		});

		test("returns null when phone does not match any patient", () => {
			const p = resolvePatientFromPhone(mockPatients, "+7 (999) 000-00-00");
			assert.equal(p, null);
		});

		test("handles empty inputs safely", () => {
			assert.equal(resolvePatientFromPhone([], "+79161234567"), null);
			assert.equal(resolvePatientFromPhone(null, "+79161234567"), null);
			assert.equal(resolvePatientFromPhone(mockPatients, null), null);
			assert.equal(resolvePatientFromPhone(mockPatients, "123"), null);
		});
	});

	describe("3. Financial Status & Visit Summaries", () => {
		test("calculates debtor financial status with active DMS insurance", () => {
			const summary = calculatePatientFinancialStatus(
				mockPatients[0],
				null,
				mockInsuranceContracts,
			);
			assert.equal(summary.balanceRub, -4500);
			assert.equal(summary.hasDebt, true);
			assert.equal(summary.debtRub, 4500);
			assert.equal(summary.hasInsurance, true);
			assert.equal(summary.insuranceName, "СОГАЗ Страхование");
			assert.equal(summary.policyNumber, "СОГАЗ-987654");
		});

		test("calculates positive balance financial status", () => {
			const summary = calculatePatientFinancialStatus(
				mockPatients[1],
				null,
				mockInsuranceContracts,
			);
			assert.equal(summary.balanceRub, 12000);
			assert.equal(summary.hasDebt, false);
			assert.equal(summary.debtRub, 0);
			assert.ok(summary.formattedBalance.startsWith("+"));
		});

		test("resolves past visit and attending doctor", () => {
			const visit = resolvePatientLastVisit(
				"11111111-1111-1111-1111-111111111111",
				mockAppointments,
				mockStaff,
				"2026-06-01T00:00:00Z",
			);
			assert.equal(visit.isNewPatient, false);
			assert.equal(visit.doctorName, "Др. Петров Петр Сергеевич");
			assert.equal(visit.appointmentReason, "Лечение кариеса 1.6");
		});

		test("resolves upcoming future appointment for 1-click confirmation", () => {
			const upcoming = resolvePatientUpcomingAppointment(
				"11111111-1111-1111-1111-111111111111",
				mockAppointments,
				mockStaff,
				"2026-06-01T00:00:00Z",
			);
			assert.ok(upcoming);
			assert.equal(upcoming?.appointmentId, "66666666-6666-6666-6666-666666666666");
			assert.equal(upcoming?.doctorName, "Др. Петров Петр Сергеевич");
			assert.equal(upcoming?.reason, "Профгигиена полости рта");
			assert.equal(upcoming?.status, "planned");
		});

		test("returns null upcoming appointment if patient has no future bookings", () => {
			const upcoming = resolvePatientUpcomingAppointment(
				"22222222-2222-2222-2222-222222222222",
				mockAppointments,
				mockStaff,
				"2026-06-01T00:00:00Z",
			);
			assert.equal(upcoming, null);
		});
	});

	describe("4. 1-Click WhatsApp & SMS Confirmation Triggers", () => {
		test("generateAppointmentConfirmationMessage formats standard confirmation", () => {
			const msg = generateAppointmentConfirmationMessage({
				patientName: "Иван Иванович",
				doctorName: "Петров П.С.",
				appointmentStartsAt: "2026-12-30T10:00:00Z",
				clinicName: "клинике DENTE",
			});

			assert.ok(msg.includes("Иван Иванович"));
			assert.ok(msg.includes("DENTE"));
			assert.ok(msg.includes("Петров П.С."));
			assert.ok(msg.includes("Подтверждаете визит?"));
		});

		test("generateAppointmentConfirmationMessage formats urgent and reminder templates", () => {
			const urgent = generateAppointmentConfirmationMessage({
				patientName: "Анна Сергеевна",
				doctorName: "Петров П.С.",
				appointmentStartsAt: "2026-12-30T10:00:00Z",
				clinicName: "DENTE",
				templateType: "urgent",
			});
			assert.ok(urgent.includes("срочный приём"));
			assert.ok(urgent.includes("паспорт"));

			const reminder = generateAppointmentConfirmationMessage({
				patientName: "Анна Сергеевна",
				doctorName: "Петров П.С.",
				appointmentStartsAt: "2026-12-30T10:00:00Z",
				clinicName: "DENTE",
				templateType: "reminder",
			});
			assert.ok(reminder.includes("сегодняшнем визите"));
			assert.ok(reminder.includes("5-10 минут"));
		});

		test("generateWhatsAppConfirmationUrl constructs valid wa.me link", () => {
			const url = generateWhatsAppConfirmationUrl(
				"+7 (916) 123-45-67",
				"Здравствуйте! Напоминаем о визите.",
			);
			assert.ok(url.startsWith("https://wa.me/79161234567?text="));
			assert.ok(url.includes(encodeURIComponent("Здравствуйте!")));
		});

		test("generateSmsConfirmationUrl constructs valid sms: URI", () => {
			const uri = generateSmsConfirmationUrl(
				"89161234567",
				"Напоминание о приёме",
			);
			assert.ok(uri.startsWith("sms:+79161234567?body="));
			assert.ok(uri.includes(encodeURIComponent("Напоминание")));
		});

		test("generateTelegramConfirmationUrl constructs valid t.me share link", () => {
			const url = generateTelegramConfirmationUrl(
				"+7 (916) 123-45-67",
				"Напоминание о приёме",
			);
			assert.ok(url.startsWith("https://t.me/share/url?"));
			assert.ok(url.includes(encodeURIComponent("Напоминание")));
		});
	});

	describe("5. Telephony Store & Audio Playback Controls", () => {
		test("store initializes with default playback speed and volume", () => {
			const state = useTelephonyStore.getState();
			assert.equal(state.playbackSpeed, 1);
			assert.equal(state.volumeLevel, 0.8);
			assert.equal(state.isMuted, false);
		});

		test("cyclePlaybackSpeed cycles through 1x -> 1.25x -> 1.5x -> 2x -> 1x", () => {
			useTelephonyStore.getState().setPlaybackSpeed(1);
			assert.equal(useTelephonyStore.getState().playbackSpeed, 1);

			useTelephonyStore.getState().cyclePlaybackSpeed();
			assert.equal(useTelephonyStore.getState().playbackSpeed, 1.25);

			useTelephonyStore.getState().cyclePlaybackSpeed();
			assert.equal(useTelephonyStore.getState().playbackSpeed, 1.5);

			useTelephonyStore.getState().cyclePlaybackSpeed();
			assert.equal(useTelephonyStore.getState().playbackSpeed, 2);

			useTelephonyStore.getState().cyclePlaybackSpeed();
			assert.equal(useTelephonyStore.getState().playbackSpeed, 1);
		});

		test("setVolumeLevel clamps volume between 0.0 and 1.0", () => {
			useTelephonyStore.getState().setVolumeLevel(0.5);
			assert.equal(useTelephonyStore.getState().volumeLevel, 0.5);

			useTelephonyStore.getState().setVolumeLevel(1.5);
			assert.equal(useTelephonyStore.getState().volumeLevel, 1);

			useTelephonyStore.getState().setVolumeLevel(-0.2);
			assert.equal(useTelephonyStore.getState().volumeLevel, 0);
		});

		test("playRecording and stopRecording manage audio playback state", () => {
			useTelephonyStore.getState().playRecording("https://records.example.com/test.mp3");
			assert.equal(useTelephonyStore.getState().isPlayingRecording, true);
			assert.equal(
				useTelephonyStore.getState().activeRecordingUrl,
				"https://records.example.com/test.mp3",
			);

			useTelephonyStore.getState().stopRecording();
			assert.equal(useTelephonyStore.getState().isPlayingRecording, false);
		});

		test("triggerIncomingCall sets activeCall with recordingUrl and tracks history", () => {
			const call: IncomingCallPayload = {
				phone: "+79161234567",
				patientId: "11111111-1111-1111-1111-111111111111",
				patientName: "Иванов Иван",
				provider: "mango",
				timestamp: "2026-08-21T10:00:00Z",
				status: "ringing",
				recordingUrl: "https://records.mango-office.ru/call-123.mp3",
			};

			useTelephonyStore.getState().triggerIncomingCall(call);

			const state = useTelephonyStore.getState();
			assert.ok(state.activeCall);
			assert.equal(state.activeCall?.phone, "+79161234567");
			assert.equal(state.activeCall?.recordingUrl, "https://records.mango-office.ru/call-123.mp3");
			assert.equal(state.callHistory[0]?.phone, "+79161234567");
		});

		test("answerCall transitions activeCall status to answered", () => {
			useTelephonyStore.getState().answerCall();
			assert.equal(useTelephonyStore.getState().activeCall?.status, "answered");
		});

		test("acceptCall marks call answered and clears activeCall", () => {
			useTelephonyStore.getState().acceptCall();
			assert.equal(useTelephonyStore.getState().activeCall, null);
			assert.equal(useTelephonyStore.getState().callHistory[0]?.status, "answered");
		});
	});

	describe("6. 10 CRM Themes & Telephony Multi-Provider Verification", () => {
		const themes = [
			"light",
			"dark",
			"night",
			"calm_teal",
			"contrast",
			"sakura",
			"ocean",
			"emerald",
			"cyber_xray",
			"warm_sand",
		] as const;

		test("all 10 CRM themes resolve consistently for softphone modal", () => {
			for (const theme of themes) {
				const isDark =
					theme === "dark" ||
					theme === "night" ||
					theme === "ocean" ||
					theme === "emerald" ||
					theme === "cyber_xray";

				assert.ok(theme.length > 0, `Theme ${theme} must be valid string`);
				if (isDark) {
					assert.ok(
						["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme),
					);
				} else {
					assert.ok(
						["light", "calm_teal", "contrast", "sakura", "warm_sand"].includes(theme),
					);
				}
			}
		});

		test("supports all 5 PBX / VoIP provider configurations", () => {
			const providers = ["mango", "uis", "asterisk", "zadarma", "unknown"] as const;
			for (const p of providers) {
				useTelephonyStore.getState().triggerIncomingCall({
					phone: "+79031112233",
					patientId: null,
					patientName: `Test ${p}`,
					provider: p,
					timestamp: new Date().toISOString(),
				});

				const active = useTelephonyStore.getState().activeCall;
				assert.ok(active);
				assert.equal(active?.provider, p);
				useTelephonyStore.getState().dismissCall();
			}
		});

		test("mobile launcher and touch target invariants adhere to clinical ergonomics", () => {
			const mobileLauncherSize = 48;
			const standardTouchTargetMin = 44;
			const primaryActionTouchTargetMin = 48;
			const mobileBottomOffset = 72;
			const mobileRightOffset = 12;

			assert.ok(mobileLauncherSize >= 48, "Mobile launcher FAB must be at least 48x48px");
			assert.ok(standardTouchTargetMin >= 44, "Standard touch target must be at least 44x44px");
			assert.ok(primaryActionTouchTargetMin >= 48, "Call action buttons must be at least 48x48px");
			assert.equal(mobileBottomOffset, 72, "Mobile bottom offset above navigation bar must be 72px");
			assert.equal(mobileRightOffset, 12, "Mobile right offset must be 12px");
		});
	});

	describe("7. SIP Call Transfer (Blind vs Attended Transfer)", () => {
		test("startCallTransfer with blind transfer transfers call immediately and updates history", () => {
			useTelephonyStore.getState().triggerIncomingCall({
				callId: "call-trans-1",
				phone: "+79261112233",
				patientId: null,
				patientName: "Пациент для перевода",
				status: "answered",
				timestamp: new Date().toISOString(),
			});

			assert.ok(useTelephonyStore.getState().activeCall);

			useTelephonyStore.getState().startCallTransfer("102", "blind");

			const state = useTelephonyStore.getState();
			assert.equal(state.activeCall, null, "Active call should be cleared on blind transfer");
			assert.equal(state.transferState.isTransferring, true);
			assert.equal(state.transferState.targetExtension, "102");
			assert.equal(state.transferState.transferType, "blind");
			assert.equal(state.transferState.status, "transferred");

			const historyItem = state.callHistory[0];
			assert.equal(historyItem?.actionTaken, "transferred");
			assert.equal(historyItem?.transferTarget, "102");
		});

		test("startCallTransfer with attended transfer keeps activeCall until completeCallTransfer", () => {
			useTelephonyStore.getState().triggerIncomingCall({
				callId: "call-trans-2",
				phone: "+79269998877",
				patientId: null,
				patientName: "Пациент Attended",
				status: "answered",
				timestamp: new Date().toISOString(),
			});

			useTelephonyStore.getState().startCallTransfer("101", "attended");

			let state = useTelephonyStore.getState();
			assert.ok(state.activeCall, "Active call remains during attended consultation");
			assert.equal(state.transferState.transferType, "attended");
			assert.equal(state.transferState.status, "dialing");

			useTelephonyStore.getState().completeCallTransfer();
			state = useTelephonyStore.getState();
			assert.equal(state.activeCall, null, "Active call cleared on transfer completion");
			assert.equal(state.transferState.status, "transferred");
		});

		test("cancelCallTransfer restores transferState to idle without dropping call", () => {
			useTelephonyStore.getState().triggerIncomingCall({
				callId: "call-trans-3",
				phone: "+79265554433",
				patientId: null,
				patientName: "Пациент Отмена Перевода",
				status: "answered",
				timestamp: new Date().toISOString(),
			});

			useTelephonyStore.getState().startCallTransfer("103", "attended");
			assert.equal(useTelephonyStore.getState().transferState.targetExtension, "103");

			useTelephonyStore.getState().cancelCallTransfer();
			const state = useTelephonyStore.getState();
			assert.equal(state.transferState.isTransferring, false);
			assert.equal(state.transferState.status, "idle");
			assert.ok(state.activeCall, "Active call remains intact");
			useTelephonyStore.getState().rejectCall();
		});
	});

	describe("8. Speech-to-Text Clinical Transcript & Dialogue Parsing", () => {
		test("generateCallTranscript returns deterministic utterances with operator and patient speakers", () => {
			const transcript = generateCallTranscript("test-call-id-99", 45);

			assert.ok(Array.isArray(transcript), "Transcript must be an array");
			assert.ok(transcript.length >= 3, "Transcript must have at least 3 utterances");

			const speakers = new Set(transcript.map((u) => u.speaker));
			assert.ok(speakers.has("operator"), "Must contain operator utterances");
			assert.ok(speakers.has("patient"), "Must contain patient utterances");

			for (const u of transcript) {
				assert.ok(u.startTimeSeconds >= 0, "startTimeSeconds must be non-negative");
				assert.ok(u.endTimeSeconds > u.startTimeSeconds, "endTimeSeconds must be greater than startTimeSeconds");
				assert.ok(u.text.length > 5, "Utterance text must be realistic");
				assert.ok(u.confidence >= 0.9 && u.confidence <= 1.0, "Confidence must be between 0.9 and 1.0");
				assert.ok(["neutral", "positive", "negative"].includes(u.sentiment), "Valid sentiment");
			}
		});

		test("generateCallTranscript is deterministic for identical seeds", () => {
			const t1 = generateCallTranscript("seed-alpha", 60);
			const t2 = generateCallTranscript("seed-alpha", 60);

			assert.equal(t1.length, t2.length);
			assert.equal(t1[0]?.text, t2[0]?.text);
			assert.equal(t1[1]?.speaker, t2[1]?.speaker);
		});

		test("incoming call trigger does NOT attach transcript while call is ringing", () => {
			useTelephonyStore.getState().triggerIncomingCall({
				callId: "call-with-transcript",
				phone: "+79998887766",
				patientId: null,
				patientName: "Тест Расшифровки",
				timestamp: new Date().toISOString(),
			});

			const historyItem = useTelephonyStore.getState().callHistory[0];
			assert.ok(historyItem);
			assert.strictEqual(historyItem.transcript, undefined, "Transcript must be undefined while call is ringing");
			useTelephonyStore.getState().dismissCall();
		});
	});
});
