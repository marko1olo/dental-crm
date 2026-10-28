/**
 * @file apps/web/src/views/settingsView/MobileSettingsViewWrapper.tsx
 * @description Dedicated mobile wrapper for settings screens (Apple HIG touch ergonomics).
 */

import React from "react";
import { ChevronLeft } from "lucide-react";
import { MobileSettingsRootView } from "../../components/settings/mobile/MobileSettingsRootView";
import { MobileSettingsPricesView } from "../../components/settings/mobile/MobileSettingsPricesView";
import { MobileSettingsStaffView } from "../../components/settings/mobile/MobileSettingsStaffView";
import { SettingsTabRenderer } from "./settingsTabRenderer.js";
import { getMobileSectionTitle } from "./mobileSectionTitles.js";

export interface MobileSettingsViewWrapperProps {
	mobileSection: string;
	setMobileSection: (secId: string) => void;
	selectSettingsTab: (tabId: string) => void;
	logic: any;
	settingsProps: any;
	activeStaffUser?: any;
	flags: any;
}

export function MobileSettingsViewWrapper({
	mobileSection,
	setMobileSection,
	selectSettingsTab,
	logic,
	settingsProps,
	activeStaffUser,
	flags,
}: MobileSettingsViewWrapperProps) {
	return (
		<section
			className="settings-zone-mobile w-full min-w-0"
			style={{
				background: "var(--paper)",
				color: "var(--ink)",
				overflowY: "auto",
				maxWidth: "100vw",
				minHeight: "100dvh",
				padding: 0,
			}}
			id="settings"
			aria-label="Настройки клиники"
			data-testid="settings-view"
		>
			{mobileSection === "prices" ? (
				<MobileSettingsPricesView
					appLogic={logic}
					onBackToSettings={() => {
						setMobileSection("root");
						selectSettingsTab("clinic");
					}}
				/>
			) : mobileSection === "staff" ? (
				<MobileSettingsStaffView
					appLogic={logic}
					onBackToSettings={() => {
						setMobileSection("root");
						selectSettingsTab("clinic");
					}}
				/>
			) : mobileSection !== "root" ? (
				<div className="flex flex-col w-full max-w-[100vw] overflow-x-clip pb-24">
					<div className="sticky top-0 z-30 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--line)] px-3 py-2 flex items-center justify-between gap-2">
						<button
							type="button"
							onClick={() => {
								setMobileSection("root");
								selectSettingsTab("clinic");
							}}
							className="min-w-[44px] min-h-[44px] -ml-1 px-1.5 flex items-center gap-1 text-[15px] font-medium text-[var(--teal)] bg-transparent border-0 cursor-pointer shrink-0"
							aria-label="Назад в настройки"
							data-testid="btn-mobile-subtab-back"
						>
							<ChevronLeft size={22} className="shrink-0" />
							<span className="text-sm">Назад</span>
						</button>
						<h2 className="text-[16px] font-semibold text-[var(--ink)] tracking-tight truncate text-center flex-1 m-0">
							{getMobileSectionTitle(mobileSection)}
						</h2>
						<div className="w-11 shrink-0" />
					</div>
					<div className="p-2.5 sm:p-4 space-y-4">
						<SettingsTabRenderer
							settingsTab={mobileSection}
							settingsProps={settingsProps}
							activeStaffUser={activeStaffUser}
							logic={logic}
							flags={flags}
							telegramAdminSecretSession={logic.telegramAdminSecretSession}
							setTelegramAdminSecretDraft={logic.setTelegramAdminSecretDraft}
							unlockTelegramAdminSession={logic.unlockTelegramAdminSession}
							lockTelegramAdminSession={logic.lockTelegramAdminSession}
						/>
					</div>
				</div>
			) : (
				<MobileSettingsRootView
					appLogic={logic}
					onSelectSection={(secId) => {
						setMobileSection(secId);
						selectSettingsTab(secId);
					}}
				/>
			)}
		</section>
	);
}
