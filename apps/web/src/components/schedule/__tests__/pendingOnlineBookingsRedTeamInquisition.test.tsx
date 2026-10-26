import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { PendingOnlineBookingsModal } from "../PendingOnlineBookingsModal";
import { PendingOnlineBookingCard } from "../PendingOnlineBookingCard";
import type { Appointment } from "@dental/shared";

describe("PendingOnlineBookingsModal Red Team Inquisition (Mandates 8e, 8b, Apple HIG)", () => {
  const mockBooking: Appointment = {
    id: "online-booking-1",
    organizationId: "org-1",
    patientId: "pat-100",
    doctorUserId: "doc-1",
    chairId: "chair-1",
    startsAt: "2026-10-26T10:00:00Z",
    endsAt: "2026-10-26T10:30:00Z",
    status: "planned",
    reason: "Осмотр и чистка",
    comment: "Пациент: Иванов Иван Иванович, +7 999 123-45-67",
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    pendingBookings: [mockBooking],
    dashboard: {
      clinicSettings: {
        staff: [{ id: "doc-1", fullName: "Д-р Петров П.П.", role: "doctor" }],
        chairs: [{ id: "chair-1", name: "Терапевтический кабинет №1" }],
      },
      patients: [{ id: "pat-100", fullName: "Иванов Иван Иванович", phone: "+7 (999) 123-45-67" }],
    } as any,
    onSelectAppointment: vi.fn(),
  };

  it("1. Zero disabled buttons: confirmation and detail buttons NEVER contain disabled={true}", () => {
    const html = renderToStaticMarkup(<PendingOnlineBookingsModal {...defaultProps} />);

    expect(html).toContain('data-testid="confirm-online-booking-btn-online-booking-1"');
    expect(html).toContain('data-test-confirm="slot"');
    expect(html).not.toMatch(/disabled=""|disabled(?!=false)/);
  });

  it("2. Touch ergonomics: action buttons enforce pointer-coarse:min-h-[44px] per Apple HIG", () => {
    const html = renderToStaticMarkup(
      <PendingOnlineBookingCard
        booking={mockBooking}
        dashboard={defaultProps.dashboard}
        isConfirming={false}
        onConfirm={vi.fn()}
        onSelectAppointment={vi.fn()}
      />
    );

    expect(html).toContain("pointer-coarse:min-h-[44px]");
    expect(html).toContain("Подтвердить и занять слот");
    expect(html).toContain("Детали записи");
  });

  it("3. Non-blocking state: confirming state sets aria-busy without disabled lock", () => {
    const htmlBusy = renderToStaticMarkup(
      <PendingOnlineBookingCard
        booking={mockBooking}
        dashboard={defaultProps.dashboard}
        isConfirming={true}
        onConfirm={vi.fn()}
        onSelectAppointment={vi.fn()}
      />
    );

    expect(htmlBusy).toContain('aria-busy="true"');
    expect(htmlBusy).toContain("animate-spin");
    expect(htmlBusy).not.toContain("disabled");
  });

  it("4. Mandate 8b Anti-monolith verification: all modules are strictly <= 120 lines", () => {
    const modalPath = path.resolve(__dirname, "../PendingOnlineBookingsModal.tsx");
    const cardPath = path.resolve(__dirname, "../PendingOnlineBookingCard.tsx");
    const helpersPath = path.resolve(__dirname, "../pendingOnlineBookingsHelpers.ts");
    const emptyStatePath = path.resolve(__dirname, "../PendingOnlineBookingsEmptyState.tsx");

    const modalLines = fs.readFileSync(modalPath, "utf-8").split("\n").length;
    const cardLines = fs.readFileSync(cardPath, "utf-8").split("\n").length;
    const helpersLines = fs.readFileSync(helpersPath, "utf-8").split("\n").length;
    const emptyLines = fs.readFileSync(emptyStatePath, "utf-8").split("\n").length;

    expect(modalLines).toBeLessThanOrEqual(120);
    expect(cardLines).toBeLessThanOrEqual(120);
    expect(helpersLines).toBeLessThanOrEqual(120);
    expect(emptyLines).toBeLessThanOrEqual(120);
  });
});
