/**
 * useGridDisplaySettings.ts — Hook managing grid time step, chair maintenance blocks, and revenue visibility.
 */

import { useCallback, useState } from "react";
import { showToast } from "../../../GlobalToast";
import type { ChairMaintenanceBlock } from "../../../../utils/scheduleCollisionUtils";
import {
  safeLocalStorageGetItem,
  safeLocalStorageSetItem,
} from "../../../../lib/safeLocalStorage";
import { safeBuildSlotIso } from "../gridSlotMath";

export function useGridDisplaySettings(
  dateKey: string,
  gridStepMinutes?: 15 | 30 | 60,
  onGridStepChange?: (step: 15 | 30 | 60) => void,
  chairMaintenanceBlocks?: ChairMaintenanceBlock[],
  onAddChairMaintenance?: (block: ChairMaintenanceBlock) => void,
  onRemoveChairMaintenance?: (blockId: string) => void,
) {
  const [internalGridStep, setInternalGridStep] = useState<15 | 30 | 60>(() => gridStepMinutes ?? 30);
  const gridStep = gridStepMinutes ?? internalGridStep;

  const [internalMaintenanceBlocks, setInternalMaintenanceBlocks] = useState<ChairMaintenanceBlock[]>(() => {
    try {
      const raw = safeLocalStorageGetItem("dente_schedule_chair_maintenance_blocks");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const effectiveMaintenanceBlocks = chairMaintenanceBlocks ?? internalMaintenanceBlocks;

  const [showRevenue, setShowRevenue] = useState<boolean>(() => {
    return safeLocalStorageGetItem("dente_schedule_show_revenue") === "true";
  });

  const handleToggleShowRevenue = useCallback(() => {
    setShowRevenue((prev) => {
      const next = !prev;
      safeLocalStorageSetItem("dente_schedule_show_revenue", String(next));
      showToast(next ? "Выручка отображается" : "Выручка скрыта (Режим приватности)", "info", 2000);
      return next;
    });
  }, []);

  const handleSetGridStep = useCallback((step: 15 | 30 | 60) => {
    setInternalGridStep(step);
    onGridStepChange?.(step);
  }, [onGridStepChange]);

  const handleAddMaintenance = useCallback(
    (
      chairId: string,
      reason: "sanitation" | "tech_break" | "maintenance" | string,
      durationMinutes: number,
      startTimeStr = "13:00",
    ) => {
      const { startIso, endIso } = safeBuildSlotIso(dateKey, startTimeStr, durationMinutes);
      const newBlock: ChairMaintenanceBlock = {
        id: `maint-${chairId}-${dateKey}-${startTimeStr.replace(":", "")}-${Date.now()}`,
        chairId,
        startsAt: startIso,
        endsAt: endIso,
        reason,
        note: reason === "sanitation" ? "Санитарная обработка" : "Технический перерыв",
      };

      if (onAddChairMaintenance) {
        onAddChairMaintenance(newBlock);
      } else {
        setInternalMaintenanceBlocks((prev) => {
          const next = [...prev, newBlock];
          try {
            safeLocalStorageSetItem("dente_schedule_chair_maintenance_blocks", JSON.stringify(next));
          } catch {}
          return next;
        });
      }
      const label = reason === "sanitation" ? "Санитарная обработка" : "Технический перерыв";
      showToast(`${label} (${durationMinutes} мин) запланирована на ${startTimeStr}`, "success", 3000);
    },
    [dateKey, onAddChairMaintenance],
  );

  const handleRemoveMaintenance = useCallback(
    (blockId: string) => {
      if (onRemoveChairMaintenance) {
        onRemoveChairMaintenance(blockId);
      } else {
        setInternalMaintenanceBlocks((prev) => {
          const next = prev.filter((b) => b.id !== blockId);
          try {
            safeLocalStorageSetItem("dente_schedule_chair_maintenance_blocks", JSON.stringify(next));
          } catch {}
          return next;
        });
      }
      showToast("Техобслуживание завершено, кресло доступно", "success", 2500);
    },
    [onRemoveChairMaintenance],
  );

  return {
    gridStep,
    handleSetGridStep,
    effectiveMaintenanceBlocks,
    handleAddMaintenance,
    handleRemoveMaintenance,
    showRevenue,
    handleToggleShowRevenue,
  };
}
