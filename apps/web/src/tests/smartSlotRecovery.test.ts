import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type SmartSlotRecoveryTargetSlot,
  SmartSlotRecoveryPopover,
} from "../components/schedule/SmartSlotRecoveryPopover";
import {
  type MatchWaitlistSlotParams,
  type WaitlistEntryLike,
  calculateSlotDurationMinutes,
  calculateWaitingDays,
  checkCandidateTimeOfDayFit,
  detectCandidateUrgency,
  extractPoliteName,
  formatDoctorSalutation,
  generate152FzSlotOfferMessage,
  generateWhatsAppLink,
  getTimeOfDayCategory,
  matchWaitlistCandidatesForSlot,
} from "../components/schedule/smartSlotRecoveryEngine";

describe("Smart Slot Recovery Engine & Popover (Priorities & 152-FZ)", () => {
  describe("Helper Functions: Duration, Time of Day, Waiting Days", () => {
    it("calculates slot duration correctly for ISO strings and HH:mm strings", () => {
      assert.equal(
        calculateSlotDurationMinutes(
          "2026-10-06T10:00:00.000Z",
          "2026-10-06T11:00:00.000Z",
        ),
        60,
      );
      assert.equal(
        calculateSlotDurationMinutes(
          "2026-10-06T14:30:00.000Z",
          "2026-10-06T15:15:00.000Z",
        ),
        45,
      );
      assert.equal(calculateSlotDurationMinutes("09:00", "09:30"), 30);
      assert.equal(calculateSlotDurationMinutes("15:00", "16:30"), 90);
    });

    it("categorizes time of day correctly (morning, afternoon, evening)", () => {
      assert.equal(getTimeOfDayCategory("2026-10-06T09:30:00"), "morning");
      assert.equal(getTimeOfDayCategory("2026-10-06T11:45:00"), "morning");
      assert.equal(getTimeOfDayCategory("2026-10-06T13:00:00"), "afternoon");
      assert.equal(getTimeOfDayCategory("2026-10-06T16:30:00"), "afternoon");
      assert.equal(getTimeOfDayCategory("2026-10-06T17:00:00"), "evening");
      assert.equal(getTimeOfDayCategory("2026-10-06T19:30:00"), "evening");
      assert.equal(getTimeOfDayCategory("10:00"), "morning");
      assert.equal(getTimeOfDayCategory("14:00"), "afternoon");
      assert.equal(getTimeOfDayCategory("18:00"), "evening");
    });

    it("detects urgency from explicit urgency, priorityLevel, or natural text notes", () => {
      assert.equal(
        detectCandidateUrgency({ urgency: "acute_pain" }),
        "acute_pain",
      );
      assert.equal(
        detectCandidateUrgency({ priorityLevel: "urgent" }),
        "acute_pain",
      );
      assert.equal(
        detectCandidateUrgency({ notes: "Острая боль, пульпит 3.6" }),
        "acute_pain",
      );
      assert.equal(
        detectCandidateUrgency({ notes: "Активация брекетов" }),
        "ortho_endo",
      );
      assert.equal(
        detectCandidateUrgency({ notes: "Чистка зубов AirFlow" }),
        "hygiene",
      );
      assert.equal(
        detectCandidateUrgency({ notes: "Плановый контрольный осмотр" }),
        "routine",
      );
    });

    it("calculates waiting days correctly", () => {
      const now = new Date("2026-10-06T12:00:00.000Z");
      const fiveDaysAgo = new Date("2026-10-01T12:00:00.000Z").toISOString();
      assert.equal(calculateWaitingDays(fiveDaysAgo, null, now), 5);
      assert.equal(calculateWaitingDays(undefined, 8, now), 8);
    });

    it("checks candidate preferred time of day fit", () => {
      const morningEntry: WaitlistEntryLike = {
        preferredTimeRanges: [{ day: "пн", slot: "09:00-12:00" }],
      };
      assert.equal(
        checkCandidateTimeOfDayFit("morning", morningEntry.preferredTimeRanges).fits,
        true,
      );
      assert.equal(
        checkCandidateTimeOfDayFit("evening", morningEntry.preferredTimeRanges).fits,
        false,
      );

      const anyTimeEntry: WaitlistEntryLike = {
        preferredTimeRanges: [{ day: "any", slot: "любое время" }],
      };
      assert.equal(
        checkCandidateTimeOfDayFit("evening", anyTimeEntry.preferredTimeRanges).fits,
        true,
      );
    });
  });

  describe("152-FZ Polite Message & WhatsApp Link Generation", () => {
    it("extracts respectful polite name (patronymic or first name)", () => {
      assert.equal(
        extractPoliteName("Иванов Иван Иванович"),
        "Иван Иванович",
      );
      assert.equal(extractPoliteName("Петрова Анна"), "Анна");
      assert.equal(extractPoliteName("Смирнов Сергей"), "Сергей");
      assert.equal(extractPoliteName("Мария"), "Мария");
      assert.equal(extractPoliteName(""), "Пациент");
    });

    it("formats doctor salutation cleanly without redundant prefixes", () => {
      assert.equal(
        formatDoctorSalutation("Д-р Смирнов А.П."),
        "доктора Смирнов А.П.",
      );
      assert.equal(
        formatDoctorSalutation("Ковалев Сергей"),
        "доктора Ковалев Сергей",
      );
      assert.equal(formatDoctorSalutation(""), "доктора");
    });

    it("generates 152-FZ safe offer message with zero disclosure of diagnosis", () => {
      const msg = generate152FzSlotOfferMessage({
        patientName: "Волков Сергей Николаевич",
        doctorName: "Д-р Смирнов А.П.",
        clinicName: "DENTE",
        startsAt: "2026-10-06T10:00:00.000Z",
        durationMinutes: 60,
      });

      assert.ok(
        msg.includes("Здравствуйте, Сергей Николаевич!"),
        "Should address by polite name",
      );
      assert.ok(
        msg.includes("DENTE"),
        "Should mention clinic name",
      );
      assert.ok(
        msg.includes("Смирнов А.П."),
        "Should mention doctor",
      );
      assert.ok(
        msg.includes("60 мин"),
        "Should mention duration",
      );
      assert.ok(
        !msg.includes("кариес") && !msg.includes("пульпит") && !msg.includes("4.6"),
        "Must NOT disclose clinical diagnosis or teeth numbers (152-FZ invariant)",
      );
    });

    it("generates WhatsApp click-to-chat URL correctly", () => {
      const url = generateWhatsAppLink("+7 (916) 111-22-33", "Привет!");
      assert.ok(url.startsWith("https://wa.me/79161112233?text="));
      assert.ok(url.includes("%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82!"));
    });
  });

  describe("matchWaitlistCandidatesForSlot Ranking Engine", () => {
    const mockWaitlist: WaitlistEntryLike[] = [
      {
        id: "w-acute",
        patientId: "p-acute",
        patientName: "Смирнов Алексей",
        patientPhone: "+79001112233",
        preferredDoctorId: "doc-1",
        priorityLevel: "urgent",
        urgency: "acute_pain",
        treatmentCategory: "Терапия",
        notes: "Острая боль в области нижней челюсти",
        preferredTimeRanges: [{ day: "вт", slot: "09:00-12:00" }],
        status: "waiting",
        createdAt: "2026-10-04T10:00:00Z",
        waitingDays: 2,
      },
      {
        id: "w-ortho",
        patientId: "p-ortho",
        patientName: "Кузнецова Ирина",
        patientPhone: "+79002223344",
        preferredDoctorId: "doc-1",
        priorityLevel: "medium",
        urgency: "ortho_endo",
        treatmentCategory: "Ортодонтия",
        notes: "Активация брекет-системы",
        preferredTimeRanges: [{ day: "любой", slot: "любое время" }],
        status: "waiting",
        createdAt: "2026-09-26T10:00:00Z",
        waitingDays: 10,
      },
      {
        id: "w-hygiene",
        patientId: "p-hygiene",
        patientName: "Федоров Михаил",
        patientPhone: "+79003334455",
        preferredDoctorId: null, // Any doctor
        priorityLevel: "low",
        urgency: "hygiene",
        treatmentCategory: "Гигиена",
        notes: "Комплексная профгигиена",
        preferredTimeRanges: [{ day: "вт", slot: "09:00-12:00" }],
        status: "waiting",
        createdAt: "2026-10-01T10:00:00Z",
        waitingDays: 5,
      },
      {
        id: "w-diff-doc",
        patientId: "p-diff",
        patientName: "Васильев Олег",
        patientPhone: "+79004445566",
        preferredDoctorId: "doc-999", // Different doctor requested
        priorityLevel: "low",
        urgency: "routine",
        treatmentCategory: "Осмотр",
        notes: "Просил только к доктору 999",
        preferredTimeRanges: [{ day: "вт", slot: "17:00-20:00" }],
        status: "waiting",
        createdAt: "2026-10-05T10:00:00Z",
        waitingDays: 1,
      },
      {
        id: "w-fulfilled",
        patientId: "p-done",
        patientName: "Архипов Петр",
        patientPhone: "+79005556677",
        status: "fulfilled", // Inactive — must be filtered out
        createdAt: "2026-10-01T10:00:00Z",
      },
    ];

    it("ranks acute pain with matching doctor and matching morning slot as top candidate", () => {
      const result = matchWaitlistCandidatesForSlot({
        doctorId: "doc-1",
        doctorName: "Д-р Смирнов А.П.",
        chairId: "chair-1",
        startAt: "2026-10-06T10:00:00",
        endAt: "2026-10-06T11:00:00",
        waitlistEntries: mockWaitlist,
        limit: 3,
      });

      assert.equal(result.matches.length, 3, "Returns top 3 matches");
      assert.equal(result.totalEligibleWaitlist, 4, "Filters out fulfilled entry");

      const topMatch = result.matches[0]!;
      assert.equal(
        topMatch.id,
        "w-acute",
        "Acute pain patient with matching doctor must be top match",
      );
      assert.ok(topMatch.score >= 80, "Top acute match should have high relevance score");
      assert.ok(
        topMatch.matchReasons.some((r) => r.includes("Желаемый врач совпадает")),
      );
      assert.ok(
        topMatch.matchReasons.some((r) => r.includes("Острая боль")),
      );
      assert.ok(
        topMatch.matchReasons.some((r) => r.includes("Утреннее время")),
      );
    });

    it("ranks long-waiting ortho candidate high due to 10-day wait and matching doctor", () => {
      const result = matchWaitlistCandidatesForSlot({
        doctorId: "doc-1",
        doctorName: "Д-р Смирнов А.П.",
        chairId: "chair-1",
        startAt: "2026-10-06T10:00:00",
        endAt: "2026-10-06T11:00:00",
        waitlistEntries: mockWaitlist,
        limit: 3,
      });

      const orthoMatch = result.matches.find((m) => m.id === "w-ortho");
      assert.ok(orthoMatch, "Ortho candidate should be in top 3");
      assert.ok(
        orthoMatch.matchReasons.some((r) => r.includes("10 дн. (длительное ожидание)")),
      );
    });

    it("gives candidates requesting 'any doctor' appropriate points without error", () => {
      const result = matchWaitlistCandidatesForSlot({
        doctorId: "doc-1",
        startAt: "2026-10-06T10:00:00",
        endAt: "2026-10-06T11:00:00",
        waitlistEntries: mockWaitlist,
        limit: 3,
      });

      const hygieneMatch = result.matches.find((m) => m.id === "w-hygiene");
      assert.ok(hygieneMatch, "Hygiene candidate should be matched");
      assert.ok(
        hygieneMatch.matchReasons.some((r) => r.includes("Любой врач клиники")),
      );
    });

    it("scores different doctor and evening mismatch lower", () => {
      const result = matchWaitlistCandidatesForSlot({
        doctorId: "doc-1",
        startAt: "2026-10-06T10:00:00",
        endAt: "2026-10-06T11:00:00",
        waitlistEntries: mockWaitlist,
        limit: 4,
      });

      const diffDocMatch = result.matches.find((m) => m.id === "w-diff-doc");
      assert.ok(diffDocMatch);
      assert.ok(
        diffDocMatch.score < result.matches[0]!.score,
        "Mismatch candidate must have lower score",
      );
    });

    it("matches and ranks 1000 waitlist entries in under 5 ms", () => {
      // Generate 1000 diverse waitlist entries
      const largeWaitlist: WaitlistEntryLike[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `bench-wl-${i}`,
        patientId: `p-${i}`,
        patientName: `Пациент ${i} Тестовый`,
        patientPhone: `+7999000${String(i).padStart(4, "0")}`,
        preferredDoctorId: i % 3 === 0 ? "doc-1" : i % 3 === 1 ? "doc-2" : null,
        priorityLevel: i % 10 === 0 ? "urgent" : i % 5 === 0 ? "high" : "medium",
        urgency: i % 20 === 0 ? "acute_pain" : i % 10 === 0 ? "ortho_endo" : i % 5 === 0 ? "hygiene" : "routine",
        treatmentCategory: i % 4 === 0 ? "Терапия" : i % 4 === 1 ? "Ортодонтия" : "Гигиена",
        preferredTimeRanges: [
          { day: "любой", slot: i % 2 === 0 ? "09:00-12:00" : "14:00-18:00" },
        ],
        waitingDays: (i % 14) + 1,
        status: "waiting",
        createdAt: new Date(Date.now() - (i % 14 + 1) * 86400000).toISOString(),
      }));

      // Warm up JIT
      matchWaitlistCandidatesForSlot({
        doctorId: "doc-1",
        startAt: "2026-10-06T10:00:00",
        endAt: "2026-10-06T11:00:00",
        waitlistEntries: largeWaitlist.slice(0, 100),
        limit: 3,
      });

      // Benchmark measurement
      const start = performance.now();
      const result = matchWaitlistCandidatesForSlot({
        doctorId: "doc-1",
        doctorName: "Д-р Смирнов А.П.",
        chairId: "chair-1",
        startAt: "2026-10-06T10:00:00",
        endAt: "2026-10-06T11:00:00",
        waitlistEntries: largeWaitlist,
        limit: 3,
      });
      const duration = performance.now() - start;

      assert.equal(result.matches.length, 3, "Must return top 3 matches");
      assert.equal(result.totalEligibleWaitlist, 1000, "All 1000 entries evaluated");
      assert.ok(
        result.matches[0]!.offerMessage.length > 0,
        "Offer message materialized for top match",
      );
      assert.ok(
        result.matches[0]!.whatsappUrl.length > 0,
        "WhatsApp URL materialized for top match",
      );
      assert.ok(
        duration < 5,
        `Matching 1000 entries must take < 5ms, took ${duration.toFixed(3)}ms`,
      );
    });
  });

  describe("SmartSlotRecoveryPopover SSR Rendering & Ergonomics", () => {
    const dummySlot: SmartSlotRecoveryTargetSlot = {
      appointmentId: "appt-cancelled-123",
      startsAt: "2026-10-06T10:00:00.000Z",
      endsAt: "2026-10-06T11:00:00.000Z",
      doctorId: "doc-1",
      doctorName: "Д-р Смирнов А.П.",
      chairId: "chair-1",
      chairName: "Кресло №1",
      freedBecause: "Пациент заболел",
      patientName: "Петров Василий",
    };

    const dummyEntries: WaitlistEntryLike[] = [
      {
        id: "cand-1",
        patientId: "p-1",
        patientName: "Волков Сергей Николаевич",
        patientPhone: "+7 (916) 111-22-33",
        preferredDoctorId: "doc-1",
        priorityLevel: "urgent",
        urgency: "acute_pain",
        treatmentCategory: "Терапия",
        notes: "Острая боль 4.6",
        status: "waiting",
        waitingDays: 3,
      },
      {
        id: "cand-2",
        patientId: "p-2",
        patientName: "Морозова Елена Викторовна",
        patientPhone: "+7 (926) 444-55-66",
        preferredDoctorId: "doc-1",
        priorityLevel: "medium",
        urgency: "ortho_endo",
        treatmentCategory: "Ортодонтия",
        notes: "Активация дуги",
        status: "waiting",
        waitingDays: 5,
      },
    ];

    it("renders SmartSlotRecoveryPopover with top candidates, WhatsApp and Book buttons", () => {
      const html = renderToStaticMarkup(
        createElement(SmartSlotRecoveryPopover, {
          isOpen: true,
          onClose: () => {},
          slot: dummySlot,
          waitlistEntries: dummyEntries,
          clinicName: "Стоматология DENTE",
          inline: true,
        }),
      );

      assert.ok(
        html.includes("data-testid=\"smart-slot-recovery-popover\""),
        "Must render popover container",
      );
      assert.ok(
        html.includes("Освободилось окно:"),
        "Must have recovery headline",
      );
      assert.ok(
        html.includes("Волков Сергей Николаевич"),
        "Must display top candidate name",
      );
      assert.ok(
        html.includes("Предложить в WhatsApp"),
        "Must have WhatsApp action button",
      );
      assert.ok(
        html.includes("Записать в этот слот"),
        "Must have 1-click booking CTA",
      );
      assert.ok(
        html.includes("+7 (916) 111-22-33"),
        "Must show candidate phone",
      );
    });

    it("renders clean empty state when waitlist entries are empty", () => {
      const html = renderToStaticMarkup(
        createElement(SmartSlotRecoveryPopover, {
          isOpen: true,
          onClose: () => {},
          slot: dummySlot,
          waitlistEntries: [],
          inline: true,
        }),
      );

      assert.ok(
        html.includes("data-testid=\"smart-slot-recovery-empty\""),
        "Must render empty state container",
      );
      assert.ok(
        html.includes("В листе ожидания нет подходящих пациентов"),
        "Must explain empty state politely",
      );
    });
  });
});
