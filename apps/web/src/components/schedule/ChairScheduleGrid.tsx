import React from "react";
import { ScheduleGrid } from "./ScheduleGrid";
import type { ScheduleGridProps } from "./grid/gridTypes";
import { useScheduleDensity, type ScheduleDensityMode } from "./useScheduleState";

export * from "./useScheduleState";
export * from "./ScheduleGrid";

export interface ChairScheduleGridProps extends ScheduleGridProps {
  densityMode?: ScheduleDensityMode;
  onDensityChange?: ((mode: ScheduleDensityMode) => void) | undefined;
}

export const ChairScheduleGrid: React.FC<ChairScheduleGridProps> = (props) => {
  const { densityMode, onDensityChange, ...gridProps } = props;
  const { densityMode: storeDensity } = useScheduleDensity();
  const activeDensity = densityMode ?? storeDensity;

  return (
    <div
      className="chair-schedule-grid-root w-full h-full min-w-0"
      data-testid="chair-schedule-grid-root"
      data-density-mode={activeDensity}
    >
      <ScheduleGrid {...gridProps} />
    </div>
  );
};

export default ChairScheduleGrid;
