import assert from "node:assert/strict";
import { test, describe } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  ScheduleMiniMonthCalendar,
  ScheduleInspectorAppointmentDetails,
  ScheduleInspectorEmptyState,
  ScheduleAppointmentInspector,
} from "../inspector";
import { ScheduleGridFooter } from "../grid/ScheduleGridFooter";

describe("ScheduleAppointmentInspector (StomX CRM Parity Right Inspector Panel)", () => {
  const samplePatient: any = {
    id: "pat-100",
    fullName: "Иванов Иван Иванович",
    phone: "+7 (999) 111-22-33",
    birthDate: "1990-05-15",
    balance: -1500,
    allergies: ["Лидокаин"],
  };

  const sampleDoctor: any = {
    id: "doc-100",
    fullName: "Петрова Анна Сергеевна",
    specialty: "Терапевт",
  };

  const sampleAppointment: any = {
    id: "appt-inspector-1",
    patientId: "pat-100",
    doctorUserId: "doc-100",
    chairId: "chair-1",
    startsAt: "2026-10-22T10:00:00.000Z",
    endsAt: "2026-10-22T11:00:00.000Z",
    status: "confirmed",
    reason: "Лечение пульпита #36",
    comment: "Жалобы на острую ночную боль",
    createdAt: "2026-10-20T12:00:00.000Z",
  };

  const sampleDashboard: any = {
    clinicSettings: {
      chairs: [{ id: "chair-1", name: "Кресло 1 (Терапия)" }],
      staff: [sampleDoctor],
    },
    patients: [samplePatient],
    appointments: [sampleAppointment],
  };

  const patientLookupMap = new Map<string, any>([["pat-100", samplePatient]]);
  const staffLookupMap = new Map<string, any>([["doc-100", sampleDoctor]]);

  const toDateTimeLocalValue = (iso: string) => (iso ? iso.slice(0, 16) : "");

  const appointmentLabels: Record<string, string> = {
    planned: "Запланирован",
    confirmed: "Подтверждён",
    arrived: "В холле",
    in_treatment: "В кресле",
    completed: "Завершён",
    cancelled: "Отменён",
    no_show: "Неявка",
  };

  test("1. ScheduleMiniMonthCalendar renders Russian months, weekdays, and appointment markers", () => {
    const html = renderToString(
      <ScheduleMiniMonthCalendar
        selectedDate="2026-10-22"
        appointments={[sampleAppointment]}
        onSelectDate={() => {}}
      />
    );

    // Month & year in Russian
    assert.ok(html.includes("Октябрь 2026"));
    assert.ok(html.includes("data-testid=\"schedule-mini-month-calendar\""));

    // Weekday abbreviations
    for (const wd of ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]) {
      assert.ok(html.includes(wd));
    }

    // Selected date styling and appointment indicator dot
    assert.ok(html.includes("bg-sky-600"));
    assert.ok(html.includes("2026-10-22 (есть приёмы)"));

    // Quick navigation controls
    assert.ok(html.includes("Сегодня"));
    assert.ok(html.includes("Предыдущий месяц"));
    assert.ok(html.includes("Следующий месяц"));
  });

  test("2. ScheduleInspectorAppointmentDetails renders patient FIO, phone, doctor, teeth, balance, and 1-click status transitions", () => {
    const html = renderToString(
      <ScheduleInspectorAppointmentDetails
        appointment={sampleAppointment}
        onDeselect={() => {}}
        dashboard={sampleDashboard}
        patientLookupMap={patientLookupMap}
        staffLookupMap={staffLookupMap}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        onQuickStatusChange={() => {}}
        onOpenVisit={() => {}}
        onEditAppointment={() => {}}
      />
    );

    // Inspector root container
    assert.ok(html.includes("data-testid=\"schedule-inspector-appointment\""));
    assert.ok(html.includes("data-appointment-id=\"appt-inspector-1\""));

    // Patient FIO and Phone link
    assert.ok(html.includes("Иванов Иван Иванович"));
    assert.ok(html.includes("tel:+7 (999) 111-22-33"));
    assert.ok(html.includes("Написать в WhatsApp"));

    // Doctor & Chair
    assert.ok(html.includes("Петрова А.С."));
    assert.ok(html.includes("Терапия"));
    assert.ok(html.includes("Кресло 1 (Терапия)"));

    // Time & Procedure
    assert.ok(html.includes("10:00"));
    assert.ok(html.includes("11:00"));
    assert.ok(html.includes("мин"));
    assert.ok(html.includes("Лечение пульпита #36"));
    assert.ok(html.includes("Жалобы на острую ночную боль"));

    // FDI tooth extraction
    assert.ok(html.includes("36"));

    // Patient debt / balance
    assert.ok(html.includes("Долг"));

    // Allergy alert
    assert.ok(html.includes("Лидокаин"));

    // 1-Click Status buttons
    assert.ok(html.includes("data-testid=\"schedule-inspector-status-confirmed\""));
    assert.ok(html.includes("data-testid=\"schedule-inspector-status-arrived\""));
    assert.ok(html.includes("data-testid=\"schedule-inspector-status-in-chair\""));
    assert.ok(html.includes("data-testid=\"schedule-inspector-status-completed\""));

    // Action CTA buttons
    assert.ok(html.includes("data-testid=\"schedule-inspector-open-visit-btn\""));
    assert.ok(html.includes("data-action-testid=\"schedule-inspector-start-visit-btn\""));
    assert.ok(html.includes("Открыть карту приёма"));
    assert.ok(html.includes("✓ Начать приём"));
    assert.ok(html.includes("data-testid=\"schedule-inspector-edit-btn\""));
    assert.ok(html.includes("Редактировать запись"));
    assert.ok(html.includes("data-testid=\"schedule-inspector-close-btn\""));
  });

  test("3. ScheduleInspectorEmptyState renders daily metrics and appointments queue", () => {
    const htmlWithAppts = renderToString(
      <ScheduleInspectorEmptyState
        appointments={[sampleAppointment]}
        dateKey="2026-10-22"
        patientLookupMap={patientLookupMap}
        staffLookupMap={staffLookupMap}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        onSelectAppointment={() => {}}
      />
    );

    assert.ok(htmlWithAppts.includes("data-testid=\"schedule-inspector-empty-state\""));
    assert.ok(htmlWithAppts.includes("Всего записей:"));
    assert.ok(htmlWithAppts.includes("Подтверждено:"));
    assert.ok(htmlWithAppts.includes("В клинике:"));
    assert.ok(htmlWithAppts.includes("Завершено:"));
    assert.ok(htmlWithAppts.includes("Иванов Иван И."));
    assert.ok(htmlWithAppts.includes("Петрова А.С."));

    // Empty state when no appointments on the selected day
    const htmlEmpty = renderToString(
      <ScheduleInspectorEmptyState
        appointments={[]}
        dateKey="2026-10-25"
        patientLookupMap={patientLookupMap}
        staffLookupMap={staffLookupMap}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        onSelectAppointment={() => {}}
      />
    );
    assert.ok(htmlEmpty.includes("На выбранный день записей нет"));
  });

  test("4. ScheduleAppointmentInspector toggles between details, empty state, and respects isOpen", () => {
    // When appointment selected
    const htmlSelected = renderToString(
      <ScheduleAppointmentInspector
        selectedAppointment={sampleAppointment}
        onDeselect={() => {}}
        dashboard={sampleDashboard}
        appointments={[sampleAppointment]}
        dateKey="2026-10-22"
        onDateChange={() => {}}
        patientLookupMap={patientLookupMap}
        staffLookupMap={staffLookupMap}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        onSelectAppointment={() => {}}
        isOpen={true}
      />
    );
    assert.ok(htmlSelected.includes("data-testid=\"schedule-right-inspector\""));
    assert.ok(htmlSelected.includes("data-testid=\"schedule-inspector-appointment\""));
    assert.ok(htmlSelected.includes("data-testid=\"schedule-mini-month-calendar\""));

    // When no appointment selected (shows empty state queue)
    const htmlUnselected = renderToString(
      <ScheduleAppointmentInspector
        selectedAppointment={null}
        onDeselect={() => {}}
        dashboard={sampleDashboard}
        appointments={[sampleAppointment]}
        dateKey="2026-10-22"
        onDateChange={() => {}}
        patientLookupMap={patientLookupMap}
        staffLookupMap={staffLookupMap}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        onSelectAppointment={() => {}}
        isOpen={true}
      />
    );
    assert.ok(htmlUnselected.includes("data-testid=\"schedule-right-inspector\""));
    assert.ok(htmlUnselected.includes("data-testid=\"schedule-inspector-empty-state\""));

    // When isOpen is false
    const htmlClosed = renderToString(
      <ScheduleAppointmentInspector
        selectedAppointment={null}
        onDeselect={() => {}}
        dashboard={sampleDashboard}
        appointments={[sampleAppointment]}
        dateKey="2026-10-22"
        onDateChange={() => {}}
        patientLookupMap={patientLookupMap}
        staffLookupMap={staffLookupMap}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        onSelectAppointment={() => {}}
        isOpen={false}
      />
    );
    assert.equal(htmlClosed, "");
  });

  test("5. ScheduleGridFooter renders inspector toggle button with PanelRight icon", () => {
    const html = renderToString(
      <ScheduleGridFooter
        dailyTally={{
          totalAppointmentsCount: 5,
          clinicOccupancyPercent: 65,
          totalDurationMinutes: 180,
          totalRevenueRub: 45000,
        }}
        effectiveChairs={[{ id: "c1", name: "Кресло 1" }]}
        handleCopyWeekShiftsToNextWeek={() => {}}
        showRevenue={true}
        handleToggleShowRevenue={() => {}}
        isInspectorOpen={true}
        onToggleInspector={() => {}}
      />
    );

    assert.ok(html.includes("data-testid=\"btn-grid-toggle-inspector\""));
    assert.ok(html.includes("Инспектор"));
    assert.ok(html.includes("Скрыть боковую панель инспектора"));
    assert.ok(html.includes("Загрузка клиники: 5 визитов (65%)"));
    assert.ok(html.includes((45000).toLocaleString("ru-RU")));
    assert.ok(html.includes("₽"));
  });
});
