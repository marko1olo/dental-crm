/**
 * useGridDisplaySettings.ts — Hook managing grid time step and revenue visibility.
 * Mandate 8i & [SCH-01]: CRM is not a reality simulator. Zero artificial chair sanitation
 * locks or forced maintenance blocks in localStorage.
 */

import { useCallback, useState } from "react";
import { showToast } from "../../../GlobalToast";
import type { ChairMaintenanceBlock } from "../../../../utils/scheduleCollisionUtils";
import {
  safeLocalStorageGetItem,
  safeLocalStorageSetItem,
} from "../../../../lib/safeLocalStorage";

export function useGridDisplaySettings(
  _dateKey: string,
  gridStepMinutes?: 15 | 30 | 60,
  onGridStepChange?: (step: 15 | 30 | 60) => void,
  chairMaintenanceBlocks?: ChairMaintenanceBlock[],
  _onAddChairMaintenance?: (block: ChairMaintenanceBlock) => void,
  onRemoveChairMaintenance?: (blockId: string) => void,
) {
  const [internalGridStep, setInternalGridStep] = useState<15 | 30 | 60>(() => gridStepMinutes ?? 30);
  const gridStep = gridStepMinutes ?? internalGridStep;

  // [SCH-01]: Zero artificial chair sanitation locks in localStorage. Clean schedule grid.
  const effectiveMaintenanceBlocks = chairMaintenanceBlocks ?? [];

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

  // [SCH-01]: Clean no-op to eliminate artificial chair maintenance blocks and time-locks
  const handleAddMaintenance = useCallback(
    (
      _chairId: string,
      _reason: "sanitation" | "tech_break" | "maintenance" | string,
      _durationMinutes: number,
      _startTimeStr = "13:00",
    ) => {
      // Intentionally no-op: CRM does not dictate artificial reality via time-locks
    },
    [],
  );

  const handleRemoveMaintenance = useCallback(
    (blockId: string) => {
      if (onRemoveChairMaintenance) {
        onRemoveChairMaintenance(blockId);
      }
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
