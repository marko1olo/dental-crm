import React from "react";
import { Activity, CalendarDays, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { PATIENT_SHIFT_QUEUE_TABS_META, type PatientShiftQueueTab } from "@dental/shared";

export function TodayQueueTabsNav({
  activeTab,
  setActiveTab,
  counts,
}: {
  activeTab: PatientShiftQueueTab;
  setActiveTab: (tab: PatientShiftQueueTab) => void;
  counts: Record<PatientShiftQueueTab, number>;
}) {
  const tabs: PatientShiftQueueTab[] = ["all", "waiting", "in_chair", "checkout", "completed"];

  return (
    <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-1" role="tablist" aria-label="Вкладки очереди смены">
      {tabs.map((tab) => {
        const meta = PATIENT_SHIFT_QUEUE_TABS_META[tab];
        const isActive = activeTab === tab;
        const count = counts[tab];
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={`queue-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`inline-flex h-9 min-h-[36px] sm:h-9 min-h-[44px] sm:min-h-[36px] min-w-[70px] cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all select-none ${
              isActive ? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs" : "text-[var(--ink)] hover:bg-[var(--paper)]"
            }`}
            title={meta.descriptionRu}
          >
            {tab === "all" && <CalendarDays size={13} />}
            {tab === "waiting" && <Clock size={13} />}
            {tab === "in_chair" && <Activity size={13} />}
            {tab === "checkout" && <CreditCard size={13} />}
            {tab === "completed" && <CheckCircle2 size={13} />}
            <span>{meta.shortLabelRu}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/30 text-white" : "bg-[var(--line)] text-[var(--muted)]"}`}>
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
