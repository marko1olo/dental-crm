/**
 * @file apps/web/src/views/settingsView/types.ts
 * @description Layer 0: Contracts, types, and tab definitions for SettingsView.
 */

import type React from "react";
import type { DentalPricelistAnalysisResponse } from "@dental/shared";
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
	id?: string | undefined;
	role?: string | undefined;
	fullName?: string | undefined;
	email?: string | null | undefined;
	phone?: string | null | undefined;
	specialties?: string[] | undefined;
	active?: boolean | undefined;
}

import type { WorkspaceFeatureFlags } from "../../hooks/useWorkspaceProfile";

export type SettingsViewFeatureFlags = Partial<WorkspaceFeatureFlags>;

export interface SettingsTabItem {
	id: SettingsTabId;
	title: string;
	group: SettingsTabGroup;
}

export interface SettingsViewProps {
	activeStaffUser?: SettingsStaffUser | null | undefined;
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
	readonly adminSecretScopeWarning?: React.ReactNode | undefined;
	readonly telegramAdminSecretDraft?: string | undefined;
	readonly adminSecretReady?: boolean | undefined;
	readonly [key: string]: unknown;
}

export interface SettingsSecurityAndBackupTabProps {
	settingsProps: SettingsSecuritySettingsProps | Record<string, unknown>;
	telegramAdminSecretSession?: boolean | undefined;
	setTelegramAdminSecretDraft?: ((value: string) => void) | undefined;
	unlockTelegramAdminSession?: (() => void) | undefined;
	lockTelegramAdminSession?: (() => void) | undefined;
}

export interface SettingsViewLogicBag {
	telegramAdminSecretSession?: boolean | undefined;
	setTelegramAdminSecretDraft?: ((draft: string) => void) | undefined;
	unlockTelegramAdminSession?: (() => void) | undefined;
	lockTelegramAdminSession?: (() => void) | undefined;
	pricelistAnalysis?: DentalPricelistAnalysisResponse | null | undefined;
	pricelistImageNote?: string | undefined;
	pricelistWarningsText?: ((warnings: unknown[]) => string) | undefined;
	pricelistItemMaterialText?: ((item: unknown) => string) | undefined;
	pricelistMaterialSummaryText?: ((summary: unknown) => string) | undefined;
	[key: string]: unknown;
}

export type SettingsAppLogicBag = {
	clinicMode?: "solo_doctor" | "one_chair" | "small_clinic" | "network_clinic" | undefined;
	changeClinicMode?: ((mode: "solo_doctor" | "one_chair" | "small_clinic" | "network_clinic") => void) | undefined;
	[key: string]: unknown;
} | null | undefined;
