import {
	Check,
	Copy,
	ExternalLink,
	RefreshCw,
	Shield,
	Wifi,
	WifiOff,
} from "lucide-react";
import type { WhatsappStaffRouting } from "../../hooks/useWhatsappSettings.js";
import { useWhatsappSettings } from "../../hooks/useWhatsappSettings.js";
import { MessengerRoutingRules } from "./MessengerRoutingRules.js";

interface StaffOption {
	id: string;
	fullName: string;
}

interface Props {
	staffOptions: StaffOption[];
	serverBaseUrl: string | undefined;
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

export function WhatsappSettingsPanel({ staffOptions, serverBaseUrl }: Props) {
	const {
		settings,
		status,
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
	} = useWhatsappSettings();

	const webhookUrl = serverBaseUrl
		? `${serverBaseUrl}/api/whatsapp/webhook`
		: `${window.location.origin}/api/whatsapp/webhook`;

	const copyWebhook = () => {
		void navigator.clipboard.writeText(webhookUrl);
	};

	const featuresChanged =
		enabledFeaturesDraft.length !== (settings?.enabledFeatures?.length ?? 0) ||
		enabledFeaturesDraft.some(
			(f) => !(settings?.enabledFeatures ?? []).includes(f),
		);

	const dirty =
		phoneNumberIdDraft !== (settings?.phoneNumberId ?? "") ||
		webhookVerifyTokenDraft !== (settings?.webhookVerifyToken ?? "") ||
		isActiveDraft !== (settings?.isActive ?? false) ||
		featuresChanged ||
		accessTokenDraft.trim() !== "";

	return (
		<section className="messenger-panel whatsapp-panel">
			<div className="messenger-panel-header">
				<div className="messenger-panel-icon whatsapp-icon" aria-hidden="true">
					WA
				</div>
				<div className="messenger-panel-title">
					<h3>WhatsApp Business</h3>
					<p>
						Подключите WhatsApp Cloud API через Meta Business Console для
						отправки напоминаний, документов и инструкций пациентам.
					</p>
				</div>
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
			</div>

			{status?.detail && (
				<p className="messenger-status-detail">{status.detail}</p>
			)}

			<div className="messenger-panel-body">
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
					<label>Webhook URL</label>
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

				<div className="form-group form-group-toggle">
					<label htmlFor="wa-active">Активен</label>
					<input
						id="wa-active"
						type="checkbox"
						checked={isActiveDraft}
						onChange={(e) => setIsActiveDraft(e.target.checked)}
					/>
				</div>

				<fieldset className="messenger-features">
					<legend>Функции бота</legend>
					<p className="messenger-features-hint">
						Выберите сценарии для автоматической отправки сообщений в WhatsApp.
					</p>
					{Object.entries(WHATSAPP_FEATURE_LABELS).map(([key, label]) => {
						const enabled = enabledFeaturesDraft.includes(key);
						return (
							<label
								key={key}
								className="feature-toggle"
								style={{
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
									margin: "8px 0",
								}}
							>
								<input
									type="checkbox"
									checked={enabled}
									onChange={() => {
										setEnabledFeaturesDraft((current) =>
											current.includes(key)
												? current.filter((f) => f !== key)
												: [...current, key],
										);
									}}
									style={{ cursor: "pointer" }}
								/>
								{label}
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
						onClick={() => void save()}
						disabled={saveState === "saving" || !dirty}
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
			</div>
		</section>
	);
}
