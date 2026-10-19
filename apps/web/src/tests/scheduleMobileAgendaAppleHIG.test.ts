import { describe, it, expect } from "vitest";
import { extractToothBadge } from "../components/schedule/mobile/ScheduleMobileAgendaView";
import type { Appointment } from "@dental/shared";

describe("Schedule Mobile Agenda Apple HIG & Ergonomics", () => {
  it("extracts tooth badge from toothNumber field", () => {
    const appt = {
      id: "a-1",
      toothNumber: "24",
      status: "planned",
      startsAt: "2026-10-15T09:00:00Z",
      endsAt: "2026-10-15T10:00:00Z",
    } as unknown as Appointment;

    const badge = extractToothBadge(appt);
    expect(badge).toBe("Зуб 24");
  });

  it("extracts tooth badge from labOrder toothFdi", () => {
    const appt = {
      id: "a-2",
      status: "in_treatment",
      startsAt: "2026-10-15T10:30:00Z",
      endsAt: "2026-10-15T11:45:00Z",
      labOrder: { toothFdi: "16" },
    } as unknown as Appointment;

    const badge = extractToothBadge(appt);
    expect(badge).toBe("Зуб 16");
  });

  it("extracts tooth badge from reason text with Russian tooth mention", () => {
    const appt = {
      id: "a-3",
      status: "arrived",
      reason: "Лечение глубокого кариеса зуба 36",
      startsAt: "2026-10-15T12:00:00Z",
      endsAt: "2026-10-15T13:00:00Z",
    } as unknown as Appointment;

    const badge = extractToothBadge(appt);
    expect(badge).toBe("Зуб 36");
  });

  it("extracts tooth badge from dotted notation like 2.4", () => {
    const appt = {
      id: "a-4",
      status: "completed",
      serviceTitle: "Эндодонтия 2.4",
      startsAt: "2026-10-15T14:00:00Z",
      endsAt: "2026-10-15T15:00:00Z",
    } as unknown as Appointment;

    const badge = extractToothBadge(appt);
    expect(badge).toBe("Зуб 2.4");
  });

  it("returns null when no tooth is referenced in appointment", () => {
    const appt = {
      id: "a-5",
      status: "planned",
      reason: "Первичная консультация и КТ",
      startsAt: "2026-10-15T16:00:00Z",
      endsAt: "2026-10-15T16:30:00Z",
    } as unknown as Appointment;

    const badge = extractToothBadge(appt);
    expect(badge).toBeNull();
  });

  it("renders 1-tap 'В кресло' CTA on planned appointment timeline row", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { ScheduleMobileTimelineRow } = await import("../components/schedule/mobile/ScheduleMobileTimelineRow");

    const appt = {
      id: "a-planned-1",
      organizationId: "org-1",
      patientId: "pat-1",
      status: "planned",
      startsAt: "2026-10-15T09:00:00Z",
      endsAt: "2026-10-15T09:30:00Z",
      reason: "Консультация",
      comment: "",
    } as unknown as Appointment;

    const html = renderToStaticMarkup(
      React.createElement(ScheduleMobileTimelineRow, {
        item: {
          type: "appointment",
          appointment: appt,
          startsAtLocal: "09:00",
          endsAtLocal: "09:30",
          durationMinutes: 30,
        },
        effectiveDateKey: "2026-10-15",
        selectedDoctorId: null,
        selectedChairId: null,
        dashboard: {
          patients: [{ id: "pat-1", fullName: "Кузнецов Петр" }],
          clinicSettings: { chairs: [], staff: [] },
        } as any,
        patientName: () => "Кузнецов Петр",
        appointmentLabels: { planned: "Запланирован" } as any,
        onSelectMobileAppt: () => {},
      })
    );

    expect(html).toContain('data-testid="mobile-chair-btn-a-planned-1"');
    expect(html).toContain("В кресло");
  });

  it("renders 1-tap 'В приём' CTA on in_treatment appointment timeline row", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { ScheduleMobileTimelineRow } = await import("../components/schedule/mobile/ScheduleMobileTimelineRow");

    const appt = {
      id: "a-treatment-1",
      organizationId: "org-1",
      patientId: "pat-1",
      status: "in_treatment",
      startsAt: "2026-10-15T10:00:00Z",
      endsAt: "2026-10-15T11:00:00Z",
      reason: "Лечение пульпита",
      comment: "",
    } as unknown as Appointment;

    const html = renderToStaticMarkup(
      React.createElement(ScheduleMobileTimelineRow, {
        item: {
          type: "appointment",
          appointment: appt,
          startsAtLocal: "10:00",
          endsAtLocal: "11:00",
          durationMinutes: 60,
        },
        effectiveDateKey: "2026-10-15",
        selectedDoctorId: null,
        selectedChairId: null,
        dashboard: {
          patients: [{ id: "pat-1", fullName: "Кузнецов Петр" }],
          clinicSettings: { chairs: [], staff: [] },
        } as any,
        patientName: () => "Кузнецов Петр",
        appointmentLabels: { in_treatment: "В кресле" } as any,
        onSelectMobileAppt: () => {},
      })
    );

    expect(html).toContain('data-testid="mobile-chair-btn-a-treatment-1"');
    expect(html).toContain("В приём");
  });

  it("renders 1-tap 'Чек' CTA on completed appointment timeline row", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { ScheduleMobileTimelineRow } = await import("../components/schedule/mobile/ScheduleMobileTimelineRow");

    const appt = {
      id: "a-completed-1",
      organizationId: "org-1",
      patientId: "pat-1",
      status: "completed",
      startsAt: "2026-10-15T11:00:00Z",
      endsAt: "2026-10-15T12:00:00Z",
      reason: "Установка пломбы",
      comment: "",
    } as unknown as Appointment;

    const html = renderToStaticMarkup(
      React.createElement(ScheduleMobileTimelineRow, {
        item: {
          type: "appointment",
          appointment: appt,
          startsAtLocal: "11:00",
          endsAtLocal: "12:00",
          durationMinutes: 60,
        },
        effectiveDateKey: "2026-10-15",
        selectedDoctorId: null,
        selectedChairId: null,
        dashboard: {
          patients: [{ id: "pat-1", fullName: "Кузнецов Петр" }],
          clinicSettings: { chairs: [], staff: [] },
        } as any,
        patientName: () => "Кузнецов Петр",
        appointmentLabels: { completed: "Завершен" } as any,
        onSelectMobileAppt: () => {},
      })
    );

    expect(html).toContain('data-testid="mobile-pay-btn-a-completed-1"');
    expect(html).toContain("Чек");
  });

  it("renders floating bottom bar with '+ Записать визит' CTA conforming to Apple HIG", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { ScheduleMobileBottomBar } = await import("../components/schedule/mobile/ScheduleMobileBottomBar");

    const html = renderToStaticMarkup(
      React.createElement(ScheduleMobileBottomBar, {
        isVisible: true,
        onAction: () => {},
      })
    );

    expect(html).toContain('data-testid="schedule-mobile-add-btn"');
    expect(html).toContain("+ Записать визит");
    expect(html).toContain("schedule-mobile-primary-action-btn");
  });
});
