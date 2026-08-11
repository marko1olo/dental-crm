import { useCallback, useEffect } from "react";
import type { Dashboard } from "@dental/shared";

export interface DashboardReconcilerProps {
  dashboard: Dashboard | null;
  selectedProtocolId: string | null;
  setSelectedProtocolId: (id: string | null) => void;
  scheduleDoctorFilterId: string | null;
  setScheduleDoctorFilterId: (id: string | null) => void;
  scheduleAssistantFilterId: string | null;
  setScheduleAssistantFilterId: (id: string | null) => void;
  scheduleChairFilterId: string | null;
  setScheduleChairFilterId: (id: string | null) => void;
  scheduleDefaultDoctorUserId: string | null;
  setScheduleDefaultDoctorUserId: (id: string | null) => void;
  scheduleDefaultAssistantUserId: string | null;
  setScheduleDefaultAssistantUserId: (id: string | null) => void;
  scheduleDefaultChairId: string | null;
  setScheduleDefaultChairId: (id: string | null) => void;
  telegramLinkStaffId: string;
  setTelegramLinkStaffId: (id: string) => void;
}

export function useDashboardReconciler({
  dashboard,
  selectedProtocolId,
  setSelectedProtocolId,
  scheduleDoctorFilterId,
  setScheduleDoctorFilterId,
  scheduleAssistantFilterId,
  setScheduleAssistantFilterId,
  scheduleChairFilterId,
  setScheduleChairFilterId,
  scheduleDefaultDoctorUserId,
  setScheduleDefaultDoctorUserId,
  scheduleDefaultAssistantUserId,
  setScheduleDefaultAssistantUserId,
  scheduleDefaultChairId,
  setScheduleDefaultChairId,
  telegramLinkStaffId,
  setTelegramLinkStaffId,
}: DashboardReconcilerProps) {
  const reconcileDashboardScopedUiSelections = useCallback(
    function reconcileDashboardScopedUiSelections() {
      if (!dashboard) return;
      const doctorIds = new Set(
        (dashboard?.clinicSettings?.staff || [])
          .filter(
            (member) =>
              member.active &&
              (member.role === "doctor" || member.role === "owner"),
          )
          .map((member) => member.id),
      );
      const assistantIds = new Set(
        (dashboard?.clinicSettings?.staff || [])
          .filter((member) => member.active && member.role === "assistant")
          .map((member) => member.id),
      );
      const staffIds = new Set(
        (dashboard?.clinicSettings?.staff || [])
          .filter((member) => member.active)
          .map((member) => member.id),
      );
      const chairIds = new Set(
        (dashboard?.clinicSettings?.chairs || [])
          .filter((chair) => chair.active)
          .map((chair) => chair.id),
      );
      const protocolIds = new Set(
        dashboard?.protocolTemplates?.map((template) => template.id),
      );

      if (selectedProtocolId && !protocolIds.has(selectedProtocolId))
        setSelectedProtocolId(null);
      if (scheduleDoctorFilterId && !doctorIds.has(scheduleDoctorFilterId))
        setScheduleDoctorFilterId(null);
      if (
        scheduleAssistantFilterId &&
        !assistantIds.has(scheduleAssistantFilterId)
      )
        setScheduleAssistantFilterId(null);
      if (scheduleChairFilterId && !chairIds.has(scheduleChairFilterId))
        setScheduleChairFilterId(null);
      if (
        scheduleDefaultDoctorUserId &&
        !doctorIds.has(scheduleDefaultDoctorUserId)
      )
        setScheduleDefaultDoctorUserId(null);
      if (
        scheduleDefaultAssistantUserId &&
        !assistantIds.has(scheduleDefaultAssistantUserId)
      )
        setScheduleDefaultAssistantUserId(null);
      if (scheduleDefaultChairId && !chairIds.has(scheduleDefaultChairId))
        setScheduleDefaultChairId(null);
      if (telegramLinkStaffId && !staffIds.has(telegramLinkStaffId))
        setTelegramLinkStaffId("");
    },
    [
      dashboard,
      setScheduleChairFilterId,
      setScheduleDefaultDoctorUserId,
      setScheduleDefaultAssistantUserId,
      setScheduleDefaultChairId,
      setTelegramLinkStaffId,
      scheduleChairFilterId,
      scheduleDefaultDoctorUserId,
      scheduleDefaultAssistantUserId,
      scheduleDefaultChairId,
      telegramLinkStaffId,
      setScheduleDoctorFilterId,
      scheduleDoctorFilterId,
      setSelectedProtocolId,
      selectedProtocolId,
      scheduleAssistantFilterId,
      setScheduleAssistantFilterId,
    ],
  );

  useEffect(() => {
    reconcileDashboardScopedUiSelections();
  }, [dashboard, reconcileDashboardScopedUiSelections]);

  return { reconcileDashboardScopedUiSelections };
}
