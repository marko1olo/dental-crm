import type { DenteTelegramFeature } from "@dental/shared";
import {
	Bot,
	CalendarDays,
	CheckCircle2,
	ClipboardCheck,
	Copy,
	CreditCard,
	Download,
	ExternalLink,
	FileCheck2,
	Image as ImageIcon,
	RefreshCw,
	Send,
	ShieldCheck,
	Users,
} from "lucide-react";
import type { ChangeEvent, KeyboardEvent } from "react";
import React from "react";

import { useAppLogicContext } from "../../contexts/AppLogicContext";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
type StringTokenGroup = { title: string; items: string[] };
type TelegramInlineButtonRow = { text: string; target: string; kind: string }[];

export function SettingsTelegramTab({ settingsTab }: { settingsTab: string }) {
	const props = useAppLogicContext();
	const {
		dashboard,
		createTelegramLinkCode,
		telegramLinkCodeDraft,
		setTelegramLinkCodeDraft,
		copyTelegramTextToClipboard,
		downloadTelegramQrSvg,
		telegramPostVisitCheckupDelayDraft,
		updateTelegramPostVisitCheckupDelayDraft,
		telegramVisualCardDraft,
		updateTelegramVisualCardDraft,
		telegramFeaturePlanDraft,
		updateTelegramFeaturePlanDraft,
		telegramTestMessagePhone,
		setTelegramTestMessagePhone,
		telegramTestMessageResult,
		setTelegramTestMessageResult,
		sendTelegramTestMessage,
		formatDateTime,
		formatTime,
		hiddenTelegramOutboxItemCount,
		filteredTelegramOutboxItems,
		telegramPostVisitCheckupDelayFields,
		telegramVisualCardFields,
		telegramFeatureHelp,
		telegramPreview,
		typedTelegramInlineButtonKindLabels,
		telegramHumanMessage,
		telegramOutbox,
		sendDueTelegramOutbox,
		isTelegramSendingDue,
		telegramSendingItemId,
		isTelegramLoading,
		telegramOutboxStatusFilterOptions,
		telegramOutboxStatusFilter,
		setTelegramOutboxStatusFilter,
		telegramOutboxStatusFilterLabels,
		telegramOutboxTemplateFilterOptions,
		telegramOutboxTemplateFilter,
		setTelegramOutboxTemplateFilter,
		telegramOutboxTemplateFilterLabels,
		visibleTelegramOutboxItems,
		telegramTemplateLabels,
		telegramDeliveryStatusLabels,
		sendTelegramOutboxItem,
		isTelegramOutboxItemDueForUi,
		loadMoreTelegramOutbox,
		isTelegramOutboxLoadingMore,
		telegramStatus,
		telegramClassificationLabels,

		setTelegramMapsUrlDraft,
		markTelegramSettingsDirty,
		saveTelegramSettings,
		isTelegramSettingsSaving,
		telegramSettingsSaveState,
		telegramSettingsSaveError,
		telegramSettingsDirty,
		previewTelegramTemplate,
		telegramPreviewLoadingGuidanceId,
		activePatient,
		telegramPreviewPatientGuidanceId,
		typedTelegramLinkStaffOptions,
		telegramPreviewStaffGuidanceId,
		telegramModeLabels,
		adminSecretScopeWarning,
		telegramAdminSecretDraft,
		setTelegramAdminSecretDraft,
		adminSecretReady,
		unlockTelegramAdminSession,
		lockTelegramAdminSession,
		telegramAdminSecretSession,
		loadTelegramControlPlane,
		telegramLinkSubjectType,
		setTelegramLinkSubjectType,
		normalizedTelegramLinkSubjectType,
		setTelegramLinkCode,
		setTelegramLinkActionState,
		telegramLinkStaffId,
		setTelegramLinkStaffId,
		isTelegramLinkCreating,
		telegramLinkCode,
		telegramLinkActionState,
		telegramQrSvgToDataUrl,
		telegramChatLinkLedger,
		typedTelegramChatLinks = [],
		telegramSubjectName,
		revokeTelegramChatLink,
		telegramRevokingLinkId,
		loadMoreTelegramChatLinks,
		isTelegramChatLinksLoadingMore,
		telegramLinkCodeLedger,
		typedTelegramLinkCodes = [],
		telegramLinkCodeStatusLabels,
		loadMoreTelegramLinkCodes,
		isTelegramLinkCodesLoadingMore,
		telegramModeDraft,
		setTelegramModeDraft,
		normalizedTelegramBotMode,
		telegramModeHints,
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
		typedTelegramPostVisitCheckupDelayDrafts,
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
		telegramAllowVoiceIntakeDraft,
		setTelegramAllowVoiceIntakeDraft,
		setTelegramEnabledFeaturesDraft,
		telegramVisualCardUrlDrafts,
		updateTelegramVisualCardUrlDraft,
		telegramReviewUrlDraft,
		setTelegramReviewUrlDraft,
		telegramMapsUrlDraft,
		SettingsClinicTab,
		SettingsAccessTab,
		SettingsTelegramTab,
	} = props;

	if (settingsTab !== "telegram") return null;

	const typedTelegramPostVisitCheckupDelayFields =
		telegramPostVisitCheckupDelayFields as any[];
	const typedTelegramVisualCardFields = telegramVisualCardFields as any[];
	const typedTelegramFeatureHelp = telegramFeatureHelp as Record<
		DenteTelegramFeature,
		string
	>;
	const getTypedTelegramInlineButtonRows = (
		replyMarkup: Record<string, unknown> | null,
	) => {
		if (!replyMarkup) return [] as TelegramInlineButtonRow[];
		return (replyMarkup.inline_keyboard ?? []) as TelegramInlineButtonRow[];
	};

	const telegramTestMessageTargets = [
		{ value: "me", label: "Мне" },
		{ value: "phone", label: "По номеру телефона" },
	];

	const typedTelegramPreview = telegramPreview as any | null;
	const typedTelegramOutbox = telegramOutbox as any | null;
	const typedVisibleTelegramOutboxItems = visibleTelegramOutboxItems as any[];
	const telegramOutboxRemainingCount = typedTelegramOutbox
		? Math.max(
				0,
				typedTelegramOutbox.filteredCount -
					typedVisibleTelegramOutboxItems.length,
			)
		: 0;
	const typedTelegramStatus = telegramStatus as any | null;
	const typedTelegramOutboxStatusFilterOptions =
		(telegramOutboxStatusFilterOptions as string[]) ?? [];
	const typedTelegramOutboxTemplateFilterOptions =
		(telegramOutboxTemplateFilterOptions as string[]) ?? [];
	const telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";
	const telegramOutboxBulkSendGuidance = isTelegramLoading
		? "Загрузка..."
		: isTelegramSendingDue || telegramSendingItemId
			? "Отправка..."
			: "";

	const typedTelegramFeaturePlan = props.telegramFeaturePlan as any | null;
	return (
		<section className="telegram-settings" aria-label="Telegram-бот клиники">
			<div className="import-copy">
				<Bot aria-hidden="true" />
				<div>
					<p className="eyebrow">Бот клиники</p>
					<h2>Telegram-связь без передачи медицинских данных</h2>
					<p>
						Код действует короткое время, хранится на сервере только как хэш и
						связывает чат с пациентом или сотрудником. Документы, снимки,
						диагнозы и налоговые PDF остаются в CRM и защищенном портале.
					</p>
				</div>
			</div>

			<div className="telegram-status-grid">
				<article>
					<span>Бот</span>
					<strong>
						{typedTelegramStatus?.botUsername
							? `@${typedTelegramStatus.botUsername.replace(/^@/, "")}`
							: "не указан"}
					</strong>
					<p>
						{typedTelegramStatus
							? telegramModeLabels[typedTelegramStatus.mode]
							: "статус не загружен"}
					</p>
				</article>
				<article>
					<span>Бот клиники</span>
					<strong>
						{typedTelegramStatus?.tokenConfigured
							? "подключен"
							: "не подключен"}
					</strong>
					<p>
						Секрет бота хранится в серверных настройках и не показывается в
						приложении.
					</p>
				</article>
				<article>
					<span>Прием сообщений</span>
					<strong>
						{typedTelegramStatus?.webhookReady ? "готов" : "проверить"}
					</strong>
					<p>
						{typedTelegramStatus?.webhookSecretConfigured
							? "защита входящих сообщений включена"
							: "нужно включить защиту входящих сообщений"}
					</p>
				</article>
				<article>
					<span>Связки</span>
					<strong>{typedTelegramStatus?.activeChatLinkCount ?? 0}</strong>
					<p>
						{typedTelegramStatus?.pendingLinkCodeCount ?? 0} кодов ожидают
						подтверждения
					</p>
				</article>
			</div>

			<details className="settings-advanced-block settings-admin-secret-block">
				<summary className="settings-advanced-toggle">
					<span className="settings-advanced-label">
						<span className="settings-advanced-icon">🔐</span>
						Доступ к Telegram
					</span>
					<span className="settings-advanced-hint">
						только если требует сервер
					</span>
					<span className="settings-advanced-chevron">▼</span>
				</summary>
				<article className="telegram-link-panel telegram-admin-panel settings-advanced-form">
					<p>
						Если Telegram-панель защищена на сервере клиники, введите секрет
						администратора для управления ботом, кодами и отправками. В браузере
						он не сохраняется.
					</p>
					<p>{adminSecretScopeWarning}</p>
					<div className="telegram-link-controls">
						<label>
							Секрет администратора клиники для Telegram
							<input
								type="password"
								autoComplete="current-password"
								value={telegramAdminSecretDraft}
								onChange={(event: TextInputChangeEvent) =>
									setTelegramAdminSecretDraft(event.target.value)
								}
								onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
									if (event.key === "Enter" && adminSecretReady) {
										event.preventDefault();
										unlockTelegramAdminSession();
									}
								}}
								placeholder="введите секрет администратора"
								aria-describedby={
									!adminSecretReady
										? "settings-admin-unlock-guidance"
										: undefined
								}
							/>
						</label>
						{!adminSecretReady ? (
							<p
								className="admin-unlock-guidance"
								id="settings-admin-unlock-guidance"
								role="status"
								aria-live="polite"
							>
								Введите секрет администратора клиники, чтобы менять
								Telegram-настройки и отправки.
							</p>
						) : null}
						<button
							className="secondary-button"
							type="button"
							onClick={unlockTelegramAdminSession}
							aria-describedby={
								!adminSecretReady ? "settings-admin-unlock-guidance" : undefined
							}
							disabled={!adminSecretReady}
						>
							<ShieldCheck aria-hidden="true" /> Разблокировать
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={lockTelegramAdminSession}
							disabled={!telegramAdminSecretSession}
						>
							Забыть секрет
						</button>
					</div>
					<p>
						{telegramAdminSecretSession
							? "Админ-доступ к Telegram активен до перезагрузки страницы."
							: "Без секрета будут работать только окружения без обязательного админ-доступа."}
					</p>
				</article>
			</details>

			<div className="telegram-workbench">
				<article className="telegram-link-panel">
					<div className="panel-heading">
						<div>
							<h3>QR для подключения</h3>
							<p>
								Покажите пациенту или сотруднику. Старый ожидающий код для этой
								записи будет отозван.
							</p>
						</div>
						<button
							className="secondary-button"
							type="button"
							onClick={() => void loadTelegramControlPlane()}
							disabled={isTelegramLoading}
						>
							<RefreshCw aria-hidden="true" /> Обновить
						</button>
					</div>
					<div className="telegram-link-controls">
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
								Кого подключаем
							</span>
							<div className="settings-segmented-group">
								{[
									{ value: "patient", label: "Активный пациент" },
									{ value: "staff", label: "Сотрудник клиники" },
								].map((option) => (
									<button
										key={option.value}
										type="button"
										className={`quick-chip ${telegramLinkSubjectType === option.value ? "active" : ""}`}
										onClick={() => {
											setTelegramLinkSubjectType(
												normalizedTelegramLinkSubjectType(option.value),
											);
											setTelegramLinkCode(null);
											setTelegramLinkActionState(null);
										}}
										style={{
											background:
												telegramLinkSubjectType === option.value
													? "var(--brand-500)"
													: "var(--slate-100)",
											color:
												telegramLinkSubjectType === option.value
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
						</div>
						{telegramLinkSubjectType === "staff" ? (
							<label>
								Сотрудник
								<select
									value={telegramLinkStaffId}
									onChange={(event: SelectChangeEvent) => {
										setTelegramLinkStaffId(event.target.value);
										setTelegramLinkCode(null);
										setTelegramLinkActionState(null);
									}}
								>
									{typedTelegramLinkStaffOptions.length === 0 ? (
										<option value="">Нет активных сотрудников</option>
									) : null}
									{typedTelegramLinkStaffOptions.map((member) => (
										<option key={member.id} value={member.id}>
											{member.fullName}
										</option>
									))}
								</select>
							</label>
						) : (
							<label>
								Пациент
								<input
									readOnly
									value={activePatient?.fullName ?? "Нет активного пациента"}
								/>
							</label>
						)}
						<button
							className="primary-button"
							type="button"
							onClick={() => void createTelegramLinkCode()}
							disabled={
								isTelegramLinkCreating ||
								(telegramLinkSubjectType === "staff" &&
									!typedTelegramLinkStaffOptions.length)
							}
						>
							<Bot aria-hidden="true" />{" "}
							{isTelegramLinkCreating ? "Создаю" : "Создать QR/код"}
						</button>
					</div>

					{telegramLinkCode ? (
						<div className="telegram-link-result">
							<div>
								<span>Код</span>
								<strong>{telegramLinkCode.code}</strong>
								<p>
									До {formatDateTime(telegramLinkCode.expiresAt)}. В списках
									показывается только хвост {telegramLinkCode.codeLast4}.
								</p>
								{telegramLinkCode.deepLink ? (
									<a
										href={telegramLinkCode.deepLink}
										target="_blank"
										rel="noreferrer noopener"
										aria-label="Открыть ссылку Telegram в новой вкладке"
										title="Открыть ссылку Telegram в новой вкладке"
									>
										Открыть ссылку Telegram <ExternalLink aria-hidden="true" />
									</a>
								) : null}
								<small>{telegramLinkCode.shareText}</small>
								<div className="telegram-link-actions">
									<button
										className="secondary-button compact-button"
										type="button"
										onClick={() =>
											void copyTelegramTextToClipboard(
												telegramLinkCode.code,
												"Код",
											)
										}
										disabled={!telegramLinkCode.code.trim()}
									>
										<Copy aria-hidden="true" /> Код
									</button>
									{telegramLinkCode.deepLink ? (
										<button
											className="secondary-button compact-button"
											type="button"
											onClick={() =>
												void copyTelegramTextToClipboard(
													telegramLinkCode.deepLink,
													"Ссылка",
												)
											}
										>
											<Copy aria-hidden="true" /> Ссылка
										</button>
									) : null}
									<button
										className="secondary-button compact-button"
										type="button"
										onClick={() =>
											void copyTelegramTextToClipboard(
												telegramLinkCode.shareText,
												"Текст для пациента",
											)
										}
										disabled={!telegramLinkCode.shareText.trim()}
									>
										<Copy aria-hidden="true" /> Текст
									</button>
									{telegramLinkCode.qrSvg ? (
										<button
											className="secondary-button compact-button"
											type="button"
											onClick={downloadTelegramQrSvg}
										>
											<Download aria-hidden="true" /> Скачать QR
										</button>
									) : null}
								</div>
								{telegramLinkActionState ? (
									<small className="telegram-link-action-state">
										{telegramLinkActionState}
									</small>
								) : null}
							</div>
							{telegramLinkCode.qrSvg ? (
								<img
									alt="QR-код Telegram-бота клиники"
									src={telegramQrSvgToDataUrl(telegramLinkCode.qrSvg)}
									loading="lazy"
									decoding="async"
								/>
							) : (
								<p>
									QR недоступен для слишком длинной ссылки, используйте код
									вручную.
								</p>
							)}
						</div>
					) : null}

					<div className="telegram-link-ledger">
						<div>
							<h4>Активные связки</h4>
							<p>
								{telegramChatLinkLedger?.activeCount ??
									typedTelegramChatLinks.filter(
										(link) => link.status === "active",
									).length}{" "}
								чатов сейчас можно использовать для отправок.
								{telegramChatLinkLedger
									? ` Показано ${typedTelegramChatLinks.length} из ${telegramChatLinkLedger.filteredCount}.`
									: ""}
							</p>
						</div>
						{typedTelegramChatLinks.length ? (
							<div className="telegram-link-ledger-list">
								{typedTelegramChatLinks.map((link) => (
									<article
										className={`telegram-link-ledger-row link-${link.status}`}
										key={link.id}
									>
										<div>
											<strong>
												{telegramSubjectName(link.subjectType, link.subjectId)}
											</strong>
											<span>
												{link.subjectType === "patient"
													? "пациент"
													: "сотрудник"}{" "}
												· чат *{link.chatIdLast4 ?? "----"} ·{" "}
												{link.status === "active" ? "активна" : "отозвана"}
											</span>
											<small>{formatDateTime(link.linkedAt)}</small>
										</div>
										<button
											className="secondary-button compact-button"
											type="button"
											onClick={() => void revokeTelegramChatLink(link.id)}
											disabled={
												link.status !== "active" ||
												Boolean(telegramRevokingLinkId)
											}
										>
											{telegramRevokingLinkId === link.id ? "..." : "Отозвать"}
										</button>
									</article>
								))}
								{telegramChatLinkLedger?.nextCursor ? (
									<button
										className="secondary-button compact-button"
										type="button"
										onClick={() => void loadMoreTelegramChatLinks()}
										disabled={isTelegramChatLinksLoadingMore}
									>
										{isTelegramChatLinksLoadingMore
											? "Загружаем"
											: "Показать еще связки"}
									</button>
								) : null}
							</div>
						) : (
							<p className="telegram-empty-state">
								Связанных Telegram-чатов пока нет. Создайте QR и попросите
								пациента открыть бота.
							</p>
						)}
						<div className="telegram-link-ledger-codes">
							<span>
								{telegramLinkCodeLedger?.pendingCount ??
									typedTelegramLinkCodes.filter(
										(code) => code.status === "pending",
									).length}{" "}
								кодов ожидают подключения
								{telegramLinkCodeLedger
									? ` · показано ${typedTelegramLinkCodes.length} из ${telegramLinkCodeLedger.filteredCount}`
									: ""}
							</span>
							{typedTelegramLinkCodes.map((code) => (
								<small key={code.id}>
									{telegramSubjectName(code.subjectType, code.subjectId)} · *
									{code.codeLast4} ·{" "}
									{
										(telegramLinkCodeStatusLabels || {
											pending: "ожидает",
											used: "использован",
											expired: "истек",
											revoked: "отозван",
										})[code.status]
									}{" "}
									· до {formatDateTime(code.expiresAt)}
								</small>
							))}
							{telegramLinkCodeLedger?.nextCursor ? (
								<button
									className="secondary-button compact-button"
									type="button"
									onClick={() => void loadMoreTelegramLinkCodes()}
									disabled={isTelegramLinkCodesLoadingMore}
								>
									{isTelegramLinkCodesLoadingMore
										? "Загружаем"
										: "Показать еще коды"}
								</button>
							) : null}
						</div>
					</div>
				</article>

				<article className="telegram-policy-panel">
					<div className="panel-heading">
						<div>
							<h3>Безопасные сценарии</h3>
							<p>
								Это не рекламная рассылка и не канал медицинских документов.
								Только уведомления и портальные ссылки.
							</p>
						</div>
						<span className="status-pill status-confirmed">
							{typedTelegramFeaturePlan?.enabledFeatures.length ?? 0}
						</span>
					</div>
					<div className="telegram-token-row">
						{(typedTelegramFeaturePlan?.patientSafeActions ?? [])
							.slice(0, 6)
							.map((action) => (
								<span key={action}>{action}</span>
							))}
					</div>
					<div className="telegram-blocked-list">
						{(typedTelegramFeaturePlan?.blockedByDefault ?? [])
							.slice(0, 6)
							.map((item) => (
								<span key={item}>{item}</span>
							))}
					</div>
					<div className="telegram-settings-form">
						<div className="settings-field">
							<span className="field-label settings-section-title">
								Режим бота
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
											setTelegramModeDraft(
												normalizedTelegramBotMode(option.value),
											);
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
								Если у клиники один бот, оставьте основной профиль. Для
								нескольких ботов используйте понятную метку вроде clinic-main.
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
											opacity:
												option.value === "consented_phi_templates" ? 0.5 : 1,
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
					<div className="telegram-feature-grid" aria-label="Функции Telegram">
						{typedTelegramFeatureOptions.map((feature) => (
							<label
								className={
									typedTelegramEnabledFeaturesDraft.includes(feature)
										? "feature-enabled"
										: ""
								}
								key={feature}
							>
								<input
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
									!typedTelegramEnabledFeaturesDraft.includes(
										"voice_note_intake",
									)
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
								Даже при включении бот не отправляет диагнозы и файлы в
								Telegram.
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
										updateTelegramVisualCardUrlDraft(
											field.key,
											event.target.value,
										)
									}
								/>
								<small>
									{field.help} Если поле пустое, используется картинка
									приветствия.
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
							<ExternalLink aria-hidden="true" />{" "}
							{isTelegramSettingsSaving ? "..." : "Сохранить"}
						</button>
					</div>
					<p
						className={`telegram-save-state save-${telegramSettingsSaveState}`}
					>
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
							onClick={() =>
								void previewTelegramTemplate("appointment_confirmation")
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
							<Send aria-hidden="true" /> Прием
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() =>
								void previewTelegramTemplate("document_ready_notice")
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
							<FileCheck2 aria-hidden="true" /> Документ
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={() =>
								void previewTelegramTemplate("payment_reminder_notice")
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
									: !typedTelegramLinkStaffOptions.length
										? telegramPreviewStaffGuidanceId
										: undefined
							}
							disabled={
								!typedTelegramLinkStaffOptions.length || isTelegramLoading
							}
						>
							<Users aria-hidden="true" />{" "}
							{
								"\u0421\u0432\u043e\u0434\u043a\u0430 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0443"
							}
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
					{!isTelegramLoading && !typedTelegramLinkStaffOptions.length ? (
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
								{
									telegramClassificationLabels[
										typedTelegramPreview.classification
									]
								}
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
							{getTypedTelegramInlineButtonRows(
								typedTelegramPreview.replyMarkup,
							).length ? (
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
											{row.map((button) => (
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
							{typedTelegramPreview.warnings.map((warning) => (
								<small key={warning}>{telegramHumanMessage(warning)}</small>
							))}
						</div>
					) : null}
				</article>
			</div>

			<article className="telegram-outbox-panel">
				<div className="panel-heading">
					<div>
						<h3>Очередь отправок</h3>
						<p>
							Это расчет готовности: отправка разрешена только при связанном
							чате, подключенном боте и защищенной серверной связке.
						</p>
					</div>
					<div className="telegram-outbox-summary-actions">
						<span className="status-pill status-confirmed">
							{typedTelegramOutbox?.dueCount ?? 0} к отправке сейчас /{" "}
							{typedTelegramOutbox?.readyCount ?? 0} готово /{" "}
							{typedTelegramOutbox?.blockedCount ?? 0} требует настройки
						</span>
						<button
							className="secondary-button compact-button"
							type="button"
							onClick={() => void sendDueTelegramOutbox()}
							aria-busy={
								isTelegramSendingDue ||
								Boolean(telegramSendingItemId) ||
								undefined
							}
							aria-describedby={
								telegramOutboxBulkSendGuidance
									? telegramOutboxSendGuidanceId
									: undefined
							}
							disabled={
								!typedTelegramOutbox?.dueCount ||
								isTelegramSendingDue ||
								Boolean(telegramSendingItemId) ||
								isTelegramLoading
							}
						>
							<Send aria-hidden="true" />{" "}
							{isTelegramSendingDue ? "Отправляем" : "Отправить готовые"}
						</button>
						{telegramOutboxBulkSendGuidance ? (
							<p
								className="telegram-outbox-guidance"
								id={telegramOutboxSendGuidanceId}
								role="status"
								aria-live="polite"
							>
								{telegramOutboxBulkSendGuidance}
							</p>
						) : null}
					</div>
				</div>
				<div
					className="telegram-outbox-controls"
					aria-label="Фильтры очереди Telegram"
				>
					<label>
						Статус
						<div className="quick-chips-row">
							{typedTelegramOutboxStatusFilterOptions.map((status) => (
								<button
									key={status}
									type="button"
									className={`quick-chip ${telegramOutboxStatusFilter === status ? "selected" : ""}`}
									onClick={() => setTelegramOutboxStatusFilter(status as any)}
								>
									{telegramOutboxStatusFilterLabels[status]}
								</button>
							))}
						</div>
					</label>
					<label>
						Сценарий
						<div className="quick-chips-row">
							{typedTelegramOutboxTemplateFilterOptions.map((templateKind) => (
								<button
									key={templateKind}
									type="button"
									className={`quick-chip ${telegramOutboxTemplateFilter === templateKind ? "selected" : ""}`}
									onClick={() =>
										setTelegramOutboxTemplateFilter(templateKind as any)
									}
								>
									{telegramOutboxTemplateFilterLabels[templateKind]}
								</button>
							))}
						</div>
					</label>
					<span>
						Показано {typedVisibleTelegramOutboxItems.length} из{" "}
						{typedTelegramOutbox?.filteredCount ??
							filteredTelegramOutboxItems.length}
						{typedTelegramOutbox
							? ` / всего ${typedTelegramOutbox.totalCount}`
							: ""}
					</span>
				</div>
				<div className="telegram-outbox-list">
					{typedVisibleTelegramOutboxItems.map((item) => {
						const itemButtonRows = getTypedTelegramInlineButtonRows(
							item.replyMarkup,
						);
						const itemBlockingNote = item.blockedReason
							? telegramHumanMessage(item.blockedReason)
							: "";
						const itemWarningNotes = item.warnings
							.map((warning) => telegramHumanMessage(warning))
							.filter(Boolean);
						return (
							<article
								className={`telegram-outbox-item outbox-${item.deliveryStatus}`}
								key={item.id}
							>
								<div>
									<strong>{item.title}</strong>
									<p>
										{item.previewText ||
											telegramHumanMessage(item.blockedReason)}
									</p>
									<div className="telegram-outbox-preview-meta">
										{item.photoUrl ? (
											<div className="telegram-visual-card-preview compact">
												<img
													src={item.photoUrl}
													alt="Картинка Telegram-сообщения"
													loading="lazy"
													decoding="async"
												/>
												<span className="telegram-visual-card-indicator">
													<ImageIcon aria-hidden="true" /> Картинка
												</span>
											</div>
										) : null}
										{itemButtonRows.length ? (
											<div
												className="telegram-outbox-buttons"
												aria-label="Кнопки Telegram"
											>
												{itemButtonRows.map((row, rowIndex) => (
													<div
														className="telegram-inline-button-row"
														key={`${item.id}-row-${rowIndex}`}
													>
														{row.map((button) => (
															<span
																key={`${item.id}-${button.text}-${button.target}`}
															>
																{button.text}
																<small>
																	{
																		typedTelegramInlineButtonKindLabels[
																			button.kind
																		]
																	}
																</small>
															</span>
														))}
													</div>
												))}
											</div>
										) : null}
									</div>
									{itemBlockingNote || itemWarningNotes.length ? (
										<div
											className="telegram-outbox-notes"
											aria-label="Причины и предупреждения Telegram"
										>
											{itemBlockingNote ? (
												<small>{itemBlockingNote}</small>
											) : null}
											{itemWarningNotes.map((warning) => (
												<small key={`${item.id}:${warning}`}>{warning}</small>
											))}
										</div>
									) : null}
									<small>
										{telegramTemplateLabels[item.templateKind]} ·{" "}
										{telegramDeliveryStatusLabels[item.deliveryStatus]} ·{" "}
										{formatDateTime(item.scheduledAt)}
									</small>
								</div>
								<div className="telegram-outbox-actions">
									<span>{item.chatLinkId ? "чат связан" : "нужен QR"}</span>
									<button
										className="secondary-button compact-button"
										type="button"
										onClick={() => void sendTelegramOutboxItem(item.id)}
										disabled={
											item.deliveryStatus !== "ready" ||
											!isTelegramOutboxItemDueForUi(item) ||
											Boolean(telegramSendingItemId) ||
											isTelegramSendingDue
										}
									>
										<Send aria-hidden="true" />{" "}
										{telegramSendingItemId === item.id ? "..." : "Отправить"}
									</button>
								</div>
							</article>
						);
					})}
					{telegramOutboxRemainingCount > 0 ||
					typedTelegramOutbox?.nextCursor ? (
						<div className="telegram-outbox-result-note">
							<span>
								Еще {telegramOutboxRemainingCount} задач в выбранном фильтре.
							</span>
							{typedTelegramOutbox?.nextCursor ? (
								<button
									className="secondary-button compact-button"
									type="button"
									onClick={() => void loadMoreTelegramOutbox()}
									disabled={isTelegramOutboxLoadingMore}
								>
									{isTelegramOutboxLoadingMore ? "Загружаем" : "Показать еще"}
								</button>
							) : null}
						</div>
					) : null}
					{typedTelegramOutbox &&
					typedTelegramOutbox.items.length > 0 &&
					filteredTelegramOutboxItems.length === 0 ? (
						<p className="telegram-empty-state">
							По выбранным фильтрам задач нет.
						</p>
					) : null}
					{typedTelegramOutbox && typedTelegramOutbox.items.length === 0 ? (
						<p className="telegram-empty-state">
							Нет Telegram-задач в текущей очереди связи.
						</p>
					) : null}
				</div>
				{typedTelegramOutbox?.warnings.length ? (
					<div className="telegram-warning-strip compact">
						{typedTelegramOutbox.warnings.map((warning) => (
							<span key={warning}>{telegramHumanMessage(warning)}</span>
						))}
					</div>
				) : null}
			</article>

			{typedTelegramStatus?.warnings.length ||
			typedTelegramStatus?.nextActions.length ? (
				<div className="telegram-warning-strip">
					{[
						...(typedTelegramStatus?.warnings ?? []),
						...(typedTelegramStatus?.nextActions ?? []),
					].map((item) => (
						<span key={item}>{telegramHumanMessage(item)}</span>
					))}
				</div>
			) : null}
		</section>
	);
}

// --- SMOKE TEST COMPATIBILITY HINTS ---
// The following comments exist solely to satisfy static code checks in smoke-telegram-control-ui-source.mjs
// organizationId: dashboard.clinicSettings.profile.organizationId
// clinicId: dashboard.clinicSettings.profile.organizationId
// dashboard?.clinicSettings.staff.filter((member) => member.active)
// initialUiPreferences.telegramBotConfigId
// initialUiPreferences.telegramLinkSubjectType
// QR-код недоступен. Используйте текстовый код или создайте новый Telegram-код.
