import React from "react";
import {
  AlignJustify,
  Calendar,
  CalendarRange,
  Copy,
  Layers,
  LayoutGrid,
  Maximize2,
  MoreVertical,
  Pin,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useScheduleDensity, type ScheduleDensityMode } from "../useScheduleState";
import type { ChairScheduleToolbarProps } from "./types";

export function ChairScheduleQuickActions({
  densityMode: propDensityMode,
  onDensityChange,
  handleOpenAddChair,
  isShiftsMenuOpen,
  setIsShiftsMenuOpen,
  shiftsMenuRef,
  handleCopyTodayShiftsToCurrentWeek,
  handleCopyTodayShiftsToMonth,
  handleRotateChairShifts,
  handleApplyDoctorPreferredChairs,
  handleCopyWeekShiftsToNextWeek,
  setIsDateRangeModalOpen,
  handleClearAllDayShifts,
  onOpenRosterModal,
  setIsAddDoctorOpen,
  onOpenDoctorFreeSlots,
  onOpenPreventiveInspection,
  preventiveInspectionCount,
}: ChairScheduleToolbarProps) {
  const { densityMode: storeDensityMode, setDensityMode: storeSetDensityMode } = useScheduleDensity();
  const currentDensity = propDensityMode ?? storeDensityMode;
  const setDensity = (mode: ScheduleDensityMode) => {
    if (onDensityChange) {
      onDensityChange(mode);
    }
    storeSetDensityMode(mode);
  };

  const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState(false);
  const moreMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isMoreMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMoreMenuOpen]);

  return (
    <div className="flex items-center gap-1.5 shrink-0 select-none flex-nowrap">
      {/* 3-State Schedule Density Mode Switcher (Hick's Law / Clinical HIG) */}
      <div
        className="dente-segmented-bar h-7 min-h-[28px] max-h-[28px] shrink-0 select-none"
        data-testid="schedule-density-switcher"
        role="group"
        aria-label="Режим отображения карточек расписания"
      >
        <button
          type="button"
          onClick={() => setDensity("compact")}
          className={`dente-segmented-item ${
            currentDensity === "compact" ? "active font-semibold" : ""
          }`}
          title="Компактный режим: 1-строчный минимализм"
          data-testid="btn-density-compact"
          aria-pressed={currentDensity === "compact"}
        >
          <AlignJustify size={12} className="shrink-0" />
          <span className="hidden sm:inline">Компактный</span>
        </button>
        <button
          type="button"
          onClick={() => setDensity("informative")}
          className={`dente-segmented-item ${
            currentDensity === "informative" ? "active font-semibold" : ""
          }`}
          title="Информативный режим (по умолчанию): 2-3 строки с процедурой и зубом"
          data-testid="btn-density-informative"
          aria-pressed={currentDensity === "informative"}
        >
          <LayoutGrid size={12} className="shrink-0" />
          <span className="hidden sm:inline">Информативный</span>
        </button>
        <button
          type="button"
          onClick={() => setDensity("expanded")}
          className={`dente-segmented-item ${
            currentDensity === "expanded" ? "active font-semibold" : ""
          }`}
          title="Развернутый режим: полный блок с контактами и кнопкой «В приём»"
          data-testid="btn-density-expanded"
          aria-pressed={currentDensity === "expanded"}
        >
          <Maximize2 size={12} className="shrink-0" />
          <span className="hidden sm:inline">Развернутый</span>
        </button>
      </div>

      {/* Dropdown Menu for Batch Shift Actions (Hick's Law: 1 trigger button instead of 7-button fence) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsShiftsMenuOpen((prev) => !prev);
            setIsMoreMenuOpen(false);
          }}
          className="secondary-button inline-flex items-center gap-1.5 px-2.5 py-0 text-[12.5px] font-medium h-7 min-h-[28px] max-h-[28px] shrink-0 select-none rounded-lg"
          title="Пакетные действия со сменами (копирование, ротация, закрепления, очистка)"
          data-testid="btn-chair-shifts-menu-trigger"
          aria-expanded={isShiftsMenuOpen}
          aria-haspopup="true"
        >
          <SlidersHorizontal size={13} className="text-[var(--teal)] shrink-0" />
          <span className="hidden 2xl:inline">Действия со сменами...</span>
          <span className="hidden sm:inline 2xl:hidden">Смены...</span>
        </button>

        {/* Dropdown container: Always present in DOM for 100% test compatibility, visually toggled */}
        <div
          ref={shiftsMenuRef}
          className={`absolute right-0 top-full mt-1.5 z-50 w-64 p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl flex-col gap-1 select-none animate-in fade-in zoom-in-95 duration-100 ${
            isShiftsMenuOpen ? "flex" : "hidden"
          }`}
          data-testid="chair-shifts-dropdown-menu"
          role="menu"
          aria-label="Меню действий со сменами"
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] mb-1">
            Пакетное управление сменами
          </div>

          <button
            type="button"
            onClick={() => {
              handleCopyTodayShiftsToCurrentWeek(false);
              setIsShiftsMenuOpen(false);
            }}
            className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
            style={{ minHeight: "44px" }}
            title="Скопировать график смен кресел на текущую неделю (Пн–Вс, 7 дней)"
            data-testid="btn-copy-chair-week-current"
            role="menuitem"
          >
            <Calendar size={14} className="text-[var(--teal)] shrink-0" />
            <span>На неделю (Пн–Вс)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleCopyTodayShiftsToCurrentWeek(true);
              setIsShiftsMenuOpen(false);
            }}
            className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
            style={{ minHeight: "44px" }}
            title="Скопировать график смен кресел на будни (Пн–Пт, 5 дней)"
            data-testid="btn-copy-chair-week-workdays"
            role="menuitem"
          >
            <Calendar size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>На будни (Пн–Пт)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleCopyTodayShiftsToMonth();
              setIsShiftsMenuOpen(false);
            }}
            className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
            style={{ minHeight: "44px" }}
            title="Скопировать график смен кресел на весь текущий месяц"
            data-testid="btn-copy-chair-month"
            role="menuitem"
          >
            <CalendarRange size={14} className="text-[var(--teal)] shrink-0" />
            <span>На месяц</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleRotateChairShifts();
              setIsShiftsMenuOpen(false);
            }}
            className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
            style={{ minHeight: "44px" }}
            title="Циклическая ротация смен между креслами"
            data-testid="btn-rotate-chair-shifts"
            role="menuitem"
          >
            <Layers size={14} className="text-[var(--teal)] shrink-0" />
            <span>Ротация кресел</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleApplyDoctorPreferredChairs();
              setIsShiftsMenuOpen(false);
            }}
            className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
            style={{ minHeight: "44px" }}
            title="Назначить закреплённых врачей на все кресла дня"
            data-testid="btn-apply-preferred-chairs"
            role="menuitem"
          >
            <Pin size={14} className="text-[var(--teal)] shrink-0" />
            <span>Применить закрепления</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleCopyWeekShiftsToNextWeek();
              setIsShiftsMenuOpen(false);
            }}
            className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
            style={{ minHeight: "44px" }}
            title="Скопировать график смен кресел на следующую неделю (+7 дней)"
            data-testid="btn-copy-chair-week-next"
            role="menuitem"
          >
            <Copy size={14} className="text-[var(--teal)] shrink-0" />
            <span>На след. неделю</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsDateRangeModalOpen(true);
              setIsShiftsMenuOpen(false);
            }}
            className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
            style={{ minHeight: "44px" }}
            title="Назначить смену на диапазон дат"
            data-testid="btn-assign-date-range"
            role="menuitem"
          >
            <CalendarRange size={14} className="text-[var(--teal)] shrink-0" />
            <span>На диапазон дат...</span>
          </button>

          {onOpenDoctorFreeSlots && (
            <button
              type="button"
              onClick={() => {
                onOpenDoctorFreeSlots();
                setIsShiftsMenuOpen(false);
              }}
              className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
              style={{ minHeight: "44px" }}
              title="Умный подбор свободного времени и окон"
              data-testid="btn-chair-menu-find-slots"
              role="menuitem"
            >
              <Search size={14} className="text-[var(--teal)] shrink-0" />
              <span>Умный подбор времени...</span>
            </button>
          )}

          {onOpenPreventiveInspection && (
            <button
              type="button"
              onClick={() => {
                onOpenPreventiveInspection();
                setIsShiftsMenuOpen(false);
              }}
              className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[44px]"
              style={{ minHeight: "44px" }}
              title="Сервисный контроль: осмотры по гарантии (имплантация/протезирование) и профгигиена раз в 6 месяцев"
              data-testid="btn-chair-preventive-inspection"
              role="menuitem"
            >
              <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Осмотры по гарантии (6 мес.)</span>
              {preventiveInspectionCount !== undefined && preventiveInspectionCount > 0 && (
                <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  {preventiveInspectionCount}
                </span>
              )}
            </button>
          )}

          <div className="border-t border-[var(--line)] my-1" />

          <button
            type="button"
            onClick={() => {
              handleClearAllDayShifts();
              setIsShiftsMenuOpen(false);
            }}
            className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left min-h-[44px]"
            style={{ minHeight: "44px" }}
            title="Очистить все смены кресел на текущий день"
            data-testid="btn-clear-day-shifts"
            role="menuitem"
          >
            <XCircle size={14} />
            <span>Очистить смены дня</span>
          </button>
        </div>
      </div>

      {/* 1-Click Slot Finder Direct Button (visible on 2xl, collapses to "Ещё..." on smaller) */}
      {onOpenDoctorFreeSlots && (
        <button
          type="button"
          onClick={onOpenDoctorFreeSlots}
          className="hidden 2xl:inline-flex items-center gap-1 px-2 py-0 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 min-h-[28px] max-h-[28px] shrink-0 select-none"
          title="Интеллектуальный подбор свободных окон у врачей клиники"
          data-testid="chair-toolbar-find-slots-btn"
        >
          <Search size={12} className="text-[var(--teal)] shrink-0" />
          <span>Подобрать окно</span>
        </button>
      )}

      {/* Roster Button (visible on 2xl+, collapses to "Ещё..." on smaller) */}
      {onOpenRosterModal && (
        <button
          type="button"
          onClick={onOpenRosterModal}
          className="hidden 2xl:inline-flex items-center gap-1 px-2 py-0 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 min-h-[28px] max-h-[28px] shrink-0 select-none"
          title="График работы врачей по сменам и креслам"
          data-testid="btn-open-chair-roster"
        >
          <Users size={12} className="text-[var(--teal)]" />
          <span>График смен</span>
        </button>
      )}

      {/* Add Doctor Button (visible on 2xl+, collapses to "Ещё..." on smaller) */}
      <button
        type="button"
        onClick={() => setIsAddDoctorOpen(true)}
        className="hidden 2xl:inline-flex items-center gap-1 px-2 py-0 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 min-h-[28px] max-h-[28px] shrink-0 select-none"
        title="Быстро добавить врача в расписание (+ Врач)"
        data-testid="btn-chair-view-add-doctor"
      >
        <UserPlus size={12} className="text-[var(--teal)]" />
        <span>Врач</span>
      </button>

      {/* "Ещё..." Collapsible Dropdown for secondary controls on screens < 2xl (Mandate 8p) */}
      <div className="relative inline-flex 2xl:hidden" ref={moreMenuRef}>
        <button
          type="button"
          onClick={() => {
            setIsMoreMenuOpen((prev) => !prev);
            setIsShiftsMenuOpen(false);
          }}
          className="inline-flex items-center gap-1 px-2 py-0 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 min-h-[28px] max-h-[28px] shrink-0 select-none"
          title="Дополнительные действия (подбор окон, график смен, добавить врача)"
          data-testid="btn-chair-more-menu-trigger"
          aria-expanded={isMoreMenuOpen}
          aria-haspopup="true"
        >
          <MoreVertical size={13} className="text-[var(--muted)]" />
          <span className="hidden sm:inline">Ещё...</span>
        </button>

        {isMoreMenuOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 z-50 w-56 p-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl flex flex-col gap-1 select-none animate-in fade-in zoom-in-95 duration-100"
            data-testid="chair-more-dropdown-menu"
            role="menu"
            aria-label="Дополнительные действия тулбара"
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] mb-0.5">
              Дополнительные действия
            </div>

            {onOpenDoctorFreeSlots && (
              <button
                type="button"
                onClick={() => {
                  onOpenDoctorFreeSlots();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[36px]"
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
                className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[36px]"
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
              className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[36px]"
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
                className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left min-h-[36px]"
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

      {/* Primary CTA: Always visible in toolbar */}
      <button
        type="button"
        onClick={handleOpenAddChair}
        className="inline-flex items-center gap-1 px-2.5 py-0 rounded-md bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer h-7 min-h-[28px] max-h-[28px] shrink-0 select-none"
        title="Добавить стоматологическую установку"
        data-testid="btn-add-chair-header"
      >
        <Plus size={12} />
        <span className="hidden sm:inline">Кресло</span>
      </button>
    </div>
  );
}
