import React from "react";
import { AlignJustify, LayoutGrid, Maximize2 } from "lucide-react";
import { useScheduleDensity, type ScheduleDensityMode } from "../../useScheduleState";
import type { ChairScheduleToolbarProps } from "../types";

export interface ScheduleDensitySwitcherProps {
  densityMode?: ScheduleDensityMode | undefined;
  onDensityChange?: ((mode: ScheduleDensityMode) => void) | undefined;
}

export function ScheduleDensitySwitcher({
  densityMode: propDensityMode,
  onDensityChange,
}: ScheduleDensitySwitcherProps) {
  const { densityMode: storeDensityMode, setDensityMode: storeSetDensityMode } = useScheduleDensity();
  const currentDensity = propDensityMode ?? storeDensityMode;

  const setDensity = (mode: ScheduleDensityMode) => {
    if (onDensityChange) {
      onDensityChange(mode);
    }
    storeSetDensityMode(mode);
  };

  return (
    <div
      className="dente-segmented-bar h-8 min-h-[32px] max-h-[32px] p-0.5 rounded-lg shrink-0 select-none inline-flex items-center gap-0.5 bg-[var(--paper-card)] border border-[var(--line)] shadow-2xs touch-manipulation"
      data-testid="schedule-density-switcher"
      role="group"
      aria-label="Режим отображения карточек расписания"
    >
      <button
        type="button"
        onClick={() => setDensity("compact")}
        className={`dente-segmented-item h-7 px-2.5 rounded-md text-xs inline-flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer ${
          currentDensity === "compact"
            ? "active font-semibold text-[var(--ink)] bg-[var(--paper)] shadow-2xs"
            : "text-[var(--muted)] hover:text-[var(--ink)]"
        }`}
        title="Компактный режим: 1-строчный минимализм"
        data-testid="btn-density-compact"
        aria-pressed={currentDensity === "compact"}
      >
        <AlignJustify size={13} className="shrink-0" />
        <span className="hidden 2xl:inline">Компакт</span>
      </button>

      <button
        type="button"
        onClick={() => setDensity("informative")}
        className={`dente-segmented-item h-7 px-2.5 rounded-md text-xs inline-flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer ${
          currentDensity === "informative"
            ? "active font-semibold text-[var(--ink)] bg-[var(--paper)] shadow-2xs"
            : "text-[var(--muted)] hover:text-[var(--ink)]"
        }`}
        title="Информативный режим (по умолчанию): 2-3 строки с процедурой и зубом"
        data-testid="btn-density-informative"
        aria-pressed={currentDensity === "informative"}
      >
        <LayoutGrid size={13} className="shrink-0" />
        <span className="hidden 2xl:inline">Инфо</span>
      </button>

      <button
        type="button"
        onClick={() => setDensity("expanded")}
        className={`dente-segmented-item h-7 px-2.5 rounded-md text-xs inline-flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer ${
          currentDensity === "expanded"
            ? "active font-semibold text-[var(--ink)] bg-[var(--paper)] shadow-2xs"
            : "text-[var(--muted)] hover:text-[var(--ink)]"
        }`}
        title="Развернутый режим: полный блок с контактами и кнопкой «В приём»"
        data-testid="btn-density-expanded"
        aria-pressed={currentDensity === "expanded"}
      >
        <Maximize2 size={13} className="shrink-0" />
        <span className="hidden 2xl:inline">Полный</span>
      </button>
    </div>
  );
}
