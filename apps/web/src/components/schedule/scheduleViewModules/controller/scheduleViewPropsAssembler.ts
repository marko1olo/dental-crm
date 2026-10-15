/**
 * scheduleViewPropsAssembler.ts
 *
 * Layer 4: Сборка типизированных пакетов пропсов для тулбара, вьюпорта и слоя модалок.
 */

import type {
  ScheduleHeaderToolbarProps,
  ScheduleActiveViewPortProps,
  ScheduleModalsLayerProps,
} from "../types";

export function assembleHeaderToolbarProps(
  params: ScheduleHeaderToolbarProps,
): ScheduleHeaderToolbarProps {
  return params;
}

export function assembleActiveViewPortProps(
  params: ScheduleActiveViewPortProps,
): ScheduleActiveViewPortProps {
  return params;
}

export function assembleModalsLayerProps(
  params: ScheduleModalsLayerProps,
): ScheduleModalsLayerProps {
  return params;
}
