import React from "react";
import { CalendarRange, X } from "lucide-react";
import type { ScheduleChair } from "./ScheduleFilterStrip";
import type { DateRangeShiftPreset } from "./roster/DoctorShiftRosterModal";

export interface ChairDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Array<{ id: string; fullName: string; specialty?: any }>;
  chairs: Array<ScheduleChair>;
  rangeDoctorId: string;
  setRangeDoctorId: (id: string) => void;
  rangeChairId: string;
  setRangeChairId: (id: string) => void;
  rangeStartDate: string;
  setRangeStartDate: (date: string) => void;
  rangeEndDate: string;
  setRangeEndDate: (date: string) => void;
  rangePreset: DateRangeShiftPreset;
  setRangePreset: (preset: DateRangeShiftPreset) => void;
  onApply: () => void;
}

export function ChairDateRangeModal({
  isOpen,
  onClose,
  doctors,
  chairs,
  rangeDoctorId,
  setRangeDoctorId,
  rangeChairId,
  setRangeChairId,
  rangeStartDate,
  setRangeStartDate,
  rangeEndDate,
  setRangeEndDate,
  rangePreset,
  setRangePreset,
  onApply,
}: ChairDateRangeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      data-testid="chair-schedule-date-range-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chair-date-range-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl p-4 sm:p-5 flex flex-col gap-4 text-[var(--ink,#0f172a)] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-[var(--teal,#0d9488)]" aria-hidden="true" />
            <div>
              <h2
                id="chair-date-range-modal-title"
                className="text-base font-bold text-[var(--ink,#0f172a)] leading-tight"
              >
                Назначить смену на диапазон дат
              </h2>
              <p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
                Закрепление врача за установкой
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer shrink-0"
            aria-label="Закрыть окно"
            data-testid="chair-range-modal-close-btn"
            style={{ minHeight: "44px", minWidth: "44px" }}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="chair-range-modal-doctor-select"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
            >
              Врач
            </label>
            <select
              id="chair-range-modal-doctor-select"
              data-testid="chair-range-modal-doctor-select"
              value={rangeDoctorId || doctors[0]?.id || ""}
              onChange={(e) => setRangeDoctorId(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
              style={{ minHeight: "44px" }}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} {(d as any).specialty ? `(${String((d as any).specialty)})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="chair-range-modal-chair-select"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
            >
              Кресло
            </label>
            <select
              id="chair-range-modal-chair-select"
              data-testid="chair-range-modal-chair-select"
              value={rangeChairId || chairs[0]?.id || ""}
              onChange={(e) => setRangeChairId(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
              style={{ minHeight: "44px" }}
            >
              {chairs.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name} {(ch as any).roomNumber ? `(Каб. ${(ch as any).roomNumber})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="chair-range-modal-start-date"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
            >
              С даты
            </label>
            <input
              id="chair-range-modal-start-date"
              data-testid="chair-range-modal-start-date"
              type="date"
              value={rangeStartDate}
              onChange={(e) => setRangeStartDate(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
              style={{ minHeight: "44px" }}
            />
          </div>

          <div>
            <label
              htmlFor="chair-range-modal-end-date"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1"
            >
              По дату
            </label>
            <input
              id="chair-range-modal-end-date"
              data-testid="chair-range-modal-end-date"
              type="date"
              value={rangeEndDate}
              onChange={(e) => setRangeEndDate(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#fff)] text-[var(--ink,#0f172a)] text-xs font-semibold focus:ring-2 focus:ring-[var(--teal)] focus:outline-hidden"
              style={{ minHeight: "44px" }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]">
            Смена / график:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "morning", label: "1 см. 08-14" },
              { id: "morning_9", label: "1 см. 09-15" },
              { id: "evening", label: "2 см. 14-20" },
              { id: "evening_15", label: "2 см. 15-21" },
              { id: "full", label: "Весь день (08-20)" },
              { id: "two_two", label: "2/2 (08-20)" },
              { id: "five_day", label: "Пятидневка Пн–Пт" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                data-testid={`chair-range-modal-preset-${preset.id}`}
                onClick={() => setRangePreset(preset.id as DateRangeShiftPreset)}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center justify-center ${
                  rangePreset === preset.id
                    ? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
                    : "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal)]"
                }`}
                style={{ minHeight: "44px" }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
            style={{ minHeight: "44px" }}
          >
            Отмена
          </button>
          <button
            type="button"
            data-testid="chair-range-modal-apply-btn"
            onClick={onApply}
            className="min-h-[44px] px-5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            style={{ minHeight: "44px" }}
          >
            <CalendarRange size={15} />
            <span>Назначить график</span>
          </button>
        </div>
      </div>
    </div>
  );
}
