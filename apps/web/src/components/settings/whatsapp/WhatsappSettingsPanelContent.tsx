import React from "react";
import {
	HelpCircle,
	QrCode,
	Wifi,
	WifiOff,
} from "lucide-react";
import type {
	WhatsappConnectionStatus,
	WhatsappSettings,
	WhatsappSettingsLoadState,
	WhatsappStaffRouting,
} from "../../../hooks/useWhatsappSettings.js";
import { WHATSAPP_SETTINGS_PANEL_SUBJECT } from "../../../hooks/useWhatsappSettings.js";
import { panelStateText } from "../../../lib/panelStateText.js";
import { PanelLoadFailure } from "../../PanelLoadFailure.js";
import { WhatsappActionsBar } from "./WhatsappActionsBar.js";
import { WhatsappAntiBanLimitsSection } from "./WhatsappAntiBanLimitsSection.js";
import { WhatsappCloudApiSection } from "./WhatsappCloudApiSection.js";
import { WhatsappInstanceConnectionCard } from "./WhatsappInstanceConnectionCard.js";
import { WhatsappRoutingAndFeaturesSection } from "./WhatsappRoutingAndFeaturesSection.js";
import { WhatsappTemplatesSection } from "./WhatsappTemplatesSection.js";
import { WhatsappTestMessageSection } from "./WhatsappTestMessageSection.js";
import type {
	GatewayMode,
	QrProvider,
	StaffOption,
	WabaTestResult,
} from "./types.js";

export interface WhatsappSettingsPanelContentProps {
	staffOptions: StaffOption[];
	serverBaseUrl?: string | undefined;
	settings?: WhatsappSettings | null;
	status?: WhatsappConnectionStatus | null;
	statusUnknown: boolean;
	loadState: WhatsappSettingsLoadState;
	loadFailureStatus: string | number | null;
	loading: boolean;
	canSave: boolean;
	saveState: string;
	saveError: string | null;
	phoneNumberIdDraft: string;
	setPhoneNumberIdDraft: (val: string) => void;
	accessTokenDraft: string;
	setAccessTokenDraft: (val: string) => void;
	webhookVerifyTokenDraft: string;
	setWebhookVerifyTokenDraft: (val: string) => void;
	isActiveDraft: boolean;
	setIsActiveDraft: (val: boolean) => void;
	enabledFeaturesDraft: string[];
	setEnabledFeaturesDraft: React.Dispatch<React.SetStateAction<string[]>>;
	staffRoutingDraft: WhatsappStaffRouting;
	setStaffRoutingDraft: (routing: WhatsappStaffRouting) => void;
	dirty: boolean;
	cleanSavedNotice: boolean;
	gatewayMode: GatewayMode;
	setGatewayMode: (mode: GatewayMode) => void;
	qrProvider: QrProvider;
	setQrProvider: (prov: QrProvider) => void;
	openQrStep: number | null;
	setOpenQrStep: React.Dispatch<React.SetStateAction<number | null>>;
	qrDataUrl: string | null;
	pairingCode: string | null;
	secondsLeft: number;
	connectedPhone: string | null;
	deviceModel: string | null;
	isPairingCodeMode: boolean;
	setIsPairingCodeMode: (enabled: boolean) => void;
	phoneInput: string;
	setPhoneInput: (val: string) => void;
	isQrLoading: boolean;
	wabaAccountIdDraft: string;
	setWabaAccountIdDraft: (val: string) => void;
	isTestingWaba: boolean;
	wabaTestResult: WabaTestResult | null;
	webhookUrl: string;
	copyWebhook: () => void;
	startQrSession: (force?: boolean) => void;
	handleDisconnectQr: () => void;
	handleSimulateScan: () => void;
	handleTestWaba: () => void;
	onReload: () => void;
	onSave: () => void;
}

export function WhatsappSettingsPanelContent({
	staffOptions,
	serverBaseUrl,
	settings,
	status,
	statusUnknown,
	loadState,
	loadFailureStatus,
	loading,
	canSave,
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
	dirty,
	cleanSavedNotice,
	gatewayMode,
	setGatewayMode,
	qrProvider,
	setQrProvider,
	openQrStep,
	setOpenQrStep,
	qrDataUrl,
	pairingCode,
	secondsLeft,
	connectedPhone,
	deviceModel,
	isPairingCodeMode,
	setIsPairingCodeMode,
	phoneInput,
	setPhoneInput,
	isQrLoading,
	wabaAccountIdDraft,
	setWabaAccountIdDraft,
	isTestingWaba,
	wabaTestResult,
	webhookUrl,
	copyWebhook,
	startQrSession,
	handleDisconnectQr,
	handleSimulateScan,
	handleTestWaba,
	onReload,
	onSave,
}: WhatsappSettingsPanelContentProps) {
	const header = (
		<div className="messenger-panel-header">
			<div className="messenger-panel-icon whatsapp-icon" aria-hidden="true">
				WA
			</div>
			<div className="messenger-panel-title">
				<h3>WhatsApp Business</h3>
				<p>
					Подключите WhatsApp Cloud API через Meta Business Console для отправки
					напоминаний, документов и инструкций пациентам.
				</p>
			</div>
			{statusUnknown ? (
				<div className="messenger-status-badge unknown">
					<HelpCircle size={14} aria-hidden="true" />
					<span>Состояние неизвестно</span>
				</div>
			) : (
				<div
					className={`messenger-status-badge ${status?.connected ? "connected" : "disconnected"}`}
				>
					{status?.connected ? (
						<>
							<Wifi size={14} aria-hidden="true" />
							<span>Подключён</span>
						</>
					) : (
						<>
							<WifiOff size={14} aria-hidden="true" />
							<span>Не подключён</span>
						</>
					)}
				</div>
			)}
		</div>
	);

	if (loadState.phase === "failed") {
		return (
			<section className="messenger-panel whatsapp-panel">
				{header}
				<PanelLoadFailure
					subject={WHATSAPP_SETTINGS_PANEL_SUBJECT}
					status={loadFailureStatus}
					onRetry={onReload}
				/>
			</section>
		);
	}

	if (loadState.phase === "loading" && !settings) {
		const loadingText = panelStateText(WHATSAPP_SETTINGS_PANEL_SUBJECT, {
			phase: "loading",
		});
		return (
			<section className="messenger-panel whatsapp-panel">
				{header}
				<p className="messenger-status-detail" role="status" aria-live="polite">
					{loadingText.title} {loadingText.hint}
				</p>
			</section>
		);
	}

	return (
		<section className="messenger-panel whatsapp-panel">
			{header}

			{status?.detail && (
				<p className="messenger-status-detail">{status.detail}</p>
			)}

			<div className="messenger-panel-body">
				{/* Режим подключения WhatsApp */}
				<div className="form-group" data-testid="whatsapp-mode-selector">
					<label>Режим интеграции WhatsApp</label>
					<div className="whatsapp-mode-toggle-group">
						<button
							type="button"
							className={`btn-secondary ${gatewayMode === "cloud_api" ? "active" : ""}`}
							style={{
								fontWeight: gatewayMode === "cloud_api" ? 600 : 400,
								borderColor: gatewayMode === "cloud_api" ? "var(--primary)" : undefined,
							}}
							onClick={() => setGatewayMode("cloud_api")}
							data-testid="wa-mode-cloud-btn"
						>
							<Wifi size={13} /> Meta Cloud API (Официальный)
						</button>
						<button
							type="button"
							className={`btn-secondary ${gatewayMode === "qr_gateway" ? "active" : ""}`}
							style={{
								fontWeight: gatewayMode === "qr_gateway" ? 600 : 400,
								borderColor: gatewayMode === "qr_gateway" ? "var(--primary)" : undefined,
							}}
							onClick={() => setGatewayMode("qr_gateway")}
							data-testid="wa-mode-qr-btn"
						>
							<QrCode size={13} /> WhatsApp QR-шлюз (Web / GreenAPI / Wappi)
						</button>
					</div>
				</div>

				{/* Блок настроек QR-шлюза (для клиник без зарубежных карт) */}
				{gatewayMode === "qr_gateway" && (
					<WhatsappInstanceConnectionCard
						connectedPhone={connectedPhone}
						deviceModel={deviceModel}
						qrDataUrl={qrDataUrl}
						pairingCode={pairingCode}
						secondsLeft={secondsLeft}
						isPairingCodeMode={isPairingCodeMode}
						phoneInput={phoneInput}
						isQrLoading={isQrLoading}
						openQrStep={openQrStep}
						qrProvider={qrProvider}
						onRefreshQr={() => void startQrSession(true)}
						onTogglePairingMode={setIsPairingCodeMode}
						onPhoneInputChange={setPhoneInput}
						onDisconnectQr={handleDisconnectQr}
						onSimulateScan={handleSimulateScan}
						onToggleQrStep={(step) =>
							setOpenQrStep(openQrStep === step ? null : step)
						}
						onChangeQrProvider={setQrProvider}
					/>
				)}

				{/* Блок настроек официального Meta Cloud API */}
				{gatewayMode === "cloud_api" && (
					<WhatsappCloudApiSection
						phoneNumberIdDraft={phoneNumberIdDraft}
						onPhoneNumberIdChange={setPhoneNumberIdDraft}
						accessTokenDraft={accessTokenDraft}
						onAccessTokenChange={setAccessTokenDraft}
						hasToken={settings?.hasToken}
						wabaAccountIdDraft={wabaAccountIdDraft}
						onWabaAccountIdChange={setWabaAccountIdDraft}
						webhookVerifyTokenDraft={webhookVerifyTokenDraft}
						onWebhookVerifyTokenChange={setWebhookVerifyTokenDraft}
						webhookUrl={webhookUrl}
						onCopyWebhook={copyWebhook}
						isTestingWaba={isTestingWaba}
						wabaTestResult={wabaTestResult}
						onTestWaba={handleTestWaba}
					/>
				)}

				{/* Шаблоны сервисных сообщений */}
				<WhatsappTemplatesSection />

				{/* Лимиты отправки и анти-спам защита */}
				<WhatsappAntiBanLimitsSection />

				{/* Тестовая отправка сообщения */}
				<WhatsappTestMessageSection serverBaseUrl={serverBaseUrl} />

				{/* Роутинг и функциональные переключатели */}
				<WhatsappRoutingAndFeaturesSection
					isActiveDraft={isActiveDraft}
					onIsActiveChange={setIsActiveDraft}
					enabledFeaturesDraft={enabledFeaturesDraft}
					onToggleFeature={(key) => {
						setEnabledFeaturesDraft((current) =>
							current.includes(key)
								? current.filter((f) => f !== key)
								: [...current, key],
						);
					}}
					staffRoutingDraft={staffRoutingDraft}
					onStaffRoutingChange={setStaffRoutingDraft}
					staffOptions={staffOptions}
				/>

				{/* Нижняя панель действий и Telegram Bot справочник */}
				<WhatsappActionsBar
					dirty={dirty}
					cleanSavedNotice={cleanSavedNotice}
					loading={loading}
					canSave={canSave}
					saveState={saveState}
					saveError={saveError}
					onReload={onReload}
					onSave={onSave}
				/>
			</div>
		</section>
	);
}
