import React from "react";
import { Eye, EyeOff, Key, RefreshCw, ShieldCheck } from "lucide-react";

interface BotTokenInputSectionProps {
	botTokenInput: string;
	setBotTokenInput: (val: string) => void;
	showBotToken: boolean;
	setShowBotToken: (val: boolean | ((prev: boolean) => boolean)) => void;
	isConnectingBot: boolean;
	onConnectBot: () => void;
}

export function BotTokenInputSection({
	botTokenInput,
	setBotTokenInput,
	showBotToken,
	setShowBotToken,
	isConnectingBot,
	onConnectBot,
}: BotTokenInputSectionProps) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
						style={{ minHeight: "44px", fontSize: "14px" }}
						data-testid="tg-bot-token-input"
					/>
					<button
						type="button"
						className="tg-input-icon-btn"
						onClick={() => setShowBotToken((prev) => !prev)}
						title={showBotToken ? "Скрыть токен" : "Показать токен"}
						style={{ minWidth: "44px", minHeight: "44px" }}
					>
						{showBotToken ? <EyeOff size={18} /> : <Eye size={18} />}
					</button>
				</div>
				<div style={{ fontSize: "12px", color: "var(--muted)" }}>
					Токен шифруется персональным мастер-ключом клиники по стандарту AES-256-GCM.
				</div>
			</div>

			<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
				<button
					type="button"
					className="tg-btn-primary"
					onClick={onConnectBot}
					disabled={isConnectingBot}
					style={{ minHeight: "44px", padding: "10px 20px", fontSize: "14px" }}
					data-testid="tg-bot-connect-btn"
				>
					{isConnectingBot ? (
						<RefreshCw size={16} className="animate-spin" />
					) : (
						<ShieldCheck size={16} />
					)}
					<span>
						{isConnectingBot ? "Проверка и подключение..." : "Проверить и подключить бота"}
					</span>
				</button>
			</div>
		</div>
	);
}
