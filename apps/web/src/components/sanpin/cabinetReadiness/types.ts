/**
 * @file types.ts
 * @description Layer 0: Contracts, DTOs and subcomponent props for Cabinet Readiness (SanPiN 3.3686-21).
 */

import type {
	CabinetReadinessPreset,
	CabinetReadinessRecord,
	DentalAppointmentType,
} from "@dental/shared";

export type { CabinetReadinessPreset, CabinetReadinessRecord, DentalAppointmentType };
export type CabinetDisinfectionPreset = CabinetReadinessPreset;

export * from "./cabinetReadinessComponentProps.js";

export type BactericidalTimerStatus = "idle" | "running" | "paused" | "completed";

export type BactericidalLampStatus = "normal" | "warning_replace_soon" | "expired_replace_now";

export interface BactericidalExposureLog {
	readonly id: string;
	readonly cabinetNumber: string;
	readonly timestamp: string;
	readonly durationMinutes: number;
	readonly operatorFullName: string;
	readonly lampModel: string;
	readonly lampHoursBefore: number;
	readonly lampHoursAfter: number;
	readonly mode: "closed_recirculator" | "open_uv";
}

export interface SurfaceDisinfectionState {
	disinfectionCompleted: boolean;
	disinfectantBrand: string;
	exposureMinutes: number;
}

export interface SterilityChecklistState {
	turbineSterile: boolean;
	contraAngleSterile: boolean;
	micromotorSterile: boolean;
	class5Verified: boolean;
	packageIntegrityVerified: boolean;
	mirrorReady: boolean;
	probeReady: boolean;
	tweezersReady: boolean;
	excavatorReady: boolean;
	spatulaReady: boolean;
	salivaConnected: boolean;
	hveConnected: boolean;
	filterChecked: boolean;
	rubberDamReady: boolean;
	clampsReady: boolean;
	forcepsReady: boolean;
}
