/**
 * DENTE Dental CRM — Clinical P&L & Appointment Margin Calculation Engine
 * Kopeck-Exact Financial Arithmetic (Integer Kopecks), Zero Float Drift
 *
 * Formula per Appointment:
 * Net Profit = Revenue - Materials (BOM) - Lab Cost (ZTL) - Doctor Piece-Rate Pay
 * Margin %   = (Net Profit / Revenue) * 100%
 */

export type ClinicalDepartment =
	| "therapy"
	| "orthopedics"
	| "surgery"
	| "orthodontics"
	| "hygiene"
	| "other";

export const DEPARTMENT_TITLES_RU: Readonly<Record<ClinicalDepartment, string>> = {
	therapy: "Терапия",
	orthopedics: "Ортопедия",
	surgery: "Хирургия и имплантация",
	orthodontics: "Ортодонтия",
	hygiene: "Гигиена и профилактика",
	other: "Прочее / Диагностика",
};

export interface ClinicalAppointmentPnlItem {
	readonly id: string;
	readonly dateIso: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorSpecialtyRu?: string | undefined;
	readonly chairId: string;
	readonly chairName: string;
	readonly department: ClinicalDepartment;
	readonly serviceName: string;
	readonly order804nCode?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly durationMinutes: number;
	readonly revenueKop: number;
	readonly materialCostKop: number;
	readonly labCostKop: number;
	readonly doctorPayKop: number;
	readonly notes?: string | undefined;
}

export interface AppointmentPnlCalculated extends ClinicalAppointmentPnlItem {
	readonly totalDirectCostsKop: number;
	readonly netProfitKop: number;
	readonly marginPercent: number;
	readonly profitPerMinuteKop: number;
	readonly isProfitable: boolean;
}

export interface DepartmentPnlSummary {
	readonly department: ClinicalDepartment;
	readonly departmentTitleRu: string;
	readonly appointmentCount: number;
	readonly totalDurationMinutes: number;
	readonly totalRevenueKop: number;
	readonly totalMaterialCostKop: number;
	readonly totalLabCostKop: number;
	readonly totalDoctorPayKop: number;
	readonly totalDirectCostsKop: number;
	readonly totalNetProfitKop: number;
	readonly marginPercent: number;
	readonly revenueSharePercent: number;
	readonly averageCheckKop: number;
	readonly averageProfitPerAppointmentKop: number;
}

export interface DoctorPnlRanking {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialtyRu: string;
	readonly appointmentCount: number;
	readonly totalDurationMinutes: number;
	readonly totalRevenueKop: number;
	readonly totalMaterialCostKop: number;
	readonly totalLabCostKop: number;
	readonly totalDoctorPayKop: number;
	readonly totalDirectCostsKop: number;
	readonly totalNetProfitKop: number;
	readonly marginPercent: number;
	readonly averageRevenuePerAppointmentKop: number;
	readonly averageProfitPerAppointmentKop: number;
	readonly hourlyNetProfitKop: number;
	readonly rank: number;
}

export interface ChairPnlRanking {
	readonly chairId: string;
	readonly chairName: string;
	readonly appointmentCount: number;
	readonly totalDurationMinutes: number;
	readonly totalRevenueKop: number;
	readonly totalMaterialCostKop: number;
	readonly totalLabCostKop: number;
	readonly totalDoctorPayKop: number;
	readonly totalDirectCostsKop: number;
	readonly totalNetProfitKop: number;
	readonly marginPercent: number;
	readonly averageProfitPerHourKop: number;
	readonly utilizationHours: number;
	readonly rank: number;
}

export interface ClinicalPnlCostStructure {
	readonly materialSharePercent: number;
	readonly labSharePercent: number;
	readonly doctorPaySharePercent: number;
	readonly netProfitSharePercent: number;
}

export interface ClinicalPnlReport {
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly clinicName: string;
	readonly generatedAtIso: string;
	readonly totalAppointments: number;
	readonly totalDurationMinutes: number;
	readonly totalRevenueKop: number;
	readonly totalMaterialCostKop: number;
	readonly totalLabCostKop: number;
	readonly totalDoctorPayKop: number;
	readonly totalDirectCostsKop: number;
	readonly totalNetProfitKop: number;
	readonly overallMarginPercent: number;
	readonly averageProfitPerAppointmentKop: number;
	readonly averageCheckKop: number;
	readonly costStructure: ClinicalPnlCostStructure;
	readonly departments: readonly DepartmentPnlSummary[];
	readonly doctorRankings: readonly DoctorPnlRanking[];
	readonly chairRankings: readonly ChairPnlRanking[];
	readonly appointments: readonly AppointmentPnlCalculated[];
}

export interface ClinicalPnlEngineInput {
	readonly appointments: readonly ClinicalAppointmentPnlItem[];
	readonly periodStartIso?: string | undefined;
	readonly periodEndIso?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly filterDepartment?: ClinicalDepartment | "all" | undefined;
	readonly filterDoctorId?: string | "all" | undefined;
	readonly filterChairId?: string | "all" | undefined;
}

export interface ClinicalPnlFilter {
	readonly department?: ClinicalDepartment | "all" | undefined;
	readonly doctorId?: string | "all" | undefined;
	readonly chairId?: string | "all" | undefined;
	readonly startDateIso?: string | undefined;
	readonly endDateIso?: string | undefined;
	readonly searchQuery?: string | undefined;
}

/**
 * Calculates kopeck-exact P&L for a single clinical appointment.
 */
export function calculateAppointmentPnl(
	item: ClinicalAppointmentPnlItem
): AppointmentPnlCalculated {
	const revenueKop = Math.round(item.revenueKop);
	const materialCostKop = Math.round(item.materialCostKop);
	const labCostKop = Math.round(item.labCostKop);
	const doctorPayKop = Math.round(item.doctorPayKop);
	const durationMinutes = Math.max(1, Math.round(item.durationMinutes));

	const totalDirectCostsKop = materialCostKop + labCostKop + doctorPayKop;
	const netProfitKop = revenueKop - totalDirectCostsKop;

	let marginPercent = 0;
	if (revenueKop > 0) {
		marginPercent = Math.round((netProfitKop / revenueKop) * 10000) / 100;
	} else if (netProfitKop < 0) {
		marginPercent = -100;
	}

	const profitPerMinuteKop = Math.round(netProfitKop / durationMinutes);

	return {
		...item,
		revenueKop,
		materialCostKop,
		labCostKop,
		doctorPayKop,
		durationMinutes,
		totalDirectCostsKop,
		netProfitKop,
		marginPercent,
		profitPerMinuteKop,
		isProfitable: netProfitKop > 0,
	};
}

/**
 * Filters appointments by department, doctor, chair, date range, and search text.
 */
export function filterPnlAppointments(
	appointments: readonly ClinicalAppointmentPnlItem[],
	filter: ClinicalPnlFilter
): readonly ClinicalAppointmentPnlItem[] {
	return appointments.filter((app) => {
		if (filter.department && filter.department !== "all" && app.department !== filter.department) {
			return false;
		}
		if (filter.doctorId && filter.doctorId !== "all" && app.doctorId !== filter.doctorId) {
			return false;
		}
		if (filter.chairId && filter.chairId !== "all" && app.chairId !== filter.chairId) {
			return false;
		}
		if (filter.startDateIso && app.dateIso < filter.startDateIso) {
			return false;
		}
		if (filter.endDateIso && app.dateIso > filter.endDateIso) {
			return false;
		}
		if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
			const q = filter.searchQuery.trim().toLowerCase();
			const matchPatient = app.patientName.toLowerCase().includes(q);
			const matchCard = app.medicalCardNumber.toLowerCase().includes(q);
			const matchService = app.serviceName.toLowerCase().includes(q);
			const matchDoctor = app.doctorName.toLowerCase().includes(q);
			const matchChair = app.chairName.toLowerCase().includes(q);
			const matchCode = app.order804nCode ? app.order804nCode.toLowerCase().includes(q) : false;
			const matchTooth = app.toothCode ? app.toothCode.toLowerCase().includes(q) : false;
			if (!matchPatient && !matchCard && !matchService && !matchDoctor && !matchChair && !matchCode && !matchTooth) {
				return false;
			}
		}
		return true;
	});
}

/**
 * Calculates complete aggregated clinical P&L report across all dimensions.
 */
export function calculateClinicalPnlReport(
	input: ClinicalPnlEngineInput
): ClinicalPnlReport {
	const clinicName = input.clinicName ?? "ООО «Денте Стоматология»";
	const periodStartIso = input.periodStartIso ?? "2026-08-01";
	const periodEndIso = input.periodEndIso ?? "2026-08-31";

	const filteredRaw = filterPnlAppointments(input.appointments, {
		department: input.filterDepartment,
		doctorId: input.filterDoctorId,
		chairId: input.filterChairId,
		startDateIso: input.periodStartIso,
		endDateIso: input.periodEndIso,
	});

	const calculatedAppointments = filteredRaw.map(calculateAppointmentPnl);

	let totalRevenueKop = 0;
	let totalMaterialCostKop = 0;
	let totalLabCostKop = 0;
	let totalDoctorPayKop = 0;
	let totalDirectCostsKop = 0;
	let totalNetProfitKop = 0;
	let totalDurationMinutes = 0;

	for (const item of calculatedAppointments) {
		totalRevenueKop += item.revenueKop;
		totalMaterialCostKop += item.materialCostKop;
		totalLabCostKop += item.labCostKop;
		totalDoctorPayKop += item.doctorPayKop;
		totalDirectCostsKop += item.totalDirectCostsKop;
		totalNetProfitKop += item.netProfitKop;
		totalDurationMinutes += item.durationMinutes;
	}

	const totalAppointments = calculatedAppointments.length;
	let overallMarginPercent = 0;
	if (totalRevenueKop > 0) {
		overallMarginPercent = Math.round((totalNetProfitKop / totalRevenueKop) * 10000) / 100;
	} else if (totalNetProfitKop < 0) {
		overallMarginPercent = -100;
	}

	const averageProfitPerAppointmentKop =
		totalAppointments > 0 ? Math.round(totalNetProfitKop / totalAppointments) : 0;
	const averageCheckKop =
		totalAppointments > 0 ? Math.round(totalRevenueKop / totalAppointments) : 0;

	// Cost structure shares
	let materialSharePercent = 0;
	let labSharePercent = 0;
	let doctorPaySharePercent = 0;
	let netProfitSharePercent = 0;

	if (totalRevenueKop > 0) {
		materialSharePercent = Math.round((totalMaterialCostKop / totalRevenueKop) * 10000) / 100;
		labSharePercent = Math.round((totalLabCostKop / totalRevenueKop) * 10000) / 100;
		doctorPaySharePercent = Math.round((totalDoctorPayKop / totalRevenueKop) * 10000) / 100;
		netProfitSharePercent = Math.round((totalNetProfitKop / totalRevenueKop) * 10000) / 100;
	}

	// 1. Group by department
	const departmentMap = new Map<ClinicalDepartment, {
		appointmentCount: number;
		totalDurationMinutes: number;
		totalRevenueKop: number;
		totalMaterialCostKop: number;
		totalLabCostKop: number;
		totalDoctorPayKop: number;
		totalDirectCostsKop: number;
		totalNetProfitKop: number;
	}>();

	const ALL_DEPARTMENTS: readonly ClinicalDepartment[] = [
		"therapy",
		"orthopedics",
		"surgery",
		"orthodontics",
		"hygiene",
		"other",
	];

	for (const dep of ALL_DEPARTMENTS) {
		departmentMap.set(dep, {
			appointmentCount: 0,
			totalDurationMinutes: 0,
			totalRevenueKop: 0,
			totalMaterialCostKop: 0,
			totalLabCostKop: 0,
			totalDoctorPayKop: 0,
			totalDirectCostsKop: 0,
			totalNetProfitKop: 0,
		});
	}

	for (const item of calculatedAppointments) {
		const existing = departmentMap.get(item.department);
		if (existing) {
			existing.appointmentCount += 1;
			existing.totalDurationMinutes += item.durationMinutes;
			existing.totalRevenueKop += item.revenueKop;
			existing.totalMaterialCostKop += item.materialCostKop;
			existing.totalLabCostKop += item.labCostKop;
			existing.totalDoctorPayKop += item.doctorPayKop;
			existing.totalDirectCostsKop += item.totalDirectCostsKop;
			existing.totalNetProfitKop += item.netProfitKop;
		}
	}

	const departmentSummaries: DepartmentPnlSummary[] = [];
	for (const dep of ALL_DEPARTMENTS) {
		const data = departmentMap.get(dep)!;
		let depMargin = 0;
		if (data.totalRevenueKop > 0) {
			depMargin = Math.round((data.totalNetProfitKop / data.totalRevenueKop) * 10000) / 100;
		} else if (data.totalNetProfitKop < 0) {
			depMargin = -100;
		}

		const revenueShare = totalRevenueKop > 0
			? Math.round((data.totalRevenueKop / totalRevenueKop) * 10000) / 100
			: 0;

		const avgCheck = data.appointmentCount > 0
			? Math.round(data.totalRevenueKop / data.appointmentCount)
			: 0;

		const avgProfit = data.appointmentCount > 0
			? Math.round(data.totalNetProfitKop / data.appointmentCount)
			: 0;

		departmentSummaries.push({
			department: dep,
			departmentTitleRu: DEPARTMENT_TITLES_RU[dep],
			appointmentCount: data.appointmentCount,
			totalDurationMinutes: data.totalDurationMinutes,
			totalRevenueKop: data.totalRevenueKop,
			totalMaterialCostKop: data.totalMaterialCostKop,
			totalLabCostKop: data.totalLabCostKop,
			totalDoctorPayKop: data.totalDoctorPayKop,
			totalDirectCostsKop: data.totalDirectCostsKop,
			totalNetProfitKop: data.totalNetProfitKop,
			marginPercent: depMargin,
			revenueSharePercent: revenueShare,
			averageCheckKop: avgCheck,
			averageProfitPerAppointmentKop: avgProfit,
		});
	}

	// 2. Group by Doctor (Ranking)
	interface DoctorAgg {
		doctorId: string;
		doctorName: string;
		specialtyRu: string;
		appointmentCount: number;
		totalDurationMinutes: number;
		totalRevenueKop: number;
		totalMaterialCostKop: number;
		totalLabCostKop: number;
		totalDoctorPayKop: number;
		totalDirectCostsKop: number;
		totalNetProfitKop: number;
	}

	const doctorMap = new Map<string, DoctorAgg>();
	for (const item of calculatedAppointments) {
		let doc = doctorMap.get(item.doctorId);
		if (!doc) {
			doc = {
				doctorId: item.doctorId,
				doctorName: item.doctorName,
				specialtyRu: item.doctorSpecialtyRu ?? DEPARTMENT_TITLES_RU[item.department] ?? "Врач-стоматолог",
				appointmentCount: 0,
				totalDurationMinutes: 0,
				totalRevenueKop: 0,
				totalMaterialCostKop: 0,
				totalLabCostKop: 0,
				totalDoctorPayKop: 0,
				totalDirectCostsKop: 0,
				totalNetProfitKop: 0,
			};
			doctorMap.set(item.doctorId, doc);
		}
		doc.appointmentCount += 1;
		doc.totalDurationMinutes += item.durationMinutes;
		doc.totalRevenueKop += item.revenueKop;
		doc.totalMaterialCostKop += item.materialCostKop;
		doc.totalLabCostKop += item.labCostKop;
		doc.totalDoctorPayKop += item.doctorPayKop;
		doc.totalDirectCostsKop += item.totalDirectCostsKop;
		doc.totalNetProfitKop += item.netProfitKop;
	}

	const sortedDoctors = Array.from(doctorMap.values()).sort(
		(a, b) => b.totalNetProfitKop - a.totalNetProfitKop
	);

	const doctorRankings: DoctorPnlRanking[] = sortedDoctors.map((doc, idx) => {
		let docMargin = 0;
		if (doc.totalRevenueKop > 0) {
			docMargin = Math.round((doc.totalNetProfitKop / doc.totalRevenueKop) * 10000) / 100;
		} else if (doc.totalNetProfitKop < 0) {
			docMargin = -100;
		}

		const avgRev = doc.appointmentCount > 0
			? Math.round(doc.totalRevenueKop / doc.appointmentCount)
			: 0;

		const avgProfit = doc.appointmentCount > 0
			? Math.round(doc.totalNetProfitKop / doc.appointmentCount)
			: 0;

		const hourlyProfit = doc.totalDurationMinutes > 0
			? Math.round((doc.totalNetProfitKop * 60) / doc.totalDurationMinutes)
			: 0;

		return {
			doctorId: doc.doctorId,
			doctorName: doc.doctorName,
			specialtyRu: doc.specialtyRu,
			appointmentCount: doc.appointmentCount,
			totalDurationMinutes: doc.totalDurationMinutes,
			totalRevenueKop: doc.totalRevenueKop,
			totalMaterialCostKop: doc.totalMaterialCostKop,
			totalLabCostKop: doc.totalLabCostKop,
			totalDoctorPayKop: doc.totalDoctorPayKop,
			totalDirectCostsKop: doc.totalDirectCostsKop,
			totalNetProfitKop: doc.totalNetProfitKop,
			marginPercent: docMargin,
			averageRevenuePerAppointmentKop: avgRev,
			averageProfitPerAppointmentKop: avgProfit,
			hourlyNetProfitKop: hourlyProfit,
			rank: idx + 1,
		};
	});

	// 3. Group by Chair (Ranking)
	interface ChairAgg {
		chairId: string;
		chairName: string;
		appointmentCount: number;
		totalDurationMinutes: number;
		totalRevenueKop: number;
		totalMaterialCostKop: number;
		totalLabCostKop: number;
		totalDoctorPayKop: number;
		totalDirectCostsKop: number;
		totalNetProfitKop: number;
	}

	const chairMap = new Map<string, ChairAgg>();
	for (const item of calculatedAppointments) {
		let chair = chairMap.get(item.chairId);
		if (!chair) {
			chair = {
				chairId: item.chairId,
				chairName: item.chairName,
				appointmentCount: 0,
				totalDurationMinutes: 0,
				totalRevenueKop: 0,
				totalMaterialCostKop: 0,
				totalLabCostKop: 0,
				totalDoctorPayKop: 0,
				totalDirectCostsKop: 0,
				totalNetProfitKop: 0,
			};
			chairMap.set(item.chairId, chair);
		}
		chair.appointmentCount += 1;
		chair.totalDurationMinutes += item.durationMinutes;
		chair.totalRevenueKop += item.revenueKop;
		chair.totalMaterialCostKop += item.materialCostKop;
		chair.totalLabCostKop += item.labCostKop;
		chair.totalDoctorPayKop += item.doctorPayKop;
		chair.totalDirectCostsKop += item.totalDirectCostsKop;
		chair.totalNetProfitKop += item.netProfitKop;
	}

	const sortedChairs = Array.from(chairMap.values()).sort(
		(a, b) => b.totalNetProfitKop - a.totalNetProfitKop
	);

	const chairRankings: ChairPnlRanking[] = sortedChairs.map((chair, idx) => {
		let chairMargin = 0;
		if (chair.totalRevenueKop > 0) {
			chairMargin = Math.round((chair.totalNetProfitKop / chair.totalRevenueKop) * 10000) / 100;
		} else if (chair.totalNetProfitKop < 0) {
			chairMargin = -100;
		}

		const hourlyProfit = chair.totalDurationMinutes > 0
			? Math.round((chair.totalNetProfitKop * 60) / chair.totalDurationMinutes)
			: 0;

		const utilHours = Math.round((chair.totalDurationMinutes / 60) * 10) / 10;

		return {
			chairId: chair.chairId,
			chairName: chair.chairName,
			appointmentCount: chair.appointmentCount,
			totalDurationMinutes: chair.totalDurationMinutes,
			totalRevenueKop: chair.totalRevenueKop,
			totalMaterialCostKop: chair.totalMaterialCostKop,
			totalLabCostKop: chair.totalLabCostKop,
			totalDoctorPayKop: chair.totalDoctorPayKop,
			totalDirectCostsKop: chair.totalDirectCostsKop,
			totalNetProfitKop: chair.totalNetProfitKop,
			marginPercent: chairMargin,
			averageProfitPerHourKop: hourlyProfit,
			utilizationHours: utilHours,
			rank: idx + 1,
		};
	});

	return {
		periodStartIso,
		periodEndIso,
		clinicName,
		generatedAtIso: new Date().toISOString(),
		totalAppointments,
		totalDurationMinutes,
		totalRevenueKop,
		totalMaterialCostKop,
		totalLabCostKop,
		totalDoctorPayKop,
		totalDirectCostsKop,
		totalNetProfitKop,
		overallMarginPercent,
		averageProfitPerAppointmentKop,
		averageCheckKop,
		costStructure: {
			materialSharePercent,
			labSharePercent,
			doctorPaySharePercent,
			netProfitSharePercent,
		},
		departments: departmentSummaries,
		doctorRankings,
		chairRankings,
		appointments: calculatedAppointments,
	};
}

/**
 * Formats integer kopecks into standard Russian Rubles string.
 */
export function formatKopecksToRubles(
	kopecks: number,
	options?: { showKopecks?: boolean | undefined }
): string {
	const isNegative = kopecks < 0;
	const absKop = Math.abs(Math.round(kopecks));
	const rub = Math.floor(absKop / 100);
	const kop = absKop % 100;

	const rubFormatted = rub.toLocaleString("ru-RU");

	if (options?.showKopecks) {
		const kopStr = kop.toString().padStart(2, "0");
		return `${isNegative ? "−" : ""}${rubFormatted},${kopStr} ₽`;
	}

	return `${isNegative ? "−" : ""}${rubFormatted} ₽`;
}

/**
 * Escapes string field according to RFC 4180 CSV standard.
 */
function escapeCsvField(value: string | number | undefined | null): string {
	if (value === undefined || value === null) {
		return '""';
	}
	const str = String(value);
	if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return `"${str}"`;
}

/**
 * Generates aggregated Clinical P&L Summary CSV with UTF-8 BOM.
 */
export function generateClinicalPnlCsv(report: ClinicalPnlReport): string {
	const lines: string[] = [];

	// Report Header
	lines.push(escapeCsvField("ОТЧЕТ КЛИНИЧЕСКОЙ МАРЖИНАЛЬНОСТИ И P&L") + ";;;;;;");
	lines.push(`${escapeCsvField("Клиника")};${escapeCsvField(report.clinicName)};;;;;`);
	lines.push(`${escapeCsvField("Период")};${escapeCsvField(`${report.periodStartIso} — ${report.periodEndIso}`)};;;;;`);
	lines.push(`${escapeCsvField("Дата формирования")};${escapeCsvField(report.generatedAtIso)};;;;;`);
	lines.push(";;;;;;");

	// Key Summary Telemetry
	lines.push(escapeCsvField("СВОДНЫЕ ФИНАНСОВЫЕ ПОКАЗАТЕЛИ") + ";;;;;;");
	lines.push(`${escapeCsvField("Показатель")};${escapeCsvField("Сумма (руб)")};${escapeCsvField("Доля от выручки (%)")};;;;`);
	lines.push(`${escapeCsvField("1. Выручка (Gross Revenue)")};${(report.totalRevenueKop / 100).toFixed(2)};100.00%;;;;`);
	lines.push(`${escapeCsvField("2. Списанные материалы (BOM)")};${(report.totalMaterialCostKop / 100).toFixed(2)};${report.costStructure.materialSharePercent.toFixed(2)}%;;;;`);
	lines.push(`${escapeCsvField("3. Себестоимость ЗТЛ (Лаборатория)")};${(report.totalLabCostKop / 100).toFixed(2)};${report.costStructure.labSharePercent.toFixed(2)}%;;;;`);
	lines.push(`${escapeCsvField("4. Сдельная оплата врачей (ФОТ)")};${(report.totalDoctorPayKop / 100).toFixed(2)};${report.costStructure.doctorPaySharePercent.toFixed(2)}%;;;;`);
	lines.push(`${escapeCsvField("5. Прямые расходы итого")};${(report.totalDirectCostsKop / 100).toFixed(2)};${((report.totalDirectCostsKop / (report.totalRevenueKop || 1)) * 100).toFixed(2)}%;;;;`);
	lines.push(`${escapeCsvField("6. ЧИСТАЯ ПРИБЫЛЬ КЛИНИКИ")};${(report.totalNetProfitKop / 100).toFixed(2)};${report.overallMarginPercent.toFixed(2)}%;;;;`);
	lines.push(`${escapeCsvField("Количество приемов")};${report.totalAppointments};;;;;`);
	lines.push(`${escapeCsvField("Средний чек приема")};${(report.averageCheckKop / 100).toFixed(2)};;;;;`);
	lines.push(`${escapeCsvField("Средняя прибыль с приема")};${(report.averageProfitPerAppointmentKop / 100).toFixed(2)};;;;;`);
	lines.push(";;;;;;");

	// Department Margins
	lines.push(escapeCsvField("МАРЖИНАЛЬНОСТЬ ПО НАПРАВЛЕНИЯМ") + ";;;;;;");
	lines.push(
		[
			escapeCsvField("Направление"),
			escapeCsvField("Приемов"),
			escapeCsvField("Выручка (руб)"),
			escapeCsvField("Материалы BOM (руб)"),
			escapeCsvField("ЗТЛ (руб)"),
			escapeCsvField("ФОТ Врача (руб)"),
			escapeCsvField("Чистая прибыль (руб)"),
			escapeCsvField("Маржинальность (%)"),
			escapeCsvField("Доля выручки (%)"),
		].join(";")
	);

	for (const dep of report.departments) {
		lines.push(
			[
				escapeCsvField(dep.departmentTitleRu),
				dep.appointmentCount,
				(dep.totalRevenueKop / 100).toFixed(2),
				(dep.totalMaterialCostKop / 100).toFixed(2),
				(dep.totalLabCostKop / 100).toFixed(2),
				(dep.totalDoctorPayKop / 100).toFixed(2),
				(dep.totalNetProfitKop / 100).toFixed(2),
				`${dep.marginPercent.toFixed(2)}%`,
				`${dep.revenueSharePercent.toFixed(2)}%`,
			].join(";")
		);
	}
	lines.push(";;;;;;");

	// Doctor Profitability Ranking
	lines.push(escapeCsvField("РЕЙТИНГ РЕНТАБЕЛЬНОСТИ ВРАЧЕЙ") + ";;;;;;");
	lines.push(
		[
			escapeCsvField("Ранг"),
			escapeCsvField("ФИО Врача"),
			escapeCsvField("Специальность"),
			escapeCsvField("Приемов"),
			escapeCsvField("Выручка (руб)"),
			escapeCsvField("Прямые затраты (руб)"),
			escapeCsvField("Чистая прибыль (руб)"),
			escapeCsvField("Маржинальность (%)"),
			escapeCsvField("Прибыль в час (руб)"),
		].join(";")
	);

	for (const doc of report.doctorRankings) {
		lines.push(
			[
				doc.rank,
				escapeCsvField(doc.doctorName),
				escapeCsvField(doc.specialtyRu),
				doc.appointmentCount,
				(doc.totalRevenueKop / 100).toFixed(2),
				(doc.totalDirectCostsKop / 100).toFixed(2),
				(doc.totalNetProfitKop / 100).toFixed(2),
				`${doc.marginPercent.toFixed(2)}%`,
				(doc.hourlyNetProfitKop / 100).toFixed(2),
			].join(";")
		);
	}
	lines.push(";;;;;;");

	// Chair Profitability Ranking
	lines.push(escapeCsvField("РЕЙТИНГ РЕНТАБЕЛЬНОСТИ КРЕСЕЛ И УСТАНОВОК") + ";;;;;;");
	lines.push(
		[
			escapeCsvField("Ранг"),
			escapeCsvField("Кресло / Кабинет"),
			escapeCsvField("Приемов"),
			escapeCsvField("Часов работы"),
			escapeCsvField("Выручка (руб)"),
			escapeCsvField("Чистая прибыль (руб)"),
			escapeCsvField("Маржинальность (%)"),
			escapeCsvField("Прибыль в час (руб)"),
		].join(";")
	);

	for (const chair of report.chairRankings) {
		lines.push(
			[
				chair.rank,
				escapeCsvField(chair.chairName),
				chair.appointmentCount,
				chair.utilizationHours.toFixed(1),
				(chair.totalRevenueKop / 100).toFixed(2),
				(chair.totalNetProfitKop / 100).toFixed(2),
				`${chair.marginPercent.toFixed(2)}%`,
				(chair.averageProfitPerHourKop / 100).toFixed(2),
			].join(";")
		);
	}

	return "\uFEFF" + lines.join("\r\n");
}

/**
 * Generates detailed per-appointment CSV register with UTF-8 BOM.
 */
export function generateClinicalPnlAppointmentsCsv(
	appointments: readonly AppointmentPnlCalculated[]
): string {
	const header = [
		escapeCsvField("ID"),
		escapeCsvField("Дата"),
		escapeCsvField("Пациент"),
		escapeCsvField("Медкарта"),
		escapeCsvField("Врач"),
		escapeCsvField("Кресло"),
		escapeCsvField("Направление"),
		escapeCsvField("Услуга"),
		escapeCsvField("Код 804н"),
		escapeCsvField("Зуб"),
		escapeCsvField("Длительность (мин)"),
		escapeCsvField("Выручка (руб)"),
		escapeCsvField("Материалы BOM (руб)"),
		escapeCsvField("ЗТЛ (руб)"),
		escapeCsvField("ФОТ Врача (руб)"),
		escapeCsvField("Чистая прибыль (руб)"),
		escapeCsvField("Маржинальность (%)"),
	].join(";");

	const rows = appointments.map((a) => {
		return [
			escapeCsvField(a.id),
			escapeCsvField(a.dateIso),
			escapeCsvField(a.patientName),
			escapeCsvField(a.medicalCardNumber),
			escapeCsvField(a.doctorName),
			escapeCsvField(a.chairName),
			escapeCsvField(DEPARTMENT_TITLES_RU[a.department]),
			escapeCsvField(a.serviceName),
			escapeCsvField(a.order804nCode ?? "—"),
			escapeCsvField(a.toothCode ?? "—"),
			a.durationMinutes,
			(a.revenueKop / 100).toFixed(2),
			(a.materialCostKop / 100).toFixed(2),
			(a.labCostKop / 100).toFixed(2),
			(a.doctorPayKop / 100).toFixed(2),
			(a.netProfitKop / 100).toFixed(2),
			`${a.marginPercent.toFixed(2)}%`,
		].join(";");
	});

	return "\uFEFF" + header + "\r\n" + rows.join("\r\n");
}

/**
 * Generates official printable HTML for A4 document format.
 */
export function renderClinicalPnlPrintA4Html(report: ClinicalPnlReport): string {
	const revenueRub = formatKopecksToRubles(report.totalRevenueKop);
	const matRub = formatKopecksToRubles(report.totalMaterialCostKop);
	const labRub = formatKopecksToRubles(report.totalLabCostKop);
	const docPayRub = formatKopecksToRubles(report.totalDoctorPayKop);
	const directCostsRub = formatKopecksToRubles(report.totalDirectCostsKop);
	const netProfitRub = formatKopecksToRubles(report.totalNetProfitKop);
	const avgProfitRub = formatKopecksToRubles(report.averageProfitPerAppointmentKop);
	const avgCheckRub = formatKopecksToRubles(report.averageCheckKop);

	const departmentRows = report.departments
		.map(
			(dep) => `
			<tr>
				<td><strong>${dep.departmentTitleRu}</strong></td>
				<td class="text-right">${dep.appointmentCount}</td>
				<td class="text-right">${formatKopecksToRubles(dep.totalRevenueKop)}</td>
				<td class="text-right">${formatKopecksToRubles(dep.totalMaterialCostKop)}</td>
				<td class="text-right">${formatKopecksToRubles(dep.totalLabCostKop)}</td>
				<td class="text-right">${formatKopecksToRubles(dep.totalDoctorPayKop)}</td>
				<td class="text-right ${dep.totalNetProfitKop >= 0 ? "profit-pos" : "profit-neg"}">
					<strong>${formatKopecksToRubles(dep.totalNetProfitKop)}</strong>
				</td>
				<td class="text-right"><strong>${dep.marginPercent.toFixed(1)}%</strong></td>
				<td class="text-right">${dep.revenueSharePercent.toFixed(1)}%</td>
			</tr>`
		)
		.join("");

	const doctorRows = report.doctorRankings
		.slice(0, 10)
		.map(
			(doc) => `
			<tr>
				<td class="text-center font-bold">${doc.rank}</td>
				<td><strong>${doc.doctorName}</strong><br><small class="text-muted">${doc.specialtyRu}</small></td>
				<td class="text-right">${doc.appointmentCount}</td>
				<td class="text-right">${formatKopecksToRubles(doc.totalRevenueKop)}</td>
				<td class="text-right ${doc.totalNetProfitKop >= 0 ? "profit-pos" : "profit-neg"}">
					<strong>${formatKopecksToRubles(doc.totalNetProfitKop)}</strong>
				</td>
				<td class="text-right"><strong>${doc.marginPercent.toFixed(1)}%</strong></td>
				<td class="text-right">${formatKopecksToRubles(doc.hourlyNetProfitKop)}/ч</td>
			</tr>`
		)
		.join("");

	const chairRows = report.chairRankings
		.map(
			(ch) => `
			<tr>
				<td class="text-center font-bold">${ch.rank}</td>
				<td><strong>${ch.chairName}</strong></td>
				<td class="text-right">${ch.appointmentCount}</td>
				<td class="text-right">${ch.utilizationHours.toFixed(1)} ч</td>
				<td class="text-right">${formatKopecksToRubles(ch.totalRevenueKop)}</td>
				<td class="text-right ${ch.totalNetProfitKop >= 0 ? "profit-pos" : "profit-neg"}">
					<strong>${formatKopecksToRubles(ch.totalNetProfitKop)}</strong>
				</td>
				<td class="text-right"><strong>${ch.marginPercent.toFixed(1)}%</strong></td>
				<td class="text-right">${formatKopecksToRubles(ch.averageProfitPerHourKop)}/ч</td>
			</tr>`
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Клинический P&L и Маржинальность — ${report.periodStartIso} — ${report.periodEndIso}</title>
	<style>
		@page {
			size: A4 portrait;
			margin: 12mm 15mm;
		}
		* {
			box-sizing: border-box;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
		}
		body {
			margin: 0;
			padding: 0;
			color: #0f172a;
			background: #ffffff;
			font-size: 10pt;
			line-height: 1.35;
		}
		.doc-header {
			border-bottom: 2px solid #0f766e;
			padding-bottom: 10px;
			margin-bottom: 14px;
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
		}
		.doc-title {
			font-size: 16pt;
			font-weight: 800;
			color: #0f766e;
			margin: 0 0 4px 0;
		}
		.doc-subtitle {
			font-size: 9pt;
			color: #475569;
		}
		.clinic-badge {
			text-align: right;
			font-size: 9pt;
			color: #334155;
		}
		.kpi-grid {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 8px;
			margin-bottom: 14px;
		}
		.kpi-card {
			border: 1px solid #cbd5e1;
			border-radius: 6px;
			padding: 8px 10px;
			background: #f8fafc;
		}
		.kpi-card.highlight {
			background: #f0fdfa;
			border-color: #0d9488;
		}
		.kpi-label {
			font-size: 7.5pt;
			text-transform: uppercase;
			color: #64748b;
			font-weight: 700;
			margin-bottom: 2px;
		}
		.kpi-value {
			font-size: 12pt;
			font-weight: 800;
			color: #0f172a;
		}
		.kpi-card.highlight .kpi-value {
			color: #0f766e;
		}
		.kpi-sub {
			font-size: 7.5pt;
			color: #64748b;
			margin-top: 2px;
		}
		.section-title {
			font-size: 11pt;
			font-weight: 700;
			color: #1e293b;
			margin: 14px 0 6px 0;
			border-left: 3px solid #0f766e;
			padding-left: 6px;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 12px;
			font-size: 8.5pt;
		}
		th, td {
			border: 1px solid #cbd5e1;
			padding: 5px 6px;
		}
		th {
			background: #f1f5f9;
			font-weight: 700;
			color: #334155;
			text-align: left;
		}
		.text-right { text-align: right; }
		.text-center { text-align: center; }
		.font-bold { font-weight: 700; }
		.text-muted { color: #64748b; }
		.profit-pos { color: #047857; }
		.profit-neg { color: #b91c1c; }
		.two-col-grid {
			display: grid;
			grid-template-columns: 1.1fr 0.9fr;
			gap: 12px;
		}
		.cost-box {
			background: #f8fafc;
			border: 1px solid #e2e8f0;
			border-radius: 6px;
			padding: 8px 10px;
			margin-bottom: 12px;
			font-size: 8.5pt;
		}
		.cost-bar-container {
			display: flex;
			height: 14px;
			border-radius: 4px;
			overflow: hidden;
			margin: 6px 0;
		}
		.cost-seg-mat { background: #f59e0b; }
		.cost-seg-lab { background: #8b5cf6; }
		.cost-seg-doc { background: #3b82f6; }
		.cost-seg-profit { background: #10b981; }
		.legend-grid {
			display: flex;
			justify-content: space-between;
			font-size: 7.5pt;
			color: #475569;
		}
		.legend-item { display: flex; align-items: center; gap: 4px; }
		.legend-dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
		.signatures {
			margin-top: 24px;
			display: flex;
			justify-content: space-between;
			font-size: 9pt;
		}
		.sig-block {
			width: 30%;
			border-top: 1px solid #475569;
			padding-top: 4px;
			text-align: center;
		}
		@media print {
			body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
		}
	</style>
</head>
<body>
	<div class="doc-header">
		<div>
			<h1 class="doc-title">КЛИНИЧЕСКИЙ P&L И МАРЖИНАЛЬНОСТЬ ПРИЕМОВ</h1>
			<div class="doc-subtitle">
				Формула: Чистая прибыль = Выручка − Списания BOM − Себестоимость ЗТЛ − ФОТ Врача
			</div>
		</div>
		<div class="clinic-badge">
			<strong>${report.clinicName}</strong><br>
			Период: <strong>${report.periodStartIso} — ${report.periodEndIso}</strong><br>
			Дата создания: ${new Date(report.generatedAtIso).toLocaleString("ru-RU")}
		</div>
	</div>

	<div class="kpi-grid">
		<div class="kpi-card">
			<div class="kpi-label">Выручка (Gross)</div>
			<div class="kpi-value">${revenueRub}</div>
			<div class="kpi-sub">${report.totalAppointments} приемов · ср. чек ${avgCheckRub}</div>
		</div>
		<div class="kpi-card">
			<div class="kpi-label">Прямые расходы</div>
			<div class="kpi-value">${directCostsRub}</div>
			<div class="kpi-sub">BOM: ${matRub} · ЗТЛ: ${labRub} · ФОТ: ${docPayRub}</div>
		</div>
		<div class="kpi-card highlight">
			<div class="kpi-label">Чистая прибыль клиники</div>
			<div class="kpi-value">${netProfitRub}</div>
			<div class="kpi-sub">Ср. прибыль на прием: ${avgProfitRub}</div>
		</div>
		<div class="kpi-card highlight">
			<div class="kpi-label">Рентабельность (Margin)</div>
			<div class="kpi-value">${report.overallMarginPercent.toFixed(1)}%</div>
			<div class="kpi-sub">От общей выручки клиники</div>
		</div>
	</div>

	<div class="cost-box">
		<strong>Структура клинической себестоимости:</strong>
		<div class="cost-bar-container">
			<div class="cost-seg-mat" style="width: ${Math.max(1, report.costStructure.materialSharePercent)}%" title="Материалы BOM"></div>
			<div class="cost-seg-lab" style="width: ${Math.max(1, report.costStructure.labSharePercent)}%" title="ЗТЛ"></div>
			<div class="cost-seg-doc" style="width: ${Math.max(1, report.costStructure.doctorPaySharePercent)}%" title="ФОТ Врачей"></div>
			<div class="cost-seg-profit" style="width: ${Math.max(1, Math.max(0, report.costStructure.netProfitSharePercent))}%" title="Чистая прибыль"></div>
		</div>
		<div class="legend-grid">
			<div class="legend-item"><span class="legend-dot cost-seg-mat"></span> Материалы: ${matRub} (${report.costStructure.materialSharePercent.toFixed(1)}%)</div>
			<div class="legend-item"><span class="legend-dot cost-seg-lab"></span> ЗТЛ: ${labRub} (${report.costStructure.labSharePercent.toFixed(1)}%)</div>
			<div class="legend-item"><span class="legend-dot cost-seg-doc"></span> ФОТ Врачей: ${docPayRub} (${report.costStructure.doctorPaySharePercent.toFixed(1)}%)</div>
			<div class="legend-item"><span class="legend-dot cost-seg-profit"></span> Чистая маржа: ${netProfitRub} (${report.costStructure.netProfitSharePercent.toFixed(1)}%)</div>
		</div>
	</div>

	<div class="section-title">1. Маржинальность по клиническим направлениям</div>
	<table>
		<thead>
			<tr>
				<th>Направление</th>
				<th class="text-right">Приемов</th>
				<th class="text-right">Выручка</th>
				<th class="text-right">BOM</th>
				<th class="text-right">ЗТЛ</th>
				<th class="text-right">ФОТ</th>
				<th class="text-right">Чистая прибыль</th>
				<th class="text-right">Маржа %</th>
				<th class="text-right">Доля</th>
			</tr>
		</thead>
		<tbody>
			${departmentRows}
		</tbody>
	</table>

	<div class="two-col-grid">
		<div>
			<div class="section-title">2. Топ врачей по чистой прибыли</div>
			<table>
				<thead>
					<tr>
						<th class="text-center">#</th>
						<th>Врач</th>
						<th class="text-right">Приемов</th>
						<th class="text-right">Выручка</th>
						<th class="text-right">Прибыль</th>
						<th class="text-right">Маржа %</th>
						<th class="text-right">₽/час</th>
					</tr>
				</thead>
				<tbody>
					${doctorRows}
				</tbody>
			</table>
		</div>

		<div>
			<div class="section-title">3. Рентабельность установок (кресел)</div>
			<table>
				<thead>
					<tr>
						<th class="text-center">#</th>
						<th>Кресло</th>
						<th class="text-right">Приемов</th>
						<th class="text-right">Часы</th>
						<th class="text-right">Выручка</th>
						<th class="text-right">Прибыль</th>
						<th class="text-right">Маржа %</th>
						<th class="text-right">₽/час</th>
					</tr>
				</thead>
				<tbody>
					${chairRows}
				</tbody>
			</table>
		</div>
	</div>

	<div class="signatures">
		<div class="sig-block">
			Главный врач<br><br>
			________________ / Барабаш С.В. /
		</div>
		<div class="sig-block">
			Главный бухгалтер<br><br>
			________________ / Смирнова Е.А. /
		</div>
		<div class="sig-block">
			Генеральный директор<br><br>
			________________ / Денте Холдинг /
		</div>
	</div>
</body>
</html>`;
}

/**
 * Realistic clinical sample appointments dataset for demo, tests, and preview.
 */
export const SAMPLE_CLINICAL_PNL_APPOINTMENTS: readonly ClinicalAppointmentPnlItem[] = [
	{
		id: "pnl-app-001",
		dateIso: "2026-08-03",
		patientName: "Барабаш Сергей Владимирович",
		medicalCardNumber: "043/у-2026/102",
		doctorId: "doc-kovalev",
		doctorName: "Д-р Ковалев Игорь Олегович",
		doctorSpecialtyRu: "Хирург-имплантолог",
		chairId: "chair-1",
		chairName: "Кабинет 1 (Planmeca Compact)",
		department: "surgery",
		serviceName: "Установка дентального имплантата Straumann BLX Roxolid SLA",
		order804nCode: "A16.07.054.001",
		toothCode: "36",
		durationMinutes: 60,
		revenueKop: 6500000, // 65,000 ₽
		materialCostKop: 1950000, // 19,500 ₽ (BOM: имплантат, формирователь, мембрана, шовный)
		labCostKop: 0,
		doctorPayKop: 1300000, // 13,000 ₽ (20% piece-rate)
		notes: "Установка без осложнений, первичная стабильность 45 Нсм",
	},
	{
		id: "pnl-app-002",
		dateIso: "2026-08-04",
		patientName: "Смирнова Екатерина Васильевна",
		medicalCardNumber: "043/у-2026/891",
		doctorId: "doc-vasiliev",
		doctorName: "Д-р Васильев Максим Сергеевич",
		doctorSpecialtyRu: "Стоматолог-ортопед",
		chairId: "chair-2",
		chairName: "Кабинет 2 (Kavo Primus 1058)",
		department: "orthopedics",
		serviceName: "Коронка из диоксида циркония CAD/CAM Prettau на винтовой фиксации",
		order804nCode: "A16.07.004.002",
		toothCode: "24",
		durationMinutes: 90,
		revenueKop: 3200000, // 32,000 ₽
		materialCostKop: 240000, // 2,400 ₽ (BOM: слепочная масса, сканмаркер)
		labCostKop: 850000, // 8,500 ₽ (ЗТЛ: фрезеровка циркония + абатмент)
		doctorPayKop: 640000, // 6,400 ₽ (20% piece-rate)
		notes: "Сдача коронки, окклюзионная коррекция, контакт идеальный",
	},
	{
		id: "pnl-app-003",
		dateIso: "2026-08-05",
		patientName: "Кузнецов Дмитрий Анатольевич",
		medicalCardNumber: "043/у-2026/742",
		doctorId: "doc-smirnov",
		doctorName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialtyRu: "Стоматолог-терапевт",
		chairId: "chair-3",
		chairName: "Кабинет 3 (Sirona Intego)",
		department: "therapy",
		serviceName: "Эндодонтическое лечение 3-канального моляра под микроскопом (Reciproc + Calamus)",
		order804nCode: "A16.07.002.001",
		toothCode: "16",
		durationMinutes: 90,
		revenueKop: 2100000, // 21,000 ₽
		materialCostKop: 320000, // 3,200 ₽ (BOM: коффердам, файлы Mtwo, AH Plus, гуттаперча)
		labCostKop: 0,
		doctorPayKop: 525000, // 5,250 ₽ (25% piece-rate)
		notes: "Каналы пройдены до апекса, 3D обтурация Calamus",
	},
	{
		id: "pnl-app-004",
		dateIso: "2026-08-06",
		patientName: "Морозов Артем Дмитриевич",
		medicalCardNumber: "043/у-2026/419",
		doctorId: "doc-morozova",
		doctorName: "Д-р Морозова Анна Дмитриевна",
		doctorSpecialtyRu: "Стоматолог-ортодонт",
		chairId: "chair-4",
		chairName: "Кабинет 4 (Adec 500)",
		department: "orthodontics",
		serviceName: "Фиксация самолигирующей брекет-системы Damon Q2 (одна челюсть)",
		order804nCode: "A16.07.048",
		toothCode: "17-27",
		durationMinutes: 90,
		revenueKop: 7500000, // 75,000 ₽
		materialCostKop: 2800000, // 28,000 ₽ (BOM: набор брекетов Damon Q2, дуга CuNiTi, бонд)
		labCostKop: 0,
		doctorPayKop: 1500000, // 15,000 ₽ (20% piece-rate)
		notes: "Прямая фиксация верхнего зубного ряда, дуга 0.014 CuNiTi",
	},
	{
		id: "pnl-app-005",
		dateIso: "2026-08-07",
		patientName: "Иванова Мария Сергеевна",
		medicalCardNumber: "043/у-2026/904",
		doctorId: "doc-lebedeva",
		doctorName: "Д-р Лебедева Ольга Викторовна",
		doctorSpecialtyRu: "Врач-гигиенист",
		chairId: "chair-3",
		chairName: "Кабинет 3 (Sirona Intego)",
		department: "hygiene",
		serviceName: "Комплексная гигиена полости рта: УЗ-скейлинг + Air-Flow Plus + реминерализация",
		order804nCode: "A16.07.051",
		toothCode: "18-48",
		durationMinutes: 60,
		revenueKop: 850000, // 8,500 ₽
		materialCostKop: 95000, // 950 ₽ (BOM: порошок эритритол, насадка EMS, гель фтор)
		labCostKop: 0,
		doctorPayKop: 255000, // 2,550 ₽ (30% piece-rate)
		notes: "Сняты поддесневые отложения, полировка Clinpro",
	},
	{
		id: "pnl-app-006",
		dateIso: "2026-08-10",
		patientName: "Сидорова Светлана Сергеевна",
		medicalCardNumber: "043/у-2026/512",
		doctorId: "doc-smirnov",
		doctorName: "Д-р Смирнов Алексей Петрович",
		doctorSpecialtyRu: "Стоматолог-терапевт",
		chairId: "chair-1",
		chairName: "Кабинет 1 (Planmeca Compact)",
		department: "therapy",
		serviceName: "Эстетическая реставрация фронтального зуба композитом Estelite Asteria",
		order804nCode: "A16.07.003",
		toothCode: "11",
		durationMinutes: 60,
		revenueKop: 1150000, // 11,500 ₽
		materialCostKop: 140000, // 1,400 ₽ (BOM: композит, полировочные диски Sof-Lex)
		labCostKop: 0,
		doctorPayKop: 287500, // 2,875 ₽ (25% piece-rate)
		notes: "Восстановление режущего края и мамелонов зуба 11",
	},
	{
		id: "pnl-app-007",
		dateIso: "2026-08-11",
		patientName: "Козлов Константин Константинович",
		medicalCardNumber: "043/у-2026/202",
		doctorId: "doc-vasiliev",
		doctorName: "Д-р Васильев Максим Сергеевич",
		doctorSpecialtyRu: "Стоматолог-ортопед",
		chairId: "chair-2",
		chairName: "Кабинет 2 (Kavo Primus 1058)",
		department: "orthopedics",
		serviceName: "Керамический винир E.max Press с индивидуальной раскраской",
		order804nCode: "A16.07.004.001",
		toothCode: "21",
		durationMinutes: 60,
		revenueKop: 3800000, // 38,000 ₽
		materialCostKop: 260000, // 2,600 ₽ (BOM: Variolink Esthetic, силан, травление)
		labCostKop: 1100000, // 11,000 ₽ (ЗТЛ: прессованная керамика E.max)
		doctorPayKop: 760000, // 7,600 ₽ (20% piece-rate)
		notes: "Фиксация на Variolink Neutral под коффердамом",
	},
	{
		id: "pnl-app-008",
		dateIso: "2026-08-12",
		patientName: "Попов Артем Сергеевич",
		medicalCardNumber: "043/у-2026/651",
		doctorId: "doc-kovalev",
		doctorName: "Д-р Ковалев Игорь Олегович",
		doctorSpecialtyRu: "Хирург-имплантолог",
		chairId: "chair-1",
		chairName: "Кабинет 1 (Planmeca Compact)",
		department: "surgery",
		serviceName: "Атравматичное удаление ретинированного дистопированного зуба мудрости с PRF",
		order804nCode: "A16.07.001.002",
		toothCode: "48",
		durationMinutes: 45,
		revenueKop: 1200000, // 12,000 ₽
		materialCostKop: 150000, // 1,500 ₽ (BOM: PRF пробирки, шовный Vicryl 4-0, губка)
		labCostKop: 0,
		doctorPayKop: 300000, // 3,000 ₽ (25% piece-rate)
		notes: "Сегментация бором, лунка аугментирована PRF фибрином",
	},
];
