import { useMemo, useState } from "react";
import {
  buildPatientShiftQueue,
  type PatientQueueAction,
  type PatientQueueItem,
  type PatientShiftQueueResult,
  type PatientShiftQueueTab,
} from "@dental/shared";
import type { TodayQueueBoardProps } from "./todayQueueTypes";

export function useTodayQueueState(props: TodayQueueBoardProps) {
  const {
    appointments = [],
    targetDateKey,
    onStatusChange,
    selectedDoctorId: initialDoctorId = null,
    selectedChairId: initialChairId = null,
    staffList = [],
    chairsList = [],
  } = props;

  const [activeTab, setActiveTab] = useState<PatientShiftQueueTab>("all");
  const [doctorFilter, setDoctorFilter] = useState<string | null>(initialDoctorId);
  const [chairFilter, setChairFilter] = useState<string | null>(initialChairId);
  const [searchQuery, setSearchQuery] = useState("");
  const [inFlightActionId, setInFlightActionId] = useState<string | null>(null);
  const [showLobbyBillboard, setShowLobbyBillboard] = useState(false);

  const staffById = useMemo(() => {
    const map = new Map<string, { name?: string; fullName?: string; specialty?: string }>();
    for (const s of staffList) { if (s.id) map.set(s.id, s); }
    return map;
  }, [staffList]);

  const chairsById = useMemo(() => {
    const map = new Map<string, { name?: string; title?: string }>();
    for (const c of chairsList) { if (c.id) map.set(c.id, c); }
    return map;
  }, [chairsList]);

  const queueResult: PatientShiftQueueResult = useMemo(() => {
    return buildPatientShiftQueue(appointments, {
      targetDateKey,
      selectedDoctorId: doctorFilter,
      selectedChairId: chairFilter,
      staffById,
      chairsById,
    });
  }, [appointments, targetDateKey, doctorFilter, chairFilter, staffById, chairsById]);

  const displayedItems = useMemo(() => {
    const tabItems = queueResult.itemsByTab[activeTab] || [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tabItems;
    return tabItems.filter((item) =>
      item.patientName.toLowerCase().includes(query) ||
      item.patientPhone.toLowerCase().includes(query) ||
      item.doctorName.toLowerCase().includes(query) ||
      item.chairName.toLowerCase().includes(query) ||
      item.reason.toLowerCase().includes(query)
    );
  }, [queueResult, activeTab, searchQuery]);

  const handleActionClick = async (item: PatientQueueItem, action: PatientQueueAction) => {
    if (inFlightActionId) return;
    setInFlightActionId(`${item.id}-${action.actionId}`);
    try {
      if (onStatusChange) await onStatusChange(item.id, action.targetStatus, action.actionId);
    } finally {
      setInFlightActionId(null);
    }
  };

  return {
    activeTab, setActiveTab, doctorFilter, setDoctorFilter, chairFilter, setChairFilter,
    searchQuery, setSearchQuery, inFlightActionId, showLobbyBillboard, setShowLobbyBillboard,
    queueResult, displayedItems, handleActionClick,
  };
}
