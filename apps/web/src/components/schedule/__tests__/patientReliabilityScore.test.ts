import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Appointment, Patient } from "@dental/shared";
import {
	calculateConsecutiveNoShows,
	calculatePatientReliability,
	extractLatenessMinutes,
	formatPatientBalanceBadge,
	hasConsecutiveNoShows,
	isAppointmentFinalizedOrPast,
} from "../patientReliabilityScore";

function createMockPatient(overrides?: Partial<Patient>): Patient {
	return {
		id: "pat-test-1",
		organizationId: "org-1",
		fullName: "Тестов Тест Тестович",
		phone: "+7 999 123-45-67",
		email: "test@example.com",
		notes: null,
		birthDate: "1990-01-01",
		status: "active",
		balanceRub: 0,
		administrativeProfile: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

function createMockAppointment(overrides?: Partial<Appointment>): Appointment {
	return {
		id: `appt-${Math.random().toString(36).slice(2, 9)}`,
		organizationId: "org-1",
		patientId: "pat-test-1",
		doctorUserId: "doc-1",
		assistantUserId: null,
		chairId: "chair-1",
		status: "completed",
		startsAt: "2026-08-01T10:00:00.000Z",
		endsAt: "2026-08-01T10:30:00.000Z",
		reason: "Осмотр",
		comment: null,
		...overrides,
	};
}

describe("Patient Discipline & Reliability Score Engine — Zero Cartoon Emojis & Mandate 8d/8n Suite", () => {
	it("1. returns status 'new' and clean badgeText without emojis for new patient", () => {
		const patient = createMockPatient({ id: "pat-new", balanceRub: 0 });
		const result = calculatePatientReliability(patient, []);

		assert.equal(result.category, "new");
		assert.equal(result.reliabilityBadge.status, "new");
		assert.equal(result.reliabilityBadge.badgeText, "Новый пациент");
		assert.equal(result.reliabilityBadge.shortLabel, "Новый");
		assert.ok(!result.reliabilityBadge.badgeText.includes("✨"), "No raw ✨ emoji");
		assert.ok(!result.reliabilityBadge.emoji.includes("✨"), "No raw emoji in emoji property");
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, false);
		assert.ok(result.receptionistAlert?.includes("Первичный визит"));
	});

	it("2. classifies 100% attendance as status 'reliable' with 'Надежный пациент' without 🌟", () => {
		const patient = createMockPatient({ id: "pat-reliable", balanceRub: 0 });
		const appts: Appointment[] = [
			createMockAppointment({ patientId: "pat-reliable", startsAt: "2026-08-01T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-reliable", startsAt: "2026-08-05T11:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-reliable", startsAt: "2026-08-10T12:00:00Z", status: "completed" }),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "reliable");
		assert.equal(result.reliabilityBadge.status, "reliable");
		assert.equal(result.reliabilityBadge.badgeText, "Надежный пациент");
		assert.equal(result.reliabilityBadge.shortLabel, "Надежный");
		assert.ok(!result.reliabilityBadge.badgeText.includes("🌟"), "No raw 🌟 emoji");
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, false);
	});

	it("3. classifies 1 unexcused no-show as status 'attention' with 'Зона внимания' without ⚠️", () => {
		const patient = createMockPatient({ id: "pat-attention" });
		const appts: Appointment[] = [
			createMockAppointment({ patientId: "pat-attention", startsAt: "2026-08-01T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-attention", startsAt: "2026-08-05T10:00:00Z", status: "no_show", comment: "Не пришел" }),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "attention");
		assert.equal(result.reliabilityBadge.status, "attention");
		assert.equal(result.reliabilityBadge.badgeText, "Зона внимания");
		assert.equal(result.reliabilityBadge.shortLabel, "Внимание");
		assert.ok(!result.reliabilityBadge.badgeText.includes("⚠️"), "No raw ⚠️ emoji");
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, false);
	});

	it("4. triggers status 'high_risk' with 'Риск неявки' for consecutive no-shows >= 2 without 🔴", () => {
		const patient = createMockPatient({ id: "pat-risk" });
		const appts: Appointment[] = [
			createMockAppointment({ patientId: "pat-risk", startsAt: "2026-08-01T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-risk", startsAt: "2026-08-05T10:00:00Z", status: "no_show" }),
			createMockAppointment({ patientId: "pat-risk", startsAt: "2026-08-10T10:00:00Z", status: "no_show" }),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "risk");
		assert.equal(result.reliabilityBadge.status, "high_risk");
		assert.equal(result.reliabilityBadge.badgeText, "Риск неявки");
		assert.equal(result.reliabilityBadge.shortLabel, "Риск неявки");
		assert.ok(!result.reliabilityBadge.badgeText.includes("🔴"), "No raw 🔴 emoji");
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, true);
		assert.ok(result.receptionistAlert?.startsWith("[Внимание]"), "Receptionist alert uses clean semantic marker");
		assert.ok(!result.receptionistAlert?.includes("⚠️"), "No ⚠️ in receptionist alert");
	});

	it("5. formatPatientBalanceBadge returns clean labels without 💳 emoji", () => {
		const debtBadge = formatPatientBalanceBadge(-3500);
		assert.equal(debtBadge.status, "debt");
		assert.ok(debtBadge.label.startsWith("Долг:"), "Starts with Долг without 💳");
		assert.ok(!debtBadge.label.includes("💳"), "No 💳 in debt label");

		const depositBadge = formatPatientBalanceBadge(5000);
		assert.equal(depositBadge.status, "deposit");
		assert.ok(depositBadge.label.startsWith("Депозит:"), "Starts with Депозит without 💳");
		assert.ok(!depositBadge.label.includes("💳"), "No 💳 in deposit label");

		const zeroBadge = formatPatientBalanceBadge(0);
		assert.equal(zeroBadge.status, "settled");
		assert.equal(zeroBadge.label, "Баланс: 0 ₽");
		assert.ok(!zeroBadge.label.includes("💳"), "No 💳 in zero balance label");
	});

	it("6. extractLatenessMinutes accurately parses lateness without errors", () => {
		assert.equal(extractLatenessMinutes("опоздал на 20 мин"), 20);
		assert.equal(extractLatenessMinutes("задержка 15 минут"), 15);
		assert.equal(extractLatenessMinutes("вовремя"), null);
	});
});
