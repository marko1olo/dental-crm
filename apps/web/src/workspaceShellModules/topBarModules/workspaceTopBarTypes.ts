/**
 * DENTE Dental CRM — Workspace TopBar Types & Pure Helpers (Layer 0)
 * 
 * Mandate 8s (SSOT Componentization), Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends)
 */

import type { StaffRole } from "@dental/shared";
import type { WorkspaceTopbarProps, WorkspaceViewIntentHandler } from "../types";

export type { WorkspaceTopbarProps, WorkspaceViewIntentHandler };

export interface WorkspaceTopBarStatusAndSearchProps {
	clinicName?: string | null;
	formattedDate: string;
	selectedWorkspaceRole: StaffRole;
	staffRoleLabels: Record<StaffRole, string>;
	availableRoles: StaffRole[];
	onRoleChange: (role: StaffRole) => void;
}

export interface WorkspaceTopBarActionsProps {
	effectiveView: string;
	onGoToSchedule?: (() => void) | undefined;
	onGoToDictation?: (() => void) | undefined;
	onViewIntent?: WorkspaceViewIntentHandler | undefined;
	showDoctorVisitShortcut?: boolean | undefined;
	selectedWorkspaceRole: StaffRole;
	onOpenDoctorShiftCockpit?: (() => void) | undefined;
	onOpenCbctDemo?: (() => void) | undefined;
	showAdministrationTopActions?: boolean | undefined;
	onReopenOnboarding?: (() => void) | undefined;
	onOpenLanQr: () => void;
	onLockSession?: (() => void) | undefined;
}

export function formatDisplayClinicName(name?: string | null): string {
	if (!name || !name.trim()) return "Стоматология";
	const trimmed = name.trim();
	if (/^\d{10,14}$/.test(trimmed)) {
		return "Стоматология";
	}
	let cleaned = trimmed.replace(/[_-\s]+\d{10,14}$/, "").trim();
	const brand = cleaned
		.replace(/^(стоматологическая\s+клиника|стоматология)\s+/i, "")
		.trim();
	if (brand && brand.length >= 2) {
		cleaned = brand;
	}
	return cleaned || "Стоматология";
}
