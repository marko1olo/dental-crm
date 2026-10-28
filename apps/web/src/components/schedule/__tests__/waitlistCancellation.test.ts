import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import {
  type TargetSlotInfo,
  type WaitlistCandidateItem,
  URGENCY_CONFIG,
  checkTimeWindowFit,
  detectWaitlistUrgency,
  extractPatientPoliteName,
  filterWaitlistCandidates,
  formatDoctorSalutation,
  generateWaitlistOfferMessage,
  scoreWaitlistCandidate,
} from "../waitlist";
import { WaitlistDrawer } from "../waitlist";

// biome-ignore lint/suspicious/noExplicitAny: mock AppLogic value for isolated unit testing
const mockAppLogicValue: any = {
  dashboard: {
    clinicSettings: {
      name: "Стоматология DENTE",
      staff: [
        {
          id: "doc-1",
          fullName: "Д-р Ковалев Сергей Петрович",
          role: "doctor",
        },
        { id: "doc-2", fullName: "Д-р Смирнова Анна", role: "doctor" },
      ],
      chairs: [
        { id: "chair-1", name: "Кресло 1 (Терапия)" },
        { id: "chair-2", name: "Кресло 2 (Хирургия)" },
      ],
    },
    patients: [
      { id: "p-1", fullName: "Иванов Иван Иванович", phone: "+79001234567" },
      { id: "p-2", fullName: "Петрова Анна", phone: "+79007654321" },
    ],
  },
  auth: {
    denteClinicalReadHeaders: () => ({}),
    denteClinicalMutationHeaders: () => ({}),
  },
};

describe("Waitlist Cancellation Auto-Fill & Privacy-First Engine (SSOT)", () => {
  describe("Privacy-First Polite Message Generation (Медицинская тайна 323-ФЗ)", () => {
    it("generates polite appointment offer without disclosing diagnosis or teeth numbers", () => {
      const message = generateWaitlistOfferMessage({
        patientName: "Иванов Иван Иванович",
        doctorName: "Д-р Ковалев Сергей Петрович",
        startsAt: "2026-09-25T15:30:00.000Z",
        clinicName: "Стоматология DENTE",
      });

      assert.ok(
        message.includes("Здравствуйте, Иван Иванович!"),
        "Should greet with patronymic",
      );
      assert.ok(
        message.includes("Стоматология DENTE"),
        "Should include clinic name",
      );
      assert.ok(message.includes("Ковалев"), "Should mention doctor name");
      assert.ok(
        message.includes("Сможете подойти?"),
        "Should politely ask availability",
      );

      // Privacy Invariant: no medical details allowed
      assert.strictEqual(
        message.includes("зуб"),
        false,
        "Must not mention tooth",
      );
      assert.strictEqual(
        message.includes("кариес"),
        false,
        "Must not mention caries",
      );
      assert.strictEqual(
        message.includes("пульпит"),
        false,
        "Must not mention pulpitis",
      );
      assert.strictEqual(
        message.includes("диагноз"),
        false,
        "Must not mention diagnosis",
      );
    });

    it("falls back safely when optional parameters are missing", () => {
      const message = generateWaitlistOfferMessage({
        startsAt: "2026-09-25T10:00:00.000Z",
      });

      assert.ok(message.includes("Здравствуйте, Пациент!"));
      assert.ok(message.includes("освободилось окно"));
    });
  });

  describe("extractPatientPoliteName", () => {
    it("extracts First Name + Patronymic for standard 3-word Russian names", () => {
      assert.strictEqual(
        extractPatientPoliteName("Иванов Иван Иванович"),
        "Иван Иванович",
      );
      assert.strictEqual(
        extractPatientPoliteName("Смирнова Елена Васильевна"),
        "Елена Васильевна",
      );
    });

    it("extracts First Name for 2-word names", () => {
      assert.strictEqual(
        extractPatientPoliteName("Сидоров Алексей"),
        "Алексей",
      );
      assert.strictEqual(extractPatientPoliteName("Петрова Анна"), "Анна");
    });

    it("preserves single-word names and handles empty/null gracefully", () => {
      assert.strictEqual(extractPatientPoliteName("Марина"), "Марина");
      assert.strictEqual(extractPatientPoliteName(""), "Пациент");
      assert.strictEqual(extractPatientPoliteName(null), "Пациент");
      assert.strictEqual(extractPatientPoliteName(undefined), "Пациент");
    });
  });

  describe("formatDoctorSalutation", () => {
    it("cleans prefixes and inflects doctor names politely", () => {
      const res1 = formatDoctorSalutation("Д-р Ковалев Сергей");
      assert.ok(res1.includes("доктора"), "Should prefix with доктора");
      assert.ok(res1.includes("Ковалев"), "Should preserve doctor name");

      const res2 = formatDoctorSalutation("Врач Смирнова");
      assert.ok(
        res2.includes("доктора"),
        "Should clean 'Врач' and prefix with доктора",
      );

      const res3 = formatDoctorSalutation(null);
      assert.strictEqual(
        res3,
        "доктора",
        "Should fall back to generic доктора",
      );
    });
  });

  describe("detectWaitlistUrgency (Мандат 8ap: Детерминированные enum-поля, ноль regex)", () => {
    it("identifies acute_pain strictly from typed priorityLevel and urgency fields", () => {
      assert.strictEqual(
        detectWaitlistUrgency({ priorityLevel: "urgent", urgency: "acute_pain" }),
        "acute_pain",
      );
      assert.strictEqual(
        detectWaitlistUrgency({ priorityLevel: "high" }),
        "acute_pain",
      );
      assert.strictEqual(
        detectWaitlistUrgency({ urgency: "urgent" }),
        "acute_pain",
      );
      assert.strictEqual(
        detectWaitlistUrgency(null, "urgent"),
        "acute_pain",
      );
    });

    it("identifies ortho_endo from typed urgency or treatment_plan priority", () => {
      assert.strictEqual(
        detectWaitlistUrgency({ urgency: "ortho_endo" }),
        "ortho_endo",
      );
      assert.strictEqual(
        detectWaitlistUrgency({ priorityLevel: "treatment_plan" }),
        "ortho_endo",
      );
      assert.strictEqual(
        detectWaitlistUrgency({ urgency: "treatment_plan" }),
        "ortho_endo",
      );
    });

    it("identifies hygiene from typed field", () => {
      assert.strictEqual(
        detectWaitlistUrgency({ urgency: "hygiene" }),
        "hygiene",
      );
      assert.strictEqual(
        detectWaitlistUrgency(null, "hygiene"),
        "hygiene",
      );
    });

    it("defaults to routine for standard visits", () => {
      assert.strictEqual(
        detectWaitlistUrgency({ priorityLevel: "medium", urgency: "routine" }),
        "routine",
      );
      assert.strictEqual(detectWaitlistUrgency(null), "routine");
      assert.strictEqual(detectWaitlistUrgency(undefined), "routine");
    });
  });

  describe("scoreWaitlistCandidate & filterWaitlistCandidates", () => {
    const targetSlot: TargetSlotInfo = {
      appointmentId: "slot-cancelled-1",
      startsAt: "2026-09-25T14:00:00.000Z",
      endsAt: "2026-09-25T15:00:00.000Z",
      doctorUserId: "doc-1",
      doctorName: "Д-р Ковалев",
      chairId: "chair-1",
      chairName: "Кресло 1",
      freedBecause: "Отмена приёма",
    };

    const candidateSameDocAcute: WaitlistCandidateItem = {
      id: "c-1",
      patientId: "p-1",
      patientName: "Иванов Иван",
      patientPhone: "+79001112233",
      preferredDoctorId: "doc-1",
      preferredDoctorName: "Д-р Ковалев",
      priorityLevel: "urgent",
      urgency: "acute_pain",
      notes: "Острая боль",
      status: "active",
      createdAt: "2026-09-24T10:00:00.000Z",
    };

    const candidateDifferentDocRoutine: WaitlistCandidateItem = {
      id: "c-2",
      patientId: "p-2",
      patientName: "Смирнова Ольга",
      patientPhone: "+79002223344",
      preferredDoctorId: "doc-2",
      preferredDoctorName: "Д-р Смирнова",
      priorityLevel: "low",
      urgency: "routine",
      notes: "Плановый осмотр",
      status: "active",
      createdAt: "2026-09-25T08:00:00.000Z",
    };

    it("ranks same-doctor acute pain candidate higher than different-doctor routine candidate", () => {
      const score1 = scoreWaitlistCandidate(candidateSameDocAcute, targetSlot);
      const score2 = scoreWaitlistCandidate(
        candidateDifferentDocRoutine,
        targetSlot,
      );

      assert.ok(
        score1.score > score2.score,
        `Candidate 1 (${score1.score}) should score higher than Candidate 2 (${score2.score})`,
      );
      assert.strictEqual(
        score1.sameDoctor,
        true,
        "Candidate 1 must have sameDoctor = true",
      );
      assert.strictEqual(
        score2.sameDoctor,
        false,
        "Candidate 2 must have sameDoctor = false",
      );
      assert.ok(
        score1.score >= 75,
        "Acute pain with same doctor should have high score (>=75)",
      );
    });

    it("filters candidates by sameDoctor only when toggled", () => {
      const candidates = [candidateSameDocAcute, candidateDifferentDocRoutine];
      const filtered = filterWaitlistCandidates(candidates, targetSlot, {
        sameDoctorOnly: true,
      });

      assert.strictEqual(filtered.length, 1, "Only 1 candidate matches doctor");
      assert.strictEqual(filtered[0]?.candidate.id, "c-1");
    });

    it("filters candidates by urgency category", () => {
      const candidates = [candidateSameDocAcute, candidateDifferentDocRoutine];
      const filteredAcute = filterWaitlistCandidates(candidates, targetSlot, {
        urgency: "acute_pain",
      });
      assert.strictEqual(filteredAcute.length, 1);
      assert.strictEqual(filteredAcute[0]?.candidate.id, "c-1");
    });

    it("filters candidates by text search (name, phone, notes)", () => {
      const candidates = [candidateSameDocAcute, candidateDifferentDocRoutine];
      const filteredByName = filterWaitlistCandidates(candidates, targetSlot, {
        searchQuery: "Иванов",
      });
      assert.strictEqual(filteredByName.length, 1);
      assert.strictEqual(filteredByName[0]?.candidate.id, "c-1");
    });
  });

  describe("WaitlistDrawer SSR Rendering & Ergonomics (Apple HIG & Мандат 8am)", () => {
    it("renders WaitlistDrawer with target slot banner and candidate matching toolbar", () => {
      const targetSlot: TargetSlotInfo = {
        appointmentId: "slot-cancelled-1",
        startsAt: "2026-09-25T14:00:00.000Z",
        endsAt: "2026-09-25T15:00:00.000Z",
        doctorUserId: "doc-1",
        doctorName: "Д-р Ковалев",
        chairId: "chair-1",
        chairName: "Кресло 1",
        freedBecause: "Отмена приёма",
      };

      const html = renderToStaticMarkup(
        createElement(
          AppLogicProvider,
          {
            value: mockAppLogicValue,
            children: createElement(WaitlistDrawer, {
              isOpen: true,
              onClose: () => {},
              targetSlot,
            }),
          },
        ),
      );

      assert.ok(html.includes("Лист ожидания"), "Must render header");
      assert.ok(html.includes("Освободившееся окно"), "Must render target slot banner");
      assert.ok(html.includes("data-testid=\"waitlist-drawer\""), "Must have testid");
    });
  });

  describe("checkTimeWindowFit Precise Interval & Weekday Logic", () => {
    it("matches exact time intervals like 11:00-13:00 and rejects times outside interval", () => {
      const slotInside = "2026-09-25T11:30:00.000Z";
      const slotOutside = "2026-09-25T15:30:00.000Z";

      const preferredRanges = [
        { day: "Любой", slot: "11:00 - 13:00" },
      ];

      assert.strictEqual(
        checkTimeWindowFit(slotInside, preferredRanges),
        true,
      );
      assert.strictEqual(
        checkTimeWindowFit(slotOutside, preferredRanges),
        false,
      );
    });

    it("matches weekday constraints (weekdays vs weekend)", () => {
      // 2026-09-25 is Friday (weekday)
      const fridaySlot = "2026-09-25T12:00:00.000Z";
      // 2026-09-26 is Saturday (weekend)
      const saturdaySlot = "2026-09-26T12:00:00.000Z";

      assert.strictEqual(
        checkTimeWindowFit(fridaySlot, undefined, ["weekdays"]),
        true,
      );
      assert.strictEqual(
        checkTimeWindowFit(saturdaySlot, undefined, ["weekdays"]),
        false,
      );
      assert.strictEqual(
        checkTimeWindowFit(saturdaySlot, undefined, ["weekend"]),
        true,
      );
    });

    it("matches named days like ср / wednesday and rejects mismatched days", () => {
      // 2026-09-23 is Wednesday
      const wednesdaySlot = "2026-09-23T10:00:00.000Z";
      // 2026-09-24 is Thursday
      const thursdaySlot = "2026-09-24T10:00:00.000Z";

      const rangesWed = [{ day: "ср", slot: "любое" }];
      assert.strictEqual(checkTimeWindowFit(wednesdaySlot, rangesWed), true);
      assert.strictEqual(checkTimeWindowFit(thursdaySlot, rangesWed), false);
    });
  });
});
