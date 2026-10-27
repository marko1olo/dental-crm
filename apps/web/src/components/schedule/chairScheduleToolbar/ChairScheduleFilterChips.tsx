import React from "react";
import type { ChairScheduleToolbarProps } from "./types";
import { ChairViewCountBadge } from "./filterChips/ChairViewCountBadge";
import { ChairItemChip } from "./filterChips/ChairItemChip";
import { ChairInlineAddButton } from "./filterChips/ChairInlineAddButton";

export function ChairScheduleFilterChips(props: ChairScheduleToolbarProps) {
  return (
    <>
      <ChairViewCountBadge {...props} />

      {/* Чипы кресел с акцентными полосками цвета */}
      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5 touch-pan-x scrollbar-none min-w-0 flex-nowrap whitespace-nowrap">
        {props.chairs.map((chair) => (
          <ChairItemChip key={chair.id} chair={chair} toolbarProps={props} />
        ))}

        <ChairInlineAddButton
          isSoloDoctor={props.isSoloDoctor}
          handleOpenAddChair={props.handleOpenAddChair}
        />
      </div>
    </>
  );
}
