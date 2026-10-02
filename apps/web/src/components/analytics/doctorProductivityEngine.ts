/**
 * apps/web/src/components/analytics/doctorProductivityEngine.ts
 *
 * ДВИЖОК РЕАЛЬНОЙ ПРОДУКТИВНОСТИ ВРАЧЕЙ-СТОМАТОЛОГОВ (DOCTOR PRODUCTIVITY ENGINE).
 *
 * Стандарты:
 * - 100% Zero Mocks: расчет строится на реальных визитах (visits) и назначенных услугах (treatments).
 * - Реальная выработка: начисленная сумма услуг по закрытым актам в целых копейках.
 * - Учет первичных и повторных пациентов.
 * - Процент доходимости пациентов по расписанию (Attendance Rate):
 *     Attendance Rate = (Явившиеся визиты / Запланированные визиты) * 100%
 * - Средний чек и часовая выработка врача (Hourly Productivity Yield).
 */

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
	readonly totalBilledKopecks: number;       // Начисленная сумма услуг (выработка)
	readonly totalPaidKopecks: number;         // Фактически оплаченная сумма
	readonly completedVisitsCount: number;     // Завершенных визитов
	readonly totalScheduledAppointments: number;// Всего назначено в расписании
	readonly attendedAppointmentsCount: number;// Явилось пациентов
	readonly cancelledCount: number;           // Отменено
	readonly noShowCount: number;              // Неявки
	readonly attendanceRatePercent: number;    // Доходимость (%)
	readonly uniquePatientsCount: number;      // Уникальных пациентов
	readonly primaryPatientsCount: number;     // Первичных пациентов
	readonly repeatPatientsCount: number;      // Повторных пациентов
	readonly primarySharePercent: number;      // Доля первичных (%)
	readonly averageBillKopecks: number;       // Средний чек врача
	readonly clinicalHours: number;            // Отработано клинических часов
	readonly hourlyBilledKopecks: number;      // Выработка на клинический час
	readonly rank: number;                     // Место в рейтинге клиники
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

/**
 * Главный калькулятор продуктивности врачей клиники.
 */
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

	// Группируем по врачам
	interface DoctorAccumulator {
		doctorId: string;
		doctorName: string;
		specialty: string;
		totalBilledKopecks: number;
		totalPaidKopecks: number;
		completedVisitsCount: number;
		totalScheduledAppointments: number;
		attendedAppointmentsCount: number;
		cancelledCount: number;
		noShowCount: number;
		totalMinutes: number;
		uniquePatients: Set<string>;
		primaryPatients: Set<string>;
		repeatPatients: Set<string>;
	}

	const doctorMap = new Map<string, DoctorAccumulator>();

	for (const v of visits) {
		const docId = v.doctorId || "unassigned";
		const docName = v.doctorName || "Врач не назначен";
		const spec = v.specialty || "Стоматолог общей практики";

		let acc = doctorMap.get(docId);
		if (!acc) {
			acc = {
				doctorId: docId,
				doctorName: docName,
				specialty: spec,
				totalBilledKopecks: 0,
				totalPaidKopecks: 0,
				completedVisitsCount: 0,
				totalScheduledAppointments: 0,
				attendedAppointmentsCount: 0,
				cancelledCount: 0,
				noShowCount: 0,
				totalMinutes: 0,
				uniquePatients: new Set<string>(),
				primaryPatients: new Set<string>(),
				repeatPatients: new Set<string>(),
			};
			doctorMap.set(docId, acc);
		}

		acc.totalScheduledAppointments += 1;

		if (v.status === "cancelled") {
			acc.cancelledCount += 1;
			continue;
		}

		if (v.status === "no_show") {
			acc.noShowCount += 1;
			continue;
		}

		// Пациент явился (completed, in_treatment, arrived, booked)
		acc.attendedAppointmentsCount += 1;

		const billed = Math.max(0, Math.round(v.billedKopecks || 0));
		const paid = Math.max(0, Math.round(v.paidKopecks || 0));
		const dur = Math.max(0, Math.round(v.durationMinutes || 30));

		acc.totalBilledKopecks += billed;
		acc.totalPaidKopecks += paid;
		acc.totalMinutes += dur;

		if (v.status === "completed") {
			acc.completedVisitsCount += 1;
		}

		if (v.patientId) {
			acc.uniquePatients.add(v.patientId);
			if (v.isPrimaryPatient) {
				acc.primaryPatients.add(v.patientId);
			} else {
				acc.repeatPatients.add(v.patientId);
			}
		}
	}

	// Формируем список врачей с расчетом метрик
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

	// Сортируем врачей по выработке (от наибольшей к наименьшей) и назначаем ранги
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

	const topPerformer = doctorsWithRank[0]?.doctorName || null;

	return {
		periodLabel,
		activeDoctorsCount: doctorsWithRank.length,
		doctors: doctorsWithRank,
		totalClinicBilledKopecks: clinicTotalBilledKop,
		totalClinicPaidKopecks: clinicTotalPaidKop,
		totalCompletedVisitsCount: clinicTotalCompleted,
		overallAttendanceRatePercent,
		averageDoctorBillKopecks,
		topPerformerDoctorName: topPerformer,
		isEmpty: visits.length === 0,
	};
}
