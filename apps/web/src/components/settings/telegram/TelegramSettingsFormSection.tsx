import type { DenteTelegramFeature } from "@dental/shared";
import { ExternalLink } from "lucide-react";
import React, { type ChangeEvent, useState } from "react";
import { PatientCabinetModal } from "../../portal/patientCabinet/PatientCabinetModal";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export interface TelegramSettingsFormSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: integration with legacy settings props bag
	props: any;
}

export function TelegramSettingsFormSection({
	props,
}: TelegramSettingsFormSectionProps) {
	const {
		updateTelegramPostVisitCheckupDelayDraft,
		telegramPostVisitCheckupDelayFields,
		telegramVisualCardFields,
		telegramFeatureHelp,
		setTelegramMapsUrlDraft,
		markTelegramSettingsDirty,
		saveTelegramSettings,
		isTelegramSettingsSaving,
		telegramSettingsSaveState,
		telegramSettingsSaveError,
		telegramSettingsDirty,
		telegramModeLabels = {
			shared_dente_bot: "Общий бот DENTE",
			disabled: "Отключен",
			clinic_owned_bot: "Собственный бот клиники",
		},
		telegramModeDraft,
		setTelegramModeDraft,
		normalizedTelegramBotMode,
		telegramModeHints = {},
		telegramBotUsernameDraft,
		setTelegramBotUsernameDraft,
		telegramOwnBotUsernameDraft,
		setTelegramOwnBotUsernameDraft,
		telegramBotConfigId,
		setTelegramBotConfigId,
		telegramWebhookBaseUrlDraft,
		setTelegramWebhookBaseUrlDraft,
		telegramPatientPortalBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		telegramWelcomeImageUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		telegramTokenTtlDraft,
		setTelegramTokenTtlDraft,
		telegramReminderLeadTimesDraft,
		setTelegramReminderLeadTimesDraft,
		telegramReviewRequestDelayDraft,
		setTelegramReviewRequestDelayDraft,
		typedTelegramPostVisitCheckupDelayDrafts = {},
		telegramStaffEscalationChannelDraft,
		setTelegramStaffEscalationChannelDraft,
		telegramPrivacyModeLabels = {
			no_phi_by_default: "Без ПДн по умолчанию",
			limited_admin_only: "Ограниченный (только для админа)",
			consented_phi_templates: "Шаблоны с ПДн (с согласия)",
		},
		telegramPrivacyModeDraft,
		setTelegramPrivacyModeDraft,
		normalizedTelegramPrivacyMode,
		telegramPrivacyModeHints = {},
		typedTelegramFeatureOptions = [],
		typedTelegramEnabledFeaturesDraft = [],
		toggleTelegramFeature,
		telegramFeatureLabel,
		telegramAllowVoiceIntakeDraft,
		setTelegramAllowVoiceIntakeDraft,
		setTelegramEnabledFeaturesDraft,
		telegramVisualCardUrlDrafts = {},
		updateTelegramVisualCardUrlDraft,
		telegramReviewUrlDraft,
		setTelegramReviewUrlDraft,
		telegramMapsUrlDraft,
	} = props;

	const [showPatientPortalPreview, setShowPatientPortalPreview] =
		useState(false);

	const typedTelegramPostVisitCheckupDelayFields =
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(telegramPostVisitCheckupDelayFields || []) as any[];

	const typedTelegramVisualCardFields =
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(telegramVisualCardFields || []) as any[];
	const typedTelegramFeatureHelp = (telegramFeatureHelp || {}) as Record<
		DenteTelegramFeature,
		string
	>;

	return (
		<>
			<div className="telegram-settings-form">
				<div className="settings-field">
					<span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
						Режим бота
					</span>
					<div className="flex gap-2 flex-wrap mb-1">
						{[
							{
								value: "shared_dente_bot",
								label:
									telegramModeLabels?.shared_dente_bot ?? "Общий бот DENTE",
							},
							{
								value: "disabled",
								label: telegramModeLabels?.disabled ?? "Отключен",
							},
							{
								value: "clinic_owned_bot",
								label:
									telegramModeLabels?.clinic_owned_bot ??
									"Собственный бот клиники",
							},
						].map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => {
									setTelegramModeDraft(normalizedTelegramBotMode(option.value));
									markTelegramSettingsDirty();
								}}
								className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
									telegramModeDraft === option.value
										? "bg-[var(--teal)] text-white border-[var(--teal-dark)]"
										: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
								}`}
							>
								{option.label}
							</button>
						))}
					</div>
					<small className="field-note">
						{telegramModeHints?.[telegramModeDraft] ?? ""}
					</small>
				</div>
				<label htmlFor="telegram-bot-username-draft">
					Имя общего бота в Telegram
					<input
						id="telegram-bot-username-draft"
						inputMode="text"
						placeholder="dentecrm_bot"
						value={telegramBotUsernameDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramBotUsernameDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<label htmlFor="telegram-own-bot-username-draft">
					Имя бота клиники в Telegram
					<input
						id="telegram-own-bot-username-draft"
						inputMode="text"
						placeholder="clinic_bot"
						value={telegramOwnBotUsernameDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramOwnBotUsernameDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<label htmlFor="telegram-bot-config-id">
					Профиль бота клиники
					<input
						id="telegram-bot-config-id"
						inputMode="text"
						placeholder="clinic-main"
						value={telegramBotConfigId}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							setTelegramBotConfigId(event.target.value)
						}
					/>
					<small>
						Если у клиники один бот, оставьте основной профиль. Для нескольких
						ботов используйте понятную метку вроде clinic-main.
					</small>
				</label>
				<label htmlFor="telegram-webhook-base-url-draft">
					Адрес приема сообщений Telegram
					<input
						id="telegram-webhook-base-url-draft"
						type="url"
						inputMode="url"
						placeholder="https://crm.clinic.ru"
						value={telegramWebhookBaseUrlDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramWebhookBaseUrlDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
					<small>
						Публичный HTTPS-адрес CRM, который Telegram сможет открыть для
						входящих сообщений.
					</small>
				</label>
				<label>
					Портал пациента
					<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
						<input
							type="url"
							inputMode="url"
							placeholder="https://portal.example"
							value={telegramPatientPortalBaseUrlDraft}
							onChange={(event: ChangeEvent<HTMLInputElement>) => {
								setTelegramPatientPortalBaseUrlDraft(event.target.value);
								markTelegramSettingsDirty();
							}}
						/>
						<button
							type="button"
							className="secondary-button"
							style={{ whiteSpace: "nowrap" }}
							onClick={() => setShowPatientPortalPreview(true)}
						>
							<ExternalLink size={14} /> Предпросмотр
						</button>
					</div>
				</label>

				{showPatientPortalPreview && (
					<PatientCabinetModal
						isOpen={showPatientPortalPreview}
						onClose={() => setShowPatientPortalPreview(false)}
					/>
				)}

				<label htmlFor="telegram-welcome-image-url-draft">
					Картинка приветствия
					<input
						id="telegram-welcome-image-url-draft"
						type="url"
						inputMode="url"
						placeholder="https://.../welcome.jpg"
						value={telegramWelcomeImageUrlDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramWelcomeImageUrlDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<label htmlFor="telegram-token-ttl-draft">
					Срок QR-кода, минут
					<input
						id="telegram-token-ttl-draft"
						type="number"
						min={5}
						max={1440}
						step={5}
						value={telegramTokenTtlDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramTokenTtlDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<label htmlFor="telegram-reminder-lead-times-draft">
					Напоминания до приема, часы
					<input
						id="telegram-reminder-lead-times-draft"
						inputMode="text"
						placeholder="24, 2"
						value={telegramReminderLeadTimesDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramReminderLeadTimesDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
					<small>
						Напоминания до приема в часах: от 1 до 168, максимум 6 значений.
					</small>
				</label>
				<label htmlFor="telegram-review-request-delay-draft">
					Просьба оценить клинику, часы после визита
					<input
						id="telegram-review-request-delay-draft"
						type="number"
						min={1}
						max={720}
						step={1}
						value={telegramReviewRequestDelayDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramReviewRequestDelayDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
					<small>
						Клиника сама выбирает момент просьбы оставить отзыв: от 1 до 720
						часов после закрытого визита или оплаты.
					</small>
				</label>
				<fieldset className="telegram-checkup-delay-fields full">
					<legend>Контроль после лечения</legend>
					<small>
						Настраивается для каждой клиники. Бот отправит короткий вопрос о
						самочувствии через выбранное число часов после памятки.
					</small>
					{typedTelegramPostVisitCheckupDelayFields.map((field) => (
						<label
							htmlFor={`telegram-checkup-delay-${field.key}`}
							key={field.key}
						>
							{field.label}
							<input
								id={`telegram-checkup-delay-${field.key}`}
								type="number"
								min={1}
								max={720}
								step={1}
								value={typedTelegramPostVisitCheckupDelayDrafts[field.key]}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									updateTelegramPostVisitCheckupDelayDraft(
										field.key,
										event.target.value,
									)
								}
							/>
							<small>{field.help}</small>
						</label>
					))}
				</fieldset>
				<label htmlFor="telegram-staff-escalation-channel-draft">
					Канал эскалации
					<input
						id="telegram-staff-escalation-channel-draft"
						inputMode="text"
						placeholder="@clinic_admins"
						value={telegramStaffEscalationChannelDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramStaffEscalationChannelDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<div className="settings-field">
					<span
						className="field-label"
						style={{
							fontSize: "14px",
							fontWeight: 600,
							color: "var(--slate-700)",
							display: "block",
							marginBottom: "8px",
						}}
					>
						Приватность
					</span>
					<div
						style={{
							display: "flex",
							gap: "8px",
							flexWrap: "wrap",
							marginBottom: "4px",
						}}
					>
						{[
							{
								value: "no_phi_by_default",
								label:
									telegramPrivacyModeLabels?.no_phi_by_default ??
									"Без ПДн по умолчанию",
							},
							{
								value: "limited_admin_only",
								label:
									telegramPrivacyModeLabels?.limited_admin_only ??
									"Ограниченный (только для админа)",
							},
							{
								value: "consented_phi_templates",
								label:
									(telegramPrivacyModeLabels?.consented_phi_templates ??
										"Шаблоны с ПДн (с согласия)") + " (после аудита)",
							},
						].map((option) => {
							const isActive = telegramPrivacyModeDraft === option.value;
							const isConsented = option.value === "consented_phi_templates";
							return (
								<button
									key={option.value}
									type="button"
									className={`quick-chip ${isActive ? "active" : ""}`}
									onClick={() => {
										if (isConsented) return;
										setTelegramPrivacyModeDraft(
											normalizedTelegramPrivacyMode(option.value),
										);
										markTelegramSettingsDirty();
									}}
									disabled={isConsented}
									style={{
										background: isActive
											? "var(--brand-500)"
											: "var(--slate-100)",
										color: isActive
											? "var(--on-teal, #ffffff)"
											: "var(--slate-700)",
										padding: "6px 12px",
										borderRadius: "16px",
										border: "none",
										cursor: isConsented ? "not-allowed" : "pointer",
										fontSize: "14px",
										opacity: isConsented ? 0.5 : 1,
									}}
								>
									{option.label}
								</button>
							);
						})}
					</div>
					<small className="field-note">
						{telegramPrivacyModeHints?.[telegramModeDraft] ?? ""}
					</small>
				</div>
			</div>

			<fieldset
				className="telegram-feature-grid"
				aria-label="Функции Telegram"
				style={{ border: "none", padding: 0, margin: 0 }}
			>
				{typedTelegramFeatureOptions.map((feature: DenteTelegramFeature) => (
					<label
						htmlFor={`telegram-feature-${feature}`}
						className={
							typedTelegramEnabledFeaturesDraft.includes(feature)
								? "feature-enabled"
								: ""
						}
						key={feature}
					>
						<input
							id={`telegram-feature-${feature}`}
							type="checkbox"
							className="toggle-switch"
							checked={typedTelegramEnabledFeaturesDraft.includes(feature)}
							onChange={() => toggleTelegramFeature(feature)}
						/>
						<span>
							<strong>{telegramFeatureLabel(feature)}</strong>
							<small>{typedTelegramFeatureHelp[feature]}</small>
						</span>
					</label>
				))}
			</fieldset>

			<label
				htmlFor="telegram-allow-voice-intake-draft"
				className="telegram-voice-toggle"
			>
				<input
					id="telegram-allow-voice-intake-draft"
					type="checkbox"
					className="toggle-switch"
					checked={telegramAllowVoiceIntakeDraft}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						const checked = event.target.checked;
						setTelegramAllowVoiceIntakeDraft(checked);
						if (
							checked &&
							!typedTelegramEnabledFeaturesDraft.includes("voice_note_intake")
						) {
							setTelegramEnabledFeaturesDraft(
								(current: DenteTelegramFeature[]) => [
									...current,
									"voice_note_intake",
								],
							);
						}
						markTelegramSettingsDirty();
					}}
				/>
				<span>
					<strong>Разрешить голосовые обращения</strong>
					<small>
						Даже при включении бот не отправляет диагнозы и файлы в Telegram.
					</small>
				</span>
			</label>

			<div className="telegram-visual-card-fields">
				{typedTelegramVisualCardFields.map((field) => (
					<label htmlFor={`telegram-visual-card-${field.key}`} key={field.key}>
						{field.label}
						<input
							id={`telegram-visual-card-${field.key}`}
							type="url"
							inputMode="url"
							placeholder={field.placeholder}
							value={telegramVisualCardUrlDrafts[field.key] ?? ""}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								updateTelegramVisualCardUrlDraft(field.key, event.target.value)
							}
						/>
						<small>
							{field.help} Если поле пустое, используется картинка приветствия.
						</small>
					</label>
				))}
			</div>

			<div className="telegram-external-links">
				<label htmlFor="telegram-review-url-draft">
					Ссылка на отзыв
					<input
						id="telegram-review-url-draft"
						type="url"
						inputMode="url"
						placeholder="https://..."
						value={telegramReviewUrlDraft}
						onChange={(event: TextInputChangeEvent) => {
							setTelegramReviewUrlDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<label htmlFor="telegram-maps-url-draft">
					Ссылка на карту
					<input
						id="telegram-maps-url-draft"
						type="url"
						inputMode="url"
						placeholder="https://..."
						value={telegramMapsUrlDraft}
						onChange={(event: TextInputChangeEvent) => {
							setTelegramMapsUrlDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void saveTelegramSettings()}
					disabled={isTelegramSettingsSaving}
				>
					<ExternalLink aria-hidden="true" />{" "}
					{isTelegramSettingsSaving ? "..." : "Сохранить"}
				</button>
			</div>

			<p className={`telegram-save-state save-${telegramSettingsSaveState}`}>
				{telegramSettingsSaveState === "saving"
					? "Автосохранение настроек..."
					: telegramSettingsSaveState === "saved"
						? "Настройки Telegram сохранены."
						: telegramSettingsSaveState === "error"
							? (telegramSettingsSaveError ??
								"Настройки Telegram не сохранены.")
							: telegramSettingsDirty
								? "Изменения будут сохранены автоматически."
								: "Выбранная конфигурация сохранена и будет применяться до изменения."}
			</p>
		</>
	);
}
