import type { Appointment, Dashboard } from "@dental/shared";
import {
  AlertTriangle,
  Clock,
  UserCheck,
  Zap,
} from "lucide-react";
import React from "react";
import { safeLocalStorageGetJson } from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";
import type { ResourceCollisionResult } from "../../utils/scheduleCollisionUtils";
import { resolveChairDutyDoctor } from "./QuickBookingDrawer";
import {
  type ChairDoctorShiftAssignment,
  DEFAULT_SOLO_CHAIR,
  formatDoctorShortName,
} from "./ScheduleGrid";

export interface AppointmentModalDoctorChairSectionProps {
  appointment: Appointment;
  dashboard: Dashboard;
  startsAtLocal: string;
  setStartsAtLocal: (val: string) => void;
  endsAtLocal: string;
  setEndsAtLocal: (val: string) => void;
  currentDurationMinutes: number;
  applyDuration: (minutes: number) => void;
  doctorUserId: string;
  setDoctorUserId: (id: string) => void;
  assistantUserId: string | null;
  setAssistantUserId: (id: string | null) => void;
  chairId: string;
  setChairId: (id: string) => void;
  isSoloDoctor: boolean;
  doctors: Array<{ id: string; fullName: string; specialties?: string[] }>;
  assistants: Array<{ id: string; fullName: string }>;
  chairs: Array<{ id: string; name: string; specialization?: string | null | undefined }>;
  dutyDoctorId: string | null;
  dutyDoc: { id: string; fullName: string } | null;
  dutyDocHours: string | null;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  collision: ResourceCollisionResult;
  safeToDateTimeLocalValue: (iso: string | null | undefined, tz?: string | null) => string;
  timezone: string;
  hideAssistant?: boolean;
}

export function AppointmentModalDoctorChairSection({
  appointment,
  dashboard,
  startsAtLocal,
  setStartsAtLocal,
  endsAtLocal,
  setEndsAtLocal,
  currentDurationMinutes,
  applyDuration,
  doctorUserId,
  setDoctorUserId,
  assistantUserId,
  setAssistantUserId,
  chairId,
  setChairId,
  isSoloDoctor,
  doctors,
  assistants,
  chairs,
  dutyDoctorId,
  dutyDoc,
  dutyDocHours,
  chairDoctorAssignments,
  collision,
  safeToDateTimeLocalValue,
  timezone,
  hideAssistant = false,
}: AppointmentModalDoctorChairSectionProps) {
  return (
    <>
      {/* CITO / Urgent Overbooking warning */}
      {collision.isCitoOverbooking && (
        <div
          className="p-2.5 sm:p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2"
          role="alert"
          data-testid="modal-cito-overbooking-alert"
        >
          <Zap
            size={15}
            className="shrink-0 text-rose-600 dark:text-rose-400"
          />
          <span>
            {collision.message ||
              "Запись по острой боли (наложение слота допустимо): наложение на занятый слот разрешено."}
          </span>
        </div>
      )}

      {/* Collision warning with suggested slot */}
      {collision.hasCollision && (
        <div
          className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-2.5 flex-wrap"
          role="alert"
          data-testid="appointment-collision-alert"
        >
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <AlertTriangle
              size={15}
              className="shrink-0 text-amber-600 dark:text-amber-400"
            />
            <span>
              {collision.message}. Разрешена экстренная запись (острая боль /
              совмещение допустимо).
            </span>
          </div>
          {collision.suggestedSlot && (
            <button
              type="button"
              onClick={() => {
                const newStart = safeToDateTimeLocalValue(
                  collision.suggestedSlot!.startsAt,
                  timezone,
                );
                const newEnd = safeToDateTimeLocalValue(
                  collision.suggestedSlot!.endsAt,
                  timezone,
                );
                setStartsAtLocal(newStart);
                setEndsAtLocal(newEnd);
                showToast(
                  `Время перенесено на ${collision.suggestedSlot!.timeDisplay}`,
                  "success",
                );
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              title="Выбрать ближайшее свободное окно"
              data-testid="appointment-apply-suggested-slot-btn"
            >
              <Clock size={13} className="shrink-0" />
              <span>{collision.suggestedSlot.label}</span>
            </button>
          )}
        </div>
      )}

      {/* Time */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
          <Clock size={13} className="text-[var(--teal)]" />
          <span>Начало *</span>
        </label>
        <input
          type="datetime-local"
          value={startsAtLocal}
          onChange={(e) => {
            const nextVal = e.target.value;
            setStartsAtLocal(nextVal);
            if (chairId && nextVal) {
              const newDuty = resolveChairDutyDoctor(
                chairId,
                nextVal,
                chairDoctorAssignments,
                nextVal.slice(0, 10),
              );
              if (
                newDuty.doctorId &&
                (!doctorUserId || doctorUserId === dutyDoctorId)
              ) {
                setDoctorUserId(newDuty.doctorId);
              }
            }
          }}
          className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] font-medium"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
          <Clock size={13} className="text-[var(--teal)]" />
          <span>Окончание *</span>
        </label>
        <input
          type="datetime-local"
          value={endsAtLocal}
          onChange={(e) => setEndsAtLocal(e.target.value)}
          className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] font-medium"
        />
      </div>

      {/* Quick Duration Buttons (Anti-Clickfest) */}
      <div className="sm:col-span-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
            <Zap size={13} className="text-[var(--teal)]" />
            <span>Быстрый выбор длительности:</span>
          </label>
          {currentDurationMinutes > 0 && (
            <span className="text-xs font-mono font-bold text-[var(--teal)]">
              {currentDurationMinutes} мин
              {currentDurationMinutes >= 60
                ? ` (${Math.floor(currentDurationMinutes / 60)} ч ${currentDurationMinutes % 60 ? `${currentDurationMinutes % 60} мин` : ""})`
                : ""}
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-1.5 flex-wrap"
          data-testid="appointment-quick-durations"
        >
          {[15, 30, 45, 60, 90, 120].map((mins) => {
            const isSelected = currentDurationMinutes === mins;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => applyDuration(mins)}
                className={`appointment-modal-duration-chip ${isSelected ? "active" : ""} h-8 sm:h-8.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center ${
                  isSelected
                    ? "!bg-[var(--teal)] !text-white !border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal)]/25 font-bold"
                    : "bg-[var(--paper-soft)] border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--paper-subtle)]"
                }`}
              >
                {mins < 60
                  ? `${mins} мин`
                  : mins === 60
                    ? "1 час"
                    : mins === 90
                      ? "1.5 ч"
                      : "2 часа"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Doctor */}
      <div className={hideAssistant ? "sm:col-span-1" : ""}>
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
          Врач {isSoloDoctor ? "(соло-врач)" : "*"}
        </label>
        <select
          value={doctorUserId}
          onChange={(e) => {
            const newDocId = e.target.value;
            setDoctorUserId(newDocId);
            if (
              newDocId &&
              (!appointment?.chairId || appointment.id.startsWith("new"))
            ) {
              let targetChairId: string | null = null;
              const doc =
                doctors.find((d) => d.id === newDocId) ||
                dashboard?.clinicSettings?.staff?.find(
                  (s) => s.id === newDocId,
                );

              // 1. Doctor's preferred chair
              if ((doc as any)?.preferredChairId) {
                const pref = chairs.find(
                  (c) => c.id === (doc as any).preferredChairId,
                );
                if (pref) targetChairId = pref.id;
              }
              if (!targetChairId && typeof window !== "undefined") {
                const storedPref = safeLocalStorageGetJson<
                  Record<string, string>
                >("dente_doctor_preferred_chairs", {});
                if (storedPref[newDocId]) {
                  const pref = chairs.find(
                    (c) => c.id === storedPref[newDocId],
                  );
                  if (pref) targetChairId = pref.id;
                }
              }

              // 2. Chair default doctor
              if (!targetChairId) {
                const def = chairs.find(
                  (c) => (c as any).defaultDoctorId === newDocId,
                );
                if (def) targetChairId = def.id;
              }
              if (!targetChairId && typeof window !== "undefined") {
                const storedChairDef = safeLocalStorageGetJson<
                  Record<string, string>
                >("dente_chair_default_doctors", {});
                for (const [cId, dId] of Object.entries(storedChairDef)) {
                  if (dId === newDocId) {
                    const def = chairs.find((c) => c.id === cId);
                    if (def) {
                      targetChairId = def.id;
                      break;
                    }
                  }
                }
              }

              // 3. Duty chair on scheduled time
              if (!targetChairId) {
                const assignedChair = chairs.find((c) => {
                  const duty = resolveChairDutyDoctor(
                    c.id,
                    startsAtLocal,
                    chairDoctorAssignments,
                    startsAtLocal
                      ? startsAtLocal.slice(0, 10)
                      : undefined,
                  );
                  return duty.doctorId === newDocId;
                });
                if (assignedChair) targetChairId = assignedChair.id;
              }

              // 4. Specialization match
              if (!targetChairId && doc?.specialties?.length) {
                const matchingChair = chairs.find(
                  (c) =>
                    c.specialization &&
                    doc.specialties?.includes(c.specialization),
                );
                if (matchingChair) targetChairId = matchingChair.id;
              }

              if (targetChairId) {
                setChairId(targetChairId);
              }
            }
          }}
          className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
          data-testid="select-appointment-doctor"
        >
          <option value="">-- Выберите врача --</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
            </option>
          ))}
        </select>
        {dutyDoc && (
          <div
            className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/25 shadow-2xs"
            data-testid="duty-doctor-badge"
          >
            <UserCheck
              size={12}
              className="shrink-0 text-[var(--teal)]"
            />
            <span>
              Дежурный: {formatDoctorShortName(dutyDoc.fullName)} (
              {dutyDocHours || "смена"})
            </span>
          </div>
        )}
        {dutyDoc &&
          doctorUserId &&
          dutyDoc.id &&
          doctorUserId !== dutyDoc.id && (
            <div
              className="mt-1 p-2 rounded-xl text-xs bg-amber-500/10 text-amber-900 dark:text-amber-100 border border-amber-500/30 flex items-start gap-1.5"
              data-testid="duty-doctor-override-note"
            >
              <AlertTriangle
                size={13}
                className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="font-semibold block">
                  На кресле дежурит {formatDoctorShortName(dutyDoc.fullName)}. Запись доступна в штатном режиме.
                </span>
                <span className="text-[11px] text-[var(--muted)] block">
                  Врач может принять пациента на этой установке. Запись не блокируется.
                </span>
              </div>
            </div>
          )}
      </div>

      {/* Assistant */}
      {!hideAssistant && !isSoloDoctor && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between mb-1">
            <span>Ассистент</span>
            <span className="text-[10px] text-[var(--muted)] font-normal">
              Опционально
            </span>
          </label>
          <select
            value={assistantUserId || ""}
            onChange={(e) => setAssistantUserId(e.target.value || null)}
            className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
            data-testid="select-appointment-assistant"
          >
            <option value="">-- Без ассистента (соло-приём) --</option>
            {assistants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Chair */}
      <div className={hideAssistant ? "sm:col-span-1" : isSoloDoctor ? "sm:col-span-1" : "sm:col-span-2"}>
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
          Кресло / Кабинет {chairs.length <= 1 ? "(авто)" : "*"}
        </label>
        <select
          value={chairId}
          onChange={(e) => {
            const nextChairId = e.target.value;
            setChairId(nextChairId);
            if (nextChairId && startsAtLocal) {
              const duty = resolveChairDutyDoctor(
                nextChairId,
                startsAtLocal,
                chairDoctorAssignments,
                startsAtLocal.slice(0, 10),
              );
              if (
                duty.doctorId &&
                (!doctorUserId || doctorUserId === dutyDoctorId)
              ) {
                setDoctorUserId(duty.doctorId);
              }
            }
          }}
          className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
          data-testid="select-appointment-chair"
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
    </>
  );
}
