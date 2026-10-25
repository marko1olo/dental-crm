/**
 * @file apps/web/src/views/settingsView/useSettingsViewLogic.ts
 * @description Logic hooks for SettingsView tab filtering and role synchronization.
 */

import { useEffect } from "react";
import {
	type SettingsTabGroup,
	type SettingsTab as SettingsTabId,
	settingsTabs,
} from "../../AppConstants";
import {
	type SettingsRoleMode,
	DOCTOR_TABS,
	ADMIN_TABS,
	OWNER_TABS,
} from "./types.js";

export function useSettingsRoleModeSync(
	settingsTab: string,
	roleMode: SettingsRoleMode,
	setRoleMode: (mode: SettingsRoleMode) => void,
) {
	useEffect(() => {
		if (roleMode === "all") return;
		if (settingsTab === "clinic" && roleMode === "doctor") {
			setRoleMode("owner");
			return;
		}
		if (roleMode === "doctor" && !DOCTOR_TABS.has(settingsTab) && settingsTab !== "clinic") {
			setRoleMode(ADMIN_TABS.has(settingsTab) ? "admin" : "owner");
		} else if (roleMode === "admin" && !ADMIN_TABS.has(settingsTab) && settingsTab !== "clinic") {
			setRoleMode(DOCTOR_TABS.has(settingsTab) ? "doctor" : "owner");
		} else if (roleMode === "owner" && !OWNER_TABS.has(settingsTab) && settingsTab !== "clinic") {
			setRoleMode(DOCTOR_TABS.has(settingsTab) ? "doctor" : "admin");
		}
	}, [settingsTab, roleMode, setRoleMode]);
}

export function useFilteredSettingsTabs(
	rawSettingsTabs: any,
	flags: any,
	activeStaffUser?: any,
): Array<{ id: SettingsTabId; title: string; group: SettingsTabGroup }> {
	let typed = (
		Array.isArray(rawSettingsTabs) && rawSettingsTabs.length > 0
			? rawSettingsTabs
			: settingsTabs
	) as Array<{ id: SettingsTabId; title: string; group: SettingsTabGroup }>;

	if (!flags.hasMarketingModule) typed = typed.filter((t) => t.id !== "marketing");
	if (!flags.hasAnalyticsModule) typed = typed.filter((t) => t.id !== "reporting");
	if (!flags.hasBpmWorkflows) typed = typed.filter((t) => t.id !== "bpmn");
	if (!flags.hasClinicalRules) typed = typed.filter((t) => t.id !== "rules");
	if (!flags.hasInsuranceCoPay) typed = typed.filter((t) => t.id !== "insurance");
	if (activeStaffUser?.role === "doctor") typed = typed.filter((t) => t?.id !== "telegram");

	return typed;
}

export function selectSettingsTabHelper(
	tabId: SettingsTabId | string,
	setSettingsTab?: (tab: string) => void,
) {
	const canonicalTab = tabId === "messengers" ? "telegram" : tabId;
	setSettingsTab?.(canonicalTab);
	window.location.hash = `settings/${canonicalTab}`;
}

export function handleSettingsTabKeyboardNav(
	event: React.KeyboardEvent<HTMLButtonElement>,
	tabId: SettingsTabId,
	typedSettingsTabs: Array<{ id: SettingsTabId }>,
	onSelect: (tabId: SettingsTabId | string) => void,
) {
	const currentIndex = typedSettingsTabs.findIndex((tab) => tab.id === tabId);
	if (currentIndex < 0) return;
	const lastIndex = typedSettingsTabs.length - 1;
	const nextIndex =
		event.key === "ArrowRight" || event.key === "ArrowDown"
			? currentIndex === lastIndex ? 0 : currentIndex + 1
			: event.key === "ArrowLeft" || event.key === "ArrowUp"
				? currentIndex === 0 ? lastIndex : currentIndex - 1
				: null;
	if (nextIndex === null) return;
	event.preventDefault();
	const targetTab = typedSettingsTabs[nextIndex];
	if (!targetTab) return;
	onSelect(targetTab.id);
	window.setTimeout(() => document.getElementById(`settings-tab-${targetTab.id}`)?.focus(), 0);
}
