import React from "react";
import "./WhatsappIntegrationHub.css";
export { WhatsappIntegrationHub } from "./WhatsappIntegrationHub.js";

import { useWhatsappSettings } from "../../hooks/useWhatsappSettings.js";
import { showToast } from "../GlobalToast.js";
import {
	computeWhatsappSettingsDirty,
	isWhatsappSettingsSaveDisabled,
	useWhatsappPanelState,
	WhatsappSettingsPanelContent,
} from "./whatsapp/index.js";
import type { WhatsappSettingsPanelProps } from "./whatsapp/types.js";

export { computeWhatsappSettingsDirty, isWhatsappSettingsSaveDisabled };
export type * from "./whatsapp/types.js";

export function WhatsappSettingsPanel({
	staffOptions,
	serverBaseUrl,
	useSettingsHook = useWhatsappSettings,
}: WhatsappSettingsPanelProps) {
	const {
		settings,
		status,
		statusUnknown,
		loadState,
		loadFailureStatus,
		canSave,
		loading,
		saveState,
		saveError,
		phoneNumberIdDraft,
		setPhoneNumberIdDraft,
		accessTokenDraft,
		setAccessTokenDraft,
		webhookVerifyTokenDraft,
		setWebhookVerifyTokenDraft,
		isActiveDraft,
		setIsActiveDraft,
		enabledFeaturesDraft,
		setEnabledFeaturesDraft,
		staffRoutingDraft,
		setStaffRoutingDraft,
		save,
		reload,
	} = useSettingsHook();

	const panelState = useWhatsappPanelState({
		phoneNumberIdDraft,
		accessTokenDraft,
		serverBaseUrl,
	});

	const dirty = computeWhatsappSettingsDirty({
		phoneNumberIdDraft,
		settingsPhoneNumberId: settings?.phoneNumberId,
		webhookVerifyTokenDraft,
		settingsWebhookVerifyToken: settings?.webhookVerifyToken,
		isActiveDraft,
		settingsIsActive: settings?.isActive,
		enabledFeaturesDraft,
		settingsEnabledFeatures: settings?.enabledFeatures,
		staffRoutingDraft,
		settingsStaffRouting: settings?.staffRouting,
		accessTokenDraft,
	});

	const handleSave = () => {
		if (isWhatsappSettingsSaveDisabled(canSave, saveState)) {
			return;
		}
		if (!dirty) {
			showToast("Настройки актуальны (сохранено)", "info");
			panelState.triggerCleanSavedToast();
		}
		void save();
	};

	return (
		<WhatsappSettingsPanelContent
			staffOptions={staffOptions}
			serverBaseUrl={serverBaseUrl}
			settings={settings}
			status={status}
			statusUnknown={statusUnknown}
			loadState={loadState}
			loadFailureStatus={loadFailureStatus}
			loading={loading}
			canSave={canSave}
			saveState={saveState}
			saveError={saveError}
			phoneNumberIdDraft={phoneNumberIdDraft}
			setPhoneNumberIdDraft={setPhoneNumberIdDraft}
			accessTokenDraft={accessTokenDraft}
			setAccessTokenDraft={setAccessTokenDraft}
			webhookVerifyTokenDraft={webhookVerifyTokenDraft}
			setWebhookVerifyTokenDraft={setWebhookVerifyTokenDraft}
			isActiveDraft={isActiveDraft}
			setIsActiveDraft={setIsActiveDraft}
			enabledFeaturesDraft={enabledFeaturesDraft}
			setEnabledFeaturesDraft={setEnabledFeaturesDraft}
			staffRoutingDraft={staffRoutingDraft}
			setStaffRoutingDraft={setStaffRoutingDraft}
			dirty={dirty}
			cleanSavedNotice={panelState.cleanSavedNotice}
			gatewayMode={panelState.gatewayMode}
			setGatewayMode={panelState.setGatewayMode}
			qrProvider={panelState.qrProvider}
			setQrProvider={panelState.setQrProvider}
			openQrStep={panelState.openQrStep}
			setOpenQrStep={panelState.setOpenQrStep}
			qrDataUrl={panelState.qrDataUrl}
			pairingCode={panelState.pairingCode}
			secondsLeft={panelState.secondsLeft}
			connectedPhone={panelState.connectedPhone}
			deviceModel={panelState.deviceModel}
			isPairingCodeMode={panelState.isPairingCodeMode}
			setIsPairingCodeMode={panelState.setIsPairingCodeMode}
			phoneInput={panelState.phoneInput}
			setPhoneInput={panelState.setPhoneInput}
			isQrLoading={panelState.isQrLoading}
			wabaAccountIdDraft={panelState.wabaAccountIdDraft}
			setWabaAccountIdDraft={panelState.setWabaAccountIdDraft}
			isTestingWaba={panelState.isTestingWaba}
			wabaTestResult={panelState.wabaTestResult}
			webhookUrl={panelState.webhookUrl}
			copyWebhook={panelState.copyWebhook}
			startQrSession={panelState.startQrSession}
			handleDisconnectQr={panelState.handleDisconnectQr}
			handleSimulateScan={panelState.handleSimulateScan}
			handleTestWaba={panelState.handleTestWaba}
			onReload={() => void reload()}
			onSave={handleSave}
		/>
	);
}
