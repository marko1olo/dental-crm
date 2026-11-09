import React from "react";
import { ScheduleViewToolbar } from "../view/ScheduleViewToolbar";
import type { ScheduleHeaderToolbarProps } from "./types";

export function ScheduleHeaderToolbar(props: ScheduleHeaderToolbarProps) {
  return <ScheduleViewToolbar {...(props as any)} />;
}
