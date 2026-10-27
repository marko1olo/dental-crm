/**
 * chairDoctorOccupancyTally.ts — Fast daily chair and doctor occupancy statistics and revenue tally.
 */

import type { Appointment } from "@dental/shared";
import type {
	ChairDailyOccupancyStats,
	DailyScheduleTallySummary,
	DoctorDailyOccupancyStats,
} from "./freeSlotsTypes";

export function calculateDailyChairDoctorTally(params: {
	dateKey: string;
	appointments: readonly Appointment[];
	chairs: readonly { id: string; name: string; active?: boolean | undefined }[];
	doctors?: readonly { id: string; fullName?: string | undefined; name?: string | undefined }[] | undefined;
	invoices?: readonly { appointmentId?: string | null | undefined; amountRub?: number | undefined; totalRub?: number | undefined; status?: string | undefined }[] | undefined;
	clinicStartHour?: number | undefined;
	clinicEndHour?: number | undefined;
}): DailyScheduleTallySummary {
	const {
		dateKey,
		appointments,
		chairs,
		doctors = [],
		invoices = [],
		clinicStartHour = 9,
		clinicEndHour = 20,
	} = params;

	const activeChairs = chairs.filter((c) => c.active !== false);
	const totalOperatingHours = Math.max(1, clinicEndHour - clinicStartHour);
	const maxChairCapacityMinutes = totalOperatingHours * 60;
	const totalClinicCapacityMinutes = Math.max(1, activeChairs.length * maxChairCapacityMinutes);

	const dayAppts = appointments.filter((a) => {
		const rawDate = a.startsAt || "";
		const apptDate = typeof rawDate === "string" ? rawDate.slice(0, 10) : "";
		return apptDate === dateKey && a.status !== "cancelled" && a.status !== "no_show";
	});

	const invoiceRevenueByAppt = new Map<string, number>();
	for (const inv of invoices) {
		if (inv.appointmentId && inv.status !== "voided" && inv.status !== "cancelled") {
			const current = invoiceRevenueByAppt.get(inv.appointmentId) || 0;
			invoiceRevenueByAppt.set(inv.appointmentId, current + (inv.totalRub ?? inv.amountRub ?? 0));
		}
	}

	let totalAppointmentsCount = 0;
	let totalDurationMinutes = 0;
	let totalRevenueRub = 0;

	const doctorsMap = new Map<string, (typeof doctors)[number]>();
	for (const doc of doctors) {
		if (doc.id) doctorsMap.set(doc.id, doc);
	}

	const apptsByChair = new Map<string, typeof dayAppts>();
	for (const a of dayAppts) {
		const cId = a.chairId || "";
		let list = apptsByChair.get(cId);
		if (!list) {
			list = [];
			apptsByChair.set(cId, list);
		}
		list.push(a);
	}

	const chairStats: ChairDailyOccupancyStats[] = activeChairs.map((chair) => {
		const chairAppts = apptsByChair.get(chair.id) || [];
		let chairDurationMin = 0;
		let chairRevenue = 0;
		let completedCount = 0;
		const docIdSet = new Set<string>();

		for (const a of chairAppts) {
			const sMs = new Date(a.startsAt).getTime();
			const eMs = a.endsAt && !Number.isNaN(new Date(a.endsAt).getTime()) ? new Date(a.endsAt).getTime() : sMs + 30 * 60000;
			const durMin = Math.max(0, Math.round((eMs - sMs) / 60000));
			chairDurationMin += durMin;
			if (a.doctorUserId) docIdSet.add(a.doctorUserId);
			if (a.status === "completed") completedCount++;
			const invSum = invoiceRevenueByAppt.get(a.id);
			if (invSum !== undefined) chairRevenue += invSum;
		}

		totalAppointmentsCount += chairAppts.length;
		totalDurationMinutes += chairDurationMin;
		totalRevenueRub += chairRevenue;

		return {
			chairId: chair.id,
			chairName: chair.name,
			appointmentsCount: chairAppts.length,
			completedCount,
			totalDurationMinutes: chairDurationMin,
			occupancyPercent: Math.min(100, Math.round((chairDurationMin / maxChairCapacityMinutes) * 100)),
			totalRevenueRub: chairRevenue,
			activeDoctorIds: Array.from(docIdSet),
			activeDoctorNames: Array.from(docIdSet).map((dId) => doctorsMap.get(dId)?.fullName || doctorsMap.get(dId)?.name || dId),
		};
	});

	const doctorStatsMap = new Map<string, { count: number; durMin: number; revenue: number; chairs: Set<string> }>();
	for (const a of dayAppts) {
		const dId = a.doctorUserId || "unassigned";
		const current = doctorStatsMap.get(dId) || { count: 0, durMin: 0, revenue: 0, chairs: new Set() };
		const sMs = new Date(a.startsAt).getTime();
		const eMs = a.endsAt && !Number.isNaN(new Date(a.endsAt).getTime()) ? new Date(a.endsAt).getTime() : sMs + 30 * 60000;
		const durMin = Math.max(0, Math.round((eMs - sMs) / 60000));
		current.count++;
		current.durMin += durMin;
		if (a.chairId) current.chairs.add(a.chairId);
		const invSum = invoiceRevenueByAppt.get(a.id);
		current.revenue += invSum !== undefined ? invSum : 0;
		doctorStatsMap.set(dId, current);
	}

	const doctorStats: DoctorDailyOccupancyStats[] = Array.from(doctorStatsMap.entries()).map(([dId, data]) => ({
		doctorId: dId,
		doctorName: doctorsMap.get(dId)?.fullName || doctorsMap.get(dId)?.name || (dId === "unassigned" ? "Не назначен" : dId),
		appointmentsCount: data.count,
		totalDurationMinutes: data.durMin,
		occupancyPercent: Math.min(100, Math.round((data.durMin / maxChairCapacityMinutes) * 100)),
		totalRevenueRub: data.revenue,
		chairsUsed: Array.from(data.chairs),
	}));

	return {
		date: dateKey,
		totalAppointmentsCount,
		totalDurationMinutes,
		totalClinicCapacityMinutes,
		clinicOccupancyPercent: Math.min(100, Math.round((totalDurationMinutes / totalClinicCapacityMinutes) * 100)),
		clinicWorkdayLabel: `${String(clinicStartHour).padStart(2, "0")}:00–${String(clinicEndHour).padStart(2, "0")}:00`,
		totalRevenueRub,
		chairs: chairStats,
		doctors: doctorStats,
	};
}
