import { useEffect, useMemo, useState } from "react";
import {
  type TargetSlotInfo,
  type WaitlistUrgency,
  filterWaitlistCandidates,
} from "../waitlistCancellationEngine";
import type { useWaitlistDrawerOperations } from "../useWaitlistDrawerOperations";

export interface UseWaitlistDrawerControllerParams {
  isOpen: boolean;
  onClose: () => void;
  targetSlot?: TargetSlotInfo | null;
  ops: ReturnType<typeof useWaitlistDrawerOperations>;
  dashboard: any;
}

export function useWaitlistDrawerController({
  isOpen,
  onClose,
  targetSlot,
  ops,
  dashboard,
}: UseWaitlistDrawerControllerParams) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrgency, setSelectedUrgency] = useState<WaitlistUrgency | "all">("all");
  const [onlySameDoctor, setOnlySameDoctor] = useState(Boolean(targetSlot?.doctorUserId));
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("all");

  const staff = dashboard?.clinicSettings?.staff ?? [];
  const doctors = staff.filter(
    (s: any) =>
      s.role === "doctor" ||
      s.role === "Врач" ||
      s.role === "admin" ||
      s.role === "owner",
  );
  const patientsList = dashboard?.patients ?? [];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest(".waitlist-item-menu-container")) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [openMenuId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (openMenuId) {
          setOpenMenuId(null);
          return;
        }
        if (ops.isAddFormOpen) {
          ops.setIsAddFormOpen(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openMenuId, ops.isAddFormOpen, ops.setIsAddFormOpen, onClose]);

  useEffect(() => {
    if (targetSlot?.doctorUserId) {
      ops.setPreferredDoctorId(targetSlot.doctorUserId);
      setOnlySameDoctor(true);
    }
  }, [targetSlot?.doctorUserId, ops.setPreferredDoctorId]);

  const filteredCandidates = useMemo(() => {
    const list = filterWaitlistCandidates(ops.items, {
      searchQuery,
      urgencyFilter: selectedUrgency,
      doctorFilter: selectedDoctorFilter,
      onlySameDoctor: Boolean(onlySameDoctor && targetSlot?.doctorUserId),
      targetSlot: targetSlot ?? null,
    });
    const serverMap = ops.serverMatchesMap;
    if (serverMap && serverMap.size > 0) {
      return list.map((c) => {
        const serverMatch =
          serverMap.get(c.item.id) ||
          serverMap.get(c.item.patientId);
        if (serverMatch) {
          const sm = serverMatch as any;
          const sc = c.scoring as any;
          return {
            ...c,
            scoring: {
              ...c.scoring,
              score:
                typeof sm.score === "number"
                  ? sm.score
                  : typeof sc?.score === "number"
                    ? sc.score
                    : 50,
              matchReasons:
                Array.isArray(sm.matchReasons) &&
                sm.matchReasons.length > 0
                  ? (sm.matchReasons as string[])
                  : Array.isArray(sc?.matchReasons)
                    ? sc.matchReasons
                    : [],
            },
          };
        }
        return c;
      });
    }
    return list;
  }, [
    ops.items,
    ops.serverMatchesMap,
    searchQuery,
    selectedUrgency,
    selectedDoctorFilter,
    onlySameDoctor,
    targetSlot,
  ]);

  return {
    isMinimized,
    setIsMinimized,
    openMenuId,
    setOpenMenuId,
    searchQuery,
    setSearchQuery,
    selectedUrgency,
    setSelectedUrgency,
    onlySameDoctor,
    setOnlySameDoctor,
    selectedDoctorFilter,
    setSelectedDoctorFilter,
    doctors,
    patientsList,
    filteredCandidates,
  };
}
