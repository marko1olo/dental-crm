import React from "react";
import { Monitor, RotateCcw, Search } from "lucide-react";
import type { PatientShiftQueueTab } from "@dental/shared";
import { TodayQueueTabsNav } from "./TodayQueueTabsNav";

export interface TodayQueueToolbarProps {
  activeTab: PatientShiftQueueTab;
  setActiveTab: (tab: PatientShiftQueueTab) => void;
  counts: Record<PatientShiftQueueTab, number>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  doctorFilter: string | null;
  setDoctorFilter: (id: string | null) => void;
  chairFilter: string | null;
  setChairFilter: (id: string | null) => void;
  staffList: Array<{ id: string; name?: string; fullName?: string }>;
  chairsList: Array<{ id: string; name?: string; title?: string }>;
  setShowLobbyBillboard: (show: boolean) => void;
}

export function TodayQueueToolbar({
  activeTab,
  setActiveTab,
  counts,
  searchQuery,
  setSearchQuery,
  doctorFilter,
  setDoctorFilter,
  chairFilter,
  setChairFilter,
  staffList,
  chairsList,
  setShowLobbyBillboard,
}: TodayQueueToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <TodayQueueTabsNav activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} />

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative flex items-center">
          <Search size={14} className="pointer-events-none absolute left-2.5 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Поиск по очереди..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 min-h-[36px] min-h-[44px] sm:min-h-[36px] w-40 rounded-xl border border-[var(--line)] bg-[var(--paper)] pl-8 pr-2.5 text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-hidden sm:w-48 transition-colors"
          />
        </div>

        {staffList.length > 0 && (
          <select
            value={doctorFilter || ""}
            onChange={(e) => setDoctorFilter(e.target.value || null)}
            className="h-9 min-h-[36px] min-h-[44px] sm:min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs text-[var(--ink)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-colors"
            title="Фильтр по врачу"
          >
            <option value="">Все врачи</option>
            {staffList.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.name || doc.fullName || "Врач"}</option>
            ))}
          </select>
        )}

        {chairsList.length > 0 && (
          <select
            value={chairFilter || ""}
            onChange={(e) => setChairFilter(e.target.value || null)}
            className="h-9 min-h-[36px] min-h-[44px] sm:min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs text-[var(--ink)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-colors"
            title="Фильтр по креслу"
          >
            <option value="">Все кабинеты</option>
            {chairsList.map((chair) => (
              <option key={chair.id} value={chair.id}>{chair.name || chair.title || "Кабинет"}</option>
            ))}
          </select>
        )}

        {(doctorFilter || chairFilter || searchQuery) && (
          <button
            type="button"
            onClick={() => { setDoctorFilter(null); setChairFilter(null); setSearchQuery(""); }}
            className="inline-flex h-9 min-h-[36px] min-h-[44px] sm:min-h-[36px] items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--paper-soft)] hover:text-[var(--ink)] cursor-pointer select-none transition-colors"
            title="Сбросить фильтры"
          >
            <RotateCcw size={12} />
            <span>Сброс</span>
          </button>
        )}

        <button
          type="button"
          data-testid="queue-toggle-tv-billboard-btn"
          onClick={() => setShowLobbyBillboard(true)}
          className="inline-flex h-9 min-h-[36px] min-h-[44px] sm:min-h-[36px] items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer select-none transition-colors shadow-2xs"
          title="Открыть ТВ-табло холла для пациентов"
        >
          <Monitor size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
          <span>ТВ-табло холла</span>
        </button>
      </div>
    </div>
  );
}
