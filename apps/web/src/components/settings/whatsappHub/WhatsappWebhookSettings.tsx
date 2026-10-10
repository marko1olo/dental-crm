/**
 * @file WhatsappWebhookSettings.tsx
 * @description Card component for Official Meta WABA Cloud API configuration, webhook endpoints, and token settings.
 */

import React from "react";
import {
	Check,
	ChevronDown,
	ChevronUp,
	Copy,
	RefreshCw,
	WifiOff,
} from "lucide-react";
import type { WabaTestResult } from "./types.js";

export interface WhatsappWebhookSettingsProps {
	phoneNumberIdDraft: string;
	setPhoneNumberIdDraft: (val: string) => void;
	wabaAccountIdDraft: string;
	setWabaAccountIdDraft: (val: string) => void;
	accessTokenDraft: string;
	setAccessTokenDraft: (val: string) => void;
	webhookVerifyTokenDraft: string;
	setWebhookVerifyTokenDraft: (val: string) => void;
	webhookUrl: string;
	copyText: (text: string, label: string) => void;
	isTestingWaba: boolean;
	onTestWaba: () => void | Promise<void>;
	onSaveWaba: () => void | Promise<void>;
	wabaTestResult: WabaTestResult | null;
	openWabaStep: number | null;
	setOpenWabaStep: (step: number | null) => void;
}

export function WhatsappWebhookSettings({
	phoneNumberIdDraft,
	setPhoneNumberIdDraft,
	wabaAccountIdDraft,
	setWabaAccountIdDraft,
	accessTokenDraft,
	setAccessTokenDraft,
	webhookVerifyTokenDraft,
	setWebhookVerifyTokenDraft,
	webhookUrl,
	copyText,
	isTestingWaba,
	onTestWaba,
	onSaveWaba,
	wabaTestResult,
	openWabaStep,
	setOpenWabaStep,
}: WhatsappWebhookSettingsProps) {
	return (
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
					onClick={() => void onTestWaba()}
					disabled={isTestingWaba}
					data-testid="btn-test-waba"
				>
					<RefreshCw size={14} className={isTestingWaba ? "animate-spin" : ""} />
					<span>Проверить подключение к Meta</span>
				</button>

				<button
					type="button"
					className="btn-primary"
					onClick={() => void onSaveWaba()}
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
	);
}
