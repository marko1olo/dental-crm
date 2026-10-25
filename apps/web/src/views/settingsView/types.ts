/**
 * @file apps/web/src/views/settingsView/types.ts
 * @description Layer 0: Contracts, types, and tab definitions for SettingsView.
 */

import type React from "react";
import type { SettingsTabGroup, SettingsTab as SettingsTabId } from "../../AppConstants";

import type { SettingsRoleMode } from "./settingsRoleTabs.js";
export type { SettingsRoleMode };
export {
	DOCTOR_TABS,
	ADMIN_TABS,
	OWNER_TABS,
	ENTERPRISE_ADVANCED_TABS,
} from "./settingsRoleTabs.js";

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
	activeSettingsTabButtonRef?: React.RefObject<HTMLButtonElement | null> | undefined;
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
