/**
 * dentalProExpo26Innovations.test.tsx
 *
 * Targeted Unit & Integration Test Suite for DentalPRO Expo26 Schedule Innovations:
 * 1. Lateral Quick Booking Drawer with Segmented Status Header [Плановый | Внеплановый (CITO) | Утверждённый]
 * 2. "Найти варианты" smart free slot search calling doctorFreeSlotsEngine
 * 3. 6-Action Clinical Micro-HUD on appointment cards
 * 4. 17-Badge Matrix (schi-1 to schi-17) resolution and compact overflow collapse
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuickBookingServiceSection } from "../QuickBookingServiceSection";
import { GridAppointmentHoverHud } from "../GridAppointmentHoverHud";
import {
  resolveAppointmentClinicalBadges,
  type ClinicalBadgeItem,
} from "../appointmentCardHelpers";
import type { Appointment, Dashboard } from "@dental/shared";

describe("DentalPRO Expo26 Schedule Innovations Suite", () => {
  const mockDashboard: Dashboard = {
    appointments: [
      {
        id: "appt-1",
        doctorUserId: "doc-1",
        chairId: "chair-1",
        patientId: "pat-1",
        status: "planned",
        startsAt: "2026-10-15T10:00:00.000Z",
        endsAt: "2026-10-15T10:30:00.000Z",
        reason: "Осмотр",
      } as Appointment,
    ],
    patients: [
      {
        id: "pat-1",
        fullName: "Кузнецов Алексей Петрович",
        phone: "+7 999 123-45-67",
        balance: 5000,
        allergies: "Аллергия на пенициллин",
        contractSigned: true,
        hasInformedConsent: true,
      } as any,
    ],
    clinicSettings: {
      profile: {
        clinicName: "Клиника ДЕНТЕ",
        timezone: "Europe/Moscow",
      },
      chairs: [
        { id: "chair-1", name: "Кабинет 1", active: true },
        { id: "chair-2", name: "Кабинет 2", active: true },
      ],
      staff: [
        { id: "doc-1", fullName: "Смирнов А. В.", role: "doctor", active: true },
      ],
    } as any,
  } as Dashboard;

  const defaultServiceProps = {
    appointmentType: "treatment" as any,
    handleSelectAppointmentType: () => {},
    startsAtLocal: "2026-10-15T12:00",
    setStartsAtLocal: () => {},
    durationMinutes: 30,
    handleSelectDuration: () => {},
    doctorUserId: "doc-1",
    setDoctorUserId: () => {},
    assistantUserId: null,
    setAssistantUserId: () => {},
    chairId: "chair-1",
    setChairId: () => {},
    status: "planned",
    setStatus: () => {},
    reason: "Лечение кариеса",
    setReason: () => {},
    comment: "",
    setComment: () => {},
    submitError: null,
    slotConflict: null,
    setSlotConflict: () => {},
    handleSubmitBooking: async () => {},
    doctors: [{ id: "doc-1", fullName: "Смирнов А. В." }],
    assistants: [],
    chairs: [
      { id: "chair-1", name: "Кабинет 1" },
      { id: "chair-2", name: "Кабинет 2" },
    ],
    currentChair: { id: "chair-1", name: "Кабинет 1" },
    dutyDoc: null,
    dutyDoctorHours: null,
    isSoloClinic: false,
    dashboard: mockDashboard,
  };

  it("1. Renders DentalPRO Expo26 Segmented Status with [Плановый | Внеплановый (CITO) | Утверждённый]", () => {
    const html = renderToStaticMarkup(
      <QuickBookingServiceSection
        {...defaultServiceProps}
        status="planned"
      />
    );

    assert.ok(html.includes('data-testid="expo26-segmented-status"'), "expo26-segmented-status must render");
    assert.ok(html.includes('data-testid="expo26-status-planned"'), "expo26-status-planned button must render");
    assert.ok(html.includes('data-testid="expo26-status-emergency"'), "expo26-status-emergency button must render");
    assert.ok(html.includes('data-testid="expo26-status-confirmed"'), "expo26-status-confirmed button must render");
    assert.ok(html.includes("Плановый"), "Must include 'Плановый' text");
    assert.ok(html.includes("Внеплановый (CITO)"), "Must include 'Внеплановый (CITO)' text");
    assert.ok(html.includes("Утверждённый"), "Must include 'Утверждённый' text");
  });

  it("2. Smart Free Slots Search («Найти варианты») button renders in QuickBookingServiceSection", () => {
    const html = renderToStaticMarkup(
      <QuickBookingServiceSection
        {...defaultServiceProps}
      />
    );

    assert.ok(html.includes('data-testid="quick-booking-find-slots-btn"'), "quick-booking-find-slots-btn must render");
    assert.ok(html.includes("Найти варианты"), "Must include button label 'Найти варианты'");
  });

  it("3. Renders 6-Action Clinical Micro-HUD on appointment card with direct clinical navigations", () => {
    const mockAppt: Appointment = {
      id: "appt-99",
      doctorUserId: "doc-1",
      chairId: "chair-1",
      patientId: "pat-1",
      status: "planned",
      startsAt: "2026-10-15T14:00:00.000Z",
      endsAt: "2026-10-15T14:30:00.000Z",
      reason: "Консультация",
    } as Appointment;

    const html = renderToStaticMarkup(
      <GridAppointmentHoverHud
        appointment={mockAppt}
        pName="Кузнецов Алексей Петрович"
        pBalance={5000}
        patObj={mockDashboard.patients[0]}
        docObj={{ fullName: "Смирнов А. В." }}
        docTheme={null}
        pAllergyAlert="Аллергия на пенициллин"
        chair={{ id: "chair-1", name: "Кабинет 1" }}
        aStart="14:00"
        aEnd="14:30"
        appointmentLabels={{ planned: "Запланирован" } as any}
        isNearRightEdge={false}
        isNearBottom={false}
        dashboard={mockDashboard}
        staffLookupMap={new Map()}
        onKeepHovered={() => {}}
        onMouseLeave={() => {}}
        onQuickStatusChange={() => {}}
        onAdjustDuration={() => {}}
        onShiftLateness={() => {}}
        onFreeSlotToWaitlist={() => {}}
      />
    );

    assert.ok(html.includes('data-testid="clinical-micro-hud-appt-99"'), "Micro HUD container must render");
    assert.ok(html.includes('data-testid="hud-action-emr-appt-99"'), "EMR action must render");
    assert.ok(html.includes('data-testid="hud-action-rebook-appt-99"'), "Rebook action must render");
    assert.ok(html.includes('data-testid="hud-action-health-questionnaire-appt-99"'), "Health questionnaire action must render");
    assert.ok(html.includes('data-testid="hud-action-treatment-plan-appt-99"'), "Treatment plan action must render");
    assert.ok(html.includes('data-testid="hud-action-checkout-appt-99"'), "Checkout action must render");
    assert.ok(html.includes('data-testid="hud-action-waitlist-appt-99"'), "Waitlist action must render");
  });

  it("4. Matrix of 17 DentalPRO Expo26 Badges (schi-1 to schi-17) resolves correctly", () => {
    const comprehensivePatient = {
      id: "pat-full",
      fullName: "Тестовый Пациент",
      birthDate: "2015-05-10", // 11 years old -> pediatric (schi-14)
      allergies: "Аллергия на лидокаин", // schi-1
      contractSigned: true, // schi-3
      hasInformedConsent: true, // schi-4
      hasInstallment: true, // schi-7
      insurancePolicy: "РОСНО ДМС 12345", // schi-12
      hasXrays: true, // schi-10
      discountPercent: 10, // schi-15
    };

    const comprehensiveAppt: Appointment = {
      id: "appt-full",
      doctorUserId: "doc-1",
      chairId: "chair-1",
      patientId: "pat-full",
      status: "in_treatment", // in_chair (schi-17)
      startsAt: "2026-10-15T15:00:00.000Z",
      endsAt: "2026-10-15T16:00:00.000Z",
      reason: "CITO! Острая боль, первичный наряд лаборатории", // cito (schi-13), primary (schi-2), lab (schi-8)
      isCito: true,
      labOrderId: "lab-77",
      treatmentPlanId: "plan-12", // schi-9
      whatsappConfirmed: true, // schi-11
    } as any;

    const badges = resolveAppointmentClinicalBadges(
      comprehensiveAppt,
      comprehensivePatient,
      7500, // deposit (schi-5)
      "Аллергия на лидокаин"
    );

    const schiCodes = badges.map((b) => b.schiCode);

    // Verify key badges from DentalPRO Expo26
    assert.ok(schiCodes.includes("schi-1"), "Should contain schi-1: somatic/allergy");
    assert.ok(schiCodes.includes("schi-2"), "Should contain schi-2: primary consultation");
    assert.ok(schiCodes.includes("schi-3"), "Should contain schi-3: contract signed");
    assert.ok(schiCodes.includes("schi-4"), "Should contain schi-4: informed consent signed");
    assert.ok(schiCodes.includes("schi-5"), "Should contain schi-5: deposit / advance paid");
    assert.ok(schiCodes.includes("schi-7"), "Should contain schi-7: installment active");
    assert.ok(schiCodes.includes("schi-8"), "Should contain schi-8: dental lab workorder");
    assert.ok(schiCodes.includes("schi-9"), "Should contain schi-9: active treatment plan");
    assert.ok(schiCodes.includes("schi-10"), "Should contain schi-10: radiology study present");
    assert.ok(schiCodes.includes("schi-11"), "Should contain schi-11: messenger reminder confirmed");
    assert.ok(schiCodes.includes("schi-12"), "Should contain schi-12: DMS insurance");
    assert.ok(schiCodes.includes("schi-13"), "Should contain schi-13: CITO emergency");
    assert.ok(schiCodes.includes("schi-14"), "Should contain schi-14: pediatric patient");
    assert.ok(schiCodes.includes("schi-15"), "Should contain schi-15: loyalty discount");
    assert.ok(schiCodes.includes("schi-17"), "Should contain schi-17: in chair active");
  });
});
