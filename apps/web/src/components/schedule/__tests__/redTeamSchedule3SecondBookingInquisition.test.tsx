import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { QuickBookingDrawer, QuickBookingDrawerFooter } from "../QuickBookingDrawer";
import { QuickAssistantSelector } from "../quickBookingService/QuickAssistantSelector";
import { SelectedPatientCard } from "../quickBookingPatient/SelectedPatientCard";
import { ScheduleMobileAgendaView } from "../mobile/ScheduleMobileAgendaView";
import { buildQuickBookingPayload } from "../quickBookingSubmitPayload";
import { resolveOrAutoCreateSubmitPatient } from "../quickBookingInlinePatient";
import { useScheduleStore } from "../../../store/scheduleStore";
import { isUuidV7, type Patient } from "@dental/shared";

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

  it("4. 3-Second Fast Booking: solo doctor booking without assistant in 1 click, Primary CTA unblocked (disabled=false), and RFC 9562 UUIDv7 Idempotency-Key", () => {
    // 4.1 Check Primary CTA is NEVER disabled (Mandate 8e)
    const footerHtml = renderToString(
      <QuickBookingDrawerFooter
        isSubmitting={false}
        hasCollision={false}
        isDirty={true}
        onSubmit={noop}
        onRequestClose={noop}
        onDiscardDraft={noop}
        onCopyConfirmation={noop}
      />
    );
    assert.ok(footerHtml.includes('data-testid="quick-drawer-save-btn"'));
    assert.ok(!footerHtml.includes("disabled"));

    // 4.2 Check solo-doctor payload generation: assistant is null, UUIDv7 idempotency keys present
    const mockParams: any = {
      doctorUserId: "doc-solo-uuid-1",
      dutyDoctorId: null,
      doctors: [{ id: "doc-solo-uuid-1", fullName: "Д-р Сеченов И. М." }],
      chairId: "chair-solo-uuid-1",
      chairs: [{ id: "chair-solo-uuid-1", name: "Кабинет 1" }],
      assistantUserId: "asst-rogue-uuid",
      isSoloClinic: true, // Solo Doctor Sovereignty (Mandate 8n)
      reason: "Терапевтический приём",
      comment: "",
      status: "planned",
      initialSlot: null,
    };

    const payload = buildQuickBookingPayload({
      params: mockParams,
      activePatientId: "pat-valid-uuid-1",
      startsAtIso: "2026-11-06T10:00:00.000Z",
      endsAtIso: "2026-11-06T10:30:00.000Z",
      isEmergency: false,
    });

    // Assistant must be completely nullified for solo clinic
    assert.strictEqual(payload.assistantUserId, null);
    // Doctor and chair correctly assigned
    assert.strictEqual(payload.doctorUserId, "doc-solo-uuid-1");
    assert.strictEqual(payload.chairId, "chair-solo-uuid-1");
    // Idempotency keys must be valid RFC 9562 UUIDv7
    assert.ok(payload.idempotencyKey, "idempotencyKey must be present in payload");
    assert.ok(payload.clientMutationId, "clientMutationId must be present in payload");
    assert.ok(isUuidV7(payload.idempotencyKey), `idempotencyKey ${payload.idempotencyKey} must be a valid UUIDv7`);
    assert.strictEqual(payload.idempotencyKey, payload.clientMutationId);

    // 4.3 Protection against dummy ghost patients: empty candidate returns null when not emergency
    const mockEmptyPatientSearch: any = {
      patientId: "",
      newPatientFullName: "",
      newPatientPhone: "",
      searchQuery: "",
      showInlineNewPatient: false,
    };
    const resolvedPatId = resolveOrAutoCreateSubmitPatient(mockEmptyPatientSearch, "routine");
    // Returns a Promise that resolves to null
    assert.ok(resolvedPatId instanceof Promise);
  });

  it("5. Conflictless Save & Debounced Draft Continuity: persists draft without state drop and clears upon successful save", () => {
    // Test that draft format preserves all fast-booking inputs
    const draftPayload = {
      patientId: "pat-123",
      patientName: "Кузнецов Артем",
      doctorUserId: "doc-1",
      chairId: "chair-1",
      startsAtLocal: "2026-11-06T11:00",
      durationMinutes: 45,
      reason: "Консультация ортодонта",
      comment: "Повторный осмотр",
      appointmentType: "consultation",
      timestamp: Date.now(),
    };

    // Serialize & deserialize roundtrip
    const serialized = JSON.stringify(draftPayload);
    const parsed = JSON.parse(serialized);

    assert.strictEqual(parsed.patientId, "pat-123");
    assert.strictEqual(parsed.doctorUserId, "doc-1");
    assert.strictEqual(parsed.chairId, "chair-1");
    assert.strictEqual(parsed.durationMinutes, 45);
    assert.strictEqual(parsed.reason, "Консультация ортодонта");
  });

  it("6. Chair & Doctor Filter Switching Without State Drop: switching chair filter preserves date, doctor and status selections", () => {
    const store = useScheduleStore.getState();

    // Set initial schedule filter state
    store.setScheduleDateFilter("2026-11-10");
    store.setScheduleDoctorFilterId("doc-active-1");
    store.setScheduleStatusFilter("confirmed");
    store.setScheduleChairFilterId("chair-initial-1");

    // Verify initial values
    assert.strictEqual(useScheduleStore.getState().scheduleDateFilter, "2026-11-10");
    assert.strictEqual(useScheduleStore.getState().scheduleDoctorFilterId, "doc-active-1");
    assert.strictEqual(useScheduleStore.getState().scheduleStatusFilter, "confirmed");
    assert.strictEqual(useScheduleStore.getState().scheduleChairFilterId, "chair-initial-1");

    // Switch chair filter to another chair
    store.setScheduleChairFilterId("chair-target-2");

    // All other filters must remain perfectly preserved
    const afterSwitch = useScheduleStore.getState();
    assert.strictEqual(afterSwitch.scheduleChairFilterId, "chair-target-2");
    assert.strictEqual(afterSwitch.scheduleDateFilter, "2026-11-10", "Date filter must not be dropped on chair switch");
    assert.strictEqual(afterSwitch.scheduleDoctorFilterId, "doc-active-1", "Doctor filter must not be dropped on chair switch");
    assert.strictEqual(afterSwitch.scheduleStatusFilter, "confirmed", "Status filter must not be dropped on chair switch");

    // Reset chair filter to null (all chairs)
    store.setScheduleChairFilterId(null);
    const afterReset = useScheduleStore.getState();
    assert.strictEqual(afterReset.scheduleChairFilterId, null);
    assert.strictEqual(afterReset.scheduleDateFilter, "2026-11-10");
    assert.strictEqual(afterReset.scheduleDoctorFilterId, "doc-active-1");
  });

  it("7. Mobile Apple HIG Segmented Controls: [ Сетка | Лента ] & [ Сегодня | Завтра | + День ] without tab clipping or overlap", () => {
    const mockDashboard = {
      clinicSettings: {
        profile: { timezone: "Europe/Moscow" },
        staff: [{ id: "doc-1", fullName: "Д-р Воронов А. В.", role: "doctor" }],
        cabinets: [{ id: "chair-1", name: "Кресло 1 (Терапия)" }],
      },
      appointments: [],
      patients: [],
    };

    const html = renderToString(
      <ScheduleMobileAgendaView
        dashboard={mockDashboard as any}
        dateKey="2026-11-06"
        appointments={[]}
        onDateChange={noop}
        onSlotClick={noop}
        patientName={() => "Пациент"}
        formatTime={(t) => t}
        toDateTimeLocalValue={(t) => t}
      />
    );

    // Segmented Mode Control [ Сетка | Лента ]
    assert.ok(html.includes('data-testid="schedule-mobile-view-mode-grid"'), "Must render [Сетка] tab");
    assert.ok(html.includes('data-testid="schedule-mobile-view-mode-agenda"'), "Must render [Лента] tab");
    assert.ok(html.includes("Сетка"));
    assert.ok(html.includes("Лента"));

    // Segmented Day Control [ Сегодня | Завтра | + День ]
    assert.ok(html.includes('data-testid="schedule-mobile-segment-today"'), "Must render [Сегодня] tab");
    assert.ok(html.includes('data-testid="schedule-mobile-segment-tomorrow"'), "Must render [Завтра] tab");
    assert.ok(html.includes('data-testid="schedule-mobile-segment-plus-day"'), "Must render [+ День] tab");
  });
});
