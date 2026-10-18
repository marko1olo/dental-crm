export interface RawDoctorVisitItem {
	readonly id: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialty?: string | undefined;
	readonly status: "completed" | "in_treatment" | "arrived" | "booked" | "cancelled" | "no_show";
	readonly patientId?: string | undefined;
	readonly isPrimaryPatient?: boolean | undefined;
	readonly billedKopecks?: number | undefined;
	readonly paidKopecks?: number | undefined;
	readonly durationMinutes?: number | undefined;
	readonly date?: string | Date | undefined;
}

export interface SingleDoctorProductivityMetrics {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialty: string;
	readonly totalBilledKopecks: number;
	readonly totalPaidKopecks: number;
	readonly completedVisitsCount: number;
	readonly totalScheduledAppointments: number;
	readonly attendedAppointmentsCount: number;
	readonly cancelledCount: number;
	readonly noShowCount: number;
	readonly attendanceRatePercent: number;
	readonly uniquePatientsCount: number;
	readonly primaryPatientsCount: number;
	readonly repeatPatientsCount: number;
	readonly primarySharePercent: number;
	readonly averageBillKopecks: number;
	readonly clinicalHours: number;
	readonly hourlyBilledKopecks: number;
	readonly rank: number;
}

export interface ClinicDoctorProductivitySummary {
	readonly periodLabel: string;
	readonly activeDoctorsCount: number;
	readonly doctors: readonly SingleDoctorProductivityMetrics[];
	readonly totalClinicBilledKopecks: number;
	readonly totalClinicPaidKopecks: number;
	readonly totalCompletedVisitsCount: number;
	readonly overallAttendanceRatePercent: number;
	readonly averageDoctorBillKopecks: number;
	readonly topPerformerDoctorName: string | null;
	readonly isEmpty: boolean;
}
