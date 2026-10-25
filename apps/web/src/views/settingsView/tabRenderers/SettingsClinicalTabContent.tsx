/**
 * @file apps/web/src/views/settingsView/tabRenderers/SettingsClinicalTabContent.tsx
 * @description Tab content renderer for clinical doctor settings & protocols.
 */

import React from "react";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import { DoctorClinicalPreferencesSection } from "../../../components/settings/DoctorClinicalPreferencesSection";
import { SettingsProtocolsTab } from "../../../components/settings/SettingsProtocolsTab";
import { SettingsRulesTab } from "../../../components/settings/SettingsRulesTab";
import { MaterialBomsSettingsPanel } from "../../../components/inventory/MaterialBomsSettingsPanel";
import { DeepClinicalSettingsSection } from "../../../components/settings/DeepClinicalSettingsSection";

export interface SettingsClinicalTabContentProps {
	settingsTab: string;
	settingsProps: any;
	logic: any;
}

export const SettingsClinicalTabContent: React.FC<SettingsClinicalTabContentProps> = ({
	settingsTab,
	settingsProps,
	logic,
}) => {
	if (settingsTab === "preferences") {
		return (
			<ErrorBoundary moduleName="Клинические пресеты врача">
				<DoctorClinicalPreferencesSection
					soundNotificationsMuted={
						settingsProps?.soundNotificationsMuted ??
						logic?.soundNotificationsMuted
					}
					onToggleSoundMuted={
						settingsProps?.setSoundNotificationsMuted ??
						logic?.setSoundNotificationsMuted
					}
					onTestOnlineBookingSound={
						settingsProps?.testOnlineBookingSound ??
						logic?.testOnlineBookingSound
					}
					onTestSlotEndSound={
						settingsProps?.testSlotEndSound ??
						logic?.testSlotEndSound
					}
				/>
			</ErrorBoundary>
		);
	}

	if (settingsTab === "protocols") {
		return <SettingsProtocolsTab />;
	}

	if (settingsTab === "rules") {
		return (
			<ErrorBoundary moduleName="Правила и регламенты">
				<SettingsRulesTab />
			</ErrorBoundary>
		);
	}

	if (settingsTab === "procedure-boms") {
		return (
			<ErrorBoundary moduleName="Техкарты расхода материалов">
				<MaterialBomsSettingsPanel
					organizationId={
						logic?.dashboard?.clinicSettings?.profile?.organizationId ||
						logic?.auth?.currentUser?.organizationId
					}
				/>
			</ErrorBoundary>
		);
	}

	if (settingsTab === "deep-clinical") {
		return (
			<ErrorBoundary moduleName="Клинические протоколы и автономия">
				<DeepClinicalSettingsSection />
			</ErrorBoundary>
		);
	}

	return null;
};
