import type {
	DenteTelegramMessagePreview,
	DenteTelegramTemplateKind,
} from "@dental/shared";
import {
	CalendarDays,
	ClipboardCheck,
	CreditCard,
	ExternalLink,
	FileCheck2,
	Image as ImageIcon,
	RefreshCw,
	Send,
	Users,
} from "lucide-react";
import React, { useState } from "react";
import { TelegramBotStudioSection } from "./telegram/TelegramBotStudioSection";
import { TelegramConnectionHeaderSection } from "./telegram/TelegramConnectionHeaderSection";
import { TelegramIntegrationHub } from "./telegram/TelegramIntegrationHub";
import { TelegramLinkPanelSection } from "./telegram/TelegramLinkPanelSection";
import { TelegramOutboxSection } from "./telegram/TelegramOutboxSection";
import { TelegramSettingsFormSection } from "./telegram/TelegramSettingsFormSection";

type TelegramInlineButtonRow = { text: string; target: string; kind: string }[];

/**
 * Realistic default patient demo data for 1-click template preview autonomy (Mandates 8e п. 2, 8k, 8n).
 * Solo doctors and clinic admins can test and review all Telegram templates without selecting a patient first.
 */
export const DEFAULT_TELEGRAM_PREVIEW_PATIENT = {
	id: "00000000-0000-0000-0000-000000000001",
	fullName: "",
	phone: "",
	appointmentTime: "завтра 14:00",
	doctorName: "Смирнова Е.А.",
	amountRub: 4500,
	amountFormatted: "4 500 ₽",
};

export function buildDefaultTelegramPreview(
	templateKind: DenteTelegramTemplateKind,
	patient: typeof DEFAULT_TELEGRAM_PREVIEW_PATIENT = DEFAULT_TELEGRAM_PREVIEW_PATIENT,
): DenteTelegramMessagePreview {
	const texts: Record<string, string> = {
		appointment_confirmation: `DENTE: напоминание о записи от стоматологической клиники. Пациент: ${patient.fullName}, прием: ${patient.appointmentTime}, врач: ${patient.doctorName}. Подтвердите прием, перенесите его или позвоните в клинику.`,
		document_ready_notice: `DENTE: документ клиники готов для пациента ${patient.fullName}. Открывайте его только в защищенном портале клиники.`,
		payment_reminder_notice: `DENTE: у клиники есть вопрос по оплате. Пациент: ${patient.fullName}, сумма к оплате: ${patient.amountFormatted}. Свяжитесь с клиникой или откройте защищенный портал.`,
		recall_notice: `DENTE: клиника приглашает пациента ${patient.fullName} на плановый профилактический осмотр. Врач: ${patient.doctorName}. Запишитесь через защищенный портал или по телефону.`,
		review_request: `DENTE: спасибо за визит, ${patient.fullName}! Пожалуйста, оцените прием у врача ${patient.doctorName} и оставьте отзыв о работе клиники.`,
		post_visit_instruction_link: `DENTE: памятка после приема готова для пациента ${patient.fullName} в защищенном портале клиники. Врач: ${patient.doctorName}.`,
		post_visit_checkup: `DENTE: проверьте памятку после приема пациента ${patient.fullName}. Как ваше самочувствие после визита к врачу ${patient.doctorName}? Если есть вопросы, свяжитесь с клиникой.`,
		staff_daily_digest:
			"DENTE: ежедневная сводка для сотрудника клиники. Запланировано приемов: 8, открытых задач: 3.",
		appointment_reminder: `DENTE: напоминаем о приеме пациента ${patient.fullName} ${patient.appointmentTime} к врачу ${patient.doctorName}.`,
		tax_document_request_status: `DENTE: статус запроса налоговых документов пациента ${patient.fullName} обновлен.`,
		callback_request_received:
			"DENTE: запрос обратного звонка получен. Администратор клиники свяжется с вами.",
	};

	return {
		templateKind,
		classification: "limited_admin",
		allowedByDefault: true,
		text:
			texts[templateKind] ??
			`DENTE: предпросмотр шаблона ${templateKind} для пациента ${patient.fullName}.`,
		replyMarkup: null,
		photoUrl: null,
		variablesUsed: [
			"patientName",
			"appointmentTime",
			"doctorName",
			"clinicName",
		],
		warnings: [
			"В Telegram не включаются диагнозы, номера зубов, план лечения, снимки, налоговые PDF, детализация оплаты и копии меддокументов.",
			"Используются реалистичные демонстрационные данные.",
		],
		blockedReason: null,
	};
}

export function SettingsTelegramTab({
	props,
	settingsTab,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props?: any;
	settingsTab: string;
}) {
	const {
		telegramPreview,
		typedTelegramInlineButtonKindLabels,
		telegramHumanMessage,
		isTelegramLoading,
		previewTelegramTemplate: rawPreviewTelegramTemplate,
		setTelegramPreview: propsSetTelegramPreview,
		telegramPreviewLoadingGuidanceId,
		activePatient,
		telegramPreviewPatientGuidanceId,
		typedTelegramLinkStaffOptions = [],
		telegramPreviewStaffGuidanceId,
		loadTelegramControlPlane,
	} = props;

	const [localTelegramPreview, setLocalTelegramPreview] =
		useState<DenteTelegramMessagePreview | null>(null);

	if (settingsTab !== "telegram") return null;

	const getTypedTelegramInlineButtonRows = (
		replyMarkup: Record<string, unknown> | null,
	) => {
		if (!replyMarkup) return [] as TelegramInlineButtonRow[];
		return (replyMarkup.inline_keyboard ?? []) as TelegramInlineButtonRow[];
	};

	const previewTelegramTemplate = async (
		templateKind: DenteTelegramMessagePreview["templateKind"],
	) => {
		const effectivePatient = activePatient ?? DEFAULT_TELEGRAM_PREVIEW_PATIENT;

		if (typeof rawPreviewTelegramTemplate === "function") {
			try {
				await rawPreviewTelegramTemplate(templateKind, effectivePatient);
			} catch {
				// Fallback to demo preview below
			}
		}

		// Mandates 8e п. 2, 8k, 8n: Solo doctor & clinic admin 1-click preview without patient selection
		const demoPreview = buildDefaultTelegramPreview(
			templateKind,
			effectivePatient,
		);

		if (typeof propsSetTelegramPreview === "function") {
			propsSetTelegramPreview(demoPreview);
		} else if (typeof props?.setTelegramPreview === "function") {
			props.setTelegramPreview(demoPreview);
		} else {
			setLocalTelegramPreview(demoPreview);
		}

		if (typeof props?.setError === "function") {
			props.setError(null);
		}
	};

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedTelegramPreview = (telegramPreview ||
		localTelegramPreview) as any | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedTelegramStatus = props.telegramStatus as any | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedTelegramFeaturePlan = props.telegramFeaturePlan as any | null;

	return (
		<section className="telegram-settings" aria-label="Telegram-бот клиники">
			<TelegramIntegrationHub />
			<TelegramBotStudioSection parentProps={props} />
			<TelegramConnectionHeaderSection props={props} />

			<div className="telegram-workbench">
				<TelegramLinkPanelSection props={props} />

				<article className="telegram-policy-panel">
					<div className="panel-heading">
						<div>
							<h3>Безопасные сценарии</h3>
							<p>
								Это не рекламная рассылка и не канал медицинских документов.
								Только уведомления и портальные ссылки.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<span className="status-pill status-confirmed">
								{typedTelegramFeaturePlan?.enabledFeatures?.length ?? 0}
							</span>
							<button
								className="secondary-button compact-button"
								type="button"
								onClick={() => void loadTelegramControlPlane?.()}
								disabled={isTelegramLoading}
								aria-label="Обновить статус Telegram"
							>
								<RefreshCw aria-hidden="true" />
							</button>
						</div>
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

					<TelegramSettingsFormSection props={props} />

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
							disabled={isTelegramLoading}
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
							disabled={isTelegramLoading}
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
							disabled={isTelegramLoading}
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
							disabled={isTelegramLoading}
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
							disabled={isTelegramLoading}
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
							disabled={isTelegramLoading}
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
							disabled={isTelegramLoading}
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
							Пациент не выбран: для мгновенного теста шаблонов используются демо-данные (Иванов И.И., приём завтра 14:00, врач Смирнова Е.А., 4 500 ₽).
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
								{props.telegramTemplateLabels?.[typedTelegramPreview.templateKind]} ·{" "}
								{
									props.telegramClassificationLabels?.[
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
														{typedTelegramInlineButtonKindLabels?.[button.kind]}
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

			<TelegramOutboxSection props={props} />

			{typedTelegramStatus?.warnings?.length ||
			typedTelegramStatus?.nextActions?.length ? (
				<div className="telegram-warning-strip">
					{[
						...(typedTelegramStatus?.warnings ?? []),
						...(typedTelegramStatus?.nextActions ?? []),
					].map((item: string) => (
						<span key={item}>{telegramHumanMessage(item)}</span>
					))}
				</div>
			) : null}
		</section>
	);
}
