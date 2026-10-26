import type { ClinicMode } from "../../lib/clinicCapabilities";

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
	prepayments: {
		patientId: string;
		patientName: string;
		prepaidRub: number;
	}[];
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
