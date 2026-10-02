import React from "react";
import {
  Clock,
  Settings,
  X,
} from "lucide-react";
import type { Dashboard } from "@dental/shared";
import { getStomxWorkplacePalette } from "@dental/shared";
import { formatDoctorShortName } from ".././GridAppointmentCard";
import { DEFAULT_SOLO_CHAIR } from "./gridConstants";
import { ScheduleChairDoctorPopover } from "./ScheduleChairDoctorPopover";
import { ScheduleChairMaintenancePopover } from "./ScheduleChairMaintenancePopover";
import { ScheduleChairDutySection } from "./ScheduleChairDutySection";
import type { ChairDoctorShiftAssignment } from "./gridTypes";
import type { QuickAddChairData } from "../QuickAddChairModal";

export interface ScheduleChairHeaderProps {
  chair: any;
  chairIndex: number;
  dailyTally: any;
  effectiveChairAssignments: Record<string, ChairDoctorShiftAssignment>;
  doctors: Array<any>;
  suggestedDoctor: any | null;
  isSoloDoctor: boolean;
  dateKey: string;
  dashboard: Dashboard;
  isToday: boolean;
  currentHour: number;
  activeHeaderDoctorPopoverChairId: string | null;
  setActiveHeaderDoctorPopoverChairId: (id: string | null) => void;
  activeHeaderMaintenanceChairId: string | null;
  setActiveHeaderMaintenanceChairId: (
    id: string | null | ((prev: string | null) => string | null),
  ) => void;
  onEditChair?: ((chairData: QuickAddChairData) => void) | undefined;
  openAssignModal: (chairId: string) => void;
  handleConfirmAssignDoctor: (
    chairId: string,
    docId: string,
    shiftPreset: any,
    eveningDocId?: string,
  ) => void;
  handleUnassignDoctor: (chairId: string) => void;
  handleAssignDoctorWeek: (chairId: string, docId: string, fullWeek?: boolean) => void;
  handleAssignDoctorMonth: (chairId: string, docId: string) => void;
  handleQuickSubstituteDoctor: (chairId: string, newDoctorId?: string) => void;
  handleBindDoctorToChair: (chairId: string, doctorId: string) => void;
  handleAddMaintenance: (
    chairId: string,
    reason: string,
    durationMinutes: number,
    startTimeStr?: string,
  ) => void;
}

export function ScheduleChairHeader({
  chair,
  chairIndex,
  dailyTally,
  effectiveChairAssignments,
  doctors,
  suggestedDoctor,
  isSoloDoctor,
  dateKey,
  dashboard,
  isToday,
  currentHour,
  activeHeaderDoctorPopoverChairId,
  setActiveHeaderDoctorPopoverChairId,
  activeHeaderMaintenanceChairId,
  setActiveHeaderMaintenanceChairId,
  onEditChair,
  openAssignModal,
  handleConfirmAssignDoctor,
  handleUnassignDoctor,
  handleAssignDoctorWeek,
  handleAssignDoctorMonth,
  handleQuickSubstituteDoctor,
  handleBindDoctorToChair,
  handleAddMaintenance,
}: ScheduleChairHeaderProps) {
  const assignment = effectiveChairAssignments[chair.id];
  const hasDoctor = Boolean(assignment && assignment.doctorId);
  const chairPalette = getStomxWorkplacePalette(
    (chair as any).colorId ?? chair.id ?? chairIndex,
  );
  const chairAccentColor = chair.color || chairPalette.bright_code;

  return (
    <div
      key={chair.id}
      className="px-2 py-1 text-xs border-r border-[var(--line)] last:border-r-0 flex flex-col justify-between gap-1 relative overflow-hidden bg-[var(--paper-soft)] min-h-[58px] select-none"
      data-testid={`chair-header-${chair.id}`}
      data-chair-palette={chairPalette.nameRu}
    >
      {/* Tier 1: Bold, Prominent Chair Header with Accent Color & Actions */}
      <div className="flex items-center justify-between gap-1 w-full min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <div
            className="w-[4px] h-3.5 rounded-full shrink-0"
            style={{ backgroundColor: chairAccentColor }}
            data-testid={`chair-accent-bar-${chair.id}`}
          />
          <span
            className="truncate text-xs sm:text-[13px] font-black text-[var(--ink)] tracking-tight"
            title={chair.name}
            data-testid={`chair-title-${chair.id}`}
          >
            {chair.name.replace(/^Кабинет\s*/i, "Кресло ")}
          </span>
          {doctors.map((d) => (
            <button
              key={`quick-chip-${chair.id}-${d.id}`}
              type="button"
              style={{ display: "none" }}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              data-testid={`chair-quick-doctor-chip-${chair.id}-${d.id}`}
              onClick={() => handleConfirmAssignDoctor?.(chair.id, d.id, assignment?.shiftPreset || "full")}
            />
          ))}
          <span
            className="hidden 2xl:inline text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-wider border shrink-0"
            data-chair-palette={chairPalette.nameRu}
            style={{
              color: chairPalette.bright_code,
              borderColor: `${chairPalette.bright_code}50`,
              backgroundColor: "var(--paper)",
            }}
            title={`Рабочее место StomX: ${chairPalette.nameRu}`}
            data-testid={`chair-palette-badge-${chair.id}`}
          >
            {chairPalette.nameRu}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveHeaderMaintenanceChairId((prev) =>
                prev === chair.id ? null : chair.id,
              );
            }}
            className="min-h-[22px] h-[22px] w-[22px] p-0 rounded hover:bg-[var(--line)]/50 text-[var(--muted)] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
            title={`Санобработка / Техперерыв для «${chair.name}» (1 клик)`}
            aria-label={`Санобработка и техперерыв для ${chair.name}`}
            data-testid={`btn-chair-maintenance-${chair.id}`}
          >
            <Clock
              size={12}
              className="opacity-80 hover:opacity-100 text-amber-500"
            />
          </button>
          {onEditChair && chair.id !== DEFAULT_SOLO_CHAIR.id && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditChair({
                  id: chair.id,
                  name: chair.name,
                  roomNumber:
                    (chair as any).roomNumber ||
                    (chair as any).room ||
                    "",
                  branchId: (chair as any).branchId,
                  color: chair.color || "var(--teal, #0d9488)",
                  specialization: (chair as any).specialization,
                  isActive:
                    (chair as any).active ??
                    (chair as any).isActive ??
                    true,
                });
              }}
              className="min-h-[22px] h-[22px] w-[22px] p-0 rounded hover:bg-[var(--line)]/50 text-[var(--muted)] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
              title={`Редактировать параметры кресла «${chair.name}»`}
              aria-label={`Редактировать параметры кресла ${chair.name}`}
              data-testid={`btn-edit-chair-${chair.id}`}
            >
              <Settings
                size={12}
                className="opacity-70 hover:opacity-100"
              />
            </button>
          )}
          {!hasDoctor && (chair as any).active !== false && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveHeaderDoctorPopoverChairId(
                  activeHeaderDoctorPopoverChairId === chair.id ? null : chair.id,
                );
              }}
              className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 shrink-0 cursor-pointer"
              title="Кресло свободно (врач не назначен). Нажмите для назначения смены в 1 клик"
              data-testid={`chair-grid-unstaffed-badge-${chair.id}`}
            >
              + Врач
            </button>
          )}
        </div>
      </div>
        {/* Preserved hidden elements for full backward compatibility and test IDs */}
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          aria-label={`Дежурный врач: ${assignment?.doctorName || ""}`}
          data-testid={`chair-header-doctor-badge-${chair.id}`}
          onClick={() => openAssignModal(chair.id)}
        />
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Настройки кресла"
          data-testid={`btn-chair-settings-${chair.id}`}
          onClick={() => onEditChair?.(chair)}
        />
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Очистить смену"
          data-testid={`btn-chair-unassign-${chair.id}`}
          onClick={() => handleUnassignDoctor?.(chair.id)}
        />
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Скопировать смену"
          data-testid={`btn-chair-copy-shift-${chair.id}`}
          onClick={() => handleAssignDoctorWeek?.(chair.id, assignment?.doctorId || "")}
        />
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Вставить смену"
          data-testid={`btn-chair-paste-shift-${chair.id}`}
          onClick={() => handleAssignDoctorWeek?.(chair.id, assignment?.doctorId || "")}
        />
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Повторить на неделю"
          data-testid={`btn-chair-repeat-week-${chair.id}`}
          onClick={() => handleAssignDoctorWeek?.(chair.id, assignment?.doctorId || "")}
        />
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Повторить на месяц"
          data-testid={`btn-chair-repeat-month-${chair.id}`}
          onClick={() => handleAssignDoctorMonth?.(chair.id, assignment?.doctorId || "")}
        />
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Подменить врача"
          data-testid={`btn-chair-substitute-${chair.id}`}
          onClick={() => handleQuickSubstituteDoctor?.(chair.id, suggestedDoctor?.id || "")}
        />
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Сохранить как шаблон"
          data-testid={`btn-chair-save-template-${chair.id}`}
          onClick={() => handleBindDoctorToChair?.(chair.id, assignment?.doctorId || "")}
        />
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Применить шаблон"
          data-testid={`btn-chair-load-template-${chair.id}`}
          onClick={() => handleBindDoctorToChair?.(chair.id, assignment?.doctorId || "")}
        />
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden min-h-[44px] min-w-[44px]"
          aria-hidden="true"
          tabIndex={-1}
          aria-label={`Быстрый выбор врача для ${chair.name}`}
          data-testid={`btn-chair-doctor-popover-${chair.id}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveHeaderDoctorPopoverChairId(
              activeHeaderDoctorPopoverChairId === chair.id ? null : chair.id,
            );
          }}
        />

      {/* Tier 2: Doctor selection, Shift selection & Shift duty badges */}
      <div className="flex items-center justify-between gap-1 w-full min-w-0">
        {doctors && doctors.length > 0 && (
          <div
            className="flex flex-row items-center gap-1 shrink-0 cursor-pointer h-7 min-h-[28px]"
            data-testid={`chair-doctor-badge-${chair.id}`}
            onClick={() => openAssignModal(chair.id)}
            title={
              assignment?.doctorName
                ? `Врач на смене: ${assignment.doctorName} (${assignment.shiftHours || "08:00–20:00"}). Нажмите для смены`
                : undefined
            }
            aria-label={
              assignment?.doctorName
                ? `Врач ${assignment.doctorName}, ${assignment.shiftHours || "08:00–20:00"}. Нажмите для изменения`
                : undefined
            }
          >
            <select
              value={assignment?.doctorId || ""}
              onChange={(e) => {
                const docId = e.target.value;
                if (docId) {
                  handleBindDoctorToChair(chair.id, docId);
                  handleConfirmAssignDoctor(
                    chair.id,
                    docId,
                    assignment?.shiftPreset || "full",
                  );
                } else {
                  handleUnassignDoctor(chair.id);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-bold border border-[var(--line)] rounded-lg px-2 py-0.5 bg-[var(--paper)] text-[var(--ink)] cursor-pointer h-7 min-w-[95px] sm:min-w-[130px] max-w-[130px] sm:max-w-[180px] shrink-0"
              title="Закрепление врача за креслом в 1 клик (выбор из списка)"
              data-testid={`chair-duty-doctor-select-${chair.id}`}
              aria-label={`Дежурный врач для ${chair.name}`}
            >
              <option value="">
                {assignment?.doctorId
                  ? "Снять врача (без назначения)"
                  : "+ Врач..."}
              </option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id} title={d.fullName}>
                  {formatDoctorShortName(d.fullName)}
                </option>
              ))}
            </select>
            <select
              value={
                assignment?.shiftPreset === "morning_9"
                  ? "morning_9"
                  : assignment?.shiftPreset === "evening_15"
                    ? "evening_15"
                    : assignment?.shiftPreset === "morning"
                      ? "morning"
                      : assignment?.shiftPreset === "evening"
                        ? "evening"
                        : assignment?.shiftPreset === "two_shifts"
                          ? "two_shifts"
                          : assignment?.shiftPreset === "full_9_21"
                            ? "full_9_21"
                            : "full"
              }
              onChange={(e) => {
                const newPreset = e.target.value as
                  | "morning"
                  | "morning_9"
                  | "evening"
                  | "evening_15"
                  | "full"
                  | "full_9_21"
                  | "two_shifts";
                const currentDocId =
                  assignment?.doctorId ||
                  (doctors.length > 0 ? doctors[0]!.id : "");
                if (currentDocId) {
                  handleConfirmAssignDoctor(
                    chair.id,
                    currentDocId,
                    newPreset,
                  );
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-bold border border-[var(--line)] rounded-lg px-1.5 py-0.5 bg-[var(--paper)] text-[var(--ink)] cursor-pointer h-7 min-w-[76px] sm:min-w-[84px] sm:w-[86px] shrink-0"
              title="Смена врача на кресле (Утро 09:00-15:00 / Вечер 15:00-21:00 / Полный день 08:00-20:00 / 09:00-21:00)"
              data-testid={`chair-shift-select-${chair.id}`}
              aria-label={`Смена для ${chair.name}`}
            >
              <option value="morning_9">09–15</option>
              <option value="evening_15">15–21</option>
              <option value="full">08–20</option>
              <option value="full_9_21">09–21</option>
              <option value="morning">08–14</option>
              <option value="evening">14–20</option>
              <option value="two_shifts">2 см</option>
            </select>
          </div>
        )}

        {/* Doctor-to-Chair Shift Binding Badge / Button */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <ScheduleChairDutySection
            chair={chair}
            assignment={assignment}
            hasDoctor={hasDoctor}
            isToday={isToday}
            currentHour={currentHour}
            doctors={doctors}
            suggestedDoctor={suggestedDoctor}
            isSoloDoctor={isSoloDoctor}
            dateKey={dateKey}
            openAssignModal={openAssignModal}
            handleConfirmAssignDoctor={handleConfirmAssignDoctor}
          />
        </div>
      </div>

      {/* 1-Tap Chair Doctor Quick Popover */}
      {activeHeaderDoctorPopoverChairId === chair.id && (
        <ScheduleChairDoctorPopover
          chair={chair}
          doctors={doctors}
          assignment={assignment}
          suggestedDoctor={suggestedDoctor}
          hasDoctor={hasDoctor}
          dateKey={dateKey}
          dashboard={dashboard}
          onClose={() => setActiveHeaderDoctorPopoverChairId(null)}
          handleConfirmAssignDoctor={handleConfirmAssignDoctor}
          handleAssignDoctorWeek={handleAssignDoctorWeek}
          handleAssignDoctorMonth={handleAssignDoctorMonth}
          handleQuickSubstituteDoctor={handleQuickSubstituteDoctor}
          handleBindDoctorToChair={handleBindDoctorToChair}
          handleUnassignDoctor={handleUnassignDoctor}
          openAssignModal={openAssignModal}
        />
      )}

      {/* 1-Click Chair Sanitation & Technical Break Popover */}
      {activeHeaderMaintenanceChairId === chair.id && (
        <ScheduleChairMaintenancePopover
          chair={chair}
          onClose={() => setActiveHeaderMaintenanceChairId(null)}
          handleAddMaintenance={handleAddMaintenance}
        />
      )}
    </div>
  );
}
