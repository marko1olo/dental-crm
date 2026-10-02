/**
 * Типы данных и моделей для панели отчётов управляющего и экспорта CSV.
 */

import type { ClinicMode } from "../../lib/clinicCapabilities";

export type ReportSectionTab =
	| "all"
	| "executive"
	| "revenue"
	| "doctors"
	| "chairs"
	| "services"
	| "schedule"
	| "receivables";

export type RevenuePoint = {
	bucket: string;
	revenueRub: number;
	paymentCount: number;
	payingPatients: number;
};

export type DoctorRow = {
	doctorUserId: string | null;
	doctorName: string;
	revenueRub: number;
	appointmentsTotal: number;
	appointmentsCompleted: number;
	appointmentsCancelled: number;
	appointmentsNoShow: number;
	completionRate: number | null;
	noShowRate: number | null;
	averageTicketRub: number | null;
	marginRub: null;
};

export type ChairRow = {
	chairId: string | null;
	chairName: string;
	appointments: number;
	bookedMinutes: number;
	utilization: number | null;
};

export type ReminderGroup = {
	appointments: number;
	completed: number;
	cancelled: number;
	noShow: number;
	lost: number;
	lostRate: number | null;
};

export type ReportsSummary = {
	period: { from: string; to: string };
	revenue: {
		granularity: string;
		points: RevenuePoint[];
		totalRub: number;
		isEmpty: boolean;
	};
	doctors: {
		rows: DoctorRow[];
		unattributedRevenueRub: number;
		attributionNote: string;
		isEmpty: boolean;
	};
	chairs: {
		rows: ChairRow[];
		basis: {
			workingDays: number;
			minutesPerDay: number;
			totalMinutesPerChair: number;
			note: string;
		};
		isEmpty: boolean;
	};
	appointments: {
		byStatus: Record<string, number>;
		total: number;
		arrivalRate: number | null;
		completionRate: number | null;
		cancellationRate: number | null;
		noShowRate: number | null;
		lostAppointments: number;
		isEmpty: boolean;
	};
	reminderEffect: {
		reminded: ReminderGroup;
		notReminded: ReminderGroup;
		lostRateDifference: number | null;
		caveat: string;
		smallestGroupSize: number;
		enoughData: boolean;
		isEmpty: boolean;
	};
	patientFlow: {
		points: {
			bucket: string;
			newPatients: number;
			returningPatients: number;
		}[];
		newTotal: number;
		returningTotal: number;
	};
	receivables: {
		totalDebtRub: number;
		byBucket: Record<string, number>;
		debtors: number;
		totalPrepaidRub?: number;
		prepayments?: {
			patientId: string;
			patientName: string;
			prepaidRub: number;
		}[];
	};
	isEmpty: boolean;
};

export type CalendarPeriod = {
	readonly from: string;
	readonly to: string;
};

export type ServiceSalesReport = {
	rows: {
		title: string;
		quantity: number;
		plannedRub: number;
		averagePriceRub: number;
		discountRub: number;
	}[];
	plannedTotalRub: number;
	discountTotalRub: number;
	note: string;
	isEmpty: boolean;
};

export type ReceivablesDetail = {
	rows: {
		patientId: string;
		patientName: string;
		debtRub: number;
		oldestChargeAt: string | null;
		bucket: string;
	}[];
	totalDebtRub: number;
	byBucket: Record<string, number>;
	prepayments: { patientId: string; patientName: string; prepaidRub: number }[];
	totalPrepaidRub: number;
	note: string;
	isEmpty: boolean;
};

export type ScheduleLoadReport = {
	cells: {
		weekday: number;
		hour: number;
		appointments: number;
		bookedMinutes: number;
	}[];
	busiestWeekday: number | null;
	busiestHour: number | null;
	isEmpty: boolean;
};

export type ReportSlice<T> = {
	readonly data: T | null;
	readonly error: string | null;
};

export type ManagerReportsPanelProps = {
	readonly clinicMode?: ClinicMode | null;
};
