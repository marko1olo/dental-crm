import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentStatusChips } from "../appointmentModalStatus/AppointmentStatusChips";
import { AppointmentTechnicalBreakChips } from "../appointmentModalQuickReasons/AppointmentTechnicalBreakChips";
import { AppointmentModalFooter } from "../appointmentModalModules/AppointmentModalFooter";
import { AppointmentHoverHudStatusButtons } from "../appointmentStatus/AppointmentHoverHudStatusButtons";

describe("Schedule Modals, Chips & Hud Buttons Purity (Mandate 8am & 8ze)", () => {
  it("enforces canonical dente-btn-pill for appointment status chips with no circus hardcodes", () => {
    const html = renderToStaticMarkup(
      <AppointmentStatusChips
        status="planned"
        appointmentLabels={{} as any}
        onSelectStatus={vi.fn()}
      />
    );
    expect(html).toContain("dente-btn-pill");
    expect(html).toContain("modal-status-btn-planned");
    expect(html).not.toContain("!bg-amber-500");
    expect(html).not.toContain("!bg-emerald-600");
    expect(html).not.toContain("!bg-slate-700");
  });

  it("enforces canonical dente-btn-pill for technical break chips", () => {
    const html = renderToStaticMarkup(
      <AppointmentTechnicalBreakChips onApplyTechnicalBreakPreset={vi.fn()} />
    );
    expect(html).toContain("dente-btn-pill");
    expect(html).not.toContain("bg-amber-500/10");
    expect(html).not.toContain("border-amber-500/40");
  });

  it("enforces single primary CTA and canonical secondary button in AppointmentModalFooter", () => {
    const dummyState: any = {
      error: null,
      patientId: "pat-1",
      isInlineNewPatient: false,
      patientSearchQuery: "",
      newPatientFullName: "",
      newPatientPhone: "",
      isSoloDoctor: false,
      isSaving: false,
      collision: { isCitoOverbooking: false, hasCollision: false },
      isCito: false,
      reason: "Консультация",
      comment: "",
      handleSave: vi.fn(),
    };
    const html = renderToStaticMarkup(
      <AppointmentModalFooter
        props={{ onClose: vi.fn() } as any}
        state={dummyState}
        isNewAppointment={true}
      />
    );
    expect(html).toContain("appointment-modal-cta-save");
    expect(html).toContain("dente-btn-primary");
    expect(html).toContain("appointment-modal-cta-cancel");
    expect(html).toContain("dente-btn-secondary");
  });

  it("enforces neutral borders and canonical teal active states in AppointmentHoverHudStatusButtons", () => {
    const html = renderToStaticMarkup(
      <AppointmentHoverHudStatusButtons
        appointmentId="appt-42"
        displayStatus="planned"
        handleQuickStatusChange={vi.fn()}
        onCloseHover={vi.fn()}
      />
    );
    expect(html).toContain("timeline-hover-status-planned-appt-42");
    expect(html).not.toContain("bg-sky-500/10");
    expect(html).not.toContain("bg-violet-500/10");
    expect(html).not.toContain("bg-amber-500/10");
  });
});
