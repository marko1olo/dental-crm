import React from "react";
import { MoreVertical, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import type { ChairScheduleToolbarProps } from "../types";

export interface ChairToolbarMoreDropdownProps {
  props: ChairScheduleToolbarProps;
  isMoreMenuOpen: boolean;
  setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  moreMenuRef: React.RefObject<HTMLDivElement | null>;
  onBeforeOpen?: () => void;
}

export function ChairToolbarMoreDropdown({
  props,
  isMoreMenuOpen,
  setIsMoreMenuOpen,
  moreMenuRef,
  onBeforeOpen,
}: ChairToolbarMoreDropdownProps) {
  const {
    onOpenDoctorFreeSlots,
    onOpenRosterModal,
    setIsAddDoctorOpen,
    onOpenPreventiveInspection,
  } = props;

  const itemClass = "w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px]";

  return (
    <div className="relative inline-flex 2xl:hidden" ref={moreMenuRef}>
      <button
        type="button"
        onClick={() => {
          setIsMoreMenuOpen((prev) => !prev);
          onBeforeOpen?.();
        }}
        className="secondary-button"
        title="Дополнительные действия (подбор окон, график смен, добавить врача)"
        data-testid="btn-chair-more-menu-trigger"
        aria-expanded={isMoreMenuOpen}
        aria-haspopup="true"
      >
        <MoreVertical size={14} className="text-[var(--muted)]" />
        <span className="hidden sm:inline">Ещё...</span>
      </button>

      {isMoreMenuOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 w-56 p-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
          data-testid="chair-more-dropdown-menu"
          role="menu"
          aria-label="Дополнительные действия тулбара"
        >
          <div className="px-2 py-1 text-[11px] font-semibold text-[var(--muted)] border-b border-[var(--line)] mb-0.5">
            Дополнительные действия
          </div>

          {onOpenDoctorFreeSlots && (
            <button
              type="button"
              onClick={() => {
                onOpenDoctorFreeSlots();
                setIsMoreMenuOpen(false);
              }}
              className={itemClass}
              data-testid="btn-more-find-slots"
              role="menuitem"
            >
              <Search size={14} className="text-[var(--teal)] shrink-0" />
              <span>Подобрать окно</span>
            </button>
          )}

          {onOpenRosterModal && (
            <button
              type="button"
              onClick={() => {
                onOpenRosterModal();
                setIsMoreMenuOpen(false);
              }}
              className={itemClass}
              data-testid="btn-more-open-roster"
              role="menuitem"
            >
              <Users size={14} className="text-[var(--teal)] shrink-0" />
              <span>График смен</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsAddDoctorOpen(true);
              setIsMoreMenuOpen(false);
            }}
            className={itemClass}
            data-testid="btn-more-add-doctor"
            role="menuitem"
          >
            <UserPlus size={14} className="text-[var(--teal)] shrink-0" />
            <span>Добавить врача</span>
          </button>

          {onOpenPreventiveInspection && (
            <button
              type="button"
              onClick={() => {
                onOpenPreventiveInspection();
                setIsMoreMenuOpen(false);
              }}
              className={itemClass}
              data-testid="btn-more-preventive"
              role="menuitem"
            >
              <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Осмотры по гарантии</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
