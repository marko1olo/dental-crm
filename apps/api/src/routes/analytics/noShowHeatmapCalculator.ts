import { and, eq, gte, sql, type Column } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointments } from "../../db/schema.js";
import { inClinicZone } from "../../services/reports/managerReports.js";

export interface HeatmapCell {
	dayOfWeek: number;
	dayName: string;
	hour: number;
	cancelledCount: number;
	noShowCount: number;
	totalLost: number;
}

export interface NoShowHeatmap {
	totalCancelled: number;
	totalNoShow: number;
	peakDay: string | null;
	peakHour: number | null;
	cells: HeatmapCell[];
}

function withDateFilter(orgId: string, orgCol: Column, dateCol?: Column, startDate?: Date) {
	return startDate && dateCol
		? and(eq(orgCol, orgId), gte(dateCol, startDate))
		: eq(orgCol, orgId);
}

/**
 * 6. No-Show & Cancellation Heatmap
 */
export async function calculateNoShowHeatmap(
	orgId: string,
	startDate?: Date,
	cohortZone?: string | null,
): Promise<NoShowHeatmap> {
	const noShowTimeBucket = inClinicZone(
		appointments.startsAt,
		cohortZone ?? null,
	);
	const dowExpr = sql`extract(isodow from ${noShowTimeBucket})::int`;
	const hourExpr = sql`extract(hour from ${noShowTimeBucket})::int`;

	const noShowRaw = await db
		.select({
			dayOfWeek: dowExpr,
			hour: hourExpr,
			status: appointments.status,
			count: sql<number>`count(*)::int`,
		})
		.from(appointments)
		.where(
			and(
				withDateFilter(orgId, appointments.organizationId, appointments.startsAt, startDate),
				sql`${appointments.status} in ('cancelled', 'no_show')`,
			),
		)
		.groupBy(dowExpr, hourExpr, appointments.status);

	const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
	const DAY_FULL_NAMES = [
		"Понедельник",
		"Вторник",
		"Среда",
		"Четверг",
		"Пятница",
		"Суббота",
		"Воскресенье",
	];

	const matrix = new Map<string, { cancelled: number; noShow: number }>();
	let totalCancelled = 0;
	let totalNoShow = 0;

	for (const row of noShowRaw) {
		const rawDow = Number(row.dayOfWeek);
		const dow = Number.isFinite(rawDow) ? rawDow : 1;
		const rawHr = Number(row.hour);
		const hr = Number.isFinite(rawHr) ? rawHr : 0;
		const rawCnt = Number(row.count);
		const cnt = Number.isFinite(rawCnt) && rawCnt > 0 ? Math.floor(rawCnt) : 0;
		const key = `${dow}_${hr}`;
		let cell = matrix.get(key);
		if (!cell) {
			cell = { cancelled: 0, noShow: 0 };
			matrix.set(key, cell);
		}
		if (row.status === "cancelled") {
			cell.cancelled += cnt;
			totalCancelled += cnt;
		} else if (row.status === "no_show") {
			cell.noShow += cnt;
			totalNoShow += cnt;
		}
	}

	const heatmapCells: HeatmapCell[] = [];
	let peakLost = 0;
	let peakDayIdx: number | null = null;
	let peakHour: number | null = null;

	for (let dow = 1; dow <= 7; dow++) {
		for (let hr = 8; hr <= 21; hr++) {
			const key = `${dow}_${hr}`;
			const entry = matrix.get(key) || { cancelled: 0, noShow: 0 };
			const totalLost = entry.cancelled + entry.noShow;
			if (totalLost > peakLost) {
				peakLost = totalLost;
				peakDayIdx = dow - 1;
				peakHour = hr;
			}
			heatmapCells.push({
				dayOfWeek: dow,
				dayName: DAY_NAMES[dow - 1] ?? `День ${dow}`,
				hour: hr,
				cancelledCount: entry.cancelled,
				noShowCount: entry.noShow,
				totalLost,
			});
		}
	}

	return {
		totalCancelled,
		totalNoShow,
		peakDay:
			peakDayIdx !== null ? (DAY_FULL_NAMES[peakDayIdx] ?? null) : null,
		peakHour,
		cells: heatmapCells,
	};
}
