/**
 * @file types.ts
 * @description Layer 0 Type contracts for CRM Header modules.
 * Adheres to Mandate 8b, DAG Acyclic Invariant, and Strict Type Safety (exactOptionalPropertyTypes).
 */

export interface BranchInfo {
	id: string;
	name: string;
	address?: string | undefined;
	isCurrent?: boolean | undefined;
	cabinetCount?: number | undefined;
}

export interface HeaderUser {
	id?: string | undefined;
	name?: string | undefined;
	role?: string | undefined;
	avatarUrl?: string | undefined;
	specialty?: string | undefined;
}

export interface ClinicControlPillProps {
	className?: string | undefined;
	onLockSession?: (() => void) | undefined;
	onOpenShiftModal?: (() => void) | undefined;
}

export interface AccessibilityModeButtonProps {
	className?: string | undefined;
	compact?: boolean | undefined;
	isAccessibilityMode?: boolean | undefined;
	onToggle?: (() => void) | undefined;
}

export interface HeaderBrandingProps {
	className?: string | undefined;
	clinicName?: string | undefined;
	branches?: BranchInfo[] | undefined;
	currentBranchId?: string | undefined;
	onBranchChange?: ((branchId: string) => void) | undefined;
	currentCabinet?: string | undefined;
	onCabinetChange?: ((cabinet: string) => void) | undefined;
}

export interface HeaderGlobalSearchProps {
	className?: string | undefined;
	placeholder?: string | undefined;
	onSelectPatient?: ((patientId: string) => void) | undefined;
}

export interface HeaderSystemStatusProps {
	className?: string | undefined;
	onLockSession?: (() => void) | undefined;
	onOpenShiftModal?: (() => void) | undefined;
}

export interface HeaderUserMenuProps {
	className?: string | undefined;
	user?: HeaderUser | undefined;
	onLockSession?: (() => void) | undefined;
	onLogout?: (() => void) | undefined;
}

export interface HeaderProps {
	className?: string | undefined;
	clinicName?: string | undefined;
	branches?: BranchInfo[] | undefined;
	currentBranchId?: string | undefined;
	onBranchChange?: ((branchId: string) => void) | undefined;
	currentCabinet?: string | undefined;
	onCabinetChange?: ((cabinet: string) => void) | undefined;
	user?: HeaderUser | undefined;
	onLockSession?: (() => void) | undefined;
	onOpenShiftModal?: (() => void) | undefined;
	onSelectPatient?: ((patientId: string) => void) | undefined;
	onLogout?: (() => void) | undefined;
}
