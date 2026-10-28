/**
 * WaitlistHeader.tsx — Шапка, плашка освободившегося слота и табы листа ожидания DENTE
 * (Мандат 8b: <= 300 строк; Apple HIG: Drag Handle & Touch targets).
 */

import React, { type ReactElement } from "react";
import { Zap, Target, Users } from "lucide-react";
import type { TargetSlotInfo } from "./waitlistTypes";

export interface WaitlistHeaderProps {
  titleId: string;
  targetSlot?: TargetSlotInfo | null;
  rankedCandidatesCount: number;
  itemsCount: number;
  matchedCount: number;
  activeTab: "smart_match" | "all_patients" | "add_new";
  setActiveTab: (tab: "smart_match" | "all_patients" | "add_new") => void;
  onClose: () => void;
}

export function WaitlistHeader(props: WaitlistHeaderProps): ReactElement {
  const {
    titleId,
    targetSlot,
    rankedCandidatesCount,
    itemsCount,
    matchedCount,
    activeTab,
    setActiveTab,
    onClose,
  } = props;

  return (
    <>
      {/* Мобильный тактильный Drag Handle по Apple HIG (36x5px) */}
      <div className="md:hidden flex justify-center pt-2 pb-1">
        <div className="w-9 h-1.5 rounded-full bg-[var(--line,#cbd5e1)] opacity-70" />
      </div>

      {/* ШАПКА */}
      <header className="px-5 py-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between shrink-0">
        <div>
          <h2 id={titleId} className="text-lg font-bold tracking-tight text-[var(--text,#0f172a)]">
            Лист ожидания и быстрая запись
          </h2>
          <p className="text-xs text-[var(--text-muted,#64748b)] mt-0.5">
            {targetSlot
              ? `Подбор пациентов под освободившееся окно (${rankedCandidatesCount})`
              : `Пациенты в очереди клиники (${itemsCount})`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)] transition-colors text-lg font-light cursor-pointer"
          style={{ border: "none", background: "transparent" }}
          aria-label="Закрыть лист ожидания"
        >
          ✕
        </button>
      </header>

      {/* ПЛАШКА ЦЕЛЕВОГО СЛОТА (ЕСЛИ ОТКРЫТО ДЛЯ ЗАПОЛНЕНИЯ ОКНА) */}
      {targetSlot && (
        <div className="px-5 py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--badge-teal-bg,rgba(13,148,136,0.08))] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Zap size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
            <div className="truncate">
              <span className="text-xs font-semibold text-[var(--teal,#0d9488)] uppercase tracking-wide block">
                Освободившееся окно для записи
              </span>
              <span className="text-xs font-medium text-[var(--text,#0f172a)] truncate block">
                {new Date(targetSlot.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {targetSlot.doctorName ? ` • ${targetSlot.doctorName}` : ""}
                {targetSlot.chairName ? ` • ${targetSlot.chairName}` : ""}
              </span>
            </div>
          </div>
          {matchedCount > 0 && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--teal,#0d9488)] text-white whitespace-nowrap">
              {matchedCount} совпад.
            </span>
          )}
        </div>
      )}

      {/* НАВИГАЦИОННЫЕ ВКЛАДКИ */}
      <div className="px-5 pt-3 pb-2 flex gap-2 border-b border-[var(--line,#e2e8f0)] shrink-0 overflow-x-auto">
        {targetSlot && (
          <button
            type="button"
            onClick={() => setActiveTab("smart_match")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "smart_match"
                ? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
                : "bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)]"
            }`}
          >
            <Target size={13} className="shrink-0" />
            <span>Подбор на окно</span>
            <span className="opacity-80 text-[10px]">({rankedCandidatesCount})</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab("all_patients")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "all_patients"
              ? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
              : "bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)]"
          }`}
        >
          <Users size={13} className="shrink-0" />
          <span>Все в очереди</span>
          <span className="opacity-80 text-[10px]">({itemsCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("add_new")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5 whitespace-nowrap ml-auto shrink-0 ${
            activeTab === "add_new"
              ? "bg-[var(--teal,#0d9488)] text-white shadow-sm"
              : "bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)]"
          }`}
        >
          <span className="hidden sm:inline">+ Добавить пациента</span>
          <span className="sm:hidden">+ Запись</span>
        </button>
      </div>
    </>
  );
}
