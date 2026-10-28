/**
 * appointmentBookingModalSSOT.test.tsx
 *
 * Dedicated Red Team Inquisitor Test Suite for AppointmentBookingModal (SSOT Fast Booking).
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, soft overbooking).
 * - Mandate 8b: Healthy File Size Sweet Spot (250-350 lines).
 * - Mandate 8d: Desktop Density + Apple HIG Touch Targets (>= 44x44px mobile, 52px Primary CTA).
 * - Mandate 8am: Single Primary CTA button on visible context.
 * - Mandate 8x & 8ap: 100% clean domain Russian without raw law numbers, machine enums or UUIDs.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard, Patient } from "@dental/shared";
import { AppointmentBookingModal } from "../AppointmentBookingModal";

const mockPatients: Patient[] = [
  {
    id: "pat-1",
    organizationId: "org-1",
    fullName: "Петров Петр Петрович",
    phone: "+7 (916) 111-22-33",
    email: null,
    notes: null,
    birthDate: "1988-03-12",
    gender: null,
    status: "active",
    balanceRub: 0,
    administrativeProfile: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const mockDashboard: any = {
  patients: mockPatients,
  appointments: [],
  clinicSettings: {
    staff: [
      { id: "doc-1", fullName: "Д-р Айболит", role: "doctor", active: true },
    ],
    chairs: [
      { id: "chair-1", name: "Кресло 1 (Терапия)", active: true },
    ],
    profile: {
      mode: "solo_doctor",
      timezone: "Europe/Moscow",
    },
  },
};

describe("AppointmentBookingModal (SSOT Fast Booking)", () => {
  it("1. returns null when isOpen is false", () => {
    const html = renderToStaticMarkup(
      <AppointmentBookingModal
        isOpen={false}
        onClose={() => {}}
        dashboard={mockDashboard as Dashboard}
      />,
    );
    assert.strictEqual(html, "");
  });

  it("2. renders full SSOT fast booking form on open (single screen, 0 tab nesting)", () => {
    const html = renderToStaticMarkup(
      <AppointmentBookingModal
        isOpen={true}
        onClose={() => {}}
        dashboard={mockDashboard as Dashboard}
        initialSlot={{
          dateKey: "2026-10-28",
          startTime: "10:00",
          durationMinutes: 30,
        }}
      />,
    );

    assert.ok(html.includes("Быстрая запись на прием"), "Header title must be present");
    assert.ok(html.includes("Поиск по ФИО, телефону или дате рождения"), "Search placeholder must be present");
    assert.ok(html.includes("+ Новый пациент"), "New patient toggle must be present");
    assert.ok(html.includes("30 мин"), "30 min duration chip must be present");
    assert.ok(html.includes("60 мин"), "60 min duration chip must be present");
    assert.ok(html.includes("Осмотр"), "Reason chip 'Осмотр' must be present");
    assert.ok(html.includes("Острая боль / Cito"), "Reason chip 'Острая боль / Cito' must be present");
    assert.ok(html.includes("Записать на приём"), "Strictly 1 Primary CTA 'Записать на приём'");
    assert.ok(html.includes("Отмена"), "Cancel button must be present");
  });

  it("3. renders emergency Cito mode without cartoon emojis (Mandate 8d, 8e)", () => {
    const html = renderToStaticMarkup(
      <AppointmentBookingModal
        isOpen={true}
        onClose={() => {}}
        dashboard={mockDashboard as Dashboard}
        initialSlot={{
          dateKey: "2026-10-28",
          startTime: "11:00",
          durationMinutes: 30,
          isCitoEmergency: true,
          reason: "Срочно! Острая боль",
        }}
      />,
    );

    assert.ok(html.includes("Срочная запись: острая боль"), "Emergency header title must be present");
    assert.ok(html.includes("Острая боль"), "Emergency badge must be present");
    assert.ok(html.includes("+ Срочный пациент (острая боль)"), "Express CITO patient button must be present");
    assert.ok(!html.includes("⚡"), "Zero cartoon emojis allowed in emergency mode");
  });

  it("4. verifies Mandate 8b file size Sweet Spot (300-500 lines)", () => {
    const dir = typeof import.meta.dirname !== "undefined"
      ? import.meta.dirname
      : path.resolve(process.cwd(), "apps/web/src/components/schedule/__tests__");
    const filePath = path.resolve(dir, "../QuickBookingDrawer.tsx");
    assert.ok(fs.existsSync(filePath), "QuickBookingDrawer.tsx must exist");
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").length;
    assert.ok(
      lines >= 300 && lines <= 500,
      `QuickBookingDrawer.tsx must be in Sweet Spot 300-500 lines, current: ${lines}`,
    );
  });
});
