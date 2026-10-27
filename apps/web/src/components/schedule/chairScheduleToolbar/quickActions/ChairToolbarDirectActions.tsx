import React from "react";
import { Plus, Search, UserPlus, Users } from "lucide-react";
import type { ChairScheduleToolbarProps } from "../types";

export function ChairToolbarDirectActions({
  onOpenDoctorFreeSlots,
  onOpenRosterModal,
  setIsAddDoctorOpen,
  handleOpenAddChair,
}: ChairScheduleToolbarProps) {
  return (
    <>
      {/* 1-Click Slot Finder Direct Button (visible on 2xl) */}
      {onOpenDoctorFreeSlots && (
        <button
          type="button"
          onClick={onOpenDoctorFreeSlots}
          className="secondary-button hidden 2xl:inline-flex"
          title="Интеллектуальный подбор свободных окон у врачей клиники"
          data-testid="chair-toolbar-find-slots-btn"
        >
          <Search size={14} className="text-[var(--teal)] shrink-0" />
          <span>Подобрать окно</span>
        </button>
      )}

      {/* Roster Button (visible on 2xl+) */}
      {onOpenRosterModal && (
        <button
          type="button"
          onClick={onOpenRosterModal}
          className="secondary-button hidden 2xl:inline-flex"
          title="График работы врачей по сменам и креслам"
          data-testid="btn-open-chair-roster"
        >
          <Users size={14} className="text-[var(--teal)]" />
          <span>График смен</span>
        </button>
      )}

      {/* Add Doctor Button (visible on 2xl+) */}
      <button
        type="button"
        onClick={() => setIsAddDoctorOpen(true)}
        className="secondary-button hidden 2xl:inline-flex"
        title="Быстро добавить врача в расписание (+ Врач)"
        data-testid="btn-chair-view-add-doctor"
      >
        <UserPlus size={14} className="text-[var(--teal)]" />
        <span>Врач</span>
      </button>

      {/* Add Chair Button */}
      <button
        type="button"
        onClick={handleOpenAddChair}
        className="primary-button"
        title="Добавить стоматологическую установку"
        data-testid="btn-add-chair-header"
      >
        <Plus size={14} className="shrink-0 stroke-[2.5]" />
        <span className="hidden sm:inline">Кресло</span>
      </button>
    </>
  );
}
