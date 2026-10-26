/**
 * apps/web/src/components/settings/roleMatrix/roleMatrixTypes.ts
 *
 * Types for Granular Role Matrix & RBAC (Mandates 8b, 8e, 8n).
 * Strictly <= 120 lines ceiling.
 */

import type { AccessLevel, GranularStaffRole, PermissionDefinition } from "@dental/shared";
import type React from "react";

export type RoleCategory = "clinical" | "administrative";

export interface CanonicalRoleProfile {
	readonly id: GranularStaffRole;
	readonly title: string;
	readonly badge: string;
	readonly summary: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface SuperPermissionInfo {
	readonly badge: string;
	readonly hint: string;
	readonly isCritical: boolean;
}

export type RolePermissionsMap = Record<string, AccessLevel>;

export interface PermissionCategoryGroup {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly permissions: readonly PermissionDefinition[];
}

export interface RoleMatrixState {
	selectedRole: GranularStaffRole;
	setSelectedRole: (role: GranularStaffRole) => void;
	activeCategory: RoleCategory;
	setActiveCategory: (cat: RoleCategory) => void;
	showAdvancedRoles: boolean;
	setShowAdvancedRoles: (show: boolean) => void;
	selectedModuleFilter: string;
	setSelectedModuleFilter: (mod: string) => void;
	onlySuperRights: boolean;
	setOnlySuperRights: (only: boolean) => void;
	currentPermissions: RolePermissionsMap;
	togglePermission: (permKey: string) => void;
	cyclePermissionLevel: (permKey: string) => void;
	savePermissions: () => void;
	resetToStandard: () => void;
	applyDoctorAutonomyPreset: () => void;
	isSaving: boolean;
	hasUnsavedChanges: boolean;
	grantedCount: number;
	blockedCount: number;
}
