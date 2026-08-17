import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Appointment, InsuranceContract, Patient, PatientInsight, StaffMember } from "@dental/shared";
import {
	calculatePatientFinancialStatus,
	formatPatientInitials,
	formatPhoneDisplay,
	getAvatarColor,
	type IncomingCallPayload,
	normalizePhoneDigits,
	resolvePatientFromPhone,
	resolvePatientLastVisit,
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
			legalRepresentativeFullName: null,
			legalRepresentativeRelationship: null,
			legalRepresentativeIdentityDocument: null,
			legalRepresentativePhone: null,
			preferredDocumentRecipient: null,
			preferredAppointmentWeekdays: [1, 3, 5],
			preferredAppointmentStart: "09:00",
			preferredAppointmentEnd: "18:00",
			preferredAppointmentNote: "Утро",
			dataProcessingBasisNote: "Согласие",
			orthodonticProgress: null,
			loyaltyTier: "gold",
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
		reason: "Профгигиена",
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

describe("1. Phone Normalization & Presentation Formatters", () => {
	test("normalizePhoneDigits extracts digits cleanly", () => {
		assert.equal(normalizePhoneDigits("+7 (916) 123-45-67"), "79161234567");
		assert.equal(normalizePhoneDigits("8 (926) 987-65-43"), "89269876543");
		assert.equal(normalizePhoneDigits("9161234567"), "9161234567");
		assert.equal(normalizePhoneDigits(null), "");
		assert.equal(normalizePhoneDigits(undefined), "");
	});

	test("formatPhoneDisplay formats 10-digit and 11-digit numbers", () => {
		assert.equal(formatPhoneDisplay("79161234567"), "+7 (916) 123-45-67");
		assert.equal(formatPhoneDisplay("89161234567"), "+7 (916) 123-45-67");
		assert.equal(formatPhoneDisplay("9161234567"), "+7 (916) 123-45-67");
		assert.equal(formatPhoneDisplay(null), "—");
	});

	test("formatPatientInitials returns 2-letter uppercase initials", () => {
		assert.equal(formatPatientInitials("Иванов Иван Иванович"), "ИИ");
		assert.equal(formatPatientInitials("Смирнова Елена"), "СЕ");
		assert.equal(formatPatientInitials("Анна"), "АН");
		assert.equal(formatPatientInitials(null), "??");
		assert.equal(formatPatientInitials(""), "??");
	});

	test("getAvatarColor generates consistent color palette", () => {
		const color1 = getAvatarColor("Иванов Иван");
		const color2 = getAvatarColor("Иванов Иван");
		assert.deepEqual(color1, color2);
		assert.ok(color1.bg.startsWith("rgba"));
		assert.ok(color1.text.startsWith("#"));
		assert.ok(color1.border.startsWith("#"));
	});
});

describe("2. Patient Search & Phone Matching", () => {
	test("matches patient by 10-digit national suffix", () => {
		const found1 = resolvePatientFromPhone(mockPatients, "+79161234567");
		assert.ok(found1);
		assert.equal(found1?.fullName, "Иванов Иван Иванович");

		const found2 = resolvePatientFromPhone(mockPatients, "89269876543");
		assert.ok(found2);
		assert.equal(found2?.fullName, "Смирнова Елена Васильевна");
	});

	test("returns null when phone does not match any patient", () => {
		const notFound = resolvePatientFromPhone(mockPatients, "+7 (999) 000-00-00");
		assert.equal(notFound, null);
	});

	test("returns null on invalid / short phone numbers", () => {
		assert.equal(resolvePatientFromPhone(mockPatients, "123"), null);
		assert.equal(resolvePatientFromPhone(mockPatients, null), null);
	});
});

describe("3. Financial Status Calculation", () => {
	test("correctly calculates negative balance and debt", () => {
		const patient = mockPatients[0];
		const summary = calculatePatientFinancialStatus(patient, null, mockInsuranceContracts);

		assert.equal(summary.balanceRub, -4500);
		assert.equal(summary.hasDebt, true);
		assert.equal(summary.debtRub, 4500);
		assert.ok(summary.formattedDebt.includes("4"));
		assert.ok(summary.formattedDebt.includes("500"));
		assert.equal(summary.hasInsurance, true);
		assert.equal(summary.policyNumber, "СОГАЗ-987654");
		assert.equal(summary.insuranceName, "СОГАЗ Страхование");
	});

	test("correctly calculates positive balance without debt", () => {
		const patient = mockPatients[1];
		const summary = calculatePatientFinancialStatus(patient, null, mockInsuranceContracts);

		assert.equal(summary.balanceRub, 12000);
		assert.equal(summary.hasDebt, false);
		assert.equal(summary.debtRub, 0);
		assert.ok(summary.formattedBalance.startsWith("+"));
		assert.equal(summary.hasInsurance, true); // From active insuranceContracts
	});

	test("handles null patient gracefully", () => {
		const summary = calculatePatientFinancialStatus(null);
		assert.equal(summary.balanceRub, 0);
		assert.equal(summary.hasDebt, false);
		assert.equal(summary.debtRub, 0);
		assert.equal(summary.hasInsurance, false);
	});
});

describe("4. Last Visit & Attending Doctor Resolution", () => {
	test("resolves latest past visit and doctor information", () => {
		const visit = resolvePatientLastVisit(
			"11111111-1111-1111-1111-111111111111",
			mockAppointments,
			mockStaff,
			"2026-06-01T00:00:00Z",
		);

		assert.equal(visit.isNewPatient, false);
		assert.equal(visit.lastVisitDate, "2026-05-14T14:30:00Z");
		assert.equal(visit.doctorName, "Др. Петров Петр Сергеевич");
		assert.equal(visit.doctorSpecialty, "therapist");
		assert.equal(visit.appointmentReason, "Лечение кариеса 1.6");
		assert.ok(visit.formattedLastVisit.includes("2026"));
	});

	test("returns new patient summary when no completed visits exist", () => {
		const visit = resolvePatientLastVisit(
			"22222222-2222-2222-2222-222222222222",
			mockAppointments,
			mockStaff,
		);

		assert.equal(visit.isNewPatient, true);
		assert.equal(visit.lastVisitDate, null);
		assert.equal(visit.doctorName, null);
		assert.equal(visit.formattedLastVisit, "Первичный приём (визитов нет)");
	});

	test("handles null patientId and empty appointments", () => {
		const visit = resolvePatientLastVisit(null, [], []);
		assert.equal(visit.isNewPatient, true);
	});
});

describe("5. Telephony Store Lifecycle & State Transitions", () => {
	test("store initializes with default state", () => {
		const state = useTelephonyStore.getState();
		assert.equal(state.isSimulatorOpen, false);
	});

	test("triggerIncomingCall sets activeCall and updates history", () => {
		const callPayload: IncomingCallPayload = {
			phone: "+79161234567",
			patientId: "11111111-1111-1111-1111-111111111111",
			patientName: "Иванов Иван Иванович",
			provider: "mango",
			timestamp: "2026-08-17T12:00:00Z",
			status: "ringing",
		};

		useTelephonyStore.getState().triggerIncomingCall(callPayload);

		const state = useTelephonyStore.getState();
		assert.ok(state.activeCall);
		assert.equal(state.activeCall?.phone, "+79161234567");
		assert.equal(state.activeCall?.patientName, "Иванов Иван Иванович");
		assert.equal(state.activeCall?.provider, "mango");
		assert.equal(state.activeCall?.status, "ringing");

		assert.ok(state.callHistory.length > 0);
		assert.equal(state.callHistory[0]?.phone, "+79161234567");
	});

	test("acceptCall marks call as answered and clears activeCall", () => {
		useTelephonyStore.getState().acceptCall();

		const state = useTelephonyStore.getState();
		assert.equal(state.activeCall, null);
		assert.equal(state.callHistory[0]?.status, "answered");
		assert.equal(state.callHistory[0]?.actionTaken, "accepted");
	});

	test("rejectCall marks call as rejected and clears activeCall", () => {
		useTelephonyStore.getState().triggerIncomingCall({
			phone: "+79998887766",
			patientId: null,
			patientName: "Неизвестный номер",
			provider: "uis",
			timestamp: "2026-08-17T12:05:00Z",
		});

		useTelephonyStore.getState().rejectCall();

		const state = useTelephonyStore.getState();
		assert.equal(state.activeCall, null);
		assert.equal(state.callHistory[0]?.status, "rejected");
		assert.equal(state.callHistory[0]?.actionTaken, "rejected");
	});

	test("dismissCall sets actionTaken dismissed and clears activeCall", () => {
		useTelephonyStore.getState().triggerIncomingCall({
			phone: "+79991112233",
			patientId: null,
			patientName: "Неизвестный",
			timestamp: "2026-08-17T12:10:00Z",
		});

		useTelephonyStore.getState().dismissCall();

		const state = useTelephonyStore.getState();
		assert.equal(state.activeCall, null);
		assert.equal(state.callHistory[0]?.actionTaken, "dismissed");
	});

	test("toggleMute toggles mute state", () => {
		const initialMute = useTelephonyStore.getState().isMuted;
		useTelephonyStore.getState().toggleMute();
		assert.equal(useTelephonyStore.getState().isMuted, !initialMute);
		useTelephonyStore.getState().toggleMute();
		assert.equal(useTelephonyStore.getState().isMuted, initialMute);
	});

	test("openSimulator and closeSimulator control modal visibility", () => {
		useTelephonyStore.getState().openSimulator();
		assert.equal(useTelephonyStore.getState().isSimulatorOpen, true);

		useTelephonyStore.getState().closeSimulator();
		assert.equal(useTelephonyStore.getState().isSimulatorOpen, false);
	});

	test("clearHistory empties the call history list", () => {
		assert.ok(useTelephonyStore.getState().callHistory.length > 0);
		useTelephonyStore.getState().clearHistory();
		assert.equal(useTelephonyStore.getState().callHistory.length, 0);
	});
});
