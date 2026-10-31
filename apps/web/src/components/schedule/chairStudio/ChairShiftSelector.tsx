/**
 * ChairShiftSelector.tsx — Селектор смен врача, стоматологических кресел и дежурного специалиста
 * Мандат 8b / 8zi: эталонный Sweet Spot (90–140 строк).
 * Мандат 8n / 8e: суверенитет соло-врача — ноль обязательных ассистентов и начмедов, выбор в 1 клик.
 * Мандат 8am: чистые консистентные чипы переключения.
 */

import React from "react";
import { UserCheck, Clock, Armchair } from "lucide-react";
import { CHAIR_PRESETS, type DentalChairPreset } from "../scheduleCatalogData";
import { type ChairShiftType, CHAIR_SHIFT_OPTIONS } from "./chairStudioTypes";

export interface ChairShiftSelectorProps {
  readonly selectedChairId: string;
  readonly onChairSelect: (chairId: string) => void;
  readonly selectedShift: ChairShiftType;
  readonly onShiftSelect: (shift: ChairShiftType) => void;
  readonly selectedDoctor: string;
  readonly onDoctorSelect: (doctor: string) => void;
  readonly chairs?: readonly DentalChairPreset[];
}

const DOCTOR_OPTIONS = [
  "Д-р Соколов А.В.",
  "Д-р Морозова Е.С.",
  "Д-р Ильин Д.М.",
] as const;

export const ChairShiftSelector: React.FC<ChairShiftSelectorProps> = ({
  selectedChairId,
  onChairSelect,
  selectedShift,
  onShiftSelect,
  selectedDoctor,
  onDoctorSelect,
  chairs = CHAIR_PRESETS,
}) => {
  return (
    <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-6 py-2 border-b border-[var(--line)] bg-[var(--paper)]">
      {/* ЛИНИЯ КРЕСЕЛ (ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ ЧИПОВ БЕЗ ВЫХОДА ЗА ЭКРАН) */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
        <div className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] mr-1 shrink-0">
          <Armchair className="w-3.5 h-3.5" />
          <span>Кресло:</span>
        </div>
        <button
          type="button"
          onClick={() => onChairSelect("all")}
          className={`min-h-[32px] px-2.5 py-1 text-xs rounded-full transition-colors shrink-0 cursor-pointer ${
            selectedChairId === "all"
              ? "bg-[var(--teal,#0d9488)] text-white font-medium shadow-xs"
              : "bg-[var(--line)]/40 hover:bg-[var(--line)]/70 text-[var(--ink)]"
          }`}
        >
          {`Все кресла (${chairs.length})`}
        </button>
        {chairs.map((chair) => (
          <button
            key={chair.id}
            type="button"
            onClick={() => onChairSelect(chair.id)}
            className={`min-h-[32px] px-2.5 py-1 text-xs rounded-full transition-colors shrink-0 cursor-pointer ${
              selectedChairId === chair.id
                ? "bg-[var(--teal,#0d9488)] text-white font-medium shadow-xs"
                : "bg-[var(--line)]/40 hover:bg-[var(--line)]/70 text-[var(--ink)]"
            }`}
          >
            {`${chair.name} (${chair.specialty.split("/")[0]?.trim()})`}
          </button>
        ))}
      </div>

      {/* ПРАВАЯ СЕКЦИЯ: СМЕНА И ДЕЖУРНЫЙ ВРАЧ (МАНДАТ 8n: СОЛО-ВРАЧ БЕЗ АССИСТЕНТОВ) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* ПЕРЕКЛЮЧАТЕЛЬ СМЕНЫ */}
        <div className="flex items-center gap-1 bg-[var(--line)]/30 p-0.5 rounded-lg border border-[var(--line)] text-xs">
          <Clock className="w-3 h-3 text-[var(--muted)] ml-1.5 hidden sm:inline" />
          {CHAIR_SHIFT_OPTIONS.map((shift) => (
            <button
              key={shift.id}
              type="button"
              onClick={() => onShiftSelect(shift.id)}
              title={shift.hours}
              className={`px-2 py-0.5 rounded-md transition-colors text-[11px] font-medium cursor-pointer ${
                selectedShift === shift.id
                  ? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {shift.label}
            </button>
          ))}
        </div>

        {/* ДЕЖУРНЫЙ ВРАЧ (СОЛО-ПРАКТИКА ПО УМОЛЧАНИЮ) */}
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
          <select
            value={selectedDoctor}
            onChange={(e) => onDoctorSelect(e.target.value)}
            className="px-2 py-1 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] cursor-pointer"
          >
            {DOCTOR_OPTIONS.map((doc) => (
              <option key={doc} value={doc}>
                {doc}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ChairShiftSelector;
