import React from "react";
import { Plus, Settings2, UserCheck } from "lucide-react";
import { countLabel } from "../../../lib/russianPlural";
import { formatDoctorShortName } from "../ScheduleGrid";
import { ChairShiftPopover } from "../ChairShiftPopover";
import type { ChairScheduleToolbarProps } from "./types";

export function ChairScheduleFilterChips({
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
}: ChairScheduleToolbarProps) {
  return (
    <>
      {/* Left: Установки Counter */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-semibold text-[var(--muted)] hidden 2xl:inline">
          Стоматологические установки:
        </span>
        <span
          className={`items-center px-2.5 h-9 min-h-[36px] max-h-[36px] rounded-xl text-xs font-bold bg-[var(--primary-soft)] text-[var(--primary-dark)] border border-[var(--primary)]/20 shadow-2xs shrink-0 select-none ${
            chairs.length > 2 ? "inline-flex" : "hidden 2xl:inline-flex"
          }`}
          data-testid="chair-view-count-badge"
        >
          {countLabel(chairs.length || 1, "кресло", "кресла", "кресел")}
        </span>
        {chairs.length > 3 && (
          <span
            className="inline-flex items-center px-2 h-9 min-h-[36px] max-h-[36px] rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] shadow-2xs shrink-0 select-none"
            title={`Всего установок: ${chairs.length}. Все установки доступны в полосе фильтров`}
          >
            +{chairs.length - 3}
          </span>
        )}
        {isSoloDoctor && (
          <span className="text-xs text-[var(--muted)] hidden 2xl:inline">
            (Авто-привязка)
          </span>
        )}

        {/* Auto-hide branch selector when branches <= 1 */}
        {hasMultipleBranches && (
          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-[var(--line)] shrink-0">
            <span className="text-xs text-[var(--muted)] font-medium hidden lg:inline">Филиал:</span>
            <select
              value={selectedBranchId || ""}
              onChange={(e) => onSelectBranch?.(e.target.value || null)}
              className="text-xs h-9 min-h-[36px] max-h-[36px] px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium cursor-pointer hover:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors shadow-2xs shrink-0 touch-manipulation"
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

      {/* Чипы кресел с акцентными полосками цвета */}
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
          const isRoomAlreadyInName = Boolean(
            roomLabel && (
              chair.name.toLowerCase().includes(`каб. ${String(roomLabel).toLowerCase()}`) ||
              chair.name.toLowerCase().includes(`кабинет ${String(roomLabel).toLowerCase()}`) ||
              chair.name.toLowerCase().includes(`каб ${String(roomLabel).toLowerCase()}`)
            )
          );
          const cleanChairTitle = chair.name.replace(/^Кабинет\s+/i, "Каб. ");
          const displayChairTitle = cleanChairTitle.replace(/\s*\([^)]*\)/g, "").trim() || cleanChairTitle;

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
              className={`relative px-2.5 py-1 rounded-xl border text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 shrink-0 shadow-2xs transition-all cursor-pointer select-none text-left h-9 min-h-[36px] max-h-[36px] whitespace-nowrap touch-manipulation ${
                isSelected
                  ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30 bg-[var(--primary-soft)] shadow-sm"
                  : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--primary)]/60 hover:bg-[var(--paper-soft)]"
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
                className="h-1 w-full absolute top-0 left-0 right-0 rounded-t-xl"
                style={{ backgroundColor: chairColor }}
                data-testid={`chair-view-accent-strip-${chair.id}`}
              />
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform ${
                  isSelected ? "scale-125" : ""
                }`}
                style={{ backgroundColor: chairColor }}
                aria-hidden="true"
              />
              <span
                className="font-bold text-xs whitespace-nowrap shrink-0"
                title={chair.name}
              >
                {displayChairTitle}
              </span>
              {roomLabel && !isRoomAlreadyInName && (
                <span
                  className="text-[11px] text-[var(--muted)] font-normal shrink-0 whitespace-nowrap"
                  data-testid={`chair-view-room-${chair.id}`}
                >
                  ({typeof roomLabel === "string" && roomLabel.startsWith("Каб") ? roomLabel : `Каб. ${roomLabel}`})
                </span>
              )}
              {(assignedDocName || hasTwoSubShifts) && (
                <span
                  className="text-[11px] text-[var(--muted)] font-normal whitespace-nowrap hidden 2xl:inline shrink-0"
                  title={
                    hasTwoSubShifts && morningSub && eveningSub
                      ? `У: ${morningSub.doctorName} / В: ${eveningSub.doctorName}`
                      : `${assignedDocName}${assignedShiftLabel ? ` • ${assignedShiftLabel}` : ""}`
                  }
                  data-testid={`chair-view-doc-${chair.id}`}
                >
                  {hasTwoSubShifts && morningSub && eveningSub
                    ? `(${morningSub.doctorName.split(" ")[0]} / ${eveningSub.doctorName.split(" ")[0]})`
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
                  className="text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded-lg border border-amber-500/35 shrink-0 cursor-pointer transition-all inline-flex items-center justify-center gap-1 touch-manipulation active:scale-95 shadow-2xs h-7 min-h-[28px] max-h-[32px]"
                  title="Кресло свободно (врач не назначен). Нажмите для назначения смены"
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
                  className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-[var(--primary)] text-white uppercase tracking-wider shadow-2xs"
                  data-testid={`chair-view-badge-selected-${chair.id}`}
                >
                  Выбрано
                </span>
              )}

              {/* Кнопка настройки смены и врача */}
              {assignedDocName ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveShiftChairId((prev) => (prev === chair.id ? null : chair.id));
                  }}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0 touch-manipulation"
                  title="Изменить врача и смену"
                  data-testid={`chair-view-assign-doctor-${chair.id}`}
                  aria-label={`Изменить врача на кресле ${chair.name}`}
                >
                  <UserCheck
                    size={14}
                    className="text-[var(--primary)]"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  style={{ display: "none" }}
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveShiftChairId((prev) => (prev === chair.id ? null : chair.id));
                  }}
                  data-testid={`chair-view-assign-doctor-${chair.id}`}
                  aria-label={`Назначить врача на кресло ${chair.name}`}
                />
              )}

              {/* Settings Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditChair(chair as any);
                }}
                className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0 touch-manipulation"
                title={`Настройки кресла «${chair.name}» (смена врача / кабинета)`}
                data-testid={`chair-view-settings-${chair.id}`}
                aria-label={`Настройки кресла ${chair.name}`}
              >
                <Settings2 size={14} />
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
            className="dente-filter-chip h-9 min-h-[36px] max-h-[36px] px-3 border border-dashed border-[var(--line-strong)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] rounded-xl flex items-center gap-1.5 shrink-0 transition-all cursor-pointer bg-[var(--paper)] shadow-2xs touch-manipulation"
            title="Добавить еще одно стоматологическое кресло"
            data-testid="chair-view-add-chair-strip-btn"
          >
            <Plus size={13} />
            <span>+ Кресло</span>
          </button>
        )}
      </div>
    </>
  );
}
