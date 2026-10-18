import type { Kopecks } from "@dental/shared";
import type {
	AdminPhoneFunnelMetric,
	OnlineBookingComparisonData,
	OnlineBookingSummary,
	SelfBookingChannelMetric,
} from "./onlineBookingTypes";

export function computeOnlineSummary(
	channels: readonly SelfBookingChannelMetric[],
	selectedChannelKey: string,
): OnlineBookingSummary {
	const filtered =
		selectedChannelKey === "all"
			? channels
			: channels.filter((c) => c.key === selectedChannelKey);

	const totalViews = filtered.reduce((acc, c) => acc + (c.viewsCount || 0), 0);
	const totalSlotSelected = filtered.reduce(
		(acc, c) => acc + (c.slotSelectedCount || 0),
		0,
	);
	const totalBookings = filtered.reduce((acc, c) => acc + (c.bookingsCount || 0), 0);
	const totalAttended = filtered.reduce((acc, c) => acc + (c.attendedCount || 0), 0);
	const totalNoShow = filtered.reduce((acc, c) => acc + (c.noShowCount || 0), 0);
	const totalPaid = filtered.reduce((acc, c) => acc + (c.paidPatientsCount || 0), 0);
	const totalRevenueKopecks = Math.round(
		filtered.reduce((acc, c) => acc + (c.revenueKopecks || 0), 0),
	) as Kopecks;
	const totalSpentKopecks = Math.round(
		filtered.reduce((acc, c) => acc + (c.spentKopecks || 0), 0),
	) as Kopecks;

	const conversionRatePercent =
		totalViews > 0 ? (totalBookings / totalViews) * 100 : 0;
	const attendanceRatePercent =
		totalBookings > 0 ? (totalAttended / totalBookings) * 100 : 0;
	const noShowRatePercent =
		totalBookings > 0 ? (totalNoShow / totalBookings) * 100 : 0;
	const avgCheckKopecks =
		totalPaid > 0 ? (Math.round(totalRevenueKopecks / totalPaid) as Kopecks) : (0 as Kopecks);

	const profitKopecks = totalRevenueKopecks - totalSpentKopecks;
	const romiPercent =
		totalSpentKopecks > 0
			? Math.round((profitKopecks / totalSpentKopecks) * 100)
			: null;

	return {
		totalViews,
		totalSlotSelected,
		totalBookings,
		totalAttended,
		totalNoShow,
		totalPaid,
		totalRevenueKopecks,
		totalSpentKopecks,
		conversionRatePercent,
		attendanceRatePercent,
		noShowRatePercent,
		avgCheckKopecks,
		romiPercent,
		channelsCount: filtered.length,
	};
}

export function computeOnlineComparison(
	onlineSummary: OnlineBookingSummary,
	adminFunnel: AdminPhoneFunnelMetric,
): OnlineBookingComparisonData {
	const onlineBookings = onlineSummary.totalBookings;
	const adminBookings = adminFunnel.bookedAppointmentsCount;
	const grandTotalBookings = onlineBookings + adminBookings;

	const onlineSharePercent =
		grandTotalBookings > 0
			? Math.round((onlineBookings / grandTotalBookings) * 100)
			: 0;
	const adminSharePercent = 100 - onlineSharePercent;

	const onlineAttendancePercent =
		onlineSummary.totalBookings > 0
			? Math.round((onlineSummary.totalAttended / onlineSummary.totalBookings) * 100)
			: 0;
	const adminAttendancePercent =
		adminFunnel.bookedAppointmentsCount > 0
			? Math.round((adminFunnel.attendedCount / adminFunnel.bookedAppointmentsCount) * 100)
			: 0;

	const savedMinutes = onlineBookings * 4;
	const savedHours = Math.round((savedMinutes / 60) * 10) / 10;

	return {
		onlineBookings,
		adminBookings,
		grandTotalBookings,
		onlineSharePercent,
		adminSharePercent,
		onlineAttendancePercent,
		adminAttendancePercent,
		savedHours,
	};
}
