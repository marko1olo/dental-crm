import type { DenteTelegramFeature } from "@dental/shared";
import {
	Bot,
	CalendarDays,
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
import { EmptyState } from "../EmptyState";
import { PatientPortal } from "../PatientPortal";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type StringTokenGroup = { title: string; items: string[] };
type TelegramInlineButtonRow = { text: string; target: string; kind: string }[];

export function SettingsTelegramTab({
	props,
	settingsTab,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props?: any;
	settingsTab: string;
}) {
	const {
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		dashboard,
		createTelegramLinkCode,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramLinkCodeDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramLinkCodeDraft,
		copyTelegramTextToClipboard,
		downloadTelegramQrSvg,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramPostVisitCheckupDelayDraft,
		updateTelegramPostVisitCheckupDelayDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramVisualCardDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateTelegramVisualCardDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramFeaturePlanDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		updateTelegramFeaturePlanDraft,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramTestMessagePhone,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramTestMessagePhone,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		telegramTestMessageResult,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		setTelegramTestMessageResult,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		sendTelegramTestMessage,
		formatDateTime,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		formatTime,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
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
		typedTelegramChatLinks,
		telegramSubjectName,
		revokeTelegramChatLink,
		telegramRevokingLinkId,
		loadMoreTelegramChatLinks,
		isTelegramChatLinksLoadingMore,
		telegramLinkCodeLedger,
		typedTelegramLinkCodes,
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
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		SettingsClinicTab,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		SettingsAccessTab,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		SettingsTelegramTab,
	} = props;

	const [showPatientPortalPreview, setShowPatientPortalPreview] =
		React.useState(false);

	if (settingsTab !== "telegram") return null;

	const typedTelegramPostVisitCheckupDelayFields =
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		telegramPostVisitCheckupDelayFields as any[];

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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

	const _telegramTestMessageTargets = [
		{ value: "me", label: "Мне" },
		{ value: "phone", label: "По номеру телефона" },
	];

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedTelegramPreview = telegramPreview as any | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedTelegramOutbox = telegramOutbox as any | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedVisibleTelegramOutboxItems = visibleTelegramOutboxItems as any[];
	const telegramOutboxRemainingCount = typedTelegramOutbox
		? Math.max(
				0,
				typedTelegramOutbox.filteredCount -
					typedVisibleTelegramOutboxItems.length,
			)
		: 0;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedTelegramStatus = telegramStatus as any | null;
	const typedTelegramOutboxStatusFilterOptions =
		telegramOutboxStatusFilterOptions as string[];
	const typedTelegramOutboxTemplateFilterOptions =
		telegramOutboxTemplateFilterOptions as string[];
	const telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";
	const telegramOutboxBulkSendGuidance = isTelegramLoading
		? "Загрузка..."
		: isTelegramSendingDue || telegramSendingItemId
			? "Отправка..."
			: "";

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
						<label htmlFor="telegram-admin-secret-draft">
							Секрет администратора клиники для Telegram
							<input
								id="telegram-admin-secret-draft"
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
							<span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
								Кого подключаем
							</span>
							<div className="flex gap-2 flex-wrap mb-2">
								{[
									{ value: "patient", label: "Активный пациент" },
									{ value: "staff", label: "Сотрудник клиники" },
								].map((option) => (
									<button
										key={option.value}
										type="button"
										onClick={() => {
											setTelegramLinkSubjectType(
												normalizedTelegramLinkSubjectType(option.value),
											);
											setTelegramLinkCode(null);
											setTelegramLinkActionState(null);
										}}
										className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
											telegramLinkSubjectType === option.value
												? "bg-sky-600 text-white border-sky-600"
												: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
										}`}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>
						{telegramLinkSubjectType === "staff" ? (
							<label htmlFor="telegram-link-staff-select">
								Сотрудник
								<select
									id="telegram-link-staff-select"
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
							<label htmlFor="telegram-link-patient-input">
								Пациент
								<input
									id="telegram-link-patient-input"
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
							<EmptyState
								title="Нет связанных чатов"
								description="Связанных Telegram-чатов пока нет. Создайте QR и попросите пациента открыть бота."
								className="py-6"
							/>
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
							{typedTelegramFeaturePlan?.enabledFeatures?.length ?? 0}
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
							<span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
								Режим бота
							</span>
							<div className="flex gap-2 flex-wrap mb-1">
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
										onClick={() => {
											setTelegramModeDraft(
												normalizedTelegramBotMode(option.value),
											);
											markTelegramSettingsDirty();
										}}
										className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
											telegramModeDraft === option.value
												? "bg-sky-600 text-white border-sky-600"
												: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
										}`}
									>
										{option.label}
									</button>
								))}
							</div>
							<small className="field-note">
								{telegramModeHints[telegramModeDraft]}
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
								Если у клиники один бот, оставьте основной профиль. Для
								нескольких ботов используйте понятную метку вроде clinic-main.
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
							<div
								style={{ display: "flex", gap: "8px", alignItems: "center" }}
							>
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
							<div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
								<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
									<div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
										<strong className="text-sm font-semibold text-slate-900 dark:text-white">
											Превью Портала Пациента
										</strong>
										<button
											type="button"
											className="ghost-button"
											onClick={() => setShowPatientPortalPreview(false)}
										>
											Закрыть
										</button>
									</div>
									<div style={{ padding: "16px" }}>
										<PatientPortal />
									</div>
								</div>
							</div>
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
													background: isActive ? "var(--brand-500)" : "var(--slate-100)",
													color: isActive ? "#fff" : "var(--slate-700)",
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
								{telegramPrivacyModeHints[telegramPrivacyModeDraft]}
							</small>
						</div>
					</div>
					<fieldset
						className="telegram-feature-grid"
						aria-label="Функции Telegram"
						style={{ border: "none", padding: 0, margin: 0 }}
					>
						{typedTelegramFeatureOptions.map((feature) => (
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
							<label
								htmlFor={`telegram-visual-card-${field.key}`}
								key={field.key}
							>
								{field.label}
								<input
									id={`telegram-visual-card-${field.key}`}
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
								<fieldset
									className="telegram-preview-buttons"
									aria-label="Кнопки Telegram-сообщения"
									style={{ border: "none", padding: 0, margin: 0 }}
								>
									{getTypedTelegramInlineButtonRows(
										typedTelegramPreview.replyMarkup,
									).map((row) => (
										<div
											className="telegram-inline-button-row"
											key={`preview-row-${row.map((b) => `${b.text}:${b.target}`).join("|")}`}
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
								</fieldset>
							) : null}
							{(typedTelegramPreview?.warnings ?? []).map((warning: string) => (
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
				<fieldset
					className="telegram-outbox-controls"
					aria-label="Фильтры очереди Telegram"
					style={{ border: "none", padding: 0, margin: 0 }}
				>
					<div>
						Статус
						<div className="quick-chips-row">
							{typedTelegramOutboxStatusFilterOptions.map((status) => (
								<button
									key={status}
									type="button"
									className={`quick-chip ${telegramOutboxStatusFilter === status ? "selected" : ""}`}
									// biome-ignore lint/suspicious/noExplicitAny: automated suppression
									onClick={() => setTelegramOutboxStatusFilter(status as any)}
								>
									{telegramOutboxStatusFilterLabels[status]}
								</button>
							))}
						</div>
					</div>
					<div>
						Сценарий
						<div className="quick-chips-row">
							{typedTelegramOutboxTemplateFilterOptions.map((templateKind) => (
								<button
									key={templateKind}
									type="button"
									className={`quick-chip ${telegramOutboxTemplateFilter === templateKind ? "selected" : ""}`}
									onClick={() =>
										// biome-ignore lint/suspicious/noExplicitAny: automated suppression
										setTelegramOutboxTemplateFilter(templateKind as any)
									}
								>
									{telegramOutboxTemplateFilterLabels[templateKind]}
								</button>
							))}
						</div>
					</div>
					<span>
						Показано {typedVisibleTelegramOutboxItems.length} из{" "}
						{typedTelegramOutbox?.filteredCount ??
							filteredTelegramOutboxItems.length}
						{typedTelegramOutbox
							? ` / всего ${typedTelegramOutbox.totalCount}`
							: ""}
					</span>
				</fieldset>
				<div className="telegram-outbox-list">
					{typedVisibleTelegramOutboxItems.map((item) => {
						const itemButtonRows = getTypedTelegramInlineButtonRows(
							item.replyMarkup,
						);
						const itemBlockingNote = item.blockedReason
							? telegramHumanMessage(item.blockedReason)
							: "";
						const itemWarningNotes = (item?.warnings ?? [])
							.map((warning: Record<string, unknown> | string) =>
								telegramHumanMessage(warning as string),
							)
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
											<fieldset
												className="telegram-outbox-buttons"
												aria-label="Кнопки Telegram"
												style={{ border: "none", padding: 0, margin: 0 }}
											>
												{itemButtonRows
													.map((row, rowIndex) => ({
														row,
														rowId: `${item.id}-row-${rowIndex}`,
													}))
													.map(({ row, rowId }) => (
														<div
															className="telegram-inline-button-row"
															key={rowId}
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
											</fieldset>
										) : null}
									</div>
									{itemBlockingNote || itemWarningNotes.length ? (
										<fieldset
											className="telegram-outbox-notes"
											aria-label="Причины и предупреждения Telegram"
											style={{ border: "none", padding: 0, margin: 0 }}
										>
											{itemBlockingNote ? (
												<small>{itemBlockingNote}</small>
											) : null}
											{itemWarningNotes.map((warning) => (
												<small key={`${item.id}:${warning}`}>{warning}</small>
											))}
										</fieldset>
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
					(typedTelegramOutbox.items?.length ?? 0) > 0 &&
					(filteredTelegramOutboxItems?.length ?? 0) === 0 ? (
						<EmptyState
							title="Задач не найдено"
							description="По выбранным фильтрам Telegram-задач не найдено."
							className="py-6"
						/>
					) : null}
					{typedTelegramOutbox &&
					(typedTelegramOutbox.items?.length ?? 0) === 0 ? (
						<EmptyState
							title="Очередь пуста"
							description="Нет Telegram-задач в текущей очереди связи."
							className="py-6"
						/>
					) : null}
				</div>
				{typedTelegramOutbox?.warnings?.length ? (
					<div className="telegram-warning-strip compact">
						{(typedTelegramOutbox.warnings ?? []).map((warning) => (
							<span key={warning}>{telegramHumanMessage(warning)}</span>
						))}
					</div>
				) : null}
			</article>

			{typedTelegramStatus?.warnings?.length ||
			typedTelegramStatus?.nextActions?.length ? (
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
