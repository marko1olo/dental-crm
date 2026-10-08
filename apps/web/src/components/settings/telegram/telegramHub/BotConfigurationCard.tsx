import React, { useState } from "react";
import {
	Bot,
	ChevronDown,
	ChevronUp,
	ExternalLink,
	Eye,
	EyeOff,
	Key,
	RefreshCw,
	ShieldCheck,
	Unlink,
} from "lucide-react";
import { showToast } from "../../../GlobalToast";
import { getDenteAuthHeaders } from "../../../../lib/denteRequestHeaders";
import { BOT_TOKEN_REGEX } from "./constants";
import type { BotConfigurationCardProps } from "./types";

export function BotConfigurationCard({
	clinicId,
	botStatus,
	isBotLoading,
	onRefreshStatus,
	onBotStatusChange,
}: BotConfigurationCardProps) {
	const [botTokenInput, setBotTokenInput] = useState<string>("");
	const [showBotToken, setShowBotToken] = useState<boolean>(false);
	const [isConnectingBot, setIsConnectingBot] = useState<boolean>(false);
	const [isTestingBot, setIsTestingBot] = useState<boolean>(false);
	const [isDisconnectingBot, setIsDisconnectingBot] = useState<boolean>(false);
	const [isBotGuideOpen, setIsBotGuideOpen] = useState<boolean>(true);

	const handleConnectBot = async () => {
		const token = botTokenInput.trim();
		if (!token) {
			showToast("Введите API-токен бота от @BotFather", "warning");
			return;
		}

		if (!BOT_TOKEN_REGEX.test(token)) {
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
				await onRefreshStatus();
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
				await onRefreshStatus();
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
				await onRefreshStatus();
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

	return (
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
	);
}
