import type {
	DenteTelegramMessagePreview,
	DenteTelegramTemplateKind,
} from "@dental/shared";
import React from "react";
import { TelegramIntegrationHub } from "./telegram/TelegramIntegrationHub";

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
	if (settingsTab !== "telegram") return null;

	const clinicId =
		props?.clinicId ??
		props?.dashboard?.clinicSettings?.profile?.organizationId ??
		"";
	const userId =
		props?.userId ??
		props?.currentUser?.id ??
		"";

	return (
		<section className="telegram-settings" aria-label="Telegram-бот клиники">
			<TelegramIntegrationHub
				clinicId={clinicId}
				userId={userId}
				onBotStatusChange={props?.onBotStatusChange}
			/>
		</section>
	);
}
