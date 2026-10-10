import { AlertTriangle, CalendarCheck, UserCheck } from "lucide-react";
import React, { useState } from "react";
import { specialtyLabels } from "../../../workspaceUiLabels";
import { showToast } from "../../GlobalToast";
import { resolveChairDutyDoctor } from "../chairRosterMath";
import {
  type DayFreeSlots,
  findDoctorFreeSlots,
} from "../doctorFreeSlotsEngine";
import { DEFAULT_SOLO_CHAIR, formatDoctorShortName } from "../ScheduleGrid";
import { SlotConflictModal } from "../SlotConflictModal";
import {
  QuickAppointmentTypeSelector,
  QuickPresetChipsBar,
  QuickSegmentedStatusHeader,
  QuickStatusSelector,
} from "./QuickPresetChipsBar";
import {
  QuickDurationAndSlotsSection,
  SelectedServicesSummaryCard,
} from "./SelectedServicesSummaryCard";
import type { QuickBookingServiceSectionProps } from "./types";

export * from "./QuickPresetChipsBar";
export * from "./quickServicePresets";
export * from "./SelectedServicesSummaryCard";
export * from "./types";

export function QuickBookingServiceSection({
  appointmentType,
  handleSelectAppointmentType,
  startsAtLocal,
  setStartsAtLocal,
  durationMinutes,
  handleSelectDuration,
  doctorUserId,
  setDoctorUserId,
  assistantUserId,
  setAssistantUserId,
  chairId,
  setChairId,
  status,
  setStatus,
  reason,
  setReason,
  comment,
  setComment,
  submitError,
  slotConflict,
  setSlotConflict,
  handleSubmitBooking,
  doctors,
  assistants,
  chairs,
  currentChair,
  dutyDoc,
  dutyDoctorHours,
  isSoloClinic,
  selectedPatientName,
  chairDoctorAssignments,
  dashboard,
  initialSlot,
}: QuickBookingServiceSectionProps) {
  const [isSearchingSlots, setIsSearchingSlots] = useState(false);
  const [freeSlotsList, setFreeSlotsList] = useState<DayFreeSlots[]>([]);

  const handleFindFreeSlots = () => {
    if (!dashboard) {
      showToast("Данные расписания загружаются...", "info");
      return;
    }
    const startDate = startsAtLocal
      ? startsAtLocal.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const found = findDoctorFreeSlots({
      doctorId: doctorUserId || undefined,
      startDate,
      horizonDays: 7,
      durationMinutes: durationMinutes || 30,
      appointments: dashboard.appointments || [],
      chairs: chairs.map((c) => ({ id: c.id, name: c.name, active: true })),
      clinicStartHour: 9,
      clinicEndHour: 20,
      stepMinutes: 15,
    });
    setFreeSlotsList(found);
    setIsSearchingSlots(true);
  };

  return (
    <>
      {/* 0. DentalPRO Expo26 Segmented Status Header [Плановый | Внеплановый (CITO) | Утверждённый] */}
      <QuickSegmentedStatusHeader
        appointmentType={appointmentType}
        handleSelectAppointmentType={handleSelectAppointmentType}
        status={status}
        setStatus={setStatus}
        reason={reason}
        setReason={setReason}
      />

      {/* DentalPRO Parity: Treatment Plan Stage Booking Banner */}
      <SelectedServicesSummaryCard initialSlot={initialSlot} />

      {/* Quick Appointment Type Selector */}
      <QuickAppointmentTypeSelector
        appointmentType={appointmentType}
        handleSelectAppointmentType={handleSelectAppointmentType}
      />

      {/* 2. Date, Time & Duration Section */}
      <QuickDurationAndSlotsSection
        startsAtLocal={startsAtLocal}
        setStartsAtLocal={setStartsAtLocal}
        durationMinutes={durationMinutes}
        handleSelectDuration={handleSelectDuration}
        chairId={chairId}
        setChairId={setChairId}
        doctorUserId={doctorUserId}
        setDoctorUserId={setDoctorUserId}
        chairDoctorAssignments={chairDoctorAssignments}
        isSearchingSlots={isSearchingSlots}
        setIsSearchingSlots={setIsSearchingSlots}
        freeSlotsList={freeSlotsList}
        handleFindFreeSlots={handleFindFreeSlots}
      />

      {/* 3. Resource Allocation: Doctor, Assistant & Chair */}
      <div className="space-y-3 pt-1">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <CalendarCheck size={14} className="text-[var(--teal)]" />
          <span>Кабинет и персонал *</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Chair Selector */}
          <div>
            <span className="text-xs font-semibold text-[var(--muted)] block mb-1">
              Кресло / Кабинет
            </span>
            <select
              value={chairId}
              onChange={(e) => {
                const nextChairId = e.target.value;
                setChairId(nextChairId);
                if (nextChairId) {
                  const targetChair =
                    chairs.find((c) => c.id === nextChairId) ||
                    (nextChairId === DEFAULT_SOLO_CHAIR.id
                      ? DEFAULT_SOLO_CHAIR
                      : null);
                  const duty = resolveChairDutyDoctor(
                    nextChairId,
                    startsAtLocal,
                    chairDoctorAssignments,
                    startsAtLocal ? startsAtLocal.slice(0, 10) : undefined,
                    null,
                    // biome-ignore lint/suspicious/noExplicitAny: preserved defaultDoctorId lookup
                    (targetChair as any)?.defaultDoctorId ||
                      (isSoloClinic && doctors[0] ? doctors[0].id : null),
                  );
                  if (duty.doctorId) {
                    setDoctorUserId(duty.doctorId);
                    const newDoc = doctors.find((d) => d.id === duty.doctorId);
                    if (newDoc) {
                      showToast(
                        `Дежурный врач: ${formatDoctorShortName(newDoc.fullName)} (${targetChair?.name || "Кресло"}, ${duty.shiftHours})`,
                        "info",
                        3000,
                      );
                    }
                  }
                }
              }}
              className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
              data-testid="select-booking-chair"
            >
              {chairs.length === 0 ? (
                <option value={DEFAULT_SOLO_CHAIR.id}>
                  {DEFAULT_SOLO_CHAIR.name} (Основное)
                </option>
              ) : (
                chairs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Doctor Selector */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-[var(--muted)]">
                Врач
              </span>
              {dutyDoc && dutyDoc.id !== doctorUserId && (
                <button
                  type="button"
                  onClick={() => setDoctorUserId(dutyDoc.id)}
                  className="text-[10px] text-[var(--teal)] font-bold hover:underline cursor-pointer"
                  title="Выбрать дежурного врача по расписанию кресла"
                >
                  Дежурный: {formatDoctorShortName(dutyDoc.fullName)}
                </button>
              )}
            </div>
            <select
              value={doctorUserId}
              onChange={(e) => setDoctorUserId(e.target.value)}
              className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
              data-testid="select-booking-doctor"
            >
              <option value="">-- Выберите врача --</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}{" "}
                  {d.specialties?.[0]
                    ? `(${specialtyLabels[d.specialties[0]] || d.specialties[0]})`
                    : ""}
                </option>
              ))}
            </select>
            {dutyDoc && (
              <div
                className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/20"
                data-testid="duty-doctor-badge"
              >
                <UserCheck size={13} className="shrink-0 text-[var(--teal)]" />
                <span>
                  Дежурный врач: {formatDoctorShortName(dutyDoc.fullName)} (
                  {dutyDoctorHours || "смена"})
                </span>
              </div>
            )}
            {dutyDoc &&
              doctorUserId &&
              dutyDoc.id &&
              doctorUserId !== dutyDoc.id && (
                <div
                  className="mt-1.5 p-2.5 rounded-xl text-xs bg-amber-500/10 text-amber-900 dark:text-amber-100 border border-amber-500/30 flex items-start gap-2"
                  data-testid="duty-doctor-override-note"
                >
                  <AlertTriangle
                    size={15}
                    className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <span className="font-semibold block">
                      На кресле «{currentChair?.name || "Кресло"}» дежурит{" "}
                      {formatDoctorShortName(dutyDoc.fullName)}. Запись создается
                      с подтверждением в штатном режиме.
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">
                      Запись не блокируется. При необходимости врач может
                      принять пациента в свободном кабинете.
                    </span>
                  </div>
                </div>
              )}
          </div>

          {/* Assistant Selector (Optional in Multi-Staff, Hidden in Solo) */}
          {!isSoloClinic && (
            <div className="sm:col-span-2">
              <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Ассистент{" "}
                <span className="font-normal text-[var(--muted)] lowercase">
                  (опционально, соло-приём без ассистента)
                </span>
              </label>
              <select
                value={assistantUserId || ""}
                onChange={(e) => setAssistantUserId(e.target.value || null)}
                className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--teal)]"
                data-testid="select-booking-assistant"
              >
                <option value="">-- Без ассистента (соло-приём) --</option>
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-[var(--muted)] block mt-0.5">
                Выбор ассистента строго опционален и не блокирует запись
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Status Selection */}
      <QuickStatusSelector status={status} setStatus={setStatus} />

      {/* 4. Reason & Comment */}
      <QuickPresetChipsBar
        reason={reason}
        setReason={setReason}
        comment={comment}
        setComment={setComment}
      />

      {/* Submit Error banner if any */}
      {submitError && (
        <div
          className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5"
          role="alert"
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Inline Slot Conflict Banner / Alternative Slots (Sin 6, Anti-Matryoshka) */}
      <SlotConflictModal
        isOpen={Boolean(slotConflict)}
        inline={true}
        onClose={() => setSlotConflict(null)}
        conflictMessage={slotConflict?.message}
        suggestedSlots={slotConflict?.suggestedSlots ?? []}
        patientName={selectedPatientName}
        doctorName={doctors.find((d) => d.id === doctorUserId)?.fullName}
        currentChairName={chairs.find((c) => c.id === chairId)?.name}
        alternativeChairs={chairs
          .filter((c) => c.id !== chairId)
          .map((c) => ({ id: c.id, name: c.name }))}
        onMoveToChair={(newChairId) => {
          setChairId(newChairId);
          const chName =
            chairs.find((c) => c.id === newChairId)?.name || newChairId;
          showToast(
            `Кресло изменено на «${chName}». Нажмите «Записать на прием».`,
            "success",
          );
          setSlotConflict(null);
        }}
        onShiftMinutes={(minutes) => {
          if (startsAtLocal) {
            const [datePart, timePart] = startsAtLocal.split("T");
            if (datePart && timePart) {
              const [hStr, mStr] = timePart.split(":");
              const totalMins =
                (Number(hStr) || 0) * 60 + (Number(mStr) || 0) + minutes;
              const newH = Math.floor(totalMins / 60) % 24;
              const newM = totalMins % 60;
              const newTimeStr = `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
              const newStart = `${datePart}T${newTimeStr}`;
              setStartsAtLocal(newStart);
              showToast(
                `Время сдвинуто на +${minutes} мин (${newTimeStr}). Нажмите «Записать на прием».`,
                "success",
              );
            }
          }
          setSlotConflict(null);
        }}
        onOverbook={() =>
          void handleSubmitBooking(undefined, { overbookOverride: true })
        }
        onSelectSlot={(slotTime) => {
          if (startsAtLocal) {
            const datePrefix = startsAtLocal.slice(0, 11);
            const newStart = `${datePrefix}${slotTime}`;
            setStartsAtLocal(newStart);
            showToast(
              `Время изменено на ${slotTime}. Нажмите «Записать на прием» для подтверждения.`,
              "success",
            );
          }
          setSlotConflict(null);
        }}
      />
    </>
  );
}
