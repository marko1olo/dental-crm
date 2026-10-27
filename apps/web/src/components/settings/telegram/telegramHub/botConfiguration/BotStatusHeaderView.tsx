import React from "react";
import { Bot, RefreshCw, Unlink } from "lucide-react";
import type { BotInfo } from "./botConfigTypes";

interface BotStatusHeaderViewProps {
	isConnected: boolean;
	botUsername: string;
	effectiveBot: BotInfo | null;
	isTestingBot: boolean;
	isDisconnectingBot: boolean;
	onTestBot: () => void;
	onDisconnectBot: () => void;
}

export function BotStatusHeaderView({
	isConnected,
	botUsername,
	effectiveBot,
	isTestingBot,
	isDisconnectingBot,
	onTestBot,
	onDisconnectBot,
}: BotStatusHeaderViewProps) {
	return (
		<div className={`tg-status-banner ${isConnected ? "connected" : "disconnected"}`}>
			<div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
				<div
					style={{
						width: "44px",
						height: "44px",
						borderRadius: "12px",
						background: isConnected ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: isConnected ? "#10b981" : "#f59e0b",
						flexShrink: 0,
					}}
				>
					<Bot size={22} />
				</div>
				<div style={{ minWidth: 0 }}>
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
						<span>{isConnected ? `Бот подключен: @${botUsername}` : "Бот не подключен"}</span>
						<span className={`tg-status-badge ${isConnected ? "online" : "offline"}`}>
							<span className={`tg-pulse-dot ${isConnected ? "pulse" : ""}`} />
							<span>{isConnected ? "Активен" : "Ожидает токен"}</span>
						</span>
					</div>
					<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
						{isConnected
							? `Связь активна • Шифрование AES-256-GCM • ID: ${effectiveBot?.id ?? "онлайн"}`
							: "Для автоматической отправки уведомлений и сервисных напоминаний"}
					</div>
				</div>
			</div>

			{isConnected && (
				<div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
					<button
						type="button"
						className="tg-btn-secondary"
						onClick={onTestBot}
						disabled={isTestingBot}
						style={{ minHeight: "44px", padding: "8px 16px" }}
						title="Проверить связь с Telegram API и Webhook"
						data-testid="tg-bot-test-btn"
					>
						<RefreshCw size={15} className={isTestingBot ? "animate-spin" : ""} />
						<span>{isTestingBot ? "Проверка..." : "Проверить подключение"}</span>
					</button>
					<button
						type="button"
						className="tg-btn-danger"
						onClick={onDisconnectBot}
						disabled={isDisconnectingBot}
						style={{ minHeight: "44px", padding: "8px 16px" }}
						title="Отключить бота от клиники"
						data-testid="tg-bot-disconnect-btn"
					>
						<Unlink size={15} />
						<span>Отключить</span>
					</button>
				</div>
			)}
		</div>
	);
}
