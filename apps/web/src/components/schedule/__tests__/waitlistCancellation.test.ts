import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import {
  type TargetSlotInfo,
  type WaitlistCandidateItem,
  URGENCY_CONFIG,
  detectWaitlistUrgency,
  extractPatientPoliteName,
  filterWaitlistCandidates,
  formatDoctorSalutation,
  generate152FzWaitlistOfferMessage,
  scoreWaitlistCandidate,
} from "../waitlistCancellationEngine";
import { WaitlistDrawer } from "../WaitlistDrawer";

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

describe("Waitlist Cancellation Auto-Fill & 152-FZ Engine", () => {
  describe("152-FZ Polite Message Generation", () => {
    it("generates polite appointment offer without disclosing diagnosis or teeth numbers", () => {
      const message = generate152FzWaitlistOfferMessage({
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
      assert.ok(message.includes("15:30"), "Should specify freed time");
      assert.ok(
        message.includes("Сможете подойти?"),
        "Should politely ask availability",
      );

      // 152-FZ Invariant: no medical details allowed
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
      const message = generate152FzWaitlistOfferMessage({
        startsAt: "2026-09-25T10:00:00.000Z",
      });

      assert.ok(message.includes("Здравствуйте, Пациент!"));
      assert.ok(message.toLowerCase().includes("в клинике"));
      assert.ok(message.includes("10:00"));
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

  describe("detectWaitlistUrgency", () => {
    it("identifies acute_pain (Острая боль) from keywords and priority levels", () => {
      assert.strictEqual(
        detectWaitlistUrgency("Острая боль в зубе 3.6"),
        "acute_pain",
      );
      assert.strictEqual(
        detectWaitlistUrgency("Неотложная помощь cito пульпит"),
        "acute_pain",
      );
      assert.strictEqual(
        detectWaitlistUrgency("Прием", "urgent"),
        "acute_pain",
      );
      assert.strictEqual(
        detectWaitlistUrgency("Консультация", "acute_pain"),
        "acute_pain",
      );
    });

    it("identifies ortho_endo (Продолжение орто/эндо) from clinical terms", () => {
      assert.strictEqual(
        detectWaitlistUrgency("Продолжение лечения каналов зуба 16"),
        "ortho_endo",
      );
      assert.strictEqual(
        detectWaitlistUrgency("Ортодонтия смена дуги брекетов"),
        "ortho_endo",
      );
      assert.strictEqual(
        detectWaitlistUrgency("Эндодонтия обработка каналов"),
        "ortho_endo",
      );
    });

    it("identifies hygiene (Профгигиена)", () => {
      assert.strictEqual(
        detectWaitlistUrgency("Профгигиена полости рта"),
        "hygiene",
      );
      assert.strictEqual(
        detectWaitlistUrgency("AirFlow чистка и полировка"),
        "hygiene",
      );
      assert.strictEqual(
        detectWaitlistUrgency("УЗ чистка снятие налета"),
        "hygiene",
      );
    });

    it("defaults to routine (Плановый) for regular visits", () => {
      assert.strictEqual(
        detectWaitlistUrgency("Плановый осмотр и консультация"),
        "routine",
      );
      assert.strictEqual(detectWaitlistUrgency(""), "routine");
      assert.strictEqual(detectWaitlistUrgency(null), "routine");
    });
  });

  describe("scoreWaitlistCandidate & filterWaitlistCandidates", () => {
    const targetSlot: TargetSlotInfo = {
      appointmentId: "slot-cancelled-1",
      startsAt: "2026-09-25T14:00:00.000Z", // 14:00 Day
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
      notes: "Острая боль, готов подойти в любое время",
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

      const filteredRoutine = filterWaitlistCandidates(candidates, targetSlot, {
        urgency: "routine",
      });
      assert.strictEqual(filteredRoutine.length, 1);
      assert.strictEqual(filteredRoutine[0]?.candidate.id, "c-2");
    });

    it("filters candidates by text search (name, phone, notes)", () => {
      const candidates = [candidateSameDocAcute, candidateDifferentDocRoutine];
      const filteredByPhone = filterWaitlistCandidates(candidates, targetSlot, {
        searchQuery: "2223344",
      });
      assert.strictEqual(filteredByPhone.length, 1);
      assert.strictEqual(
        filteredByPhone[0]?.candidate.patientName,
        "Смирнова Ольга",
      );

      const filteredByNote = filterWaitlistCandidates(candidates, targetSlot, {
        searchQuery: "боль",
      });
      assert.strictEqual(filteredByNote.length, 1);
      assert.strictEqual(filteredByNote[0]?.candidate.id, "c-1");
    });
  });

  describe("WaitlistDrawer SSR Rendering & Ergonomics", () => {
    it("renders WaitlistDrawer with target slot banner and candidate matching toolbar", () => {
      const targetSlot: TargetSlotInfo = {
        appointmentId: "slot-123",
        startsAt: "2026-09-25T16:00:00.000Z",
        endsAt: "2026-09-25T17:00:00.000Z",
        doctorUserId: "doc-1",
        doctorName: "Д-р Ковалев Сергей Петрович",
        chairId: "chair-1",
        chairName: "Кресло 1 (Терапия)",
        freedBecause: "Отмена приёма",
      };

      const child = createElement(WaitlistDrawer, {
        isOpen: true,
        onClose: () => {},
        targetSlot,
      });

      const html = renderToStaticMarkup(
        createElement(AppLogicProvider, {
          value: mockAppLogicValue,
          children: child,
        }),
      );

      // Assertions for presence of key elements
      assert.ok(
        html.includes('data-testid="waitlist-drawer"'),
        "Drawer must be rendered",
      );
      assert.ok(
        html.includes('data-testid="waitlist-target-slot-banner"'),
        "Freed slot banner must be rendered",
      );
      assert.ok(html.includes("Д-р Ковалев"), "Banner must show doctor name");
      assert.ok(
        html.includes('data-testid="waitlist-toolbar"'),
        "Toolbar must be rendered",
      );
      assert.ok(
        html.includes('data-testid="waitlist-search-input"'),
        "Search input must be present",
      );
      assert.ok(
        html.includes('data-testid="waitlist-urgency-acute_pain"'),
        "Urgency filter acute_pain chip present",
      );
      assert.ok(
        html.includes('data-testid="waitlist-urgency-ortho_endo"'),
        "Urgency filter ortho_endo chip present",
      );
      assert.ok(
        html.includes('data-testid="waitlist-urgency-hygiene"'),
        "Urgency filter hygiene chip present",
      );
      assert.ok(
        html.includes('data-testid="waitlist-urgency-routine"'),
        "Urgency filter routine chip present",
      );
      assert.ok(
        html.includes('data-testid="waitlist-quick-add-toggle-btn"'),
        "Quick add patient button present",
      );
    });
  });
});
