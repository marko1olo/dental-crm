/**
 * @file apps/web/src/views/settingsView/index.tsx
 * @description Master Coordinator facade for SettingsView configuration hub.
 * Mandates 8b, 8e: Thin facade <= 80 lines.
 */

import React, { useState, useEffect, type KeyboardEvent } from "react";
import "../../styles/modules/settings.css";
import "../../styles/modules/mobile-settings.css";
import { useIsMobile } from "../../hooks/useIsMobile";
import { MobileSettingsViewWrapper } from "./MobileSettingsViewWrapper.js";
import { type SettingsTabGroup, type SettingsTab as SettingsTabId, settingsTabs } from "../../AppConstants";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsStore } from "../../store/settingsStore";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { buildSettingsProps } from "../../components/settings/settingsPropsBuilder";
import { type SettingsRoleMode, type SettingsViewProps } from "./types.js";
import { SettingsDesktopLayout } from "./SettingsDesktopLayout.js";
import { useSettingsRoleModeSync, selectSettingsTabHelper, handleSettingsTabKeyboardNav } from "./useSettingsViewLogic.js";

export function SettingsView({ activeStaffUser }: SettingsViewProps) {
	const appLogic = useAppLogicContext();
	const settingsStore = useSettingsStore();
	const derivations = useSettingsDerivations();
	// biome-ignore lint/suspicious/noExplicitAny: props bag unpacking
	const logic = appLogic as Record<string, any>;
	const { activeSettingsTabButtonRef, reopenOnboarding, setSettingsTab, settingsTab, settingsTabs: rawSettingsTabs } = logic;
	const settingsProps = buildSettingsProps(logic, settingsStore, derivations, activeStaffUser);
	const [roleMode, setRoleMode] = useState<SettingsRoleMode>("all");
	useSettingsRoleModeSync(settingsTab, roleMode, setRoleMode);

	const flags = useWorkspaceProfile();
	let typedSettingsTabs = (Array.isArray(rawSettingsTabs) && rawSettingsTabs.length > 0 ? rawSettingsTabs : settingsTabs) as Array<{ id: SettingsTabId; title: string; group: SettingsTabGroup }>;
	if (!flags.hasMarketingModule) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "marketing");
	if (!flags.hasAnalyticsModule) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "reporting");
	if (!flags.hasBpmWorkflows) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "bpmn");
	if (!flags.hasClinicalRules) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "rules");
	if (!flags.hasInsuranceCoPay) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "insurance");
	if (activeStaffUser?.role === "doctor") typedSettingsTabs = typedSettingsTabs.filter((t) => t?.id !== "telegram");

	const selectSettingsTab = (tabId: SettingsTabId | string) => selectSettingsTabHelper(tabId, setSettingsTab);
	const handleSettingsTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: SettingsTabId) =>
		handleSettingsTabKeyboardNav(event, tabId, typedSettingsTabs, selectSettingsTab);

	const isMobile = useIsMobile(768);
	const [mobileSection, setMobileSection] = useState<string>(() => (settingsTab && settingsTab !== "clinic" ? settingsTab : "root"));
	useEffect(() => {
		if (settingsTab && settingsTab !== "clinic") setMobileSection(settingsTab);
	}, [settingsTab]);

	if (isMobile) {
		return <MobileSettingsViewWrapper mobileSection={mobileSection} setMobileSection={setMobileSection} selectSettingsTab={selectSettingsTab} logic={logic} settingsProps={settingsProps} activeStaffUser={activeStaffUser} flags={flags} />;
	}

	return (
		<SettingsDesktopLayout
			roleMode={roleMode} setRoleMode={setRoleMode} selectSettingsTab={selectSettingsTab}
			reopenOnboarding={reopenOnboarding} activeStaffUser={activeStaffUser} settingsProps={settingsProps}
			settingsTab={settingsTab} appLogic={appLogic} logic={logic} flags={flags}
			typedSettingsTabs={typedSettingsTabs} handleSettingsTabKeyDown={handleSettingsTabKeyDown}
			activeSettingsTabButtonRef={activeSettingsTabButtonRef}
		/>
	);
}

export default SettingsView;
export * from "./types.js";
export { SettingsNavigationSidebar } from "./SettingsNavigationSidebar.js";
export { SettingsClinicGeneralTab } from "./SettingsClinicGeneralTab.js";
export { SettingsSecurityAndBackupTab } from "./SettingsSecurityAndBackupTab.js";
export { SettingsNavigationMenu } from "./settingsNavigationMenu.js";
export { SettingsTabRenderer } from "./settingsTabRenderer.js";
export { SettingsDesktopLayout } from "./SettingsDesktopLayout.js";
