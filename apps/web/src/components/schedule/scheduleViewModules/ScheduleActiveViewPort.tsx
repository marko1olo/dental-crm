import React from "react";
import { ScheduleViewBody } from "../view/ScheduleViewBody";
import type { ScheduleActiveViewPortProps } from "./types";

export function ScheduleActiveViewPort(props: ScheduleActiveViewPortProps) {
  return <ScheduleViewBody {...(props as any)} />;
}
