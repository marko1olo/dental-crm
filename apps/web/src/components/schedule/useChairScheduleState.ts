import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import {
  DEFAULT_SOLO_CHAIR,
  type ChairDoctorShiftAssignment,
} from "./ScheduleGrid";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import type { ScheduleChair } from "./ScheduleFilterStrip";
import type { QuickAddChairData } from "./QuickAddChairModal";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";
import type { DateRangeShiftPreset } from "./roster/DoctorShiftRosterModal";
import {
  defaultAppointmentLabels,
  type ChairScheduleViewProps,
  resolveChairDutyDoctor,
} from "./ChairScheduleTypes";
import { useChairShiftOperations } from "./useChairShiftOperations";

export function useChairScheduleState(props: ChairScheduleViewProps) {
  const {
    dashboard,
    dateKey,
    appointments,
    onSlotClick,
    onAppointmentClick,
    onAppointmentMove,
    onQuickStatusChange,
    patientName,
    formatTime,
    toDateTimeLocalValue,
    appointmentLabels,
    selectedChairId,
    selectedDoctorId,
    chairDoctorAssignments,
    onAssignChairDoctor,
    onAddChair,
    onAddDoctor,
    onOpenRosterModal,
    onSelectChair,
    hideToolbar,
    gridStepMinutes,
    onGridStepChange,
    selectedBranchId,
    onSelectBranch,
  } = props;

  const rawChairs = dashboard?.clinicSettings?.chairs ?? [];
  const chairs = rawChairs.length > 0 ? rawChairs : [DEFAULT_SOLO_CHAIR as any];
  const isSoloDoctor = chairs.length <= 1;

  const rawBranches = useMemo(() => {
    return (
      (
        dashboard?.clinicSettings as
          | { branches?: Array<{ id: string; name: string; active?: boolean }> }
          | undefined
      )?.branches ?? []
    ).filter((b) => b.active !== false);
  }, [dashboard?.clinicSettings]);
  const hasMultipleBranches = rawBranches.length > 1;

  const doctors = useMemo(() => {
    return (dashboard?.clinicSettings?.staff ?? []).filter(
      (m) =>
        m.active &&
        (m.role === "doctor" || m.role === "owner" || (m as any).role === "chief_doctor"),
    ) as Array<{ id: string; fullName: string; role?: string; specialty?: any }>;
  }, [dashboard?.clinicSettings?.staff]);

  const [activeShiftChairId, setActiveShiftChairId] = useState<string | null>(null);
  const [popoverSelectedDocId, setPopoverSelectedDocId] = useState<Record<string, string>>({});
  const [isShiftsMenuOpen, setIsShiftsMenuOpen] = useState(false);
  const [isAddChairOpen, setIsAddChairOpen] = useState(false);
  const [editingChair, setEditingChair] = useState<QuickAddChairData | null>(null);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [isSubstituteOpen, setIsSubstituteOpen] = useState<Record<string, boolean>>({});

  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
  const [rangeDoctorId, setRangeDoctorId] = useState("");
  const [rangeChairId, setRangeChairId] = useState("");
  const [rangeStartDate, setRangeStartDate] = useState(dateKey || new Date().toISOString().slice(0, 10));
  const [rangeEndDate, setRangeEndDate] = useState(dateKey || new Date().toISOString().slice(0, 10));
  const [rangePreset, setRangePreset] = useState<DateRangeShiftPreset>("morning");

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const shiftsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setActiveShiftChairId(null);
      }
      if (
        shiftsMenuRef.current &&
        !shiftsMenuRef.current.contains(event.target as Node)
      ) {
        setIsShiftsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [internalSelectedChairId, setInternalSelectedChairId] = useState<string | null>(null);
  const effectiveSelectedChairId =
    selectedChairId !== undefined ? selectedChairId : internalSelectedChairId;

  const handleToggleChairFilter = useCallback(
    (chairId: string) => {
      const next = effectiveSelectedChairId === chairId ? null : chairId;
      if (onSelectChair) {
        onSelectChair(next);
      } else {
        setInternalSelectedChairId(next);
      }
    },
    [effectiveSelectedChairId, onSelectChair],
  );

  const resolvedPatientName = useMemo(() => {
    if (patientName) return patientName;
    return (patients: Dashboard["patients"], pId: string | null) => {
      if (!pId) return "Пациент";
      const found = patients?.find((p) => p.id === pId);
      return found?.fullName || "Пациент";
    };
  }, [patientName]);

  const resolvedFormatTime = useMemo(() => {
    if (formatTime) return formatTime;
    return (iso: string) => (iso ? iso.slice(11, 16) : "");
  }, [formatTime]);

  const resolvedToDateTimeLocalValue = useMemo(() => {
    if (toDateTimeLocalValue) return toDateTimeLocalValue;
    return (iso: string) => (iso ? iso.slice(0, 16) : "");
  }, [toDateTimeLocalValue]);

  const resolvedAppointmentLabels = useMemo(() => {
    return appointmentLabels || defaultAppointmentLabels;
  }, [appointmentLabels]);

  const handleOpenAddChair = useCallback(() => {
    setEditingChair(null);
    setIsAddChairOpen(true);
  }, []);

  const handleEditChair = useCallback((chair: QuickAddChairData) => {
    setEditingChair(chair);
    setIsAddChairOpen(true);
  }, []);

  const handleSaveChair = useCallback(
    async (data: QuickAddChairData) => {
      if (onAddChair) {
        await onAddChair(data);
      } else {
        const isUpdate = Boolean(data.id);
        const targetId = data.id || `chair-local-${Date.now()}`;
        const targetRoom =
          data.roomNumber || data.room || `Кабинет ${chairs.length + 1}`;
        const savedChair: any = {
          id: targetId,
          name: data.name,
          room: targetRoom,
          roomNumber: targetRoom,
          specialization: data.specialization || "therapist",
          color: data.color || "#0d9488",
          active: data.isActive !== false,
          isActive: data.isActive !== false,
          defaultDoctorId: data.defaultDoctorId || null,
          ...(data.branchId ? { branchId: data.branchId } : {}),
        };

        if (dashboard?.clinicSettings) {
          if (!dashboard.clinicSettings.chairs) {
            dashboard.clinicSettings.chairs = [];
          }
          if (isUpdate) {
            dashboard.clinicSettings.chairs = dashboard.clinicSettings.chairs.map(
              (c: any) => (c.id === data.id ? { ...c, ...savedChair } : c),
            );
          } else {
            dashboard.clinicSettings.chairs = [
              ...dashboard.clinicSettings.chairs,
              savedChair,
            ];
          }
        }

        if (typeof window !== "undefined" && typeof fetch === "function") {
          const endpoint = isUpdate
            ? `/api/settings/chairs/${encodeURIComponent(data.id!)}`
            : "/api/settings/chairs";
          const method = isUpdate ? "PUT" : "POST";
          try {
            await fetch(endpoint, {
              method,
              headers: {
                ...denteAdminSecretRequestHeaders(),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: data.name,
                room: targetRoom,
                specialization: data.specialization || "therapist",
                color: data.color || "#0d9488",
                active: data.isActive !== false,
                defaultDoctorId: data.defaultDoctorId || null,
                ...(data.branchId ? { branchId: data.branchId } : {}),
              }),
            });
          } catch {
            // Soft fallback per Mandate 8n & 8e
          }
        }
      }
      setIsAddChairOpen(false);
      setEditingChair(null);
    },
    [onAddChair, dashboard?.clinicSettings, chairs.length],
  );

  const shiftOps = useChairShiftOperations({
    chairs,
    doctors,
    dateKey,
    chairDoctorAssignments,
    onAssignChairDoctor,
    dashboard,
    popoverSelectedDocId,
    rangeDoctorId,
    rangeChairId,
    rangeStartDate,
    rangeEndDate,
    rangePreset,
    setActiveShiftChairId,
    setIsSubstituteOpen,
    setIsDateRangeModalOpen,
    setEditingChair,
    setIsAddChairOpen,
  });

  const handleSlotClick = useCallback(
    (slot: QuickBookingSlotInfo) => {
      const slotChairId =
        slot.chairId ||
        effectiveSelectedChairId ||
        chairs[0]?.id ||
        DEFAULT_SOLO_CHAIR.id;

      const targetStartsAt =
        slot.startsAt ||
        (slot.startTime && dateKey ? `${dateKey}T${slot.startTime}:00` : undefined);

      const chairObj =
        chairs.find((c) => c.id === slotChairId) ||
        (slotChairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
      const duty = resolveChairDutyDoctor(
        slotChairId,
        targetStartsAt,
        chairDoctorAssignments,
        dateKey,
        slot.doctorUserId,
        (chairObj as any)?.defaultDoctorId || (doctors.length === 1 ? doctors[0]?.id : null),
      );

      const finalDoctorId = slot.doctorUserId || duty.doctorId || selectedDoctorId || null;
      const finalDoctorName =
        slot.doctorName ||
        (finalDoctorId ? doctors.find((d) => d.id === finalDoctorId)?.fullName : undefined) ||
        chairDoctorAssignments?.[slotChairId]?.doctorName;

      onSlotClick({
        ...slot,
        chairId: slotChairId,
        dateKey: slot.dateKey || dateKey,
        startTime: slot.startTime,
        startsAt: targetStartsAt || slot.startsAt,
        doctorUserId: finalDoctorId,
        doctorName: finalDoctorName,
      });
    },
    [
      chairs,
      effectiveSelectedChairId,
      dateKey,
      chairDoctorAssignments,
      selectedDoctorId,
      doctors,
      onSlotClick,
    ],
  );

  return {
    chairs,
    isSoloDoctor,
    rawBranches,
    hasMultipleBranches,
    doctors,
    activeShiftChairId,
    setActiveShiftChairId,
    popoverSelectedDocId,
    setPopoverSelectedDocId,
    isShiftsMenuOpen,
    setIsShiftsMenuOpen,
    isAddChairOpen,
    setIsAddChairOpen,
    editingChair,
    setEditingChair,
    isAddDoctorOpen,
    setIsAddDoctorOpen,
    isSubstituteOpen,
    setIsSubstituteOpen,
    isDateRangeModalOpen,
    setIsDateRangeModalOpen,
    rangeDoctorId,
    setRangeDoctorId,
    rangeChairId,
    setRangeChairId,
    rangeStartDate,
    setRangeStartDate,
    rangeEndDate,
    setRangeEndDate,
    rangePreset,
    setRangePreset,
    popoverRef,
    shiftsMenuRef,
    effectiveSelectedChairId,
    handleToggleChairFilter,
    resolvedPatientName,
    resolvedFormatTime,
    resolvedToDateTimeLocalValue,
    resolvedAppointmentLabels,
    handleOpenAddChair,
    handleEditChair,
    handleSaveChair,
    handleSlotClick,
    ...shiftOps,
  };
}
