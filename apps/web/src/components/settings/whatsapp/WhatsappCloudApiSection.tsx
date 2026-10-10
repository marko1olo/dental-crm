import React, { useState } from "react";
import {
	Check,
	ChevronDown,
	ChevronUp,
	Copy,
	ExternalLink,
	RefreshCw,
	WifiOff,
} from "lucide-react";
import type { WabaTestResult } from "./types.js";

export interface WhatsappCloudApiSectionProps {
	phoneNumberIdDraft: string;
	onPhoneNumberIdChange: (val: string) => void;
	accessTokenDraft: string;
	onAccessTokenChange: (val: string) => void;
	hasToken?: boolean | undefined;
	wabaAccountIdDraft: string;
	onWabaAccountIdChange: (val: string) => void;
	webhookVerifyTokenDraft: string;
	onWebhookVerifyTokenChange: (val: string) => void;
	webhookUrl: string;
	onCopyWebhook: () => void;
	isTestingWaba: boolean;
	wabaTestResult: WabaTestResult | null;
	onTestWaba: () => void;
}

export function WhatsappCloudApiSection({
	phoneNumberIdDraft,
	onPhoneNumberIdChange,
	accessTokenDraft,
	onAccessTokenChange,
	hasToken,
	wabaAccountIdDraft,
	onWabaAccountIdChange,
	webhookVerifyTokenDraft,
	onWebhookVerifyTokenChange,
	webhookUrl,
	onCopyWebhook,
	isTestingWaba,
	wabaTestResult,
	onTestWaba,
}: WhatsappCloudApiSectionProps) {
	const [openWabaStep, setOpenWabaStep] = useState<number | null>(1);

	return (
		<div className="whatsapp-cloud-api-section">
			<div className="form-group">
				<label htmlFor="wa-phone-number-id">Phone Number ID</label>
				<input
					id="wa-phone-number-id"
					type="text"
					placeholder="Из Meta Business Console → WhatsApp → API Setup"
					value={phoneNumberIdDraft}
					onChange={(e) => onPhoneNumberIdChange(e.target.value)}
					autoComplete="off"
				/>
			</div>

			<div className="form-group">
				<label htmlFor="wa-access-token">
					Access Token{" "}
					{hasToken && (
						<span className="token-set-badge">установлен</span>
					)}
				</label>
				<input
					id="wa-access-token"
					type="password"
					placeholder={
						hasToken
							? "Оставьте пустым, чтобы не менять"
							: "System User Token из Meta Business Console"
					}
					value={accessTokenDraft}
					onChange={(e) => onAccessTokenChange(e.target.value)}
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
					onChange={(e) => onWabaAccountIdChange(e.target.value)}
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
					onChange={(e) => onWebhookVerifyTokenChange(e.target.value)}
					autoComplete="off"
				/>
			</div>

			<div className="form-group">
				<span>Webhook URL</span>
				<div className="webhook-url-row">
					<code className="webhook-url-code">{webhookUrl}</code>
					<button
						type="button"
						onClick={onCopyWebhook}
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
					onClick={onTestWaba}
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
							color: wabaTestResult.ok ? "var(--teal)" : "var(--danger, #991b1b)",
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
		</div>
	);
}
