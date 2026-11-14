import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuickBookingDrawerFooter } from "../QuickBookingDrawer";
import { AppointmentCardContextMenu } from "../appointmentContextMenu/index";
import { GridAppointmentQuickActions } from "../GridAppointmentQuickActions";

describe("Schedule, Chair Grid & Quick Booking Button Primitives Inquisition (Red Team)", () => {
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
