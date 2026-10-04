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
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import type { Dashboard } from "@dental/shared";
import { countLabel } from "../../lib/russianPlural";
import type { ScheduleChair } from "./ScheduleFilterStrip";
import {
  formatDoctorShortName,
  type ChairDoctorShiftAssignment,
} from "./ScheduleGrid";
import type { QuickAddChairData } from "./QuickAddChairModal";
import { ChairShiftPopover } from "./ChairShiftPopover";
import { useScheduleDensity, type ScheduleDensityMode } from "./useScheduleState";

export interface ChairScheduleToolbarProps {
  densityMode?: ScheduleDensityMode;
  onDensityChange?: ((mode: ScheduleDensityMode) => void) | undefined;
  chairs: ScheduleChair[];
  isSoloDoctor: boolean;
  rawBranches: any[];
  hasMultipleBranches: boolean;
  selectedBranchId?: string | null | undefined;
  onSelectBranch?: ((branchId: string | null) => void) | undefined;
  effectiveSelectedChairId: string | null;
  handleToggleChairFilter: (chairId: string) => void;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  dashboard: Dashboard;
  activeShiftChairId: string | null;
  setActiveShiftChairId: React.Dispatch<React.SetStateAction<string | null>>;
  handleEditChair: (chair: QuickAddChairData) => void;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  doctors: Array<{ id: string; fullName: string; specialty?: any }>;
  popoverSelectedDocId: Record<string, string>;
  setPopoverSelectedDocId: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  dateKey: string;
  onAssignChairDoctor?: ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void) | undefined;
  handleAssignShift: (chair: ScheduleChair, preset: any) => void;
  handleUnassignShift: (chair: ScheduleChair) => void;
  handleDuplicateChair: (chair: ScheduleChair) => void;
  isSubstituteOpen: Record<string, boolean>;
  setIsSubstituteOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleQuickSubstituteDoctor: (chair: ScheduleChair, substituteDocId: string) => void;
  handleOpenAddChair: () => void;
  isShiftsMenuOpen: boolean;
  setIsShiftsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shiftsMenuRef: React.RefObject<HTMLDivElement | null>;
  handleCopyTodayShiftsToCurrentWeek: (workdaysOnly?: boolean) => void;
  handleCopyTodayShiftsToMonth: () => void;
  handleRotateChairShifts: () => void;
  handleApplyDoctorPreferredChairs: () => void;
  handleCopyWeekShiftsToNextWeek: () => void;
  setIsDateRangeModalOpen: (open: boolean) => void;
  handleClearAllDayShifts: () => void;
  onOpenRosterModal?: (() => void) | undefined;
  setIsAddDoctorOpen: (open: boolean) => void;
  onOpenDoctorFreeSlots?: (() => void) | undefined;
  onOpenPreventiveInspection?: (() => void) | undefined;
  preventiveInspectionCount?: number | undefined;
}

export function ChairScheduleToolbar({
  densityMode: propDensityMode,
  onDensityChange,
  chairs,
  isSoloDoctor,
  rawBranches,
  hasMultipleBranches,
  selectedBranchId,
  onSelectBranch,
  effectiveSelectedChairId,
  handleToggleChairFilter,
  chairDoctorAssignments,
  dashboard,
  activeShiftChairId,
  setActiveShiftChairId,
  handleEditChair,
  popoverRef,
  doctors,
  popoverSelectedDocId,
  setPopoverSelectedDocId,
  dateKey,
  onAssignChairDoctor,
  handleAssignShift,
  handleUnassignShift,
  handleDuplicateChair,
  isSubstituteOpen,
  setIsSubstituteOpen,
  handleQuickSubstituteDoctor,
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
    <div
      className="flex items-center justify-between px-3 h-9 min-h-[36px] max-h-[36px] border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-2 select-none flex-nowrap"
      data-testid="chair-schedule-palette-strip"
      role="toolbar"
      aria-label="Панель стоматологических установок и смен врачей"
    >
      {/* Left: Установки Counter */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] hidden xl:inline">
          Стоматологические установки:
        </span>
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--teal)]/10 text-[var(--teal-dark)] border border-[var(--teal)]/20 shrink-0"
          data-testid="chair-view-count-badge"
        >
          {countLabel(chairs.length || 1, "кресло", "кресла", "кресел")}
        </span>
        {chairs.length > 3 && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] shrink-0"
            title={`Всего установок: ${chairs.length}. Все установки доступны в полосе фильтров`}
          >
            +{chairs.length - 3}
          </span>
        )}
        {isSoloDoctor && (
          <span className="text-[10px] text-[var(--muted)] hidden 2xl:inline">
            (Соло: авто-привязка)
          </span>
        )}

        {/* Auto-hide branch selector when branches <= 1 (Mandate 8n Solo Doctor / Small Clinic Sovereignty) */}
        {hasMultipleBranches && (
          <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-[var(--line)] shrink-0">
            <span className="text-[10px] text-[var(--muted)] font-medium hidden lg:inline">Филиал:</span>
            <select
              value={selectedBranchId || ""}
              onChange={(e) => onSelectBranch?.(e.target.value || null)}
              className="text-[11px] h-6 px-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium cursor-pointer hover:border-[var(--teal)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] transition-colors"
              data-testid="chair-view-branch-select"
              aria-label="Выбор филиала клиники"
            >
              <option value="">Все филиалы</option>
              {rawBranches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center: Scrollable Chair Palette Chips with Accent Bars (StomX Parity, Feature 190) */}
      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5 touch-pan-x scrollbar-none min-w-0 flex-nowrap whitespace-nowrap">
        {chairs.map((chair) => {
          const chairColor = (chair as { color?: string }).color || "var(--teal, #0d9488)";
          const isSelected = effectiveSelectedChairId === chair.id;
          const currentAssignment = chairDoctorAssignments?.[chair.id];
          const subShifts = currentAssignment?.subShifts;
          const hasTwoSubShifts = Boolean(subShifts && subShifts.length >= 2);
          const morningSub = hasTwoSubShifts ? subShifts![0] : null;
          const eveningSub = hasTwoSubShifts ? subShifts![1] : null;

          const assignedDocName =
            currentAssignment?.doctorName ||
            ((chair as any).defaultDoctorId
              ? dashboard?.clinicSettings?.staff?.find(
                  (s) => s.id === (chair as any).defaultDoctorId,
                )?.fullName
              : null);
          const assignedShiftLabel =
            currentAssignment?.shiftLabel ||
            currentAssignment?.shiftHours ||
            null;
          const roomLabel =
            (chair as any).roomNumber || (chair as any).room;

          return (
            <div
              key={chair.id}
              onClick={() => handleToggleChairFilter(chair.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleToggleChairFilter(chair.id);
                }
              }}
              tabIndex={0}
              className={`relative px-2 py-1 rounded-lg border text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 shrink-0 shadow-2xs transition-all cursor-pointer select-none text-left h-7 whitespace-nowrap ${
                isSelected
                  ? "border-[var(--teal)] ring-1 ring-[var(--teal)] bg-[var(--teal-soft)] shadow-sm"
                  : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)]/60"
              }`}
              data-testid={`chair-view-badge-${chair.id}`}
              role="button"
              aria-pressed={isSelected}
              title={`Кресло «${chair.name}» (${roomLabel ? `Кабинет ${roomLabel}` : "Кабинет"})${
                hasTwoSubShifts && morningSub && eveningSub
                  ? ` • Врачи: У: ${morningSub.doctorName} / В: ${eveningSub.doctorName}`
                  : assignedDocName
                    ? ` • Врач: ${assignedDocName}`
                    : ""
              }${assignedShiftLabel ? ` [${assignedShiftLabel}]` : ""}. Клик: ${
                isSelected ? "снять фильтр" : "фильтр по этому креслу"
              }`}
            >
              {/* Accent Color Strip */}
              <div
                className="h-1 w-full absolute top-0 left-0 right-0 rounded-t-lg"
                style={{ backgroundColor: chairColor }}
                data-testid={`chair-view-accent-strip-${chair.id}`}
              />
              <span
                className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
                  isSelected ? "scale-125" : ""
                }`}
                style={{ backgroundColor: chairColor }}
                aria-hidden="true"
              />
              <span
                className="font-bold text-xs whitespace-nowrap shrink-0"
                title={chair.name}
              >
                {chair.name}
              </span>
              {roomLabel && (
                <span
                  className="text-xs text-[var(--muted)] font-normal shrink-0 whitespace-nowrap"
                  data-testid={`chair-view-room-${chair.id}`}
                >
                  ({typeof roomLabel === "string" && roomLabel.startsWith("Каб") ? roomLabel : `Каб. ${roomLabel}`})
                </span>
              )}
              {(assignedDocName || hasTwoSubShifts) && (
                <span
                  className="text-xs text-[var(--muted)] font-normal whitespace-nowrap hidden xl:inline shrink-0"
                  title={
                    hasTwoSubShifts && morningSub && eveningSub
                      ? `У: ${morningSub.doctorName} / В: ${eveningSub.doctorName}`
                      : `${assignedDocName}${assignedShiftLabel ? ` • ${assignedShiftLabel}` : ""}`
                  }
                  data-testid={`chair-view-doc-${chair.id}`}
                >
                  {hasTwoSubShifts && morningSub && eveningSub
                    ? `(У: ${formatDoctorShortName(morningSub.doctorName)} / В: ${formatDoctorShortName(eveningSub.doctorName)})`
                    : `(${formatDoctorShortName(assignedDocName)})`}
                </span>
              )}
              {!assignedDocName && !hasTwoSubShifts && chair.active !== false && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveShiftChairId((prev) => (prev === chair.id ? null : chair.id));
                  }}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0 cursor-pointer hover:bg-amber-500/20 transition-colors"
                  title="Кресло свободно (врач не назначен). Нажмите для назначения смены в 1 клик"
                  data-testid={`chair-view-unstaffed-badge-${chair.id}`}
                >
                  + Врач
                </button>
              )}
              {chair.active === false && (
                <span className="text-xs text-[var(--muted)] font-normal">
                  (архив)
                </span>
              )}
              {isSelected && (
                <span
                  className="px-1.5 py-0.5 rounded text-[11px] font-extrabold bg-[var(--teal)] text-white uppercase tracking-wider"
                  data-testid={`chair-view-badge-selected-${chair.id}`}
                >
                  Выбрано
                </span>
              )}

              {/* 1-Click Doctor & Shift Binding Trigger (StomX Parity) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveShiftChairId((prev) => (prev === chair.id ? null : chair.id));
                }}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
                title="Назначить врача и смену в 1 клик"
                data-testid={`chair-view-assign-doctor-${chair.id}`}
                aria-label={`Назначить врача на кресло ${chair.name}`}
              >
                <UserCheck
                  size={13}
                  className={assignedDocName ? "text-[var(--teal)]" : ""}
                />
              </button>

              {/* Settings Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditChair(chair as any);
                }}
                className="h-6 w-6 inline-flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
                title={`Настройки кресла «${chair.name}» (смена врача / кабинета)`}
                data-testid={`chair-view-settings-${chair.id}`}
                aria-label={`Настройки кресла ${chair.name}`}
              >
                <Settings2 size={13} />
              </button>

              {/* 1-Click Shift Popover */}
              {activeShiftChairId === chair.id && (
                <ChairShiftPopover
                  chair={chair}
                  popoverRef={popoverRef}
                  onClose={() => setActiveShiftChairId(null)}
                  doctors={doctors}
                  popoverSelectedDocId={popoverSelectedDocId}
                  setPopoverSelectedDocId={setPopoverSelectedDocId}
                  chairDoctorAssignments={chairDoctorAssignments}
                  dateKey={dateKey}
                  onAssignChairDoctor={onAssignChairDoctor}
                  handleAssignShift={handleAssignShift}
                  handleUnassignShift={handleUnassignShift}
                  handleDuplicateChair={handleDuplicateChair}
                  isSubstituteOpen={isSubstituteOpen}
                  setIsSubstituteOpen={setIsSubstituteOpen}
                  handleQuickSubstituteDoctor={handleQuickSubstituteDoctor}
                />
              )}
            </div>
          );
        })}

        {/* Inline Add Chair Strip Button (Collapsed when solo doctor / 1 chair to eliminate clutter) */}
        {!isSoloDoctor && (
          <button
            type="button"
            onClick={handleOpenAddChair}
            className="h-7 px-2 rounded-lg border border-dashed border-[var(--line)] hover:border-[var(--teal)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--teal)] flex items-center gap-1 shrink-0 transition-colors cursor-pointer bg-[var(--paper)]"
            title="Добавить еще одно стоматологическое кресло"
            data-testid="chair-view-add-chair-strip-btn"
          >
            <Plus size={12} />
            <span>+ Кресло</span>
          </button>
        )}
      </div>

      {/* Right: Actions — Compact 1-Row Toolbar (Hick's Law, Apple HIG, Mandate 8d, 8p) */}
      <div className="flex items-center gap-1.5 shrink-0 select-none flex-nowrap">
        {/* 3-State Schedule Density Mode Switcher (Hick's Law / Clinical HIG) */}
        <div
          className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] h-7 min-h-[28px] max-h-[28px] shrink-0 select-none"
          data-testid="schedule-density-switcher"
          role="group"
          aria-label="Режим отображения карточек расписания"
        >
          <button
            type="button"
            onClick={() => setDensity("compact")}
            className={`h-6 px-2 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              currentDensity === "compact"
                ? "bg-[var(--teal-soft)] text-[var(--teal)] shadow-2xs border border-[var(--teal)]/40 font-bold"
                : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] border border-transparent"
            }`}
            title="Компактный режим: 1-строчный минимализм"
            data-testid="btn-density-compact"
            aria-pressed={currentDensity === "compact"}
          >
            <AlignJustify size={11} className="shrink-0" />
            <span className="hidden sm:inline">Компактный</span>
          </button>
          <button
            type="button"
            onClick={() => setDensity("informative")}
            className={`h-6 px-2 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              currentDensity === "informative"
                ? "bg-[var(--teal-soft)] text-[var(--teal)] shadow-2xs border border-[var(--teal)]/40 font-bold"
                : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] border border-transparent"
            }`}
            title="Информативный режим (по умолчанию): 2-3 строки с процедурой и зубом"
            data-testid="btn-density-informative"
            aria-pressed={currentDensity === "informative"}
          >
            <LayoutGrid size={11} className="shrink-0" />
            <span className="hidden sm:inline">Информативный</span>
          </button>
          <button
            type="button"
            onClick={() => setDensity("expanded")}
            className={`h-6 px-2 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              currentDensity === "expanded"
                ? "bg-[var(--teal-soft)] text-[var(--teal)] shadow-2xs border border-[var(--teal)]/40 font-bold"
                : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] border border-transparent"
            }`}
            title="Развернутый режим: полный блок с контактами и кнопкой «В приём»"
            data-testid="btn-density-expanded"
            aria-pressed={currentDensity === "expanded"}
          >
            <Maximize2 size={11} className="shrink-0" />
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
            className="inline-flex items-center gap-1 px-2 py-0 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 min-h-[28px] max-h-[28px] shrink-0 select-none"
            title="Пакетные действия со сменами (копирование, ротация, закрепления, очистка)"
            data-testid="btn-chair-shifts-menu-trigger"
            aria-expanded={isShiftsMenuOpen}
            aria-haspopup="true"
          >
            <SlidersHorizontal size={12} className="text-[var(--teal)] shrink-0" />
            <span className="hidden sm:inline">Действия со сменами...</span>
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
              title="Скопировать график смен кресел на текущую неделю (Пн–Вс, 7 дней) в 1 клик"
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
              title="Скопировать график смен кресел на будни (Пн–Пт, 5 дней) в 1 клик"
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
              title="Скопировать график смен кресел на весь текущий месяц в 1 клик"
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
              title="Циклическая ротация смен между креслами в 1 клик"
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
              title="Назначить закреплённых врачей на все кресла дня в 1 клик"
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
              title="Скопировать график смен кресел на следующую неделю (+7 дней) в 1 клик"
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
              title="Назначить смену на диапазон дат в 1 клик"
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
                title="Умный подбор свободного времени и окон (DentalPRO / IDENT parity)"
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
              title="Очистить все смены кресел на текущий день в 1 клик"
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
            title="Интеллектуальный подбор свободных окон у врачей клиники (DentalPRO / IDENT)"
            data-testid="chair-toolbar-find-slots-btn"
          >
            <Search size={12} className="text-[var(--teal)] shrink-0" />
            <span>Подобрать окно</span>
          </button>
        )}

        {/* Roster Button (visible on xl+, collapses to "Ещё..." on smaller) */}
        {onOpenRosterModal && (
          <button
            type="button"
            onClick={onOpenRosterModal}
            className="hidden xl:inline-flex items-center gap-1 px-2 py-0 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 min-h-[28px] max-h-[28px] shrink-0 select-none"
            title="График работы врачей по сменам и креслам"
            data-testid="btn-open-chair-roster"
          >
            <Users size={12} className="text-[var(--teal)]" />
            <span>График смен</span>
          </button>
        )}

        {/* Add Doctor Button (visible on xl+, collapses to "Ещё..." on smaller) */}
        <button
          type="button"
          onClick={() => setIsAddDoctorOpen(true)}
          className="hidden xl:inline-flex items-center gap-1 px-2 py-0 rounded-md border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[11px] font-semibold text-[var(--ink)] transition-colors cursor-pointer h-7 min-h-[28px] max-h-[28px] shrink-0 select-none"
          title="Быстро добавить врача в расписание (+ Врач)"
          data-testid="btn-chair-view-add-doctor"
        >
          <UserPlus size={12} className="text-[var(--teal)]" />
          <span>Врач</span>
        </button>

        {/* "Ещё..." Collapsible Dropdown for secondary controls on screens < xl (Mandate 8p) */}
        <div className="relative inline-flex xl:hidden" ref={moreMenuRef}>
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
    </div>
  );
}
