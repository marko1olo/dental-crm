/**
 * marketingFunnelCalculator.ts — Расчет пошаговой воронки онлайн-самозаписи и сводных отчетов.
 */

import type {
	FunnelStep,
	OnlineBookingFunnelResponse,
} from "./marketingSchemas.js";
import type {
	RawAppointmentData,
	RawLeadData,
	RawPatientData,
	RawPaymentData,
} from "./marketingAttributionCalculator.js";
import {
	cleanPhoneDigits,
	detectChannelFromSource,
	safePercent,
} from "./marketingAnalyticsUtils.js";

/**
 * Расчет пошаговой воронки онлайн-самозаписи.
 * Исключает подмешивание пациентов всей клиники: метрики явки (attended) и оплаты (paid)
 * рассчитываются строго по когорте пациентов из онлайн-лидов (onlineLeads cohort).
 */
export function calculateOnlineBookingFunnel(params: {
	allLeads: RawLeadData[];
	allAppts: RawAppointmentData[];
	allPayments: RawPaymentData[];
	allPatients?: RawPatientData[];
}): OnlineBookingFunnelResponse {
	const { allLeads, allAppts, allPayments, allPatients = [] } = params;

	const onlineLeads = allLeads.filter((l) => detectChannelFromSource(l.source) !== "telephony");
	const views = onlineLeads.length;
	const slotSelected = onlineLeads.length;
	const booked = onlineLeads.filter((l) => l.status === "consult_booked").length;

	// Извлекаем идентификаторы пациентов когорты онлайн-записи
	const onlinePatientIds = new Set<string>();

	// Создаем быстрый индекс телефонов пациентов для сопоставления лидов без явного patientId
	const patientIdByPhone = new Map<string, string>();
	for (const pt of allPatients) {
		const digits = cleanPhoneDigits(pt.phone);
		if (digits.length >= 7) {
			patientIdByPhone.set(digits, pt.id);
		}
	}

	for (const lead of onlineLeads) {
		if (lead.patientId) {
			onlinePatientIds.add(lead.patientId);
		} else if (lead.phone) {
			const digits = cleanPhoneDigits(lead.phone);
			if (digits.length >= 7) {
				const matchedId = patientIdByPhone.get(digits);
				if (matchedId) {
					onlinePatientIds.add(matchedId);
				}
			}
		}
	}

	// Отбираем приёмы СТРОГО когорты онлайн-пациентов
	const onlineAppts = allAppts.filter(
		(a) =>
			a.patientId &&
			onlinePatientIds.has(a.patientId) &&
			(a.status === "completed" || a.status === "arrived" || a.status === "in_treatment"),
	);
	const uniqueAttendedPatients = new Set(onlineAppts.map((a) => a.patientId)).size;
	const rawAttended = Math.max(0, uniqueAttendedPatients);
	const attended = Math.min(booked, rawAttended);

	// Отбираем оплаты СТРОГО когорты онлайн-пациентов
	const onlinePayments = allPayments.filter(
		(p) => p.patientId && onlinePatientIds.has(p.patientId) && (p.status === "paid" || !p.status),
	);
	const uniquePaidPatients = new Set(onlinePayments.map((p) => p.patientId)).size;
	const rawPaid = Math.max(0, uniquePaidPatients);
	const paid = Math.min(attended, rawPaid);

	const totalRevenueKopecks = onlinePayments.reduce(
		(acc, p) => acc + Math.round(Number(p.amountRub || 0) * 100),
		0,
	);

	const stepSlotDropoff = views > 0 ? safePercent((1 - slotSelected / views) * 100) : 0;
	const stepBookedDropoff = slotSelected > 0 ? safePercent((1 - booked / slotSelected) * 100) : 0;
	const stepAttendedDropoff = booked > 0 ? safePercent((1 - attended / booked) * 100) : 0;
	const stepPaidDropoff = attended > 0 ? safePercent((1 - paid / attended) * 100) : 0;

	const steps: FunnelStep[] = [
		{ stage: "views", title: "Просмотры виджета", count: views, dropoffPercent: 0 },
		{
			stage: "slot_selected",
			title: "Выбор слота времени",
			count: slotSelected,
			dropoffPercent: stepSlotDropoff,
		},
		{ stage: "booked", title: "Созданные записи", count: booked, dropoffPercent: stepBookedDropoff },
		{
			stage: "attended",
			title: "Явка на приём",
			count: attended,
			dropoffPercent: stepAttendedDropoff,
		},
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
