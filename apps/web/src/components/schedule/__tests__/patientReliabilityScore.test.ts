import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Appointment, Patient, PatientInsight } from "@dental/shared";
import {
	calculateAppointmentLatenessMinutes,
	calculateConsecutiveNoShows,
	calculatePatientReliability,
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
		gender: overrides?.gender ?? null,
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
		assert.equal(result.reliabilityBadge.badgeText, "Новый пациент (история визитов формируется)");
		assert.equal(result.reliabilityBadge.shortLabel, "Новый");
		assert.equal(result.score, 0);
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
		// Mandate 8e/8n: Doctor autonomy and zero-blocking, no hostile 2-hour confirmation popups
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, false);
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

	it("6. calculateAppointmentLatenessMinutes calculates lateness strictly from structured timestamps", () => {
		const lateAppt = createMockAppointment({
			startsAt: "2026-08-01T10:00:00.000Z",
			...({ actualStartTime: "2026-08-01T10:20:00.000Z" } as any),
		});
		assert.equal(calculateAppointmentLatenessMinutes(lateAppt), 20);

		const onTimeAppt = createMockAppointment({
			startsAt: "2026-08-01T10:00:00.000Z",
			...({ actualStartTime: "2026-08-01T10:00:00.000Z" } as any),
		});
		assert.equal(calculateAppointmentLatenessMinutes(onTimeAppt), 0);

		const earlyAppt = createMockAppointment({
			startsAt: "2026-08-01T10:00:00.000Z",
			...({ actualStartTime: "2026-08-01T09:50:00.000Z" } as any),
		});
		assert.equal(calculateAppointmentLatenessMinutes(earlyAppt), 0);

		const noActualAppt = createMockAppointment({
			startsAt: "2026-08-01T10:00:00.000Z",
		});
		assert.equal(calculateAppointmentLatenessMinutes(noActualAppt), null);
	});

	it("7. classifies patient with >90% on-time visits and 0 no-shows as 'reliable'", () => {
		const patient = createMockPatient({ id: "pat-90" });
		// 9 completed on-time, 1 cancelled in advance = 90% attendance, 0 no-shows
		const appts: Appointment[] = [];
		for (let i = 1; i <= 9; i++) {
			appts.push(
				createMockAppointment({
					patientId: "pat-90",
					startsAt: `2026-07-0${i}T10:00:00Z`,
					status: "completed",
				}),
			);
		}
		appts.push(
			createMockAppointment({
				patientId: "pat-90",
				startsAt: "2026-07-10T10:00:00Z",
				status: "cancelled",
				comment: "Предупредил за 2 дня",
			}),
		);

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.category, "reliable");
		assert.equal(result.stats.noShowCount, 0);
		assert.equal(result.stats.attendanceRatePercent, 90);
		assert.equal(result.stats.onTimeRatePercent, 90);
		assert.ok(result.reliabilityBadge.badgeText.includes("Надежный"));
	});

	it("8. classifies frequent lateness >15 min as attention zone via structured timestamps", () => {
		const patient = createMockPatient({ id: "pat-late" });
		const appts: Appointment[] = [
			createMockAppointment({
				patientId: "pat-late",
				startsAt: "2026-08-01T10:00:00Z",
				...({ actualStartTime: "2026-08-01T10:20:00Z" } as any),
				status: "completed",
			}),
			createMockAppointment({
				patientId: "pat-late",
				startsAt: "2026-08-05T10:00:00Z",
				...({ actualStartTime: "2026-08-05T10:25:00Z" } as any),
				status: "completed",
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

	it("9. classifies 2 non-consecutive no-shows as attention", () => {
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

	it("10. triggers risk when total no-shows >= 3", () => {
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
		// Mandate 8e/8n: Doctor autonomy and zero-blocking, no hostile 2-hour confirmation popups
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, false);
		assert.ok(result.score <= 45, `score should be <= 45, got ${result.score}`);
	});

	it("11. correctly detects consecutive no-show streak of 3 trailing missed visits", () => {
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

	it("12. calculateAppointmentLatenessMinutes handles ISO strings, timestamps and missing fields safely", () => {
		assert.equal(
			calculateAppointmentLatenessMinutes({
				startTime: "2026-08-01T10:00:00Z",
				actualStartTime: "2026-08-01T10:35:00Z",
			}),
			35,
		);
		assert.equal(
			calculateAppointmentLatenessMinutes({
				startsAt: "2026-08-01T10:00:00Z",
				actualStartsAt: "2026-08-01T10:15:00Z",
			}),
			15,
		);
		assert.equal(calculateAppointmentLatenessMinutes(null), null);
		assert.equal(calculateAppointmentLatenessMinutes(undefined), null);
		assert.equal(calculateAppointmentLatenessMinutes({}), null);
		assert.equal(calculateAppointmentLatenessMinutes({ startsAt: "invalid" }), null);
	});

	it("13. formatPatientBalanceBadge handles exact kopecks without rounding error", () => {
		const debtBadge = formatPatientBalanceBadge(-3250.5);
		assert.ok(debtBadge.formattedAmount.includes("3 250,50") || debtBadge.formattedAmount.includes("3 250,50"));

		const depositBadge = formatPatientBalanceBadge(7800.25);
		assert.ok(depositBadge.formattedAmount.includes("7 800,25") || depositBadge.formattedAmount.includes("7 800,25"));
	});

	it("14. excludes future planned/confirmed appointments from historical reliability calculation", () => {
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

	it("15. produces identical deterministic results regardless of input appointment array order", () => {
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

	it("16. handles null or undefined patient and appointments gracefully without throwing", () => {
		const resNull = calculatePatientReliability(null, null);
		assert.equal(resNull.category, "new");
		assert.equal(resNull.score, 0);
		assert.equal(resNull.financialBadge.status, "settled");

		const resUndef = calculatePatientReliability(undefined, undefined);
		assert.equal(resUndef.category, "new");
		assert.equal(resUndef.stats.totalAppointments, 0);
	});

	it("17. appends debt warning to receptionist alert when patient has financial liability", () => {
		const patient = createMockPatient({ id: "pat-debt-alert", balanceRub: -5000 });
		const appts = [
			createMockAppointment({ patientId: "pat-debt-alert", startsAt: "2026-08-01T10:00:00Z", status: "completed" }),
		];

		const result = calculatePatientReliability(patient, appts);

		assert.equal(result.financialBadge.isDebt, true);
		assert.ok(result.flags.some((f) => f.includes("Задолженность:")));
		assert.ok(result.receptionistAlert?.includes("Долг:") || result.receptionistAlert?.includes("задолженность"));
	});

	it("18. respects high-risk override from PatientInsight with >=2 no-shows", () => {
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
		// Mandate 8e/8n: Doctor autonomy and zero-blocking, no hostile 2-hour confirmation popups
		assert.equal(result.reliabilityBadge.requiresTwoHourConfirmation, false);
	});

	it("19. isAppointmentFinalizedOrPast correctly classifies appointment states", () => {
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
