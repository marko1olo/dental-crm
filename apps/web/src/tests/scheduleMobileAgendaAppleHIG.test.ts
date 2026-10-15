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
});
