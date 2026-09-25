/**
 * DENTE Dental CRM — Analytics Doctor Payload Parser.
 *
 * Robust, exception-free parsing of `/api/analytics/dashboard` response payloads.
 */

import {
	EMPTY_BODY_MESSAGE,
	MALFORMED_BODY_MESSAGE,
	MISSING_DATA_MESSAGE,
	type AnalyticsDashboardData,
	type ChairUtilizationPoint,
	type CohortLtvPoint,
	type DashboardParseResult,
	type DoctorProfitabilityRow,
	type NamedValuePoint,
	type NoShowHeatmapCell,
	type NoShowHeatmapData,
	type TierAcceptanceData,
	type TierAcceptanceItem,
} from "./analyticsDoctorMetricTypes.js";

function statusMessage(status: number): string {
	if (status === 401 || status === 403) {
		return "Нет доступа к аналитике клиники. Войдите заново или обратитесь к администратору.";
	}
	return `Сервер ответил ${status}. Данные не потеряны — повторите запрос.`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function numberOr(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Число или null. Строки и мусор к нулю не приводятся: ноль — это утверждение. */
function nullableNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNamedValuePoints(value: unknown): NamedValuePoint[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const row = asRecord(item);
		if (!row) return [];
		return [
			{
				name: typeof row.name === "string" ? row.name : "",
				value: numberOr(row.value, 0),
				fill: typeof row.fill === "string" ? row.fill : "",
			},
		];
	});
}

function toChairPoints(value: unknown): ChairUtilizationPoint[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const row = asRecord(item);
		if (!row) return [];
		return [
			{
				chairId: typeof row.chairId === "string" ? row.chairId : null,
				name: typeof row.name === "string" ? row.name : "",
				value: numberOr(row.value, 0),
				occupiedMinutes: numberOr(row.occupiedMinutes, 0),
				availableMinutes: numberOr(row.availableMinutes, 0),
				utilizationPercent: numberOr(row.utilizationPercent, 0),
				fill: typeof row.fill === "string" ? row.fill : "",
			},
		];
	});
}

function toDoctorRows(value: unknown): DoctorProfitabilityRow[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const row = asRecord(item);
		if (!row) return [];
		return [
			{
				doctorId: typeof row.doctorId === "string" ? row.doctorId : null,
				name: typeof row.name === "string" ? row.name : "",
				revenue: numberOr(row.revenue, 0),
				appointmentsCount: numberOr(row.appointmentsCount, 0),
				avgTicketRub: numberOr(row.avgTicketRub, 0),
				workedHours: numberOr(row.workedHours, 0),
				hourlyRevenueRub: numberOr(row.hourlyRevenueRub, 0),
				margin: nullableNumber(row.margin),
				completionRate: nullableNumber(row.completionRate),
				services804nCount: numberOr(row.services804nCount, 0),
				labOrdersCount: numberOr(row.labOrdersCount, 0),
				labOrdersCostRub: numberOr(row.labOrdersCostRub, 0),
				doctorPayrollRub: numberOr(row.doctorPayrollRub, 0),
				clinicMarginRub: nullableNumber(row.clinicMarginRub),
			},
		];
	});
}

function toCohortPoints(value: unknown): CohortLtvPoint[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const row = asRecord(item);
		if (!row) return [];
		return [
			{
				cohort: typeof row.cohort === "string" ? row.cohort : "",
				"Month 12": numberOr(row["Month 12"], 0),
			},
		];
	});
}

function toTierAcceptance(value: unknown): TierAcceptanceData | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	const rawTiers = Array.isArray(record.tiers) ? record.tiers : [];
	const tiers: TierAcceptanceItem[] = rawTiers.flatMap((item) => {
		const row = asRecord(item);
		if (!row) return [];
		return [
			{
				tier: typeof row.tier === "string" ? row.tier : "optimum",
				label: typeof row.label === "string" ? row.label : "",
				totalPlans: numberOr(row.totalPlans, 0),
				acceptedPlans: numberOr(row.acceptedPlans, 0),
				acceptanceRatePercent: numberOr(row.acceptanceRatePercent, 0),
				totalRub: numberOr(row.totalRub, 0),
			},
		];
	});
	return {
		totalConsultations: numberOr(record.totalConsultations, 0),
		consultationToPlanConversionPercent: numberOr(
			record.consultationToPlanConversionPercent,
			0,
		),
		totalPlansCount: numberOr(record.totalPlansCount, 0),
		acceptedPlansCount: numberOr(record.acceptedPlansCount, 0),
		overallAcceptancePercent: numberOr(record.overallAcceptancePercent, 0),
		tiers,
	};
}

function toNoShowHeatmap(value: unknown): NoShowHeatmapData | undefined {
	const record = asRecord(value);
	if (!record) return undefined;
	const rawCells = Array.isArray(record.cells) ? record.cells : [];
	const cells: NoShowHeatmapCell[] = rawCells.flatMap((item) => {
		const row = asRecord(item);
		if (!row) return [];
		return [
			{
				dayOfWeek: numberOr(row.dayOfWeek, 1),
				dayName: typeof row.dayName === "string" ? row.dayName : "",
				hour: numberOr(row.hour, 8),
				cancelledCount: numberOr(row.cancelledCount, 0),
				noShowCount: numberOr(row.noShowCount, 0),
				totalLost: numberOr(row.totalLost, 0),
			},
		];
	});
	return {
		totalCancelled: numberOr(record.totalCancelled, 0),
		totalNoShow: numberOr(record.totalNoShow, 0),
		peakDay: typeof record.peakDay === "string" ? record.peakDay : null,
		peakHour: typeof record.peakHour === "number" ? record.peakHour : null,
		cells,
	};
}

/**
 * Разбор ответа дашборда из УЖЕ прочитанного тела.
 *
 * Тело приходит строкой, потому что вызывающий обязан прочитать его один раз
 * через `response.text()`: `response.json()` на пустом теле бросает исключение
 * с английским текстом, и починить это перехватом уже поздно.
 *
 * Функция чистая: ни fetch, ни DOM, ни таймеров.
 */
export function parseDashboardPayload(
	status: number,
	rawBody: string,
): DashboardParseResult {
	const trimmed = rawBody.trim();

	if (trimmed.length === 0) {
		// Пустое тело при любом статусе. Статус важнее: 503 с пустым телом — сбой сервера.
		return {
			ok: false,
			message: status >= 400 ? statusMessage(status) : EMPTY_BODY_MESSAGE,
		};
	}

	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch {
		return {
			ok: false,
			message: status >= 400 ? statusMessage(status) : MALFORMED_BODY_MESSAGE,
		};
	}

	const envelope = asRecord(payload);

	// У сервера уже есть готовое русское сообщение (analytics.ts:280-284).
	const serverMessage =
		envelope &&
		typeof envelope.message === "string" &&
		envelope.message.trim().length > 0
			? envelope.message.trim()
			: null;

	if (status >= 400) {
		return { ok: false, message: serverMessage ?? statusMessage(status) };
	}
	if (!envelope) {
		return { ok: false, message: MALFORMED_BODY_MESSAGE };
	}
	if (envelope.success === false) {
		return { ok: false, message: serverMessage ?? MISSING_DATA_MESSAGE };
	}

	const body = asRecord(envelope.data);
	if (!body) {
		return { ok: false, message: MISSING_DATA_MESSAGE };
	}

	const kpisRow = asRecord(body.kpis);
	const cohortLtvJson = toCohortPoints(body.cohortLtvJson);
	const planFunnelJson = toNamedValuePoints(body.planFunnelJson);
	const chairUtilizationJson = toChairPoints(body.chairUtilizationJson);
	const doctorProfitabilityJson = toDoctorRows(body.doctorProfitabilityJson);
	const tierAcceptance = toTierAcceptance(body.tierAcceptance);
	const noShowHeatmap = toNoShowHeatmap(body.noShowHeatmap);

	return {
		ok: true,
		data: {
			kpis: {
				totalPatients: numberOr(kpisRow?.totalPatients, 0),
				totalRevenue: numberOr(kpisRow?.totalRevenue, 0),
				totalAppointments: numberOr(kpisRow?.totalAppointments, 0),
				avgRevenuePerPatient: numberOr(kpisRow?.avgRevenuePerPatient, 0),
				cashRevenue: numberOr(kpisRow?.cashRevenue, 0),
				cardRevenue: numberOr(kpisRow?.cardRevenue, 0),
				cashlessRevenue: numberOr(kpisRow?.cashlessRevenue, 0),
				advanceRevenue: numberOr(kpisRow?.advanceRevenue, 0),
				sbpRevenue: numberOr(kpisRow?.sbpRevenue, 0),
				bankTransferRevenue: numberOr(kpisRow?.bankTransferRevenue, 0),
				insuranceRevenue: numberOr(kpisRow?.insuranceRevenue, 0),
				bonusRevenue: numberOr(kpisRow?.bonusRevenue, 0),
				averageCheck: numberOr(kpisRow?.averageCheck, 0),
				primaryPatientsCount: numberOr(kpisRow?.primaryPatientsCount, 0),
				repeatPatientsCount: numberOr(kpisRow?.repeatPatientsCount, 0),
				chairOccupancyRatePercent: numberOr(kpisRow?.chairOccupancyRatePercent, 0),
			},
			cohortLtvJson,
			planFunnelJson,
			chairUtilizationJson,
			doctorProfitabilityJson,
			tierAcceptance,
			noShowHeatmap,
			isEmpty:
				typeof body.isEmpty === "boolean"
					? body.isEmpty
					: cohortLtvJson.length === 0 &&
						planFunnelJson.length === 0 &&
						chairUtilizationJson.length === 0 &&
						doctorProfitabilityJson.length === 0,
		},
	};
}
