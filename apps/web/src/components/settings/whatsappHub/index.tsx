/**
 * @file index.tsx
 * @description Master coordinator component for WhatsApp Integration Hub and re-exports.
 */

import React from "react";
import { Globe, Smartphone } from "lucide-react";
import "../WhatsappIntegrationHub.css";
import { useWhatsappSettings } from "../../../hooks/useWhatsappSettings.js";
import type {
	StaffOption,
	WhatsappHubMode,
	WhatsappIntegrationHubProps,
} from "./types.js";
import { useWhatsappHub } from "./useWhatsappHub.js";
import { WhatsappQrAuthCard } from "./WhatsappQrAuthCard.js";
import { WhatsappWebhookSettings } from "./WhatsappWebhookSettings.js";
import { WhatsappTemplatesList } from "./WhatsappTemplatesList.js";

export type {
	WhatsappHubMode,
	StaffOption,
	WhatsappIntegrationHubProps,
	QrSessionStatus,
	WabaTestResult,
	WaTestSendResult,
	TemplateFeatureItem,
} from "./types.js";

export { useWhatsappHub } from "./useWhatsappHub.js";
export { WhatsappQrAuthCard } from "./WhatsappQrAuthCard.js";
export { WhatsappWebhookSettings } from "./WhatsappWebhookSettings.js";
export { WhatsappTemplatesList } from "./WhatsappTemplatesList.js";

export function WhatsappIntegrationHub({
	staffOptions = [],
	serverBaseUrl,
	useSettingsHook = useWhatsappSettings,
}: WhatsappIntegrationHubProps) {
	const {
		settings,
		status,
		statusUnknown,
		loading,
		saveState,
		saveError,
		canSave,
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

	const hub = useWhatsappHub({
		serverBaseUrl,
		phoneNumberIdDraft,
		accessTokenDraft,
		webhookVerifyTokenDraft,
		reload,
	});

	return (
		<div className="whatsapp-hub-container" data-testid="whatsapp-integration-hub">
			{/* Верхний переключатель режимов */}
			<div className="whatsapp-mode-tabs" role="tablist" aria-label="Режимы интеграции WhatsApp">
				<button
					type="button"
					role="tab"
					aria-selected={hub.activeMode === "qr"}
					className={`whatsapp-mode-btn ${hub.activeMode === "qr" ? "active" : ""}`}
					onClick={() => hub.setActiveMode("qr")}
					data-testid="tab-qr-mode"
				>
					<Smartphone size={16} />
					<span>Рабочий номер по QR-коду</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={hub.activeMode === "waba"}
					className={`whatsapp-mode-btn ${hub.activeMode === "waba" ? "active" : ""}`}
					onClick={() => hub.setActiveMode("waba")}
					data-testid="tab-waba-mode"
				>
					<Globe size={16} />
					<span>Официальный WhatsApp Cloud (WABA)</span>
				</button>
			</div>

			{/* Вкладка 1: РАБОЧИЙ НОМЕР ПО QR-КОДУ (WHATSAPP WEB MULTI-DEVICE) */}
			{hub.activeMode === "qr" && (
				<WhatsappQrAuthCard
					qrStatus={hub.qrStatus}
					connectedPhone={hub.connectedPhone}
					deviceModel={hub.deviceModel}
					onDisconnectQr={hub.handleDisconnectQr}
					isPairingCodeMode={hub.isPairingCodeMode}
					setIsPairingCodeMode={hub.setIsPairingCodeMode}
					qrDataUrl={hub.qrDataUrl}
					secondsLeft={hub.secondsLeft}
					isQrLoading={hub.isQrLoading}
					onRefreshQr={hub.startQrSession}
					pairingCode={hub.pairingCode}
					phoneInput={hub.phoneInput}
					setPhoneInput={hub.setPhoneInput}
					copyText={hub.copyText}
					onSimulateScan={hub.handleSimulateScan}
					openQrStep={hub.openQrStep}
					setOpenQrStep={hub.setOpenQrStep}
				/>
			)}

			{/* Вкладка 2: ОФИЦИАЛЬНЫЙ WHATSAPP BUSINESS CLOUD API (META WABA) */}
			{hub.activeMode === "waba" && (
				<WhatsappWebhookSettings
					phoneNumberIdDraft={phoneNumberIdDraft}
					setPhoneNumberIdDraft={setPhoneNumberIdDraft}
					wabaAccountIdDraft={hub.wabaAccountIdDraft}
					setWabaAccountIdDraft={hub.setWabaAccountIdDraft}
					accessTokenDraft={accessTokenDraft}
					setAccessTokenDraft={setAccessTokenDraft}
					webhookVerifyTokenDraft={webhookVerifyTokenDraft}
					setWebhookVerifyTokenDraft={setWebhookVerifyTokenDraft}
					webhookUrl={hub.webhookUrl}
					copyText={hub.copyText}
					isTestingWaba={hub.isTestingWaba}
					onTestWaba={hub.handleTestWaba}
					onSaveWaba={hub.handleSaveWaba}
					wabaTestResult={hub.wabaTestResult}
					openWabaStep={hub.openWabaStep}
					setOpenWabaStep={hub.setOpenWabaStep}
				/>
			)}

			{/* Общие настройки: Функции отправки и Роутинг сотрудников */}
			<WhatsappTemplatesList
				isActiveDraft={isActiveDraft}
				setIsActiveDraft={setIsActiveDraft}
				enabledFeaturesDraft={enabledFeaturesDraft}
				setEnabledFeaturesDraft={setEnabledFeaturesDraft}
				staffRoutingDraft={staffRoutingDraft}
				setStaffRoutingDraft={setStaffRoutingDraft}
				staffOptions={staffOptions}
				testWaPhone={hub.testWaPhone}
				setTestWaPhone={hub.setTestWaPhone}
				testWaMessage={hub.testWaMessage}
				setTestWaMessage={hub.setTestWaMessage}
				isSendingWaTest={hub.isSendingWaTest}
				onSendWaTest={hub.handleSendWaTest}
				waTestSendResult={hub.waTestSendResult}
				saveState={saveState}
				canSave={canSave}
				onSaveAll={save}
			/>
		</div>
	);
}
