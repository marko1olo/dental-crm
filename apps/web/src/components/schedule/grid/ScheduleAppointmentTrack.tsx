import React from "react";
import { Clock, Plus, X, Zap } from "lucide-react";
import {
  type Appointment,
  type Dashboard,
  getStomxWorkplacePalette,
} from "@dental/shared";
import { GridAppointmentCard } from ".././GridAppointmentCard";
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
    ((appointmentId: string, updates: any) => Promise<any> | void) | undefined;
  onSlotClick: (slot: QuickBookingSlotInfo) => void;
  emergencyReserveSlots: Array<any>;
}

const DEFAULT_EMPTY_SLOT_CELL_DATA = {
  cellAppointments: [] as Appointment[],
  continuingAppointments: [] as Appointment[],
  cellMaintenance: [] as ChairMaintenanceBlock[],
};

export function ScheduleAppointmentTrack({
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
}: ScheduleAppointmentTrackProps) {
  return (
    <div className="divide-y divide-[var(--line)]">
      {timeSlots.map((hour, hIndex) => {
        const [sH, sM] = hour.split(":").map(Number);
        const slotStartMin = (sH ?? 0) * 60 + (sM ?? 0);

        return (
          <div
            key={hour}
            className="schedule-time-row grid min-w-full hover:bg-[var(--paper-soft)]/50 transition-colors"
            style={{
              minWidth:
                effectiveChairs.length > 1
                  ? `${Math.max(260, 72 + effectiveChairs.length * 180)}px`
                  : undefined,
              gridTemplateColumns: `clamp(76px, 15vw, 90px) repeat(${effectiveChairs.length}, minmax(180px, 1fr))`,
              contain: "content",
              contentVisibility: "auto",
              containIntrinsicSize: "1px 36px",
            }}
          >
            {/* Time label */}
            <div className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-center text-xs font-bold text-[var(--muted)] border-r border-[var(--line)] sticky left-0 z-10 bg-[var(--paper)] select-none flex items-center justify-center">
              {hour}
            </div>

            {/* Chair Cells */}
            {effectiveChairs.map((chair, chairIndex) => {
              const chairPalette = getStomxWorkplacePalette(
                (chair as any).colorId ?? chair.id ?? chairIndex,
              );
              const cellData =
                chairSlotCellMap.get(`${chair.id}_${slotStartMin}`) ??
                EMPTY_SLOT_CELL_DATA;
              const {
                cellAppointments,
                continuingAppointments,
                cellMaintenance,
              } = cellData;

              if (
                cellAppointments.length > 0 ||
                cellMaintenance.length > 0 ||
                continuingAppointments.length > 0
              ) {
                return (
                  <div
                    key={chair.id}
                    className="p-1 border-r border-[var(--line)] last:border-r-0 space-y-1 min-h-[36px]"
                    data-chair-id={chair.id}
                    data-chair-palette={chairPalette.nameRu}
                  >
                    {continuingAppointments.map((cA) => {
                      const cPatientName = patientName(
                        dashboard.patients,
                        cA.patientId,
                      );
                      return (
                        <div
                          key={`continuing-${cA.id}`}
                          className="w-full p-2 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/5 text-xs text-[var(--ink)] flex items-center justify-between"
                          title={`Приём продолжается: ${cPatientName}`}
                          data-testid={`appointment-continuing-${chair.id}-${hour.replace(":", "-")}`}
                        >
                          <div className="flex items-center gap-1.5 truncate min-w-0">
                            <Clock
                              size={12}
                              className="text-teal-600 dark:text-teal-400 shrink-0"
                            />
                            <span className="truncate">
                              Приём продолжается ({cPatientName})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {cellMaintenance.map((mBlock) => {
                      const mReasonLabel =
                        mBlock.reason === "sanitation"
                          ? "Санитарный буфер (СанПиН 3.3686-21)"
                          : mBlock.reason === "tech_break"
                            ? "Технический перерыв"
                            : mBlock.reason === "maintenance"
                              ? "Техобслуживание"
                              : mBlock.reason;
                      const mDuration =
                        mBlock.startsAt && mBlock.endsAt
                          ? Math.round(
                              (Date.parse(mBlock.endsAt) -
                                Date.parse(mBlock.startsAt)) /
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
                      const isNearBottom = hIndex >= 8;
                      const isNearRightEdge =
                        chairIndex >= effectiveChairs.length - 1 &&
                        effectiveChairs.length > 1;
                      return (
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
                          isStatusPickerOpen={
                            activeStatusPickerApptId === a.id
                          }
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
                    })}
                  </div>
                );
              }

              // Empty cell with 1-click booking & Drag-and-Drop collision safety
              return (
                <div
                  key={chair.id}
                  className="p-0.5 sm:p-1 border-r border-[var(--line)] last:border-r-0 min-h-[36px] flex items-center justify-center"
                  data-chair-id={chair.id}
                  data-chair-palette={chairPalette.nameRu}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const rawData =
                        e.dataTransfer.getData("application/json");
                      if (!rawData) return;
                      const data = JSON.parse(rawData);
                      if (
                        data?.type === "appointment" &&
                        data.appointmentId
                      ) {
                        const sourceAppt = (appointments ?? []).find(
                          (x) => x.id === data.appointmentId,
                        );
                        if (!sourceAppt) return;
                        const targetChairId =
                          chair.id !== "default-chair" ? chair.id : null;
                        const assignedDocId = getDoctorForChairAndHour(
                          chair.id,
                          hour,
                        );
                        const targetDoctorId =
                          selectedDoctorId ||
                          assignedDocId ||
                          sourceAppt.doctorUserId;
                        const targetDocName =
                          dashboard?.clinicSettings?.staff?.find(
                            (m) => m.id === targetDoctorId,
                          )?.fullName ||
                          effectiveChairAssignments[chair.id]?.doctorName ||
                          undefined;
                        const slotDuration = data.durationMinutes || 30;
                        const {
                          startIso: targetStartIso,
                          endIso: targetEndIso,
                        } = safeBuildSlotIso(dateKey, hour, slotDuration);
                        const isSourceCito = isCitoAppointment(sourceAppt);

                        const collisionCheck =
                          checkAppointmentResourceCollision(
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
                              chairMaintenanceBlocks:
                                effectiveMaintenanceBlocks,
                              formatTimeFn: (iso) =>
                                toDateTimeLocalValue(iso, timezone).slice(
                                  11,
                                  16,
                                ),
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
                                ? patientName(
                                    dashboard?.patients ?? [],
                                    sourceAppt.patientId,
                                  )
                                : "Пациент";
                              showToast(
                                `«${pName}» перенесен(а) на ${hour}`,
                                "success",
                                3000,
                              );
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
                      } else if (
                        data?.type === "waitlist_item" &&
                        data.item
                      ) {
                        const waitlistItem = data.item;
                        const targetChairId =
                          chair.id !== "default-chair" ? chair.id : null;
                        const assignedDocId = getDoctorForChairAndHour(
                          chair.id,
                          hour,
                        );
                        const targetDoctorId =
                          selectedDoctorId ||
                          assignedDocId ||
                          waitlistItem.preferredDoctorId ||
                          (dashboard?.clinicSettings?.staff?.find(
                            (m) => m.active && m.role === "doctor",
                          )?.id ??
                            null);
                        const targetWaitlistDocName =
                          dashboard?.clinicSettings?.staff?.find(
                            (m) => m.id === targetDoctorId,
                          )?.fullName ||
                          effectiveChairAssignments[chair.id]?.doctorName ||
                          undefined;
                        const slotDuration =
                          waitlistItem.durationMinutes || 30;
                        const {
                          startIso: targetStartIso,
                          endIso: targetEndIso,
                        } = safeBuildSlotIso(dateKey, hour, slotDuration);

                        const collisionCheck =
                          checkAppointmentResourceCollision(
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
                                toDateTimeLocalValue(iso, timezone).slice(
                                  11,
                                  16,
                                ),
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
                          void fetch(
                            `/api/waitlist/${waitlistItem.id}/status`,
                            {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                ...denteAdminSecretRequestHeaders(),
                              },
                              body: JSON.stringify({ status: "fulfilled" }),
                            },
                          ).catch((err) => {
                            console.warn(
                              "Failed to fulfill waitlist item:",
                              err,
                            );
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
                  }}
                >
                  {(() => {
                    const assignedDocId = getDoctorForChairAndHour(
                      chair.id,
                      hour,
                    );
                    const slotDocId =
                      assignedDocId || selectedDoctorId || null;
                    const slotDocName =
                      dashboard?.clinicSettings?.staff?.find(
                        (m) => m.id === slotDocId,
                      )?.fullName ||
                      effectiveChairAssignments[chair.id]?.doctorName ||
                      undefined;
                    const isEmergencyBuffer = emergencyReserveSlots.some(
                      (r) => {
                        const rHour = toDateTimeLocalValue(
                          r.startTime,
                          timezone,
                        ).slice(11, 13);
                        return rHour === hour.slice(0, 2);
                      },
                    );

                    if (isEmergencyBuffer) {
                      return (
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
                      );
                    }

                    const hasDoctorForDay = Boolean(
                      effectiveChairAssignments[chair.id]?.doctorId,
                    );
                    const isOffDuty = hasDoctorForDay && !assignedDocId;

                    if (isOffDuty) {
                      const offDutyDocName = selectedDoctorId
                        ? dashboard?.clinicSettings?.staff?.find(
                            (m) => m.id === selectedDoctorId,
                          )?.fullName
                        : undefined;
                      return (
                        <button
                          type="button"
                          onClick={() =>
                            onSlotClick({
                              dateKey,
                              startTime: hour,
                              chairId: chair.id,
                              doctorUserId: selectedDoctorId || null,
                              doctorName: offDutyDocName,
                              durationMinutes: 30,
                            })
                          }
                          className="w-full h-full min-h-[30px] sm:min-h-[32px] rounded-lg border border-dashed border-[var(--line)] bg-[var(--paper-soft)]/40 hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1 px-2 cursor-pointer transition-colors"
                          title={`Вне графика смены врача на ${hour} (${chair.name}). Нажмите для записи`}
                          aria-label={`Вне графика врача на ${hour}, кресло ${chair.name}`}
                          data-testid={`btn-slot-${chair.id}-${hour.replace(":", "")}`}
                        >
                          <Clock
                            size={11}
                            className="opacity-50 shrink-0"
                          />
                          <span className="text-[10px] text-[var(--muted)]">
                            Вне смены ({hour})
                          </span>
                        </button>
                      );
                    }

                    return (
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
                    );
                  })()}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
