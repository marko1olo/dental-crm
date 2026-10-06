import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	AlertCircle,
	Bot,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Copy,
	ExternalLink,
	Eye,
	EyeOff,
	Key,
	Lock,
	Phone,
	QrCode,
	RefreshCw,
	Send,
	Shield,
	ShieldCheck,
	Smartphone,
	Unlink,
	UserCheck,
	Users,
	Zap,
} from "lucide-react";
import "./TelegramIntegrationHub.css";
import { showToast } from "../../GlobalToast";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";

export interface TelegramIntegrationHubProps {
	clinicId?: string;
	userId?: string;
	onBotStatusChange?: (status: unknown) => void;
}

export function TelegramIntegrationHub({
	clinicId,
	userId,
	onBotStatusChange,
}: TelegramIntegrationHubProps) {
	// --- Главная вкладка: Бот клиники vs Личный MTProto аккаунт ---
	const [activeMainTab, setActiveMainTab] = useState<"bot" | "account">("bot");

	// =========================================================================
	// 1. СОСТОЯНИЕ БОТА TELEGRAM (BotFather HTTP API)
	// =========================================================================
	const [botStatus, setBotStatus] = useState<{
		configured: boolean;
		bot?: {
			id: number;
			username: string;
			firstName: string;
			canJoinGroups: boolean;
			canReadAllGroupMessages: boolean;
			supportsInlineQueries: boolean;
			tokenMasked: string;
			webhookActive: boolean;
			lastCheckedAt?: string;
		};
	} | null>(null);
	const [isBotLoading, setIsBotLoading] = useState<boolean>(true);
	const [botTokenInput, setBotTokenInput] = useState<string>("");
	const [showBotToken, setShowBotToken] = useState<boolean>(false);
	const [isConnectingBot, setIsConnectingBot] = useState<boolean>(false);
	const [isTestingBot, setIsTestingBot] = useState<boolean>(false);
	const [isDisconnectingBot, setIsDisconnectingBot] = useState<boolean>(false);
	const [isBotGuideOpen, setIsBotGuideOpen] = useState<boolean>(true);

	// =========================================================================
	// 2. СОСТОЯНИЕ ЛИЧНОГО АККАУНТА (MTProto врача / клиники)
	// =========================================================================
	const [accountStatus, setAccountStatus] = useState<{
		connected: boolean;
		account?: {
			id: string;
			phone: string;
			firstName: string | null;
			lastName: string | null;
			username: string | null;
			avatarUrl: string | null;
			status: string;
			is2faEnabled: boolean;
			connectedAt: string | null;
			lastActiveAt: string | null;
		};
	} | null>(null);
	const [isAccountLoading, setIsAccountLoading] = useState<boolean>(true);
	const [accountAuthMode, setAccountAuthMode] = useState<"phone" | "qr">("phone");

	// Поля авторизации по телефону
	const [phoneInput, setPhoneInput] = useState<string>("");
	const [isRequestingCode, setIsRequestingCode] = useState<boolean>(false);
	const [phoneCodeHash, setPhoneCodeHash] = useState<string | null>(null);
	const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", ""]);
	const [testCodePreset, setTestCodePreset] = useState<string | null>(null);
	const [codeTimerSeconds, setCodeTimerSeconds] = useState<number>(0);
	const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
	const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

	// Поля 2FA облачного пароля
	const [requires2fa, setRequires2fa] = useState<boolean>(false);
	const [password2fa, setPassword2fa] = useState<string>("");
	const [showPassword2fa, setShowPassword2fa] = useState<boolean>(false);
	const [isVerifying2fa, setIsVerifying2fa] = useState<boolean>(false);

	// Поля QR-авторизации
	const [qrData, setQrData] = useState<{
		token: string;
		svg: string;
		expiresAt: string;
	} | null>(null);
	const [isRequestingQr, setIsRequestingQr] = useState<boolean>(false);
	const [isConfirmingQr, setIsConfirmingQr] = useState<boolean>(false);
	const [isDisconnectingAccount, setIsDisconnectingAccount] =
		useState<boolean>(false);

	// =========================================================================
	// ЗАГРУЗКА ДАННЫХ С СЕРВЕРА
	// =========================================================================
	const loadBotStatus = useCallback(async () => {
		try {
			setIsBotLoading(true);
			const res = await fetch("/api/telegram/bot/status", {
				headers: getDenteAuthHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setBotStatus(data);
				if (onBotStatusChange) {
					onBotStatusChange(data);
				}
			}
		} catch (err) {
			console.error("Failed to load telegram bot status:", err);
		} finally {
			setIsBotLoading(false);
		}
	}, [onBotStatusChange]);

	const loadAccountStatus = useCallback(async () => {
		try {
			setIsAccountLoading(true);
			const res = await fetch("/api/telegram/account/status", {
				headers: getDenteAuthHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setAccountStatus(data);
			}
		} catch (err) {
			console.error("Failed to load telegram account status:", err);
		} finally {
			setIsAccountLoading(false);
		}
	}, []);

	useEffect(() => {
		loadBotStatus();
		loadAccountStatus();
	}, [loadBotStatus, loadAccountStatus]);

	// Таймер обратного отсчета для кода
	useEffect(() => {
		if (codeTimerSeconds <= 0) return;
		const interval = setInterval(() => {
			setCodeTimerSeconds((prev) => Math.max(0, prev - 1));
		}, 1000);
		return () => clearInterval(interval);
	}, [codeTimerSeconds]);

	// =========================================================================
	// ДЕЙСТВИЯ БОТА TELEGRAM
	// =========================================================================
	const handleConnectBot = async () => {
		const token = botTokenInput.trim();
		if (!token) {
			showToast("Введите API-токен бота от @BotFather", "warning");
			return;
		}

		// Regex-проверка формата токена
		const botTokenRegex = /^\d{6,12}:[A-Za-z0-9_-]{35,}$/;
		if (!botTokenRegex.test(token)) {
			showToast("Некорректный формат токена (ожидается 123456:ABC...)", "warning");
			return;
		}

		try {
			setIsConnectingBot(true);
			const res = await fetch("/api/telegram/bot/connect", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					token,
					clinicId,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				showToast(
					`Бот @${data.bot?.username ?? "Telegram"} успешно подключен!`,
					"success",
				);
				setBotTokenInput("");
				setBotStatus({
					configured: true,
					bot: data.bot,
				});
				if (onBotStatusChange) {
					onBotStatusChange(data);
				}
			} else {
				showToast(data.error || "Ошибка подключения Telegram-бота", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsConnectingBot(false);
		}
	};

	const handleTestBot = async () => {
		try {
			setIsTestingBot(true);
			const res = await fetch("/api/telegram/bot/test", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ clinicId }),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				showToast("Связь с Telegram Bot API подтверждена", "success");
				setBotStatus((prev) =>
					prev ? { ...prev, configured: true, bot: data.bot } : null,
				);
			} else {
				showToast(data.error || "Ошибка проверки бота", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsTestingBot(false);
		}
	};

	const handleDisconnectBot = async () => {
		try {
			setIsDisconnectingBot(true);
			const res = await fetch("/api/telegram/bot/disconnect", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ clinicId }),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				showToast("Бот клиники отключен", "info");
				setBotStatus({ configured: false });
				if (onBotStatusChange) {
					onBotStatusChange({ configured: false });
				}
			} else {
				showToast(data.error || "Ошибка отключения бота", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsDisconnectingBot(false);
		}
	};

	// =========================================================================
	// ДЕЙСТВИЯ ЛИЧНОГО АККАУНТА TELEGRAM (MTProto)
	// =========================================================================

	// Форматирование телефона на лету
	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		setPhoneInput(raw);
	};

	const handleRequestCode = async () => {
		const cleaned = phoneInput.trim();
		if (!cleaned || cleaned.replace(/\D/g, "").length < 10) {
			showToast("Введите корректный номер телефона РФ (+7...)", "warning");
			return;
		}

		try {
			setIsRequestingCode(true);
			const res = await fetch("/api/telegram/account/request-code", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					phone: cleaned,
					clinicId,
					userId,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				showToast("Код подтверждения отправлен в Telegram", "success");
				setPhoneCodeHash(data.phoneCodeHash);
				setCodeTimerSeconds(data.timeout || 120);
				setCodeDigits(["", "", "", "", ""]);
				setRequires2fa(false);
				if (data.testCode) {
					setTestCodePreset(data.testCode);
				}
				// Фокус на первую цифру
				setTimeout(() => {
					digitInputRefs.current[0]?.focus();
				}, 100);
			} else {
				showToast(data.error || "Ошибка отправки кода", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsRequestingCode(false);
		}
	};

	const handleDigitChange = (index: number, val: string) => {
		const digit = val.slice(-1).replace(/\D/g, "");
		const updated = [...codeDigits];
		updated[index] = digit;
		setCodeDigits(updated);

		if (digit && index < 4) {
			digitInputRefs.current[index + 1]?.focus();
		}
	};

	const handleDigitKeyDown = (
		index: number,
		e: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
			digitInputRefs.current[index - 1]?.focus();
		}
	};

	const handleVerifyCode = async (explicitCode?: string) => {
		const code = explicitCode || codeDigits.join("");
		if (code.length < 5) {
			showToast("Введите 5-значный код подтверждения", "warning");
			return;
		}
		if (!phoneCodeHash) {
			showToast("Сначала запросите код на номер телефона", "warning");
			return;
		}

		try {
			setIsVerifyingCode(true);
			const res = await fetch("/api/telegram/account/verify-code", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					phone: phoneInput.trim(),
					phoneCodeHash,
					code,
					clinicId,
					userId,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				if (data.requires2fa) {
					setRequires2fa(true);
					showToast("Требуется облачный пароль 2FA", "info");
				} else if (data.connected) {
					showToast("Личный аккаунт Telegram успешно подключен!", "success");
					setAccountStatus({
						connected: true,
						account: data.account,
					});
					setPhoneCodeHash(null);
					setCodeDigits(["", "", "", "", ""]);
				}
			} else {
				showToast(data.error || "Неверный код подтверждения", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsVerifyingCode(false);
		}
	};

	const handleVerify2fa = async () => {
		if (!password2fa) {
			showToast("Введите облачный пароль 2FA", "warning");
			return;
		}

		try {
			setIsVerifying2fa(true);
			const res = await fetch("/api/telegram/account/verify-2fa", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					phone: phoneInput.trim(),
					password: password2fa,
					clinicId,
					userId,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok && data.connected) {
				showToast("2FA подтверждена! Аккаунт подключен", "success");
				setAccountStatus({
					connected: true,
					account: data.account,
				});
				setRequires2fa(false);
				setPassword2fa("");
				setPhoneCodeHash(null);
			} else {
				showToast(data.error || "Неверный пароль 2FA", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsVerifying2fa(false);
		}
	};

	// QR-авторизация
	const handleRequestQr = useCallback(async () => {
		try {
			setIsRequestingQr(true);
			const res = await fetch("/api/telegram/account/request-qr", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ clinicId, userId }),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				setQrData({
					token: data.token,
					svg: data.qrSvg || data.svg,
					expiresAt: data.expiresAt,
				});
			} else {
				showToast(data.error || "Не удалось сгенерировать QR-код", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsRequestingQr(false);
		}
	}, [clinicId, userId]);

	const handleConfirmQr = async () => {
		if (!qrData?.token) {
			showToast("Сначала сгенерируйте QR-код", "warning");
			return;
		}

		try {
			setIsConfirmingQr(true);
			const res = await fetch("/api/telegram/account/confirm-qr", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					token: qrData.token,
					clinicId,
					userId,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok && data.connected) {
				showToast("Вход по QR-коду успешно подтвержден!", "success");
				setAccountStatus({
					connected: true,
					account: data.account,
				});
				setQrData(null);
			} else {
				showToast(data.error || "Ожидание сканирования QR-кода...", "info");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsConfirmingQr(false);
		}
	};

	const handleDisconnectAccount = async () => {
		try {
			setIsDisconnectingAccount(true);
			const res = await fetch("/api/telegram/account/disconnect", {
				method: "POST",
				headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					phone: accountStatus?.account?.phone,
					accountId: accountStatus?.account?.id,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				showToast("Личный Telegram-аккаунт отключен", "info");
				setAccountStatus({ connected: false });
				setPhoneCodeHash(null);
				setRequires2fa(false);
				setQrData(null);
			} else {
				showToast(data.error || "Ошибка отключения аккаунта", "error");
			}
		} catch (err) {
			showToast(`Ошибка сети: ${String(err)}`, "error");
		} finally {
			setIsDisconnectingAccount(false);
		}
	};

	// Загрузка QR при переключении режима
	useEffect(() => {
		if (
			activeMainTab === "account" &&
			!accountStatus?.connected &&
			accountAuthMode === "qr" &&
			!qrData &&
			!isRequestingQr
		) {
			handleRequestQr();
		}
	}, [
		activeMainTab,
		accountStatus?.connected,
		accountAuthMode,
		qrData,
		isRequestingQr,
		handleRequestQr,
	]);

	return (
		<div className="telegram-hub-container" data-testid="telegram-integration-hub">
			{/* Вкладки верхнего уровня */}
			<div className="tg-hub-main-tabs" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={activeMainTab === "bot"}
					className={`tg-hub-tab-btn ${activeMainTab === "bot" ? "active" : ""}`}
					onClick={() => setActiveMainTab("bot")}
					data-testid="tg-hub-tab-bot"
				>
					<Bot size={18} />
					<span className="tg-tab-text-desktop">Бот Telegram</span>
					<span className="tg-tab-text-mobile">Бот</span>
					{botStatus?.configured && (
						<span
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								background: "#10b981",
								marginLeft: "4px",
							}}
						/>
					)}
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeMainTab === "account"}
					className={`tg-hub-tab-btn ${activeMainTab === "account" ? "active" : ""}`}
					onClick={() => setActiveMainTab("account")}
					data-testid="tg-hub-tab-account"
				>
					<UserCheck size={18} />
					<span className="tg-tab-text-desktop">Личный аккаунт Telegram</span>
					<span className="tg-tab-text-mobile">Личный аккаунт</span>
					{accountStatus?.connected && (
						<span
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								background: "#10b981",
								marginLeft: "4px",
							}}
						/>
					)}
				</button>
			</div>

			{/* ================================================================= */}
			{/* ВКЛАДКА 1: БОТ TELEGRAM */}
			{/* ================================================================= */}
			{activeMainTab === "bot" && (
				<div className="tg-hub-content-card" data-testid="tg-bot-pane">
					{/* Баннер статуса бота */}
					<div
						className={`tg-status-banner ${botStatus?.configured ? "connected" : "disconnected"}`}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							<div
								style={{
									width: "42px",
									height: "42px",
									borderRadius: "10px",
									background: botStatus?.configured
										? "rgba(16, 185, 129, 0.15)"
										: "rgba(245, 158, 11, 0.15)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: botStatus?.configured ? "#10b981" : "#f59e0b",
								}}
							>
								<Bot size={22} />
							</div>
							<div>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontWeight: 700,
										fontSize: "15px",
										color: "var(--ink)",
									}}
								>
									<span>
										{botStatus?.configured
											? `Бот подключен: @${botStatus.bot?.username}`
											: "Бот не подключен"}
									</span>
									<span
										className={`tg-status-badge ${botStatus?.configured ? "online" : "offline"}`}
									>
										<span
											className={`tg-pulse-dot ${botStatus?.configured ? "pulse" : ""}`}
										/>
										<span>{botStatus?.configured ? "Активен" : "Ожидает токен"}</span>
									</span>
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
									{botStatus?.configured
										? `Вебхук активен • Шифрование AES-256-GCM • ID: ${botStatus.bot?.id}`
										: "Для отправки сервисных уведомлений и напоминаний пациентам"}
								</div>
							</div>
						</div>

						{/* Кнопки действий для подключенного бота */}
						{botStatus?.configured && (
							<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
								<button
									type="button"
									className="tg-btn-secondary"
									onClick={handleTestBot}
									disabled={isTestingBot}
									title="Проверить связь с Telegram API"
									data-testid="tg-bot-test-btn"
								>
									<RefreshCw
										size={14}
										className={isTestingBot ? "animate-spin" : ""}
									/>
									<span>{isTestingBot ? "Проверка..." : "Проверить связь"}</span>
								</button>
								<button
									type="button"
									className="tg-btn-danger"
									onClick={handleDisconnectBot}
									disabled={isDisconnectingBot}
									title="Отключить бота от клиники"
									data-testid="tg-bot-disconnect-btn"
								>
									<Unlink size={14} />
									<span>Отключить</span>
								</button>
							</div>
						)}
					</div>

					{/* Если подключен — карточка с параметрами бота */}
					{botStatus?.configured && botStatus.bot && (
						<div className="tg-info-grid">
							<div className="tg-info-item">
								<span className="tg-info-label">Юзернейм бота</span>
								<a
									href={`https://t.me/${botStatus.bot.username}`}
									target="_blank"
									rel="noreferrer"
									className="tg-profile-link tg-info-value"
								>
									<span>@{botStatus.bot.username}</span>
									<ExternalLink size={12} />
								</a>
							</div>
							<div className="tg-info-item">
								<span className="tg-info-label">Имя бота</span>
								<span className="tg-info-value">{botStatus.bot.firstName}</span>
							</div>
							<div className="tg-info-item">
								<span className="tg-info-label">Зашифрованный токен</span>
								<span className="tg-info-value" style={{ fontFamily: "monospace" }}>
									{botStatus.bot.tokenMasked}
								</span>
							</div>
							<div className="tg-info-item">
								<span className="tg-info-label">Возможности</span>
								<span className="tg-info-value">
									Группы: {botStatus.bot.canJoinGroups ? "Да" : "—"} • Сообщения:{" "}
									{botStatus.bot.canReadAllGroupMessages ? "Да" : "—"} • Inline:{" "}
									{botStatus.bot.supportsInlineQueries ? "Да" : "—"}
								</span>
							</div>
						</div>
					)}

					{/* Если не подключен — форма ввода токена */}
					{!botStatus?.configured && (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "16px",
							}}
						>
							<div className="tg-form-group">
								<label
									htmlFor="tg-bot-token-input"
									style={{
										fontSize: "13px",
										fontWeight: 600,
										color: "var(--ink)",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									<Key size={14} />
									<span>HTTP API токен бота от @BotFather</span>
								</label>
								<div className="tg-input-wrapper">
									<input
										id="tg-bot-token-input"
										type={showBotToken ? "text" : "password"}
										className="tg-text-input"
										placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567"
										value={botTokenInput}
										onChange={(e) => setBotTokenInput(e.target.value)}
										autoComplete="off"
										data-testid="tg-bot-token-input"
									/>
									<button
										type="button"
										className="tg-input-icon-btn"
										onClick={() => setShowBotToken(!showBotToken)}
										title={showBotToken ? "Скрыть токен" : "Показать токен"}
									>
										{showBotToken ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>
									Токен будет зашифрован ключом клиники по стандарту AES-256-GCM.
								</div>
							</div>

							<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
								<button
									type="button"
									className="tg-btn-primary"
									onClick={handleConnectBot}
									disabled={isConnectingBot || !botTokenInput.trim()}
									data-testid="tg-bot-connect-btn"
								>
									{isConnectingBot ? (
										<RefreshCw size={16} className="animate-spin" />
									) : (
										<ShieldCheck size={16} />
									)}
									<span>
										{isConnectingBot
											? "Проверка и подключение..."
											: "Проверить и подключить бота"}
									</span>
								</button>
							</div>

							{/* 3-Шаговая инструкция по созданию бота */}
							<div className="tg-guide-box">
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										cursor: "pointer",
									}}
									onClick={() => setIsBotGuideOpen(!isBotGuideOpen)}
								>
									<div
										style={{
											fontWeight: 700,
											fontSize: "14px",
											color: "var(--ink)",
											display: "flex",
											alignItems: "center",
											gap: "8px",
										}}
									>
										<Bot size={16} color="var(--teal)" />
										<span>Как создать бота в Telegram за 1 минуту</span>
									</div>
									<button
										type="button"
										style={{
											background: "none",
											border: "none",
											color: "var(--muted)",
											cursor: "pointer",
										}}
									>
										{isBotGuideOpen ? (
											<ChevronUp size={16} />
										) : (
											<ChevronDown size={16} />
										)}
									</button>
								</div>

								{isBotGuideOpen && (
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "10px",
											marginTop: "6px",
										}}
									>
										<div className="tg-guide-step">
											<div className="tg-step-badge">1</div>
											<div className="tg-step-text">
												Откройте официального бота{" "}
												<a
													href="https://t.me/BotFather"
													target="_blank"
													rel="noreferrer"
													className="tg-profile-link"
												>
													@BotFather
													<ExternalLink size={12} />
												</a>{" "}
												в Telegram и отправьте команду{" "}
												<span className="tg-code-tag">/newbot</span>.
											</div>
										</div>
										<div className="tg-guide-step">
											<div className="tg-step-badge">2</div>
											<div className="tg-step-text">
												Укажите название клиники (например,{" "}
												<em>Стоматология DENTE</em>) и уникальный username с
												окончанием на <span className="tg-code-tag">bot</span>{" "}
												(например, <em>dente_clinic_bot</em>).
											</div>
										</div>
										<div className="tg-guide-step">
											<div className="tg-step-badge">3</div>
											<div className="tg-step-text">
												Скопируйте строку с HTTP API токеном, начинающуюся с цифр, и
												вставьте в поле выше.
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			)}

			{/* ================================================================= */}
			{/* ВКЛАДКА 2: ЛИЧНЫЙ АККАУНТ TELEGRAM (MTProto) */}
			{/* ================================================================= */}
			{activeMainTab === "account" && (
				<div className="tg-hub-content-card" data-testid="tg-account-pane">
					{/* Баннер статуса личного аккаунта */}
					<div
						className={`tg-status-banner ${accountStatus?.connected ? "connected" : "disconnected"}`}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
							<div
								style={{
									width: "42px",
									height: "42px",
									borderRadius: "10px",
									background: accountStatus?.connected
										? "rgba(16, 185, 129, 0.15)"
										: "rgba(245, 158, 11, 0.15)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: accountStatus?.connected ? "#10b981" : "#f59e0b",
								}}
							>
								<Smartphone size={22} />
							</div>
							<div>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontWeight: 700,
										fontSize: "15px",
										color: "var(--ink)",
									}}
								>
									<span>
										{accountStatus?.connected
											? `Аккаунт подключен: ${accountStatus.account?.phone}`
											: "Личный аккаунт не подключен"}
									</span>
									<span
										className={`tg-status-badge ${accountStatus?.connected ? "online" : "offline"}`}
									>
										<span
											className={`tg-pulse-dot ${accountStatus?.connected ? "pulse" : ""}`}
										/>
										<span>{accountStatus?.connected ? "Онлайн" : "Офлайн"}</span>
									</span>
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
									{accountStatus?.connected
										? `Сессия MTProto активна • ${accountStatus.account?.firstName} ${accountStatus.account?.lastName ?? ""}`
										: "Прямая отправка сообщений от имени врача или администратора"}
								</div>
							</div>
						</div>

						{/* Кнопка отключения подключенного аккаунта */}
						{accountStatus?.connected && (
							<button
								type="button"
								className="tg-btn-danger"
								onClick={handleDisconnectAccount}
								disabled={isDisconnectingAccount}
								data-testid="tg-account-disconnect-btn"
							>
								<Unlink size={14} />
								<span>
									{isDisconnectingAccount ? "Отключение..." : "Отвязать аккаунт"}
								</span>
							</button>
						)}
					</div>

					{/* Карточка подключенного профиля */}
					{accountStatus?.connected && accountStatus.account && (
						<div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "16px",
									padding: "16px",
									background: "var(--paper-soft)",
									borderRadius: "12px",
									border: "1px solid var(--line)",
								}}
							>
								{accountStatus.account.avatarUrl ? (
									<img
										src={accountStatus.account.avatarUrl}
										alt="Avatar"
										className="tg-avatar-circle"
									/>
								) : (
									<div
										className="tg-avatar-circle"
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "var(--teal)",
										}}
									>
										<UserCheck size={24} />
									</div>
								)}
								<div className="tg-profile-meta">
									<div className="tg-profile-name">
										{accountStatus.account.firstName}{" "}
										{accountStatus.account.lastName}
									</div>
									<div className="tg-profile-sub">
										<span>{accountStatus.account.phone}</span>
										{accountStatus.account.username && (
											<span>• @{accountStatus.account.username}</span>
										)}
									</div>
								</div>
							</div>

							<div className="tg-info-grid" style={{ marginTop: "12px" }}>
								<div className="tg-info-item">
									<span className="tg-info-label">Статус связи</span>
									<span className="tg-info-value" style={{ color: "#10b981" }}>
										● Онлайн в сети Telegram
									</span>
								</div>
								<div className="tg-info-item">
									<span className="tg-info-label">Защита 2FA</span>
									<span className="tg-info-value">
										{accountStatus.account.is2faEnabled
											? "Включена (Облачный пароль)"
											: "Стандартная (Код из SMS/App)"}
									</span>
								</div>
								<div className="tg-info-item">
									<span className="tg-info-label">Безопасность сессии</span>
									<span className="tg-info-value">
										AES-256-GCM + AAD изоляция арендатора
									</span>
								</div>
							</div>
						</div>
					)}

					{/* Если аккаунт не подключен — выбор способа входа */}
					{!accountStatus?.connected && (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "16px",
							}}
						>
							{/* Переключатель телефон / QR */}
							<div
								style={{
									display: "flex",
									gap: "8px",
									background: "var(--paper-soft)",
									padding: "4px",
									borderRadius: "10px",
									border: "1px solid var(--line)",
									width: "fit-content",
								}}
							>
								<button
									type="button"
									className={`tg-hub-tab-btn ${accountAuthMode === "phone" ? "active" : ""}`}
									style={{ minHeight: "36px", padding: "6px 14px", fontSize: "13px" }}
									onClick={() => setAccountAuthMode("phone")}
									data-testid="tg-account-tab-phone"
								>
									<Phone size={14} />
									<span>По номеру телефона</span>
								</button>
								<button
									type="button"
									className={`tg-hub-tab-btn ${accountAuthMode === "qr" ? "active" : ""}`}
									style={{ minHeight: "36px", padding: "6px 14px", fontSize: "13px" }}
									onClick={() => setAccountAuthMode("qr")}
									data-testid="tg-account-tab-qr"
								>
									<QrCode size={14} />
									<span>По QR-коду</span>
								</button>
							</div>

							{/* --- РЕЖИМ 1: ПО НОМЕРУ ТЕЛЕФОНА --- */}
							{accountAuthMode === "phone" && (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "14px",
										maxWidth: "460px",
									}}
								>
									{/* Ввод номера */}
									{!phoneCodeHash && (
										<div className="tg-form-group">
											<label
												htmlFor="tg-account-phone-input"
												style={{
													fontSize: "13px",
													fontWeight: 600,
													color: "var(--ink)",
												}}
											>
												Номер телефона врача или клиники
											</label>
											<div className="tg-input-wrapper">
												<input
													id="tg-account-phone-input"
													type="tel"
													className="tg-text-input"
													placeholder="+7 (999) 000-00-00"
													value={phoneInput}
													onChange={handlePhoneChange}
													data-testid="tg-account-phone-input"
												/>
											</div>
											<div style={{ fontSize: "12px", color: "var(--muted)" }}>
												Telegram отправит 5-значный проверочный код в приложение.
											</div>

											<button
												type="button"
												className="tg-btn-primary"
												style={{ marginTop: "8px" }}
												onClick={handleRequestCode}
												disabled={isRequestingCode || !phoneInput.trim()}
												data-testid="tg-account-request-code-btn"
											>
												{isRequestingCode ? (
													<RefreshCw size={16} className="animate-spin" />
												) : (
													<Send size={16} />
												)}
												<span>
													{isRequestingCode ? "Отправка кода..." : "Получить код"}
												</span>
											</button>
										</div>
									)}

									{/* Ввод 5-значного кода */}
									{phoneCodeHash && !requires2fa && (
										<div
											className="tg-form-group"
											style={{
												background: "var(--paper-soft)",
												padding: "16px",
												borderRadius: "12px",
												border: "1px solid var(--line)",
											}}
										>
											<div
												style={{
													fontSize: "14px",
													fontWeight: 600,
													color: "var(--ink)",
													textAlign: "center",
												}}
											>
												Введите 5-значный код из Telegram
											</div>
											<div
												style={{
													fontSize: "12px",
													color: "var(--muted)",
													textAlign: "center",
													marginTop: "4px",
												}}
											>
												Отправлен на номер <strong>{phoneInput}</strong>
											</div>

											{/* 5 инпутов для цифр кода */}
											<div className="tg-code-input-row">
												{codeDigits.map((digit, idx) => (
													<input
														// biome-ignore lint/suspicious/noArrayIndexKey: fixed 5 slots
														key={idx}
														ref={(el) => {
															digitInputRefs.current[idx] = el;
														}}
														type="text"
														inputMode="numeric"
														maxLength={1}
														className="tg-digit-input"
														value={digit}
														onChange={(e) => handleDigitChange(idx, e.target.value)}
														onKeyDown={(e) => handleDigitKeyDown(idx, e)}
														data-testid={`tg-code-digit-${idx}`}
													/>
												))}
											</div>

											{/* Тестовый чип для быстрой подстановки в деве */}
											{testCodePreset && (
												<div
													style={{
														display: "flex",
														justifyContent: "center",
														marginBottom: "8px",
													}}
												>
													<div
														className="tg-testcode-chip"
														onClick={() => {
															const parts = testCodePreset.split("");
															setCodeDigits(parts);
															handleVerifyCode(testCodePreset);
														}}
														title="Нажмите для автоматического ввода тестового кода"
													>
														<span>Тестовый код: {testCodePreset} (ввести в 1 клик)</span>
													</div>
												</div>
											)}

											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													fontSize: "12px",
													color: "var(--muted)",
													marginTop: "8px",
												}}
											>
												<span>
													{codeTimerSeconds > 0
														? `Повтор через ${codeTimerSeconds} сек.`
														: "Код истек"}
												</span>
												{codeTimerSeconds <= 0 && (
													<button
														type="button"
														style={{
															background: "none",
															border: "none",
															color: "var(--teal)",
															fontWeight: 600,
															cursor: "pointer",
														}}
														onClick={handleRequestCode}
													>
														Отправить повторно
													</button>
												)}
											</div>

											<div
												style={{
													display: "flex",
													gap: "10px",
													marginTop: "14px",
												}}
											>
												<button
													type="button"
													className="tg-btn-primary"
													style={{ width: "100%" }}
													onClick={() => handleVerifyCode()}
													disabled={
														isVerifyingCode || codeDigits.some((d) => d === "")
													}
													data-testid="tg-account-verify-code-btn"
												>
													{isVerifyingCode ? (
														<RefreshCw size={16} className="animate-spin" />
													) : (
														<Check size={16} />
													)}
													<span>
														{isVerifyingCode
															? "Проверка кода..."
															: "Подтвердить код"}
													</span>
												</button>
												<button
													type="button"
													className="tg-btn-secondary"
													onClick={() => setPhoneCodeHash(null)}
												>
													Назад
												</button>
											</div>
										</div>
									)}

									{/* Ввод 2FA пароля (если облачный пароль включен) */}
									{requires2fa && (
										<div
											className="tg-form-group"
											style={{
												background: "var(--paper-soft)",
												padding: "16px",
												borderRadius: "12px",
												border: "1px solid var(--line)",
											}}
										>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "8px",
													color: "var(--ink)",
													fontWeight: 700,
													fontSize: "14px",
												}}
											>
												<Lock size={16} color="var(--teal)" />
												<span>Двухфакторная аутентификация (2FA)</span>
											</div>
											<div
												style={{
													fontSize: "12px",
													color: "var(--muted)",
													marginTop: "2px",
												}}
											>
												На вашем Telegram-аккаунте установлен облачный пароль.
												Введите его для завершения входа.
											</div>

											<div className="tg-input-wrapper" style={{ marginTop: "10px" }}>
												<input
													type={showPassword2fa ? "text" : "password"}
													className="tg-text-input"
													placeholder="Облачный пароль Telegram"
													value={password2fa}
													onChange={(e) => setPassword2fa(e.target.value)}
													data-testid="tg-account-2fa-input"
												/>
												<button
													type="button"
													className="tg-input-icon-btn"
													onClick={() => setShowPassword2fa(!showPassword2fa)}
													title={showPassword2fa ? "Скрыть" : "Показать"}
												>
													{showPassword2fa ? <EyeOff size={16} /> : <Eye size={16} />}
												</button>
											</div>

											<div
												style={{
													display: "flex",
													gap: "10px",
													marginTop: "14px",
												}}
											>
												<button
													type="button"
													className="tg-btn-primary"
													style={{ width: "100%" }}
													onClick={handleVerify2fa}
													disabled={isVerifying2fa || !password2fa.trim()}
													data-testid="tg-account-verify-2fa-btn"
												>
													{isVerifying2fa ? (
														<RefreshCw size={16} className="animate-spin" />
													) : (
														<ShieldCheck size={16} />
													)}
													<span>
														{isVerifying2fa
															? "Проверка пароля..."
															: "Войти с 2FA"}
													</span>
												</button>
												<button
													type="button"
													className="tg-btn-secondary"
													onClick={() => setRequires2fa(false)}
												>
													Отмена
												</button>
											</div>
										</div>
									)}
								</div>
							)}

							{/* --- РЕЖИМ 2: ПО QR-КОДУ --- */}
							{accountAuthMode === "qr" && (
								<div className="tg-qr-layout">
									{/* Окно QR-кода */}
									<div className="tg-qr-box">
										<div className="tg-qr-white-card">
											{qrData?.svg ? (
												<div
													// biome-ignore lint/security/noDangerouslySetInnerHtml: safe SVG string generated by backend
													dangerouslySetInnerHTML={{ __html: qrData.svg }}
													style={{ width: "100%", height: "100%" }}
												/>
											) : (
												<div
													style={{
														display: "flex",
														flexDirection: "column",
														alignItems: "center",
														gap: "8px",
														color: "var(--muted)",
														fontSize: "13px",
													}}
												>
													<RefreshCw size={24} className="animate-spin" />
													<span>Генерация QR...</span>
												</div>
											)}
										</div>

										<div
											style={{
												display: "flex",
												gap: "8px",
												width: "100%",
												justifyContent: "center",
											}}
										>
											<button
												type="button"
												className="tg-btn-secondary"
												style={{
													minHeight: "36px",
													padding: "6px 12px",
													fontSize: "12px",
												}}
												onClick={handleRequestQr}
												disabled={isRequestingQr}
											>
												<RefreshCw
													size={12}
													className={isRequestingQr ? "animate-spin" : ""}
												/>
												<span>Обновить QR-код</span>
											</button>
											<button
												type="button"
												className="tg-btn-primary"
												style={{
													minHeight: "36px",
													padding: "6px 14px",
													fontSize: "12px",
												}}
												onClick={handleConfirmQr}
												disabled={isConfirmingQr}
											>
												<Check size={12} />
												<span>Я отсканировал</span>
											</button>
										</div>
									</div>

									{/* Инструкции по сканированию */}
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "14px",
										}}
									>
										<div
											style={{
												fontWeight: 700,
												fontSize: "16px",
												color: "var(--ink)",
											}}
										>
											Быстрый вход через мобильное приложение Telegram
										</div>
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: "10px",
											}}
										>
											<div className="tg-guide-step">
												<div className="tg-step-badge">1</div>
												<div className="tg-step-text">
													Откройте <strong>Telegram</strong> на смартфоне.
												</div>
											</div>
											<div className="tg-guide-step">
												<div className="tg-step-badge">2</div>
												<div className="tg-step-text">
													Перейдите в <strong>Настройки → Устройства</strong> (или
													«Устройства и сеансы»).
												</div>
											</div>
											<div className="tg-guide-step">
												<div className="tg-step-badge">3</div>
												<div className="tg-step-text">
													Нажмите <strong>«Подключить устройство»</strong> и
													наведите камеру на QR-код слева.
												</div>
											</div>
										</div>

										<div
											style={{
												fontSize: "12px",
												color: "var(--muted)",
												background: "var(--paper-soft)",
												padding: "10px 14px",
												borderRadius: "8px",
												border: "1px solid var(--line)",
											}}
										>
											Сессия сохраняется в защищенном хранилище и используется
											только для разрешенных клинических сообщений.
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
