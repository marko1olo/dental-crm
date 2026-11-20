/**
 * @file apps/web/src/views/settingsView/settingsTabRenderer.tsx
 * @description Master Tab content router for settings modules.
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 */

import React from "react";
import type { DentalPricelistAnalysisResponse } from "@dental/shared";
import type { SettingsViewFeatureFlags } from "./types.js";
import { SettingsProfileTab } from "../../components/settings/SettingsProfileTab";
import { SettingsPricesTabContent } from "./tabRenderers/SettingsPricesTabContent.js";
import { SettingsClinicalTabContent } from "./tabRenderers/SettingsClinicalTabContent.js";
import { SettingsAdminTabContent } from "./tabRenderers/SettingsAdminTabContent.js";
import { SettingsOperationsTabContent } from "./tabRenderers/SettingsOperationsTabContent.js";

export interface SettingsTabRendererProps {
	settingsTab: string;
	settingsProps: Record<string, unknown>;
	activeStaffUser?: unknown;
	logic: Record<string, unknown>;
	flags: SettingsViewFeatureFlags;
	telegramAdminSecretSession?: boolean | undefined;
	setTelegramAdminSecretDraft?: ((draft: string) => void) | undefined;
	unlockTelegramAdminSession?: (() => void) | undefined;
	lockTelegramAdminSession?: (() => void) | undefined;
	pricelistAnalysis?: DentalPricelistAnalysisResponse | null | undefined;
	pricelistImageNote?: string | undefined;
	pricelistWarningsText?: ((warnings: unknown[]) => string) | undefined;
	pricelistItemMaterialText?: ((item: unknown) => string) | undefined;
	pricelistMaterialSummaryText?: ((summary: unknown) => string) | undefined;
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
