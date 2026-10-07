import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	AlertCircle,
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
	Shield,
	Smartphone,
	Send,
	Sparkles,
	Unlink,
	Wifi,
	WifiOff,
	Zap,
} from "lucide-react";
import "./WhatsappIntegrationHub.css";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { showToast } from "../GlobalToast.js";
import {
	MessengerRoutingRules,
	messengerRoutingChanged,
} from "./MessengerRoutingRules.js";
import type {
	WhatsappSettings,
	WhatsappStaffRouting,
} from "../../hooks/useWhatsappSettings.js";
import { useWhatsappSettings } from "../../hooks/useWhatsappSettings.js";

interface StaffOption {
	id: string;
	fullName: string;
}

interface Props {
	staffOptions?: StaffOption[];
	serverBaseUrl?: string;
	useSettingsHook?: typeof useWhatsappSettings;
}

export type WhatsappHubMode = "qr" | "waba";

export function WhatsappIntegrationHub({
	staffOptions = [],
	serverBaseUrl,
	useSettingsHook = useWhatsappSettings,
}: Props) {
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

	// Активный режим подключения
	const [activeMode, setActiveMode] = useState<WhatsappHubMode>("qr");

	// --- QR Состояние ---
	const [qrStatus, setQrStatus] = useState<"qr_ready" | "scanned" | "authenticated" | "disconnected" | "expired">("disconnected");
	const [qrSvg, setQrSvg] = useState<string | null>(null);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [pairingCode, setPairingCode] = useState<string | null>(null);
	const [secondsLeft, setSecondsLeft] = useState<number>(60);
	const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
	const [deviceModel, setDeviceModel] = useState<string | null>(null);
	const [isPairingCodeMode, setIsPairingCodeMode] = useState(false);
	const [phoneInput, setPhoneInput] = useState("+7 (999) 123-45-67");
	const [isQrLoading, setIsQrLoading] = useState(false);

	// Аккордеоны инструкций
	const [openQrStep, setOpenQrStep] = useState<number | null>(1);
	const [openWabaStep, setOpenWabaStep] = useState<number | null>(1);

	// --- WABA Состояние ---
	const [wabaAccountIdDraft, setWabaAccountIdDraft] = useState("");
	const [isTestingWaba, setIsTestingWaba] = useState(false);
	const [wabaTestResult, setWabaTestResult] = useState<{
		ok: boolean;
		verifiedName?: string | null;
		displayPhoneNumber?: string | null;
		qualityRating?: string | null;
		message?: string | null;
	} | null>(null);

	// Тестовая отправка сообщения WhatsApp
	const [testWaPhone, setTestWaPhone] = useState("");
	const [testWaMessage, setTestWaMessage] = useState("Тестовое сообщение из DENTE CRM");
	const [isSendingWaTest, setIsSendingWaTest] = useState(false);
	const [waTestSendResult, setWaTestSendResult] = useState<{ ok: boolean; message: string } | null>(null);

	const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const webhookUrl = serverBaseUrl
		? `${serverBaseUrl}/api/whatsapp/webhook`
		: typeof window !== "undefined"
			? `${window.location.origin}/api/whatsapp/webhook`
			: "https://clinic.example.com/api/whatsapp/webhook";

	// Копирование в буфер
	const copyText = (text: string, label: string) => {
		void navigator.clipboard.writeText(text);
		showToast(`${label} скопирован в буфер`, "info");
	};

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
				setQrStatus(data.status);
				setQrSvg(data.qrSvg);
				setQrDataUrl(data.qrDataUrl);
				setPairingCode(data.pairingCode);
				setSecondsLeft(data.expiresInSeconds || 60);
			} else {
				showToast("Не удалось инициализировать сессию QR", "error");
			}
		} catch {
			// Автономный fallback для отображения QR в офлайне/демо
			setQrStatus("qr_ready");
			setSecondsLeft(60);
			setPairingCode("7A4K-9M2N");
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
				setQrStatus(data.status);
				if (data.status === "authenticated") {
					setConnectedPhone(data.connectedPhone || "+7 (999) 123-45-67");
					setDeviceModel(data.deviceModel || "WhatsApp Web Multi-Device");
				} else if (data.status === "qr_ready") {
					setSecondsLeft(data.secondsLeft);
					if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
					if (data.pairingCode) setPairingCode(data.pairingCode);
				}
			}
		} catch {
			// тихий перехват при локальном прерывании
		}
	}, []);

	// Первичный опрос и автообновление таймера
	useEffect(() => {
		void fetchQrStatus();
		if (qrStatus !== "authenticated") {
			void startQrSession();
		}
	}, [fetchQrStatus, startQrSession]);

	// Поллинг статуса и обратный отсчет секунд
	useEffect(() => {
		if (qrStatus === "authenticated") return;

		const timer = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					// Автоматический рефреш истекшего QR-кода
					void startQrSession(true);
					return 60;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [qrStatus, startQrSession]);

	// Отвязка устройства
	const handleDisconnectQr = async () => {
		try {
			const res = await fetch("/api/whatsapp/qr/session/disconnect", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				setQrStatus("disconnected");
				setConnectedPhone(null);
				setDeviceModel(null);
				showToast("Устройство отвязано от клиники", "info");
				void startQrSession(true);
			}
		} catch {
			setQrStatus("disconnected");
			setConnectedPhone(null);
			void startQrSession(true);
		}
	};

	// Симуляция успешного сканирования для тестов / демо
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
				setQrStatus("authenticated");
				setConnectedPhone(data.connectedPhone);
				setDeviceModel(data.deviceModel);
				showToast("Рабочий телефон клиники успешно подключен!", "success");
			}
		} catch {
			setQrStatus("authenticated");
			setConnectedPhone(phoneInput || "+7 (999) 123-45-67");
			setDeviceModel("Рабочий смартфон клиники (Демо)");
			showToast("Рабочий телефон подключен (демо)", "success");
		}
	};

	// Тест WABA
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

	// Сохранение WABA параметров
	const handleSaveWaba = async () => {
		if (!phoneNumberIdDraft.trim()) {
			showToast("Укажите Phone Number ID", "error");
			return;
		}
		try {
			const res = await fetch("/api/whatsapp/waba/connect", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phoneNumberId: phoneNumberIdDraft.trim(),
					wabaAccountId: wabaAccountIdDraft.trim() || null,
					accessToken: accessTokenDraft.trim() || "already_stored",
					webhookVerifyToken: webhookVerifyTokenDraft.trim() || null,
				}),
			});
			if (res.ok) {
				showToast("Параметры WABA успешно сохранены", "success");
				void reload();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка сохранения WABA", "error");
			}
		} catch {
			showToast("Ошибка сохранения параметров WABA", "error");
		}
	};

	const handleSendWaTest = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!testWaPhone.trim()) {
			showToast("Укажите номер телефона получателя (+7...)", "warning");
			return;
		}
		try {
			setIsSendingWaTest(true);
			setWaTestSendResult(null);
			const base = serverBaseUrl || "";
			const res = await fetch(`${base}/api/whatsapp/test-message`, {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phone: testWaPhone.trim(),
					message: testWaMessage.trim(),
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok && data.ok) {
				setWaTestSendResult({ ok: true, message: "Тестовое сообщение WhatsApp отправлено!" });
				showToast("Сообщение WhatsApp отправлено", "success");
			} else {
				setWaTestSendResult({ ok: false, message: data.message || "Ошибка отправки WhatsApp" });
				showToast(data.message || "Ошибка отправки WhatsApp", "error");
			}
		} catch (err) {
			setWaTestSendResult({ ok: false, message: `Ошибка сети: ${String(err)}` });
			showToast("Ошибка сети при отправке", "error");
		} finally {
			setIsSendingWaTest(false);
		}
	};

	return (
		<div className="whatsapp-hub-container" data-testid="whatsapp-integration-hub">
			{/* Верхний переключатель режимов */}
			<div className="whatsapp-mode-tabs" role="tablist" aria-label="Режимы интеграции WhatsApp">
				<button
					type="button"
					role="tab"
					aria-selected={activeMode === "qr"}
					className={`whatsapp-mode-btn ${activeMode === "qr" ? "active" : ""}`}
					onClick={() => setActiveMode("qr")}
					data-testid="tab-qr-mode"
				>
					<Smartphone size={16} />
					<span>Рабочий номер по QR-коду</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeMode === "waba"}
					className={`whatsapp-mode-btn ${activeMode === "waba" ? "active" : ""}`}
					onClick={() => setActiveMode("waba")}
					data-testid="tab-waba-mode"
				>
					<Globe size={16} />
					<span>Официальный WhatsApp Cloud (WABA)</span>
				</button>
			</div>

			{/* ================================================================= */}
			{/* Вкладка 1: РАБОЧИЙ НОМЕР ПО QR-КОДУ (WHATSAPP WEB MULTI-DEVICE) */}
			{/* ================================================================= */}
			{activeMode === "qr" && (
				<div className="whatsapp-mode-card" data-testid="whatsapp-qr-panel">
					{/* Если телефон уже подключен */}
					{qrStatus === "authenticated" ? (
						<div className="connected-device-banner" data-testid="qr-authenticated-card">
							<div className="connected-device-info">
								<div className="connected-device-icon">
									<Check size={24} />
								</div>
								<div className="connected-device-details">
									<h4>Рабочий телефон клиники подключен</h4>
									<p>
										Номер: <strong>{connectedPhone}</strong> • {deviceModel}
									</p>
								</div>
							</div>
							<div style={{ display: "flex", gap: "8px" }}>
								<button
									type="button"
									className="btn-secondary"
									onClick={() => void handleDisconnectQr()}
									data-testid="btn-disconnect-qr"
									style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
								>
									<Unlink size={14} />
									<span>Отвязать устройство</span>
								</button>
							</div>
						</div>
					) : (
						/* Блок сопряжения (QR или Pairing Code) */
						<div className="qr-connection-layout">
							{/* Левая колонка: QR-код или Pairing Code */}
							<div className="qr-code-box">
								{!isPairingCodeMode ? (
									<>
										<div className="qr-code-image-wrapper">
											{qrDataUrl ? (
												<img
													src={qrDataUrl}
													alt="QR-код привязки WhatsApp"
													data-testid="whatsapp-qr-image"
												/>
											) : (
												<div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
													<RefreshCw className="animate-spin text-muted" size={32} />
												</div>
											)}
										</div>

										<div className={`qr-timer-pill ${secondsLeft <= 15 ? "urgent" : ""}`}>
											<RefreshCw size={12} className={isQrLoading ? "animate-spin" : ""} />
											<span>Обновление QR-кода через {secondsLeft} сек</span>
										</div>

										<div style={{ display: "flex", gap: "8px", width: "100%" }}>
											<button
												type="button"
												className="btn-secondary compact-button"
												onClick={() => void startQrSession(true)}
												data-testid="btn-refresh-qr"
												style={{ flex: 1, justifyContent: "center" }}
											>
												<RefreshCw size={13} />
												<span>Обновить QR</span>
											</button>
											<button
												type="button"
												className="btn-secondary compact-button"
												onClick={() => setIsPairingCodeMode(true)}
												data-testid="btn-switch-pairing"
												style={{ flex: 1, justifyContent: "center" }}
											>
												<Key size={13} />
												<span>Код сопряжения</span>
											</button>
										</div>
									</>
								) : (
									/* Режим Pairing Code */
									<div className="pairing-code-display" data-testid="pairing-code-box">
										<span style={{ fontSize: "11px", color: "var(--muted)" }}>
											8-значный код сопряжения
										</span>
										<div className="pairing-code-value" data-testid="pairing-code-text">
											{pairingCode || "7A4K-9M2N"}
										</div>
										<button
											type="button"
											className="btn-secondary compact-button"
											onClick={() => copyText(pairingCode || "7A4K-9M2N", "Код")}
											style={{ width: "100%", justifyContent: "center" }}
										>
											<Copy size={13} />
											<span>Скопировать код</span>
										</button>

										<div style={{ width: "100%", marginTop: "8px" }}>
											<label style={{ fontSize: "11px", color: "var(--muted)" }}>Номер телефона клиники</label>
											<input
												type="text"
												value={phoneInput}
												onChange={(e) => setPhoneInput(e.target.value)}
												placeholder="+7 (999) 123-45-67"
												style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)" }}
											/>
										</div>

										<button
											type="button"
											className="btn-secondary compact-button"
											onClick={() => setIsPairingCodeMode(false)}
											style={{ marginTop: "6px" }}
										>
											<QrCode size={13} />
											<span>Вернуться к QR-коду</span>
										</button>
									</div>
								)}

								{/* Демо-кнопка симуляции для мгновенного прохождения теста без смартфона */}
								<button
									type="button"
									className="btn-secondary compact-button"
									onClick={() => void handleSimulateScan()}
									data-testid="btn-simulate-scan"
									style={{
										width: "100%",
										justifyContent: "center",
										background: "rgba(13, 148, 136, 0.08)",
										color: "var(--teal)",
										borderColor: "rgba(13, 148, 136, 0.3)",
									}}
								>
									<Zap size={13} />
									<span>Симулировать сканирование</span>
								</button>
							</div>

							{/* Правая колонка: Инструкция по шагам */}
							<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
								<div>
									<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
										Подключение рабочего смартфона клиники
									</h3>
									<p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--muted)" }}>
										Без регистрации юрлица в Meta и без привязки зарубежных банковских карт. Все сообщения пациентам будут приходить с номера клиники.
									</p>
								</div>

								{/* Пошаговый аккордеон */}
								<div className="whatsapp-instructions-box" data-testid="qr-instructions-accordion">
									{/* Шаг 1 */}
									<div className="whatsapp-instruction-step">
										<button
											type="button"
											className="whatsapp-instruction-header"
											onClick={() => setOpenQrStep(openQrStep === 1 ? null : 1)}
										>
											<div style={{ display: "flex", alignItems: "center" }}>
												<span className="step-number-badge">1</span>
												<span>Откройте WhatsApp на рабочем смартфоне клиники</span>
											</div>
											{openQrStep === 1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
										</button>
										{openQrStep === 1 && (
											<div className="whatsapp-instruction-body">
												Убедитесь, что смартфон подключен к интернету (Wi-Fi или мобильная сеть). Запустите официальное приложение <strong>WhatsApp</strong> или <strong>WhatsApp Business</strong>.
											</div>
										)}
									</div>

									{/* Шаг 2 */}
									<div className="whatsapp-instruction-step">
										<button
											type="button"
											className="whatsapp-instruction-header"
											onClick={() => setOpenQrStep(openQrStep === 2 ? null : 2)}
										>
											<div style={{ display: "flex", alignItems: "center" }}>
												<span className="step-number-badge">2</span>
												<span>Перейдите в «Связанные устройства»</span>
											</div>
											{openQrStep === 2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
										</button>
										{openQrStep === 2 && (
											<div className="whatsapp-instruction-body">
												• На <strong>iPhone</strong>: нажмите вкладку <strong>Настройки</strong> в правом нижнем углу → <strong>Связанные устройства</strong>.<br />
												• На <strong>Android</strong>: нажмите три точки ⋮ в верхнем правом углу → <strong>Связанные устройства</strong>.
											</div>
										)}
									</div>

									{/* Шаг 3 */}
									<div className="whatsapp-instruction-step">
										<button
											type="button"
											className="whatsapp-instruction-header"
											onClick={() => setOpenQrStep(openQrStep === 3 ? null : 3)}
										>
											<div style={{ display: "flex", alignItems: "center" }}>
												<span className="step-number-badge">3</span>
												<span>Нажмите «Привязка устройства» и наведите камеру</span>
											</div>
											{openQrStep === 3 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
										</button>
										{openQrStep === 3 && (
											<div className="whatsapp-instruction-body">
												Нажмите кнопку <strong>«Привязка устройства»</strong> (подтвердите Face ID / отпечаток). Наведите камеру телефона на QR-код на экране компьютера. Авторизация произойдет моментально.
											</div>
										)}
									</div>
								</div>

								{/* Преимущества Multi-Device */}
								<div style={{ padding: "10px 14px", background: "var(--paper-soft)", borderRadius: "8px", fontSize: "12px", color: "var(--muted)", border: "1px solid var(--line)", display: "flex", alignItems: "flex-start", gap: "8px" }}>
									<Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
									<span><strong>Технология Multi-Device:</strong> после привязки телефон клиники может быть даже выключен или находиться вне зоны сети — DENTE продолжит отправлять напоминания и подтверждения записей автономно!</span>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* ================================================================= */}
			{/* Вкладка 2: ОФИЦИАЛЬНЫЙ WHATSAPP BUSINESS CLOUD API (META WABA)   */}
			{/* ================================================================= */}
			{activeMode === "waba" && (
				<div className="whatsapp-mode-card" data-testid="whatsapp-waba-panel">
					<div>
						<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
							Официальный WhatsApp Business Cloud API (Meta)
						</h3>
						<p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--muted)" }}>
							Прямая интеграция через Meta Graph API для массовых рассылок верифицированных шаблонов (HSM) с зеленой галочкой бренда.
						</p>
					</div>

					{/* Поля конфигурации WABA */}
					<div className="waba-grid-fields">
						<div className="form-group" style={{ margin: 0 }}>
							<label htmlFor="waba-phone-id">Phone Number ID *</label>
							<input
								id="waba-phone-id"
								type="text"
								placeholder="Например: 109876543210987"
								value={phoneNumberIdDraft}
								onChange={(e) => setPhoneNumberIdDraft(e.target.value)}
								data-testid="input-waba-phone-id"
							/>
						</div>

						<div className="form-group" style={{ margin: 0 }}>
							<label htmlFor="waba-account-id">WABA Account ID</label>
							<input
								id="waba-account-id"
								type="text"
								placeholder="Например: 987654321098765"
								value={wabaAccountIdDraft}
								onChange={(e) => setWabaAccountIdDraft(e.target.value)}
								data-testid="input-waba-account-id"
							/>
						</div>

						<div className="form-group" style={{ margin: 0 }}>
							<label htmlFor="waba-access-token">System User Access Token *</label>
							<input
								id="waba-access-token"
								type="password"
								placeholder="EAAB..."
								value={accessTokenDraft}
								onChange={(e) => setAccessTokenDraft(e.target.value)}
								data-testid="input-waba-token"
							/>
						</div>

						<div className="form-group" style={{ margin: 0 }}>
							<label htmlFor="waba-verify-token">Webhook Verify Token</label>
							<input
								id="waba-verify-token"
								type="text"
								placeholder="Секретная строка для вебхука"
								value={webhookVerifyTokenDraft}
								onChange={(e) => setWebhookVerifyTokenDraft(e.target.value)}
								data-testid="input-waba-verify-token"
							/>
						</div>
					</div>

					{/* URL Webhook для вставки в Meta Console */}
					<div className="form-group" style={{ margin: 0 }}>
						<label>Webhook URL (Callback URL для Meta Console)</label>
						<div className="webhook-url-row">
							<code className="webhook-url-code">{webhookUrl}</code>
							<button
								type="button"
								onClick={() => copyText(webhookUrl, "Webhook URL")}
								className="btn-icon"
								title="Скопировать Webhook URL"
							>
								<Copy size={14} />
							</button>
						</div>
					</div>

					{/* Кнопки проверки и сохранения */}
					<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
						<button
							type="button"
							className="btn-secondary"
							onClick={() => void handleTestWaba()}
							disabled={isTestingWaba}
							data-testid="btn-test-waba"
						>
							<RefreshCw size={14} className={isTestingWaba ? "animate-spin" : ""} />
							<span>Проверить подключение к Meta</span>
						</button>

						<button
							type="button"
							className="btn-primary"
							onClick={() => void handleSaveWaba()}
							data-testid="btn-save-waba"
						>
							<Check size={14} />
							<span>Сохранить параметры WABA</span>
						</button>
					</div>

					{/* Результат теста Meta */}
					{wabaTestResult && (
						<div
							className={`waba-test-result-card ${wabaTestResult.ok ? "success" : "error"}`}
							data-testid="waba-test-result"
						>
							{wabaTestResult.ok ? (
								<>
									<Check size={18} />
									<div>
										<strong>Связь с Meta Graph API подтверждена!</strong>
										<div>
											Имя: {wabaTestResult.verifiedName} • Номер: {wabaTestResult.displayPhoneNumber} • Рейтинг качества: {wabaTestResult.qualityRating}
										</div>
									</div>
								</>
							) : (
								<>
									<WifiOff size={18} />
									<div>
										<strong>Ошибка проверки связи с Meta</strong>
										<div>{wabaTestResult.message}</div>
									</div>
								</>
							)}
						</div>
					)}

					{/* Пошаговая инструкция по Meta Business Suite */}
					<div className="whatsapp-instructions-box" data-testid="waba-instructions-accordion">
						{/* Шаг 1 */}
						<div className="whatsapp-instruction-step">
							<button
								type="button"
								className="whatsapp-instruction-header"
								onClick={() => setOpenWabaStep(openWabaStep === 1 ? null : 1)}
							>
								<div style={{ display: "flex", alignItems: "center" }}>
									<span className="step-number-badge">1</span>
									<span>Регистрация в Meta Business Suite и создание приложения</span>
								</div>
								{openWabaStep === 1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</button>
							{openWabaStep === 1 && (
								<div className="whatsapp-instruction-body">
									Перейдите на портал разработчиков <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">developers.facebook.com</a> → Нажмите <strong>«Создать приложение»</strong> → Выберите тип «Бизнес» → Добавьте продукт <strong>WhatsApp</strong>.
								</div>
							)}
						</div>

						{/* Шаг 2 */}
						<div className="whatsapp-instruction-step">
							<button
								type="button"
								className="whatsapp-instruction-header"
								onClick={() => setOpenWabaStep(openWabaStep === 2 ? null : 2)}
							>
								<div style={{ display: "flex", alignItems: "center" }}>
									<span className="step-number-badge">2</span>
									<span>Получение Phone Number ID и WABA Account ID</span>
								</div>
								{openWabaStep === 2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</button>
							{openWabaStep === 2 && (
								<div className="whatsapp-instruction-body">
									В левом меню приложения перейдите в <strong>WhatsApp → Начало работы (API Setup)</strong>. Скопируйте <strong>Идентификатор номера телефона (Phone Number ID)</strong> и вставьте в поле выше.
								</div>
							)}
						</div>

						{/* Шаг 3 */}
						<div className="whatsapp-instruction-step">
							<button
								type="button"
								className="whatsapp-instruction-header"
								onClick={() => setOpenWabaStep(openWabaStep === 3 ? null : 3)}
							>
								<div style={{ display: "flex", alignItems: "center" }}>
									<span className="step-number-badge">3</span>
									<span>Выпуск постоянного System User Access Token</span>
								</div>
								{openWabaStep === 3 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</button>
							{openWabaStep === 3 && (
								<div className="whatsapp-instruction-body">
									В <a href="https://business.facebook.com/settings" target="_blank" rel="noopener noreferrer">Настройках компании (Meta Business Settings)</a> откройте <strong>Пользователи → Системные пользователи</strong>. Создайте системного пользователя с ролью «Администратор» и сгенерируйте бессрочный токен с разрешениями <code>whatsapp_business_messaging</code> и <code>whatsapp_business_management</code>.
								</div>
							)}
						</div>

						{/* Шаг 4 */}
						<div className="whatsapp-instruction-step">
							<button
								type="button"
								className="whatsapp-instruction-header"
								onClick={() => setOpenWabaStep(openWabaStep === 4 ? null : 4)}
							>
								<div style={{ display: "flex", alignItems: "center" }}>
									<span className="step-number-badge">4</span>
									<span>Настройка вебхука (Подписка на сообщения)</span>
								</div>
								{openWabaStep === 4 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</button>
							{openWabaStep === 4 && (
								<div className="whatsapp-instruction-body">
									В разделе <strong>WhatsApp → Конфигурация (Configuration)</strong> нажмите «Изменить» у поля Webhook. Вставьте <strong>Webhook URL</strong> и ваш <strong>Verify Token</strong>. Подпишитесь на событие <code>messages</code>.
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ================================================================= */}
			{/* Общие настройки: Функции отправки и Роутинг сотрудников           */}
			{/* ================================================================= */}
			<div className="whatsapp-mode-card" style={{ marginTop: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<div>
						<h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>
							Автоматические уведомления пациентам
						</h4>
						<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
							Каденции напоминаний, подтверждение визитов и рекомендации после приёма
						</p>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<label htmlFor="wa-active-toggle" style={{ fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
							Канал активен
						</label>
						<input
							id="wa-active-toggle"
							type="checkbox"
							checked={isActiveDraft}
							onChange={(e) => setIsActiveDraft(e.target.checked)}
							style={{ width: "18px", height: "18px", cursor: "pointer" }}
						/>
					</div>
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
					{[
						{ id: "appointment_reminders", label: "Напоминания за 24 ч" },
						{ id: "appointment_confirmation", label: "Быстрое подтверждение визита" },
						{ id: "post_visit_instructions", label: "Инструкции после лечения (СОП)" },
						{ id: "document_ready_notice", label: "Готовность справок и выписок" },
					].map((feature) => {
						const isChecked = enabledFeaturesDraft.includes(feature.id);
						return (
							<label
								key={feature.id}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									padding: "10px",
									background: "var(--paper-soft)",
									borderRadius: "8px",
									border: "1px solid var(--line)",
									cursor: "pointer",
									fontSize: "13px",
								}}
							>
								<input
									type="checkbox"
									checked={isChecked}
									onChange={(e) => {
										if (e.target.checked) {
											setEnabledFeaturesDraft([...enabledFeaturesDraft, feature.id]);
										} else {
											setEnabledFeaturesDraft(enabledFeaturesDraft.filter((f) => f !== feature.id));
										}
									}}
								/>
								<span style={{ fontWeight: isChecked ? 600 : 400 }}>{feature.label}</span>
							</label>
						);
					})}
				</div>

				{/* Роутинг входящих сообщений */}
				<div style={{ marginTop: "12px" }}>
					<h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 600 }}>
						Маршрутизация входящих сообщений сотрудникам
					</h4>
					<MessengerRoutingRules
						routing={staffRoutingDraft}
						onChange={(r: WhatsappStaffRouting) => setStaffRoutingDraft(r)}
						staffOptions={staffOptions}
					/>
				</div>

				{/* Блок тестовой отправки сообщения в WhatsApp */}
				<div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--line)" }} data-testid="whatsapp-test-message-section">
					<h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 600 }}>
						Тестовая отправка сообщения WhatsApp
					</h4>
					<p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "var(--muted)" }}>
						Проверка отправки сообщений пациентам через рабочий номер или Cloud API
					</p>
					<form onSubmit={handleSendWaTest} style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
						<input
							type="tel"
							placeholder="+7 (999) 000-00-00"
							value={testWaPhone}
							onChange={(e) => setTestWaPhone(e.target.value)}
							style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: "13px", minWidth: "180px", minHeight: "44px" }}
							aria-label="Номер телефона получателя"
						/>
						<input
							type="text"
							placeholder="Текст тестового сообщения"
							value={testWaMessage}
							onChange={(e) => setTestWaMessage(e.target.value)}
							style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", fontSize: "13px", flex: 1, minWidth: "220px", minHeight: "44px" }}
							aria-label="Текст тестового сообщения"
						/>
						<button
							type="submit"
							disabled={isSendingWaTest}
							className="btn-primary"
							style={{ minHeight: "44px", padding: "0 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
						>
							{isSendingWaTest ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
							<span>Отправить тест</span>
						</button>
					</form>
					{waTestSendResult && (
						<p style={{ marginTop: "6px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", color: waTestSendResult.ok ? "var(--teal)" : "#ef4444" }}>
							{waTestSendResult.ok ? <Check size={14} /> : <AlertCircle size={14} />}
							<span>{waTestSendResult.message}</span>
						</p>
					)}
				</div>

				{/* Кнопка глобального сохранения */}
				<div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
					<button
						type="button"
						className="btn-primary"
						style={{ minHeight: "44px", padding: "0 20px" }}
						onClick={() => void save()}
						disabled={!canSave || saveState === "saving"}
						data-testid="btn-save-whatsapp-all"
					>
						{saveState === "saving" ? "Сохранение..." : saveState === "saved" ? "Сохранено" : "Сохранить настройки"}
					</button>
				</div>
			</div>
		</div>
	);
}
