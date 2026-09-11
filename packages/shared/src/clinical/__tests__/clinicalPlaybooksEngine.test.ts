/**
 * packages/shared/src/clinical/__tests__/clinicalPlaybooksEngine.test.ts
 * Unit tests for Smart Clinical Playbooks & Gap Recovery Engine.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateMorningDoctorBriefing,
  generatePreAppointmentSummary,
  recoverCancellationGap,
} from "../clinicalPlaybooksEngine.js";

describe("Morning Doctor Briefing Engine", () => {
  it("aggregates schedule, calculates chair distribution and detects red somatic alerts", () => {
    const input = {
      date: "2026-09-12",
      clinicId: "clinic-1",
      clinicName: "ДЕНТЕ Премиум",
      appointments: [
        {
          id: "appt-1",
          patientId: "p-1",
          patientName: "Смирнов Алексей",
          patientPhone: "+79991112233",
          time: "09:00",
          durationMinutes: 60,
          chairId: "chair-1",
          chairName: "Кресло 1 (Терапия)",
          doctorId: "doc-1",
          doctorName: "д-р Воронов А. В.",
          procedureName: "Лечение кариеса K02.1",
          status: "confirmed" as const,
          somaticAlerts: ["Аллергия на лидокаин"],
          hasRedAlert: true,
          isPrimaryVisit: false,
          balanceKopecks: 0,
          estimatedRevenueKopecks: 750000, // 7500.00 руб.
        },
        {
          id: "appt-2",
          patientId: "p-2",
          patientName: "Кузнецова Мария",
          patientPhone: "+79992223344",
          time: "10:30",
          durationMinutes: 90,
          chairId: "chair-1",
          chairName: "Кресло 1 (Терапия)",
          doctorId: "doc-1",
          doctorName: "д-р Воронов А. В.",
          procedureName: "Эндодонтия 46 зуба",
          status: "scheduled" as const,
          somaticAlerts: [],
          hasRedAlert: false,
          isPrimaryVisit: true,
          balanceKopecks: 100000,
          estimatedRevenueKopecks: 1500000, // 15000.00 руб.
        },
        {
          id: "appt-3",
          patientId: "p-3",
          patientName: "Орлов Дмитрий",
          patientPhone: "+79993334455",
          time: "09:30",
          durationMinutes: 30,
          chairId: "chair-2",
          chairName: "Кресло 2 (Хирургия)",
          doctorId: "doc-2",
          doctorName: "д-р Соколов Д. М.",
          procedureName: "Удаление зуба мудрости",
          status: "confirmed" as const,
          somaticAlerts: ["Кардиостимулятор", "Приём антикоагулянтов"],
          hasRedAlert: true,
          isPrimaryVisit: false,
          balanceKopecks: -50000,
          estimatedRevenueKopecks: 600000, // 6000.00 руб.
        },
        {
          id: "appt-4",
          patientId: "p-4",
          patientName: "Васильев Игорь",
          patientPhone: "+79994445566",
          time: "14:00",
          durationMinutes: 60,
          chairId: "chair-2",
          chairName: "Кресло 2 (Хирургия)",
          doctorId: "doc-2",
          doctorName: "д-р Соколов Д. М.",
          procedureName: "Консультация хирурга",
          status: "cancelled" as const,
          somaticAlerts: [],
          hasRedAlert: false,
          isPrimaryVisit: false,
          balanceKopecks: 0,
          estimatedRevenueKopecks: 200000,
        },
      ],
      overdueRecallsCount: 8,
      unansweredBudgetsCount: 3,
    };

    const briefing = generateMorningDoctorBriefing(input);

    assert.strictEqual(briefing.totalAppointments, 4);
    assert.strictEqual(briefing.confirmedAppointments, 3);
    assert.strictEqual(briefing.cancelledOrNoShow, 1);
    assert.strictEqual(briefing.primaryPatientsCount, 1);
    assert.strictEqual(briefing.totalEstimatedRevenueKopecks, 3050000);

    // Chair distribution
    assert.strictEqual(briefing.chairDistribution.length, 2);
    const chair1 = briefing.chairDistribution.find((c) => c.chairId === "chair-1")!;
    assert.strictEqual(chair1.appointmentCount, 2);
    assert.strictEqual(chair1.totalMinutes, 150);
    assert.strictEqual(chair1.loadFactorPercent, Math.round((150 / 480) * 100));

    // Red alerts
    assert.strictEqual(briefing.redSomaticAlerts.length, 2);
    assert.strictEqual(briefing.redSomaticAlerts[0]!.patientName, "Смирнов Алексей");
    assert.ok(briefing.redSomaticAlerts[0]!.alerts.includes("Аллергия на лидокаин"));
    assert.strictEqual(briefing.redSomaticAlerts[1]!.patientName, "Орлов Дмитрий");

    // Strictly 0 cartoon emojis in briefing output (Mandate 8d)
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    assert.strictEqual(emojiRegex.test(briefing.plainTextBriefing), false);
    assert.ok(briefing.plainTextBriefing.includes("УТРЕННИЙ БРИФИНГ ВРАЧА"));
  });

  it("filters briefing for specific doctor", () => {
    const input = {
      date: "2026-09-12",
      clinicId: "clinic-1",
      clinicName: "ДЕНТЕ",
      doctorId: "doc-2",
      appointments: [
        {
          id: "appt-1",
          patientId: "p-1",
          patientName: "Пациент А",
          patientPhone: "+79991112233",
          time: "09:00",
          durationMinutes: 60,
          chairId: "chair-1",
          chairName: "Кресло 1",
          doctorId: "doc-1",
          doctorName: "д-р Один",
          procedureName: "Терапия",
          status: "confirmed" as const,
          somaticAlerts: [],
          hasRedAlert: false,
          isPrimaryVisit: false,
          balanceKopecks: 0,
          estimatedRevenueKopecks: 500000,
        },
        {
          id: "appt-2",
          patientId: "p-2",
          patientName: "Пациент Б",
          patientPhone: "+79992223344",
          time: "11:00",
          durationMinutes: 45,
          chairId: "chair-2",
          chairName: "Кресло 2",
          doctorId: "doc-2",
          doctorName: "д-р Два",
          procedureName: "Хирургия",
          status: "confirmed" as const,
          somaticAlerts: [],
          hasRedAlert: false,
          isPrimaryVisit: true,
          balanceKopecks: 0,
          estimatedRevenueKopecks: 800000,
        },
      ],
      overdueRecallsCount: 0,
      unansweredBudgetsCount: 0,
    };

    const briefing = generateMorningDoctorBriefing(input);
    assert.strictEqual(briefing.totalAppointments, 1);
    assert.strictEqual(briefing.primaryPatientsCount, 1);
    assert.strictEqual(briefing.totalEstimatedRevenueKopecks, 800000);
  });
});

describe("Cancellation Gap Recovery Engine", () => {
  it("scores and ranks recall candidates to fill an open cancellation slot", () => {
    const input = {
      cancelledSlot: {
        appointmentId: "cancelled-101",
        date: "2026-09-12",
        startTime: "11:00",
        endTime: "12:00",
        durationMinutes: 60,
        chairId: "chair-1",
        chairName: "Кресло 1",
        doctorId: "doc-1",
        doctorName: "д-р Воронов А. В.",
        specialty: "therapist" as const,
      },
      recallCandidates: [
        {
          patientId: "cand-1",
          patientName: "Соловьёва Анна",
          patientPhone: "+79991234567",
          priority: "high" as const,
          dueRecallDate: "2026-07-01",
          daysOverdue: 73,
          recommendedProcedure: "Контроль после эндодонтии",
          preferredDoctorId: "doc-1",
          preferredTimeOfDay: "morning" as const,
          lastContactOutcome: "call_back_later" as const,
          familyBalanceKopecks: 250000,
        },
        {
          patientId: "cand-2",
          patientName: "Григорьев Петр",
          patientPhone: "+79992345678",
          priority: "medium" as const,
          dueRecallDate: "2026-08-15",
          daysOverdue: 28,
          recommendedProcedure: "Профгигиена полости рта",
          preferredDoctorId: "doc-99", // different doctor
          preferredTimeOfDay: "evening" as const,
          lastContactOutcome: "none" as const,
          familyBalanceKopecks: 0,
        },
        {
          patientId: "cand-3",
          patientName: "Белов Сергей",
          patientPhone: "+79993456789",
          priority: "low" as const,
          dueRecallDate: "2026-09-10",
          daysOverdue: 2,
          recommendedProcedure: "Плановый профосмотр",
          preferredDoctorId: "doc-1",
          preferredTimeOfDay: "any" as const,
          lastContactOutcome: "none" as const,
          familyBalanceKopecks: 0,
        },
      ],
      maxCandidates: 3,
    };

    const recovery = recoverCancellationGap(input);

    assert.strictEqual(recovery.scoredCandidates.length, 3);
    const top = recovery.topCandidate;
    assert.ok(top !== null);
    assert.strictEqual(top.patientId, "cand-1");
    assert.strictEqual(top.patientName, "Соловьёва Анна");
    assert.ok(top.score >= 90); // 40 (high priority) + 30 (overdue > 60d) + 15 (doctor match) + 10 (morning match) + 5 (callback) + 5 (balance) = 100
    assert.ok(top.matchReason.includes("Высокий клинический приоритет"));
    assert.ok(top.bookingRecommendation.includes("Соловьёва Анна"));

    // Check zero emojis in summary
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    assert.strictEqual(emojiRegex.test(recovery.summaryRu), false);
  });
});

describe("0-Click Pre-Appointment Summary Generator", () => {
  it("compiles a clean chairside pre-appointment summary without emojis", () => {
    const input = {
      patient: {
        id: "pat-500",
        name: "Ковалёв Роман Станиславович",
        birthDate: "1988-04-12",
        gender: "male" as const,
        phone: "+79998887766",
      },
      appointment: {
        id: "appt-500",
        date: "2026-09-12",
        time: "15:00",
        durationMinutes: 60,
        doctorName: "д-р Морозова Е. И.",
        chairName: "Кресло 3 (Ортопедия)",
        procedure: "Примерка металлокерамической коронки 46",
        notes: "Пациент жаловался на чувствительность при накусывании",
      },
      somaticHistory: {
        alerts: ["Бронхиальная астма", "Аллергия на латекс"],
        chronicDiseases: ["Гипертоническая болезнь II ст."],
        medications: ["Бисопролол 5 мг"],
        isPregnant: false,
        bloodPressureTypical: "135/85",
      },
      dentalHistory: {
        missingTeeth: [18, 28, 38, 48],
        treatedTeeth: [16, 26, 36],
        implants: [45],
        perioStateSummary: "Хронический генерализованный пародонтит средней степени",
        lastXRayDate: "2024-05-10", // > 12 months ago -> triggers suggestion
      },
      financialStatus: {
        balanceKopecks: -1250000, // -12500.00 руб.
        openTreatmentPlanAmountKopecks: 8500000,
        unacceptedBudgetsCount: 1,
      },
      activeRecalls: [
        {
          id: "rec-1",
          procedure: "Профгигиена раз в 6 месяцев",
          dueDate: "2026-08-01",
          isOverdue: true,
        },
      ],
    };

    const summary = generatePreAppointmentSummary(input);

    assert.strictEqual(summary.patientId, "pat-500");
    assert.strictEqual(summary.patientName, "Ковалёв Роман Станиславович");
    assert.ok(summary.ageYears !== null && summary.ageYears >= 35);
    assert.strictEqual(summary.todayAppointmentTime, "15:00");
    assert.strictEqual(summary.chairAndDoctor, "Кресло 3 (Ортопедия) / д-р Морозова Е. И.");

    // Critical alerts
    assert.ok(summary.criticalAlerts.some((a) => a.includes("БРОНХИАЛЬНАЯ АСТМА")));
    assert.ok(summary.criticalAlerts.some((a) => a.includes("АЛЛЕРГИЯ НА ЛАТЕКС")));
    assert.ok(summary.criticalAlerts.some((a) => a.includes("ГИПЕРТОНИЧЕСКАЯ БОЛЕЗНЬ")));

    // Financial pre-brief
    assert.ok(summary.financialPreBrief.includes("ЗАДОЛЖЕННОСТЬ: 12500.00 руб."));
    assert.ok(summary.financialPreBrief.includes("Открытый план лечения"));

    // Suggested actions: X-ray > 12 mo and overdue recall
    assert.ok(summary.suggestedActions.some((a) => a.includes("Контрольная рентгенография/КТ")));
    assert.ok(summary.suggestedActions.some((a) => a.includes("Профгигиена раз в 6 месяцев")));

    // Strictly 0 cartoon emojis in printed/chairside text (Mandate 8d)
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    assert.strictEqual(emojiRegex.test(summary.printCleanText), false);
    assert.ok(summary.printCleanText.includes("ПРЕДВАРИТЕЛЬНАЯ СВОДКА ПЕРЕД ПРИЁМОМ"));
  });
});
