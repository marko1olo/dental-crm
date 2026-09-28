import React from "react";
import { Clock, Moon, Plus, Sun, X, Zap } from "lucide-react";
import {
  type Appointment,
  type Dashboard,
  getStomxWorkplacePalette,
} from "@dental/shared";
import { GridAppointmentCard } from "../GridAppointmentCard";
import { safeBuildSlotIso } from "./gridSlotMath";
import {
  checkAppointmentResourceCollision,
  isCitoAppointment,
  type ChairMaintenanceBlock,
} from "../../../utils/scheduleCollisionUtils";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { ChairDoctorShiftAssignment } from "./gridTypes";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";

export interface ScheduleAppointmentTrackProps {
  timeSlots: string[];
  gridStep: 15 | 30 | 60;
  effectiveChairs: Array<any>;
  dateKey: string;
  chairSlotCellMap: Map<
    string,
    {
      cellAppointments: Appointment[];
      continuingAppointments: Appointment[];
      cellMaintenance: ChairMaintenanceBlock[];
    }
  >;
  EMPTY_SLOT_CELL_DATA?: {
    cellAppointments: Appointment[];
    continuingAppointments: Appointment[];
    cellMaintenance: ChairMaintenanceBlock[];
  } | undefined;
  patientName: (
    patients: Dashboard["patients"],
    patientId: string | null,
  ) => string;
  dashboard: Dashboard;
  handleRemoveMaintenance: (blockId: string) => void;
  doctors: Array<any>;
  patientLookupMap: Map<string, any>;
  staffLookupMap: Map<string, any>;
  collisionMap: Map<string, any>;
  timezone: string;
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  hoveredApptId: string | null;
  activeStatusPickerApptId: string | null;
  activeMenuApptId: string | null;
  onAppointmentClick: (appointment: Appointment) => void;
  handleSelectMobileAppt: (appt: Appointment) => void;
  onQuickStatusChange?:
    | ((appointmentId: string, status: Appointment["status"]) => void)
    | undefined;
  handleAdjustAppointmentDuration: (appt: Appointment, delta: number) => void;
  handleShiftAppointmentLateness: (appt: Appointment, shift: number) => void;
  handleReassignAppointmentChair: (appt: Appointment, chairId: string | null) => void;
  handleReassignAppointmentDoctor: (appt: Appointment, docId: string) => void;
  handleFreeSlotToWaitlist: (appt: Appointment) => void;
  handleAppointmentMouseEnter: (id: string) => void;
  handleAppointmentMouseLeave: () => void;
  handleKeepHovered: (id: string) => void;
  handleToggleStatusPicker: (id: string) => void;
  handleToggleMenu: (id: string) => void;
  handleCloseStatusPicker: () => void;
  handleCloseMenu: () => void;
  appointments: Appointment[];
  getDoctorForChairAndHour: (chairId: string, hourStr: string) => string | null;
  selectedDoctorId?: string | null | undefined;
  effectiveChairAssignments: Record<string, ChairDoctorShiftAssignment>;
  effectiveMaintenanceBlocks: ChairMaintenanceBlock[];
  onAppointmentMove?:
    | ((appointmentId: string, updates: any) => Promise<any> | void)
    | undefined;
  onSlotClick: (slot: QuickBookingSlotInfo) => void;
  emergencyReserveSlots: Array<any>;
}

const DEFAULT_EMPTY_SLOT_CELL_DATA = {
  cellAppointments: [] as Appointment[],
  continuingAppointments: [] as Appointment[],
  cellMaintenance: [] as ChairMaintenanceBlock[],
};

export function ScheduleAppointmentTrack(props: ScheduleAppointmentTrackProps) {
  const {
    timeSlots,
    gridStep,
    effectiveChairs,
    dateKey,
    chairSlotCellMap,
    EMPTY_SLOT_CELL_DATA = DEFAULT_EMPTY_SLOT_CELL_DATA,
    patientName,
    dashboard,
    handleRemoveMaintenance,
    doctors,
    patientLookupMap,
    staffLookupMap,
    collisionMap,
    timezone,
    toDateTimeLocalValue,
    appointmentLabels,
    hoveredApptId,
    activeStatusPickerApptId,
    activeMenuApptId,
    onAppointmentClick,
    handleSelectMobileAppt,
    onQuickStatusChange,
    handleAdjustAppointmentDuration,
    handleShiftAppointmentLateness,
    handleReassignAppointmentChair,
    handleReassignAppointmentDoctor,
    handleFreeSlotToWaitlist,
    handleAppointmentMouseEnter,
    handleAppointmentMouseLeave,
    handleKeepHovered,
    handleToggleStatusPicker,
    handleToggleMenu,
    handleCloseStatusPicker,
    handleCloseMenu,
    appointments,
    getDoctorForChairAndHour,
    selectedDoctorId,
    effectiveChairAssignments,
    effectiveMaintenanceBlocks,
    onAppointmentMove,
    onSlotClick,
    emergencyReserveSlots,
  } = props;

  const renderedApptIds = new Set<string>();

  // Slot drop helper for Drag-and-Drop & Waitlist items
  const handleSlotDrop = (e: React.DragEvent, chair: any, hour: string) => {
    try {
      const rawData = e.dataTransfer.getData("application/json");
      if (!rawData) return;
      const data = JSON.parse(rawData);
      if (data?.type === "appointment" && data.appointmentId) {
        const sourceAppt = (appointments ?? []).find(
          (x) => x.id === data.appointmentId,
        );
        if (!sourceAppt) return;
        const targetChairId = chair.id !== "default-chair" ? chair.id : null;
        const assignedDocId = getDoctorForChairAndHour(chair.id, hour);
        const targetDoctorId =
          selectedDoctorId || assignedDocId || sourceAppt.doctorUserId;
        const targetDocName =
          dashboard?.clinicSettings?.staff?.find((m) => m.id === targetDoctorId)
            ?.fullName ||
          effectiveChairAssignments[chair.id]?.doctorName ||
          undefined;
        const slotDuration = data.durationMinutes || 30;
        const { startIso: targetStartIso, endIso: targetEndIso } =
          safeBuildSlotIso(dateKey, hour, slotDuration);
        const isSourceCito = isCitoAppointment(sourceAppt);

        const collisionCheck = checkAppointmentResourceCollision(
          {
            startsAt: targetStartIso,
            endsAt: targetEndIso,
            doctorUserId: targetDoctorId,
            chairId: targetChairId,
            patientId: sourceAppt.patientId,
            isCito: isSourceCito,
          },
          appointments,
          {
            excludeAppointmentId: sourceAppt.id,
            staff: dashboard?.clinicSettings?.staff,
            chairs: dashboard?.clinicSettings?.chairs,
            patients: dashboard?.patients,
            chairMaintenanceBlocks: effectiveMaintenanceBlocks,
            formatTimeFn: (iso) =>
              toDateTimeLocalValue(iso, timezone).slice(11, 16),
            isCito: isSourceCito,
            allowCitoOverbooking: isSourceCito,
          },
        );

        if (collisionCheck.isCitoOverbooking) {
          showToast(
            `CITO-овербукинг разрешён (острая боль): ${collisionCheck.message}`,
            "warning",
            4500,
          );
        } else if (collisionCheck.hasCollision) {
          showToast(
            `Внимание: ${collisionCheck.message}. Запись перенесена с овербукингом`,
            "warning",
            4500,
          );
        }

        if (typeof onAppointmentMove === "function") {
          void Promise.resolve(
            onAppointmentMove(sourceAppt.id, {
              startsAt: targetStartIso,
              endsAt: targetEndIso,
              chairId: targetChairId,
              doctorUserId: targetDoctorId,
              allowOverbooking: true,
            }),
          ).then((result) => {
            if (result !== false) {
              const pName = patientName
                ? patientName(dashboard?.patients ?? [], sourceAppt.patientId)
                : "Пациент";
              showToast(`«${pName}» перенесен(а) на ${hour}`, "success", 3000);
            }
          });
        } else {
          onSlotClick({
            dateKey,
            startTime: hour,
            chairId: targetChairId,
            doctorUserId: targetDoctorId,
            doctorName: targetDocName,
            durationMinutes: slotDuration,
            patientId: sourceAppt.patientId,
            reason: sourceAppt.reason || undefined,
          });
        }
      } else if (data?.type === "waitlist_item" && data.item) {
        const waitlistItem = data.item;
        const targetChairId = chair.id !== "default-chair" ? chair.id : null;
        const assignedDocId = getDoctorForChairAndHour(chair.id, hour);
        const targetDoctorId =
          selectedDoctorId ||
          assignedDocId ||
          waitlistItem.preferredDoctorId ||
          (dashboard?.clinicSettings?.staff?.find(
            (m) => m.active && m.role === "doctor",
          )?.id ??
            null);
        const targetWaitlistDocName =
          dashboard?.clinicSettings?.staff?.find((m) => m.id === targetDoctorId)
            ?.fullName ||
          effectiveChairAssignments[chair.id]?.doctorName ||
          undefined;
        const slotDuration = waitlistItem.durationMinutes || 30;
        const { startIso: targetStartIso, endIso: targetEndIso } =
          safeBuildSlotIso(dateKey, hour, slotDuration);

        const collisionCheck = checkAppointmentResourceCollision(
          {
            startsAt: targetStartIso,
            endsAt: targetEndIso,
            doctorUserId: targetDoctorId,
            chairId: targetChairId,
            patientId: waitlistItem.patientId,
          },
          appointments,
          {
            staff: dashboard?.clinicSettings?.staff,
            chairs: dashboard?.clinicSettings?.chairs,
            patients: dashboard?.patients,
            formatTimeFn: (iso) =>
              toDateTimeLocalValue(iso, timezone).slice(11, 16),
          },
        );

        if (collisionCheck.hasCollision) {
          showToast(
            `Внимание: запись создана с наложением времени (${collisionCheck.message})`,
            "warning",
            5000,
          );
        }

        onSlotClick({
          dateKey,
          startTime: hour,
          chairId: targetChairId,
          doctorUserId: targetDoctorId,
          doctorName: targetWaitlistDocName,
          durationMinutes: slotDuration,
          patientId: waitlistItem.patientId,
          patientName: waitlistItem.patientName || undefined,
          reason: waitlistItem.note || "Из листа ожидания",
        });

        if (waitlistItem.id) {
          void fetch(`/api/waitlist/${waitlistItem.id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...denteAdminSecretRequestHeaders(),
            },
            body: JSON.stringify({ status: "fulfilled" }),
          }).catch((err) => {
            console.warn("Failed to fulfill waitlist item:", err);
          });
        }

        showToast(
          `Пациент «${waitlistItem.patientName || "из очереди"}» назначен в свободный слот`,
          "success",
          4000,
        );
      }
    } catch {
      // Ignore invalid JSON drop
    }
  };

  const renderAppointmentCard = (
    a: Appointment,
    chair: any,
    isNearBottom: boolean,
    isNearRightEdge: boolean,
  ) => (
    <GridAppointmentCard
      key={a.id}
      appointment={a}
      chair={chair}
      effectiveChairs={effectiveChairs}
      doctors={doctors}
      patientLookupMap={patientLookupMap}
      staffLookupMap={staffLookupMap}
      collisionMap={collisionMap}
      patientNameFn={(pts, id) => patientName(pts, id)}
      getPatientName={(pts, id) => patientName(pts, id)}
      dashboard={dashboard}
      timezone={timezone}
      toDateTimeLocalValue={toDateTimeLocalValue}
      appointmentLabels={appointmentLabels}
      isHovered={hoveredApptId === a.id}
      isStatusPickerOpen={activeStatusPickerApptId === a.id}
      isMenuOpen={activeMenuApptId === a.id}
      isNearBottom={isNearBottom}
      isNearRightEdge={isNearRightEdge}
      onAppointmentClick={onAppointmentClick}
      onSelectMobileAppt={handleSelectMobileAppt}
      onQuickStatusChange={onQuickStatusChange}
      onAdjustDuration={handleAdjustAppointmentDuration}
      onShiftLateness={handleShiftAppointmentLateness}
      onReassignChair={handleReassignAppointmentChair}
      onReassignDoctor={handleReassignAppointmentDoctor}
      onFreeSlotToWaitlist={handleFreeSlotToWaitlist}
      onMouseEnter={handleAppointmentMouseEnter}
      onMouseLeave={handleAppointmentMouseLeave}
      onKeepHovered={handleKeepHovered}
      onToggleStatusPicker={handleToggleStatusPicker}
      onToggleMenu={handleToggleMenu}
      onCloseStatusPicker={handleCloseStatusPicker}
      onCloseMenu={handleCloseMenu}
    />
  );

  // Cell renderer for a given hour slot and chair
  const renderSlotCell = (
    hour: string,
    hIndex: number,
    chair: any,
    chairIndex: number,
    slotsList: string[],
    isLastCol: boolean,
    colIndex: number,
  ) => {
    const [sH, sM] = hour.split(":").map(Number);
    const slotStartMin = (sH ?? 0) * 60 + (sM ?? 0);
    const rowIndex = hIndex + 1;
    const chairPalette = getStomxWorkplacePalette(
      (chair as any).colorId ?? chair.id ?? chairIndex,
    );
    const cellData =
      chairSlotCellMap.get(`${chair.id}_${slotStartMin}`) ??
      EMPTY_SLOT_CELL_DATA;
    const { cellAppointments, continuingAppointments, cellMaintenance } = cellData;

    // Case A: Appointments or maintenance starting in this slot
    if (cellAppointments.length > 0 || cellMaintenance.length > 0) {
      for (const a of cellAppointments) {
        renderedApptIds.add(a.id);
      }

      const maxSpan = Math.max(
        1,
        ...cellAppointments.map((a) => {
          let duration = (a as any).durationMinutes;
          if (!duration && a.startsAt && a.endsAt) {
            const diffMs = Date.parse(a.endsAt) - Date.parse(a.startsAt);
            if (!Number.isNaN(diffMs) && diffMs > 0) {
              duration = Math.round(diffMs / 60000);
            }
          }
          return Math.max(1, Math.round((duration || 30) / (gridStep || 30)));
        }),
      );
      const clampedSpan = Math.min(maxSpan, slotsList.length - hIndex);

      return (
        <div
          key={`occupied-${chair.id}-${hour}`}
          className={`p-1 border-b border-[var(--line)] ${isLastCol ? "" : "border-r"} space-y-1 relative h-full flex flex-col`}
          style={{
            gridColumn: colIndex,
            gridRow: `${rowIndex} / span ${clampedSpan}`,
            zIndex: 10,
          }}
          data-chair-id={chair.id}
          data-chair-palette={chairPalette.nameRu}
        >
          {cellMaintenance.map((mBlock) => {
            const mReasonLabel =
              mBlock.note ||
              (mBlock.reason === "sanitation"
                ? "Санитарная обработка"
                : mBlock.reason === "tech_break"
                  ? "Технический перерыв"
                  : mBlock.reason === "maintenance"
                    ? "Техобслуживание"
                    : mBlock.reason);
            const mDuration =
              mBlock.startsAt && mBlock.endsAt
                ? Math.round(
                    (Date.parse(mBlock.endsAt) - Date.parse(mBlock.startsAt)) /
                      60000,
                  )
                : 30;
            return (
              <div
                key={mBlock.id}
                className="w-full p-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-[var(--ink)] flex items-center justify-between"
                data-testid={`chair-maintenance-block-${chair.id}`}
              >
                <div className="flex items-center gap-1.5 truncate min-w-0">
                  <Clock
                    size={12}
                    className="text-amber-600 dark:text-amber-400 shrink-0"
                  />
                  <span className="truncate">
                    {mReasonLabel} ({mDuration} мин)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMaintenance(mBlock.id);
                  }}
                  className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 cursor-pointer shrink-0"
                  title="Удалить технический перерыв"
                  aria-label="Удалить технический перерыв"
                  data-testid={`btn-remove-maintenance-${chair.id}`}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
          {cellAppointments.map((a) => {
            const isNearBottom = hIndex >= slotsList.length - 4;
            const isNearRightEdge =
              chairIndex >= effectiveChairs.length - 1 &&
              effectiveChairs.length > 1;
            return renderAppointmentCard(a, chair, isNearBottom, isNearRightEdge);
          })}
        </div>
      );
    }

    // Case B: Continuing appointment check
    const unrenderedContinuing = continuingAppointments.filter(
      (cA) => !renderedApptIds.has(cA.id),
    );
    if (continuingAppointments.length > 0 && unrenderedContinuing.length === 0) {
      return null;
    }

    if (unrenderedContinuing.length > 0) {
      for (const a of unrenderedContinuing) {
        renderedApptIds.add(a.id);
      }
      const maxSpan = Math.max(
        1,
        ...unrenderedContinuing.map((a) => {
          let duration = (a as any).durationMinutes;
          if (!duration && a.startsAt && a.endsAt) {
            const diffMs = Date.parse(a.endsAt) - Date.parse(a.startsAt);
            if (!Number.isNaN(diffMs) && diffMs > 0) {
              duration = Math.round(diffMs / 60000);
            }
          }
          return Math.max(1, Math.round((duration || 30) / (gridStep || 30)));
        }),
      );
      const clampedSpan = Math.min(maxSpan, slotsList.length - hIndex);

      return (
        <div
          key={`continuing-start-${chair.id}-${hour}`}
          className={`p-1 border-b border-[var(--line)] ${isLastCol ? "" : "border-r"} space-y-1 relative h-full flex flex-col`}
          style={{
            gridColumn: colIndex,
            gridRow: `${rowIndex} / span ${clampedSpan}`,
            zIndex: 10,
          }}
          data-chair-id={chair.id}
          data-chair-palette={chairPalette.nameRu}
        >
          {unrenderedContinuing.map((a) => {
            const isNearBottom = hIndex >= slotsList.length - 4;
            const isNearRightEdge =
              chairIndex >= effectiveChairs.length - 1 &&
              effectiveChairs.length > 1;
            return renderAppointmentCard(a, chair, isNearBottom, isNearRightEdge);
          })}
        </div>
      );
    }

    // Case C: Empty cell with 1-click booking & Drop handler
    const assignedDocId = getDoctorForChairAndHour(chair.id, hour);
    const slotDocId = assignedDocId || selectedDoctorId || null;
    const slotDocName =
      dashboard?.clinicSettings?.staff?.find((m) => m.id === slotDocId)
        ?.fullName ||
      effectiveChairAssignments[chair.id]?.doctorName ||
      undefined;

    const isEmergencyBuffer = emergencyReserveSlots.some((r) => {
      const rHour = toDateTimeLocalValue(r.startTime, timezone).slice(11, 13);
      return rHour === hour.slice(0, 2);
    });

    const hasDoctorForDay = Boolean(
      effectiveChairAssignments[chair.id]?.doctorId,
    );
    const isOffDuty = hasDoctorForDay && !assignedDocId;

    return (
      <div
        key={`empty-${chair.id}-${hour}`}
        className={`p-0.5 sm:p-1 border-b border-[var(--line)] ${isLastCol ? "" : "border-r"} min-h-[52px] flex items-center justify-center hover:bg-[var(--paper-soft)]/50 transition-colors`}
        style={{
          gridColumn: colIndex,
          gridRow: rowIndex,
        }}
        data-chair-id={chair.id}
        data-chair-palette={chairPalette.nameRu}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => handleSlotDrop(e, chair, hour)}
      >
        {isEmergencyBuffer ? (
          <button
            type="button"
            onClick={() =>
              onSlotClick({
                dateKey,
                startTime: hour,
                chairId: chair.id,
                doctorUserId: slotDocId,
                doctorName: slotDocName,
                durationMinutes: 30,
                reason: "Острая боль (CITO Резерв)",
              })
            }
            className="w-full h-full min-h-[30px] sm:min-h-[32px] rounded-lg border border-dashed border-amber-500/70 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-center gap-1.5 px-2 cursor-pointer transition-all shadow-2xs"
            title={`Экстренный резерв (CITO): ${hour} (${chair.name}). Буфер 30 мин для пациентов с острой болью`}
            aria-label={`Экстренный резерв на ${hour}, кресло ${chair.name}. Буфер 30 минут для пациентов с острой болью`}
            data-testid="schedule-emergency-buffer-slot"
          >
            <Zap
              size={13}
              className="text-amber-600 dark:text-amber-400 animate-pulse shrink-0"
            />
            <span className="text-[11px] font-bold whitespace-nowrap shrink-0">
              Острая боль • Резерв ({hour})
            </span>
          </button>
        ) : isOffDuty ? (
          <button
            type="button"
            onClick={() =>
              onSlotClick({
                dateKey,
                startTime: hour,
                chairId: chair.id,
                doctorUserId: selectedDoctorId || null,
                doctorName: selectedDoctorId
                  ? dashboard?.clinicSettings?.staff?.find(
                      (m) => m.id === selectedDoctorId,
                    )?.fullName
                  : undefined,
                durationMinutes: 30,
              })
            }
            className="w-full h-full min-h-[30px] sm:min-h-[32px] rounded-lg border border-dashed border-[var(--line)] bg-[var(--paper-soft)]/40 hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1 px-2 cursor-pointer transition-colors"
            title={`Вне графика смены врача на ${hour} (${chair.name}). Нажмите для записи`}
            aria-label={`Вне графика врача на ${hour}, кресло ${chair.name}`}
            data-testid={`btn-slot-${chair.id}-${hour.replace(":", "")}`}
          >
            <Clock size={11} className="opacity-50 shrink-0" />
            <span className="text-[10px] text-[var(--muted)]">
              Вне смены ({hour})
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              onSlotClick({
                dateKey,
                startTime: hour,
                chairId: chair.id,
                doctorUserId: slotDocId,
                doctorName: slotDocName,
                durationMinutes: 30,
              })
            }
            className="schedule-empty-slot-btn group w-full h-full min-h-[30px] sm:min-h-[32px] rounded-lg border border-dashed border-[var(--line)] bg-transparent hover:border-[var(--teal)] hover:bg-[var(--teal-soft,var(--paper-soft))] flex items-center justify-center gap-1 px-2 cursor-pointer transition-all"
            title={`Записать на ${hour} (${chair.name})`}
            aria-label={`Свободно на ${hour}, кресло ${chair.name}. Нажмите для быстрой записи`}
            data-testid={`btn-slot-${chair.id}-${hour.replace(":", "")}`}
          >
            <Plus
              size={13}
              className="text-[var(--teal)] opacity-70 group-hover:opacity-100 shrink-0"
            />
            <span className="text-[11px] font-semibold whitespace-nowrap shrink-0 opacity-80 group-hover:opacity-100 text-[var(--muted)] group-hover:text-[var(--teal)]">
              Записать на {hour}
            </span>
          </button>
        )}
      </div>
    );
  };

  // Determine if single chair mode should activate Split-Shift 2-column view (Morning 08:00-14:00 & Evening 14:00-20:00)
  const isSingleChair = effectiveChairs.length === 1;
  const isMorningSlot = (slot: string) => {
    const h = Number.parseInt(slot.slice(0, 2), 10);
    return Number.isFinite(h) ? h < 14 : true;
  };
  const morningSlots = timeSlots.filter(isMorningSlot);
  const eveningSlots = timeSlots.filter((s) => !isMorningSlot(s));
  const canSplitShift =
    isSingleChair && morningSlots.length > 0 && eveningSlots.length > 0;

  if (canSplitShift) {
    const chair = effectiveChairs[0];
    return (
      <div
        className="schedule-split-day-track grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--line)] border-b border-[var(--line)] bg-[var(--paper)]"
        data-testid="schedule-split-day-track"
      >
        {/* Morning Shift (08:00 — 14:00) */}
        <div className="schedule-shift-subtrack flex flex-col min-w-0">
          <div className="schedule-shift-header schedule-shift-header-morning">
            <span className="flex items-center gap-1.5">
              <Sun size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>1-я смена / Утро (08:00 — 14:00)</span>
            </span>
            <span className="text-[10px] text-[var(--muted)] font-medium">
              {morningSlots.length} слотов · {gridStep} мин
            </span>
          </div>
          <div
            className="schedule-grid-container grid min-w-full"
            style={{
              gridTemplateColumns: "clamp(64px, 5vw, 84px) 1fr",
              gridTemplateRows: `repeat(${morningSlots.length}, minmax(38px, auto))`,
            }}
          >
            {morningSlots.map((hour, hIndex) => (
              <div
                key={`morning-time-${hour}`}
                className="schedule-time-label px-1.5 sm:px-2 py-1 text-center text-xs font-bold text-[var(--muted)] border-r border-b border-[var(--line)] sticky left-0 z-10 bg-[var(--paper)] select-none flex items-center justify-center min-h-[38px]"
                style={{ gridColumn: 1, gridRow: hIndex + 1 }}
              >
                {hour}
              </div>
            ))}
            {morningSlots.map((hour, hIndex) =>
              renderSlotCell(hour, hIndex, chair, 0, morningSlots, true, 2),
            )}
          </div>
        </div>

        {/* Evening Shift (14:00 — 20:00) */}
        <div className="schedule-shift-subtrack flex flex-col min-w-0">
          <div className="schedule-shift-header schedule-shift-header-evening">
            <span className="flex items-center gap-1.5">
              <Moon size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>2-я смена / Вечер (14:00 — 20:00)</span>
            </span>
            <span className="text-[10px] text-[var(--muted)] font-medium">
              {eveningSlots.length} слотов · {gridStep} мин
            </span>
          </div>
          <div
            className="schedule-grid-container grid min-w-full"
            style={{
              gridTemplateColumns: "clamp(64px, 5vw, 84px) 1fr",
              gridTemplateRows: `repeat(${eveningSlots.length}, minmax(38px, auto))`,
            }}
          >
            {eveningSlots.map((hour, hIndex) => (
              <div
                key={`evening-time-${hour}`}
                className="schedule-time-label px-1.5 sm:px-2 py-1 text-center text-xs font-bold text-[var(--muted)] border-r border-b border-[var(--line)] sticky left-0 z-10 bg-[var(--paper)] select-none flex items-center justify-center min-h-[38px]"
                style={{ gridColumn: 1, gridRow: hIndex + 1 }}
              >
                {hour}
              </div>
            ))}
            {eveningSlots.map((hour, hIndex) =>
              renderSlotCell(hour, hIndex, chair, 0, eveningSlots, true, 2),
            )}
          </div>
        </div>
      </div>
    );
  }

  // Multi-chair panoramic grid (all chairs side by side 1fr 1fr ...)
  return (
    <div
      className="schedule-grid-container grid min-w-full"
      style={{
        minWidth:
          effectiveChairs.length > 1
            ? `${Math.max(260, 72 + effectiveChairs.length * 220)}px`
            : undefined,
        gridTemplateColumns: `clamp(112px, 10vw, 150px) repeat(${effectiveChairs.length}, minmax(180px, 1fr))`,
        gridTemplateRows: `repeat(${timeSlots.length}, minmax(52px, auto))`,
      }}
    >
      {/* 1. Time Column Labels (Column 1) */}
      {timeSlots.map((hour, hIndex) => (
        <div
          key={`time-${hour}`}
          className="schedule-time-label px-1.5 sm:px-2 py-1 sm:py-1.5 text-center text-xs font-bold text-[var(--muted)] border-r border-b border-[var(--line)] sticky left-0 z-10 bg-[var(--paper)] select-none flex items-center justify-center min-h-[52px]"
          style={{
            gridColumn: 1,
            gridRow: hIndex + 1,
          }}
        >
          {hour}
        </div>
      ))}

      {/* 2. Chair Grid Cells (Columns 2 .. effectiveChairs.length + 1) */}
      {timeSlots.map((hour, hIndex) =>
        effectiveChairs.map((chair, chairIndex) => {
          const colIndex = chairIndex + 2;
          const isLastCol = chairIndex === effectiveChairs.length - 1;
          return renderSlotCell(
            hour,
            hIndex,
            chair,
            chairIndex,
            timeSlots,
            isLastCol,
            colIndex,
          );
        }),
      )}
    </div>
  );
}
