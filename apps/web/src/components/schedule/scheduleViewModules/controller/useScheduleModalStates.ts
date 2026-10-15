/**
 * useScheduleModalStates.ts
 *
 * Layer 3: Управление состояниями открытия/закрытия модальных окон и служебных панелей расписания.
 */

import { useState } from "react";
import type { Appointment } from "@dental/shared";
import type { QuickAddChairData } from "../../QuickAddChairModal";

export function useScheduleModalStates() {
  const [showShiftAnalytics, setShowShiftAnalytics] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isCalendarSyncModalOpen, setIsCalendarSyncModalOpen] = useState(false);
  const [isTomorrowRemindersOpen, setIsTomorrowRemindersOpen] = useState(false);
  const [isSmartAiOpen, setIsSmartAiOpen] = useState(false);
  const [showConfirmationsPanel, setShowConfirmationsPanel] = useState(false);
  const [showFreedSlotsPanel, setShowFreedSlotsPanel] = useState(false);
  const [showClipboardPanel, setShowClipboardPanel] = useState(false);
  const [clipboardReloadToken, setClipboardReloadToken] = useState(0);

  const [modalAppointment, setModalAppointment] = useState<Appointment | null>(null);
  const [doctorFreeSlotsOpen, setDoctorFreeSlotsOpen] = useState(false);
  const [preventiveInspectionOpen, setPreventiveInspectionOpen] = useState(false);
  const [isQuickAddChairOpen, setIsQuickAddChairOpen] = useState(false);
  const [editingChairData, setEditingChairData] = useState<QuickAddChairData | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [useManualSelects, setUseManualSelects] = useState(false);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [isPendingOnlineBookingsOpen, setIsPendingOnlineBookingsOpen] = useState(false);

  return {
    showShiftAnalytics,
    setShowShiftAnalytics,
    isRosterModalOpen,
    setIsRosterModalOpen,
    isCalendarSyncModalOpen,
    setIsCalendarSyncModalOpen,
    isTomorrowRemindersOpen,
    setIsTomorrowRemindersOpen,
    isSmartAiOpen,
    setIsSmartAiOpen,
    showConfirmationsPanel,
    setShowConfirmationsPanel,
    showFreedSlotsPanel,
    setShowFreedSlotsPanel,
    showClipboardPanel,
    setShowClipboardPanel,
    clipboardReloadToken,
    setClipboardReloadToken,
    modalAppointment,
    setModalAppointment,
    doctorFreeSlotsOpen,
    setDoctorFreeSlotsOpen,
    preventiveInspectionOpen,
    setPreventiveInspectionOpen,
    isQuickAddChairOpen,
    setIsQuickAddChairOpen,
    editingChairData,
    setEditingChairData,
    showCreateForm,
    setShowCreateForm,
    useManualSelects,
    setUseManualSelects,
    isPatientSearchOpen,
    setIsPatientSearchOpen,
    isPendingOnlineBookingsOpen,
    setIsPendingOnlineBookingsOpen,
  };
}

export type ScheduleModalStates = ReturnType<typeof useScheduleModalStates>;
