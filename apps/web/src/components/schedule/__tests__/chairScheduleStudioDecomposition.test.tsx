/**
 * chairScheduleStudioDecomposition.test.tsx — Red Team тестирование декомпозиции студии расписания
 * Мандаты 8b / 8zi (Sweet Spot), 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty), 8am (Single Primary CTA).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  ChairScheduleStudioModal,
  type ScheduleStudioAppointment,
} from "../ChairScheduleStudioModal";
import { ChairScheduleStudioHeader } from "../chairStudio/ChairScheduleStudioHeader";
import { ChairShiftSelector } from "../chairStudio/ChairShiftSelector";
import { ChairTimelineGrid } from "../chairStudio/ChairTimelineGrid";
import { ChairScheduleStudioFooter } from "../chairStudio/ChairScheduleStudioFooter";
import { ChairQuickBookingPopover } from "../chairStudio/ChairQuickBookingPopover";
import { CHAIR_PRESETS } from "../scheduleCatalogData";

describe("Chair Schedule Studio Decomposition Suite (Sweet Spot & Mandates 8e, 8n, 8am)", () => {
  it("renders ChairScheduleStudioHeader with date navigation and close trigger", () => {
    const html = renderToString(
      <ChairScheduleStudioHeader
        currentDate="2026-10-31"
        onDateChange={() => {}}
        onDateShift={() => {}}
        activeTab="grid"
        onTabChange={() => {}}
        onClose={() => {}}
      />,
    );

    assert.ok(html.includes("Расписание приёмов"));
    assert.ok(html.includes("Режим без блокировок"));
    assert.ok(html.includes('data-testid="schedule-studio-close-btn"'));
    assert.ok(html.includes("2026-10-31"));
    assert.ok(html.includes("Сетка"));
    assert.ok(html.includes("Лента"));
  });

  it("renders ChairShiftSelector with doctor shift presets and zero bureaucracy (Mandates 8e, 8n)", () => {
    const html = renderToString(
      <ChairShiftSelector
        selectedChairId="all"
        onChairSelect={() => {}}
        selectedShift="morning"
        onShiftSelect={() => {}}
        selectedDoctor="Д-р Соколов А.В."
        onDoctorSelect={() => {}}
      />,
    );

    // Shifts
    assert.ok(html.includes("Утро"));
    assert.ok(html.includes("Вечер"));
    assert.ok(html.includes("Весь день"));

    // Doctor & chairs
    assert.ok(html.includes("Д-р Соколов А.В."));
    assert.ok(html.includes("Все кресла (3)"));
    assert.ok(html.includes("Кресло 1"));
    assert.ok(html.includes("Кресло 2"));
    assert.ok(html.includes("Кресло 3"));

    // Mandate 8n: zero requirements for assistant or chief medical officer
    assert.ok(!html.includes("Обязательный ассистент"));
    assert.ok(!html.includes("Начмед"));
  });

  it("renders ChairTimelineGrid in Agenda mode (Apple HIG) and Desktop Grid mode", () => {
    const testAppts: ScheduleStudioAppointment[] = [
      {
        id: "t-1",
        chairId: "chair-1",
        patientName: "Тестовый Пациент",
        patientPhone: "+7 (999) 111-22-33",
        startTime: "10:00",
        durationMinutes: 30,
        reason: "Осмотр",
        status: "confirmed",
      },
    ];

    // Agenda mode
    const agendaHtml = renderToString(
      <ChairTimelineGrid
        activeTab="agenda"
        currentDate="2026-10-31"
        visibleChairs={CHAIR_PRESETS}
        timeHours={["09:00", "09:30", "10:00"]}
        appointments={testAppts}
        selectedChairId="all"
        onSlotClick={() => {}}
        onStatusChange={() => {}}
      />,
    );
    assert.ok(agendaHtml.includes('data-testid="schedule-agenda-timeline"'));
    assert.ok(agendaHtml.includes("Тестовый Пациент"));
    assert.ok(agendaHtml.includes("Подтвержден"));

    // Desktop Grid mode
    const gridHtml = renderToString(
      <ChairTimelineGrid
        activeTab="grid"
        currentDate="2026-10-31"
        visibleChairs={CHAIR_PRESETS}
        timeHours={["09:00", "09:30", "10:00"]}
        appointments={testAppts}
        selectedChairId="all"
        onSlotClick={() => {}}
        onStatusChange={() => {}}
      />,
    );
    assert.ok(gridHtml.includes("Кресло 1"));
    assert.ok(gridHtml.includes("Кресло 2"));
    assert.ok(gridHtml.includes("Свободное окно"));
  });

  it("renders ChairScheduleStudioFooter with unblocked single Primary CTA button (Mandates 8e, 8am)", () => {
    const html = renderToString(
      <ChairScheduleStudioFooter
        currentDate="2026-10-31"
        appointmentsCount={4}
        selectedDoctor="Д-р Соколов А.В."
        onQuickBookTrigger={() => {}}
      />,
    );

    assert.ok(html.includes('data-testid="chair-schedule-confirm-slot-btn"'));
    assert.ok(html.includes("Забронировать слот"));
    assert.ok(html.includes("Д-р Соколов А.В."));
    assert.ok(html.includes("4"));
    // Mandate 8e: never disabled
    assert.ok(!html.includes('disabled=""'));
  });

  it("renders ChairQuickBookingPopover with 1-click booking without mandatory bureaucracy", () => {
    const html = renderToString(
      <ChairQuickBookingPopover
        bookingSlot={{ chairId: "chair-1", startTime: "12:00" }}
        bookingForm={{
          patientName: "",
          patientPhone: "",
          durationMinutes: 30,
          reason: "Первичный осмотр",
          isEmergency: false,
        }}
        onFormChange={() => {}}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
    );

    assert.ok(html.includes('data-testid="quick-booking-popover"'));
    assert.ok(html.includes('data-testid="quick-booking-submit-btn"'));
    assert.ok(html.includes("Экспресс-запись"));
    assert.ok(html.includes("12:00"));
    assert.ok(html.includes("Кресло 1"));
    // Never disabled
    assert.ok(!html.includes('disabled=""'));
  });

  it("renders full ChairScheduleStudioModal facade with seamless backwards compatibility", () => {
    const html = renderToString(
      <ChairScheduleStudioModal isOpen={true} onClose={() => {}} />,
    );

    assert.ok(html.includes('data-testid="chair-schedule-studio-modal"'));
    assert.ok(html.includes("Расписание приёмов"));
    assert.ok(html.includes("Все кресла"));
    assert.ok(html.includes("Кресло 1"));
    assert.ok(html.includes("Кресло 2"));
    assert.ok(html.includes("Кресло 3"));
    assert.ok(html.includes("Забронировать слот"));
    // Drag handle check (Apple HIG)
    assert.ok(html.includes("rounded-full bg-[var(--line-strong,#94a3b8)]/50"));
    // Zero disabled controls
    assert.ok(!html.includes('disabled=""'));
  });
});
