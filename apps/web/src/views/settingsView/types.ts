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
	{ id: "clinic", title: "Клиника и кресла", description: "Профиль клиники, реквизиты, масштаб и мастер кресел" },
	{ id: "prices", title: "Прайс-лист процедур", description: "Каталог услуг, клинические шаблоны, себестоимость и тарифы" },
	{ id: "staff", title: "Сотрудники и доступ", description: "Персонал, права доступа, роли и ставки врачей" },
	{ id: "hardware", title: "Оборудование и касса", description: "Касса и чеки, ККТ, визиографы, датчики и оповещения" },
	{ id: "imports", title: "Импорт данных", description: "Экспресс-перенос из других МИС, 1С и Excel" },
];

export interface SettingsStaffUser {
	id?: string;
	role?: string;
	fullName?: string;
	email?: string | null;
	phone?: string | null;
	specialties?: string[];
	active?: boolean;
}

export interface SettingsViewFeatureFlags {
	hasMarketingModule?: boolean;
	hasAnalyticsModule?: boolean;
	hasBpmWorkflows?: boolean;
	hasClinicalRules?: boolean;
	hasInsuranceCoPay?: boolean;
	[key: string]: unknown;
}

export interface SettingsTabItem {
	id: SettingsTabId;
	title: string;
	group: SettingsTabGroup;
}

export interface SettingsViewProps {
	activeStaffUser?: SettingsStaffUser | null;
	activePatient?: unknown;
	[key: string]: unknown;
}

export interface SettingsNavigationSidebarProps {
	typedSettingsTabs: Array<{ id: SettingsTabId; title: string; group: SettingsTabGroup }>;
	settingsTab: SettingsTabId | string;
	selectSettingsTab: (tabId: SettingsTabId | string) => void;
	handleSettingsTabKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>, tabId: SettingsTabId) => void;
	activeSettingsTabButtonRef?: React.RefObject<HTMLButtonElement | null> | undefined;
	settingsTabButtonId: (tabId: SettingsTabId) => string;
	settingsTabPanelId: (tabId: SettingsTabId) => string;
}

export interface SettingsClinicGeneralTabProps {
	props: Record<string, unknown>;
	settingsTab?: string;
}

export interface SettingsSecuritySettingsProps {
	readonly adminSecretScopeWarning?: React.ReactNode;
	readonly telegramAdminSecretDraft?: string;
	readonly adminSecretReady?: boolean;
	readonly [key: string]: unknown;
}

export interface SettingsSecurityAndBackupTabProps {
	settingsProps: SettingsSecuritySettingsProps;
	telegramAdminSecretSession?: boolean | undefined;
	setTelegramAdminSecretDraft?: ((value: string) => void) | undefined;
	unlockTelegramAdminSession?: (() => void) | undefined;
	lockTelegramAdminSession?: (() => void) | undefined;
}
