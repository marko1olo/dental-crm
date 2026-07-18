import {
	Bot,
	Save,
	Send,
	FileCheck2,
	CreditCard,
	CalendarDays,
	ExternalLink,
	ClipboardCheck,
	Users,
	Image as ImageIcon,
} from "lucide-react";
import type { ChangeEvent } from "react";
import type { DenteTelegramFeature } from "@dental/shared";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function TelegramPolicyWorkbench({
	mergedProps,
	getTypedTelegramInlineButtonRows,
}: {
	mergedProps: any;
	getTypedTelegramInlineButtonRows: (replyMarkup: any) => any[];
}) {
	const {
		telegramFeaturePlanDraft,
		telegramModeDraft,
		setTelegramModeDraft,
		normalizedTelegramBotMode,
		telegramModeHints,
		telegramModeLabels,
		telegramBotUsernameDraft,
		setTelegramBotUsernameDraft,
		markTelegramSettingsDirty,
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
		telegramPostVisitCheckupDelayFields,
		typedTelegramPostVisitCheckupDelayDrafts,
		updateTelegramPostVisitCheckupDelayDraft,
		telegramStaffEscalationChannelDraft,
		setTelegramStaffEscalationChannelDraft,
		telegramPrivacyModeLabels,
		telegramPrivacyModeDraft,
		setTelegramPrivacyModeDraft,
		normalizedTelegramPrivacyMode,
		telegramPrivacyModeHints,
		typedTelegramFeatureOptions,
		typedTelegramEnabledFeaturesDraft,
		toggleTelegramFeature,
		telegramFeatureLabel,
		telegramFeatureHelp,
		telegramAllowVoiceIntakeDraft,
		setTelegramAllowVoiceIntakeDraft,
		setTelegramEnabledFeaturesDraft,
		telegramVisualCardFields,
		telegramVisualCardUrlDrafts,
		updateTelegramVisualCardUrlDraft,
		telegramReviewUrlDraft,
		setTelegramReviewUrlDraft,
		telegramMapsUrlDraft,
		setTelegramMapsUrlDraft,
		saveTelegramSettings,
		isTelegramSettingsSaving,
		telegramSettingsSaveState,
		telegramSettingsSaveError,
		telegramSettingsDirty,
		previewTelegramTemplate,
		isTelegramLoading,
		telegramPreviewLoadingGuidanceId,
		activePatient,
		telegramPreviewPatientGuidanceId,
		telegramPreviewStaffGuidanceId,
		typedTelegramLinkStaffOptions,
		telegramPreview,
		telegramTemplateLabels,
		telegramClassificationLabels,
		telegramHumanMessage,
		typedTelegramInlineButtonKindLabels,
	} = mergedProps;

	const typedTelegramFeaturePlan = telegramFeaturePlanDraft as any | null;
	const typedTelegramPostVisitCheckupDelayFields =
		telegramPostVisitCheckupDelayFields as any[];
	const typedTelegramVisualCardFields = telegramVisualCardFields as any[];
	const typedTelegramFeatureHelp = telegramFeatureHelp as Record<
		DenteTelegramFeature,
		string
	>;
	const typedTelegramPreview = telegramPreview as any | null;

	return (
		<article className="telegram-policy-panel">
			<div className="panel-heading">
				<div>
					<h3>Безопасные сценарии</h3>
					<p>
						Это не рекламная рассылка и не канал медицинских документов. Только
						уведомления и портальные ссылки.
					</p>
				</div>
				<span className="status-pill status-confirmed">
					{typedTelegramFeaturePlan?.enabledFeatures.length ?? 0}
				</span>
			</div>
			<div className="telegram-token-row">
				{(typedTelegramFeaturePlan?.patientSafeActions ?? [])
					.slice(0, 6)
					.map((action: string) => (
						<span key={action}>{action}</span>
					))}
			</div>
			<div className="telegram-blocked-list">
				{(typedTelegramFeaturePlan?.blockedByDefault ?? [])
					.slice(0, 6)
					.map((item: string) => (
						<span key={item}>{item}</span>
					))}
			</div>
			<div className="telegram-settings-form">
				<div className="settings-field">
					<span className="field-label settings-section-title">Режим бота</span>
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
								value: "shared_dente_bot",
								label: telegramModeLabels.shared_dente_bot,
							},
							{ value: "disabled", label: telegramModeLabels.disabled },
							{
								value: "clinic_owned_bot",
								label: telegramModeLabels.clinic_owned_bot,
							},
						].map((option) => (
							<button
								key={option.value}
								type="button"
								className={`quick-chip ${telegramModeDraft === option.value ? "active" : ""}`}
								onClick={() => {
									setTelegramModeDraft(normalizedTelegramBotMode(option.value));
									markTelegramSettingsDirty();
								}}
								style={{
									background:
										telegramModeDraft === option.value
											? "var(--brand-500)"
											: "var(--slate-100)",
									color:
										telegramModeDraft === option.value
											? "#fff"
											: "var(--slate-700)",
									padding: "6px 12px",
									borderRadius: "16px",
									border: "none",
									cursor: "pointer",
									fontSize: "14px",
								}}
							>
								{option.label}
							</button>
						))}
					</div>
					<small className="field-note">
						{telegramModeHints[telegramModeDraft]}
					</small>
				</div>
				<label>
					Имя общего бота в Telegram
					<input
						inputMode="text"
						placeholder="dentecrm_bot"
						value={telegramBotUsernameDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramBotUsernameDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<label>
					Имя бота клиники в Telegram
					<input
						inputMode="text"
						placeholder="clinic_bot"
						value={telegramOwnBotUsernameDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramOwnBotUsernameDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<label>
					Профиль бота клиники
					<input
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
				<label>
					Адрес приема сообщений Telegram
					<input
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
				</label>
				<label>
					Картинка приветствия
					<input
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
				<label>
					Срок QR-кода, минут
					<input
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
				<label>
					Напоминания до приема, часы
					<input
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
				<label>
					Просьба оценить клинику, часы после визита
					<input
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
						<label key={field.key}>
							{field.label}
							<input
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
				<label>
					Канал эскалации
					<input
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
					<span className="field-label settings-section-title">
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
								label: telegramPrivacyModeLabels.no_phi_by_default,
							},
							{
								value: "limited_admin_only",
								label: telegramPrivacyModeLabels.limited_admin_only,
							},
							{
								value: "consented_phi_templates",
								label:
									telegramPrivacyModeLabels.consented_phi_templates +
									" (после аудита)",
							},
						].map((option) => (
							<button
								key={option.value}
								type="button"
								className={`quick-chip ${telegramPrivacyModeDraft === option.value ? "active" : ""}`}
								onClick={() => {
									if (option.value === "consented_phi_templates") return;
									setTelegramPrivacyModeDraft(
										normalizedTelegramPrivacyMode(option.value),
									);
									markTelegramSettingsDirty();
								}}
								disabled={option.value === "consented_phi_templates"}
								style={{
									background:
										telegramPrivacyModeDraft === option.value
											? "var(--brand-500)"
											: "var(--slate-100)",
									color:
										telegramPrivacyModeDraft === option.value
											? "#fff"
											: "var(--slate-700)",
									padding: "6px 12px",
									borderRadius: "16px",
									border: "none",
									cursor:
										option.value === "consented_phi_templates"
											? "not-allowed"
											: "pointer",
									fontSize: "14px",
									opacity: option.value === "consented_phi_templates" ? 0.5 : 1,
								}}
							>
								{option.label}
							</button>
						))}
					</div>
					<small className="field-note">
						{telegramPrivacyModeHints[telegramPrivacyModeDraft]}
					</small>
				</div>
			</div>
			<div
				className="premium-feature-grid premium-feature-grid"
				aria-label="Функции Telegram"
			>
				{typedTelegramFeatureOptions.map((feature: any) => (
					<label
						className={`premium-feature-card ${
							typedTelegramEnabledFeaturesDraft.includes(feature)
								? "active"
								: ""
						}`}
						key={feature}
					>
						<div className="premium-feature-icon">
							<Bot size={24} />
						</div>
						<div className="premium-feature-content">
							<h4>{telegramFeatureLabel(feature)}</h4>
							<p>{typedTelegramFeatureHelp[feature]}</p>
						</div>
						<div className="premium-switch">
							<input
								type="checkbox"
								checked={typedTelegramEnabledFeaturesDraft.includes(feature)}
								onChange={() => toggleTelegramFeature(feature)}
							/>
							<span className="slider"></span>
						</div>
					</label>
				))}
			</div>
			<label className="telegram-voice-toggle">
				<input
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
					<label key={field.key}>
						{field.label}
						<input
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
				<label>
					Ссылка на отзыв
					<input
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
				<label>
					Ссылка на карту
					<input
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
					<Save aria-hidden="true" size={16} />{" "}
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
			<div className="telegram-preview-actions">
				<button
					className="secondary-button"
					type="button"
					onClick={() => void previewTelegramTemplate("appointment_confirmation")}
					aria-describedby={
						isTelegramLoading
							? telegramPreviewLoadingGuidanceId
							: !activePatient
								? telegramPreviewPatientGuidanceId
								: undefined
					}
					disabled={!activePatient || isTelegramLoading}
				>
					<Send aria-hidden="true" /> Прием
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void previewTelegramTemplate("document_ready_notice")}
					aria-describedby={
						isTelegramLoading
							? telegramPreviewLoadingGuidanceId
							: !activePatient
								? telegramPreviewPatientGuidanceId
								: undefined
					}
					disabled={!activePatient || isTelegramLoading}
				>
					<FileCheck2 aria-hidden="true" /> Документ
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void previewTelegramTemplate("payment_reminder_notice")}
					aria-describedby={
						isTelegramLoading
							? telegramPreviewLoadingGuidanceId
							: !activePatient
								? telegramPreviewPatientGuidanceId
								: undefined
					}
					disabled={!activePatient || isTelegramLoading}
				>
					<CreditCard aria-hidden="true" /> Оплата
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void previewTelegramTemplate("recall_notice")}
					aria-describedby={
						isTelegramLoading
							? telegramPreviewLoadingGuidanceId
							: !activePatient
								? telegramPreviewPatientGuidanceId
								: undefined
					}
					disabled={!activePatient || isTelegramLoading}
				>
					<CalendarDays aria-hidden="true" /> Профилактика
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void previewTelegramTemplate("review_request")}
					aria-describedby={
						isTelegramLoading
							? telegramPreviewLoadingGuidanceId
							: !activePatient
								? telegramPreviewPatientGuidanceId
								: undefined
					}
					disabled={!activePatient || isTelegramLoading}
				>
					<ExternalLink aria-hidden="true" /> Отзыв
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={() =>
						void previewTelegramTemplate("post_visit_instruction_link")
					}
					aria-describedby={
						isTelegramLoading
							? telegramPreviewLoadingGuidanceId
							: !activePatient
								? telegramPreviewPatientGuidanceId
								: undefined
					}
					disabled={!activePatient || isTelegramLoading}
				>
					<ClipboardCheck aria-hidden="true" /> Памятка
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void previewTelegramTemplate("post_visit_checkup")}
					aria-describedby={
						isTelegramLoading
							? telegramPreviewLoadingGuidanceId
							: !activePatient
								? telegramPreviewPatientGuidanceId
								: undefined
					}
					disabled={!activePatient || isTelegramLoading}
				>
					<ClipboardCheck aria-hidden="true" /> Контроль
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void previewTelegramTemplate("staff_daily_digest")}
					aria-describedby={
						isTelegramLoading
							? telegramPreviewLoadingGuidanceId
							: !typedTelegramLinkStaffOptions?.length
								? telegramPreviewStaffGuidanceId
								: undefined
					}
					disabled={!typedTelegramLinkStaffOptions?.length || isTelegramLoading}
				>
					<Users aria-hidden="true" /> Сводка сотруднику
				</button>
			</div>
			{isTelegramLoading ? (
				<p
					className="telegram-preview-guidance"
					id={telegramPreviewLoadingGuidanceId}
					role="status"
					aria-live="polite"
				>
					Дождитесь загрузки Telegram-панели, чтобы собрать предпросмотр.
				</p>
			) : !activePatient ? (
				<p
					className="telegram-preview-guidance"
					id={telegramPreviewPatientGuidanceId}
					role="status"
					aria-live="polite"
				>
					Выберите активного пациента, чтобы собрать пациентские
					Telegram-сценарии.
				</p>
			) : null}
			{!isTelegramLoading && !typedTelegramLinkStaffOptions?.length ? (
				<p
					className="telegram-preview-guidance"
					id={telegramPreviewStaffGuidanceId}
					role="status"
					aria-live="polite"
				>
					Добавьте сотрудника в настройках команды, чтобы собрать сводку
					сотруднику.
				</p>
			) : null}
			{typedTelegramPreview ? (
				<div className="telegram-preview-box">
					<span>
						{telegramTemplateLabels[typedTelegramPreview.templateKind]} ·{" "}
						{telegramClassificationLabels[typedTelegramPreview.classification]}
					</span>
					<p>
						{typedTelegramPreview.text ||
							telegramHumanMessage(typedTelegramPreview.blockedReason)}
					</p>
					{typedTelegramPreview.photoUrl ? (
						<div className="telegram-visual-card-preview">
							<img
								src={typedTelegramPreview.photoUrl}
								alt="Визуальная карточка Telegram"
								loading="lazy"
								decoding="async"
							/>
							<span className="telegram-visual-card-indicator">
								<ImageIcon aria-hidden="true" /> Визуальная карточка
							</span>
						</div>
					) : null}
					{getTypedTelegramInlineButtonRows(typedTelegramPreview.replyMarkup)
						.length ? (
						<div
							className="telegram-preview-buttons"
							aria-label="Кнопки Telegram-сообщения"
						>
							{getTypedTelegramInlineButtonRows(
								typedTelegramPreview.replyMarkup,
							).map((row, rowIndex) => (
								<div
									className="telegram-inline-button-row"
									key={`preview-row-${rowIndex}`}
								>
									{row.map((button: any) => (
										<span
											className="telegram-preview-button"
											key={`${button.text}:${button.target}`}
										>
											{button.text}
											<small>
												{typedTelegramInlineButtonKindLabels[button.kind]}
											</small>
										</span>
									))}
								</div>
							))}
						</div>
					) : null}
					{typedTelegramPreview.warnings.map((warning: string) => (
						<small key={warning}>{telegramHumanMessage(warning)}</small>
					))}
				</div>
			) : null}
		</article>
	);
}
