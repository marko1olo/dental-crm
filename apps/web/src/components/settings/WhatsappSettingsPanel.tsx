import { useState } from "react";
import {
	Check,
	Copy,
	ExternalLink,
	HelpCircle,
	MessageCircle,
	RefreshCw,
	Shield,
	Wifi,
	WifiOff,
} from "lucide-react";
import type { WhatsappStaffRouting } from "../../hooks/useWhatsappSettings.js";
import {
	useWhatsappSettings,
	WHATSAPP_SETTINGS_PANEL_SUBJECT,
} from "../../hooks/useWhatsappSettings.js";
import { panelStateText } from "../../lib/panelStateText";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { showToast } from "../GlobalToast.js";
import {
	MessengerRoutingRules,
	messengerRoutingChanged,
} from "./MessengerRoutingRules.js";

/**
 * Вычисляет наличие несохраненных изменений в форме настроек WhatsApp.
 */
export function computeWhatsappSettingsDirty(params: {
	phoneNumberIdDraft: string;
	settingsPhoneNumberId: string | null | undefined;
	webhookVerifyTokenDraft: string;
	settingsWebhookVerifyToken: string | null | undefined;
	isActiveDraft: boolean;
	settingsIsActive: boolean | undefined;
	enabledFeaturesDraft: string[];
	settingsEnabledFeatures: string[] | undefined;
	staffRoutingDraft: WhatsappStaffRouting;
	settingsStaffRouting: WhatsappStaffRouting | undefined;
	accessTokenDraft: string;
}): boolean {
	const featuresChanged =
		params.enabledFeaturesDraft.length !==
			(params.settingsEnabledFeatures?.length ?? 0) ||
		params.enabledFeaturesDraft.some(
			(f) => !(params.settingsEnabledFeatures ?? []).includes(f),
		);

	return (
		params.phoneNumberIdDraft !== (params.settingsPhoneNumberId ?? "") ||
		params.webhookVerifyTokenDraft !==
			(params.settingsWebhookVerifyToken ?? "") ||
		params.isActiveDraft !== (params.settingsIsActive ?? false) ||
		featuresChanged ||
		messengerRoutingChanged(
			params.staffRoutingDraft,
			params.settingsStaffRouting,
		) ||
		params.accessTokenDraft.trim() !== ""
	);
}

/**
 * Проверяет, заблокирована ли кнопка сохранения настроек WhatsApp.
 * По Мандату 8e кнопка сохранения не должна блокироваться из-за отсутствия
 * изменений (!dirty). Блокировка допустима ТОЛЬКО если сохранение небезопасно
 * (!canSave — черновики ещё не прочитаны с сервера) либо уже идёт процесс сохранения (saveState === "saving").
 */
export function isWhatsappSettingsSaveDisabled(
	canSave: boolean,
	saveState: string,
): boolean {
	return !canSave || saveState === "saving";
}

interface StaffOption {
	id: string;
	fullName: string;
}

interface Props {
	staffOptions: StaffOption[];
	serverBaseUrl: string | undefined;
	useSettingsHook?: typeof useWhatsappSettings;
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

export function WhatsappSettingsPanel({
	staffOptions,
	serverBaseUrl,
	useSettingsHook = useWhatsappSettings,
}: Props) {
	const {
		settings,
		status,
		statusUnknown,
		loadState,
		loadFailureStatus,
		canSave,
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
	} = useSettingsHook();

	const [cleanSavedNotice, setCleanSavedNotice] = useState(false);

	const webhookUrl = serverBaseUrl
		? `${serverBaseUrl}/api/whatsapp/webhook`
		: `${window.location.origin}/api/whatsapp/webhook`;

	const copyWebhook = () => {
		void navigator.clipboard.writeText(webhookUrl);
	};

	/*
	 * Признак изменений. РОУТИНГ ЗДЕСЬ ОБЯЗАТЕЛЕН: без него владелец назначал,
	 * кому идут входящие сообщения пациентов, а кнопка «Сохранить» оставалась
	 * выключенной (`disabled={!dirty}`) — заполнил и сохранить нечем. Сравнение
	 * самого роутинга — в MessengerRoutingRules, рядом с его формой.
	 */
	const dirty = computeWhatsappSettingsDirty({
		phoneNumberIdDraft,
		settingsPhoneNumberId: settings?.phoneNumberId,
		webhookVerifyTokenDraft,
		settingsWebhookVerifyToken: settings?.webhookVerifyToken,
		isActiveDraft,
		settingsIsActive: settings?.isActive,
		enabledFeaturesDraft,
		settingsEnabledFeatures: settings?.enabledFeatures,
		staffRoutingDraft,
		settingsStaffRouting: settings?.staffRouting,
		accessTokenDraft,
	});

	const handleSave = () => {
		if (isWhatsappSettingsSaveDisabled(canSave, saveState)) {
			return;
		}
		if (!dirty) {
			showToast("Настройки актуальны (сохранено)", "info");
			setCleanSavedNotice(true);
			setTimeout(() => {
				setCleanSavedNotice(false);
			}, 2500);
		}
		void save();
	};

	/*
	 * ЗНАЧОК СОСТОЯНИЯ НЕ ИМЕЕТ ПРАВА ВРАТЬ. Было два состояния, и в «Не
	 * подключён» сваливался отказ проверки: /api/whatsapp/status ответил 500 или
	 * до сервера не дошли вовсе. Владелец читал «Не подключён» у рабочего канала и
	 * шёл перенастраивать то, что работает. Хук отдаёт эту разницу отдельным
	 * признаком (statusUnknown), панель обязана её показать.
	 */
	const header = (
		<div className="messenger-panel-header">
			<div className="messenger-panel-icon whatsapp-icon" aria-hidden="true">
				WA
			</div>
			<div className="messenger-panel-title">
				<h3>WhatsApp Business</h3>
				<p>
					Подключите WhatsApp Cloud API через Meta Business Console для отправки
					напоминаний, документов и инструкций пациентам.
				</p>
			</div>
			{statusUnknown ? (
				<div className="messenger-status-badge unknown">
					<HelpCircle size={14} aria-hidden="true" />
					<span>Состояние неизвестно</span>
				</div>
			) : (
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
			)}
		</div>
	);

	/*
	 * ОТКАЗ ЧТЕНИЯ — НЕ «КАНАЛ НЕ НАСТРОЕН». Панель рисовала форму при любом
	 * исходе загрузки, поэтому на отказ сервера владелец видел пустой Phone Number
	 * ID, снятые галочки функций и подпись «Не подключён» — непрочитанное
	 * выдавалось за отсутствующее. Сохранение в этом состоянии всё равно запрещено
	 * внутри хука (иначе PUT затёр бы живые настройки пустыми), так что пустая
	 * форма ещё и предлагала работу, которая не закончится сохранением.
	 */
	if (loadState.phase === "failed") {
		return (
			<section className="messenger-panel whatsapp-panel">
				{header}
				<PanelLoadFailure
					subject={WHATSAPP_SETTINGS_PANEL_SUBJECT}
					status={loadFailureStatus}
					onRetry={() => void reload()}
				/>
			</section>
		);
	}

	/* Первое чтение: показываем загрузку, а не пустую форму. При повторных
	   чтениях (после сохранения) настройки уже есть — форму не гасим. */
	if (loadState.phase === "loading" && !settings) {
		const loadingText = panelStateText(WHATSAPP_SETTINGS_PANEL_SUBJECT, {
			phase: "loading",
		});
		return (
			<section className="messenger-panel whatsapp-panel">
				{header}
				<p className="messenger-status-detail" role="status" aria-live="polite">
					{loadingText.title} {loadingText.hint}
				</p>
			</section>
		);
	}

	return (
		<section className="messenger-panel whatsapp-panel">
			{header}

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
					<span>Webhook URL</span>
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
					<div className="premium-switch">
						<input
							id="wa-active"
							type="checkbox"
							checked={isActiveDraft}
							onChange={(e) => setIsActiveDraft(e.target.checked)}
						/>
						<span className="slider"></span>
					</div>
				</div>

				<fieldset
					className="premium-feature-grid"
					aria-label="Функции WhatsApp"
					style={{ border: "none", padding: 0, margin: 0 }}
				>
					{Object.entries(WHATSAPP_FEATURE_LABELS).map(([key, label]) => {
						const enabled = enabledFeaturesDraft.includes(key);
						return (
							<label
								htmlFor={`wa-feature-${key}`}
								key={key}
								className={`premium-feature-card ${enabled ? "active" : ""}`}
							>
								<div className="premium-feature-icon">
									<MessageCircle size={24} />
								</div>
								<div className="premium-feature-content">
									<h4>{label}</h4>
									<p>Автоматическая отправка</p>
								</div>
								<div className="premium-switch">
									<input
										id={`wa-feature-${key}`}
										type="checkbox"
										checked={enabled}
										onChange={() => {
											setEnabledFeaturesDraft((current) =>
												current.includes(key)
													? current.filter((f) => f !== key)
													: [...current, key],
											);
										}}
									/>
									<span className="slider"></span>
								</div>
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
						onClick={handleSave}
						/* canSave — разрешение хука: настройки прочитаны и сохранение не
						   затрёт живые значения. По Мандату 8e (автономия врача и персонала)
						   кнопка не блокируется при !dirty, позволяя повторное сохранение
						   для синхронизации настроек или принудительного обновления вебхука. */
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
			</div>
		</section>
	);
}
