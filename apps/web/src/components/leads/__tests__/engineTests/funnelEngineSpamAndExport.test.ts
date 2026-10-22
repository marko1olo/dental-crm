import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateFunnelAnalysis,
	checkNotificationSpamCollision,
	exportFunnelReportCsv,
	exportFunnelReportSummaryText,
	filterMarketingEligibleLeads,
	formatChannelStatusRu,
	formatLeadSlaBreachSummary,
	type FunnelLead,
	isPatientEligibleForMarketing,
	MIN_MARKETING_INTERVAL_HOURS,
} from "../../leadsFunnelEngine";

describe("6. Export Formats (CSV & Text Digest)", () => {
	const sampleLead: FunnelLead = {
		id: "E1",
		name: "Анна К.",
		source: "Яндекс.Директ",
		status: "consult_booked",
		isPaid: true,
		actualRevenueRub: 55000,
	};

	it("6.1. Generates Excel-compliant CSV with BOM and semicolons", () => {
		const analysis = calculateFunnelAnalysis([sampleLead], "month");
		const csv = exportFunnelReportCsv(analysis);
		assert.ok(csv.startsWith("\uFEFF"), "Must start with UTF-8 BOM");
		assert.ok(csv.includes("ОТЧЕТ СКВОЗНОЙ ВОРОНКИ"));
		assert.ok(csv.includes("Яндекс.Директ"));
		assert.ok(csv.includes("55000"));
		assert.ok(csv.includes(";"));
	});

	it("6.2. Generates comprehensive text summary for Telegram / Management", () => {
		const analysis = calculateFunnelAnalysis([sampleLead], "all");
		const text = exportFunnelReportSummaryText(analysis);
		const normalizedText = text.replace(/[\u00A0\u202F]/g, " ");
		assert.ok(normalizedText.includes("ДАЙДЖЕСТ ВОРОНКИ ПАЦИЕНТОВ CRM ДЕНТЕ"));
		assert.ok(normalizedText.includes("Лидов получено: 1"));
		assert.ok(normalizedText.includes("Выручка: 55 000 ₽"));
		assert.ok(normalizedText.includes("ROMI:"));
	});
});

describe("10. 152-FZ & FZ-38 Consent Separation", () => {
	it("10.1. Recognizes consent from diverse patient/lead object schemas", () => {
		assert.equal(isPatientEligibleForMarketing(true), true);
		assert.equal(isPatientEligibleForMarketing({ consentMarketing: true }), true);
		assert.equal(isPatientEligibleForMarketing({ marketingOptIn: true }), true);
		assert.equal(isPatientEligibleForMarketing({ consents: { marketingPromotions: true } }), true);
		assert.equal(isPatientEligibleForMarketing({ communicationConsents: { marketing: true } }), true);
		assert.equal(isPatientEligibleForMarketing({ communicationConsents: { marketing: "granted" } }), true);
	});

	it("10.2. Strictly rejects when marketing consent is omitted, false, or null", () => {
		assert.equal(isPatientEligibleForMarketing(false), false);
		assert.equal(isPatientEligibleForMarketing(null), false);
		assert.equal(isPatientEligibleForMarketing(undefined), false);
		assert.equal(isPatientEligibleForMarketing({}), false);
		assert.equal(isPatientEligibleForMarketing({ consentMarketing: false }), false);
		assert.equal(isPatientEligibleForMarketing({ consentMedical: true }), false);
		assert.equal(isPatientEligibleForMarketing({ consents: { medicalCareProcessing: true, marketingPromotions: false } }), false);
	});

	it("10.3. filterMarketingEligibleLeads excludes non-consenting leads to prevent FAS fines", () => {
		const mixedAudience = [
			{ id: "1", name: "Согласился", consentMarketing: true },
			{ id: "2", name: "Только медицина", consentMarketing: false },
			{ id: "3", name: "Не указал", consentMarketing: null },
			{ id: "4", name: "Второй согласный", consents: { marketingPromotions: true } },
		];
		const filtered = filterMarketingEligibleLeads(mixedAudience);
		assert.equal(filtered.length, 2);
		assert.equal(filtered[0]?.id, "1");
		assert.equal(filtered[1]?.id, "4");
	});
});

describe("11. Notification Spam Collision & Rate Limiting Guard", () => {
	const fixedNow = new Date("2026-10-15T14:00:00Z");

	it("11.1. Service notifications (visit reminders, receipts) are unconditionally allowed", () => {
		const res = checkNotificationSpamCollision({
			patientId: "pat-1",
			notificationType: "service",
			consentMarketing: false,
			hasServiceAppointmentToday: true,
			messagesSentTodayCount: 5,
			targetDate: fixedNow,
		});
		assert.equal(res.allowed, true);
	});

	it("11.2. Marketing and recall are rejected if marketing consent is absent", () => {
		const res = checkNotificationSpamCollision({
			patientId: "pat-2",
			notificationType: "marketing",
			consentMarketing: false,
			targetDate: fixedNow,
		});
		assert.equal(res.allowed, false);
		assert.equal(res.suppressionType, "no_marketing_consent");
		assert.ok(res.reason?.includes("отсутствует согласие на рекламные рассылки"));
	});

	it("11.3. Suppresses marketing and recall when patient has service appointment today", () => {
		const res = checkNotificationSpamCollision({
			patientId: "pat-3",
			notificationType: "recall",
			consentMarketing: true,
			hasServiceAppointmentToday: true,
			targetDate: fixedNow,
		});
		assert.equal(res.allowed, false);
		assert.equal(res.suppressionType, "service_priority_suppression");
		assert.ok(res.reason?.includes("у пациента сегодня запланирован приём"));
	});

	it("11.4. Enforces 24-hour rate limit between marketing contacts", () => {
		const tenHoursAgo = new Date(fixedNow.getTime() - 10 * 3600 * 1000);
		const resBlocked = checkNotificationSpamCollision({
			patientId: "pat-4",
			notificationType: "marketing",
			consentMarketing: true,
			hasServiceAppointmentToday: false,
			lastMarketingSentAt: tenHoursAgo,
			targetDate: fixedNow,
		});
		assert.equal(resBlocked.allowed, false);
		assert.equal(resBlocked.suppressionType, "rate_limit_24h");
		assert.equal(resBlocked.hoursRemaining, 14);

		const twentyFiveHoursAgo = new Date(fixedNow.getTime() - 25 * 3600 * 1000);
		const resAllowed = checkNotificationSpamCollision({
			patientId: "pat-4",
			notificationType: "marketing",
			consentMarketing: true,
			hasServiceAppointmentToday: false,
			lastMarketingSentAt: twentyFiveHoursAgo,
			targetDate: fixedNow,
		});
		assert.equal(resAllowed.allowed, true);
	});

	it("11.5. Suppresses message on same-day collision (messagesSentTodayCount >= 1)", () => {
		const res = checkNotificationSpamCollision({
			patientId: "pat-5",
			notificationType: "marketing",
			consentMarketing: true,
			hasServiceAppointmentToday: false,
			messagesSentTodayCount: 1,
			targetDate: fixedNow,
		});
		assert.equal(res.allowed, false);
		assert.equal(res.suppressionType, "same_day_collision");
		assert.ok(res.reason?.includes("пациенту уже отправлено сообщение сегодня"));
	});

	it("11.6. Confirms MIN_MARKETING_INTERVAL_HOURS constant is exactly 24", () => {
		assert.equal(MIN_MARKETING_INTERVAL_HOURS, 24);
	});
});

describe("12. Human-Friendly Russian Channel Statuses & Speed-to-Lead SLA", () => {
	it("12.1. formatChannelStatusRu returns clean Russian names without technical IDs", () => {
		assert.equal(formatChannelStatusRu("yandex_direct"), "Яндекс.Директ");
		assert.equal(formatChannelStatusRu("gis_2"), "2ГИС Карты");
		assert.equal(formatChannelStatusRu("prodoctorov"), "ПроДокторов");
		assert.equal(formatChannelStatusRu("recommendations"), "Рекомендации / Сарафан");
		assert.equal(formatChannelStatusRu("site_seo"), "Сайт / SEO");
		assert.equal(formatChannelStatusRu("social_media"), "Соцсети / VK / TG");
		assert.equal(formatChannelStatusRu(null), "Прямой звонок / Регистратура");
		assert.equal(formatChannelStatusRu(""), "Прямой звонок / Регистратура");
	});

	it("12.2. formatLeadSlaBreachSummary classifies fresh, warning, and breached leads", () => {
		const now = new Date("2026-10-15T12:00:00Z");
		const leads: FunnelLead[] = [
			{ id: "fresh-1", name: "Свежий лид (5 мин)", status: "new", createdAt: new Date(now.getTime() - 5 * 60000).toISOString() },
			{ id: "warning-1", name: "Лид в зоне внимания (30 мин)", status: "new", createdAt: new Date(now.getTime() - 30 * 60000).toISOString() },
			{ id: "breach-1", name: "Просроченный лид (90 мин)", status: "new", createdAt: new Date(now.getTime() - 90 * 60000).toISOString() },
		];
		const summary = formatLeadSlaBreachSummary(leads, now);
		assert.equal(summary.freshCount, 1);
		assert.equal(summary.warningCount, 1);
		assert.equal(summary.breachedCount, 1);
		assert.ok(summary.summaryText.includes("просрочен регламент ответа у 1 обращений"));
	});

	it("12.3. formatLeadSlaBreachSummary reports normal status when no breaches exist", () => {
		const now = new Date("2026-10-15T12:00:00Z");
		const freshLeads: FunnelLead[] = [
			{ id: "fresh-2", name: "Быстрый ответ", status: "new", createdAt: new Date(now.getTime() - 3 * 60000).toISOString() },
		];
		const summary = formatLeadSlaBreachSummary(freshLeads, now);
		assert.equal(summary.breachedCount, 0);
		assert.equal(summary.warningCount, 0);
		assert.equal(summary.freshCount, 1);
		assert.ok(summary.summaryText.includes("SLA в норме"));
	});
});
