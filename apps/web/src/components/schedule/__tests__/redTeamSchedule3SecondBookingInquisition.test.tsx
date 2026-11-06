import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import { QuickAssistantSelector } from "../quickBookingService/QuickAssistantSelector";
import { SelectedPatientCard } from "../quickBookingPatient/SelectedPatientCard";
import { ScheduleMobileAgendaView } from "../mobile/ScheduleMobileAgendaView";
import type { Patient } from "@dental/shared";

const noop = () => {};

describe("Red Team Schedule & 3-Second Booking Inquisitor Suite (Mandates 8e, 8n, Apple HIG)", () => {
  it("1. Solo Doctor Sovereignty: Assistant selector is physically hidden when isSoloClinic or no assistants", () => {
    // Solo clinic with no assistants
    const htmlSolo = renderToString(
      <QuickAssistantSelector
        isSoloClinic={true}
        assistantUserId={null}
        setAssistantUserId={noop}
        assistants={[]}
      />
    );
    assert.strictEqual(htmlSolo, "");

    // Multi-chair clinic but no assistants rostered
    const htmlNoAssistants = renderToString(
      <QuickAssistantSelector
        isSoloClinic={false}
        assistantUserId={null}
        setAssistantUserId={noop}
        assistants={[]}
      />
    );
    assert.strictEqual(htmlNoAssistants, "");

    // Non-solo with assistants present: renders non-blocking selector with default solo option
    const htmlWithAssistants = renderToString(
      <QuickAssistantSelector
        isSoloClinic={false}
        assistantUserId={null}
        setAssistantUserId={noop}
        assistants={[{ id: "asst-1", fullName: "Иванова Мария (Ассистент)" }]}
      />
    );
    assert.ok(htmlWithAssistants.includes('data-testid="select-booking-assistant"'));
    assert.ok(htmlWithAssistants.includes("-- Без ассистента (соло-приём) --"));
  });

  it("2. Passive Allergy Safety: ⚠️ allergy warning renders ONLY when patient has real allergy (0px noise otherwise)", () => {
    const cleanPatient: Patient = {
      id: "pat-clean",
      fullName: "Чистов Павел Андреевич",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cleanHtml = renderToString(
      <SelectedPatientCard
        selectedPatient={cleanPatient}
        onClearPatient={noop}
        patientReliability={null}
        hasActivePatientVisit={false}
      />
    );
    // When no allergy: 0 pixels, no badge, zero visual noise
    assert.ok(!cleanHtml.includes('data-testid="selected-patient-allergy-alert"'));
    assert.ok(!cleanHtml.includes("Аллергия"));

    // Patient with real recorded allergy
    const allergyPatient: Patient = {
      id: "pat-allergy",
      fullName: "Аллергиков Иван Петрович",
      status: "active",
      allergies: "Лидокаин, Новокаин",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allergyHtml = renderToString(
      <SelectedPatientCard
        selectedPatient={allergyPatient}
        onClearPatient={noop}
        patientReliability={null}
        hasActivePatientVisit={false}
      />
    );
    // Passive warning with amber badge
    assert.ok(allergyHtml.includes('data-testid="selected-patient-allergy-alert"'));
    assert.ok(allergyHtml.includes("Лидокаин, Новокаин"));
  });

  it("3. Mobile Schedule Agenda View (Apple HIG): renders vertical timeline with dedicated floating action bar", () => {
    const mockDashboard = {
      clinicSettings: {
        profile: { timezone: "Europe/Moscow" },
        staff: [
          { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "doctor" },
        ],
        cabinets: [
          { id: "chair-1", name: "Кресло 1 (Терапия)" },
        ],
      },
      appointments: [],
      patients: [],
    };

    const html = renderToString(
      <ScheduleMobileAgendaView
        dashboard={mockDashboard as any}
        dateKey="2026-11-05"
        appointments={[]}
        onDateChange={noop}
        onSlotClick={noop}
        patientName={() => "Пациент"}
        formatTime={(t) => t}
        toDateTimeLocalValue={(t) => t}
      />
    );

    assert.ok(html.includes('data-testid="schedule-mobile-agenda-view"'));
    assert.ok(html.includes('data-testid="schedule-mobile-add-btn"'));
    assert.ok(html.includes("Новая запись"));
    // Strictly zero horizontal drift
    assert.ok(html.includes("overflow-x-clip"));
  });
});
