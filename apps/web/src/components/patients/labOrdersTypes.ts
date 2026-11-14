/**
 * apps/web/src/components/patients/labOrdersTypes.ts
 * Re-exports canonical LabOrder types from @dental/shared SSOT.
 */

import type { PatientLabOrderDto, LabOrderFilterKey as SharedLabOrderFilterKey } from "@dental/shared";

export type LabOrder = PatientLabOrderDto;
export type LabOrderFilterKey = SharedLabOrderFilterKey;
