import { Check, Flame, Sparkles } from "lucide-react";
import React from "react";
import { APPOINTMENT_TYPE_PRESETS } from "./quickServicePresets";
import type { QuickBookingAppointmentType } from "./types";

export function QuickAppointmentTypeSelector({
  appointmentType,
  handleSelectAppointmentType,
}: {
  appointmentType: QuickBookingAppointmentType;
  handleSelectAppointmentType: (type: QuickBookingAppointmentType) => void;
}) {
  return (
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
              className={`!h-auto !min-h-[52px] py-2 px-2.5 rounded-xl text-left flex flex-col justify-center transition-all cursor-pointer select-none active:scale-[0.99] ${
                isSelected
                  ? isEm
                    ? "danger-button active !border-rose-600 ring-2 ring-rose-500/40 shadow-sm"
                    : "primary-button shadow-sm"
                  : isEm
                    ? "danger-button"
                    : "secondary-button"
              }`}
              data-testid={`quick-booking-type-${preset.type}`}
              title={preset.description}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                {isEm ? (
                  <Flame
                    size={15}
                    className={
                      isSelected
                        ? "text-white animate-pulse"
                        : "text-rose-600 dark:text-rose-400"
                    }
                  />
                ) : isSelected ? (
                  <Check size={14} className="stroke-[2.5]" />
                ) : null}
                <span>{preset.label}</span>
              </div>
              <span
                className={`text-[10px] block mt-0.5 leading-tight ${
                  isSelected
                    ? isEm
                      ? "text-rose-100 font-medium"
                      : "text-teal-100 font-medium"
                    : "text-[var(--muted)]"
                }`}
              >
                {preset.type === "emergency"
                  ? "CITO / Срочно"
                  : preset.type === "primary"
                    ? "Консультация"
                    : "По плану"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
