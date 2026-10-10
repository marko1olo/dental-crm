/**
 * @file apps/web/src/views/settingsView/types.ts
 * @description Layer 0: Contracts, types, and tab definitions for SettingsView.
 */

import type React from "react";
import type { SettingsTabGroup, SettingsTab as SettingsTabId } from "../../AppConstants";

export type SettingsRoleMode = "doctor" | "admin" | "owner" | "all";

export const DOCTOR_TABS = new Set<string>([
	"profile",
	"preferences",
	"protocols",
	"rules",
	"procedure-boms",
	"ai",
	"hardware",
]);

export const ADMIN_TABS = new Set<string>([
	"clinic",
	"staff",
	"access",
	"messengers",
	"telegram",
	"booking",
	"modules",
	"marketing",
	"bpmn",
]);

export const OWNER_TABS = new Set<string>([
	"clinic",
	"prices",
	"commissions",
	"procedure-boms",
	"insurance",
	"reporting",
	"imports",
	"audit",
	"sources",
	"deep-clinical",
]);

export interface SettingsViewProps {
	// biome-ignore lint/suspicious/noExplicitAny: universal props
	activeStaffUser?: any;
	// biome-ignore lint/suspicious/noExplicitAny: universal props
	[key: string]: any;
}

export interface SettingsNavigationSidebarProps {
	typedSettingsTabs: Array<{
		id: SettingsTabId;
		title: string;
		group: SettingsTabGroup;
	}>;
	settingsTab: SettingsTabId | string;
	selectSettingsTab: (tabId: SettingsTabId | string) => void;
	handleSettingsTabKeyDown: (
		event: React.KeyboardEvent<HTMLButtonElement>,
		tabId: SettingsTabId,
	) => void;
	activeSettingsTabButtonRef?: React.RefObject<HTMLButtonElement | null>;
	settingsTabButtonId: (tabId: SettingsTabId) => string;
	settingsTabPanelId: (tabId: SettingsTabId) => string;
}

export interface SettingsClinicGeneralTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: settings props bag
	props: any;
	settingsTab?: string;
}

export interface SettingsSecurityAndBackupTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: settings props bag
	settingsProps: any;
	telegramAdminSecretSession?: boolean;
	setTelegramAdminSecretDraft?: (value: string) => void;
	unlockTelegramAdminSession?: () => void;
	lockTelegramAdminSession?: () => void;
}
