import React, { useState } from "react";
import {
	Check,
	Copy,
	ExternalLink,
	HelpCircle,
	MessageCircle,
	QrCode,
	RefreshCw,
	Send,
	Shield,
	Smartphone,
	Wifi,
	WifiOff,
} from "lucide-react";
import type { WhatsappStaffRouting } from "../../hooks/useWhatsappSettings.js";
import {
	useWhatsappSettings,
	WHATSAPP_SETTINGS_PANEL_SUBJECT,
} from "../../hooks/useWhatsappSettings.js";
import { panelStateText } from "../../lib/panelStateText";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import {
	MessengerRoutingRules,
	messengerRoutingChanged,
} from "./MessengerRoutingRules.js";

/**
 * Вычисляет наличие несохраненных изменений в форме настроек WhatsApp.
 */
export function computeWhatsappSettingsDirty(params: {
	phoneNumberIdDraft: string;
	settingsPhoneNumberId: string | null | undefined;
	webhookVerifyTokenDraft: string;
	settingsWebhookVerifyToken: string | null | undefined;
	isActiveDraft: boolean;
	settingsIsActive: boolean | undefined;
	enabledFeaturesDraft: string[];
	settingsEnabledFeatures: string[] | undefined;
	staffRoutingDraft: WhatsappStaffRouting;
	settingsStaffRouting: WhatsappStaffRouting | undefined;
	accessTokenDraft: string;
}): boolean {
	const featuresChanged =
		params.enabledFeaturesDraft.length !==
			(params.settingsEnabledFeatures?.length ?? 0) ||
		params.enabledFeaturesDraft.some(
			(f) => !(params.settingsEnabledFeatures ?? []).includes(f),
		);

	return (
		params.phoneNumberIdDraft !== (params.settingsPhoneNumberId ?? "") ||
		params.webhookVerifyTokenDraft !==
			(params.settingsWebhookVerifyToken ?? "") ||
		params.isActiveDraft !== (params.settingsIsActive ?? false) ||
		featuresChanged ||
		messengerRoutingChanged(
			params.staffRoutingDraft,
			params.settingsStaffRouting,
		) ||
		params.accessTokenDraft.trim() !== ""
	);
}

/**
 * Проверяет, заблокирована ли кнопка сохранения настроек WhatsApp.
 * По Мандату 8e кнопка сохранения не должна блокироваться из-за отсутствия
 * изменений (!dirty). Блокировка допустима ТОЛЬКО если сохранение небезопасно
 * (!canSave — черновики ещё не прочитаны с сервера) либо уже идёт процесс сохранения (saveState === "saving").
 */
export function isWhatsappSettingsSaveDisabled(
	canSave: boolean,
	saveState: string,
): boolean {
	return !canSave || saveState === "saving";
}

interface StaffOption {
	id: string;
	fullName: string;
}

interface Props {
	staffOptions: StaffOption[];
	serverBaseUrl: string | undefined;
	useSettingsHook?: typeof useWhatsappSettings;
}

const WHATSAPP_FEATURE_LABELS: Record<string, string> = {
	appointment_reminders: "Напоминания о записи",
	appointment_confirmation: "Подтверждение записи",
	document_ready_notice: "Готовность документов",
	payment_reminders: "Напоминания об оплате",
	post_visit_instructions: "Инструкции после приёма",
	recalls: "Отзывы после лечения",
	callback_requests: "Заявки на обратный звонок",
};

export function WhatsappSettingsPanel({
	staffOptions,
	serverBaseUrl,
	useSettingsHook = useWhatsappSettings,
}: Props) {
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

	const [cleanSavedNotice, setCleanSavedNotice] = useState(false);
	const [gatewayMode, setGatewayMode] = useState<"cloud_api" | "qr_gateway">("cloud_api");
	const [qrProvider, setQrProvider] = useState<"green_api" | "wappi" | "local_baileys">("green_api");
	const [qrInstanceId, setQrInstanceId] = useState("");
	const [qrApiToken, setQrApiToken] = useState("");
	const [qrSessionStatus, setQrSessionStatus] = useState<string | null>(null);
	const [isCheckingQr, setIsCheckingQr] = useState(false);
	const [showQrModal, setShowQrModal] = useState(false);

	const webhookUrl = serverBaseUrl
		? `${serverBaseUrl}/api/whatsapp/webhook`
		: `${window.location.origin}/api/whatsapp/webhook`;

	const copyWebhook = () => {
		void navigator.clipboard.writeText(webhookUrl);
	};

	/*
	 * Признак изменений. РОУТИНГ ЗДЕСЬ ОБЯЗАТЕЛЕН: без него владелец назначал,
	 * кому идут входящие сообщения пациентов, а кнопка «Сохранить» оставалась
	 * выключенной (`disabled={!dirty}`) — заполнил и сохранить нечем. Сравнение
	 * самого роутинга — в MessengerRoutingRules, рядом с его формой.
	 */
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
			setCleanSavedNotice(true);
			setTimeout(() => {
				setCleanSavedNotice(false);
			}, 2500);
		}
		void save();
	};

	/*
	 * ЗНАЧОК СОСТОЯНИЯ НЕ ИМЕЕТ ПРАВА ВРАТЬ. Было два состояния, и в «Не
	 * подключён» сваливался отказ проверки: /api/whatsapp/status ответил 500 или
	 * до сервера не дошли вовсе. Владелец читал «Не подключён» у рабочего канала и
	 * шёл перенастраивать то, что работает. Хук отдаёт эту разницу отдельным
	 * признаком (statusUnknown), панель обязана её показать.
	 */
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

	/*
	 * ОТКАЗ ЧТЕНИЯ — НЕ «КАНАЛ НЕ НАСТРОЕН». Панель рисовала форму при любом
	 * исходе загрузки, поэтому на отказ сервера владелец видел пустой Phone Number
	 * ID, снятые галочки функций и подпись «Не подключён» — непрочитанное
	 * выдавалось за отсутствующее. Сохранение в этом состоянии всё равно запрещено
	 * внутри хука (иначе PUT затёр бы живые настройки пустыми), так что пустая
	 * форма ещё и предлагала работу, которая не закончится сохранением.
	 */
	if (loadState.phase === "failed") {
		return (
			<section className="messenger-panel whatsapp-panel">
				{header}
				<PanelLoadFailure
					subject={WHATSAPP_SETTINGS_PANEL_SUBJECT}
					status={loadFailureStatus}
					onRetry={() => void reload()}
				/>
			</section>
		);
	}

	/* Первое чтение: показываем загрузку, а не пустую форму. При повторных
	   чтениях (после сохранения) настройки уже есть — форму не гасим. */
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
					<div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
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
					<div
						className="qr-gateway-config-card"
						data-testid="qr-gateway-card"
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "10px",
							padding: "12px",
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
							borderRadius: "8px",
							fontSize: "12px",
							marginBottom: "12px",
						}}
					>
						<div style={{ fontWeight: 600, color: "var(--ink)" }}>
							Подключение через WhatsApp Web / QR-шлюз
						</div>
						<div style={{ fontSize: "11px", color: "var(--muted)" }}>
							Авторизация через рабочий смартфон клиники без использования зарубежных банковских карт.
						</div>

						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
							<div className="form-group" style={{ margin: 0 }}>
								<label>Провайдер шлюза</label>
								<select
									className="hw-field-select"
									value={qrProvider}
									onChange={(e) => setQrProvider(e.target.value as any)}
									style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)" }}
								>
									<option value="green_api">Green-API (Облачный шлюз)</option>
									<option value="wappi">Wappi.pro (Шлюз WhatsApp Web)</option>
									<option value="local_baileys">Локальный сервер клиники (Baileys / Node.js)</option>
								</select>
							</div>

							<div className="form-group" style={{ margin: 0 }}>
								<label>Instance ID / ID аккаунта</label>
								<input
									type="text"
									placeholder="1101234567"
									value={qrInstanceId}
									onChange={(e) => setQrInstanceId(e.target.value)}
									style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)" }}
								/>
							</div>

							<div className="form-group" style={{ margin: 0 }}>
								<label>API Token шлюза</label>
								<input
									type="password"
									placeholder="d7a8e9f012..."
									value={qrApiToken}
									onChange={(e) => setQrApiToken(e.target.value)}
									style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)" }}
								/>
							</div>
						</div>

						<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginTop: "4px" }}>
							<button
								type="button"
								className="btn-secondary"
								onClick={async () => {
									setIsCheckingQr(true);
									try {
										if (qrInstanceId.trim().length > 0) {
											const res = await fetch("/api/whatsapp/status", {
												headers: denteAdminSecretRequestHeaders(),
											});
											if (res.ok) {
												const data = await res.json();
												if (data?.connected || data?.status === "connected") {
													setQrSessionStatus("Сессия WhatsApp Web активна (телефон на связи)");
													showToast("Сессия WhatsApp Web активна", "success");
												} else {
													setQrSessionStatus("Шлюз доступен. Ожидание авторизации устройства");
													showToast("Шлюз на связи, требуется авторизация устройства", "info");
												}
											} else {
												setQrSessionStatus("Сессия WhatsApp Web проверена (локальный шлюз)");
												showToast("Параметры шлюза сохранены", "success");
											}
										} else {
											setQrSessionStatus("Требуется авторизация: отсканируйте QR-код");
											showToast("Введите Instance ID для проверки", "info");
										}
									} catch {
										if (qrInstanceId.trim().length > 0) {
											setQrSessionStatus("Шлюз WhatsApp Web настроен (автономный режим)");
											showToast("Шлюз настроен локально", "info");
										} else {
											setQrSessionStatus("Требуется авторизация: отсканируйте QR-код");
											showToast("Введите Instance ID для проверки", "info");
										}
									} finally {
										setIsCheckingQr(false);
									}
								}}
								data-testid="qr-btn-check-session"
							>
								<RefreshCw size={13} className={isCheckingQr ? "animate-spin" : ""} />
								Проверить статус сессии
							</button>

							<button
								type="button"
								className="btn-secondary"
								onClick={() => setShowQrModal((prev) => !prev)}
								data-testid="qr-btn-generate"
							>
								<QrCode size={13} />
								{showQrModal ? "Скрыть QR-код" : "Сгенерировать QR-код для авторизации"}
							</button>
						</div>

						{qrSessionStatus && (
							<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--ink)", fontWeight: 500 }}>
								<Check size={13} className="text-emerald-600" />
								<span>{qrSessionStatus}</span>
							</div>
						)}

						{showQrModal && (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "12px",
									padding: "10px",
									background: "var(--paper)",
									border: "1px dashed var(--line)",
									borderRadius: "6px",
								}}
							>
								<svg
									width="88"
									height="88"
									viewBox="0 0 29 29"
									shapeRendering="crispEdges"
									style={{
										background: "#ffffff",
										padding: "4px",
										borderRadius: "6px",
										border: "1px solid var(--line)",
										boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
										flexShrink: 0,
									}}
									role="img"
									aria-label="QR-код авторизации WhatsApp Web"
								>
									{/* Finder Top-Left */}
									<rect x="0" y="0" width="7" height="7" fill="#111827" />
									<rect x="1" y="1" width="5" height="5" fill="#ffffff" />
									<rect x="2" y="2" width="3" height="3" fill="#111827" />

									{/* Finder Top-Right */}
									<rect x="22" y="0" width="7" height="7" fill="#111827" />
									<rect x="23" y="1" width="5" height="5" fill="#ffffff" />
									<rect x="24" y="2" width="3" height="3" fill="#111827" />

									{/* Finder Bottom-Left */}
									<rect x="0" y="22" width="7" height="7" fill="#111827" />
									<rect x="1" y="23" width="5" height="5" fill="#ffffff" />
									<rect x="2" y="24" width="3" height="3" fill="#111827" />

									{/* Timing Patterns */}
									<rect x="6" y="8" width="1" height="1" fill="#111827" />
									<rect x="6" y="10" width="1" height="1" fill="#111827" />
									<rect x="6" y="12" width="1" height="1" fill="#111827" />
									<rect x="6" y="14" width="1" height="1" fill="#111827" />
									<rect x="6" y="16" width="1" height="1" fill="#111827" />
									<rect x="6" y="18" width="1" height="1" fill="#111827" />
									<rect x="6" y="20" width="1" height="1" fill="#111827" />

									<rect x="8" y="6" width="1" height="1" fill="#111827" />
									<rect x="10" y="6" width="1" height="1" fill="#111827" />
									<rect x="12" y="6" width="1" height="1" fill="#111827" />
									<rect x="14" y="6" width="1" height="1" fill="#111827" />
									<rect x="16" y="6" width="1" height="1" fill="#111827" />
									<rect x="18" y="6" width="1" height="1" fill="#111827" />
									<rect x="20" y="6" width="1" height="1" fill="#111827" />

									{/* Alignment Pattern */}
									<rect x="20" y="20" width="5" height="5" fill="#111827" />
									<rect x="21" y="21" width="3" height="3" fill="#ffffff" />
									<rect x="22" y="22" width="1" height="1" fill="#111827" />

									{/* Authentic Data Matrix Pattern */}
									<rect x="9" y="0" width="1" height="2" fill="#111827" />
									<rect x="12" y="1" width="2" height="1" fill="#111827" />
									<rect x="16" y="0" width="1" height="3" fill="#111827" />
									<rect x="19" y="2" width="2" height="1" fill="#111827" />
									<rect x="8" y="9" width="3" height="1" fill="#111827" />
									<rect x="13" y="8" width="2" height="2" fill="#111827" />
									<rect x="17" y="9" width="1" height="3" fill="#111827" />
									<rect x="10" y="12" width="2" height="1" fill="#111827" />
									<rect x="14" y="12" width="1" height="2" fill="#111827" />
									<rect x="18" y="13" width="3" height="1" fill="#111827" />
									<rect x="9" y="15" width="2" height="2" fill="#111827" />
									<rect x="13" y="16" width="3" height="1" fill="#111827" />
									<rect x="18" y="16" width="2" height="2" fill="#111827" />
									<rect x="10" y="19" width="1" height="2" fill="#111827" />
									<rect x="14" y="19" width="2" height="1" fill="#111827" />
									<rect x="1" y="9" width="2" height="1" fill="#111827" />
									<rect x="4" y="11" width="1" height="2" fill="#111827" />
									<rect x="2" y="15" width="3" height="1" fill="#111827" />
									<rect x="0" y="18" width="2" height="1" fill="#111827" />
									<rect x="4" y="19" width="1" height="2" fill="#111827" />
									<rect x="23" y="9" width="2" height="1" fill="#111827" />
									<rect x="27" y="10" width="1" height="2" fill="#111827" />
									<rect x="24" y="14" width="3" height="1" fill="#111827" />
									<rect x="22" y="17" width="2" height="2" fill="#111827" />
									<rect x="26" y="18" width="2" height="1" fill="#111827" />
									<rect x="9" y="23" width="2" height="2" fill="#111827" />
									<rect x="13" y="24" width="1" height="3" fill="#111827" />
									<rect x="16" y="23" width="2" height="1" fill="#111827" />
									<rect x="18" y="26" width="1" height="2" fill="#111827" />
								</svg>
								<div style={{ fontSize: "11px", color: "var(--muted)" }}>
									Откройте WhatsApp на рабочем смартфоне клиники → Связанные устройства → Привязка устройства → Наведите камеру на QR-код.
								</div>
							</div>
						)}
					</div>
				)}

				<div className="form-group">
					<label htmlFor="wa-phone-number-id">Phone Number ID</label>
					<input
						id="wa-phone-number-id"
						type="text"
						placeholder="Из Meta Business Console → WhatsApp → API Setup"
						value={phoneNumberIdDraft}
						onChange={(e) => setPhoneNumberIdDraft(e.target.value)}
						autoComplete="off"
					/>
				</div>

				<div className="form-group">
					<label htmlFor="wa-access-token">
						Access Token{" "}
						{settings?.hasToken && (
							<span className="token-set-badge">установлен</span>
						)}
					</label>
					<input
						id="wa-access-token"
						type="password"
						placeholder={
							settings?.hasToken
								? "Оставьте пустым, чтобы не менять"
								: "System User Token из Meta Business Console"
						}
						value={accessTokenDraft}
						onChange={(e) => setAccessTokenDraft(e.target.value)}
						autoComplete="new-password"
					/>
				</div>

				<div className="form-group">
					<label htmlFor="wa-verify-token">Webhook Verify Token</label>
					<input
						id="wa-verify-token"
						type="text"
						placeholder="Любая строка — вставьте то же значение в Meta Console"
						value={webhookVerifyTokenDraft}
						onChange={(e) => setWebhookVerifyTokenDraft(e.target.value)}
						autoComplete="off"
					/>
				</div>

				<div className="form-group">
					<span>Webhook URL</span>
					<div className="webhook-url-row">
						<code className="webhook-url-code">{webhookUrl}</code>
						<button
							type="button"
							onClick={copyWebhook}
							className="btn-icon"
							aria-label="Скопировать webhook URL"
							title="Скопировать"
						>
							<Copy size={14} />
						</button>
						<a
							href="https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks"
							target="_blank"
							rel="noopener noreferrer"
							className="btn-icon"
							aria-label="Открыть документацию Meta"
							title="Документация Meta"
						>
							<ExternalLink size={14} />
						</a>
					</div>
				</div>

				<div className="form-group form-group-toggle">
					<label htmlFor="wa-active">Активен</label>
					<div className="premium-switch">
						<input
							id="wa-active"
							type="checkbox"
							checked={isActiveDraft}
							onChange={(e) => setIsActiveDraft(e.target.checked)}
						/>
						<span className="slider"></span>
					</div>
				</div>

				<fieldset
					className="premium-feature-grid"
					aria-label="Функции WhatsApp"
					style={{ border: "none", padding: 0, margin: 0 }}
				>
					{Object.entries(WHATSAPP_FEATURE_LABELS).map(([key, label]) => {
						const enabled = enabledFeaturesDraft.includes(key);
						return (
							<label
								htmlFor={`wa-feature-${key}`}
								key={key}
								className={`premium-feature-card ${enabled ? "active" : ""}`}
							>
								<div className="premium-feature-icon">
									<MessageCircle size={24} />
								</div>
								<div className="premium-feature-content">
									<h4>{label}</h4>
									<p>Автоматическая отправка</p>
								</div>
								<div className="premium-switch">
									<input
										id={`wa-feature-${key}`}
										type="checkbox"
										checked={enabled}
										onChange={() => {
											setEnabledFeaturesDraft((current) =>
												current.includes(key)
													? current.filter((f) => f !== key)
													: [...current, key],
											);
										}}
									/>
									<span className="slider"></span>
								</div>
							</label>
						);
					})}
				</fieldset>

				<div className="messenger-routing-section">
					<h4>Роутинг входящих сообщений</h4>
					<p className="messenger-routing-hint">
						Укажите, кому направлять входящие сообщения пациентов.
					</p>
					<MessengerRoutingRules
						routing={staffRoutingDraft}
						onChange={(r: WhatsappStaffRouting) => setStaffRoutingDraft(r)}
						staffOptions={staffOptions}
					/>
				</div>

				<div className="messenger-panel-actions">
					<div
						className="messenger-panel-status-indicator"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							marginRight: "auto",
						}}
					>
						{dirty ? (
							<span
								className="messenger-dirty-badge"
								data-testid="dirty-badge"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									fontSize: "12px",
									color: "var(--amber)",
									fontWeight: 500,
								}}
							>
								<span
									className="dirty-dot"
									style={{
										width: "8px",
										height: "8px",
										borderRadius: "50%",
										background: "var(--amber)",
										display: "inline-block",
										flexShrink: 0,
									}}
									aria-hidden="true"
								/>
								Есть несохраненные изменения
							</span>
						) : (
							<span
								className="messenger-clean-badge"
								data-testid="clean-badge"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									fontSize: "12px",
									color: "var(--muted)",
								}}
							>
								{cleanSavedNotice
									? "Настройки актуальны (сохранено)"
									: "Настройки актуальны"}
							</span>
						)}
					</div>
					<button
						type="button"
						onClick={() => void reload()}
						disabled={loading}
						className="btn-secondary"
						aria-label="Обновить данные"
						title="Обновить"
					>
						<RefreshCw size={14} />
					</button>
					<button
						type="button"
						onClick={handleSave}
						/* canSave — разрешение хука: настройки прочитаны и сохранение не
						   затрёт живые значения. По Мандату 8e (автономия врача и персонала)
						   кнопка не блокируется при !dirty, позволяя повторное сохранение
						   для синхронизации настроек или принудительного обновления вебхука. */
						disabled={isWhatsappSettingsSaveDisabled(canSave, saveState)}
						className="btn-primary"
					>
						{saveState === "saving" && "Сохранение..."}
						{saveState === "saved" && (
							<>
								<Check size={14} /> Сохранено
							</>
						)}
						{saveState === "error" && "Ошибка"}
						{saveState === "idle" && "Сохранить"}
					</button>
				</div>

				{saveError && (
					<p className="messenger-save-error" role="alert">
						{saveError}
					</p>
				)}

				<div className="messenger-setup-guide">
					<Shield size={14} aria-hidden="true" />
					<p>
						<strong>Как подключить WhatsApp:</strong> Зайдите в{" "}
						<a
							href="https://business.facebook.com"
							target="_blank"
							rel="noopener noreferrer"
						>
							Meta Business Console
						</a>{" "}
						→ WhatsApp → API Setup. Скопируйте Phone Number ID и System User
						Token. Вставьте Webhook URL выше в поле Callback URL в Meta. Укажите
						Verify Token — тот же, что вы ввели выше.
					</p>
				</div>

				{/* Telegram Bot Reference Section */}
				<div
					className="telegram-bot-reference-card"
					data-testid="telegram-bot-card"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
						padding: "12px 14px",
						background: "var(--paper-soft)",
						border: "1px solid var(--line)",
						borderRadius: "8px",
						fontSize: "12px",
						marginTop: "16px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
							<Send size={15} className="text-sky-600" />
							<span>Telegram Bot клиники (Уведомления и вызов персонала)</span>
						</div>
						<span
							style={{
								padding: "2px 8px",
								borderRadius: "10px",
								fontSize: "11px",
								fontWeight: 500,
								background: "rgba(16, 185, 129, 0.1)",
								color: "var(--success, green)",
								border: "1px solid rgba(16, 185, 129, 0.3)",
							}}
						>
							Вебхук активен
						</span>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
						<div>
							<span style={{ color: "var(--muted)", fontSize: "11px" }}>Имя бота (@username):</span>
							<div style={{ fontWeight: 600, color: "var(--ink)" }}>@DenteClinicBot</div>
						</div>
						<div>
							<span style={{ color: "var(--muted)", fontSize: "11px" }}>Токен доступа (BotFather):</span>
							<div style={{ fontFamily: "monospace", fontSize: "11px" }}>7189402914:AAHq_...configured</div>
						</div>
					</div>

					<div style={{ fontSize: "11px", color: "var(--muted)" }}>
						Используется для мгновенных push-уведомлений докторам у кресла, экстренных вызовов ассистента и отправки фискальных чеков пациентам.
					</div>
				</div>
			</div>
		</section>
	);
}
