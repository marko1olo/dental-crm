/**
 * @file headerStatusTypes.ts
 * @description Layer 0 contracts for Clinic Control Center and status indicators.
 * Strictly adheres to Mandate 8b (<= 120 lines) and strict type safety.
 */

import type { ClinicControlPillProps } from "../types.js";

export type { ClinicControlPillProps, HeaderSystemStatusProps } from "../types.js";

export type AgentTelephonyState = "online" | "dnd" | "pause" | "offline";

export interface ClinicSystemStatus {
	readonly isOnline: boolean;
	readonly syncLatencyMs: number | null;
	readonly isSyncing: boolean;
	readonly lastSyncTime: Date;
	readonly formattedLastSync: string;
	readonly pendingMutationCount: number;
	readonly l2PatientSnapshotsCount: number;
	readonly isShiftOpen: boolean;
	readonly shiftNumber: number;
	readonly shiftDurationSeconds: number;
	readonly formattedShiftTime: string;
	readonly activeCall: unknown;
	readonly agentState: AgentTelephonyState;
	readonly agentStateLabel: string;
	readonly activeLineId: number;
	readonly isMuted: boolean;
	readonly handleManualSync: () => Promise<void>;
	readonly handleToggleShift: () => Promise<void>;
	readonly setAgentState: (state: "online" | "dnd" | "pause") => void;
	readonly switchLine: (lineId: 1 | 2) => void;
	readonly toggleMute: () => void;
}

export interface ClinicControlPillViewProps {
	readonly isOpen: boolean;
	readonly status: ClinicSystemStatus;
	readonly onToggleOpen: () => void;
	readonly className?: string | undefined;
}

export interface ClinicControlCenterPopoverProps {
	readonly isOpen: boolean;
	readonly status: ClinicSystemStatus;
	readonly onClose: () => void;
	readonly onLockSession?: (() => void) | undefined;
	readonly onOpenShiftModal?: (() => void) | undefined;
}

export interface StatusBlockCashboxShiftProps {
	readonly status: ClinicSystemStatus;
	readonly onClose: () => void;
	readonly onOpenShiftModal?: (() => void) | undefined;
}

export interface StatusBlockTelephonyProps {
	readonly status: ClinicSystemStatus;
	readonly onClose: () => void;
}

export interface StatusBlockOfflineSyncProps {
	readonly status: ClinicSystemStatus;
	readonly onClose: () => void;
}

export interface StatusBlockQuickActionsProps {
	readonly onClose: () => void;
	readonly onLockSession?: (() => void) | undefined;
}
