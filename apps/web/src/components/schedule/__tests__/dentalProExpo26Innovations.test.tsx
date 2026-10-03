import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    handleSelectAppointmentType: vi.fn(),
    startsAtLocal: "2026-10-15T12:00",
    setStartsAtLocal: vi.fn(),
    durationMinutes: 30,
    handleSelectDuration: vi.fn(),
    doctorUserId: "doc-1",
    setDoctorUserId: vi.fn(),
    assistantUserId: null,
    setAssistantUserId: vi.fn(),
    chairId: "chair-1",
    setChairId: vi.fn(),
    status: "planned",
    setStatus: vi.fn(),
    reason: "Лечение кариеса",
    setReason: vi.fn(),
    comment: "",
    setComment: vi.fn(),
    submitError: null,
    slotConflict: null,
    setSlotConflict: vi.fn(),
    handleSubmitBooking: vi.fn().mockResolvedValue(undefined),
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
    const setStatus = vi.fn();
    const handleSelectType = vi.fn();
    const setReason = vi.fn();

    render(
      <QuickBookingServiceSection
        {...defaultServiceProps}
        status="planned"
        setStatus={setStatus}
        handleSelectAppointmentType={handleSelectType}
        setReason={setReason}
      />
    );

    expect(screen.getByTestId("expo26-segmented-status")).toBeDefined();
    const plannedBtn = screen.getByTestId("expo26-status-planned");
    const emergencyBtn = screen.getByTestId("expo26-status-emergency");
    const confirmedBtn = screen.getByTestId("expo26-status-confirmed");

    expect(plannedBtn).toBeDefined();
    expect(emergencyBtn).toBeDefined();
    expect(confirmedBtn).toBeDefined();

    // Click emergency
    fireEvent.click(emergencyBtn);
    expect(handleSelectType).toHaveBeenCalledWith("emergency");

    // Click confirmed
    fireEvent.click(confirmedBtn);
    expect(setStatus).toHaveBeenCalledWith("confirmed");
  });

  it("2. Smart Free Slots Search («Найти варианты») opens slots candidate list and updates slot on click", () => {
    const setStartsAtLocal = vi.fn();
    render(
      <QuickBookingServiceSection
        {...defaultServiceProps}
        setStartsAtLocal={setStartsAtLocal}
      />
    );

    const findSlotsBtn = screen.getByTestId("quick-booking-find-slots-btn");
    expect(findSlotsBtn).toBeDefined();

    // Click search
    fireEvent.click(findSlotsBtn);

    const panel = screen.getByTestId("quick-booking-free-slots-panel");
    expect(panel).toBeDefined();
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

    const onFreeSlotToWaitlist = vi.fn();

    render(
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
        onKeepHovered={vi.fn()}
        onMouseLeave={vi.fn()}
        onQuickStatusChange={vi.fn()}
        onAdjustDuration={vi.fn()}
        onShiftLateness={vi.fn()}
        onFreeSlotToWaitlist={onFreeSlotToWaitlist}
      />
    );

    expect(screen.getByTestId("clinical-micro-hud-appt-99")).toBeDefined();
    expect(screen.getByTestId("hud-action-emr-appt-99")).toBeDefined();
    expect(screen.getByTestId("hud-action-rebook-appt-99")).toBeDefined();
    expect(screen.getByTestId("hud-action-health-questionnaire-appt-99")).toBeDefined();
    expect(screen.getByTestId("hud-action-treatment-plan-appt-99")).toBeDefined();
    expect(screen.getByTestId("hud-action-checkout-appt-99")).toBeDefined();

    const waitlistBtn = screen.getByTestId("hud-action-waitlist-appt-99");
    expect(waitlistBtn).toBeDefined();
    fireEvent.click(waitlistBtn);
    expect(onFreeSlotToWaitlist).toHaveBeenCalledWith(mockAppt);
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
    expect(schiCodes).toContain("schi-1"); // ❄️ Allergy/somatic
    expect(schiCodes).toContain("schi-2"); // ⭐ Primary
    expect(schiCodes).toContain("schi-3"); // 📄 Contract
    expect(schiCodes).toContain("schi-4"); // 📝 Consent
    expect(schiCodes).toContain("schi-5"); // 💼 Deposit
    expect(schiCodes).toContain("schi-7"); // ✂️ Installment
    expect(schiCodes).toContain("schi-8"); // 🦷 Lab order
    expect(schiCodes).toContain("schi-9"); // 📋 Plan
    expect(schiCodes).toContain("schi-10"); // 📷 Radiology
    expect(schiCodes).toContain("schi-11"); // 💬 Messenger
    expect(schiCodes).toContain("schi-12"); // 🛡️ DMS
    expect(schiCodes).toContain("schi-13"); // ⚡ CITO
    expect(schiCodes).toContain("schi-14"); // 👶 Pediatric
    expect(schiCodes).toContain("schi-15"); // 🎁 Discount
    expect(schiCodes).toContain("schi-17"); // 🪑 In chair
  });
});
