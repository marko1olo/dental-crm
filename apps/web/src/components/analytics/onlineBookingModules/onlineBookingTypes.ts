import type { Kopecks } from "@dental/shared";

export type OnlineBookingPeriod = "7d" | "30d" | "90d" | "all";

export interface SelfBookingChannelMetric {
	readonly key: string;
	readonly nameRu: string;
	readonly categoryRu: string;
	readonly iconType: "globe" | "yandex" | "gis" | "prodoc" | "tg" | "wa";
	readonly viewsCount: number;
	readonly slotSelectedCount: number;
	readonly bookingsCount: number;
	readonly attendedCount: number;
	readonly noShowCount: number;
	readonly paidPatientsCount: number;
	readonly revenueKopecks: number;
	readonly spentKopecks: number;
}

export interface AdminPhoneFunnelMetric {
	readonly incomingCallsCount: number;
	readonly answeredCallsCount: number;
	readonly bookedAppointmentsCount: number;
	readonly attendedCount: number;
	readonly noShowCount: number;
	readonly paidPatientsCount: number;
	readonly revenueKopecks: number;
	readonly avgCallDurationSeconds: number;
}

export interface OnlineBookingSummary {
	readonly totalViews: number;
	readonly totalSlotSelected: number;
	readonly totalBookings: number;
	readonly totalAttended: number;
	readonly totalNoShow: number;
	readonly totalPaid: number;
	readonly totalRevenueKopecks: Kopecks;
	readonly totalSpentKopecks: Kopecks;
	readonly conversionRatePercent: number;
	readonly attendanceRatePercent: number;
	readonly noShowRatePercent: number;
	readonly avgCheckKopecks: Kopecks;
	readonly romiPercent: number | null;
	readonly channelsCount: number;
}

export interface OnlineBookingComparisonData {
	readonly onlineBookings: number;
	readonly adminBookings: number;
	readonly grandTotalBookings: number;
	readonly onlineSharePercent: number;
	readonly adminSharePercent: number;
	readonly onlineAttendancePercent: number;
	readonly adminAttendancePercent: number;
	readonly savedHours: number;
}
