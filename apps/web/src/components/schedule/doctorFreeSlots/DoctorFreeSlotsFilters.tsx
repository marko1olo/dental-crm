import React from "react";
import { Armchair, Calendar, Clock, Sun, User } from "lucide-react";
import type { DentalSpecialty } from "@dental/shared";
import { specialtyLabels } from "../../../workspaceUiLabels";
import type { useDoctorFreeSlotsController } from "./useDoctorFreeSlotsController";

export interface DoctorFreeSlotsFiltersProps {
  ctrl: ReturnType<typeof useDoctorFreeSlotsController>;
}

export function DoctorFreeSlotsFilters({ ctrl }: DoctorFreeSlotsFiltersProps) {
  const {
    activeRangeLabel, setActiveRangeLabel, setStartDateOffsetDays, setHorizonDays,
    selectedDoctorId, setSelectedDoctorId, staffDoctors, clinicChairs,
    selectedChairId, setSelectedChairId, durationMinutes, setDurationMinutes,
    timeOfDayFilter, setTimeOfDayFilter,
  } = ctrl;

  return (
    <div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-3.5">
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
          <Calendar size={13} className="text-[var(--teal,var(--brand-primary))]" />
          Диапазон поиска:
        </span>
        <div className="dente-filter-chips overflow-x-auto pb-1 scrollbar-none">
          {[
            { label: "Сегодня", offset: 0, horizon: 1 },
            { label: "Завтра", offset: 1, horizon: 1 },
            { label: "Ближайшие 3 дня", offset: 0, horizon: 3 },
            { label: "На этой неделе", offset: 0, horizon: 7 },
            { label: "+ Через 14 дней", offset: 14, horizon: 7 },
            { label: "+ Через 1 месяц (30 дн.)", offset: 30, horizon: 7 },
          ].map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => {
                setActiveRangeLabel(r.label);
                setStartDateOffsetDays(r.offset);
                setHorizonDays(r.horizon);
              }}
              className={`dente-filter-chip ${activeRangeLabel === r.label ? "active" : ""}`}
              data-testid={`quick-range-btn-${r.offset}-${r.horizon}`}
            >
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
          <User size={13} className="text-[var(--teal,var(--brand-primary))]" />
          Врач:
        </span>
        <div className="dente-filter-chips overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedDoctorId("")}
            className={`dente-filter-chip ${selectedDoctorId === "" ? "active" : ""}`}
            data-testid="filter-doc-any"
          >
            Любой врач клиники
          </button>
          {staffDoctors.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedDoctorId(doc.id)}
              className={`dente-filter-chip ${selectedDoctorId === doc.id ? "active" : ""}`}
              data-testid={`filter-doc-${doc.id}`}
            >
              {doc.fullName}
              {doc.specialties?.[0] && (
                <span className={`ml-1 font-normal ${selectedDoctorId === doc.id ? "opacity-85" : "opacity-75"}`}>
                  ({specialtyLabels[doc.specialties[0] as DentalSpecialty] || doc.specialties[0]})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {clinicChairs.length > 1 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
            <Armchair size={13} className="text-[var(--teal,var(--brand-primary))]" />
            Установка / Кресло:
          </span>
          <div className="dente-filter-chips overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedChairId("")}
              className={`dente-filter-chip ${selectedChairId === "" ? "active" : ""}`}
              data-testid="filter-chair-any"
            >
              Любое свободное кресло
            </button>
            {clinicChairs.map((chair) => (
              <button
                key={chair.id}
                type="button"
                onClick={() => setSelectedChairId(chair.id)}
                className={`dente-filter-chip ${selectedChairId === chair.id ? "active" : ""}`}
                data-testid={`filter-chair-${chair.id}`}
              >
                {chair.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-[var(--muted,#64748b)] flex items-center gap-1">
            <Clock size={13} className="text-[var(--teal,var(--brand-primary))]" /> Длительность приёма:
          </span>
          <div className="dente-segmented-bar w-full flex">
            {[15, 30, 45, 60, 90, 120].map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setDurationMinutes(dur)}
                className={`dente-segmented-item flex-1 ${durationMinutes === dur ? "active" : ""}`}
                data-testid={`duration-chip-${dur}`}
              >
                {dur}м
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-[var(--muted,#64748b)] flex items-center gap-1">
            <Sun size={13} className="text-[var(--teal,var(--brand-primary))]" /> Время суток:
          </span>
          <div className="dente-segmented-bar w-full flex">
            {(
              [
                { id: "all", label: "Все" },
                { id: "morning", label: "Утро" },
                { id: "day", label: "День" },
                { id: "evening", label: "Вечер" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeOfDayFilter(t.id)}
                className={`dente-segmented-item flex-1 ${timeOfDayFilter === t.id ? "active" : ""}`}
                data-testid={`tod-filter-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
