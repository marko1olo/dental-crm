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
	settingsProps: Record<string, unknown> & {
		soundNotificationsMuted?: boolean | undefined;
		setSoundNotificationsMuted?: ((m: boolean) => void) | undefined;
		testOnlineBookingSound?: (() => void) | undefined;
		testSlotEndSound?: (() => void) | undefined;
	};
	logic: Record<string, unknown> & {
		soundNotificationsMuted?: boolean | undefined;
		setSoundNotificationsMuted?: ((m: boolean) => void) | undefined;
		testOnlineBookingSound?: (() => void) | undefined;
		testSlotEndSound?: (() => void) | undefined;
	};
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
		const onToggleMuted = (muted: boolean) => {
			if (typeof settingsProps?.setSoundNotificationsMuted === "function") {
				settingsProps.setSoundNotificationsMuted(muted);
			} else if (typeof logic?.setSoundNotificationsMuted === "function") {
				logic.setSoundNotificationsMuted(muted);
			}
		};
		const onTestBookingSound = () => {
			if (typeof settingsProps?.testOnlineBookingSound === "function") {
				settingsProps.testOnlineBookingSound();
			} else if (typeof logic?.testOnlineBookingSound === "function") {
				logic.testOnlineBookingSound();
			}
		};
		const onTestEndSound = () => {
			if (typeof settingsProps?.testSlotEndSound === "function") {
				settingsProps.testSlotEndSound();
			} else if (typeof logic?.testSlotEndSound === "function") {
				logic.testSlotEndSound();
			}
		};

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
