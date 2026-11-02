/**
 * marketingAttributionCalculator.ts — Расчет сквозной атрибуции пациентов, ROMI и CAC по каналам.
 */

import { formatInitialsOnly, maskRussianPhone } from "@dental/shared";
import type {
	ChannelStats,
	MarketingAttributionResponse,
	MarketingAttributionSummary,
	PatientAttributionItem,
	TelephonyAdminFunnel,
} from "./marketingSchemas.js";
import {
	CHANNEL_NAMES_RU_MAP,
	cleanPhoneDigits,
	detectChannelFromSource,
	normalizeChannelKey,
	ONLINE_CHANNEL_DEFS,
} from "./marketingAnalyticsUtils.js";

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
			(typeof adminProfile?.preferredAppointmentNote === "string" &&
			adminProfile.preferredAppointmentNote.startsWith("src:")
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
		referral: 0,
		partner: 0,
		maps: 0,
		website: 0,
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

	const telephonyAppts = allAppts.filter(
		(a) => a.patientId != null && nonOnlinePatientIds.has(a.patientId),
	);
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
	const avgCallDurationSeconds =
		realAnsweredCalls.length > 0 ? Math.round(realTotalDuration / realAnsweredCalls.length) : 0;
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
		attendanceRatePercent:
			bookedAppointmentsCount > 0
				? Number(((telephonyAttended / bookedAppointmentsCount) * 100).toFixed(1))
				: 0,
		conversionCallToBookingPercent:
			incomingCallsCount > 0
				? Number(((bookedAppointmentsCount / incomingCallsCount) * 100).toFixed(1))
				: 0,
	};

	const totalOnlineBookings = selfBookingChannels.reduce((acc, c) => acc + c.bookingsCount, 0);
	const totalOnlineAttended = selfBookingChannels.reduce((acc, c) => acc + c.attendedCount, 0);
	const totalOnlineRevenue = selfBookingChannels.reduce((acc, c) => acc + c.revenueKopecks, 0);
	const totalOnlineSpent = selfBookingChannels.reduce((acc, c) => acc + c.spentKopecks, 0);

	const grandTotalBookings = totalOnlineBookings + telephonyAdminFunnel.bookedAppointmentsCount;
	const onlineSharePercent =
		grandTotalBookings > 0 ? Math.round((totalOnlineBookings / grandTotalBookings) * 100) : 0;

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
