import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChairScheduleQuickActions } from "../chairScheduleToolbar/ChairScheduleQuickActions";
import { QuickBookingDrawerFooter } from "../QuickBookingDrawerFooter";
import { AppointmentCardContextMenu } from "../AppointmentCardContextMenu";
import { GridAppointmentQuickActions } from "../GridAppointmentQuickActions";

describe("Schedule, Chair Grid & Quick Booking Button Primitives Inquisition (Red Team)", () => {
  const defaultToolbarProps: any = {
    chairs: [
      { id: "chair-1", name: "Кресло 1", active: true, color: "#0d9488" },
      { id: "chair-2", name: "Кресло 2", active: true, color: "#3b82f6" },
    ],
    isSoloDoctor: false,
    rawBranches: [],
    hasMultipleBranches: false,
    selectedBranchId: null,
    onSelectBranch: vi.fn(),
    effectiveSelectedChairId: null,
    handleToggleChairFilter: vi.fn(),
    chairDoctorAssignments: {},
    dashboard: { clinicSettings: { staff: [] } },
    activeShiftChairId: null,
    setActiveShiftChairId: vi.fn(),
    handleEditChair: vi.fn(),
    popoverRef: { current: null },
    doctors: [{ id: "doc-1", fullName: "Иванов И.И." }],
    popoverSelectedDocId: {},
    setPopoverSelectedDocId: vi.fn(),
    dateKey: "2026-10-16",
    onDateChange: vi.fn(),
    handleAssignShift: vi.fn(),
    handleUnassignShift: vi.fn(),
    handleDuplicateChair: vi.fn(),
    isSubstituteOpen: {},
    setIsSubstituteOpen: vi.fn(),
    handleQuickSubstituteDoctor: vi.fn(),
    handleOpenAddChair: vi.fn(),
    isShiftsMenuOpen: true, // open to inspect menuitems
    setIsShiftsMenuOpen: vi.fn(),
    shiftsMenuRef: { current: null },
    handleCopyTodayShiftsToCurrentWeek: vi.fn(),
    handleCopyTodayShiftsToMonth: vi.fn(),
    handleRotateChairShifts: vi.fn(),
    handleApplyDoctorPreferredChairs: vi.fn(),
    handleCopyWeekShiftsToNextWeek: vi.fn(),
    setIsDateRangeModalOpen: vi.fn(),
    handleClearAllDayShifts: vi.fn(),
    onOpenRosterModal: vi.fn(),
    setIsAddDoctorOpen: vi.fn(),
    onOpenDoctorFreeSlots: vi.fn(),
    onOpenPreventiveInspection: vi.fn(),
    preventiveInspectionCount: 2,
  };

  it("1. ChairScheduleQuickActions enforces .secondary-button, .primary-button and clinical tokens", () => {
    const html = renderToStaticMarkup(<ChairScheduleQuickActions {...defaultToolbarProps} />);

    // Shifts menu trigger
    expect(html).toContain('data-testid="btn-chair-shifts-menu-trigger"');
    expect(html).toContain('class="secondary-button"');
    expect(html).toContain("var(--teal)");

    // Primary CTA "+ Кресло"
    expect(html).toContain('data-testid="btn-add-chair-header"');
    expect(html).toContain('class="primary-button"');

    // Menuitems in dropdown have consistent 32px desktop / 44px touch height
    expect(html).toContain('data-testid="btn-copy-chair-week-current"');
    expect(html).toContain("h-8 min-h-[32px]");
    expect(html).toContain("touch:min-h-[44px]");
    expect(html).toContain("var(--teal)");
  });

  it("2. QuickBookingDrawerFooter enforces Floating Bottom Bar with safe areas and canonical buttons", () => {
    const html = renderToStaticMarkup(
      <QuickBookingDrawerFooter
        isSubmitting={false}
        hasCollision={false}
        isDirty={true}
        onSubmit={vi.fn()}
        onRequestClose={vi.fn()}
        onDiscardDraft={vi.fn()}
        onCopyConfirmation={vi.fn()}
      />
    );

    // Floating bar with safe-area
    expect(html).toContain("sticky bottom-0");
    expect(html).toContain("env(safe-area-inset-bottom");
    expect(html).toContain("backdrop-blur-md");

    // Primary button with «Записать на приём»
    expect(html).toContain('data-testid="quick-drawer-save-btn"');
    expect(html).toContain("primary-button");
    expect(html).toContain("Записать на приём");

    // Cancel button
    expect(html).toContain('data-testid="quick-booking-cancel-btn"');
    expect(html).toContain("secondary-button");
    expect(html).toContain("Отмена (Esc)");

    // Discard button
    expect(html).toContain('data-testid="quick-booking-discard-draft-btn"');
    expect(html).toContain("danger-button");

    // Copy confirmation button
    expect(html).toContain('data-testid="quick-booking-copy-confirmation-btn"');
    expect(html).toContain("secondary-button");
    expect(html).toContain("var(--teal)");
  });

  it("3. AppointmentCardContextMenu enforces .icon-button trigger and consistent menuitem density", () => {
    const defaultAppointment: any = {
      id: "appt-1",
      startsAt: "2026-10-16T10:00:00Z",
      status: "planned",
      reason: "Консультация",
    };

    const html = renderToStaticMarkup(
      <AppointmentCardContextMenu
        appointment={defaultAppointment}
        dashboard={{ clinicSettings: { staff: [] } } as any}
        appointmentSuggestions={[]}
        appointmentPatient={{ id: "pat-1", fullName: "Сидоров С.С.", phone: "+79991234567" }}
        appointmentPatientName="Сидоров С.С."
        appointmentDoctor={{ fullName: "Д-р Иванов" }}
        isQuickStatusUpdating={false}
        openScheduleSuggestion={vi.fn()}
        handleShiftAppointmentTime={vi.fn()}
        handleQuickStatusChange={vi.fn()}
        repeatAppointment={vi.fn()}
        openAppointmentEditor={vi.fn()}
      />
    );

    // Trigger is canonical .icon-button
    expect(html).toContain('data-testid="appointment-context-menu-btn"');
    expect(html).toContain("icon-button");
    expect(html).toContain("var(--teal)");
  });

  it("4. GridAppointmentQuickActions enforces clinical design tokens without hardcoded colors", () => {
    const plannedAppt: any = {
      id: "appt-100",
      status: "planned",
    };

    const html = renderToStaticMarkup(
      <GridAppointmentQuickActions
        appointment={plannedAppt}
        pName="Иванов И."
        isHovered={true}
        onQuickStatusChange={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="dente-realtime-bar-appt-100"');
    expect(html).toContain('data-testid="dente-quick-arrived-appt-100"');
    expect(html).toContain('data-testid="dente-quick-start-treatment-appt-100"');
    expect(html).toContain("var(--teal)");
  });
});
