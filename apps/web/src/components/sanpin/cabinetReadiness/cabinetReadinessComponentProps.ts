import type {
	CabinetReadinessPreset,
	CabinetReadinessRecord,
	DentalAppointmentType,
} from "@dental/shared";
import type React from "react";
import type { BactericidalExposureLog } from "./types.js";

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

export interface CabinetSanpinChecklistProps {
	selectedCabinet: string;
	setSelectedCabinet: (cab: string) => void;
	selectedProfile: DentalAppointmentType;
	setSelectedProfile: (prof: DentalAppointmentType) => void;
	currentPreset: CabinetReadinessPreset;
	disinfectionCompleted: boolean;
	setDisinfectionCompleted: (v: boolean) => void;
	disinfectantBrand: string;
	setDisinfectantBrand: (v: string) => void;
	exposureMinutes: number;
	setExposureMinutes: (v: number) => void;
	turbineSterile: boolean;
	setTurbineSterile: (v: boolean) => void;
	contraAngleSterile: boolean;
	setContraAngleSterile: (v: boolean) => void;
	micromotorSterile: boolean;
	setMicromotorSterile: (v: boolean) => void;
	class5Verified: boolean;
	setClass5Verified: (v: boolean) => void;
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
	onQuickFillAllReady: () => void;
}

export interface CabinetBactericidalTimerProps {
	selectedCabinet: string;
	nurseName: string;
	lampModel?: string;
	initialOperatingHours?: number;
	maxLampHours?: number;
	onExposureLogged?: (log: BactericidalExposureLog) => void;
}

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

export interface CabinetReadinessHistoryTableProps {
	historyRecords: CabinetReadinessRecord[];
}
