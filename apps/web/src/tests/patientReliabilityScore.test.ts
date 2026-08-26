import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Appointment, Patient, PatientInsight } from "@dental/shared";
import {
	calculateConsecutiveNoShows,
	calculatePatientReliability,
	extractLatenessMinutes,
	formatPatientBalanceBadge,
	hasConsecutiveNoShows,
	isAppointmentFinalizedOrPast,
} from "../components/schedule/patientReliabilityScore";

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

describe("Patient Discipline & Reliability Score Engine", () => {
	it("1. returns category 'new' and neutral trust for patient without past appointments", () => {
		const patient = createMockPatient({ id: "pat-new", balanceRub: 0 });
		const result = calculatePatientReliability(patient, []);

		assert.equal(result.category, "new");
		assert.equal(result.stats.totalAppointments, 0);
		assert.equal(result.stats.completedCount, 0);
		assert.equal(result.stats.noShowCount, 0);
		assert.equal(result.stats.onTimeRatePercent, 100);
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, false);
		assert.ok(result.reliabilityBadge.badgeText.includes("Новый пациент"));
		assert.ok(result.reliabilityBadge.emoji === "✨");
		assert.ok(result.receptionistAlert?.includes("Первичный визит"));
	});

	it("2. classifies 100% attended appointments as 🌟 'reliable' with 0 no-shows", () => {
		const patient = createMockPatient({ id: "pat-reliable", balanceRub: 0 });
		const appts: Appointment[] = [
			createMockAppointment({ patientId: "pat-reliable", startsAt: "2026-08-01T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-reliable", startsAt: "2026-08-05T11:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-reliable", startsAt: "2026-08-10T12:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-reliable", startsAt: "2026-08-15T13:00:00Z", status: "arrived" }),
			createMockAppointment({ patientId: "pat-reliable", startsAt: "2026-08-20T14:00:00Z", status: "in_treatment" }),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "reliable");
		assert.equal(result.stats.totalAppointments, 5);
		assert.equal(result.stats.completedCount, 5);
		assert.equal(result.stats.noShowCount, 0);
		assert.equal(result.stats.onTimeRatePercent, 100);
		assert.equal(result.stats.attendanceRatePercent, 100);
		assert.ok(result.score >= 95, `score should be >= 95, got ${result.score}`);
		assert.ok(result.reliabilityBadge.badgeText.includes("Надежный пациент"));
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, false);
	});

	it("3. classifies patient with >90% on-time visits and 0 no-shows as 🌟 'reliable'", () => {
		const patient = createMockPatient({ id: "pat-90" });
		// 9 completed on-time, 1 cancelled in advance = 90% attendance, 0 no-shows
		const appts: Appointment[] = [];
		for (let i = 1; i <= 9; i++) {
			appts.push(createMockAppointment({
				patientId: "pat-90",
				startsAt: `2026-07-0${i}T10:00:00Z`,
				status: "completed",
			}));
		}
		appts.push(createMockAppointment({
			patientId: "pat-90",
			startsAt: "2026-07-10T10:00:00Z",
			status: "cancelled",
			comment: "Предупредил за 2 дня",
		}));

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "reliable");
		assert.equal(result.stats.noShowCount, 0);
		assert.equal(result.stats.attendanceRatePercent, 90);
		assert.equal(result.stats.onTimeRatePercent, 90);
		assert.ok(result.reliabilityBadge.badgeText.includes("Надежный"));
	});

	it("4. classifies 1 unexcused no-show (пропуск без предупреждения) as ⚠️ 'attention'", () => {
		const patient = createMockPatient({ id: "pat-warn-1" });
		const appts: Appointment[] = [
			createMockAppointment({ patientId: "pat-warn-1", startsAt: "2026-08-01T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-warn-1", startsAt: "2026-08-05T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-warn-1", startsAt: "2026-08-10T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-warn-1", startsAt: "2026-08-15T10:00:00Z", status: "no_show", comment: "Не пришел" }),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "attention");
		assert.equal(result.stats.noShowCount, 1);
		assert.equal(result.stats.consecutiveNoShows, 1);
		assert.ok(result.reliabilityBadge.badgeText.includes("Зона внимания"));
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, false);
		assert.ok(result.receptionistAlert?.includes("контрольный звонок накануне"));
	});

	it("5. classifies frequent lateness >15 min as ⚠️ 'attention' zone", () => {
		const patient = createMockPatient({ id: "pat-late" });
		const appts: Appointment[] = [
			createMockAppointment({
				patientId: "pat-late",
				startsAt: "2026-08-01T10:00:00Z",
				status: "completed",
				comment: "Пациент опоздал на 20 мин",
			}),
			createMockAppointment({
				patientId: "pat-late",
				startsAt: "2026-08-05T10:00:00Z",
				status: "completed",
				comment: "Задержка 25 минут из-за пробок",
			}),
			createMockAppointment({
				patientId: "pat-late",
				startsAt: "2026-08-10T10:00:00Z",
				status: "completed",
			}),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "attention");
		assert.equal(result.stats.lateCount, 2);
		assert.equal(result.stats.noShowCount, 0);
		assert.ok(result.flags.some((f) => f.includes("Опоздания >15 мин: 2")));
		assert.ok(result.reliabilityBadge.badgeText.includes("Зона внимания"));
	});

	it("6. classifies 2 non-consecutive no-shows as ⚠️ 'attention'", () => {
		const patient = createMockPatient({ id: "pat-2-noshows-nonconsec" });
		const appts: Appointment[] = [
			createMockAppointment({ patientId: "pat-2-noshows-nonconsec", startsAt: "2026-08-01T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-2-noshows-nonconsec", startsAt: "2026-08-05T10:00:00Z", status: "no_show" }),
			createMockAppointment({ patientId: "pat-2-noshows-nonconsec", startsAt: "2026-08-10T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-2-noshows-nonconsec", startsAt: "2026-08-15T10:00:00Z", status: "no_show" }),
			createMockAppointment({ patientId: "pat-2-noshows-nonconsec", startsAt: "2026-08-20T10:00:00Z", status: "completed" }),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "attention");
		assert.equal(result.stats.noShowCount, 2);
		assert.equal(result.stats.consecutiveNoShows, 0); // last appointment was completed
		assert.ok(result.reliabilityBadge.badgeText.includes("Зона внимания"));
	});

	it("7. triggers 🔴 'risk' and requires confirmation 2h before when consecutive no-shows >= 2", () => {
		const patient = createMockPatient({ id: "pat-risk-consec" });
		const appts: Appointment[] = [
			createMockAppointment({ patientId: "pat-risk-consec", startsAt: "2026-08-01T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-risk-consec", startsAt: "2026-08-05T10:00:00Z", status: "no_show" }),
			createMockAppointment({ patientId: "pat-risk-consec", startsAt: "2026-08-10T10:00:00Z", status: "no_show" }),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "risk");
		assert.equal(result.stats.consecutiveNoShows, 2);
		assert.equal(result.stats.noShowCount, 2);
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, true);
		assert.ok(result.reliabilityBadge.badgeText.includes("Риск срыва приема"));
		assert.ok(result.reliabilityBadge.recommendation.includes("Требуется подтверждение за 2 часа"));
		assert.ok(result.receptionistAlert?.includes("Требуется обязательное подтверждение за 2 часа"));
	});

	it("8. triggers 🔴 'risk' when total no-shows >= 3", () => {
		const patient = createMockPatient({ id: "pat-risk-3" });
		const appts: Appointment[] = [
			createMockAppointment({ patientId: "pat-risk-3", startsAt: "2026-08-01T10:00:00Z", status: "no_show" }),
			createMockAppointment({ patientId: "pat-risk-3", startsAt: "2026-08-05T10:00:00Z", status: "no_show" }),
			createMockAppointment({ patientId: "pat-risk-3", startsAt: "2026-08-10T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-risk-3", startsAt: "2026-08-15T10:00:00Z", status: "no_show" }),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "risk");
		assert.equal(result.stats.noShowCount, 3);
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, true);
		assert.ok(result.score <= 45, `score should be <= 45, got ${result.score}`);
	});

	it("9. correctly detects consecutive no-show streak of 3 trailing missed visits", () => {
		const patient = createMockPatient({ id: "pat-risk-streak3" });
		const appts: Appointment[] = [
			createMockAppointment({ patientId: "pat-risk-streak3", startsAt: "2026-07-01T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-risk-streak3", startsAt: "2026-07-05T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-risk-streak3", startsAt: "2026-08-01T10:00:00Z", status: "no_show" }),
			createMockAppointment({ patientId: "pat-risk-streak3", startsAt: "2026-08-05T10:00:00Z", status: "no_show" }),
			createMockAppointment({ patientId: "pat-risk-streak3", startsAt: "2026-08-10T10:00:00Z", status: "no_show" }),
		];

		const { currentStreak, maxStreak } = calculateConsecutiveNoShows(appts, "pat-risk-streak3");
		assert.equal(currentStreak, 3);
		assert.equal(maxStreak, 3);

		const hasStreak = hasConsecutiveNoShows(appts, "pat-risk-streak3", 2);
		assert.equal(hasStreak, true);
	});

	it("10. extractLatenessMinutes accurately parses diverse Russian and English lateness expressions", () => {
		assert.equal(extractLatenessMinutes("пациент опоздал на 20 мин"), 20);
		assert.equal(extractLatenessMinutes("опоздание 15 минут из-за погоды"), 15);
		assert.equal(extractLatenessMinutes("задержка на 35 мин"), 35);
		assert.equal(extractLatenessMinutes("+40 мин опоздание"), 40);
		assert.equal(extractLatenessMinutes("late by 25 min"), 25);
		assert.equal(extractLatenessMinutes("опоздала на 10м"), 10);
		assert.equal(extractLatenessMinutes("плановый визит вовремя"), null);
		assert.equal(extractLatenessMinutes(null), null);
		assert.equal(extractLatenessMinutes(undefined), null);
		assert.equal(extractLatenessMinutes(""), null);
	});

	it("11. formatPatientBalanceBadge formats negative balance as 💳 'Долг'", () => {
		const badge = formatPatientBalanceBadge(-4500);

		assert.equal(badge.status, "debt");
		assert.equal(badge.isDebt, true);
		assert.equal(badge.isDeposit, false);
		assert.ok(badge.label.includes("Долг:"));
		assert.ok(badge.label.includes("4 500 ₽") || badge.label.includes("4 500 ₽"));
		assert.ok(badge.badgeClass.includes("bg-rose-500"));
	});

	it("12. formatPatientBalanceBadge formats positive balance as 💳 'Депозит'", () => {
		const badge = formatPatientBalanceBadge(12500);

		assert.equal(badge.status, "deposit");
		assert.equal(badge.isDebt, false);
		assert.equal(badge.isDeposit, true);
		assert.ok(badge.label.includes("Депозит:"));
		assert.ok(badge.label.includes("12 500 ₽") || badge.label.includes("12 500 ₽"));
		assert.ok(badge.badgeClass.includes("bg-emerald-500"));
	});

	it("13. formatPatientBalanceBadge formats zero balance cleanly as 💳 'Баланс: 0 ₽'", () => {
		const badge = formatPatientBalanceBadge(0);

		assert.equal(badge.status, "settled");
		assert.equal(badge.isDebt, false);
		assert.equal(badge.isDeposit, false);
		assert.equal(badge.label, "💳 Баланс: 0 ₽");
		assert.ok(badge.badgeClass.includes("bg-slate-500"));
	});

	it("14. formatPatientBalanceBadge handles exact kopecks without rounding error", () => {
		const debtBadge = formatPatientBalanceBadge(-3250.5);
		assert.ok(debtBadge.formattedAmount.includes("3 250,50") || debtBadge.formattedAmount.includes("3 250,50"));

		const depositBadge = formatPatientBalanceBadge(7800.25);
		assert.ok(depositBadge.formattedAmount.includes("7 800,25") || depositBadge.formattedAmount.includes("7 800,25"));
	});

	it("15. excludes future planned/confirmed appointments from historical reliability calculation", () => {
		const patient = createMockPatient({ id: "pat-future-filter" });
		const refTime = "2026-08-15T12:00:00.000Z";

		const appts: Appointment[] = [
			// Past completed
			createMockAppointment({
				patientId: "pat-future-filter",
				startsAt: "2026-08-01T10:00:00Z",
				status: "completed",
			}),
			// Future planned (should be ignored)
			createMockAppointment({
				patientId: "pat-future-filter",
				startsAt: "2026-08-20T10:00:00Z",
				status: "planned",
			}),
			// Future confirmed (should be ignored)
			createMockAppointment({
				patientId: "pat-future-filter",
				startsAt: "2026-08-25T10:00:00Z",
				status: "confirmed",
			}),
		];

		const result = calculatePatientReliability(patient, appts, { referenceTimeIso: refTime });

		assert.equal(result.stats.totalAppointments, 1);
		assert.equal(result.stats.completedCount, 1);
		assert.equal(result.category, "reliable");
	});

	it("16. produces identical deterministic results regardless of input appointment array order", () => {
		const patient = createMockPatient({ id: "pat-order" });
		const a1 = createMockAppointment({ patientId: "pat-order", startsAt: "2026-08-01T10:00:00Z", status: "completed" });
		const a2 = createMockAppointment({ patientId: "pat-order", startsAt: "2026-08-05T10:00:00Z", status: "no_show" });
		const a3 = createMockAppointment({ patientId: "pat-order", startsAt: "2026-08-10T10:00:00Z", status: "no_show" });

		const resAsc = calculatePatientReliability(patient, [a1, a2, a3]);
		const resDesc = calculatePatientReliability(patient, [a3, a2, a1]);
		const resShuffled = calculatePatientReliability(patient, [a2, a3, a1]);

		assert.equal(resAsc.category, "risk");
		assert.equal(resDesc.category, "risk");
		assert.equal(resShuffled.category, "risk");
		assert.equal(resAsc.stats.consecutiveNoShows, resDesc.stats.consecutiveNoShows);
		assert.equal(resAsc.score, resShuffled.score);
	});

	it("17. handles null or undefined patient and appointments gracefully without throwing", () => {
		const resNull = calculatePatientReliability(null, null);
		assert.equal(resNull.category, "new");
		assert.equal(resNull.score, 85);
		assert.equal(resNull.financialBadge.status, "settled");

		const resUndef = calculatePatientReliability(undefined, undefined);
		assert.equal(resUndef.category, "new");
		assert.equal(resUndef.stats.totalAppointments, 0);
	});

	it("18. appends debt warning to receptionist alert when patient has financial liability", () => {
		const patient = createMockPatient({ id: "pat-debt-alert", balanceRub: -5000 });
		const appts = [
			createMockAppointment({ patientId: "pat-debt-alert", startsAt: "2026-08-01T10:00:00Z", status: "completed" }),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.financialBadge.isDebt, true);
		assert.ok(result.flags.some((f) => f.includes("Задолженность:")));
		assert.ok(result.receptionistAlert?.includes("Долг:") || result.receptionistAlert?.includes("задолженность"));
	});

	it("19. respects high-risk override from PatientInsight with >=2 no-shows", () => {
		const patient = createMockPatient({ id: "pat-insight" });
		const appts = [
			createMockAppointment({ patientId: "pat-insight", startsAt: "2026-08-01T10:00:00Z", status: "no_show" }),
			createMockAppointment({ patientId: "pat-insight", startsAt: "2026-08-05T10:00:00Z", status: "completed" }),
			createMockAppointment({ patientId: "pat-insight", startsAt: "2026-08-10T10:00:00Z", status: "no_show" }),
			createMockAppointment({ patientId: "pat-insight", startsAt: "2026-08-15T10:00:00Z", status: "completed" }),
		];

		const mockInsight: PatientInsight = {
			patientId: "pat-insight",
			riskLevel: "high",
			riskReasons: ["Высокая вероятность срыва"],
			nextBestAction: "Обязательный звонок",
			recallDueAt: null,
			balanceDueRub: 0,
			openTasks: 0,
			missingDocumentKinds: [],
			clinicalFlags: [],
			adminFlags: [],
			lastActivityAt: null,
		};

		const result = calculatePatientReliability(patient, appts, { overrideInsight: mockInsight });

		assert.equal(result.category, "risk");
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, true);
	});

	it("20. isAppointmentFinalizedOrPast correctly classifies appointment states", () => {
		const nowMs = Date.parse("2026-08-15T12:00:00.000Z");

		const completed = createMockAppointment({ status: "completed" });
		assert.equal(isAppointmentFinalizedOrPast(completed, nowMs), true);

		const noShow = createMockAppointment({ status: "no_show" });
		assert.equal(isAppointmentFinalizedOrPast(noShow, nowMs), true);

		const cancelled = createMockAppointment({ status: "cancelled" });
		assert.equal(isAppointmentFinalizedOrPast(cancelled, nowMs), true);

		const pastPlanned = createMockAppointment({
			status: "planned",
			startsAt: "2026-08-10T10:00:00Z",
		});
		assert.equal(isAppointmentFinalizedOrPast(pastPlanned, nowMs), true);

		const futurePlanned = createMockAppointment({
			status: "planned",
			startsAt: "2026-08-20T10:00:00Z",
		});
		assert.equal(isAppointmentFinalizedOrPast(futurePlanned, nowMs), false);
	});
});
