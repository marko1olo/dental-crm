/**
 * DENTE Dental CRM — Schedule Decoupled Drag & Quantum Time Engine Tests
 *
 * Requirements:
 * 1. Smart 15-min slot snapping & quantization without DOM queries.
 * 2. O(1) Quantum Collision Index (chair, doctor, patient, maintenance).
 * 3. CITO (emergency pain) overbooking autonomy.
 * 4. Fast alternative slot discovery.
 * 5. Decoupled Drag Ghost state lifecycle & native drag suppression.
 * 6. Non-blocking move with 5-second rollback toast undo stack.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Appointment } from "@dental/shared";
import {
  QUANTUM_MINUTES,
  CLINIC_DAY_START_MINUTES,
  CLINIC_DAY_END_MINUTES,
  parseTimeToMinutes,
  formatMinutesToTime,
  snapMinutesTo15Min,
  snapSlotHourTo15Min,
  ScheduleQuantumCollisionIndex,
} from "../grid/scheduleQuantumEngine";
import {
  dragGhostManager,
  type DragGhostData,
} from "../grid/DecoupledDragGhost";
import type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";

describe("Schedule Quantum Time Engine & O(1) Collision Index", () => {
  describe("1. Time parsing and quantization math", () => {
    it("parses time strings and ISO timestamps accurately", () => {
      assert.equal(parseTimeToMinutes("08:00"), 480);
      assert.equal(parseTimeToMinutes("09:30"), 570);
      assert.equal(parseTimeToMinutes("14:15"), 855);
      assert.equal(parseTimeToMinutes("20:45"), 1245);
      // ISO timestamp format
      assert.equal(parseTimeToMinutes("2026-08-25T11:45:00.000Z"), 705);
    });

    it("formats minutes from midnight to HH:MM correctly", () => {
      assert.equal(formatMinutesToTime(480), "08:00");
      assert.equal(formatMinutesToTime(570), "09:30");
      assert.equal(formatMinutesToTime(855), "14:15");
      assert.equal(formatMinutesToTime(1245), "20:45");
    });

    it("snaps arbitrary minutes to nearest 15-minute quantum", () => {
      // 09:37 (577) -> 09:30 (570)
      assert.equal(snapMinutesTo15Min(577), 570);
      // 09:38 (578) -> 09:45 (585)
      assert.equal(snapMinutesTo15Min(578), 585);
      // 09:44 (584) -> 09:45 (585)
      assert.equal(snapMinutesTo15Min(584), 585);
      // 10:07 (607) -> 10:00 (600)
      assert.equal(snapMinutesTo15Min(607), 600);
    });

    it("clamps snapping within clinic opening hours [08:00, 20:45]", () => {
      // Early morning before 08:00 clamps to 08:00 (480)
      assert.equal(snapMinutesTo15Min(300), CLINIC_DAY_START_MINUTES);
      // Late night after 21:00 clamps to last slot 20:45 (1245)
      assert.equal(snapMinutesTo15Min(1350), CLINIC_DAY_END_MINUTES - QUANTUM_MINUTES);
    });

    it("snapSlotHourTo15Min quantizes time strings", () => {
      assert.equal(snapSlotHourTo15Min("09:37"), "09:30");
      assert.equal(snapSlotHourTo15Min("09:38"), "09:45");
      assert.equal(snapSlotHourTo15Min("11:22"), "11:15");
      assert.equal(snapSlotHourTo15Min("14:52"), "14:45");
      assert.equal(snapSlotHourTo15Min("14:53"), "15:00");
    });
  });

  describe("2. O(1) Quantum Collision Index", () => {
    const testDate = "2026-08-25";

    const apptChair1: Appointment = {
      id: "appt-1",
      patientId: "patient-100",
      chairId: "chair-alpha",
      doctorUserId: "doc-1",
      startsAt: `${testDate}T09:00:00.000Z`,
      endsAt: `${testDate}T10:00:00.000Z`,
      status: "confirmed",
      reason: "Лечение кариеса",
      durationMinutes: 60,
    };

    const apptChair2: Appointment = {
      id: "appt-2",
      patientId: "patient-200",
      chairId: "chair-beta",
      doctorUserId: "doc-2",
      startsAt: `${testDate}T10:30:00.000Z`,
      endsAt: `${testDate}T11:15:00.000Z`,
      status: "confirmed",
      reason: "Чистка AirFlow",
      durationMinutes: 45,
    };

    const maintenanceBlock: ChairMaintenanceBlock = {
      id: "maint-1",
      chairId: "chair-alpha",
      dateKey: testDate,
      startsAt: `${testDate}T12:00:00.000Z`,
      endsAt: `${testDate}T12:30:00.000Z`,
      reason: "sanitation",
      note: "Кварцевание и дезинфекция",
    };

    const index = new ScheduleQuantumCollisionIndex({
      dateKey: testDate,
      appointments: [apptChair1, apptChair2],
      chairMaintenanceBlocks: [maintenanceBlock],
      chairs: [
        { id: "chair-alpha", name: "Кабинет 1", active: true },
        { id: "chair-beta", name: "Кабинет 2", active: true },
        { id: "chair-gamma", name: "Кабинет 3 (архив)", active: false },
      ],
    });

    it("detects chair collision in O(1) for overlapping slot", () => {
      const check = index.checkCollision({
        startsAt: `${testDate}T09:15:00.000Z`,
        endsAt: `${testDate}T09:45:00.000Z`,
        chairId: "chair-alpha",
      });

      assert.equal(check.hasCollision, true);
      assert.equal(check.conflictType, "chair");
      assert.equal(check.conflictingEntity?.id, "appt-1");
      assert.match(check.message ?? "", /Кресло уже занято/);
    });

    it("allows non-overlapping chair booking", () => {
      const check = index.checkCollision({
        startsAt: `${testDate}T10:00:00.000Z`,
        endsAt: `${testDate}T10:30:00.000Z`,
        chairId: "chair-alpha",
      });

      assert.equal(check.hasCollision, false);
      assert.equal(check.conflictType, null);
    });

    it("detects doctor overlap across different chairs in O(1)", () => {
      // Doctor 1 is in chair-alpha from 09:00 to 10:00.
      // Attempting to book Doctor 1 in chair-beta at 09:30 should trigger doctor collision!
      const check = index.checkCollision({
        startsAt: `${testDate}T09:30:00.000Z`,
        endsAt: `${testDate}T10:15:00.000Z`,
        chairId: "chair-beta",
        doctorUserId: "doc-1",
      });

      assert.equal(check.hasCollision, true);
      assert.equal(check.conflictType, "doctor");
      assert.equal(check.conflictingEntity?.id, "appt-1");
      assert.match(check.message ?? "", /Врач уже ведет прием/);
    });

    it("detects patient overlap in O(1)", () => {
      // Patient 100 has appointment from 09:00 to 10:00.
      const check = index.checkCollision({
        startsAt: `${testDate}T09:45:00.000Z`,
        endsAt: `${testDate}T10:30:00.000Z`,
        chairId: "chair-beta",
        patientId: "patient-100",
      });

      assert.equal(check.hasCollision, true);
      assert.equal(check.conflictType, "patient");
      assert.equal(check.conflictingEntity?.id, "appt-1");
      assert.match(check.message ?? "", /Пациент уже записан/);
    });

    it("detects chair maintenance and technical break collisions", () => {
      const check = index.checkCollision({
        startsAt: `${testDate}T12:15:00.000Z`,
        endsAt: `${testDate}T12:45:00.000Z`,
        chairId: "chair-alpha",
      });

      assert.equal(check.hasCollision, true);
      assert.equal(check.conflictType, "chair_maintenance");
      assert.equal(check.conflictingEntity?.id, "maint-1");
      assert.match(check.message ?? "", /Технический перерыв/);
    });

    it("excludes the appointment itself during move/reschedule", () => {
      // Rescheduling appt-1 from 09:00 to 09:15 on same chair
      const check = index.checkCollision({
        startsAt: `${testDate}T09:15:00.000Z`,
        endsAt: `${testDate}T10:15:00.000Z`,
        chairId: "chair-alpha",
        doctorUserId: "doc-1",
        patientId: "patient-100",
        excludeAppointmentId: "appt-1",
      });

      assert.equal(check.hasCollision, false);
    });
  });

  describe("3. CITO (Emergency Pain) Overbooking Autonomy", () => {
    const testDate = "2026-08-25";

    const standardAppt: Appointment = {
      id: "appt-standard",
      patientId: "patient-10",
      chairId: "chair-1",
      doctorUserId: "doc-1",
      startsAt: `${testDate}T15:00:00.000Z`,
      endsAt: `${testDate}T16:00:00.000Z`,
      status: "confirmed",
      reason: "Плановый осмотр",
      durationMinutes: 60,
    };

    const index = new ScheduleQuantumCollisionIndex({
      dateKey: testDate,
      appointments: [standardAppt],
    });

    it("allows CITO appointment to overbook slot without blocking", () => {
      const check = index.checkCollision({
        startsAt: `${testDate}T15:15:00.000Z`,
        endsAt: `${testDate}T15:45:00.000Z`,
        chairId: "chair-1",
        doctorUserId: "doc-1",
        isCito: true,
        allowCitoOverbooking: true,
      });

      // CITO overbooking is marked as collision AND as allowed overbooking
      assert.equal(check.hasCollision, true);
      assert.equal(check.isCitoOverbooking, true);
      assert.match(check.message ?? "", /Острая боль \(CITO\)/);
    });
  });

  describe("4. Fast Alternative Free Slot Discovery", () => {
    const testDate = "2026-08-25";

    const appt1: Appointment = {
      id: "appt-morning-1",
      patientId: "p-1",
      chairId: "chair-1",
      startsAt: `${testDate}T08:00:00.000Z`,
      endsAt: `${testDate}T09:00:00.000Z`,
      status: "confirmed",
      durationMinutes: 60,
    };

    const appt2: Appointment = {
      id: "appt-morning-2",
      patientId: "p-2",
      chairId: "chair-1",
      startsAt: `${testDate}T09:00:00.000Z`,
      endsAt: `${testDate}T09:30:00.000Z`,
      status: "confirmed",
      durationMinutes: 30,
    };

    const index = new ScheduleQuantumCollisionIndex({
      dateKey: testDate,
      appointments: [appt1, appt2],
    });

    it("finds next free 30-minute slot at 09:30", () => {
      const alt = index.findNextFreeSlot({
        chairId: "chair-1",
        durationMinutes: 30,
        preferredStartHour: "08:00",
      });

      assert.ok(alt !== null);
      assert.equal(alt?.timeDisplay, "09:30");
      assert.equal(alt?.startsAt, `${testDate}T09:30:00.000Z`);
    });
  });

  describe("5. Decoupled Drag Ghost State Lifecycle", () => {
    beforeEach(() => {
      dragGhostManager.endDrag();
    });

    it("starts drag with active data and notifies subscribers", () => {
      let notifiedData: DragGhostData | null = null;
      const unsubscribe = dragGhostManager.subscribe((data) => {
        notifiedData = data;
      });

      const sampleData: DragGhostData = {
        appointmentId: "appt-drag-test",
        patientName: "Смирнова Анна",
        doctorName: "Д-р Кузнецов",
        procedure: "Имплантация",
        timeRange: "10:00 – 11:00",
      };

      dragGhostManager.startDrag(sampleData, {
        offsetX: 20,
        offsetY: 20,
        startX: 100,
        startY: 200,
      });

      assert.deepEqual(notifiedData, sampleData);
      assert.deepEqual(dragGhostManager.getActiveData(), sampleData);

      dragGhostManager.endDrag();
      assert.equal(notifiedData, null);
      assert.equal(dragGhostManager.getActiveData(), null);

      unsubscribe();
    });
  });
});
