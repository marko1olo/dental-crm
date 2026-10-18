import { accumulateDoctorVisits } from "./doctorEngineModules/doctorProductivityAccumulator";
import type {
	ClinicDoctorProductivitySummary,
	RawDoctorVisitItem,
	SingleDoctorProductivityMetrics,
} from "./doctorEngineModules/doctorProductivityTypes";

export * from "./doctorEngineModules/doctorProductivityTypes";
export * from "./doctorEngineModules/doctorProductivityAccumulator";

export function calculateDoctorProductivity(params: {
	readonly visits: readonly RawDoctorVisitItem[];
	readonly periodLabel?: string;
}): ClinicDoctorProductivitySummary {
	const { visits, periodLabel = "Текущий период" } = params;

	if (!visits || visits.length === 0) {
		return {
			periodLabel,
			activeDoctorsCount: 0,
			doctors: [],
			totalClinicBilledKopecks: 0,
			totalClinicPaidKopecks: 0,
			totalCompletedVisitsCount: 0,
			overallAttendanceRatePercent: 0,
			averageDoctorBillKopecks: 0,
			topPerformerDoctorName: null,
			isEmpty: true,
		};
	}

	const doctorMap = accumulateDoctorVisits(visits);
	const metricsList: Omit<SingleDoctorProductivityMetrics, "rank">[] = [];
	let clinicTotalBilledKop = 0;
	let clinicTotalPaidKop = 0;
	let clinicTotalCompleted = 0;
	let clinicTotalScheduled = 0;
	let clinicTotalAttended = 0;

	for (const acc of doctorMap.values()) {
		const totalPts = acc.uniquePatients.size;
		const primPts = acc.primaryPatients.size;
		const repPts = acc.repeatPatients.size;

		const primarySharePercent =
			totalPts > 0 ? Number(((primPts / totalPts) * 100).toFixed(1)) : 0;
		const attendanceRatePercent =
			acc.totalScheduledAppointments > 0
				? Number(((acc.attendedAppointmentsCount / acc.totalScheduledAppointments) * 100).toFixed(1))
				: 0;
		const averageBillKopecks =
			acc.completedVisitsCount > 0
				? Math.round(acc.totalBilledKopecks / acc.completedVisitsCount)
				: 0;
		const clinicalHours = Number((acc.totalMinutes / 60).toFixed(1));
		const hourlyBilledKopecks =
			clinicalHours > 0 ? Math.round(acc.totalBilledKopecks / clinicalHours) : 0;

		metricsList.push({
			doctorId: acc.doctorId,
			doctorName: acc.doctorName,
			specialty: acc.specialty,
			totalBilledKopecks: acc.totalBilledKopecks,
			totalPaidKopecks: acc.totalPaidKopecks,
			completedVisitsCount: acc.completedVisitsCount,
			totalScheduledAppointments: acc.totalScheduledAppointments,
			attendedAppointmentsCount: acc.attendedAppointmentsCount,
			cancelledCount: acc.cancelledCount,
			noShowCount: acc.noShowCount,
			attendanceRatePercent,
			uniquePatientsCount: totalPts,
			primaryPatientsCount: primPts,
			repeatPatientsCount: repPts,
			primarySharePercent,
			averageBillKopecks,
			clinicalHours,
			hourlyBilledKopecks,
		});

		clinicTotalBilledKop += acc.totalBilledKopecks;
		clinicTotalPaidKop += acc.totalPaidKopecks;
		clinicTotalCompleted += acc.completedVisitsCount;
		clinicTotalScheduled += acc.totalScheduledAppointments;
		clinicTotalAttended += acc.attendedAppointmentsCount;
	}

	metricsList.sort((a, b) => b.totalBilledKopecks - a.totalBilledKopecks);
	const doctorsWithRank: SingleDoctorProductivityMetrics[] = metricsList.map((m, index) => ({
		...m,
		rank: index + 1,
	}));

	const overallAttendanceRatePercent =
		clinicTotalScheduled > 0
			? Number(((clinicTotalAttended / clinicTotalScheduled) * 100).toFixed(1))
			: 0;
	const averageDoctorBillKopecks =
		clinicTotalCompleted > 0
			? Math.round(clinicTotalBilledKop / clinicTotalCompleted)
			: 0;

	return {
		periodLabel,
		activeDoctorsCount: doctorsWithRank.length,
		doctors: doctorsWithRank,
		totalClinicBilledKopecks: clinicTotalBilledKop,
		totalClinicPaidKopecks: clinicTotalPaidKop,
		totalCompletedVisitsCount: clinicTotalCompleted,
		overallAttendanceRatePercent,
		averageDoctorBillKopecks,
		topPerformerDoctorName: doctorsWithRank[0]?.doctorName || null,
		isEmpty: visits.length === 0,
	};
}
