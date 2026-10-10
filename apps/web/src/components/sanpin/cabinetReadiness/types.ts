/**
 * @file types.ts
 * @description Layer 0: Contracts, DTOs and subcomponent props for Cabinet Readiness (SanPiN 3.3686-21).
 */

import type {
	CabinetReadinessPreset,
	CabinetReadinessRecord,
	DentalAppointmentType,
} from "@dental/shared";
import type React from "react";

// Re-export shared types for consumer convenience
export type { CabinetReadinessPreset, CabinetReadinessRecord, DentalAppointmentType };

/**
 * Bactericidal air decontamination timer state
 */
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

/**
 * Surface disinfection state
 */
export interface SurfaceDisinfectionState {
	disinfectionCompleted: boolean;
	disinfectantBrand: string;
	exposureMinutes: number;
}

/**
 * Sterile instruments & equipment readiness state
 */
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

/**
 * Subcomponent Props: Status Header
 */
export interface CabinetReadinessStatusHeaderProps {
	selectedCabinet: string;
	currentPreset: CabinetReadinessPreset;
	isFullyReady: boolean;
	statusMessageRu: string;
	disinfectionCompleted: boolean;
	turbineSterile: boolean;
	contraAngleSterile: boolean;
	bactericidalActive: boolean;
	onStartAppointmentPaperLogNorm: () => void;
	onOneClickConfirmCabinetReady: () => void;
	onExportCsv: () => void;
	onPrint: () => void;
}

/**
 * Subcomponent Props: SanPiN Checklist
 */
export interface CabinetSanpinChecklistProps {
	selectedCabinet: string;
	setSelectedCabinet: (cab: string) => void;
	selectedProfile: DentalAppointmentType;
	setSelectedProfile: (prof: DentalAppointmentType) => void;
	currentPreset: CabinetReadinessPreset;
	// Disinfection
	disinfectionCompleted: boolean;
	setDisinfectionCompleted: (v: boolean) => void;
	disinfectantBrand: string;
	setDisinfectantBrand: (v: string) => void;
	exposureMinutes: number;
	setExposureMinutes: (v: number) => void;
	// Handpieces
	turbineSterile: boolean;
	setTurbineSterile: (v: boolean) => void;
	contraAngleSterile: boolean;
	setContraAngleSterile: (v: boolean) => void;
	micromotorSterile: boolean;
	setMicromotorSterile: (v: boolean) => void;
	class5Verified: boolean;
	setClass5Verified: (v: boolean) => void;
	// Tray
	mirrorReady: boolean;
	setMirrorReady: (v: boolean) => void;
	probeReady: boolean;
	setProbeReady: (v: boolean) => void;
	tweezersReady: boolean;
	setTweezersReady: (v: boolean) => void;
	excavatorReady: boolean;
	setExcavatorReady: (v: boolean) => void;
	spatulaReady: boolean;
	setSpatulaReady: (v: boolean) => void;
	// Aspiration & Isolation
	salivaConnected: boolean;
	setSalivaConnected: (v: boolean) => void;
	hveConnected: boolean;
	setHveConnected: (v: boolean) => void;
	rubberDamReady: boolean;
	setRubberDamReady: (v: boolean) => void;
	clampsReady: boolean;
	setClampsReady: (v: boolean) => void;
	forcepsReady: boolean;
	setForcepsReady: (v: boolean) => void;
	// Quick action
	onQuickFillAllReady: () => void;
}

/**
 * Subcomponent Props: Bactericidal Irradiator / Dezar Timer
 */
export interface CabinetBactericidalTimerProps {
	selectedCabinet: string;
	nurseName: string;
	lampModel?: string;
	initialOperatingHours?: number;
	maxLampHours?: number;
	onExposureLogged?: (log: BactericidalExposureLog) => void;
}

/**
 * Subcomponent Props: Actions & Verdict Banner
 */
export interface CabinetReadinessActionsProps {
	isFullyReady: boolean;
	statusMessageRu: string;
	missingItems: readonly string[];
	nurseName: string;
	setNurseName: (v: string) => void;
	nursePosition: string;
	notes: string;
	setNotes: (v: string) => void;
	onSaveChecklist: (e: React.FormEvent) => void;
	onStartAppointmentPaperLogNorm: () => void;
	onOneClickConfirmCabinetReady: () => void;
	onQuickFillAllReady: () => void;
	onExportCsv: () => void;
	onPrint: () => void;
}

/**
 * Subcomponent Props: History Table
 */
export interface CabinetReadinessHistoryTableProps {
	historyRecords: CabinetReadinessRecord[];
}
