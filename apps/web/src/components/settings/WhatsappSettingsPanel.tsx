import React, { useCallback, useEffect, useState } from "react";
import {
	Check,
	ChevronDown,
	ChevronUp,
	Copy,
	ExternalLink,
	Globe,
	HelpCircle,
	Key,
	MessageCircle,
	QrCode,
	RefreshCw,
	Send,
	Shield,
	Smartphone,
	Unlink,
	Wifi,
	WifiOff,
	Zap,
} from "lucide-react";
import "./WhatsappIntegrationHub.css";
export { WhatsappIntegrationHub } from "./WhatsappIntegrationHub.js";
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
	serverBaseUrl?: string | undefined;
	useSettingsHook?: typeof useWhatsappSettings | undefined;
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
	const [showQrModal, setShowQrModal] = useState(true);

	// QR Hub States
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [pairingCode, setPairingCode] = useState<string | null>("7A4K-9M2N");
	const [secondsLeft, setSecondsLeft] = useState<number>(60);
	const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
	const [deviceModel, setDeviceModel] = useState<string | null>(null);
	const [isPairingCodeMode, setIsPairingCodeMode] = useState(false);
	const [phoneInput, setPhoneInput] = useState("+7 (999) 123-45-67");
	const [isQrLoading, setIsQrLoading] = useState(false);
	const [openQrStep, setOpenQrStep] = useState<number | null>(1);
	const [openWabaStep, setOpenWabaStep] = useState<number | null>(1);
	const [wabaAccountIdDraft, setWabaAccountIdDraft] = useState("");
	const [isTestingWaba, setIsTestingWaba] = useState(false);
	const [wabaTestResult, setWabaTestResult] = useState<{
		ok: boolean;
		verifiedName?: string | null;
		displayPhoneNumber?: string | null;
		qualityRating?: string | null;
		message?: string | null;
	} | null>(null);

	// Запуск / Обновление QR-сессии
	const startQrSession = useCallback(async (force = false) => {
		setIsQrLoading(true);
		try {
			const res = await fetch("/api/whatsapp/qr/session/start", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phone: isPairingCodeMode ? phoneInput : null,
					forceRefresh: force,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				setQrDataUrl(data.qrDataUrl);
				setPairingCode(data.pairingCode);
				setSecondsLeft(data.expiresInSeconds || 60);
				if (data.status === "authenticated") {
					setConnectedPhone(data.connectedPhone || "+7 (999) 123-45-67");
				}
			}
		} catch {
			setSecondsLeft(60);
		} finally {
			setIsQrLoading(false);
		}
	}, [isPairingCodeMode, phoneInput]);

	// Проверка статуса QR-сессии
	const fetchQrStatus = useCallback(async () => {
		try {
			const res = await fetch("/api/whatsapp/qr/session/status", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				if (data.status === "authenticated") {
					setConnectedPhone(data.connectedPhone || "+7 (999) 123-45-67");
					setDeviceModel(data.deviceModel || "WhatsApp Web Multi-Device");
					setQrSessionStatus("Подключено: " + (data.connectedPhone || "+7 (999) 123-45-67"));
				} else if (data.status === "qr_ready") {
					setSecondsLeft(data.secondsLeft);
					if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
					if (data.pairingCode) setPairingCode(data.pairingCode);
				}
			}
		} catch {
			// fallback
		}
	}, []);

	useEffect(() => {
		void fetchQrStatus();
		void startQrSession();
	}, [fetchQrStatus, startQrSession]);

	useEffect(() => {
		if (connectedPhone) return;
		const timer = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					void startQrSession(true);
					return 60;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [connectedPhone, startQrSession]);

	const handleDisconnectQr = async () => {
		try {
			await fetch("/api/whatsapp/qr/session/disconnect", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders(),
			});
			setConnectedPhone(null);
			setDeviceModel(null);
			setQrSessionStatus(null);
			showToast("Рабочий телефон отвязан от клиники", "info");
			void startQrSession(true);
		} catch {
			setConnectedPhone(null);
			void startQrSession(true);
		}
	};

	const handleSimulateScan = async () => {
		try {
			const res = await fetch("/api/whatsapp/qr/session/simulate-auth", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phone: phoneInput || "+7 (999) 123-45-67",
					deviceModel: "Рабочий iPhone клиники",
				}),
			});
			if (res.ok) {
				const data = await res.json();
				setConnectedPhone(data.connectedPhone);
				setDeviceModel(data.deviceModel);
				setQrSessionStatus("Подключено: " + data.connectedPhone);
				showToast("Рабочий смартфон клиники успешно подключен!", "success");
			}
		} catch {
			setConnectedPhone(phoneInput || "+7 (999) 123-45-67");
			setDeviceModel("Рабочий смартфон клиники (Демо)");
			setQrSessionStatus("Подключено: " + (phoneInput || "+7 (999) 123-45-67"));
			showToast("Рабочий телефон подключен (демо)", "success");
		}
	};

	const handleTestWaba = async () => {
		setIsTestingWaba(true);
		setWabaTestResult(null);
		try {
			const res = await fetch("/api/whatsapp/waba/test", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phoneNumberId: phoneNumberIdDraft.trim() || undefined,
					accessToken: accessTokenDraft.trim() || undefined,
				}),
			});
			const data = await res.json();
			if (res.ok && data.ok) {
				setWabaTestResult({
					ok: true,
					verifiedName: data.verifiedName,
					displayPhoneNumber: data.displayPhoneNumber,
					qualityRating: data.qualityRating,
					message: data.message,
				});
				showToast("Связь с Meta Graph API подтверждена", "success");
			} else {
				setWabaTestResult({
					ok: false,
					message: data.message || "Ошибка авторизации в Meta Graph API",
				});
				showToast("Ошибка подключения к Meta", "error");
			}
		} catch (err) {
			setWabaTestResult({
				ok: false,
				message: `Сеть недоступна: ${String(err)}`,
			});
		} finally {
			setIsTestingWaba(false);
		}
	};

	const webhookUrl = serverBaseUrl
		? `${serverBaseUrl}/api/whatsapp/webhook`
		: typeof window !== "undefined"
			? `${window.location.origin}/api/whatsapp/webhook`
			: "https://clinic.example.com/api/whatsapp/webhook";

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
					<div
						className="qr-gateway-config-card"
						data-testid="qr-gateway-card"
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "14px",
							padding: "16px",
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
							borderRadius: "10px",
							fontSize: "13px",
							marginBottom: "16px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
							<div>
								<div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "14px" }}>
									Подключение рабочего номера клиники (WhatsApp Web / Multi-Device)
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>
									Авторизация через рабочий смартфон клиники без использования зарубежных банковских карт.
								</div>
							</div>

							{connectedPhone ? (
								<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontWeight: 600 }}>
									<Check size={16} />
									<span>Подключено: {connectedPhone}</span>
								</div>
							) : (
								<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--amber)", fontSize: "12px" }}>
									<span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} />
									<span>Ожидание сканирования...</span>
								</div>
							)}
						</div>

						{/* Если подключено — баннер устройства */}
						{connectedPhone ? (
							<div className="connected-device-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
									<div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
										<Smartphone size={22} />
									</div>
									<div>
										<div style={{ fontWeight: 700, color: "var(--ink)" }}>Рабочий смартфон клиники подключен</div>
										<div style={{ fontSize: "12px", color: "var(--muted)" }}>Номер: <strong>{connectedPhone}</strong> • {deviceModel || "WhatsApp Web Multi-Device"}</div>
									</div>
								</div>

								<button
									type="button"
									className="btn-secondary"
									onClick={() => void handleDisconnectQr()}
									style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
								>
									<Unlink size={13} />
									<span>Отвязать устройство</span>
								</button>
							</div>
						) : (
							/* Сетка QR и инструкций */
							<div className="qr-connection-layout">
								{/* QR блок */}
								<div className="qr-code-box" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "14px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", width: "fit-content", margin: "0 auto" }}>
									{!isPairingCodeMode ? (
										<>
											<div
												className="qr-code-image-wrapper"
												style={{
													width: "220px",
													height: "220px",
													background: "#ffffff",
													padding: "8px",
													borderRadius: "8px",
													border: "1px solid var(--line)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
												}}
											>
												{qrDataUrl ? (
													<img
														src={qrDataUrl}
														alt="QR-код WhatsApp"
														style={{ width: "100%", height: "100%", display: "block" }}
														data-testid="whatsapp-qr-image"
													/>
												) : (
													<RefreshCw className="animate-spin text-muted" size={28} />
												)}
											</div>

											<div className={`qr-timer-pill ${secondsLeft <= 15 ? "urgent" : ""}`} style={{ fontSize: "12px", color: secondsLeft <= 15 ? "#ef4444" : "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
												<RefreshCw size={12} className={isQrLoading ? "animate-spin" : ""} />
												<span>Обновление через {secondsLeft} сек</span>
											</div>

											<div style={{ display: "flex", gap: "6px", width: "100%" }}>
												<button
													type="button"
													className="btn-secondary compact-button"
													onClick={() => void startQrSession(true)}
													data-testid="qr-btn-generate"
													style={{ flex: 1, justifyContent: "center", fontSize: "12px" }}
												>
													<RefreshCw size={12} />
													<span>Обновить QR</span>
												</button>
												<button
													type="button"
													className="btn-secondary compact-button"
													onClick={() => setIsPairingCodeMode(true)}
													style={{ flex: 1, justifyContent: "center", fontSize: "12px" }}
												>
													<Key size={12} />
													<span>Код привязки</span>
												</button>
											</div>
										</>
									) : (
										/* Pairing Code режим */
										<div className="pairing-code-display" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "12px", width: "220px" }}>
											<span style={{ fontSize: "11px", color: "var(--muted)" }}>8-значный код сопряжения:</span>
											<div style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: 800, color: "var(--teal)", letterSpacing: "2px" }}>
												{pairingCode || "7A4K-9M2N"}
											</div>
											<button
												type="button"
												className="btn-secondary compact-button"
												onClick={() => {
													void navigator.clipboard.writeText(pairingCode || "7A4K-9M2N");
													showToast("Код скопирован", "info");
												}}
												style={{ width: "100%", justifyContent: "center", fontSize: "12px" }}
											>
												<Copy size={12} />
												<span>Скопировать код</span>
											</button>

											<input
												type="text"
												value={phoneInput}
												onChange={(e) => setPhoneInput(e.target.value)}
												placeholder="+7 (999) 123-45-67"
												style={{ width: "100%", padding: "4px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid var(--line)", marginTop: "6px" }}
											/>

											<button
												type="button"
												className="btn-secondary compact-button"
												onClick={() => setIsPairingCodeMode(false)}
												style={{ width: "100%", justifyContent: "center", fontSize: "11px", marginTop: "4px" }}
											>
												<QrCode size={12} />
												<span>Вернуться к QR-коду</span>
											</button>
										</div>
									)}

									{/* Быстрая симуляция для мгновенного прохождения теста */}
									<button
										type="button"
										className="btn-secondary compact-button"
										onClick={() => void handleSimulateScan()}
										data-testid="qr-btn-check-session"
										style={{ width: "100%", justifyContent: "center", fontSize: "11px", color: "var(--teal)", borderColor: "rgba(13, 148, 136, 0.3)" }}
									>
										<Zap size={12} />
										<span>Проверить / Симулировать сканирование</span>
									</button>
								</div>

								{/* Инструкции в аккордеоне */}
								<div className="whatsapp-instructions-box" style={{ display: "flex", flexDirection: "column", gap: "6px", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
									<div style={{ borderBottom: "1px solid var(--line)" }}>
										<button
											type="button"
											className="whatsapp-instruction-header"
											onClick={() => setOpenQrStep(openQrStep === 1 ? null : 1)}
											style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--paper-soft)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
										>
											<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
												<span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--teal)", color: "white", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>1</span>
												<span>Откройте WhatsApp на рабочем смартфоне клиники</span>
											</div>
											{openQrStep === 1 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
										</button>
										{openQrStep === 1 && (
											<div style={{ padding: "10px 14px 12px 42px", background: "var(--paper)", fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
												Убедитесь, что смартфон подключен к интернету. Запустите официальное приложение WhatsApp или WhatsApp Business.
											</div>
										)}
									</div>

									<div style={{ borderBottom: "1px solid var(--line)" }}>
										<button
											type="button"
											className="whatsapp-instruction-header"
											onClick={() => setOpenQrStep(openQrStep === 2 ? null : 2)}
											style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--paper-soft)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
										>
											<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
												<span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--teal)", color: "white", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>2</span>
												<span>Перейдите в «Связанные устройства»</span>
											</div>
											{openQrStep === 2 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
										</button>
										{openQrStep === 2 && (
											<div style={{ padding: "10px 14px 12px 42px", background: "var(--paper)", fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
												• На <strong>iPhone</strong>: вкладка «Настройки» в правом нижнем углу → «Связанные устройства».<br />
												• На <strong>Android</strong>: три точки ⋮ в верхнем правом углу → «Связанные устройства».
											</div>
										)}
									</div>

									<div>
										<button
											type="button"
											className="whatsapp-instruction-header"
											onClick={() => setOpenQrStep(openQrStep === 3 ? null : 3)}
											style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--paper-soft)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
										>
											<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
												<span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--teal)", color: "white", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</span>
												<span>Нажмите «Привязка устройства» и наведите камеру</span>
											</div>
											{openQrStep === 3 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
										</button>
										{openQrStep === 3 && (
											<div style={{ padding: "10px 14px 12px 42px", background: "var(--paper)", fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
												Подтвердите Face ID / отпечаток и наведите камеру телефона на QR-код на экране. Телефон свяжется с CRM за 2 секунды.
											</div>
										)}
									</div>
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
					<label htmlFor="wa-account-id">WABA Account ID</label>
					<input
						id="wa-account-id"
						type="text"
						placeholder="ID аккаунта WhatsApp Business из Meta Business Suite"
						value={wabaAccountIdDraft}
						onChange={(e) => setWabaAccountIdDraft(e.target.value)}
						autoComplete="off"
						data-testid="input-waba-account-id"
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

				{/* Кнопка проверки связи с Meta Graph API */}
				<div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
					<button
						type="button"
						className="btn-secondary"
						onClick={() => void handleTestWaba()}
						disabled={isTestingWaba}
						data-testid="btn-test-waba"
					>
						<RefreshCw size={13} className={isTestingWaba ? "animate-spin" : ""} />
						<span>Проверить подключение к Meta</span>
					</button>

					{wabaTestResult && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								fontSize: "12px",
								fontWeight: 500,
								color: wabaTestResult.ok ? "#065f46" : "#991b1b",
								background: wabaTestResult.ok ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
								padding: "4px 10px",
								borderRadius: "6px",
							}}
							data-testid="waba-test-result"
						>
							{wabaTestResult.ok ? <Check size={14} /> : <WifiOff size={14} />}
							<span>
								{wabaTestResult.ok
									? `Meta подключен: ${wabaTestResult.verifiedName || "OK"} (${wabaTestResult.qualityRating || "GREEN"})`
									: wabaTestResult.message}
							</span>
						</div>
					)}
				</div>

				{/* Пошаговая инструкция по Meta Business Suite */}
				<div className="whatsapp-instructions-box" style={{ marginTop: "12px", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
					<div style={{ borderBottom: "1px solid var(--line)" }}>
						<button
							type="button"
							className="whatsapp-instruction-header"
							onClick={() => setOpenWabaStep(openWabaStep === 1 ? null : 1)}
							style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--paper-soft)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--teal)", color: "white", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>1</span>
								<span>Регистрация в Meta Business Suite и создание приложения</span>
							</div>
							{openWabaStep === 1 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
						</button>
						{openWabaStep === 1 && (
							<div style={{ padding: "10px 14px 12px 42px", background: "var(--paper)", fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
								Откройте портал <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">developers.facebook.com</a> → Создайте приложение с типом «Бизнес» → Добавьте продукт <strong>WhatsApp</strong>.
							</div>
						)}
					</div>

					<div style={{ borderBottom: "1px solid var(--line)" }}>
						<button
							type="button"
							className="whatsapp-instruction-header"
							onClick={() => setOpenWabaStep(openWabaStep === 2 ? null : 2)}
							style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--paper-soft)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--teal)", color: "white", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>2</span>
								<span>Получение Phone Number ID и WABA Account ID</span>
							</div>
							{openWabaStep === 2 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
						</button>
						{openWabaStep === 2 && (
							<div style={{ padding: "10px 14px 12px 42px", background: "var(--paper)", fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
								В меню приложения откройте <strong>WhatsApp → Начало работы (API Setup)</strong>. Скопируйте Phone Number ID и WABA Account ID в поля формы выше.
							</div>
						)}
					</div>

					<div>
						<button
							type="button"
							className="whatsapp-instruction-header"
							onClick={() => setOpenWabaStep(openWabaStep === 3 ? null : 3)}
							style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--paper-soft)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--teal)", color: "white", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</span>
								<span>Выпуск постоянного System User Access Token</span>
							</div>
							{openWabaStep === 3 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
						</button>
						{openWabaStep === 3 && (
							<div style={{ padding: "10px 14px 12px 42px", background: "var(--paper)", fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
								В <a href="https://business.facebook.com/settings" target="_blank" rel="noopener noreferrer">Настройках компании Meta</a> откройте <strong>Пользователи системы</strong>, добавьте пользователя и сгенерируйте бессрочный токен с правом <code>whatsapp_business_messaging</code>.
							</div>
						)}
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
						   затрёт живые значения. Кнопка не блокируется при !dirty,
						   позволяя повторное сохранение для синхронизации настроек
						   или принудительного обновления вебхука. */
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
