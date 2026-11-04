import React from "react";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import { AppointmentModal } from "../AppointmentModal";
import { WaitlistDrawer } from "../WaitlistDrawer";
import type { WaitlistCandidateItem } from "../waitlist/waitlistTypes";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import {
  type ScheduleViewModalsProps,
  type QuickBookingSlotInfo,
  type TargetSlotInfo,
  type DoctorShift,
  type RosterStaffMember,
  type RosterCabinetDefinition,
  type DateRangeShiftPreset,
  type QuickAddChairData,
} from "./scheduleModalsModules/scheduleModalsTypes";
import { useScheduleSurfaceCoordination } from "./scheduleModalsModules/useScheduleSurfaceCoordination";
import { ScheduleActionModals } from "./scheduleModalsModules/ScheduleActionModals";
import { ScheduleRosterAndSyncModals } from "./scheduleModalsModules/ScheduleRosterAndSyncModals";

export type {
  ScheduleViewModalsProps,
  QuickBookingSlotInfo,
  TargetSlotInfo,
  DoctorShift,
  RosterStaffMember,
  RosterCabinetDefinition,
  DateRangeShiftPreset,
  QuickAddChairData,
};

export function ScheduleViewModals(props: ScheduleViewModalsProps) {
  const {
    quickBookingOpen,
    setQuickBookingOpen,
    quickBookingSlot,
    setQuickBookingSlot,
    modalAppointment,
    setModalAppointment,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
    dashboard,
    auth,
    loadDashboard,
    computedChairDoctorAssignments,
    formatTime,
    patientName,
    toDateTimeLocalValue,
    fromDateTimeLocalValue,
    appointmentLabels,
    activeVisitLockedAppointmentStatuses,
    appointmentReadinessById,
    updateAppointmentScheduleDraft,
    saveAppointmentSchedule,
    repeatAppointment,
    copyAppointmentToBuffer,
    handleOpenWaitlistForSlot,
    updateNewAppointmentDraft,
    focusNewAppointmentEditor,
    createAppointmentFromDraft,
    logicContext,
    showToast,
  } = props;

  // [SCH-02]: Боевое бронирование слота из листа ожидания с реальным запросом в Fastify API
  const handleBookWaitlistSlot = async (
    candidate: WaitlistCandidateItem,
    slot: TargetSlotInfo,
  ) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (auth?.denteClinicalMutationHeaders) {
        Object.assign(headers, auth.denteClinicalMutationHeaders());
      }

      // 1. Если у слота есть appointmentId (окно от отмененного приема), переводим его в planned
      if (slot.appointmentId) {
        const patchRes = await fetch(
          `/api/appointments/${encodeURIComponent(slot.appointmentId)}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              patientId: candidate.patientId,
              status: "planned",
              reason: candidate.treatmentCategory || "Запись из листа ожидания",
              comment: `Окно занято из листа ожидания: ${candidate.patientName}`,
              expectedCurrentStatus: ["cancelled", "no_show"],
            }),
          },
        );

        if (!patchRes.ok) {
          const errData = await patchRes.json().catch(() => ({}));
          throw new Error(
            errData?.message || `Ошибка обновления слота (${patchRes.status})`,
          );
        }
      } else {
        // 2. Если appointmentId нет — создаем новую полноценную запись приема через POST /api/appointments
        const doctorUserId =
          slot.doctorUserId ||
          candidate.preferredDoctorId ||
          (dashboard as any)?.clinicSettings?.staff?.find(
            (s: any) => s.role === "doctor" || s.role === "dentist",
          )?.id ||
          (dashboard as any)?.appointments?.[0]?.doctorUserId;

        const payload: Record<string, any> = {
          patientId: candidate.patientId,
          doctorUserId,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          status: "planned",
          reason: candidate.treatmentCategory || "Запись из листа ожидания",
          notes: candidate.notes || undefined,
        };
        if (slot.chairId) {
          payload.chairId = slot.chairId;
        }

        const createRes = await fetch("/api/appointments", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          throw new Error(
            errData?.message || `Ошибка создания записи (${createRes.status})`,
          );
        }
      }

      // 3. Переводим заявку в листе ожидания в статус booked на бэкенде
      const entryId = candidate.id;
      if (entryId) {
        await fetch(`/api/waitlist/${encodeURIComponent(entryId)}/status`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: "booked" }),
        }).catch(() => {
          return fetch(`/api/waitlist/${encodeURIComponent(entryId)}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ status: "booked" }),
          }).catch(() => {
            return fetch(`/api/waitlist/${encodeURIComponent(entryId)}/status`, {
              method: "PATCH",
              headers,
              body: JSON.stringify({ status: "fulfilled" }),
            }).catch(() => {});
          });
        });
      }

      if (typeof showToast === "function") {
        showToast(
          `Пациент «${candidate.patientName}» успешно записан в расписание!`,
          "success",
          5000,
        );
      }

      if (typeof loadDashboard === "function") {
        await loadDashboard();
      }

      setWaitlistOpen(false);
      setWaitlistQuickFillSlot(null);
      useUiSurfaceStore.getState().closeDrawer("waitlist");
    } catch (err: any) {
      if (typeof showToast === "function") {
        showToast(
          err?.message || "Не удалось записать пациента из листа ожидания",
          "error",
        );
      }
      throw err;
    }
  };

  // Surface coordination: mutual exclusion between drawers and modals
  useScheduleSurfaceCoordination(props);
  const isWaitlistDrawerActive = useUiSurfaceStore((s) => s.activeDrawer === "waitlist");

  return (
    <>
      <QuickBookingDrawer
        isOpen={quickBookingOpen}
        onClose={() => {
          setQuickBookingOpen(false);
          setQuickBookingSlot(null);
          useUiSurfaceStore.getState().closeDrawer("quick_booking");
        }}
        initialSlot={quickBookingSlot}
        editingAppointment={quickBookingSlot?.editingAppointment || null}
        dashboard={dashboard as any}
        auth={auth}
        loadDashboard={
          typeof loadDashboard === "function"
            ? async () => {
                await loadDashboard();
              }
            : undefined
        }
        setDashboard={logicContext?.setDashboard}
        toDateTimeLocalValue={toDateTimeLocalValue}
        fromDateTimeLocalValue={fromDateTimeLocalValue}
        chairDoctorAssignments={computedChairDoctorAssignments}
      />

      <AppointmentModal
        isOpen={modalAppointment !== null}
        appointment={modalAppointment}
        dashboard={dashboard as any}
        onClose={() => {
          setModalAppointment(null);
          useUiSurfaceStore.getState().closePrimaryModal("appointment_modal");
        }}
        onSave={async (appointmentId, draft) => {
          const allowOverbooking = Boolean((draft as any).allowOverbooking);
          const allowEmergencyOverride = Boolean(
            (draft as any).allowEmergencyOverride,
          );
          if (
            appointmentId.startsWith("new") &&
            typeof createAppointmentFromDraft === "function"
          ) {
            for (const [key, value] of Object.entries(draft)) {
              updateNewAppointmentDraft(key, value);
            }
            return Boolean(
              await createAppointmentFromDraft({
                allowOverbooking,
                allowEmergencyOverride,
              }),
            );
          }
          for (const [key, value] of Object.entries(draft)) {
            updateAppointmentScheduleDraft(appointmentId, key, value);
          }
          return await saveAppointmentSchedule(appointmentId, {
            allowOverbooking,
            allowEmergencyOverride,
          });
        }}
        repeatAppointment={repeatAppointment}
        copyAppointmentToBuffer={copyAppointmentToBuffer}
        patientName={patientName}
        formatTime={formatTime}
        toDateTimeLocalValue={toDateTimeLocalValue}
        fromDateTimeLocalValue={fromDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
        appointmentReadinessById={appointmentReadinessById}
        chairDoctorAssignments={computedChairDoctorAssignments}
        onOpenWaitlistForSlot={handleOpenWaitlistForSlot}
      />

      <WaitlistDrawer
        isOpen={waitlistOpen || waitlistQuickFillSlot !== null || isWaitlistDrawerActive}
        onClose={() => {
          setWaitlistOpen(false);
          setWaitlistQuickFillSlot(null);
          useUiSurfaceStore.getState().closeDrawer("waitlist");
        }}
        targetSlot={waitlistQuickFillSlot}
        onBookSlot={handleBookWaitlistSlot}
        updateNewAppointmentDraft={updateNewAppointmentDraft}
        focusNewAppointmentEditor={focusNewAppointmentEditor}
        dashboard={dashboard}
        auth={auth}
        onAppointmentCreated={() => {
          if (typeof loadDashboard === "function") {
            void loadDashboard();
          }
        }}
      />

      <ScheduleActionModals {...props} />
      <ScheduleRosterAndSyncModals {...props} />
    </>
  );
}
