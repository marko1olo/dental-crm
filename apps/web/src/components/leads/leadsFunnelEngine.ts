/**
 * CRM END-TO-END FUNNEL & MARKETING INTELLIGENCE ENGINE (ДЕНТЕ CRM)
 *
 * Движок сквозной аналитики воронки пациентов и рекламных каналов.
 *
 * ЭТАПЫ ВОРОНКИ (6 базовых клинических стадий):
 * 1. `new`                  — Новые обращения (лид получен)
 * 2. `contacted`            — В работе / Квалифицированы оператором
 * 3. `consult_booked`       — Записаны на первичную консультацию
 * 4. `showed_up`            — Дошли до клиники (Show-up / Визит состоялся)
 * 5. `treatment_plan_accepted` — Согласован комплексный план лечения
 * 6. `paid`                 — Оплачено в кассу (первичный платеж внесен)
 *
 * СТРОГИЕ ПРАВИЛА:
 * - Все финансовые расчеты ведутся с точностью до копеек и рублей (без NaN / Infinity).
 * - Защита от деления на 0 во всех конверсиях и метриках (CPL, CAC, CPS, ROMI, LTV).
 * - Каноническая нормализация рекламных каналов РФ (Яндекс.Директ, 2ГИС, ПроДокторов, НаПоправку, SEO, Сарафан).
 * - 100% покрытие типов TypeScript без loose any.
 */

// Re-export all types, constants and export utilities (SSOT & Backward Compatibility)
export * from "./leadsFunnelTypes";
export * from "./leadsFunnelExport";

import {
	type CanonicalMarketingChannelKey,
	type ChannelFunnelMetric,
	type ChannelSpendMap,
	type ChannelEfficiencyRating,
	FUNNEL_STAGES,
	type FunnelAnalysisResult,
	type FunnelLead,
	type FunnelStageMetric,
	type FunnelTimePeriod,
	type LeadFunnelStageKey,
	MARKETING_CHANNELS,
	type MarketingMetricsSummary,
	getMarketingChannelLabel,
	normalizeMarketingChannel,
	type Lead,
	type LeadUtmParameters,
	type LeadAttributionDetails,
	type PatientAttributionRecord,
	type NotificationSpamCollisionInput,
	type NotificationCollisionCheckResult,
} from "./leadsFunnelTypes";

// ---------------------------------------------------------------------------
// 1. ОПРЕДЕЛЕНИЕ ДОСТИГНУТОГО ЭТАПА
// ---------------------------------------------------------------------------

/**
 * Определяет максимальный достигнутый этап воронки для лида.
 */
export function detectLeadStage(lead: FunnelLead): LeadFunnelStageKey {
	if (lead.stageReached) {
		return lead.stageReached;
	}

	const paidVal =
		lead.paidAmountRub ??
		(lead.paidAmountKopecks ? lead.paidAmountKopecks / 100 : 0);
	if (lead.isPaid || paidVal > 0) {
		return "paid";
	}

	if (lead.treatmentPlanAgreed) {
		return "treatment_plan_accepted";
	}

	if (lead.showedUp || lead.status === "showed_up") {
		return "showed_up";
	}

	if (lead.status === "consult_booked") {
		return "consult_booked";
	}

	if (lead.status === "contacted" || lead.status === "no_answer") {
		return "contacted";
	}

	return "new";
}

/**
 * Проверяет, прошел ли лид указанный этап воронки.
 * Сквозная логика: если лид на этапе 5 (paid), он гарантированно прошел этапы 0, 1, 2, 3, 4, 5.
 */
export function hasLeadPassedStage(
	leadStage: LeadFunnelStageKey,
	targetStage: LeadFunnelStageKey,
): boolean {
	const stageOrder: Record<LeadFunnelStageKey, number> = {
		new: 0,
		contacted: 1,
		consult_booked: 2,
		showed_up: 3,
		treatment_plan_accepted: 4,
		paid: 5,
	};
	return stageOrder[leadStage] >= stageOrder[targetStage];
}

// ---------------------------------------------------------------------------
// 2. ФИЛЬТРАЦИЯ ПО ПЕРИОДУ
// ---------------------------------------------------------------------------

/**
 * Фильтрация массива лидов по выбранному периоду.
 */
export function filterLeadsByPeriod(
	leads: readonly FunnelLead[],
	period: FunnelTimePeriod,
	referenceDate: Date = new Date(),
): FunnelLead[] {
	if (period === "all") {
		return [...leads];
	}

	const refTime = referenceDate.getTime();
	let startThresholdMs: number;

	if (period === "today") {
		const startOfToday = new Date(
			referenceDate.getFullYear(),
			referenceDate.getMonth(),
			referenceDate.getDate(),
		);
		startThresholdMs = startOfToday.getTime();
	} else if (period === "week") {
		startThresholdMs = refTime - 7 * 24 * 60 * 60 * 1000;
	} else if (period === "month") {
		startThresholdMs = refTime - 30 * 24 * 60 * 60 * 1000;
	} else if (period === "quarter") {
		startThresholdMs = refTime - 90 * 24 * 60 * 60 * 1000;
	} else if (period === "year") {
		startThresholdMs = refTime - 365 * 24 * 60 * 60 * 1000;
	} else {
		return [...leads];
	}

	return leads.filter((lead) => {
		if (!lead.createdAt) {
			return true;
		}
		const createdTime = new Date(lead.createdAt).getTime();
		if (Number.isNaN(createdTime)) {
			return true;
		}
		return createdTime >= startThresholdMs && createdTime <= refTime + 60000;
	});
}

// ---------------------------------------------------------------------------
// 3. БЮДЖЕТЫ И МАТЕМАТИКА
// ---------------------------------------------------------------------------

/**
 * Получение стандартного набора рекламных бюджетов по умолчанию
 */
export function getDefaultChannelSpendMap(): Record<
	CanonicalMarketingChannelKey,
	number
> {
	const map = {} as Record<CanonicalMarketingChannelKey, number>;
	for (const ch of MARKETING_CHANNELS) {
		map[ch.key] = ch.defaultSpendRub;
	}
	return map;
}

/**
 * Безопасное деление двух чисел с округлением до 2 знаков после запятой
 */
export function safePercent(
	numerator: number,
	denominator: number,
	decimals = 1,
): number {
	if (!denominator || denominator <= 0 || !Number.isFinite(denominator)) {
		return 0;
	}
	if (!numerator || !Number.isFinite(numerator)) {
		return 0;
	}
	const val = (numerator / denominator) * 100;
	const factor = 10 ** decimals;
	return Math.round(val * factor) / factor;
}

/**
 * Безопасное деление для расчета средних и стоимостей (рубли)
 */
export function safeDivide(
	numerator: number,
	denominator: number,
	decimals = 0,
): number {
	if (!denominator || denominator <= 0 || !Number.isFinite(denominator)) {
		return 0;
	}
	if (!numerator || !Number.isFinite(numerator)) {
		return 0;
	}
	const val = numerator / denominator;
	if (decimals === 0) {
		return Math.round(val);
	}
	const factor = 10 ** decimals;
	return Math.round(val * factor) / factor;
}

/**
 * Извлекает числовую выручку по лиду (в рублях)
 */
export function extractLeadRevenueRub(lead: FunnelLead): number {
	if (typeof lead.actualRevenueRub === "number" && lead.actualRevenueRub > 0) {
		return Math.round(lead.actualRevenueRub);
	}
	if (typeof lead.paidAmountRub === "number" && lead.paidAmountRub > 0) {
		return Math.round(lead.paidAmountRub);
	}
	if (
		typeof lead.paidAmountKopecks === "number" &&
		lead.paidAmountKopecks > 0
	) {
		return Math.round(lead.paidAmountKopecks / 100);
	}
	if (lead.expectedRevenue) {
		const num = Number(lead.expectedRevenue);
		if (Number.isFinite(num) && num > 0) {
			return Math.round(num);
		}
	}
	return 0;
}

/**
 * Оценка эффективности рекламного канала
 */
export function evaluateChannelEfficiency(
	spendRub: number,
	paidCount: number,
	romiPercent: number,
): { rating: ChannelEfficiencyRating; recommendation: string } {
	if (spendRub <= 0) {
		return {
			rating: "organic",
			recommendation: "Бесплатный/органический трафик. Развивать реферальные программы.",
		};
	}
	if (paidCount === 0) {
		return {
			rating: "critical",
			recommendation: "0 продаж при наличии расходов. Проверить скрипты и квалификацию лидов.",
		};
	}
	if (romiPercent >= 300) {
		return {
			rating: "excellent",
			recommendation: "Сверхвысокая окупаемость (>300%). Масштабировать рекламный бюджет.",
		};
	}
	if (romiPercent >= 100) {
		return {
			rating: "good",
			recommendation: "Рентабельный канал. Удерживать объем и оптимизировать CPL.",
		};
	}
	if (romiPercent >= 0) {
		return {
			rating: "warning",
			recommendation: "Работает в ноль/слабый плюс. Требуется повышение среднего чека.",
		};
	}
	return {
		rating: "critical",
		recommendation: "Отрицательный ROMI. Пересмотреть посадочные страницы или снизить ставки.",
	};
}

// ---------------------------------------------------------------------------
// 4. ОСНОВНОЙ ДВИЖОК РАСЧЕТА ВОРОНКИ
// ---------------------------------------------------------------------------

/**
 * Комплексный расчет сквозной воронки лидов и маркетинговой аналитики
 */
export function calculateFunnelAnalysis(
	rawLeads: readonly FunnelLead[],
	period: FunnelTimePeriod = "all",
	customSpendMap?: ChannelSpendMap,
	referenceDate: Date = new Date(),
): FunnelAnalysisResult {
	const leads = filterLeadsByPeriod(rawLeads, period, referenceDate);
	const defaultSpends = getDefaultChannelSpendMap();

	// Объединяем бюджеты
	const channelSpends: Record<CanonicalMarketingChannelKey, number> = {
		yandex_direct:
			customSpendMap?.yandex_direct ?? defaultSpends.yandex_direct,
		gis_2: customSpendMap?.gis_2 ?? defaultSpends.gis_2,
		prodoctorov: customSpendMap?.prodoctorov ?? defaultSpends.prodoctorov,
		napopravku: customSpendMap?.napopravku ?? defaultSpends.napopravku,
		site_seo: customSpendMap?.site_seo ?? defaultSpends.site_seo,
		recommendations:
			customSpendMap?.recommendations ?? defaultSpends.recommendations,
		social_media: customSpendMap?.social_media ?? defaultSpends.social_media,
		other: customSpendMap?.other ?? defaultSpends.other,
	};

	// 1. Определение этапов для каждого лида
	const leadsWithStages = leads.map((lead) => ({
		lead,
		stage: detectLeadStage(lead),
		channel: normalizeMarketingChannel(lead.source),
		revenueRub: extractLeadRevenueRub(lead),
	}));

	// 2. Расчет счетчиков этапов
	const stageCounts: Record<LeadFunnelStageKey, number> = {
		new: 0,
		contacted: 0,
		consult_booked: 0,
		showed_up: 0,
		treatment_plan_accepted: 0,
		paid: 0,
	};

	for (const item of leadsWithStages) {
		for (const stageCfg of FUNNEL_STAGES) {
			if (hasLeadPassedStage(item.stage, stageCfg.key)) {
				stageCounts[stageCfg.key] += 1;
			}
		}
	}

	const totalLeadsCount = stageCounts.new;

	// 3. Формирование поэтапной воронки
	const stages: FunnelStageMetric[] = FUNNEL_STAGES.map((cfg, idx) => {
		const count = stageCounts[cfg.key] ?? 0;
		const nextStageCfg = FUNNEL_STAGES[idx + 1];
		const nextCount = nextStageCfg ? (stageCounts[nextStageCfg.key] ?? 0) : 0;
		const dropCount = idx < FUNNEL_STAGES.length - 1 ? Math.max(0, count - nextCount) : 0;
		const dropRatePercent = safePercent(dropCount, count);

		const prevStageCfg = idx > 0 ? FUNNEL_STAGES[idx - 1] : undefined;
		const prevCount = prevStageCfg ? (stageCounts[prevStageCfg.key] ?? count) : count;
		const conversionFromPrevPercent =
			idx === 0 ? 100 : safePercent(count, prevCount);
		const conversionFromFirstPercent = safePercent(count, totalLeadsCount);

		return {
			key: cfg.key,
			index: cfg.index,
			label: cfg.label,
			shortLabel: cfg.shortLabel,
			color: cfg.color,
			badgeColor: cfg.badgeColor,
			count,
			dropCount,
			dropRatePercent,
			conversionFromFirstPercent,
			conversionFromPrevPercent,
		};
	});

	// 4. Финансовые и маркетинговые суммы
	let totalMarketingSpendRub = 0;
	for (const key of Object.keys(channelSpends) as CanonicalMarketingChannelKey[]) {
		totalMarketingSpendRub += channelSpends[key];
	}

	let totalRevenueRub = 0;
	for (const item of leadsWithStages) {
		if (hasLeadPassedStage(item.stage, "paid")) {
			totalRevenueRub += item.revenueRub;
		}
	}

	const paidLeads = stageCounts.paid;
	const bookedLeads = stageCounts.consult_booked;
	const showUpLeads = stageCounts.showed_up;
	const contactedLeads = stageCounts.contacted;
	const agreedPlanLeads = stageCounts.treatment_plan_accepted;

	const showUpRatePercent = safePercent(showUpLeads, bookedLeads);
	const bookingRatePercent = safePercent(bookedLeads, totalLeadsCount);
	const planAcceptanceRatePercent = safePercent(agreedPlanLeads, showUpLeads);
	const overallConversionPercent = safePercent(paidLeads, totalLeadsCount);

	const avgBillRub = safeDivide(totalRevenueRub, paidLeads);
	const cplRub = safeDivide(totalMarketingSpendRub, totalLeadsCount);
	const cpsRub = safeDivide(totalMarketingSpendRub, showUpLeads);
	const cacRub = safeDivide(totalMarketingSpendRub, paidLeads);

	const netMarketingProfitRub = totalRevenueRub - totalMarketingSpendRub;
	const romiPercent =
		totalMarketingSpendRub > 0
			? safePercent(netMarketingProfitRub, totalMarketingSpendRub)
			: 0;

	// Фактический LTV на основе реальных оплат пациентов (без синтетических 2.5x множителей)
	const ltvEstimatedRub = avgBillRub;
	const ltvToCacRatio = cacRub > 0 ? safeDivide(ltvEstimatedRub, cacRub, 1) : 0;

	const summary: MarketingMetricsSummary = {
		totalLeads: totalLeadsCount,
		contactedLeads,
		bookedLeads,
		showUpLeads,
		agreedPlanLeads,
		paidLeads,
		showUpRatePercent,
		bookingRatePercent,
		planAcceptanceRatePercent,
		overallConversionPercent,
		totalMarketingSpendRub,
		totalRevenueRub,
		totalRevenueKopecks: totalRevenueRub * 100,
		avgBillRub,
		netMarketingProfitRub,
		cplRub,
		cpsRub,
		cacRub,
		romiPercent,
		ltvEstimatedRub,
		ltvToCacRatio,
	};

	// 5. Расчет по маркетинговым каналам
	const channels: ChannelFunnelMetric[] = MARKETING_CHANNELS.map((ch) => {
		const channelLeads = leadsWithStages.filter((l) => l.channel === ch.key);
		const spendRub = channelSpends[ch.key] ?? 0;

		let leadsCount = 0;
		let bookedCount = 0;
		let showUpCount = 0;
		let agreedCount = 0;
		let paidCount = 0;
		let revenueRub = 0;

		for (const item of channelLeads) {
			leadsCount += 1;
			if (hasLeadPassedStage(item.stage, "consult_booked")) bookedCount += 1;
			if (hasLeadPassedStage(item.stage, "showed_up")) showUpCount += 1;
			if (hasLeadPassedStage(item.stage, "treatment_plan_accepted")) agreedCount += 1;
			if (hasLeadPassedStage(item.stage, "paid")) {
				paidCount += 1;
				revenueRub += item.revenueRub;
			}
		}

		const conversionRatePercent = safePercent(paidCount, leadsCount);
		const showUpRatePercent = safePercent(showUpCount, bookedCount);
		const avgBill = safeDivide(revenueRub, paidCount);
		const cpl = safeDivide(spendRub, leadsCount);
		const cac = safeDivide(spendRub, paidCount);
		const netProfit = revenueRub - spendRub;
		const romi = spendRub > 0 ? safePercent(netProfit, spendRub) : 0;

		const { rating, recommendation } = evaluateChannelEfficiency(
			spendRub,
			paidCount,
			romi,
		);

		return {
			channelKey: ch.key,
			channelLabel: ch.label,
			color: ch.color,
			spendRub,
			leadsCount,
			bookedCount,
			showUpCount,
			agreedCount,
			paidCount,
			conversionRatePercent,
			showUpRatePercent,
			revenueRub,
			avgBillRub: avgBill,
			cplRub: cpl,
			cacRub: cac,
			romiPercent: romi,
			efficiencyRating: rating,
			recommendation,
		};
	});

	return {
		period,
		filteredLeadsCount: leads.length,
		stages,
		summary,
		channels,
	};
}

// ---------------------------------------------------------------------------
// 5. АТРИБУЦИЯ ЛИДОВ И ПЕРЕНОС В КАРТУ ПАЦИЕНТА (ZERO ATTRIBUTION LOSS)
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
// 6. РАЗДЕЛЕНИЕ СОГЛАСИЙ 152-ФЗ (МЕДИЦИНА VS МАРКЕТИНГ)
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
// 7. ЗАЩИТА ОТ СПАМ-КОЛЛИЗИЙ И ОГРАНИЧЕНИЕ ЧАСТОТЫ УВЕДОМЛЕНИЙ (RATE LIMITING)
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
// 8. ЧЕЛОВЕЧЕСКИЙ РУССКИЙ ЯЗЫК ДЛЯ СТАТУСОВ И РЕГЛАМЕНТА SLA (БЕЗ ШИФРОВ)
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

/**
 * Сводка просроченных регламентов ответа (Speed-to-Lead SLA)
 */
export function formatLeadSlaBreachSummary(
	leads: readonly FunnelLead[],
	now: Date = new Date(),
): {
	breachedCount: number;
	warningCount: number;
	freshCount: number;
	summaryText: string;
} {
	let breachedCount = 0;
	let warningCount = 0;
	let freshCount = 0;

	const nowTime = now.getTime();

	for (const lead of leads) {
		const rawDate = lead.stageEnteredAt || lead.createdAt;
		const leadTime = rawDate ? new Date(rawDate).getTime() : NaN;
		if (Number.isNaN(leadTime)) {
			freshCount += 1;
			continue;
		}

		const minutesElapsed = Math.max(0, Math.floor((nowTime - leadTime) / 60000));
		if (minutesElapsed < 15) {
			freshCount += 1;
		} else if (minutesElapsed < 60) {
			warningCount += 1;
		} else {
			breachedCount += 1;
		}
	}

	const summaryText =
		breachedCount > 0
			? `Внимание: просрочен регламент ответа у ${breachedCount} обращений! Требуется реакция администратора.`
			: warningCount > 0
				? `Внимание: ${warningCount} обращений ожидают ответа от 15 до 60 минут.`
				: "Все обращения обработаны вовремя (SLA в норме).";

	return {
		breachedCount,
		warningCount,
		freshCount,
		summaryText,
	};
}
