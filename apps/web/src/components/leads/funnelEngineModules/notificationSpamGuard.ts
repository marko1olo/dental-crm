/**
 * DENTE Dental CRM — Notification Spam Collision Guard & 152-FZ Consent Filtering
 */

import {
	type NotificationSpamCollisionInput,
	type NotificationCollisionCheckResult,
	getMarketingChannelLabel,
	normalizeMarketingChannel,
} from "./types.js";

export const MIN_MARKETING_INTERVAL_HOURS = 24;

export function isPatientEligibleForMarketing(consentState: unknown): boolean {
	if (consentState === true) return true;
	if (!consentState || typeof consentState !== "object") return false;
	const obj = consentState as Record<string, unknown>;
	if (obj.consentMarketing === true || obj.marketingOptIn === true) return true;
	if (obj.consents && typeof obj.consents === "object" && (obj.consents as Record<string, unknown>).marketingPromotions === true) return true;
	if (obj.communicationConsents && typeof obj.communicationConsents === "object") {
		const cc = obj.communicationConsents as Record<string, unknown>;
		if (cc.marketing === true || cc.marketing === "granted") return true;
	}
	return false;
}

export function filterMarketingEligibleLeads<
	T extends { consentMarketing?: boolean | null; marketingOptIn?: boolean | null; consents?: { marketingPromotions?: boolean } },
>(leads: readonly T[]): T[] {
	return leads.filter((lead) => isPatientEligibleForMarketing(lead));
}

export function checkNotificationSpamCollision(input: NotificationSpamCollisionInput): NotificationCollisionCheckResult {
	const { notificationType, consentMarketing, hasServiceAppointmentToday, lastMarketingSentAt, messagesSentTodayCount = 0, targetDate = new Date() } = input;
	if (notificationType === "service") return { allowed: true };

	if (consentMarketing !== true) {
		return {
			allowed: false,
			suppressionType: "no_marketing_consent",
			reason: "Отправка отклонена: отсутствует согласие на рекламные рассылки (152-ФЗ и ст. 18 ч. 1 ФЗ «О рекламе»).",
		};
	}

	if (hasServiceAppointmentToday) {
		return {
			allowed: false,
			suppressionType: "service_priority_suppression",
			reason: "Сервисный приоритет: у пациента сегодня запланирован приём в клинике. Маркетинговые и recall-сообщения подавлены.",
		};
	}

	if (lastMarketingSentAt) {
		const lastSentTime = new Date(lastMarketingSentAt).getTime();
		if (!Number.isNaN(lastSentTime)) {
			const diffHours = (targetDate.getTime() - lastSentTime) / (1000 * 60 * 60);
			if (diffHours < MIN_MARKETING_INTERVAL_HOURS) {
				const hoursRemaining = Math.max(1, Math.ceil(MIN_MARKETING_INTERVAL_HOURS - diffHours));
				return {
					allowed: false,
					suppressionType: "rate_limit_24h",
					hoursRemaining,
					reason: `Защита от спама: с момента предыдущего контакта прошло менее 24 часов (осталось ${hoursRemaining} ч.).`,
				};
			}
		}
	}

	if (messagesSentTodayCount >= 1) {
		return {
			allowed: false,
			suppressionType: "same_day_collision",
			reason: "Коллизия сообщений: пациенту уже отправлено сообщение сегодня. Повторная отправка запрещена.",
		};
	}

	return { allowed: true };
}

export function formatChannelStatusRu(channelKey: string | null | undefined): string {
	if (!channelKey) return "Прямой звонок / Регистратура";
	const normalized = normalizeMarketingChannel(channelKey);
	return getMarketingChannelLabel(normalized);
}
