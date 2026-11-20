/**
 * @file apps/web/src/views/settingsView/tabRenderers/SettingsAdminTabContent.tsx
 * @description Tab content renderer for clinic administration, staff, hardware and access.
 */

import React from "react";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import { SettingsStaffTab } from "../../../components/settings/SettingsStaffTab";
import { StaffCommissionsPanel } from "../../../components/settings/StaffCommissionsPanel";
import { SettingsAccessTab } from "../../../components/settings/SettingsAccessTab";
import { EgiszBlankPermissionsWidget } from "../../../components/integrations/egiszModules/EgiszBlankPermissionsWidget";
import { HardwareSettingsTab } from "../../../components/settings/HardwareSettingsTab";
import { InsuranceContractsPanel } from "../../../components/settings/InsuranceContractsPanel";
import { SettingsMessengersTab } from "../../../components/settings/SettingsMessengersTab";
import { SettingsClinicGeneralTab } from "../SettingsClinicGeneralTab.js";
import { SettingsSecurityAndBackupTab } from "../SettingsSecurityAndBackupTab.js";

export interface SettingsAdminTabContentProps {
	settingsTab: string;
	settingsProps: Record<string, unknown>;
	telegramAdminSecretSession?: boolean | undefined;
	setTelegramAdminSecretDraft?: ((draft: string) => void) | undefined;
	unlockTelegramAdminSession?: (() => void) | undefined;
	lockTelegramAdminSession?: (() => void) | undefined;
}

export const SettingsAdminTabContent: React.FC<SettingsAdminTabContentProps> = ({
	settingsTab,
	settingsProps,
	telegramAdminSecretSession,
	setTelegramAdminSecretDraft,
	unlockTelegramAdminSession,
	lockTelegramAdminSession,
}) => {
	if (settingsTab === "clinic") {
		return <SettingsClinicGeneralTab props={settingsProps} settingsTab={settingsTab} />;
	}

	if (settingsTab === "staff") {
		return <SettingsStaffTab props={settingsProps} />;
	}

	if (settingsTab === "commissions") {
		return (
			<ErrorBoundary moduleName="Комиссии и мотивация врачей">
				<StaffCommissionsPanel />
			</ErrorBoundary>
		);
	}

	if (settingsTab === "access") {
		return (
			<div className="space-y-6">
				<SettingsSecurityAndBackupTab
					settingsProps={settingsProps}
					telegramAdminSecretSession={telegramAdminSecretSession}
					setTelegramAdminSecretDraft={setTelegramAdminSecretDraft}
					unlockTelegramAdminSession={unlockTelegramAdminSession}
					lockTelegramAdminSession={lockTelegramAdminSession}
				/>
				<SettingsAccessTab props={settingsProps} settingsTab={settingsTab} />
				<EgiszBlankPermissionsWidget />
			</div>
		);
	}

	if (settingsTab === "hardware") {
		return (
			<ErrorBoundary moduleName="Оборудование и рентген">
				<HardwareSettingsTab />
			</ErrorBoundary>
		);
	}

	if (settingsTab === "insurance") {
		return <InsuranceContractsPanel />;
	}

	if (settingsTab === "messengers" || settingsTab === "telegram") {
		return (
			<ErrorBoundary moduleName="Мессенджеры и рассылки">
				<SettingsMessengersTab props={settingsProps} settingsTab={settingsTab} />
			</ErrorBoundary>
		);
	}

	return null;
};
