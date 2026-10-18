export interface RawAppointmentItem {
	readonly id: string;
	readonly chairId?: string | null | undefined;
	readonly chairName?: string | null | undefined;
	readonly startsAt: string | Date;
	readonly endsAt: string | Date;
	readonly status: "completed" | "in_treatment" | "arrived" | "booked" | "cancelled" | "no_show";
	readonly revenueKopecks?: number | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientId?: string | undefined;
}

export interface ChairDefinition {
	readonly id: string;
	readonly name: string;
	readonly cabinet: string;
	readonly workingHoursPerDay?: number | undefined;
	readonly sanitationMinutesPerVisit?: number | undefined;
	readonly isActive?: boolean | undefined;
}

export interface SingleChairUtilizationMetrics {
	readonly chairId: string;
	readonly chairName: string;
	readonly cabinet: string;
	readonly totalAppointments: number;
	readonly completedCount: number;
	readonly cancelledCount: number;
	readonly noShowCount: number;
	readonly occupiedMinutes: number;
	readonly sanitationMinutes: number;
	readonly effectiveOccupiedMinutes: number;
	readonly availableMinutes: number;
	readonly idleMinutes: number;
	readonly pureOccupancyPercent: number;
	readonly effectiveUtilizationPercent: number;
	readonly totalRevenueKopecks: number;
	readonly revenuePerHourKopecks: number;
	readonly capacityYieldPerHourKopecks: number;
	readonly cancellationRatePercent: number;
	readonly isOverloaded: boolean;
}

export interface ClinicChairUtilizationSummary {
	readonly periodLabel: string;
	readonly daysCount: number;
	readonly totalChairsCount: number;
	readonly chairs: readonly SingleChairUtilizationMetrics[];
	readonly totalOccupiedMinutes: number;
	readonly totalSanitationMinutes: number;
	readonly totalEffectiveOccupiedMinutes: number;
	readonly totalAvailableMinutes: number;
	readonly totalIdleMinutes: number;
	readonly overallUtilizationPercent: number;
	readonly overallPureOccupancyPercent: number;
	readonly totalRevenueKopecks: number;
	readonly averageRevenuePerChairKopecks: number;
	readonly averageHourlyYieldKopecks: number;
	readonly isEmpty: boolean;
}
