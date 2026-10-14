/**
 * marketingAnalyticsEngine.ts — Layer 1/2: Чистый аналитический движок маркетинга.
 * Расчет ROMI, CAC, LTV, конверсий сквозной воронки от клика до дошедшего пациента (Фичи #28 и #35).
 * 
 * ИНВАРИАНТ: 100% точность в копейках, отсутствие мутаций бизнес-логики, соблюдение 152-ФЗ / 323-ФЗ ст. 13.
 */

import { formatInitialsOnly, maskRussianPhone } from "@dental/shared";
import type {
	ChannelStats,
	FunnelStep,
	MarketingAttributionResponse,
	MarketingAttributionSummary,
	MarketingCohort,
	OnlineBookingFunnelResponse,
	PatientAttributionItem,
	TelephonyAdminFunnel,
} from "./marketingSchemas.js";

/** Очистка номера телефона до цифр */
export function cleanPhoneDigits(phone?: string | null): string {
	return (phone || "").replace(/\D/g, "");
}

/** Безопасный расчет процентов с защитой от деления на 0, NaN, Infinity и отрицательных дропоффов */
export function safePercent(val: number): number {
	if (!Number.isFinite(val) || Number.isNaN(val)) return 0;
	return Math.max(0, Math.min(100, Number(val.toFixed(1))));
}

/** Нормализатор ключа канала привлечения */
export function normalizeChannelKey(key?: string | null): string {
	if (!key) return "telephony";
	const k = key.toLowerCase().trim();
	if (k === "gis2" || k === "2gis" || k === "gis_2" || k.includes("gis") || k.includes("гис")) return "gis_2";
	if (k === "website" || k === "widget" || k === "site" || k === "website_widget" || k.includes("виджет") || k.includes("сайт")) return "website_widget";
	if (k === "yandex" || k === "yandex_maps" || k === "maps" || k === "yandex_direct" || k === "direct" || k.includes("яндекс") || k.includes("карты")) return "yandex_maps";
	if (k === "prodoctorov" || k === "sber" || k === "docdoc" || k.includes("продокторов") || k.includes("доктор")) return "prodoctorov";
	if (k === "tg" || k === "telegram" || k === "tg_bot" || k.includes("телеграм")) return "tg_bot";
	if (k === "wa" || k === "whatsapp" || k === "wa_bot" || k === "waba" || k.includes("ватсап")) return "wa_bot";
	if (k === "phone" || k === "call" || k === "telephony" || k.includes("звонок")) return "telephony";
	return detectChannelFromSource(key);
}

/** Детектор канала привлечения по текстовому источнику лида / визита */
export function detectChannelFromSource(source?: string | null): string {
	if (!source) return "telephony";
	const s = source.toLowerCase().trim();
	if (s.includes("2gis") || s.includes("2гис") || s.includes("gis") || s.includes("дубльгис")) return "gis_2";
	if (s.includes("яндекс") || s.includes("yandex") || s.includes("карт") || s.includes("карты") || s.includes("гео")) return "yandex_maps";
	if (s.includes("prodoctorov") || s.includes("продокторов") || s.includes("sber") || s.includes("сбер") || s.includes("docdoc") || s.includes("доктор")) return "prodoctorov";
	if (s.includes("tg") || s.includes("telegr") || s.includes("телеграм")) return "tg_bot";
	if (s.includes("wa") || s.includes("whats") || s.includes("ватсап") || s.includes("waba")) return "wa_bot";
	if (s.includes("site") || s.includes("сайт") || s.includes("widget") || s.includes("виджет") || s.includes("онлайн") || s.includes("самозапис") || s.includes("web")) return "website_widget";
	if (s.includes("phone") || s.includes("call") || s.includes("звонок") || s.includes("тел") || s.includes("admin") || s.includes("регистратур") || s.includes("рецепшн") || s.includes("сарафан") || s.includes("рекомендац") || s.includes("знаком") || s.includes("родствен")) return "telephony";
	return "telephony";
}

/** Справочник каналов онлайн-самозаписи */
export const ONLINE_CHANNEL_DEFS = [
	{ key: "website_widget", nameRu: "Сайт клиники (Виджет самозаписи)", categoryRu: "Сайт и лендинги" },
	{ key: "yandex_maps", nameRu: "Яндекс Карты (Кнопка «Записаться»)", categoryRu: "Гео-сервисы" },
	{ key: "gis_2", nameRu: "2ГИС (Профиль клиники / Запись)", categoryRu: "Гео-сервисы" },
	{ key: "prodoctorov", nameRu: "ПроДокторов / СберЗдоровье", categoryRu: "Мед-агрегаторы" },
	{ key: "tg_bot", nameRu: "Telegram-бот / Mini App", categoryRu: "Мессенджеры" },
	{ key: "wa_bot", nameRu: "WhatsApp-чатбот / WABA", categoryRu: "Мессенджеры" },
] as const;

/** Маппинг русских названий каналов */
export const CHANNEL_NAMES_RU_MAP: Record<string, string> = {
	website_widget: "Сайт клиники",
	yandex_maps: "Яндекс Карты",
	gis_2: "2ГИС Карты",
	prodoctorov: "ПроДокторов",
	tg_bot: "Telegram-бот",
	wa_bot: "WhatsApp-чатбот",
	telephony: "Телефония / Звонок",
};

export interface RawLeadData {
	id: string;
	phone?: string | null;
	source?: string | null;
	status?: string | null;
	createdAt?: Date | string | null;
}

export interface RawAppointmentData {
	id: string;
	patientId?: string | null;
	status?: string | null;
	startsAt?: Date | string | null;
}

export interface RawPaymentData {
	id: string;
	patientId: string;
	amountRub?: string | number | null;
	status?: string | null;
}

export interface RawPatientData {
	id: string;
	fullName: string;
	phone?: string | null;
	notes?: string | null;
	administrativeProfile?: unknown;
	createdAt?: Date | string | null;
}

export interface RawCallEventData {
	id: string;
	channel?: string | null;
	direction?: string | null;
	durationSeconds?: number | null;
	status?: string | null;
}

export interface RawMarketingExpenseData {
	amountRub?: string | number | null;
	metadata?: unknown;
	reasonCode?: number | null;
}

/**
 * Расчет агрегированного отчета маркетинговой сквозной атрибуции.
 */
export function calculateMarketingAttributionReport(params: {
	organizationId: string;
	allLeads: RawLeadData[];
	allAppts: RawAppointmentData[];
	allPayments: RawPaymentData[];
	allPatients: RawPatientData[];
	allCallEvents: RawCallEventData[];
	allMarketingExpenses: RawMarketingExpenseData[];
}): MarketingAttributionResponse {
	const {
		organizationId,
		allLeads,
		allAppts,
		allPayments,
		allPatients,
		allCallEvents,
		allMarketingExpenses,
	} = params;

	// Phone to channel map
	const phoneToChannel = new Map<string, string>();
	for (const lead of allLeads) {
		const cp = cleanPhoneDigits(lead.phone);
		if (cp) {
			phoneToChannel.set(cp, detectChannelFromSource(lead.source));
		}
	}

	// Patient to channel map
	const patientToChannel = new Map<string, string>();
	for (const p of allPatients) {
		const cp = cleanPhoneDigits(p.phone);
		if (cp && phoneToChannel.has(cp)) {
			patientToChannel.set(p.id, phoneToChannel.get(cp)!);
			continue;
		}

		const adminProfile = p.administrativeProfile as {
			preferredAppointmentNote?: string | null;
			advertisingSource?: string | null;
			marketingSource?: string | null;
			leadSource?: string | null;
			utmSource?: string | null;
		} | null;

		const explicitSource =
			adminProfile?.utmSource ||
			adminProfile?.leadSource ||
			adminProfile?.advertisingSource ||
			adminProfile?.marketingSource ||
			(typeof adminProfile?.preferredAppointmentNote === "string" && adminProfile.preferredAppointmentNote.startsWith("src:")
				? adminProfile.preferredAppointmentNote.slice(4)
				: null) ||
			(p.notes && p.notes.includes("Источник:") ? p.notes : null);

		if (explicitSource) {
			patientToChannel.set(p.id, detectChannelFromSource(explicitSource));
		}
	}

	// Patient revenue map (in kopecks)
	const patientRevenueKop = new Map<string, number>();
	for (const pay of allPayments) {
		const cur = patientRevenueKop.get(pay.patientId) || 0;
		patientRevenueKop.set(pay.patientId, cur + Math.round(Number(pay.amountRub || 0) * 100));
	}

	// Channel spend map
	const channelSpendMap: Record<string, number> = {
		website_widget: 0,
		yandex_maps: 0,
		gis_2: 0,
		prodoctorov: 0,
		tg_bot: 0,
		wa_bot: 0,
		telephony: 0,
	};
	for (const row of allMarketingExpenses) {
		const meta = row.metadata as { channelKey?: string } | null;
		const spendKop = Math.round(Number(row.amountRub || 0) * 100);
		const chKey = meta?.channelKey;
		const targetKey = normalizeChannelKey(chKey);
		channelSpendMap[targetKey] = (channelSpendMap[targetKey] ?? 0) + spendKop;
	}

	// Online channels analysis
	const selfBookingChannels: ChannelStats[] = ONLINE_CHANNEL_DEFS.map((def) => {
		const channelLeads = allLeads.filter((l) => detectChannelFromSource(l.source) === def.key);

		const channelPatientIds = new Set<string>();
		for (const [pid, chKey] of patientToChannel.entries()) {
			if (chKey === def.key) channelPatientIds.add(pid);
		}

		const channelAppts = allAppts.filter(
			(a) => a.patientId != null && channelPatientIds.has(a.patientId),
		);

		const attendedCount = channelAppts.filter(
			(a) => a.status === "completed" || a.status === "arrived" || a.status === "in_treatment",
		).length;
		const noShowCount = channelAppts.filter((a) => a.status === "no_show").length;
		const bookingsCount = Math.max(
			channelAppts.length,
			channelLeads.filter((l) => l.status === "consult_booked").length,
		);

		let revenueKopecks = 0;
		let paidPatientsCount = 0;
		for (const pid of channelPatientIds) {
			const rev = patientRevenueKop.get(pid) || 0;
			if (rev > 0) {
				paidPatientsCount += 1;
				revenueKopecks += rev;
			}
		}

		const viewsCount = Math.max(channelLeads.length, bookingsCount);
		const slotSelectedCount = bookingsCount;
		const spentKopecks = channelSpendMap[def.key] || 0;
		const rawRomi = spentKopecks > 0 ? ((revenueKopecks - spentKopecks) / spentKopecks) * 100 : 0;
		const romiPercent = Number.isFinite(rawRomi) && !Number.isNaN(rawRomi) ? Math.round(rawRomi) : 0;
		const rawCac = paidPatientsCount > 0 ? spentKopecks / paidPatientsCount : 0;
		const cacKopecks = Number.isFinite(rawCac) && !Number.isNaN(rawCac) ? Math.round(rawCac) : 0;

		return {
			key: def.key,
			nameRu: def.nameRu,
			categoryRu: def.categoryRu,
			isOnlineSelfBooking: true,
			viewsCount,
			slotSelectedCount,
			bookingsCount,
			attendedCount,
			noShowCount,
			paidPatientsCount,
			revenueKopecks,
			spentKopecks,
			romiPercent,
			cacKopecks,
		};
	});

	// Telephony admin funnel
	const telephonyLeads = allLeads.filter((l) => detectChannelFromSource(l.source) === "telephony");
	const nonOnlinePatientIds = new Set<string>();
	for (const p of allPatients) {
		const ch = patientToChannel.get(p.id);
		if (!ch || ch === "telephony") {
			nonOnlinePatientIds.add(p.id);
		}
	}

	const telephonyAppts = allAppts.filter((a) => a.patientId != null && nonOnlinePatientIds.has(a.patientId));
	const telephonyAttended = telephonyAppts.filter(
		(a) => a.status === "completed" || a.status === "arrived" || a.status === "in_treatment",
	).length;
	const telephonyNoShow = telephonyAppts.filter((a) => a.status === "no_show").length;
	const bookedAppointmentsCount = Math.max(telephonyAppts.length, telephonyLeads.length);

	let telephonyRevenueKopecks = 0;
	let telephonyPaidPatients = 0;
	for (const pid of nonOnlinePatientIds) {
		const rev = patientRevenueKop.get(pid) || 0;
		if (rev > 0) {
			telephonyPaidPatients += 1;
			telephonyRevenueKopecks += rev;
		}
	}

	const realCalls = allCallEvents.filter((c) => c.channel === "phone");
	const realIncomingCalls = realCalls.filter((c) => c.direction === "inbound" || !c.direction);
	const realAnsweredCalls = realIncomingCalls.filter(
		(c) => (c.durationSeconds != null && c.durationSeconds > 0) || c.status === "delivered",
	);
	const realTotalDuration = realAnsweredCalls.reduce(
		(acc, c) => acc + (c.durationSeconds || 0),
		0,
	);

	const incomingCallsCount = realIncomingCalls.length;
	const answeredCallsCount = realAnsweredCalls.length;
	const avgCallDurationSeconds = realAnsweredCalls.length > 0
		? Math.round(realTotalDuration / realAnsweredCalls.length)
		: 0;
	const telephonySpentKopecks = channelSpendMap.telephony || 0;

	const telephonyAdminFunnel: TelephonyAdminFunnel = {
		incomingCallsCount,
		answeredCallsCount,
		bookedAppointmentsCount,
		attendedCount: telephonyAttended,
		noShowCount: telephonyNoShow,
		paidPatientsCount: telephonyPaidPatients,
		revenueKopecks: telephonyRevenueKopecks,
		spentKopecks: telephonySpentKopecks,
		avgCallDurationSeconds,
		attendanceRatePercent: bookedAppointmentsCount > 0 ? Number(((telephonyAttended / bookedAppointmentsCount) * 100).toFixed(1)) : 0,
		conversionCallToBookingPercent: incomingCallsCount > 0 ? Number(((bookedAppointmentsCount / incomingCallsCount) * 100).toFixed(1)) : 0,
	};

	const totalOnlineBookings = selfBookingChannels.reduce((acc, c) => acc + c.bookingsCount, 0);
	const totalOnlineAttended = selfBookingChannels.reduce((acc, c) => acc + c.attendedCount, 0);
	const totalOnlineRevenue = selfBookingChannels.reduce((acc, c) => acc + c.revenueKopecks, 0);
	const totalOnlineSpent = selfBookingChannels.reduce((acc, c) => acc + c.spentKopecks, 0);

	const grandTotalBookings = totalOnlineBookings + telephonyAdminFunnel.bookedAppointmentsCount;
	const onlineSharePercent = grandTotalBookings > 0
		? Math.round((totalOnlineBookings / grandTotalBookings) * 100)
		: 0;

	// Build real patient attributions list respecting 152-ФЗ and ст. 13 323-ФЗ
	const attributions: PatientAttributionItem[] = [];
	for (const p of allPatients) {
		const chKey = patientToChannel.get(p.id) || "telephony";
		const chName = CHANNEL_NAMES_RU_MAP[chKey] || "Телефония / Звонок";
		const categoryRu = chKey === "telephony" ? "Коллтрекинг" : "Самозапись";
		const rev = patientRevenueKop.get(p.id) || 0;
		const pAppts = allAppts.filter((a) => a.patientId === p.id);
		const hasAttended = pAppts.some(
			(a) => a.status === "completed" || a.status === "arrived" || a.status === "in_treatment",
		);
		const currentStage: PatientAttributionItem["currentStage"] =
			rev > 0 ? "paid_plan" : hasAttended ? "attended" : pAppts.length > 0 ? "booked" : "call";

		attributions.push({
			id: `attr-${p.id}`,
			patientId: p.id,
			patientFullName: formatInitialsOnly(p.fullName) || `Пациент #${p.id.slice(0, 6)}`,
			phone: maskRussianPhone(p.phone),
			createdAtIso: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
			channelKey: chKey,
			channelNameRu: chName,
			categoryRu,
			utm: {
				utm_source: chKey,
				utm_campaign: "clinic_marketing",
				utm_medium: "",
				utm_content: "",
				utm_term: "",
			},
			externalIds: {},
			currentStage,
			totalPaidKopecks: rev,
			treatmentPlanTitle: rev > 0 ? "Комплексный план лечения" : "Амбулаторный прием",
			notes: "Сквозная атрибуция (ПДн защищены по 152-ФЗ / 323-ФЗ)",
		});

		if (attributions.length >= 50) break;
	}

	const summary: MarketingAttributionSummary = {
		totalOnlineBookings,
		totalOnlineAttended,
		totalOnlineRevenueKopecks: totalOnlineRevenue,
		totalOnlineSpentKopecks: totalOnlineSpent,
		onlineSharePercent,
		adminSharePercent: 100 - onlineSharePercent,
		savedAdminHours: Math.round((totalOnlineBookings * 4) / 6) / 10,
	};

	return {
		organizationId,
		selfBookingChannels,
		telephonyAdminFunnel,
		attributions,
		summary,
	};
}

/**
 * Расчет пошаговой воронки онлайн-самозаписи.
 */
export function calculateOnlineBookingFunnel(params: {
	allLeads: RawLeadData[];
	allAppts: RawAppointmentData[];
	allPayments: RawPaymentData[];
}): OnlineBookingFunnelResponse {
	const { allLeads, allAppts, allPayments } = params;

	const onlineLeads = allLeads.filter((l) => detectChannelFromSource(l.source) !== "telephony");
	const views = onlineLeads.length;
	const slotSelected = onlineLeads.length;
	const booked = onlineLeads.filter((l) => l.status === "consult_booked").length;
	const attended = allAppts.filter((a) => a.status === "completed" || a.status === "arrived" || a.status === "in_treatment").length;
	const paid = allPayments.length;
	const totalRevenueKopecks = allPayments.reduce((acc, p) => acc + Math.round(Number(p.amountRub || 0) * 100), 0);

	const stepSlotDropoff = views > 0 ? safePercent((1 - slotSelected / views) * 100) : 0;
	const stepBookedDropoff = slotSelected > 0 ? safePercent((1 - booked / slotSelected) * 100) : 0;
	const stepAttendedDropoff = booked > 0 ? safePercent((1 - attended / booked) * 100) : 0;
	const stepPaidDropoff = attended > 0 ? safePercent((1 - paid / attended) * 100) : 0;

	const steps: FunnelStep[] = [
		{ stage: "views", title: "Просмотры виджета", count: views, dropoffPercent: 0 },
		{ stage: "slot_selected", title: "Выбор слота времени", count: slotSelected, dropoffPercent: stepSlotDropoff },
		{ stage: "booked", title: "Созданные записи", count: booked, dropoffPercent: stepBookedDropoff },
		{ stage: "attended", title: "Явка на приём", count: attended, dropoffPercent: stepAttendedDropoff },
		{ stage: "paid", title: "Оплата услуг", count: paid, dropoffPercent: stepPaidDropoff },
	];

	const rawOverall = views > 0 ? (paid / views) * 100 : 0;
	const rawAttendance = booked > 0 ? (attended / booked) * 100 : 0;

	return {
		steps,
		overallConversionPercent: safePercent(rawOverall),
		attendanceRatePercent: safePercent(rawAttendance),
		totalRevenueKopecks,
	};
}

/**
 * Генерация сводных данных по рекламным каналам для отчетов (JSON / CSV).
 */
export function generateMarketingReportsSummary(params: {
	allLeads: RawLeadData[];
	allPayments: RawPaymentData[];
}) {
	const { allLeads, allPayments } = params;

	const totalRevenueKopecks = allPayments.reduce(
		(acc, p) => acc + Math.round(Number(p.amountRub || 0) * 100),
		0,
	);

	const channelCounts: Record<string, { leads: number; revenueKopecks: number }> = {};
	for (const lead of allLeads) {
		const ch = detectChannelFromSource(lead.source);
		if (!channelCounts[ch]) {
			channelCounts[ch] = { leads: 0, revenueKopecks: 0 };
		}
		channelCounts[ch].leads += 1;
	}

	return {
		totalRevenueKopecks,
		channelCounts,
	};
}
