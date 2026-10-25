/**
 * @file apps/web/src/views/settingsView/settingsTabRenderer.tsx
 * @description Master Tab content router for settings modules.
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 */

import React from "react";
import { SettingsProfileTab } from "../../components/settings/SettingsProfileTab";
import { SettingsPricesTabContent } from "./tabRenderers/SettingsPricesTabContent.js";
import { SettingsClinicalTabContent } from "./tabRenderers/SettingsClinicalTabContent.js";
import { SettingsAdminTabContent } from "./tabRenderers/SettingsAdminTabContent.js";
import { SettingsOperationsTabContent } from "./tabRenderers/SettingsOperationsTabContent.js";

export interface SettingsTabRendererProps {
	settingsTab: string;
	settingsProps: any;
	activeStaffUser?: any;
	logic: any;
	flags: any;
	telegramAdminSecretSession: any;
	setTelegramAdminSecretDraft: (draft: string) => void;
	unlockTelegramAdminSession: () => void;
	lockTelegramAdminSession: () => void;
	pricelistAnalysis?: any;
	pricelistImageNote?: string | undefined;
	pricelistWarningsText?: ((warnings: any[]) => string) | undefined;
	pricelistItemMaterialText?: ((item: any) => string) | undefined;
	pricelistMaterialSummaryText?: ((summary: any) => string) | undefined;
}

export const SettingsTabRenderer: React.FC<SettingsTabRendererProps> = ({
	settingsTab,
	settingsProps,
	activeStaffUser,
	logic,
	flags,
	telegramAdminSecretSession,
	setTelegramAdminSecretDraft,
	unlockTelegramAdminSession,
	lockTelegramAdminSession,
	pricelistAnalysis,
	pricelistImageNote,
	pricelistWarningsText,
	pricelistItemMaterialText,
	pricelistMaterialSummaryText,
}) => {
	if (settingsTab === "profile") {
		return <SettingsProfileTab props={settingsProps} />;
	}

	if (settingsTab === "prices") {
		return (
			<SettingsPricesTabContent
				pricelistAnalysis={pricelistAnalysis}
				pricelistImageNote={pricelistImageNote}
				pricelistWarningsText={pricelistWarningsText}
				pricelistItemMaterialText={pricelistItemMaterialText}
				pricelistMaterialSummaryText={pricelistMaterialSummaryText}
			/>
		);
	}

	return (
		<>
			<SettingsClinicalTabContent
				settingsTab={settingsTab}
				settingsProps={settingsProps}
				logic={logic}
			/>
			<SettingsAdminTabContent
				settingsTab={settingsTab}
				settingsProps={settingsProps}
				telegramAdminSecretSession={telegramAdminSecretSession}
				setTelegramAdminSecretDraft={setTelegramAdminSecretDraft}
				unlockTelegramAdminSession={unlockTelegramAdminSession}
				lockTelegramAdminSession={lockTelegramAdminSession}
			/>
			<SettingsOperationsTabContent
				settingsTab={settingsTab}
				settingsProps={settingsProps}
				flags={flags}
			/>
		</>
	);
};

export default SettingsTabRenderer;
