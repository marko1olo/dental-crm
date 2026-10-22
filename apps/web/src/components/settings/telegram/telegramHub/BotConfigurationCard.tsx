import React, { useState } from "react";
import {
	Bot,
	Check,
	ChevronDown,
	ChevronUp,
	Copy,
	Download,
	ExternalLink,
	Eye,
	EyeOff,
	Key,
	Printer,
	QrCode,
	RefreshCw,
	ShieldCheck,
	Sparkles,
	Unlink,
	X,
} from "lucide-react";
import { generateQrCodeSvg } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
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
	const [isTableTentOpen, setIsTableTentOpen] = useState<boolean>(false);
	const [tableTentFormat, setTableTentFormat] = useState<"a5" | "a6">("a5");
	const [copiedLink, setCopiedLink] = useState<boolean>(false);

	const isDemo = isDemoShowcaseMode();
	const isConnected = Boolean(botStatus?.configured || (isDemo && !botTokenInput));
	const effectiveBot = botStatus?.bot || (isConnected ? {
		id: 7123456789,
		username: "clinic_dente_bot",
		firstName: "Стоматология DENTE",
		tokenMasked: "7123456789:AAH1bK•••••••••••••••••••••7",
		canJoinGroups: true,
		canReadAllGroupMessages: true,
		supportsInlineQueries: true,
	} : null);

	const botUsername = effectiveBot?.username || "clinic_dente_bot";
	const patientBotLink = `https://t.me/${botUsername}?start=clinic_${clinicId || "dente"}`;

	const handleConnectBot = async () => {
		const token = botTokenInput.trim();
		if (!token) {
			showToast("Введите HTTP API токен бота от @BotFather (например: 123456:ABC...)", "warning");
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
				showToast("Связь с Telegram Bot API и Webhook подтверждена", "success");
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

	const handleCopyPatientLink = async () => {
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(patientBotLink);
			}
			setCopiedLink(true);
			showToast("Ссылка для записи пациентов скопирована", "success");
			setTimeout(() => setCopiedLink(false), 2500);
		} catch {
			showToast("Не удалось скопировать ссылку", "warning");
		}
	};

	const handleDownloadQrSvg = () => {
		const svgString = generateQrCodeSvg(patientBotLink, { size: 300, margin: 2 });
		const blob = new Blob([svgString], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `dente-bot-qr-${botUsername}.svg`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("QR-код сохранен в формате SVG", "success");
	};

	return (
		<div className="tg-hub-content-card" data-testid="tg-bot-pane">
			{/* Баннер статуса бота */}
			<div
				className={`tg-status-banner ${isConnected ? "connected" : "disconnected"}`}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<div
						style={{
							width: "42px",
							height: "42px",
							borderRadius: "10px",
							background: isConnected
								? "rgba(16, 185, 129, 0.15)"
								: "rgba(245, 158, 11, 0.15)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: isConnected ? "#10b981" : "#f59e0b",
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
								flexWrap: "wrap",
							}}
						>
							<span>
								{isConnected
									? `Бот подключен: @${botUsername}`
									: "Бот не подключен"}
							</span>
							<span
								className={`tg-status-badge ${isConnected ? "online" : "offline"}`}
							>
								<span
									className={`tg-pulse-dot ${isConnected ? "pulse" : ""}`}
								/>
								<span>{isConnected ? "Активен" : "Ожидает токен"}</span>
							</span>
						</div>
						<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
							{isConnected
								? `Вебхук активен • Шифрование AES-256-GCM • ID: ${effectiveBot?.id ?? "online"}`
								: "Для отправки сервисных уведомлений и напоминаний пациентам"}
						</div>
					</div>
				</div>

				{/* Кнопки действий для подключенного бота */}
				{isConnected && (
					<div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
						<button
							type="button"
							className="tg-btn-secondary"
							onClick={handleTestBot}
							disabled={isTestingBot}
							title="Проверить связь с Telegram API и Webhook"
							data-testid="tg-bot-test-btn"
						>
							<RefreshCw
								size={14}
								className={isTestingBot ? "animate-spin" : ""}
							/>
							<span>{isTestingBot ? "Проверка..." : "Проверить подключение"}</span>
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

			{/* Если подключен — параметры бота и генератор QR / тейбл-тента */}
			{isConnected && effectiveBot && (
				<>
					<div className="tg-info-grid">
						<div className="tg-info-item">
							<span className="tg-info-label">Юзернейм бота</span>
							<a
								href={`https://t.me/${botUsername}`}
								target="_blank"
								rel="noreferrer"
								className="tg-profile-link tg-info-value"
							>
								<span>@{botUsername}</span>
								<ExternalLink size={12} />
							</a>
						</div>
						<div className="tg-info-item">
							<span className="tg-info-label">Имя бота</span>
							<span className="tg-info-value">{effectiveBot.firstName}</span>
						</div>
						<div className="tg-info-item">
							<span className="tg-info-label">Зашифрованный токен</span>
							<span className="tg-info-value" style={{ fontFamily: "monospace" }}>
								{effectiveBot.tokenMasked}
							</span>
						</div>
						<div className="tg-info-item">
							<span className="tg-info-label">Возможности</span>
							<span className="tg-info-value">
								Группы: {effectiveBot.canJoinGroups ? "Да" : "—"} • Сообщения:{" "}
								{effectiveBot.canReadAllGroupMessages ? "Да" : "—"} • Inline:{" "}
								{effectiveBot.supportsInlineQueries ? "Да" : "—"}
							</span>
						</div>
					</div>

					{/* Карточка QR-кода для пациента и 1-клик печать тейбл-тента на ресепшен */}
					<div
						className="tg-patient-qr-card"
						style={{
							background: "var(--paper-soft, #f8fafc)",
							border: "1px solid var(--line, #e2e8f0)",
							borderRadius: "14px",
							padding: "20px",
							display: "grid",
							gridTemplateColumns: "160px 1fr",
							gap: "24px",
							alignItems: "center",
							boxSizing: "border-box",
						}}
					>
						{/* QR Code Container */}
						<div
							style={{
								width: "160px",
								height: "160px",
								background: "#ffffff",
								padding: "10px",
								borderRadius: "12px",
								border: "1px solid #cbd5e1",
								boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							title="Сканируйте QR-код для запуска бота"
						>
							<div
								// biome-ignore lint/security/noDangerouslySetInnerHtml: safe SVG
								dangerouslySetInnerHTML={{
									__html: generateQrCodeSvg(patientBotLink, {
										size: 140,
										margin: 1,
									}),
								}}
								style={{ width: "100%", height: "100%" }}
							/>
						</div>

						{/* Description & Action Buttons */}
						<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
							<div>
								<div
									style={{
										fontSize: "15px",
										fontWeight: 700,
										color: "var(--ink)",
										display: "flex",
										alignItems: "center",
										gap: "8px",
									}}
								>
									<QrCode size={18} color="var(--teal)" />
									<span>QR-код и тейбл-тент для стойки ресепшена</span>
								</div>
								<p
									style={{
										fontSize: "13px",
										color: "var(--muted)",
										lineHeight: "1.5",
										margin: "4px 0 0 0",
									}}
								>
									Разместите распечатанный тейбл-тент на стойке администратора. Пациенты смогут
									мгновенно записаться онлайн, подтверждать визиты и получать напоминания без звонков.
								</p>
							</div>

							<div
								style={{
									fontSize: "12px",
									background: "var(--paper)",
									padding: "6px 12px",
									borderRadius: "6px",
									border: "1px solid var(--line)",
									color: "var(--ink)",
									fontFamily: "monospace",
									wordBreak: "break-all",
								}}
							>
								{patientBotLink}
							</div>

							<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
								<button
									type="button"
									className="tg-btn-primary"
									style={{ minHeight: "36px", padding: "8px 16px", fontSize: "13px" }}
									onClick={() => setIsTableTentOpen(true)}
									title="Открыть макет тейбл-тента для печати"
									data-testid="tg-print-table-tent-btn"
								>
									<Printer size={15} />
									<span>Печать тейбл-тента (А5 / А6)</span>
								</button>
								<button
									type="button"
									className="tg-btn-secondary"
									style={{ minHeight: "36px", padding: "8px 14px", fontSize: "13px" }}
									onClick={handleCopyPatientLink}
									title="Скопировать ссылку для отправки в SMS или мессенджер"
								>
									{copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
									<span>{copiedLink ? "Скопировано!" : "Копировать ссылку"}</span>
								</button>
								<button
									type="button"
									className="tg-btn-secondary"
									style={{ minHeight: "36px", padding: "8px 14px", fontSize: "13px" }}
									onClick={handleDownloadQrSvg}
									title="Скачать векторный QR-код в формате SVG"
								>
									<Download size={14} />
									<span>Скачать SVG</span>
								</button>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Если не подключен — форма ввода токена */}
			{!isConnected && (
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
							disabled={isConnectingBot}
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

			{/* Модальное окно тейбл-тента для печати на стойку ресепшена */}
			{isTableTentOpen && (
				<div
					className="bot-modal-overlay"
					role="dialog"
					aria-modal="true"
					aria-label="Печать тейбл-тента"
					style={{ zIndex: 9999 }}
				>
					<div
						className="bot-modal-backdrop"
						onClick={() => setIsTableTentOpen(false)}
						aria-hidden="true"
					/>
					<div
						className="bot-modal-container"
						style={{ maxWidth: "560px", padding: "24px" }}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: "16px",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<Printer size={20} color="var(--teal)" />
								<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
									Печать тейбл-тента на ресепшен
								</h3>
							</div>
							<button
								type="button"
								className="bot-modal-close-btn"
								onClick={() => setIsTableTentOpen(false)}
								aria-label="Закрыть"
							>
								<X size={18} />
							</button>
						</div>

						{/* Format selector */}
						<div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
							<button
								type="button"
								className={`tg-hub-tab-btn ${tableTentFormat === "a5" ? "active" : ""}`}
								style={{ minHeight: "36px", padding: "6px 16px", fontSize: "13px" }}
								onClick={() => setTableTentFormat("a5")}
							>
								Формат А5 (148 × 210 мм)
							</button>
							<button
								type="button"
								className={`tg-hub-tab-btn ${tableTentFormat === "a6" ? "active" : ""}`}
								style={{ minHeight: "36px", padding: "6px 16px", fontSize: "13px" }}
								onClick={() => setTableTentFormat("a6")}
							>
								Формат А6 (105 × 148 мм)
							</button>
						</div>

						{/* Printable Layout Preview Card */}
						<div
							id="dente-printable-table-tent"
							style={{
								background: "#ffffff",
								color: "#0f172a",
								border: "2px dashed #94a3b8",
								borderRadius: "12px",
								padding: tableTentFormat === "a5" ? "32px 24px" : "20px 16px",
								textAlign: "center",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "12px",
								boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
							}}
						>
							<div
								style={{
									fontSize: "12px",
									fontWeight: 800,
									letterSpacing: "0.08em",
									textTransform: "uppercase",
									color: "#0d9488",
								}}
							>
								Стоматологическая клиника DENTE
							</div>

							<div
								style={{
									fontSize: tableTentFormat === "a5" ? "18px" : "15px",
									fontWeight: 800,
									lineHeight: 1.3,
									maxWidth: "380px",
								}}
							>
								Запишитесь на приём онлайн через нашего Telegram-бота
							</div>

							{/* High-Resolution QR */}
							<div
								style={{
									width: tableTentFormat === "a5" ? "180px" : "140px",
									height: tableTentFormat === "a5" ? "180px" : "140px",
									padding: "8px",
									background: "#ffffff",
									border: "1px solid #cbd5e1",
									borderRadius: "8px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									margin: "8px 0",
								}}
							>
								<div
									// biome-ignore lint/security/noDangerouslySetInnerHtml: safe SVG
									dangerouslySetInnerHTML={{
										__html: generateQrCodeSvg(patientBotLink, {
											size: tableTentFormat === "a5" ? 164 : 124,
											margin: 1,
										}),
									}}
									style={{ width: "100%", height: "100%" }}
								/>
							</div>

							<div
								style={{
									fontSize: "12px",
									color: "#475569",
									maxWidth: "340px",
									lineHeight: 1.4,
								}}
							>
								1. Наведите камеру смартфона на QR-код
								<br />
								2. Перейдите в Telegram и нажмите <strong>«Запустить»</strong>
							</div>

							<div
								style={{
									fontSize: "11px",
									fontWeight: 600,
									color: "#0f766e",
									background: "rgba(13, 148, 136, 0.1)",
									padding: "6px 14px",
									borderRadius: "20px",
								}}
							>
								@{botUsername}
							</div>
						</div>

						{/* Action Buttons */}
						<div
							style={{
								display: "flex",
								gap: "10px",
								justifyContent: "flex-end",
								marginTop: "20px",
							}}
						>
							<button
								type="button"
								className="secondary-button"
								onClick={() => setIsTableTentOpen(false)}
							>
								Отмена
							</button>
							<button
								type="button"
								className="primary-button"
								onClick={() => {
									window.print();
								}}
							>
								<Printer size={15} />
								<span>Отправить на печать</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
