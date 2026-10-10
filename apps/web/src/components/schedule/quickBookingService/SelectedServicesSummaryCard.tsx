import { CalendarDays, Clock, Layers, Search, X } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { resolveChairDutyDoctor } from "../chairRosterMath";
import {
  DURATION_PRESETS,
  extractStageBookingServices,
  hasTreatmentPlanStageContext,
} from "./quickServicePresets";
import type {
  QuickBookingSlotInfo,
  SelectedServicesSummaryCardProps,
} from "./types";

export function SelectedServicesSummaryCard({
  initialSlot,
}: {
  initialSlot?: QuickBookingSlotInfo | null | undefined;
}) {
  if (!hasTreatmentPlanStageContext(initialSlot)) {
    return null;
  }

  const stageItems = extractStageBookingServices(initialSlot);

  return (
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
              {initialSlot?.stageNumber
                ? `Этап ${initialSlot.stageNumber}: `
                : ""}
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
      {stageItems.length > 0 && (
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
              const tooth = svc.toothNumber ?? svc.toothCode ?? svc.toothFdi;
              const price = svc.priceRub ?? svc.unitPriceRub ?? svc.price;
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
      )}
    </div>
  );
}

export function QuickDurationAndSlotsSection({
  startsAtLocal,
  setStartsAtLocal,
  durationMinutes,
  handleSelectDuration,
  chairId,
  setChairId,
  doctorUserId,
  setDoctorUserId,
  chairDoctorAssignments,
  isSearchingSlots,
  setIsSearchingSlots,
  freeSlotsList,
  handleFindFreeSlots,
}: Omit<SelectedServicesSummaryCardProps, "initialSlot">) {
  return (
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

          {freeSlotsList.length === 0 ||
          freeSlotsList.every((d) => d.slots.length === 0) ? (
            <p className="text-xs text-[var(--muted)] py-2">
              Свободных окон на длительность {durationMinutes} мин не найдено.
              Попробуйте выбрать меньшую длительность или другого врача.
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
          <div data-testid="quick-booking-duration-presets" className="mt-1">
            <span className="text-xs font-bold text-[var(--muted)] block mb-1.5">
              Быстрый выбор длительности:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((preset) => {
                const isSelected = durationMinutes === preset.minutes;
                // biome-ignore lint/suspicious/noExplicitAny: preserved preset hint fallback
                const displayHint =
                  (preset as any).serviceHint || (preset as any).hint || "";
                // biome-ignore lint/suspicious/noExplicitAny: preserved preset label fallback
                const displayLabel =
                  (preset as any).label || `${preset.minutes} мин`;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => handleSelectDuration(preset.minutes)}
                    className={`h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                      isSelected
                        ? "primary-button shadow-sm font-semibold"
                        : "quick-chip text-[var(--ink)]"
                    }`}
                    data-testid={`duration-preset-${preset.minutes}`}
                  >
                    <span className="font-semibold">{displayLabel}</span>
                    {displayHint ? (
                      <span
                        className={`text-[10px] ${
                          isSelected
                            ? "text-teal-100 font-medium"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        · {displayHint}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
