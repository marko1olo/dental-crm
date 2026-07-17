import { Bot, ShieldCheck } from "lucide-react";
import React from "react";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";

export function InlineStepTelegram() {
	const {
		telegramStatus,
		telegramBotUsernameDraft,
		setTelegramBotUsernameDraft,
		markTelegramSettingsDirty,
		telegramPatientPortalBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		telegramWelcomeImageUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		telegramReviewUrlDraft,
		setTelegramReviewUrlDraft,
		telegramMapsUrlDraft,
		setTelegramMapsUrlDraft,
		telegramTokenTtlDraft,
		setTelegramTokenTtlDraft,
		telegramReminderLeadTimesDraft,
		setTelegramReminderLeadTimesDraft,
		telegramReviewRequestDelayDraft,
		setTelegramReviewRequestDelayDraft,
		telegramPostVisitCheckupDelayFields,
		telegramPostVisitCheckupDelayDrafts,
		updateTelegramPostVisitCheckupDelayDraft,
		telegramAdminSecretDraft,
		setTelegramAdminSecretDraft,
		unlockTelegramAdminSession,
		telegramAdminSecretSession,
		telegramPrivacyModeDraft,
		setTelegramPrivacyModeDraft,
		normalizedTelegramPrivacyMode,
		telegramVisualCardFields,
		onboardingTelegramVisualCardKeys,
		telegramVisualCardUrlDrafts,
		updateTelegramVisualCardUrlDraft,
		telegramEnabledFeaturesDraft,
		toggleTelegramFeature,
		saveTelegramSettings,
		isTelegramSettingsSaving,
		setSettingsTab,
		telegramSettingsSaveState,
		telegramSettingsSaveError,
		telegramSettingsDirty,
		telegramFeatureLabel,
		telegramFeatureOptions,
		telegramPrivacyModeLabels,
	} = useAppLogicContext();

	return (
		<div className="onboarding-panel">
			<div>
				<h3>Telegram, QR и связь с пациентами</h3>
				<p>
					Настройте Telegram-бот сразу при первом запуске: QR-привязка пациента,
					напоминания, памятки после лечения, отзывы и ссылки на портал
					сохраняются автоматически и применяются ко всей клинике.
				</p>
			</div>
			<div className="onboarding-telegram-status">
				<span>
					Бот
					<strong>
						{telegramStatus?.botUsername
							? `@${telegramStatus.botUsername.replace(/^@/, "")}`
							: "не загружен"}
					</strong>
				</span>
				<span>
					Транспорт
					<strong>
						{telegramStatus?.webhookReady ? "готов" : "нужна проверка"}
					</strong>
				</span>
				<span>
					QR-коды
					<strong>{telegramStatus?.pendingLinkCodeCount ?? 0} ожидают</strong>
				</span>
				<span>
					Чаты
					<strong>{telegramStatus?.activeChatLinkCount ?? 0} связаны</strong>
				</span>
			</div>
			<div className="onboarding-form-grid">
				<label>
					Имя общего бота в Telegram
					<input
						value={telegramBotUsernameDraft}
						placeholder="dentecrm_bot"
						onChange={(event) => {
							setTelegramBotUsernameDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<label>
					Портал пациента
					<input
						type="url"
						inputMode="url"
						placeholder="https://portal.example"
						value={telegramPatientPortalBaseUrlDraft}
						onChange={(event) => {
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
						onChange={(event) => {
							setTelegramWelcomeImageUrlDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
				</label>
				<label>
					Ссылка на отзыв
					<input
						type="url"
						inputMode="url"
						placeholder="https://..."
						value={telegramReviewUrlDraft}
						onChange={(event) => {
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
						onChange={(event) => {
							setTelegramMapsUrlDraft(event.target.value);
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
						onChange={(event) => {
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
						onChange={(event) => {
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
						onChange={(event) => {
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
						Через сколько часов Telegram спросит пациента о самочувствии после
						выданной памятки.
					</small>
					{telegramPostVisitCheckupDelayFields.map((field) => (
						<label key={field.key}>
							{field.label}
							<input
								type="number"
								min={1}
								max={720}
								step={1}
								value={telegramPostVisitCheckupDelayDrafts[field.key]}
								onChange={(event) =>
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
					Секрет администратора клиники
					<input
						type="password"
						autoComplete="current-password"
						value={telegramAdminSecretDraft}
						onChange={(event) =>
							setTelegramAdminSecretDraft(event.target.value)
						}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								unlockTelegramAdminSession("telegram");
							}
						}}
						placeholder="если защищенные настройки включены на сервере клиники"
					/>
					<small>
						{telegramAdminSecretSession
							? "Разблокировано до перезагрузки страницы."
							: "Секрет не сохраняется в браузере."}
					</small>
				</label>
				<button
					className="secondary-button"
					type="button"
					onClick={() => unlockTelegramAdminSession("telegram")}
				>
					<ShieldCheck aria-hidden="true" /> Разблокировать
				</button>
				<label>
					Приватность
					<select
						value={telegramPrivacyModeDraft}
						onChange={(event) => {
							setTelegramPrivacyModeDraft(
								normalizedTelegramPrivacyMode(event.target.value),
							);
							markTelegramSettingsDirty();
						}}
					>
						<option value="no_phi_by_default">
							{telegramPrivacyModeLabels.no_phi_by_default}
						</option>
						<option value="limited_admin_only">
							{telegramPrivacyModeLabels.limited_admin_only}
						</option>
						<option value="consented_phi_templates" disabled>
							{telegramPrivacyModeLabels.consented_phi_templates} (после аудита)
						</option>
					</select>
				</label>
			</div>
			<div
				className="onboarding-feature-list"
				aria-label="Быстрые сценарии Telegram"
			>
				<div className="onboarding-telegram-visual-cards">
					{telegramVisualCardFields
						.filter((field) =>
							onboardingTelegramVisualCardKeys.includes(field.key),
						)
						.map((field) => (
							<label key={field.key}>
								{field.label}
								<input
									type="url"
									inputMode="url"
									placeholder={field.placeholder}
									value={telegramVisualCardUrlDrafts[field.key] ?? ""}
									onChange={(event) =>
										updateTelegramVisualCardUrlDraft(
											field.key,
											event.target.value,
										)
									}
								/>
								<small>
									{field.help} Если поле пустое, используется картинка приветствия.
								</small>
							</label>
						))}
				</div>
				{telegramFeatureOptions
					.filter((feature) =>
						[
							"patient_linking",
							"appointment_reminders",
							"appointment_confirmation",
							"document_ready_notice",
							"tax_document_request",
							"payment_reminders",
							"post_visit_instructions",
							"recalls",
							"review_requests",
							"callback_requests",
							"secure_portal_links",
							"staff_task_alerts",
							"staff_daily_digest",
						].includes(feature),
					)
					.map((feature) => (
						<label
							className={
								telegramEnabledFeaturesDraft.includes(feature) ? "active" : ""
							}
							key={feature}
						>
							<input
								type="checkbox"
								checked={telegramEnabledFeaturesDraft.includes(feature)}
								onChange={() => toggleTelegramFeature(feature)}
							/>
							<span>{telegramFeatureLabel(feature)}</span>
						</label>
					))}
			</div>
			<div className="onboarding-inline-actions">
				<button
					className="secondary-button"
					type="button"
					onClick={() => void saveTelegramSettings()}
					disabled={isTelegramSettingsSaving}
				>
					<ShieldCheck aria-hidden="true" />{" "}
					{isTelegramSettingsSaving ? "Сохраняю" : "Сохранить Telegram"}
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={() => {
						setSettingsTab("telegram");
						window.location.hash = "settings/telegram";
					}}
				>
					<Bot aria-hidden="true" /> Открыть полную панель
				</button>
				<span
					className={`telegram-save-state save-${telegramSettingsSaveState}`}
				>
					{telegramSettingsSaveState === "saving"
						? "Автосохранение..."
						: telegramSettingsSaveState === "saved"
							? "Telegram сохранен."
							: telegramSettingsSaveState === "error"
								? (telegramSettingsSaveError ?? "Telegram не сохранен.")
								: telegramSettingsDirty
									? "Изменения будут сохранены автоматически."
									: "Конфигурация Telegram сохранена."}
				</span>
			</div>
		</div>
	);
}
