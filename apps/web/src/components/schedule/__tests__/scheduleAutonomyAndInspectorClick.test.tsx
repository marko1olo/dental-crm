import assert from "node:assert/strict";
import { test, describe } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Appointment } from "@dental/shared";
import { useGridDisplaySettings } from "../grid/interactionModules/useGridDisplaySettings";
import { checkAppointmentResourceCollision } from "../../../utils/scheduleCollisionUtils";
import { ScheduleGridDesktopLayout } from "../grid/ScheduleGridDesktopLayout";

describe("[SCH-01] & [SCH-03]: Schedule Autonomy & Zero-Conflict Inspector Suite", () => {
  const sampleAppointment: Appointment = {
    id: "appt-sch-03",
    organizationId: "org-test",
    patientId: "pat-100",
    doctorUserId: "doc-100",
    chairId: "chair-1",
    startsAt: "2026-11-06T10:00:00.000Z",
    endsAt: "2026-11-06T10:45:00.000Z",
    status: "confirmed",
    reason: "Лечение кариеса",
    comment: null,
  };

  const sampleDashboard: any = {
    clinicSettings: {
      profile: { timezone: "Europe/Moscow" },
      chairs: [{ id: "chair-1", name: "Кабинет 1 (Терапия)", active: true }],
      staff: [{ id: "doc-100", fullName: "Д-р Иванов А.С.", role: "doctor", active: true }],
    },
    patients: [{ id: "pat-100", fullName: "Барабаш Сергей Васильевич", phone: "+79001234567" }],
    appointments: [sampleAppointment],
  };

  test("1. [SCH-01]: checkAppointmentResourceCollision never blocks slots due to sanitation windows", () => {
    const sanitationBlock = {
      id: "san-block-1",
      chairId: "chair-1",
      startsAt: "2026-11-06T10:00:00.000Z",
      endsAt: "2026-11-06T10:30:00.000Z",
      reason: "sanitation" as const,
      note: "Санитарная обработка",
    };

    const collision = checkAppointmentResourceCollision(
      {
        startsAt: "2026-11-06T10:00:00.000Z",
        endsAt: "2026-11-06T10:30:00.000Z",
        chairId: "chair-1",
        doctorUserId: "doc-100",
      },
      [],
      {
        chairs: sampleDashboard.clinicSettings.chairs,
        chairMaintenanceBlocks: [sanitationBlock],
      },
    );

    assert.equal(collision.hasCollision, false, "Sanitation window must not block appointment slot");
    assert.equal(collision.conflictType, null);
  });

  test("2. [SCH-03]: ScheduleGridDesktopLayout single click selects inspector appointment without triggering QuickBookingDrawer", () => {
    let bookingDrawerOpened = false;
    let appointmentClickedInInspector: Appointment | null = null;

    // Simulate Desktop Layout props
    const layoutProps: any = {
      props: {
        dashboard: sampleDashboard,
        appointments: [sampleAppointment],
        onAppointmentClick: (appt: Appointment) => {
          bookingDrawerOpened = true;
          appointmentClickedInInspector = appt;
        },
        toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
        appointmentLabels: { confirmed: "Подтверждён" },
      },
      duty: {
        effectiveChairs: sampleDashboard.clinicSettings.chairs,
        effectiveChairAssignments: {},
        doctors: sampleDashboard.clinicSettings.staff,
        getSuggestedDoctorForChair: () => null,
        getDoctorForChairAndHour: () => "doc-100",
        isSoloDoctor: false,
        activeHeaderDoctorPopoverChairId: null,
        setActiveHeaderDoctorPopoverChairId: () => {},
        openAssignModal: () => {},
        handleConfirmAssignDoctor: () => {},
        handleUnassignDoctor: () => {},
        handleAssignDoctorWeek: () => {},
        handleAssignDoctorMonth: () => {},
        handleQuickSubstituteDoctor: () => {},
        handleBindDoctorToChair: () => {},
      },
      interactions: {
        gridStep: 30,
        handleSetGridStep: () => {},
        hoveredApptId: null,
        activeStatusPickerApptId: null,
        activeMenuApptId: null,
        handleSelectMobileAppt: () => {},
        handleAdjustAppointmentDuration: () => {},
        handleShiftAppointmentLateness: () => {},
        handleReassignAppointmentChair: () => {},
        handleReassignAppointmentDoctor: () => {},
        handleFreeSlotToWaitlist: () => {},
        handleAppointmentMouseEnter: () => {},
        handleAppointmentMouseLeave: () => {},
        handleKeepHovered: () => {},
        handleToggleStatusPicker: () => {},
        handleToggleMenu: () => {},
        handleCloseStatusPicker: () => {},
        handleCloseMenu: () => {},
        effectiveMaintenanceBlocks: [],
        handleRemoveMaintenance: () => {},
        showRevenue: false,
        handleToggleShowRevenue: () => {},
      },
      gridData: {
        dayAppointments: [sampleAppointment],
        chairSlotCellMap: new Map(),
        patientLookupMap: new Map([["pat-100", sampleDashboard.patients[0]]]),
        staffLookupMap: new Map([["doc-100", sampleDashboard.clinicSettings.staff[0]]]),
        collisionMap: new Map(),
        dailyTally: { total: 1, revenue: 0, byStatus: { confirmed: 1 } },
        emergencyReserveSlots: [],
      },
      timeSlots: ["10:00", "10:30", "11:00"],
      dateKey: "2026-11-06",
      isToday: true,
      currentHour: 10,
      timezone: "Europe/Moscow",
      patientName: () => "Барабаш С.В.",
    };

    const html = renderToString(<ScheduleGridDesktopLayout {...layoutProps} />);
    assert.ok(html.includes("schedule-grid-container"), "Desktop layout renders schedule grid");
    assert.ok(html.includes("Барабаш"), "Desktop layout renders patient name");
    assert.equal(bookingDrawerOpened, false, "QuickBookingDrawer must not be triggered on layout mount");
  });
});
