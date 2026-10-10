/**
 * FUNNEL ENGINE MODULES: CRM LEAK DETECTOR & ATTRIBUTION ENGINE
 *
 * 1. Алгоритм выявления "зависших" лидов и утечек выручки на этапе администратора
 *    (отсутствие запланированного контакта, повторных звонков, срывы записей).
 * 2. Атрибуция лидов, UTM-парсинг и безопасный перенос в медкарту (152-ФЗ / 38-ФЗ).
 * 3. Защита от спам-коллизий (Notification Spam Collision Guard, интервал 24ч).
 */

import {
	detectLeadStage,
	extractLeadRevenueRub,
} from "./funnelConversionCalculator.js";
import {
	type FunnelLead,
	type Lead,
	type LeadUtmParameters,
	type LeadAttributionDetails,
	type PatientAttributionRecord,
	type NotificationSpamCollisionInput,
	type NotificationCollisionCheckResult,
	type CrmFunnelLeak,
	type CrmFunnelLeakReport,
	type LeadFunnelStageKey,
	getMarketingChannelLabel,
	normalizeMarketingChannel,
} from "./types.js";

// ---------------------------------------------------------------------------
// 1. ДЕТЕКТОР УТЕЧЕК ВОРОНКИ И ЗАВИСШИХ ЛИДОВ (CRM LEAK DETECTOR)
// ---------------------------------------------------------------------------

/** По умолчанию средний клинический чек для оценки упущенной выручки (руб.) */
const DEFAULT_ESTIMATED_TICKET_RUB = 15000;

/**
 * Выявляет "зависшие" обращения и потенциальные утечки выручки на этапах воронки
 */
export function detectCrmFunnelLeaks(
	leads: readonly FunnelLead[],
	options: {
		maxIdleHoursNew?: number;
		maxIdleHoursContacted?: number;
		now?: Date;
	} = {},
): CrmFunnelLeakReport {
	const {
		maxIdleHoursNew = 2,
		maxIdleHoursContacted = 24,
		now = new Date(),
	} = options;

	const nowMs = now.getTime();
	const leaks: CrmFunnelLeak[] = [];
	const leaksByStage: Record<LeadFunnelStageKey, number> = {
		new: 0,
		contacted: 0,
		consult_booked: 0,
		showed_up: 0,
		treatment_plan_accepted: 0,
		paid: 0,
	};

	let totalLeakedRevenueRub = 0;
	let criticalLeaksCount = 0;
	let warningLeaksCount = 0;

	for (const lead of leads) {
		const stage = detectLeadStage(lead);

		// Если лид уже оплачен, утечки нет
		if (stage === "paid") {
			continue;
		}

		const rawDate = lead.stageEnteredAt || lead.createdAt;
		const leadTime = rawDate ? new Date(rawDate).getTime() : NaN;
		if (Number.isNaN(leadTime)) {
			continue;
		}

		const hoursStalled = Math.max(0, Math.floor((nowMs - leadTime) / (3600 * 1000)));
		const channelKey = normalizeMarketingChannel(lead.source);
		const baseRevenue = extractLeadRevenueRub(lead);
		const potentialRevenueRub =
			baseRevenue > 0 ? baseRevenue : DEFAULT_ESTIMATED_TICKET_RUB;

		let isLeak = false;
		let severity: "critical" | "warning" = "warning";
		let reason = "";
		let suggestedAction = "";

		if (stage === "new" && hoursStalled >= maxIdleHoursNew) {
			isLeak = true;
			severity = hoursStalled >= 12 ? "critical" : "warning";
			reason = `Новое обращение без первичного звонка уже ${hoursStalled} ч.`;
			suggestedAction = "Связаться с пациентом в течение 10 минут либо передать дежурному администратору.";
		} else if (stage === "contacted" && hoursStalled >= maxIdleHoursContacted) {
			isLeak = true;
			severity = hoursStalled >= 48 ? "critical" : "warning";
			reason = `Лид в работе без назначенной консультации более ${hoursStalled} ч.`;
			suggestedAction = "Повторный звонок администратора для согласования удобного времени визита.";
		} else if (stage === "treatment_plan_accepted" && hoursStalled >= 72) {
			isLeak = true;
			severity = "critical";
			reason = `План лечения согласован, но нет записи на приём и оплаты более ${hoursStalled} ч.`;
			suggestedAction = "Связаться куратору лечения для бронирования даты первого лечебного визита.";
		}

		if (isLeak) {
			leaksByStage[stage] += 1;
			totalLeakedRevenueRub += potentialRevenueRub;
			if (severity === "critical") {
				criticalLeaksCount += 1;
			} else {
				warningLeaksCount += 1;
			}

			leaks.push({
				leadId: lead.id ?? null,
				leadName: lead.name || "Лид без имени",
				phone: lead.phone ?? null,
				currentStage: stage,
				source: lead.source || "Не указан",
				channelKey,
				hoursStalled,
				potentialRevenueRub,
				severity,
				reason,
				suggestedAction,
			});
		}
	}

	const totalLeakedCount = leaks.length;
	const summaryText =
		totalLeakedCount > 0
			? `Обнаружено ${totalLeakedCount} зависших лидов (${criticalLeaksCount} критических). Потенциальная утечка выручки: ${totalLeakedRevenueRub.toLocaleString("ru-RU")} ₽.`
			: "Утечек воронки не обнаружено. Все лиды в активной работе.";

	return {
		totalLeakedCount,
		totalLeakedRevenueRub,
		criticalLeaksCount,
		warningLeaksCount,
		leaksByStage,
		leaks,
		summaryText,
	};
}

/**
 * Расчет влияния утечек по этапам воронки
 */
export function calculateAdminLeakImpact(leaks: readonly CrmFunnelLeak[]): {
	totalLossRub: number;
	criticalCount: number;
	stageBreakdown: Record<LeadFunnelStageKey, number>;
} {
	const stageBreakdown: Record<LeadFunnelStageKey, number> = {
		new: 0,
		contacted: 0,
		consult_booked: 0,
		showed_up: 0,
		treatment_plan_accepted: 0,
		paid: 0,
	};

	let totalLossRub = 0;
	let criticalCount = 0;

	for (const leak of leaks) {
		totalLossRub += leak.potentialRevenueRub;
		if (leak.severity === "critical") {
			criticalCount += 1;
		}
		stageBreakdown[leak.currentStage] = (stageBreakdown[leak.currentStage] ?? 0) + 1;
	}

	return {
		totalLossRub,
		criticalCount,
		stageBreakdown,
	};
}

// ---------------------------------------------------------------------------
// 2. АТРИБУЦИЯ ЛИДОВ И ПЕРЕНОС В КАРТУ ПАЦИЕНТА (ZERO ATTRIBUTION LOSS)
// ---------------------------------------------------------------------------

/**
 * Парсинг UTM-параметров из строки (URL, query string или текстовый блок)
 */
export function parseUtmParameters(text?: string | null): LeadUtmParameters {
	const defaultResult: LeadUtmParameters = {
		utm_source: null,
		utm_medium: null,
		utm_campaign: null,
		utm_content: null,
		utm_term: null,
	};

	if (!text || typeof text !== "string") {
		return defaultResult;
	}

	const result: Record<string, string> = {};
	const utmKeys = [
		"utm_source",
		"utm_medium",
		"utm_campaign",
		"utm_content",
		"utm_term",
	] as const;

	try {
		// Если это полноценный URL или строка с query параметрами
		const queryString = text.includes("?")
			? text.split("?")[1]
			: text.includes("&") || text.includes("=")
				? text
				: "";

		if (queryString) {
			const pairs = queryString.split("&");
			for (const pair of pairs) {
				const [k, v] = pair.split("=");
				if (k && v) {
					const cleanKey = decodeURIComponent(
						k.trim().replace(/\+/g, " "),
					).toLowerCase();
					if (cleanKey.startsWith("utm_")) {
						result[cleanKey] = decodeURIComponent(
							v.trim().replace(/\+/g, " "),
						);
					}
				}
			}
		}
	} catch {
		// Игнорируем ошибки парсинга URL
	}

	// Поиск отдельных параметров по регулярному выражению в тексте
	for (const key of utmKeys) {
		if (!result[key]) {
			const regex = new RegExp(`(?:^|[?&\\s])${key}=([^&\\s]+)`, "i");
			const match = text.match(regex);
			if (match && match[1]) {
				const rawVal = match[1].replace(/\+/g, " ");
				try {
					result[key] = decodeURIComponent(rawVal);
				} catch {
					result[key] = rawVal;
				}
			}
		}
	}

	return {
		utm_source: result.utm_source || null,
		utm_medium: result.utm_medium || null,
		utm_campaign: result.utm_campaign || null,
		utm_content: result.utm_content || null,
		utm_term: result.utm_term || null,
	};
}

/**
 * Полное извлечение атрибуции из лида (канал, метки, первичный запрос)
 */
export function extractLeadAttribution(
	lead: Partial<FunnelLead> | Partial<Lead>,
): LeadAttributionDetails {
	const sourceRaw = (lead.source || "").trim();
	const channelKey = normalizeMarketingChannel(sourceRaw);
	const channelLabel = getMarketingChannelLabel(channelKey);

	// Парсим UTM из источника и примечаний
	const utmFromSource = parseUtmParameters(sourceRaw);
	const utmFromNotes = parseUtmParameters(lead.notes || "");

	const utm: LeadUtmParameters = {
		utm_source: utmFromSource.utm_source || utmFromNotes.utm_source || null,
		utm_medium: utmFromSource.utm_medium || utmFromNotes.utm_medium || null,
		utm_campaign: utmFromSource.utm_campaign || utmFromNotes.utm_campaign || null,
		utm_content: utmFromSource.utm_content || utmFromNotes.utm_content || null,
		utm_term: utmFromSource.utm_term || utmFromNotes.utm_term || null,
	};

	const hasUtmTags = Boolean(
		utm.utm_source ||
			utm.utm_medium ||
			utm.utm_campaign ||
			utm.utm_content ||
			utm.utm_term,
	);

	const primaryInquiry = lead.notes ? lead.notes.trim() : null;

	return {
		channelKey,
		channelLabel,
		sourceRaw,
		utm,
		primaryInquiry,
		hasUtmTags,
	};
}

/**
 * Создание структуры атрибуции для переноса в карточку пациента (Zero Attribution Loss)
 * с разделением согласий по 152-ФЗ и ФЗ-38.
 */
export function createPatientAttributionRecord(
	lead: FunnelLead | Lead,
	options: {
		consentMarketing?: boolean;
		consentMedical?: boolean;
	} = {},
): PatientAttributionRecord {
	const attr = extractLeadAttribution(lead);
	const patientName = lead.name || (lead as Lead).patientName || "Пациент";
	const phone = lead.phone ? lead.phone.trim() : null;

	const medicalCareProcessing = options.consentMedical ?? true;
	const marketingPromotions = options.consentMarketing ?? false;

	const utmSuffix = attr.hasUtmTags
		? ` [UTM: ${[
				attr.utm.utm_source && `src=${attr.utm.utm_source}`,
				attr.utm.utm_campaign && `cmp=${attr.utm.utm_campaign}`,
				attr.utm.utm_medium && `med=${attr.utm.utm_medium}`,
			]
				.filter(Boolean)
				.join(", ")}]`
		: "";

	const inquirySuffix = attr.primaryInquiry ? ` | Запрос: ${attr.primaryInquiry}` : "";

	const preferredAppointmentNote = `src:${attr.channelLabel}${utmSuffix}${inquirySuffix}`;

	const dataProcessingBasisNote = `152-ФЗ: Обработка персданных для медпомощи — ${
		medicalCareProcessing ? "согласие получено" : "отказ"
	}. Рекламные рассылки и SMS (ФЗ-38) — ${
		marketingPromotions ? "согласие подтверждено" : "отказ / исключён из рассылок"
	}. Первичный источник: ${attr.channelLabel}.`;

	return {
		patientName,
		phone,
		advertisingSource: attr.channelLabel,
		sourceChannelKey: attr.channelKey,
		primaryInquiry: attr.primaryInquiry,
		utm: attr.utm,
		administrativeProfile: {
			advertisingSource: attr.channelLabel,
			preferredAppointmentNote,
			dataProcessingBasisNote,
			utmSource: attr.utm.utm_source,
			utmMedium: attr.utm.utm_medium,
			utmCampaign: attr.utm.utm_campaign,
		},
		consents: {
			medicalCareProcessing,
			marketingPromotions,
		},
	};
}

/**
 * Связка платежей пациента с атрибуцией лида для сохранения точности ROMI/ROI
 * «Лид -> Пациент -> Оплаченное лечение»
 */
export function linkPatientRevenueToLeadAttribution(
	leads: readonly FunnelLead[],
	payments: readonly {
		leadId?: string;
		patientId?: string;
		phone?: string;
		paidAmountRub: number;
	}[],
): FunnelLead[] {
	return leads.map((lead) => {
		// Нормализация телефонов (отсечение префиксов +7 / 8 для точного сопоставления 10-значного номера)
		const normalizePhone = (raw?: string | null): string => {
			if (!raw) return "";
			const digits = raw.replace(/\D/g, "");
			return digits.length >= 10 ? digits.slice(-10) : digits;
		};

		const cleanLeadPhone = normalizePhone(lead.phone);
		const leadMatches = payments.filter((p) => {
			if (p.leadId && p.leadId === lead.id) return true;
			if (
				p.phone &&
				cleanLeadPhone &&
				normalizePhone(p.phone) === cleanLeadPhone
			) {
				return true;
			}
			return false;
		});

		if (leadMatches.length === 0) {
			return lead;
		}

		const totalPaymentsRub = leadMatches.reduce(
			(sum, p) => sum + (Number.isFinite(p.paidAmountRub) ? p.paidAmountRub : 0),
			0,
		);

		const currentRev = extractLeadRevenueRub(lead);
		const newRevenueRub = Math.max(currentRev, Math.round(totalPaymentsRub));

		const updated: FunnelLead = {
			...lead,
			actualRevenueRub: newRevenueRub,
			paidAmountRub: newRevenueRub,
			paidAmountKopecks: newRevenueRub * 100,
			...(newRevenueRub > 0 ? { isPaid: true, stageReached: "paid" } : {}),
		};
		return updated;
	});
}

// ---------------------------------------------------------------------------
// 3. РАЗДЕЛЕНИЕ СОГЛАСИЙ 152-ФЗ (МЕДИЦИНА VS МАРКЕТИНГ)
// ---------------------------------------------------------------------------

/**
 * Проверка права на отправку маркетинговых / рекламных сообщений (152-ФЗ и ФЗ «О рекламе» ст. 18 ч. 1).
 * Строгий отсев: если явного согласия нет — пациент КАТЕГОРИЧЕСКИ исключается из маркетинговых кампаний.
 */
export function isPatientEligibleForMarketing(consentState: unknown): boolean {
	if (consentState === true) return true;
	if (!consentState || typeof consentState !== "object") return false;

	const obj = consentState as Record<string, unknown>;

	if (obj.consentMarketing === true || obj.marketingOptIn === true) {
		return true;
	}

	if (
		obj.consents &&
		typeof obj.consents === "object" &&
		(obj.consents as Record<string, unknown>).marketingPromotions === true
	) {
		return true;
	}

	if (
		obj.communicationConsents &&
		typeof obj.communicationConsents === "object"
	) {
		const cc = obj.communicationConsents as Record<string, unknown>;
		if (cc.marketing === true || cc.marketing === "granted") {
			return true;
		}
	}

	return false;
}

/**
 * Фильтрация аудитории для маркетинговых кампаний с исключением пациентов без согласия (152-ФЗ).
 */
export function filterMarketingEligibleLeads<
	T extends {
		consentMarketing?: boolean | null;
		marketingOptIn?: boolean | null;
		consents?: { marketingPromotions?: boolean };
	},
>(leads: readonly T[]): T[] {
	return leads.filter((lead) => isPatientEligibleForMarketing(lead));
}

// ---------------------------------------------------------------------------
// 4. ЗАЩИТА ОТ СПАМ-КОЛЛИЗИЙ И ОГРАНИЧЕНИЕ ЧАСТОТЫ УВЕДОМЛЕНИЙ (RATE LIMITING)
// ---------------------------------------------------------------------------

export const MIN_MARKETING_INTERVAL_HOURS = 24;

/**
 * Движок предотвращения спам-коллизий (Notification Spam Collision Guard).
 *
 * ПРАВИЛА:
 * 1. Согласие 152-ФЗ / 38-ФЗ: без маркетингового согласия промо-рассылки отклоняются сразу.
 * 2. Сервисный приоритет визита: если у пациента сегодня приём/сервисное напоминание,
 *    любые маркетинговые рассылки и диспансерные recalls на этот день ПОДАВЛЯЮТСЯ.
 * 3. Межсообщенческий интервал: не менее 24 часов между маркетинговыми/recall контактами.
 * 4. Защита от спама в один день: пациент не должен получать несколько сообщений в сутки.
 */
export function checkNotificationSpamCollision(
	input: NotificationSpamCollisionInput,
): NotificationCollisionCheckResult {
	const {
		notificationType,
		consentMarketing,
		hasServiceAppointmentToday,
		lastMarketingSentAt,
		messagesSentTodayCount = 0,
		targetDate = new Date(),
	} = input;

	// Сервисные уведомления (о визите, отмене, переносе, чеке) имеют наивысший приоритет
	if (notificationType === "service") {
		return { allowed: true };
	}

	// 1. Проверка согласия по 152-ФЗ и ФЗ-38 для рекламных сообщений
	if (consentMarketing !== true) {
		return {
			allowed: false,
			suppressionType: "no_marketing_consent",
			reason:
				"Отправка отклонена: отсутствует согласие на рекламные рассылки (152-ФЗ и ст. 18 ч. 1 ФЗ «О рекламе»).",
		};
	}

	// 2. Сервисный приоритет визита: напоминание о записи на прием подавляет рекламу на этот день
	if (hasServiceAppointmentToday) {
		return {
			allowed: false,
			suppressionType: "service_priority_suppression",
			reason:
				"Сервисный приоритет: у пациента сегодня запланирован приём в клинике. Маркетинговые и recall-сообщения на этот день подавлены.",
		};
	}

	// 3. Межсообщенческий интервал (не менее 24 часов)
	if (lastMarketingSentAt) {
		const lastSentTime = new Date(lastMarketingSentAt).getTime();
		if (!Number.isNaN(lastSentTime)) {
			const diffHours = (targetDate.getTime() - lastSentTime) / (1000 * 60 * 60);
			if (diffHours < MIN_MARKETING_INTERVAL_HOURS) {
				const hoursRemaining = Math.max(
					1,
					Math.ceil(MIN_MARKETING_INTERVAL_HOURS - diffHours),
				);
				return {
					allowed: false,
					suppressionType: "rate_limit_24h",
					hoursRemaining,
					reason: `Защита от спама: с момента предыдущего контакта прошло менее 24 часов (осталось ${hoursRemaining} ч.).`,
				};
			}
		}
	}

	// 4. Ограничение нескольких сообщений в один день
	if (messagesSentTodayCount >= 1) {
		return {
			allowed: false,
			suppressionType: "same_day_collision",
			reason:
				"Коллизия сообщений: пациенту уже отправлено сообщение сегодня. Повторная отправка запрещена.",
		};
	}

	return { allowed: true };
}

// ---------------------------------------------------------------------------
// 5. ЧЕЛОВЕЧЕСКИЙ РУССКИЙ ЯЗЫК ДЛЯ СТАТУСОВ КАНАЛОВ (БЕЗ ШИФРОВ)
// ---------------------------------------------------------------------------

/**
 * Преобразование технического ключа канала в понятное название на русском языке
 */
export function formatChannelStatusRu(
	channelKey: string | null | undefined,
): string {
	if (!channelKey) return "Прямой звонок / Регистратура";
	const normalized = normalizeMarketingChannel(channelKey);
	return getMarketingChannelLabel(normalized);
}
