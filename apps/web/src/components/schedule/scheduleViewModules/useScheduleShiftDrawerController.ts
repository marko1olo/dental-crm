import type { Dashboard } from "@dental/shared";
import { useCallback, useEffect, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
  applyDoctorChairDateRange,
  type DateRangeShiftPreset,
  type DoctorShift,
} from "../roster/DoctorShiftRosterModal";
import {
  DEFAULT_SOLO_CHAIR,
  formatDoctorShortName,
} from "../ScheduleGrid";
import {
  DEFAULT_CLINIC_STAFF,
  CLINIC_CABINETS_CATALOG,
} from "../roster/doctorShiftRosterPresets";
import { isDemoShowcaseMode } from "../../../lib/demoMode";

export type ScheduleShiftDrawerControllerProps = {
  currentDateKey: string;
  scheduleDoctorFilterId: string | null;
  scheduleChairFilterId: string | null;
  rosterStaffList: any[];
  rosterCabinets: any[];
  scheduleDoctors: any[];
  dashboard?: Dashboard;
  savedDoctorShifts: DoctorShift[];
  handleSaveDoctorShifts: (shifts: DoctorShift[]) => Promise<void>;
};

export function useScheduleShiftDrawerController(props: ScheduleShiftDrawerControllerProps) {
  const {
    currentDateKey,
    scheduleDoctorFilterId,
    scheduleChairFilterId,
    rosterStaffList,
    rosterCabinets,
    scheduleDoctors,
    dashboard,
    savedDoctorShifts,
    handleSaveDoctorShifts,
  } = props;

  // DoctorShiftDrawer state (Mandate 8e / DENTE Architecture)
  const [editingDrawerShift, setEditingDrawerShift] = useState<Partial<DoctorShift> | null>(null);
  const [isNewDrawerShift, setIsNewDrawerShift] = useState(false);

  // ChairDateRangeModal state
  const [isChairDateRangeModalOpen, setIsChairDateRangeModalOpen] = useState(false);
  const [chairRangeDoctorId, setChairRangeDoctorId] = useState("");
  const [chairRangeChairId, setChairRangeChairId] = useState("");
  const [chairRangeStartDate, setChairRangeStartDate] = useState(currentDateKey);
  const [chairRangeEndDate, setChairRangeEndDate] = useState(currentDateKey);
  const [chairRangePreset, setChairRangePreset] = useState<DateRangeShiftPreset>("full");

  const handleOpenDoctorShiftDrawer = useCallback(
    (shiftToEdit?: Partial<DoctorShift> | null) => {
      if (shiftToEdit) {
        setEditingDrawerShift(shiftToEdit);
        setIsNewDrawerShift(false);
        return;
      }
      const defaultDoc =
        rosterStaffList.find((s) => s.id === scheduleDoctorFilterId) ||
        rosterStaffList.find((s) => s.isDoctor) ||
        rosterStaffList[0] ||
        (isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF[0]! : undefined);

      const defaultCab = rosterCabinets[0] || CLINIC_CABINETS_CATALOG[0]!;
      const defaultChair =
        defaultCab.chairs?.[0]?.id ||
        dashboard?.clinicSettings?.chairs?.[0]?.id ||
        "chair-1";

      const existingShift = savedDoctorShifts.find(
        (s) =>
          s.dateIso === currentDateKey &&
          (!defaultDoc || s.doctorId === defaultDoc.id),
      );

      if (existingShift) {
        setEditingDrawerShift(existingShift);
        setIsNewDrawerShift(false);
      } else {
        setEditingDrawerShift({
          id: `shift-${Date.now()}`,
          doctorId: defaultDoc?.id || "doc-1",
          doctorName:
            defaultDoc?.shortName || defaultDoc?.fullName || "Врач",
          doctorRole: (defaultDoc?.role as any) || "doctor",
          assistantId: defaultDoc?.defaultAssistantId || null,
          assistantName: null,
          cabinetId: defaultCab.id,
          chairId: defaultChair,
          dateIso: currentDateKey,
          archetypeId: "morning_shift",
          startTime: "08:30",
          endTime: "14:30",
          durationHours: 6.0,
          breakMinutes: 0,
          isNight: false,
          nightHours: 0,
          status: "scheduled",
        });
        setIsNewDrawerShift(true);
      }
    },
    [
      scheduleDoctorFilterId,
      rosterStaffList,
      rosterCabinets,
      dashboard?.clinicSettings?.chairs,
      savedDoctorShifts,
      currentDateKey,
    ],
  );

  const handleCloseDoctorShiftDrawer = useCallback(() => {
    setEditingDrawerShift(null);
  }, []);

  const handleSaveDrawerShift = useCallback(
    (finalizedShift: DoctorShift, isNew: boolean) => {
      let updatedShifts: DoctorShift[];
      if (isNew) {
        updatedShifts = [...savedDoctorShifts, finalizedShift];
      } else {
        updatedShifts = savedDoctorShifts.map((s) =>
          s.id === finalizedShift.id ? finalizedShift : s,
        );
      }
      void handleSaveDoctorShifts(updatedShifts);
      setEditingDrawerShift(null);
      showToast("Смена врача успешно сохранена", "success");
    },
    [savedDoctorShifts, handleSaveDoctorShifts],
  );

  const handleDeleteDrawerShift = useCallback(
    (shiftId: string) => {
      const updatedShifts = savedDoctorShifts.filter((s) => s.id !== shiftId);
      void handleSaveDoctorShifts(updatedShifts);
      setEditingDrawerShift(null);
      showToast("Смена удалена из расписания", "info");
    },
    [savedDoctorShifts, handleSaveDoctorShifts],
  );

  const handleOpenChairDateRangeModal = useCallback(() => {
    if (!chairRangeStartDate) setChairRangeStartDate(currentDateKey);
    if (!chairRangeEndDate) setChairRangeEndDate(currentDateKey);
    if (!chairRangeDoctorId && scheduleDoctors[0]?.id) {
      setChairRangeDoctorId(scheduleDoctorFilterId || scheduleDoctors[0].id);
    }
    if (!chairRangeChairId && dashboard?.clinicSettings?.chairs?.[0]?.id) {
      setChairRangeChairId(
        scheduleChairFilterId || dashboard.clinicSettings.chairs[0].id,
      );
    }
    setIsChairDateRangeModalOpen(true);
  }, [
    currentDateKey,
    chairRangeStartDate,
    chairRangeEndDate,
    chairRangeDoctorId,
    scheduleDoctors,
    scheduleDoctorFilterId,
    chairRangeChairId,
    dashboard?.clinicSettings?.chairs,
    scheduleChairFilterId,
  ]);

  const handleCloseChairDateRangeModal = useCallback(() => {
    setIsChairDateRangeModalOpen(false);
  }, []);

  const handleApplyChairDateRange = useCallback(() => {
    const targetDocId = chairRangeDoctorId || scheduleDoctors[0]?.id;
    const targetChairId =
      chairRangeChairId ||
      dashboard?.clinicSettings?.chairs?.[0]?.id ||
      DEFAULT_SOLO_CHAIR.id;
    if (!chairRangeStartDate || !chairRangeEndDate || !targetDocId || !targetChairId) {
      showToast("Укажите диапазон дат, врача и кресло", "warning");
      return;
    }
    const doc =
      scheduleDoctors.find((d) => d.id === targetDocId) ||
      (dashboard?.clinicSettings?.staff ?? []).find((s) => s.id === targetDocId);
    const chairObj =
      (dashboard?.clinicSettings?.chairs ?? []).find((c) => c.id === targetChairId) ||
      DEFAULT_SOLO_CHAIR;

    const currentShifts = savedDoctorShifts;
    const updatedShifts = applyDoctorChairDateRange(currentShifts, {
      startDateIso: chairRangeStartDate,
      endDateIso: chairRangeEndDate,
      doctorId: targetDocId,
      chairId: targetChairId,
      shiftPreset: chairRangePreset,
      staffList:
        (dashboard?.clinicSettings?.staff as any) ||
        (scheduleDoctors as any),
    });

    void handleSaveDoctorShifts(updatedShifts);

    showToast(
      `График врача ${doc?.fullName ? formatDoctorShortName(doc.fullName) : ""} применен на кресло «${chairObj.name}» (${chairRangeStartDate} — ${chairRangeEndDate})`,
      "success",
      3500,
    );
    setIsChairDateRangeModalOpen(false);
  }, [
    chairRangeDoctorId,
    scheduleDoctors,
    chairRangeChairId,
    dashboard?.clinicSettings,
    chairRangeStartDate,
    chairRangeEndDate,
    chairRangePreset,
    savedDoctorShifts,
    handleSaveDoctorShifts,
  ]);

  useEffect(() => {
    const handleOpenShiftDrawerEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<DoctorShift> | undefined>;
      handleOpenDoctorShiftDrawer(customEvent.detail || null);
    };
    const handleOpenChairRangeModalEvent = () => {
      handleOpenChairDateRangeModal();
    };

    window.addEventListener("dente:open-doctor-shift-drawer", handleOpenShiftDrawerEvent);
    window.addEventListener("dente-open-doctor-shift-drawer", handleOpenShiftDrawerEvent);
    window.addEventListener("dente:open-chair-range-modal", handleOpenChairRangeModalEvent);
    window.addEventListener("dente-open-chair-range-modal", handleOpenChairRangeModalEvent);

    return () => {
      window.removeEventListener("dente:open-doctor-shift-drawer", handleOpenShiftDrawerEvent);
      window.removeEventListener("dente-open-doctor-shift-drawer", handleOpenShiftDrawerEvent);
      window.removeEventListener("dente:open-chair-range-modal", handleOpenChairRangeModalEvent);
      window.removeEventListener("dente-open-chair-range-modal", handleOpenChairRangeModalEvent);
    };
  }, [handleOpenDoctorShiftDrawer, handleOpenChairDateRangeModal]);

  return {
    editingDrawerShift,
    setEditingDrawerShift,
    isNewDrawerShift,
    isChairDateRangeModalOpen,
    setIsChairDateRangeModalOpen,
    chairRangeDoctorId,
    setChairRangeDoctorId,
    chairRangeChairId,
    setChairRangeChairId,
    chairRangeStartDate,
    setChairRangeStartDate,
    chairRangeEndDate,
    setChairRangeEndDate,
    chairRangePreset,
    setChairRangePreset,
    handleOpenDoctorShiftDrawer,
    handleCloseDoctorShiftDrawer,
    handleSaveDrawerShift,
    handleDeleteDrawerShift,
    handleOpenChairDateRangeModal,
    handleCloseChairDateRangeModal,
    handleApplyChairDateRange,
  };
}
