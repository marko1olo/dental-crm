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
	settingsProps: Record<string, unknown>;
	logic: Record<string, unknown>;
}

export const SettingsClinicalTabContent: React.FC<SettingsClinicalTabContentProps> = ({
	settingsTab,
	settingsProps,
	logic,
}) => {
	if (settingsTab === "preferences") {
		const soundMuted = Boolean(
			settingsProps?.soundNotificationsMuted ??
			logic?.soundNotificationsMuted,
		);
		const onToggleMuted =
			typeof settingsProps?.setSoundNotificationsMuted === "function"
				? (settingsProps.setSoundNotificationsMuted as (muted: boolean) => void)
				: typeof logic?.setSoundNotificationsMuted === "function"
					? (logic.setSoundNotificationsMuted as (muted: boolean) => void)
					: undefined;
		const onTestBookingSound =
			typeof settingsProps?.testOnlineBookingSound === "function"
				? (settingsProps.testOnlineBookingSound as () => void)
				: typeof logic?.testOnlineBookingSound === "function"
					? (logic.testOnlineBookingSound as () => void)
					: undefined;
		const onTestEndSound =
			typeof settingsProps?.testSlotEndSound === "function"
				? (settingsProps.testSlotEndSound as () => void)
				: typeof logic?.testSlotEndSound === "function"
					? (logic.testSlotEndSound as () => void)
					: undefined;

		return (
			<ErrorBoundary moduleName="Клинические пресеты врача">
				<DoctorClinicalPreferencesSection
					soundNotificationsMuted={soundMuted}
					onToggleSoundMuted={onToggleMuted}
					onTestOnlineBookingSound={onTestBookingSound}
					onTestSlotEndSound={onTestEndSound}
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
				<MaterialBomsSettingsPanel />
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
