/**
 * @file apps/web/src/views/settingsView/index.tsx
 * @description Master Coordinator for SettingsView configuration hub.
 * Decomposed into modular components per Mandates 8b, 8e: <= 250 lines ceiling.
 */

import React, { useState, useMemo, useEffect, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import "../../styles/modules/settings.css";
import "../../styles/modules/mobile-settings.css";
import { useIsMobile } from "../../hooks/useIsMobile";
import { MobileSettingsRootView } from "../../components/settings/mobile/MobileSettingsRootView";
import { MobileSettingsPricesView } from "../../components/settings/mobile/MobileSettingsPricesView";
import { MobileSettingsStaffView } from "../../components/settings/mobile/MobileSettingsStaffView";
import {
	type SettingsTabGroup,
	type SettingsTab as SettingsTabId,
	settingsTabs,
} from "../../AppConstants";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsStore } from "../../store/settingsStore";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { buildSettingsProps } from "../../components/settings/settingsPropsBuilder";
import { DoctorSettingsSection, type DoctorSubTab } from "../../components/settings/DoctorSettingsSection";
import { AdminSettingsSection, type AdminSubTab } from "../../components/settings/AdminSettingsSection";
import { OwnerSettingsSection, type OwnerSubTab } from "../../components/settings/OwnerSettingsSection";
import {
	type SettingsRoleMode,
	DOCTOR_TABS,
	ADMIN_TABS,
	OWNER_TABS,
	type SettingsViewProps,
} from "./types.js";
import { SettingsNavigationSidebar } from "./SettingsNavigationSidebar.js";
import { SettingsNavigationMenu } from "./settingsNavigationMenu.js";
import { SettingsTabRenderer } from "./settingsTabRenderer.js";

export function SettingsView({ activeStaffUser }: SettingsViewProps) {
	const appLogic = useAppLogicContext();
	const settingsStore = useSettingsStore();
	const derivations = useSettingsDerivations();
	// biome-ignore lint/suspicious/noExplicitAny: props bag unpacking
	const logic = appLogic as Record<string, any>;
	const { activeSettingsTabButtonRef, reopenOnboarding, setSettingsTab, settingsTab, settingsTabs: rawSettingsTabs } = logic;

	const settingsProps = buildSettingsProps(logic, settingsStore, derivations, activeStaffUser);
	const [roleMode, setRoleMode] = useState<SettingsRoleMode>("all");

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
	}, [settingsTab, roleMode]);

	const flags = useWorkspaceProfile();
	let typedSettingsTabs = (
		Array.isArray(rawSettingsTabs) && rawSettingsTabs.length > 0
			? rawSettingsTabs
			: settingsTabs
	) as Array<{ id: SettingsTabId; title: string; group: SettingsTabGroup }>;
	if (!flags.hasMarketingModule) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "marketing");
	if (!flags.hasAnalyticsModule) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "reporting");
	if (!flags.hasBpmWorkflows) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "bpmn");
	if (!flags.hasClinicalRules) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "rules");
	if (!flags.hasInsuranceCoPay) typedSettingsTabs = typedSettingsTabs.filter((t) => t.id !== "insurance");
	if (activeStaffUser?.role === "doctor") typedSettingsTabs = typedSettingsTabs.filter((t) => t?.id !== "telegram");

	const selectSettingsTab = (tabId: SettingsTabId | string) => {
		const canonicalTab = tabId === "messengers" ? "telegram" : tabId;
		setSettingsTab?.(canonicalTab);
		window.location.hash = `settings/${canonicalTab}`;
	};

	const settingsTabButtonId = (tabId: SettingsTabId) => `settings-tab-${tabId}`;
	const settingsTabPanelId = (tabId: SettingsTabId) => `settings-panel-${tabId}`;

	const handleSettingsTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: SettingsTabId) => {
		const currentIndex = typedSettingsTabs.findIndex((tab) => tab.id === tabId);
		if (currentIndex < 0) return;
		const lastIndex = typedSettingsTabs.length - 1;
		const nextIndex = event.key === "ArrowRight" || event.key === "ArrowDown" ? (currentIndex === lastIndex ? 0 : currentIndex + 1) : (event.key === "ArrowLeft" || event.key === "ArrowUp") ? (currentIndex === 0 ? lastIndex : currentIndex - 1) : null;
		if (nextIndex === null) return;
		event.preventDefault();
		const targetTab = typedSettingsTabs[nextIndex];
		if (!targetTab) return;
		selectSettingsTab(targetTab.id);
		window.setTimeout(() => document.getElementById(settingsTabButtonId(targetTab.id))?.focus(), 0);
	};

	const isMobile = useIsMobile(768);
	const [mobileSection, setMobileSection] = useState<string>(() => (settingsTab === "telegram" || settingsTab === "messengers") ? "messengers" : (settingsTab && settingsTab !== "clinic" ? settingsTab : "root"));

	if (isMobile) {
		return (
			<section className="settings-zone-mobile w-full min-w-0" style={{ background: "var(--paper)", color: "var(--ink)", overflowY: "auto", maxWidth: "100vw", minHeight: "100dvh" }} id="settings" aria-label="Настройки клиники" data-testid="settings-view">
				{mobileSection === "prices" ? (
					<MobileSettingsPricesView appLogic={logic} onBackToSettings={() => { setMobileSection("root"); selectSettingsTab("clinic"); }} />
				) : mobileSection === "staff" ? (
					<MobileSettingsStaffView appLogic={logic} onBackToSettings={() => { setMobileSection("root"); selectSettingsTab("clinic"); }} />
				) : mobileSection !== "root" ? (
					<div className="flex flex-col w-full max-w-[100vw] overflow-x-clip pb-24">
						<div className="sticky top-0 z-30 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--line)] px-4 py-2.5 flex items-center justify-between">
							<button type="button" onClick={() => { setMobileSection("root"); selectSettingsTab("clinic"); }} className="min-w-[44px] min-h-[44px] -ml-2 px-2 flex items-center gap-1 text-[15px] font-medium text-[var(--teal)] cursor-pointer" aria-label="Назад в настройки" data-testid="btn-mobile-subtab-back">
								<ChevronLeft size={20} className="shrink-0" />
								<span>Настройки</span>
							</button>
							<h2 className="text-[17px] font-semibold text-[var(--ink)] tracking-tight truncate px-2">Раздел настроек</h2>
							<div className="w-9" />
						</div>
						<div className="p-4 space-y-4">
							<SettingsTabRenderer settingsTab={mobileSection} settingsProps={settingsProps} activeStaffUser={activeStaffUser} logic={logic} flags={flags} telegramAdminSecretSession={logic.telegramAdminSecretSession} setTelegramAdminSecretDraft={logic.setTelegramAdminSecretDraft} unlockTelegramAdminSession={logic.unlockTelegramAdminSession} lockTelegramAdminSession={logic.lockTelegramAdminSession} />
						</div>
					</div>
				) : (
					<MobileSettingsRootView appLogic={logic} onSelectSection={(secId) => { setMobileSection(secId); selectSettingsTab(secId); }} />
				)}
			</section>
		);
	}

	return (
		<motion.section className="settings-zone panel" style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)", borderRadius: "14px", padding: "20px 20px 100px 20px", position: "relative", overflowY: "auto" }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} id="settings" aria-label="Настройки и перенос данных" data-testid="settings-view">
			<SettingsNavigationMenu roleMode={roleMode} setRoleMode={setRoleMode} selectSettingsTab={selectSettingsTab} reopenOnboarding={reopenOnboarding} activeStaffUser={activeStaffUser} />

			<div className="col-span-full w-full min-w-0" style={{ gridColumn: "1 / -1" }}>
				{roleMode === "doctor" && <DoctorSettingsSection props={settingsProps} initialTab={DOCTOR_TABS.has(settingsTab) ? (settingsTab as DoctorSubTab) : "profile"} onSelectTab={selectSettingsTab} />}
				{roleMode === "admin" && <AdminSettingsSection props={settingsProps} initialTab={ADMIN_TABS.has(settingsTab) ? (settingsTab as AdminSubTab) : "clinic"} onSelectTab={selectSettingsTab} />}
				{roleMode === "owner" && <OwnerSettingsSection props={settingsProps} initialTab={OWNER_TABS.has(settingsTab) ? (settingsTab as OwnerSubTab) : "clinic"} onSelectTab={selectSettingsTab} appLogic={appLogic} />}
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

export default SettingsView;

export * from "./types.js";
export { SettingsNavigationSidebar } from "./SettingsNavigationSidebar.js";
export { SettingsClinicGeneralTab } from "./SettingsClinicGeneralTab.js";
export { SettingsSecurityAndBackupTab } from "./SettingsSecurityAndBackupTab.js";
export { SettingsNavigationMenu } from "./settingsNavigationMenu.js";
export { SettingsTabRenderer } from "./settingsTabRenderer.js";
