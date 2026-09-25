/**
 * DENTE Dental CRM — Analytics Doctor Local / Offline Computation.
 *
 * Computes dashboard indicators from local store / IndexedDB when offline.
 */

import type {
	AnalyticsDashboardData,
	ChairUtilizationPoint,
	CohortLtvPoint,
	DoctorProfitabilityRow,
	NamedValuePoint,
} from "./analyticsDoctorMetricTypes.js";

/**
 * Вычисляет показатели дашборда из локального состояния (IndexedDB / store) при
 * отсутствии сети или сбое бэкенда (500). Обеспечивает плавную офлайн-деградацию
 * без красных экранов ошибки.
 */
export function computeLocalAnalyticsData(
	dashboard: Record<string, unknown> | null | undefined,
	dateRange = "all",
): AnalyticsDashboardData {
	if (!dashboard || typeof dashboard !== "object") {
		return {
			kpis: {
				totalPatients: 0,
				totalRevenue: 0,
				totalAppointments: 0,
				avgRevenuePerPatient: 0,
				cashRevenue: 0,
				cardRevenue: 0,
				cashlessRevenue: 0,
				advanceRevenue: 0,
				bonusRevenue: 0,
				averageCheck: 0,
				primaryPatientsCount: 0,
				repeatPatientsCount: 0,
				chairOccupancyRatePercent: 0,
			},
			cohortLtvJson: [],
			planFunnelJson: [],
			chairUtilizationJson: [],
			doctorProfitabilityJson: [],
			isEmpty: true,
		};
	}

	const rawPatients = Array.isArray(dashboard.patients)
		? (dashboard.patients as Record<string, unknown>[])
		: [];
	const rawAppointments = Array.isArray(dashboard.appointments)
		? (dashboard.appointments as Record<string, unknown>[])
		: [];
	const rawPayments = Array.isArray(dashboard.payments)
		? (dashboard.payments as Record<string, unknown>[])
		: [];
	const rawVisits = Array.isArray(dashboard.visits)
		? (dashboard.visits as Record<string, unknown>[])
		: [];
	const rawTreatmentItems = Array.isArray(dashboard.treatmentItems)
		? (dashboard.treatmentItems as Record<string, unknown>[])
		: [];
	const rawLabOrders = Array.isArray(dashboard.labOrders)
		? (dashboard.labOrders as Record<string, unknown>[])
		: [];
	const chairs = Array.isArray(dashboard.chairs)
		? (dashboard.chairs as Record<string, unknown>[])
		: [];
	const staff = Array.isArray(dashboard.staff)
		? (dashboard.staff as Record<string, unknown>[])
		: [];
	const planScenarios = Array.isArray(dashboard.treatmentPlanScenarios)
		? (dashboard.treatmentPlanScenarios as Record<string, unknown>[])
		: [];

	// Date range cutoff calculation
	const now = new Date();
	let cutoffDate: Date | null = null;
	if (dateRange === "today") {
		cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
	} else if (dateRange === "week") {
		cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	} else if (dateRange === "month" || dateRange === "last_month") {
		cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	} else if (dateRange === "quarter" || dateRange === "last_3_months") {
		cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
	} else if (dateRange === "year" || dateRange === "this_year") {
		cutoffDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
	}

	const filterByDate = (dateStr: unknown): boolean => {
		if (!cutoffDate) return true;
		if (typeof dateStr !== "string" || !dateStr) return true;
		const d = new Date(dateStr);
		return !Number.isNaN(d.getTime()) && d >= cutoffDate;
	};

	const appointments = rawAppointments.filter((a) =>
		filterByDate(a.startsAt || a.createdAt),
	);
	const payments = rawPayments.filter((p) =>
		filterByDate(p.createdAt || p.paidAt),
	);
	const visits = rawVisits.filter((v) => filterByDate(v.createdAt || v.date));
	const patients = rawPatients;

	// 1. KPIs & 54-FZ Revenue Breakdown
	const totalPatients = patients.length;
	const totalAppointments = appointments.length;
	let totalRevenue = 0;
	let cashRevenue = 0;
	let cardRevenue = 0;
	let cashlessRevenue = 0;
	let advanceRevenue = 0;
	let sbpRevenue = 0;
	let bankTransferRevenue = 0;
	let insuranceRevenue = 0;
	let bonusRevenue = 0;

	for (const p of payments) {
		const amt =
			typeof p.amount === "number" && Number.isFinite(p.amount) ? p.amount : 0;
		if (amt <= 0) continue;
		totalRevenue += amt;
		const method = String(p.method || p.paymentMethod || "card").toLowerCase();
		if (method === "cash") {
			cashRevenue += amt;
		} else if (
			method === "card" ||
			method === "bank_card" ||
			method === "terminal"
		) {
			cardRevenue += amt;
		} else if (
			method === "advance" ||
			method === "deposit" ||
			method === "patient_deposit" ||
			method === "family_wallet"
		) {
			advanceRevenue += amt;
		} else if (method === "online" || method === "sbp") {
			cashlessRevenue += amt;
			sbpRevenue += amt;
		} else if (method === "bank_transfer") {
			cashlessRevenue += amt;
			bankTransferRevenue += amt;
		} else if (method === "insurance") {
			cashlessRevenue += amt;
			insuranceRevenue += amt;
		} else if (method === "bonus" || method === "points" || method === "loyalty") {
			bonusRevenue += amt;
		} else {
			cashlessRevenue += amt;
		}
	}

	if (totalRevenue === 0) {
		for (const v of visits) {
			const amt =
				typeof v.totalRub === "number" && Number.isFinite(v.totalRub)
					? v.totalRub
					: 0;
			if (amt > 0) {
				totalRevenue += amt;
				cashlessRevenue += amt;
			}
		}
	}

	const avgRevenuePerPatient =
		totalPatients > 0 ? Math.round(totalRevenue / totalPatients) : 0;
	const averageCheck =
		totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments) : 0;

	// Primary vs Repeat Patients calculation
	const patientApptCount = new Map<string, number>();
	for (const a of rawAppointments) {
		const patId = String(a.patientId || "");
		if (patId) {
			patientApptCount.set(patId, (patientApptCount.get(patId) || 0) + 1);
		}
	}
	let primaryPatientsCount = 0;
	let repeatPatientsCount = 0;
	for (const p of patients) {
		const pId = String(p.id || "");
		const appts = patientApptCount.get(pId) || 0;
		if (appts <= 1) {
			primaryPatientsCount += 1;
		} else {
			repeatPatientsCount += 1;
		}
	}

	// 2. Воронка планов лечения
	const draftEntry = { name: "Черновик", count: 0, fill: "#94a3b8" };
	const planStatuses: Record<
		string,
		{ name: string; count: number; fill: string }
	> = {
		draft: draftEntry,
		in_progress: { name: "В работе", count: 0, fill: "#38bdf8" },
		agreed: { name: "Согласован", count: 0, fill: "#0d9488" },
		completed: { name: "Завершён", count: 0, fill: "#10b981" },
		declined: { name: "Отклонён", count: 0, fill: "#f43f5e" },
	};
	for (const item of planScenarios) {
		const st = typeof item.status === "string" ? item.status : "draft";
		const target = planStatuses[st];
		if (target) {
			target.count += 1;
		} else {
			draftEntry.count += 1;
		}
	}
	const planFunnelJson: NamedValuePoint[] = Object.values(planStatuses).map(
		(entry) => ({
			name: entry.name,
			value: entry.count,
			fill: entry.fill,
		}),
	);

	// 3. Загруженность кресел
	let totalOccupiedMinsAllChairs = 0;
	let totalAvailableMinsAllChairs = 0;
	const chairUtilizationJson: ChairUtilizationPoint[] = chairs.map((c, idx) => {
		const chairId = typeof c.id === "string" ? c.id : null;
		const chairName =
			typeof c.name === "string" && c.name.trim().length > 0
				? c.name.trim()
				: `Кресло ${idx + 1}`;
		const chairAppts = appointments.filter((a) => a.chairId === chairId);
		const occupiedMinutes = chairAppts.length * 60;
		const availableMinutes = 30 * 12 * 60;
		totalOccupiedMinsAllChairs += occupiedMinutes;
		totalAvailableMinsAllChairs += availableMinutes;
		const utilizationPercent =
			availableMinutes > 0
				? Math.min(100, Math.round((occupiedMinutes / availableMinutes) * 100))
				: 0;
		const colors = ["#0d9488", "#06b6d4", "#10b981", "#6366f1", "#f59e0b"];
		return {
			chairId,
			name: chairName,
			value: chairAppts.length,
			occupiedMinutes,
			availableMinutes,
			utilizationPercent,
			fill: colors[idx % colors.length] || "#0d9488",
		};
	});

	const chairOccupancyRatePercent =
		totalAvailableMinsAllChairs > 0
			? Math.min(
					100,
					Math.round(
						(totalOccupiedMinsAllChairs / totalAvailableMinsAllChairs) * 100,
					),
				)
			: 0;

	// 4. Эффективность врачей (честный расчёт выручки каждого врача по визитам и нарядам)
	const doctors = staff.filter((s) => s.role === "doctor" || !s.role);
	const doctorList =
		doctors.length > 0 ? doctors : [{ id: "doc-1", name: "Дежурный врач" }];

	// Map appointment -> doctor
	const apptToDocMap = new Map<string, string>();
	for (const a of appointments) {
		if (a.id && a.doctorUserId) {
			apptToDocMap.set(String(a.id), String(a.doctorUserId));
		}
	}

	// Map visit -> doctor & revenue
	const visitToDocMap = new Map<string, string>();
	const doctorVisitRevMap = new Map<string, number>();
	for (const v of visits) {
		const vId = String(v.id || "");
		const dId =
			String(v.doctorUserId || "") ||
			(v.appointmentId ? apptToDocMap.get(String(v.appointmentId)) : "") ||
			"";
		if (vId && dId) {
			visitToDocMap.set(vId, dId);
		}
		const vAmt =
			typeof v.totalRub === "number" && Number.isFinite(v.totalRub)
				? v.totalRub
				: 0;
		if (dId && vAmt > 0) {
			doctorVisitRevMap.set(dId, (doctorVisitRevMap.get(dId) || 0) + vAmt);
		}
	}

	// Map payment -> doctor revenue
	const doctorRevenueMap = new Map<string, number>();
	for (const p of payments) {
		const amt =
			typeof p.amount === "number" && Number.isFinite(p.amount) ? p.amount : 0;
		if (amt <= 0) continue;
		const dId =
			String(p.doctorUserId || "") ||
			(p.visitId ? visitToDocMap.get(String(p.visitId)) : "") ||
			(p.appointmentId ? apptToDocMap.get(String(p.appointmentId)) : "") ||
			"";
		if (dId) {
			doctorRevenueMap.set(dId, (doctorRevenueMap.get(dId) || 0) + amt);
		}
	}

	// Fallback to visit totals if payments have no explicit doctor association
	if (doctorRevenueMap.size === 0 && doctorVisitRevMap.size > 0) {
		for (const [dId, amt] of doctorVisitRevMap.entries()) {
			doctorRevenueMap.set(dId, amt);
		}
	}

	// 4b. Выработка врачей по номенклатуре 804н (услуги) и сданным нарядам ЗТЛ
	const doctorServicesMap = new Map<string, number>();
	for (const item of rawTreatmentItems) {
		const vId = String(item.visitId || "");
		const dId =
			String(item.plannedDoctorUserId || item.doctorUserId || "") ||
			(vId ? visitToDocMap.get(vId) : "") ||
			"";
		if (dId) {
			doctorServicesMap.set(dId, (doctorServicesMap.get(dId) || 0) + 1);
		}
	}
	for (const v of visits) {
		const vId = String(v.id || "");
		const dId = visitToDocMap.get(vId);
		if (dId && Array.isArray(v.services)) {
			doctorServicesMap.set(dId, (doctorServicesMap.get(dId) || 0) + v.services.length);
		} else if (dId && Array.isArray(v.treatmentItems)) {
			doctorServicesMap.set(dId, (doctorServicesMap.get(dId) || 0) + v.treatmentItems.length);
		}
	}

	const doctorLabMap = new Map<string, number>();
	const doctorLabCostMap = new Map<string, number>();
	for (const lab of rawLabOrders) {
		const dId = String(lab.doctorId || lab.doctorUserId || "");
		const status = String(lab.status || "").toLowerCase();
		if (
			dId &&
			(!status ||
				status === "completed" ||
				status === "received" ||
				status === "installed" ||
				status === "done")
		) {
			doctorLabMap.set(dId, (doctorLabMap.get(dId) || 0) + 1);
			const price =
				typeof lab.priceRub === "number" && Number.isFinite(lab.priceRub)
					? lab.priceRub
					: typeof lab.price === "number" && Number.isFinite(lab.price)
						? lab.price
						: 0;
			if (price > 0) {
				doctorLabCostMap.set(dId, (doctorLabCostMap.get(dId) || 0) + price);
			}
		}
	}

	const doctorProfitabilityJson: DoctorProfitabilityRow[] = doctorList.map(
		(doc) => {
			const docId = typeof doc.id === "string" ? doc.id : "doc-1";
			const docName =
				typeof doc.name === "string" && doc.name.trim().length > 0
					? doc.name.trim()
					: "Врач";
			const docAppts = appointments.filter((a) => a.doctorUserId === docId);
			const completedCount = docAppts.filter(
				(a) => a.status === "completed" || a.status === "done",
			).length;
			const completionRate =
				docAppts.length > 0
					? Math.round((completedCount / docAppts.length) * 100)
					: null;
			const docRev = doctorRevenueMap.get(docId) || 0;
			const services804nCount = doctorServicesMap.get(docId) || 0;
			const labOrdersCount = doctorLabMap.get(docId) || 0;
			const labOrdersCostRub = doctorLabCostMap.get(docId) || 0;
			// Зарплатная комиссия врача Т-51: если по врачу есть списания ЗТЛ,
			// расчетная база = max(0, выручка - ЗТЛ) * 25% (стандартная сдельная ставка Т-51)
			const doctorPayrollRub = docRev > 0
				? Math.round(Math.max(0, docRev - labOrdersCostRub) * 0.25)
				: 0;
			const clinicMarginRub = docRev > 0
				? docRev - labOrdersCostRub - doctorPayrollRub
				: 0;
			const margin = docRev > 0
				? Math.round((clinicMarginRub / docRev) * 100)
				: null;

			return {
				doctorId: docId,
				name: docName,
				revenue: docRev,
				appointmentsCount: docAppts.length,
				avgTicketRub:
					completedCount > 0
						? Math.round(docRev / completedCount)
						: docAppts.length > 0
							? Math.round(docRev / docAppts.length)
							: 0,
				workedHours: docAppts.length * 1,
				hourlyRevenueRub:
					docAppts.length > 0 ? Math.round(docRev / docAppts.length) : 0,
				margin,
				completionRate,
				services804nCount,
				labOrdersCount,
				labOrdersCostRub,
				doctorPayrollRub,
				clinicMarginRub,
			};
		},
	);

	// 5. Когорты LTV
	const cohortMap = new Map<string, number>();
	for (const p of payments) {
		const dateStr = typeof p.createdAt === "string" ? p.createdAt : "";
		const date = new Date(dateStr);
		const monthKey = Number.isNaN(date.getTime())
			? "2026-08"
			: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
		const prev = cohortMap.get(monthKey) || 0;
		cohortMap.set(
			monthKey,
			prev + (typeof p.amount === "number" ? p.amount : 0),
		);
	}
	const cohortLtvJson: CohortLtvPoint[] = Array.from(cohortMap.entries()).map(
		([cohort, amt]) => ({
			cohort,
			"Month 12": amt,
		}),
	);

	const isEmpty =
		totalPatients === 0 &&
		totalAppointments === 0 &&
		totalRevenue === 0 &&
		planScenarios.length === 0 &&
		doctorProfitabilityJson.every(
			(d) =>
				d.revenue === 0 &&
				(d.appointmentsCount ?? 0) === 0 &&
				(d.services804nCount ?? 0) === 0 &&
				(d.labOrdersCount ?? 0) === 0,
		);

	return {
		kpis: {
			totalPatients,
			totalRevenue,
			totalAppointments,
			avgRevenuePerPatient,
			cashRevenue,
			cardRevenue,
			cashlessRevenue,
			advanceRevenue,
			sbpRevenue,
			bankTransferRevenue,
			insuranceRevenue,
			bonusRevenue,
			averageCheck,
			primaryPatientsCount,
			repeatPatientsCount,
			chairOccupancyRatePercent,
		},
		cohortLtvJson,
		planFunnelJson,
		chairUtilizationJson,
		doctorProfitabilityJson,
		isEmpty,
	};
}
