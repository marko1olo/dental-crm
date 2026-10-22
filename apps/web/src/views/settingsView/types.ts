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
	"backup",
	"audit",
	"sources",
	"deep-clinical",
]);

export const ENTERPRISE_ADVANCED_TABS = new Set<string>([
	"bpmn",
	"sources",
	"insurance",
	"marketing",
	"reporting",
]);

export const SETTINGS_ROLE_LABELS: Record<SettingsRoleMode, string> = {
	doctor: "Кабинет врача",
	admin: "Ресепшен и смены",
	owner: "Управление клиникой",
	all: "Полный каталог",
};

export type CanonicalSettingsTabId =
	| "clinic"
	| "prices"
	| "staff"
	| "hardware"
	| "imports";

export interface CanonicalSettingsTabDefinition {
	id: CanonicalSettingsTabId;
	title: string;
	description: string;
}

export const CANONICAL_SETTINGS_TABS: CanonicalSettingsTabDefinition[] = [
	{
		id: "clinic",
		title: "Клиника и кресла",
		description: "Профиль клиники, реквизиты, масштаб и мастер кресел",
	},
	{
		id: "prices",
		title: "Прайс-лист процедур",
		description: "Каталог услуг, клинические шаблоны, себестоимость и тарифы",
	},
	{
		id: "staff",
		title: "Сотрудники и доступ",
		description: "Персонал, права доступа, роли и ставки врачей",
	},
	{
		id: "hardware",
		title: "Оборудование и касса",
		description: "Касса и чеки, ККТ, визиографы, датчики и оповещения",
	},
	{
		id: "imports",
		title: "Импорт данных",
		description: "Экспресс-перенос из других МИС, 1С и Excel",
	},
];

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
