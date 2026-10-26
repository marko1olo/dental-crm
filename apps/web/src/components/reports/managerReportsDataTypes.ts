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
