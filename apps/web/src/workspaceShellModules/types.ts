import type React from "react";
import type { StaffRole } from "@dental/shared";
import type { ClinicMode } from "../lib/clinicCapabilities";
import type { WorkspacePerspective } from "../store/perspectiveStore";
import type { AppView } from "../utils/routeUtils";
import type { WorkspacePreloadIntent } from "../workspacePreload";

export type WorkspaceViewIntentHandler = (
	view: AppView,
	intent?: WorkspacePreloadIntent | undefined,
) => void;

export interface WorkspaceSidebarProps {
	currentView: AppView;
	onViewIntent?: WorkspaceViewIntentHandler | undefined;
	role: StaffRole;
	collapsed: boolean;
	onToggleCollapsed: () => void;
	onLockSession?: (() => void) | undefined;
}

export interface WorkspaceTopbarProps {
	clinicName: string;
	onGoToDictation: () => void;
	onGoToSchedule: () => void;
	onGoToVisit: () => void;
	onReopenOnboarding: () => void;
	onRoleChange: (role: StaffRole) => void;
	onViewIntent?: WorkspaceViewIntentHandler | undefined;
	roleFocusOrder: StaffRole[];
	selectedWorkspaceRole: StaffRole;
	showAdministrationTopActions: boolean;
	showDoctorVisitShortcut: boolean;
	staffRoleLabels: Record<StaffRole, string>;
	todayIso: string;
	onLockSession?: (() => void) | undefined;
	onOpenDoctorShiftCockpit?: (() => void) | undefined;
	onOpenCbctDemo?: (() => void) | undefined;
	currentView?: AppView | string | undefined;
}

export interface WorkspaceEmergencyBarProps {
	activeAlertsCount?: number | undefined;
	onDismiss?: (() => void) | undefined;
	onOpenEmergencyModal?: (() => void) | undefined;
	className?: string | undefined;
}

export interface WorkspaceContentAreaProps {
	currentView: AppView;
	children?: React.ReactNode | undefined;
	preserveMounted?: boolean | undefined;
	className?: string | undefined;
}

export interface WorkspaceShellProps {
	currentView: AppView;
	role: StaffRole;
	collapsed: boolean;
	onToggleCollapsed: () => void;
	clinicName?: string | undefined;
	clinicMode?: ClinicMode | null | undefined;
	todayIso?: string | undefined;
	onRoleChange?: ((role: StaffRole) => void) | undefined;
	onViewIntent?: WorkspaceViewIntentHandler | undefined;
	onGoToSchedule?: (() => void) | undefined;
	onGoToDictation?: (() => void) | undefined;
	onGoToVisit?: (() => void) | undefined;
	onReopenOnboarding?: (() => void) | undefined;
	onLockSession?: (() => void) | undefined;
	onOpenDoctorShiftCockpit?: (() => void) | undefined;
	onOpenCbctDemo?: (() => void) | undefined;
	roleFocusOrder?: StaffRole[] | undefined;
	selectedWorkspaceRole?: StaffRole | undefined;
	showAdministrationTopActions?: boolean | undefined;
	showDoctorVisitShortcut?: boolean | undefined;
	staffRoleLabels?: Record<StaffRole, string> | undefined;
	children?: React.ReactNode | undefined;
}

export type {
	AppView,
	ClinicMode,
	StaffRole,
	WorkspacePerspective,
	WorkspacePreloadIntent,
};
