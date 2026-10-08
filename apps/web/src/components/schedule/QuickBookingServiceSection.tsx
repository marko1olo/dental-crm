import type { Dashboard, DentalSpecialty } from "@dental/shared";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Search,
  Sparkles,
  UserCheck,
  UserX,
  X,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { showToast } from "../GlobalToast";
import {
  APPOINTMENT_TYPE_PRESETS,
  DURATION_PRESETS,
  type QuickBookingAppointmentType,
} from "./patientReliabilityScore";
import {
  DEFAULT_SOLO_CHAIR,
  formatDoctorShortName,
  type ChairDoctorShiftAssignment,
} from "./ScheduleGrid";
import { specialtyLabels } from "../../workspaceUiLabels";
import { resolveChairDutyDoctor } from "./chairRosterMath";
import { SlotConflictModal } from "./SlotConflictModal";
import { COMMON_REASONS, type QuickBookingSlotInfo } from "./QuickBookingDrawerTypes";
import { findDoctorFreeSlots, type DayFreeSlots } from "./doctorFreeSlotsEngine";

export interface QuickBookingServiceSectionProps {
  appointmentType: QuickBookingAppointmentType;
  handleSelectAppointmentType: (type: QuickBookingAppointmentType) => void;
  startsAtLocal: string;
  setStartsAtLocal: (val: string) => void;
  durationMinutes: number;
  handleSelectDuration: (mins: number) => void;
  doctorUserId: string;
  setDoctorUserId: (id: string) => void;
  assistantUserId: string | null;
  setAssistantUserId: (id: string | null) => void;
  chairId: string;
  setChairId: (id: string) => void;
  status: any;
  setStatus: (s: any) => void;
  reason: string;
  setReason: (r: string) => void;
  comment: string;
  setComment: (c: string) => void;
  submitError: string | null;
  slotConflict: any;
  setSlotConflict: (c: any) => void;
  handleSubmitBooking: (e?: React.FormEvent, opts?: { overbookOverride?: boolean }) => Promise<void>;
  doctors: Array<{ id: string; fullName: string; role?: string; specialties?: DentalSpecialty[] }>;
  assistants: Array<{ id: string; fullName: string }>;
  chairs: Array<{ id: string; name: string }>;
  currentChair: { id: string; name: string } | null;
  dutyDoc: { id: string; fullName: string } | null;
  dutyDoctorHours: string | null;
  isSoloClinic: boolean;
  selectedPatientName?: string | undefined;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  dashboard?: Dashboard | undefined;
  initialSlot?: QuickBookingSlotInfo | null | undefined;
}

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
    const startDate = startsAtLocal ? startsAtLocal.slice(0, 10) : new Date().toISOString().slice(0, 10);
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
      <div className="space-y-1.5" data-testid="expo26-segmented-status-container">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-[var(--teal)]" />
            <span>Статус записи</span>
          </span>
          {appointmentType === "emergency" && (
            <span
              className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse inline-flex items-center gap-1"
              data-testid="cito-slot-priority-badge"
            >
              <Zap size={11} className="shrink-0" aria-hidden="true" />
              <span>СРОЧНО</span>
            </span>
          )}
        </div>
        <div className="dente-segmented-bar w-full grid grid-cols-3" data-testid="expo26-segmented-status">
          <button
            type="button"
            onClick={() => {
              setStatus("planned");
              if (appointmentType === "emergency") {
                handleSelectAppointmentType("secondary");
              }
            }}
            className={`dente-segmented-item w-full ${
              status === "planned" && appointmentType !== "emergency" ? "active" : ""
            }`}
            data-testid="expo26-status-planned"
          >
            <Clock size={13} className="shrink-0" />
            <span className="truncate">Плановый</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleSelectAppointmentType("emergency");
              if (!reason.includes("Срочно")) {
                setReason(reason ? `Срочно! Острая боль, ${reason}` : "Срочно! Острая боль");
              }
            }}
            className={`dente-segmented-item w-full ${
              appointmentType === "emergency"
                ? "active !bg-rose-600 !text-white"
                : "text-rose-700 dark:text-rose-300"
            }`}
            data-testid="expo26-status-emergency"
          >
            <Flame size={13} className={appointmentType === "emergency" ? "text-white animate-pulse shrink-0" : "text-rose-600 shrink-0"} />
            <span className="truncate hidden sm:inline">Внеплановый (срочно)</span>
            <span className="truncate sm:hidden">Срочный</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("confirmed");
            }}
            className={`dente-segmented-item w-full ${
              status === "confirmed" ? "active" : ""
            }`}
            data-testid="expo26-status-confirmed"
          >
            <CheckCircle2 size={13} className="shrink-0" />
            <span className="truncate hidden sm:inline">Утверждённый</span>
            <span className="truncate sm:hidden">Подтверждён</span>
          </button>
        </div>
      </div>

      {/* DentalPRO Parity: Treatment Plan Stage Booking Banner */}
      {Boolean(
        initialSlot?.stageTitle ||
          initialSlot?.treatmentPlanId ||
          initialSlot?.stageId ||
          initialSlot?.services?.length ||
          initialSlot?.items?.length ||
          initialSlot?.procedures?.length,
      ) && (
        <div
          className="p-3.5 rounded-2xl bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/30 text-[var(--ink)] space-y-2.5 transition-all shadow-sm"
          data-testid="stage-booking-banner"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[var(--teal)] text-white shrink-0 shadow-sm">
                <Layers size={15} />
              </span>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--teal)] block">
                  Привязка к плану лечения
                </span>
                <h4
                  className="text-sm font-bold leading-snug"
                  data-testid="stage-booking-title"
                >
                  {initialSlot?.stageNumber ? `Этап ${initialSlot.stageNumber}: ` : ""}
                  {initialSlot?.stageTitle || "Лечебный этап"}
                </h4>
              </div>
            </div>
            {initialSlot?.estimatedDurationMinutes ? (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--teal)]/15 text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/25 shrink-0"
                data-testid="stage-booking-duration-badge"
              >
                <Clock size={12} />
                <span>{initialSlot.estimatedDurationMinutes} мин</span>
              </span>
            ) : null}
          </div>

          {/* List of procedures / services in this stage */}
          {(() => {
            const stageItems =
              initialSlot?.services ||
              initialSlot?.items ||
              initialSlot?.procedures ||
              [];
            if (stageItems.length === 0) return null;
            return (
              <div
                className="pt-1 border-t border-[var(--line)]/50 space-y-1.5"
                data-testid="stage-booking-services-list"
              >
                <div className="text-[11px] font-semibold text-[var(--muted)]">
                  Назначенные процедуры этапа ({stageItems.length}):
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {stageItems.map((svc, idx) => {
                    const svcName =
                      svc.title ||
                      svc.name ||
                      svc.medicalTitleRu ||
                      svc.patientFriendlyTitleRu ||
                      "Стоматологическая процедура";
                    const tooth =
                      svc.toothNumber ?? svc.toothCode ?? svc.toothFdi;
                    const price =
                      svc.priceRub ?? svc.unitPriceRub ?? svc.price;
                    return (
                      <div
                        key={svc.id || idx}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]/40 gap-2"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {svc.code804n && (
                            <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]/50 shrink-0">
                              {svc.code804n}
                            </span>
                          )}
                          <span className="truncate font-medium">{svcName}</span>
                          {tooth && (
                            <span className="shrink-0 text-[11px] text-[var(--teal)] font-semibold">
                              (зуб {tooth})
                            </span>
                          )}
                        </div>
                        {price !== undefined && price !== null && (
                          <span className="shrink-0 font-semibold text-[var(--ink)] whitespace-nowrap">
                            {Number(price).toLocaleString("ru-RU")} ₽
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Quick Appointment Type Selector */}
      <div className="space-y-1.5" data-testid="quick-booking-type-selector">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
            <Sparkles size={14} className="text-[var(--teal)]" />
            <span>Тип приема *</span>
          </span>
          {appointmentType === "emergency" && (
            <span
              className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse"
              data-testid="cito-slot-priority-badge-secondary"
            >
              Приоритетный слот
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {APPOINTMENT_TYPE_PRESETS.map((preset) => {
            const isSelected = appointmentType === preset.type;
            const isEm = preset.isEmergency;
            return (
              <button
                key={preset.type}
                type="button"
                onClick={() => handleSelectAppointmentType(preset.type)}
                className={`min-h-[48px] p-2.5 rounded-xl border text-left flex flex-col justify-center transition-all cursor-pointer ${
                  isSelected
                    ? isEm
                      ? "bg-rose-500/20 text-rose-950 dark:text-rose-100 border-rose-500 ring-2 ring-rose-500/50 shadow-md"
                      : "bg-[var(--teal-dark)] text-white dark:bg-teal-500/25 dark:text-teal-100 dark:border-teal-400 shadow-md"
                    : isEm
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/15"
                      : "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper)]"
                }`}
                data-testid={`quick-booking-type-${preset.type}`}
                title={preset.description}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  {isEm ? (
                    <Flame
                      size={15}
                      className={
                        isSelected ? "text-rose-500 animate-bounce" : "text-rose-600"
                      }
                    />
                  ) : isSelected ? (
                    <Check size={14} />
                  ) : null}
                  <span>{preset.label}</span>
                </div>
                <span
                  className={`text-[10px] truncate block mt-0.5 ${
                    isSelected
                      ? isEm
                        ? "text-rose-950 dark:text-rose-100 font-semibold"
                        : "text-white font-medium"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Date, Time & Duration Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
            <Clock size={14} className="text-[var(--teal)]" />
            <span>Время и длительность *</span>
          </label>
          <button
            type="button"
            onClick={handleFindFreeSlots}
            className="text-xs font-bold text-[var(--teal)] hover:text-[var(--teal-dark)] flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--teal)]/30 bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 transition-all cursor-pointer"
            data-testid="quick-booking-find-slots-btn"
            title="Интеллектуальный поиск свободных окон"
          >
            <Search size={12} className="shrink-0" />
            <span>Найти варианты</span>
          </button>
        </div>

        {/* Инлайн-блок найденных свободных окон (DentalPRO Smart Match) */}
        {isSearchingSlots && (
          <div
            className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/40 shadow-xs space-y-2 animate-in fade-in"
            data-testid="quick-booking-free-slots-panel"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                <CalendarDays size={13} className="text-[var(--teal)]" />
                <span>Свободные окна ({durationMinutes} мин, 7 дней)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSearchingSlots(false)}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                title="Скрыть варианты"
                aria-label="Скрыть свободные окна"
              >
                <X size={14} />
              </button>
            </div>

            {freeSlotsList.length === 0 || freeSlotsList.every((d) => d.slots.length === 0) ? (
              <p className="text-xs text-[var(--muted)] py-2">
                Свободных окон на длительность {durationMinutes} мин не найдено. Попробуйте выбрать меньшую длительность или другого врача.
              </p>
            ) : (
              <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
                {freeSlotsList
                  .filter((day) => day.slots.length > 0)
                  .map((day) => (
                    <div key={day.date} className="space-y-1">
                      <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                        {day.dateFormatted}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {day.slots.map((slot) => (
                          <button
                            key={`${slot.date}-${slot.startTime}-${slot.chairId}`}
                            type="button"
                            onClick={() => {
                              setStartsAtLocal(slot.startsAtIso.slice(0, 16));
                              if (slot.chairId) {
                                setChairId(slot.chairId);
                              }
                              if (slot.doctorId && !doctorUserId) {
                                setDoctorUserId(slot.doctorId);
                              }
                              setIsSearchingSlots(false);
                              showToast(
                                `Выбрано окно: ${day.dateFormatted}, ${slot.startTime} (${slot.chairName})`,
                                "success",
                              );
                            }}
                            className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-[var(--ink)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title={`Выбрать окно ${slot.timeDisplay} (${slot.chairName})`}
                            data-testid={`quick-slot-candidate-${slot.date}-${slot.startTime}`}
                          >
                            <span>{slot.startTime}</span>
                            <span className="text-[10px] text-[var(--muted)] font-normal">
                              ({slot.chairName})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-xs font-semibold text-[var(--muted)] block mb-1">
              Начало
            </span>
            <input
              type="datetime-local"
              data-testid="quick-booking-starts-at-input"
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
                  if (newDuty.doctorId) {
                    setDoctorUserId(newDuty.doctorId);
                  }
                }
              }}
              className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
            />
          </div>

          <div className="sm:col-span-2">
            <span className="text-xs font-semibold text-[var(--muted)] block mb-1">
              Длительность: {durationMinutes} мин
            </span>
            <div
              data-testid="quick-booking-duration-presets"
              className="mt-1"
            >
              <span className="text-xs font-bold text-[var(--muted)] block mb-1.5">
                Быстрый выбор длительности:
              </span>
              <div className="dente-filter-chips gap-2">
                {DURATION_PRESETS.map((preset) => {
                  const isSelected = durationMinutes === preset.minutes;
                  const displayHint = (preset as any).serviceHint || (preset as any).hint || "";
                  const displayLabel = (preset as any).label || `${preset.minutes} мин`;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => handleSelectDuration(preset.minutes)}
                      className={`dente-filter-chip min-h-[36px] h-auto py-1.5 px-3 ${
                        isSelected ? "active font-bold" : ""
                      }`}
                      data-testid={`duration-preset-${preset.minutes}`}
                    >
                      <span className="font-semibold">{displayLabel}</span>
                      <span
                        className={`text-[11px] font-normal ${
                          isSelected
                            ? "text-slate-900 dark:text-white font-bold"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        · {displayHint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Resource Allocation: Doctor, Assistant & Chair */}
      <div className="space-y-3 pt-1">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <CalendarCheck size={14} className="text-[var(--teal)]" />
          <span>Кабинет и персонал *</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    (nextChairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
                  const duty = resolveChairDutyDoctor(
                    nextChairId,
                    startsAtLocal,
                    chairDoctorAssignments,
                    startsAtLocal ? startsAtLocal.slice(0, 10) : undefined,
                    null,
                    (targetChair as any)?.defaultDoctorId || (isSoloClinic && doctors[0] ? doctors[0].id : null),
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
                  Дежурный врач: {formatDoctorShortName(dutyDoc.fullName)} ({dutyDoctorHours || "смена"})
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
                  <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold block">
                      На кресле «{currentChair?.name || "Кресло"}» дежурит {formatDoctorShortName(dutyDoc.fullName)}. Запись создается с подтверждением в штатном режиме.
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">
                      Запись не блокируется. При необходимости врач может принять пациента в свободном кабинете.
                    </span>
                  </div>
                </div>
              )}
          </div>

          {/* Assistant Selector (Optional in Multi-Staff, Hidden in Solo) */}
          {!isSoloClinic && (
            <div className="sm:col-span-2">
              <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Ассистент <span className="font-normal text-[var(--muted)] lowercase">(опционально, соло-приём без ассистента)</span>
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
      <div className="space-y-1.5 pt-1" data-testid="quick-booking-status-selector">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <CalendarCheck size={14} className="text-[var(--teal)]" />
          <span>Статус записи</span>
        </label>
        <div className="dente-filter-chips gap-1.5">
          <button
            type="button"
            onClick={() => setStatus("planned")}
            className={`dente-filter-chip ${
              status === "planned" ? "active font-semibold" : ""
            }`}
            data-testid="quick-status-btn-planned"
          >
            <Clock size={13} className="shrink-0" />
            <span className="whitespace-nowrap leading-none">Ожидает</span>
          </button>
          <button
            type="button"
            onClick={() => setStatus("confirmed")}
            className={`dente-filter-chip ${
              status === "confirmed" ? "active font-semibold" : ""
            }`}
            data-testid="quick-status-btn-confirmed"
          >
            <UserCheck size={13} className="shrink-0" />
            <span className="whitespace-nowrap leading-none">Подтвержден</span>
          </button>
          <button
            type="button"
            onClick={() => setStatus("arrived")}
            className={`dente-filter-chip ${
              status === "arrived" ? "active font-semibold" : ""
            }`}
            data-testid="quick-status-btn-arrived"
          >
            <UserCheck size={13} className="shrink-0" />
            <span className="whitespace-nowrap leading-none">Пациент пришел</span>
          </button>
          <button
            type="button"
            onClick={() => setStatus("in_treatment")}
            className={`dente-filter-chip ${
              status === "in_treatment" ? "active font-semibold" : ""
            }`}
            data-testid="quick-status-btn-in_treatment"
          >
            <CalendarCheck size={13} className="shrink-0" />
            <span className="whitespace-nowrap leading-none">В кресле</span>
          </button>
          <button
            type="button"
            onClick={() => setStatus("completed")}
            className={`dente-filter-chip ${
              status === "completed" ? "active font-semibold" : ""
            }`}
            data-testid="quick-status-btn-completed"
          >
            <CheckCircle2 size={13} className="shrink-0" />
            <span className="whitespace-nowrap leading-none">Прием завершен</span>
          </button>
          <button
            type="button"
            onClick={() => setStatus("no_show")}
            className={`dente-filter-chip ${
              status === "no_show" ? "active !bg-rose-600 !text-white font-semibold" : ""
            }`}
            data-testid="quick-status-btn-no_show"
          >
            <UserX size={13} className="shrink-0" />
            <span className="whitespace-nowrap leading-none">Неявка</span>
          </button>
        </div>
      </div>

      {/* 4. Reason & Comment */}
      <div className="space-y-3">
        <div>
          <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
            Повод обращения / Услуга
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: Осмотр, Кариес, Консультация"
            className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
          <div className="dente-filter-chips gap-1.5 mt-2">
            {COMMON_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  const cur = reason.trim();
                  setReason(cur ? `${cur}, ${r.toLowerCase()}` : r);
                }}
                className="dente-filter-chip"
              >
                + {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
            Комментарий для врача / регистратуры
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Дополнительные пожелания или примечания…"
            rows={2}
            className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>
      </div>

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
