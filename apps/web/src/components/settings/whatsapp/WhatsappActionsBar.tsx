import React from "react";
import { Check, RefreshCw, Send, Shield } from "lucide-react";
import { isWhatsappSettingsSaveDisabled } from "./utils.js";

export interface WhatsappActionsBarProps {
	dirty: boolean;
	cleanSavedNotice: boolean;
	loading: boolean;
	canSave: boolean;
	saveState: string;
	saveError: string | null;
	onReload: () => void;
	onSave: () => void;
}

export function WhatsappActionsBar({
	dirty,
	cleanSavedNotice,
	loading,
	canSave,
	saveState,
	saveError,
	onReload,
	onSave,
}: WhatsappActionsBarProps) {
	return (
		<div className="whatsapp-actions-container">
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
					onClick={onReload}
					disabled={loading}
					className="btn-secondary"
					aria-label="Обновить данные"
					title="Обновить"
				>
					<RefreshCw size={14} />
				</button>

				<button
					type="button"
					onClick={onSave}
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
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							fontWeight: 600,
						}}
					>
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

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
						gap: "8px",
					}}
				>
					<div>
						<span style={{ color: "var(--muted)", fontSize: "11px" }}>
							Имя бота (@username):
						</span>
						<div style={{ fontWeight: 600, color: "var(--ink)" }}>
							@DenteClinicBot
						</div>
					</div>
					<div>
						<span style={{ color: "var(--muted)", fontSize: "11px" }}>
							Токен доступа (BotFather):
						</span>
						<div style={{ fontFamily: "monospace", fontSize: "11px" }}>
							7189402914:AAHq_...configured
						</div>
					</div>
				</div>

				<div style={{ fontSize: "11px", color: "var(--muted)" }}>
					Используется для мгновенных push-уведомлений докторам у кресла, экстренных
					вызовов ассистента и отправки фискальных чеков пациентам.
				</div>
			</div>
		</div>
	);
}
