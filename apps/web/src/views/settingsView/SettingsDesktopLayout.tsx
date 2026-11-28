/**
 * @file apps/web/src/views/settingsView/SettingsDesktopLayout.tsx
 * @description Desktop layout view for SettingsView configuration hub.
 * Mandate 8b compliant: <= 120 lines.
 */

import React, { type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { type SettingsTabGroup, type SettingsTab as SettingsTabId } from "../../AppConstants";
import { DoctorSettingsSection, type DoctorSubTab } from "../../components/settings/DoctorSettingsSection";
import { AdminSettingsSection, type AdminSubTab } from "../../components/settings/AdminSettingsSection";
import { OwnerSettingsSection, type OwnerSubTab } from "../../components/settings/OwnerSettingsSection";
import {
	type SettingsRoleMode,
	type SettingsStaffUser,
	type SettingsViewFeatureFlags,
	type SettingsViewLogicBag,
	type SettingsAppLogicBag,
	DOCTOR_TABS,
	ADMIN_TABS,
	OWNER_TABS,
} from "./types.js";
import { SettingsNavigationSidebar } from "./SettingsNavigationSidebar.js";
import { SettingsNavigationMenu } from "./settingsNavigationMenu.js";
import { SettingsTabRenderer } from "./settingsTabRenderer.js";

export const settingsTabButtonId = (tabId: SettingsTabId | string) => `settings-tab-${tabId}`;
export const settingsTabPanelId = (tabId: SettingsTabId | string) => `settings-tabpanel-${tabId}`;

export interface SettingsDesktopLayoutProps {
	roleMode: SettingsRoleMode;
	setRoleMode: (mode: SettingsRoleMode) => void;
	selectSettingsTab: (tabId: SettingsTabId | string) => void;
	reopenOnboarding?: (() => void) | undefined;
	activeStaffUser?: SettingsStaffUser | null | undefined;
	settingsProps: Record<string, unknown>;
	settingsTab: string;
	appLogic: SettingsAppLogicBag;
	logic: SettingsViewLogicBag;
	flags: SettingsViewFeatureFlags;
	typedSettingsTabs: Array<{ id: SettingsTabId; title: string; group: SettingsTabGroup }>;
	handleSettingsTabKeyDown: (event: KeyboardEvent<HTMLButtonElement>, tabId: SettingsTabId) => void;
	activeSettingsTabButtonRef?: React.RefObject<HTMLButtonElement | null> | undefined;
}

const isDoctorTab = (t: string): t is DoctorSubTab => DOCTOR_TABS.has(t);
const isAdminTab = (t: string): t is AdminSubTab => ADMIN_TABS.has(t);
const isOwnerTab = (t: string): t is OwnerSubTab => OWNER_TABS.has(t);

export function SettingsDesktopLayout({
	roleMode,
	setRoleMode,
	selectSettingsTab,
	reopenOnboarding,
	activeStaffUser,
	settingsProps,
	settingsTab,
	appLogic,
	logic,
	flags,
	typedSettingsTabs,
	handleSettingsTabKeyDown,
	activeSettingsTabButtonRef,
}: SettingsDesktopLayoutProps) {
	return (
		<motion.section
			className="settings-zone panel"
			style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)", borderRadius: "14px", padding: "20px 20px 100px 20px", position: "relative", overflowY: "auto", overflowX: "clip", maxWidth: "100vw" }}
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			id="settings"
			aria-label="Настройки и перенос данных"
			data-testid="settings-view"
		>
			<SettingsNavigationMenu roleMode={roleMode} setRoleMode={setRoleMode} selectSettingsTab={selectSettingsTab} reopenOnboarding={reopenOnboarding} activeStaffUser={activeStaffUser} />

			<div className="col-span-full w-full min-w-0" style={{ gridColumn: "1 / -1" }}>
				{roleMode === "doctor" && <DoctorSettingsSection props={settingsProps} initialTab={isDoctorTab(settingsTab) ? settingsTab : "profile"} onSelectTab={selectSettingsTab} />}
				{roleMode === "admin" && <AdminSettingsSection props={settingsProps} initialTab={isAdminTab(settingsTab) ? settingsTab : "clinic"} onSelectTab={selectSettingsTab} />}
				{roleMode === "owner" && <OwnerSettingsSection props={settingsProps} initialTab={isOwnerTab(settingsTab) ? settingsTab : "clinic"} onSelectTab={selectSettingsTab} appLogic={appLogic} />}
				{roleMode === "all" && (
					<div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
						<SettingsNavigationSidebar typedSettingsTabs={typedSettingsTabs} settingsTab={settingsTab} selectSettingsTab={selectSettingsTab} handleSettingsTabKeyDown={handleSettingsTabKeyDown} activeSettingsTabButtonRef={activeSettingsTabButtonRef} settingsTabButtonId={settingsTabButtonId} settingsTabPanelId={settingsTabPanelId} />
						<div className="settings-tab-panel" id={settingsTabPanelId(settingsTab)} role="tabpanel" aria-labelledby={settingsTabButtonId(settingsTab)} style={{ paddingBottom: "120px" }}>
							<SettingsTabRenderer settingsTab={settingsTab} settingsProps={settingsProps} activeStaffUser={activeStaffUser} logic={logic} flags={flags} telegramAdminSecretSession={logic.telegramAdminSecretSession} setTelegramAdminSecretDraft={logic.setTelegramAdminSecretDraft} unlockTelegramAdminSession={logic.unlockTelegramAdminSession} lockTelegramAdminSession={logic.lockTelegramAdminSession} pricelistAnalysis={logic.pricelistAnalysis} pricelistImageNote={logic.pricelistImageNote} pricelistWarningsText={logic.pricelistWarningsText} pricelistItemMaterialText={logic.pricelistItemMaterialText} pricelistMaterialSummaryText={logic.pricelistMaterialSummaryText} />
							<div className="h-36 w-full shrink-0 pointer-events-none" aria-hidden="true" />
						</div>
					</div>
				)}
			</div>
		</motion.section>
	);
}
