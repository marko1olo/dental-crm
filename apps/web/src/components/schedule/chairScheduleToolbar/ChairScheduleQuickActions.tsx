import React from "react";
import type { ChairScheduleToolbarProps } from "./types";
import { ScheduleDensitySwitcher } from "./quickActions/ScheduleDensitySwitcher";
import { ChairShiftsBatchMenu } from "./quickActions/shiftsMenu/ChairShiftsBatchMenu";
import { ChairToolbarDirectActions } from "./quickActions/ChairToolbarDirectActions";
import { ChairToolbarMoreDropdown } from "./quickActions/ChairToolbarMoreDropdown";

export function ChairScheduleQuickActions(props: ChairScheduleToolbarProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState(false);
  const moreMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isMoreMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMoreMenuOpen]);

  return (
    <div className="flex items-center gap-2 shrink-0 select-none flex-nowrap">
      <ScheduleDensitySwitcher
        densityMode={props.densityMode}
        onDensityChange={props.onDensityChange}
      />
      <ChairShiftsBatchMenu
        props={props}
        onBeforeOpen={() => setIsMoreMenuOpen(false)}
      />
      <ChairToolbarMoreDropdown
        props={props}
        isMoreMenuOpen={isMoreMenuOpen}
        setIsMoreMenuOpen={setIsMoreMenuOpen}
        moreMenuRef={moreMenuRef}
        onBeforeOpen={() => props.setIsShiftsMenuOpen(false)}
      />
      <ChairToolbarDirectActions {...props} />
    </div>
  );
}
