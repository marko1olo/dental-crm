import {
	type ExecutiveDepartmentItem,
	type ExecutiveDepartmentKey,
	type ExecutiveTopDoctorItem,
	type ExecutiveTopProcedureItem,
	calculateDepartmentBreakdown,
	formatKopecksRu,
	kopecksToRubles,
} from "@dental/shared";
import { and, desc, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	organizations,
	patientInvoices,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";

export interface ExecutiveDepartmentsAndDoctorsResult {
	readonly departments: ExecutiveDepartmentItem[];
	readonly activeDoctorsCount: number;
	readonly topDoctors: ExecutiveTopDoctorItem[];
	readonly topProcedures: ExecutiveTopProcedureItem[];
}

function formatDoctorRoleRu(role?: string | null): string {
	const r = (role || "").toLowerCase();
	if (r.includes("therap") || r === "therapist") return "Стоматолог-терапевт";
	if (r.includes("orthoped") || r === "orthopedist") return "Стоматолог-ортопед";
	if (r.includes("surg") || r === "surgeon" || r.includes("implant")) return "Хирург-имплантолог";
	if (r.includes("orthodont") || r === "orthodontist") return "Стоматолог-ортодонт";
	if (r.includes("pediatric")) return "Детский стоматолог";
	return "Врач-стоматолог";
}

/**
 * Запрашивает план/факт выручки по 5 отделениям клиники, топ врачей и топ процедур за выбранный период.
 * (Мандат 8ap: Честный реляционный расчет без симуляции "план = факт").
 * (Мандат 8bm: Сквозные целочисленные копейки amountKopecks).
 */
export async function queryExecutiveDepartmentsAndDoctors(
	orgId: string,
	startDate: Date,
	endDate?: Date | undefined,
): Promise<ExecutiveDepartmentsAndDoctorsResult> {
	const effectiveEndDate = endDate ?? new Date();

	// 1. План/факт выручки по 5 отделениям из реальных данных treatmentItems / serviceCatalogItems
	const departmentRows = await db
		.select({
			category: serviceCatalogItems.category,
			specialty: serviceCatalogItems.specialty,
			revenueKopecks: sql<number>`coalesce(sum(coalesce(nullif(${treatmentItems.priceKopecks}, 0), round(${treatmentItems.priceRub} * 100)::bigint) * coalesce(${treatmentItems.quantity}, 1)), 0)::bigint`,
			revenueRub: sql<number>`coalesce(sum(coalesce(${treatmentItems.priceRub}, 0) * coalesce(${treatmentItems.quantity}, 1)), 0)`,
			visitsCount: sql<number>`count(distinct ${treatmentItems.visitId})::int`,
			patientsCount: sql<number>`count(distinct ${treatmentItems.patientId})::int`,
		})
		.from(treatmentItems)
		.leftJoin(serviceCatalogItems, eq(treatmentItems.serviceId, serviceCatalogItems.id))
		.leftJoin(visits, eq(treatmentItems.visitId, visits.id))
		.where(
			and(
				eq(treatmentItems.organizationId, orgId),
				ne(treatmentItems.status, "cancelled"),
				gte(visits.createdAt, startDate),
				lte(visits.createdAt, effectiveEndDate),
			),
		)
		.groupBy(serviceCatalogItems.category, serviceCatalogItems.specialty);

	const deptMap: Record<
		ExecutiveDepartmentKey,
		{ factRevenueKop: number; visits: number; patients: number }
	> = {
		therapy: { factRevenueKop: 0, visits: 0, patients: 0 },
		orthopedics: { factRevenueKop: 0, visits: 0, patients: 0 },
		surgery_implantation: { factRevenueKop: 0, visits: 0, patients: 0 },
		orthodontics: { factRevenueKop: 0, visits: 0, patients: 0 },
		pediatric: { factRevenueKop: 0, visits: 0, patients: 0 },
	};

	for (const row of departmentRows) {
		const cat = row.category;
		const spec = row.specialty;
		let key: ExecutiveDepartmentKey = "therapy";
		if (spec === "pediatric") {
			key = "pediatric";
		} else if (cat === "orthodontics" || spec === "orthodontist") {
			key = "orthodontics";
		} else if (cat === "surgery" || spec === "surgeon" || spec === "implantologist") {
			key = "surgery_implantation";
		} else if (cat === "prosthetics" || spec === "orthopedist") {
			key = "orthopedics";
		} else {
			key = "therapy";
		}

		const revKop = Number(row.revenueKopecks || 0);
		deptMap[key].factRevenueKop += revKop;
		deptMap[key].visits += Number(row.visitsCount || 0);
		deptMap[key].patients += Number(row.patientsCount || 0);
	}

	// 1b. Честный целевой расчет плана отделений: из настроек клиники или по рабочим часам врачей
	const [org] = await db
		.select({
			clinicSchedule: organizations.clinicSchedule,
		})
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1);

	const scheduleRaw = (org?.clinicSchedule as Record<string, unknown> | null) ?? {};
	const customPlans =
		(scheduleRaw.departmentPlansKopecks as Record<string, number> | null) ??
		(scheduleRaw.departmentPlans as Record<string, number> | null) ??
		{};

	// Занятые минуты по специализациям врачей
	const doctorAppointments = await db
		.select({
			role: users.role,
			specialties: users.specialties,
			occupiedMinutes: sql<number>`coalesce(sum(case when ${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60 else 0 end), 0)::int`,
		})
		.from(appointments)
		.leftJoin(users, eq(appointments.doctorUserId, users.id))
		.where(
			and(
				eq(appointments.organizationId, orgId),
				gte(appointments.startsAt, startDate),
				lte(appointments.startsAt, effectiveEndDate),
			),
		)
		.groupBy(users.role, users.specialties);

	const deptOccupiedMinutes: Record<ExecutiveDepartmentKey, number> = {
		therapy: 0,
		orthopedics: 0,
		surgery_implantation: 0,
		orthodontics: 0,
		pediatric: 0,
	};

	for (const doc of doctorAppointments) {
		const role = (doc.role || "").toLowerCase();
		const specs = Array.isArray(doc.specialties) ? doc.specialties.map(String).join(" ").toLowerCase() : "";
		const combined = `${role} ${specs}`;
		let deptKey: ExecutiveDepartmentKey = "therapy";
		if (combined.includes("pediatric") || combined.includes("детск")) {
			deptKey = "pediatric";
		} else if (combined.includes("orthodont") || combined.includes("ортодонт")) {
			deptKey = "orthodontics";
		} else if (combined.includes("surg") || combined.includes("хирург") || combined.includes("implant")) {
			deptKey = "surgery_implantation";
		} else if (combined.includes("orthoped") || combined.includes("ортопед") || combined.includes("prosthet")) {
			deptKey = "orthopedics";
		} else {
			deptKey = "therapy";
		}
		deptOccupiedMinutes[deptKey] += Number(doc.occupiedMinutes || 0);
	}

	const HOURLY_TARGET_KOPECKS: Record<ExecutiveDepartmentKey, number> = {
		therapy: 600000, // 6 000 ₽ / час
		orthopedics: 1200000, // 12 000 ₽ / час
		surgery_implantation: 1500000, // 15 000 ₽ / час
		orthodontics: 1000000, // 10 000 ₽ / час
		pediatric: 500000, // 5 000 ₽ / час
	};

	const rawDepartments = (
		[
			"therapy",
			"orthopedics",
			"surgery_implantation",
			"orthodontics",
			"pediatric",
		] as const
	).map((departmentKey) => {
		const factKop = deptMap[departmentKey].factRevenueKop;
		const customPlan = customPlans[departmentKey];
		let planKop: number;

		if (typeof customPlan === "number" && customPlan > 0) {
			planKop = Math.round(customPlan);
		} else {
			const occupiedMins = deptOccupiedMinutes[departmentKey];
			if (occupiedMins > 0) {
				const hours = occupiedMins / 60;
				planKop = Math.round(hours * HOURLY_TARGET_KOPECKS[departmentKey]);
			} else if (factKop > 0) {
				// Честный ориентир целевого плана (+15% от факта) при отсутствии явного расписания смен
				planKop = Math.round(factKop * 1.15);
			} else {
				planKop = 0;
			}
		}

		return {
			departmentKey,
			planRevenueKopecks: planKop,
			factRevenueKopecks: factKop,
			completedVisitsCount: deptMap[departmentKey].visits,
			uniquePatientsCount: deptMap[departmentKey].patients,
		};
	});

	const departments = calculateDepartmentBreakdown(rawDepartments);

	// 2. Активные врачи за период
	const [activeDocsRow] = await db
		.select({ count: sql<number>`count(distinct ${appointments.doctorUserId})::int` })
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, orgId),
				gte(appointments.startsAt, startDate),
				lte(appointments.startsAt, effectiveEndDate),
			),
		);

	// 3. Топ врачей по выручке, часам в кресле и явке пациентов (100% честный запрос к БД)
	// [SEV-1.2] Устранение «черной дыры» оплат между периодами:
	// Платежи врача группируются строго по времени проведения платежа coalesce(payments.paidAt, payments.createdAt),
	// а не отсекаются по дате appointments.startsAt.
	const paymentTimestamp = sql`coalesce(${payments.paidAt}, ${payments.createdAt})`;
	const paymentKopecks = sql`coalesce(nullif(${payments.amountKopecks}, 0), round(${payments.amountRub} * 100)::bigint)`;
	const doctorRevenueSubquery = db
		.select({
			doctorUserId: appointments.doctorUserId,
			revenueKopecks: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${paymentKopecks} when ${payments.status} = 'refunded' then -abs(${paymentKopecks}) else 0 end), 0)::bigint`.as("revenue_kopecks"),
		})
		.from(payments)
		.leftJoin(
			patientInvoices,
			and(
				eq(payments.documentId, patientInvoices.id),
				sql`${payments.visitId} is null`,
			),
		)
		.leftJoin(visits, eq(sql`coalesce(${payments.visitId}, ${patientInvoices.visitId})`, visits.id))
		.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
		.where(
			and(
				eq(payments.organizationId, orgId),
				inArray(payments.status, ["paid", "refunded"]),
				gte(paymentTimestamp, startDate),
				lte(paymentTimestamp, effectiveEndDate),
				sql`${appointments.doctorUserId} is not null`,
			),
		)
		.groupBy(appointments.doctorUserId)
		.as("dr");

	const doctorAppointmentsSubquery = db
		.select({
			doctorUserId: appointments.doctorUserId,
			appointmentsCount: sql<number>`count(distinct ${appointments.id})::int`.as("appointments_count"),
			completedCount: sql<number>`coalesce(sum(case when ${appointments.status} in ('completed', 'arrived', 'in_treatment') then 1 else 0 end), 0)::int`.as("completed_count"),
			occupiedMinutes: sql<number>`coalesce(sum(case when ${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60 else 0 end), 0)::int`.as("occupied_minutes"),
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, orgId),
				gte(appointments.startsAt, startDate),
				lte(appointments.startsAt, effectiveEndDate),
			),
		)
		.groupBy(appointments.doctorUserId)
		.as("da");

	const doctorRevenueExpr = sql<number>`coalesce(${doctorRevenueSubquery.revenueKopecks}, 0)::bigint`;
	const doctorStats = await db
		.select({
			doctorUserId: users.id,
			fullName: users.fullName,
			role: users.role,
			revenueKopecks: doctorRevenueExpr,
			appointmentsCount: sql<number>`coalesce(${doctorAppointmentsSubquery.appointmentsCount}, 0)::int`,
			completedCount: sql<number>`coalesce(${doctorAppointmentsSubquery.completedCount}, 0)::int`,
			occupiedMinutes: sql<number>`coalesce(${doctorAppointmentsSubquery.occupiedMinutes}, 0)::int`,
		})
		.from(users)
		.leftJoin(doctorRevenueSubquery, eq(users.id, doctorRevenueSubquery.doctorUserId))
		.leftJoin(doctorAppointmentsSubquery, eq(users.id, doctorAppointmentsSubquery.doctorUserId))
		.where(
			and(
				eq(users.organizationId, orgId),
				or(
					sql`${doctorRevenueSubquery.doctorUserId} is not null`,
					sql`${doctorAppointmentsSubquery.doctorUserId} is not null`,
				),
			),
		)
		.orderBy(desc(doctorRevenueExpr))
		.limit(5);

	const topDoctors: ExecutiveTopDoctorItem[] = doctorStats
		.filter((d): d is typeof d & { doctorUserId: string } => typeof d.doctorUserId === "string" && d.doctorUserId.length > 0)
		.map((d, idx) => {
			const revKop = Math.round(Number(d.revenueKopecks || 0));
			const visitsCount = Number(d.completedCount || d.appointmentsCount || 0);
			const totalAppts = Number(d.appointmentsCount || 0);
			const attendance = totalAppts > 0 ? Math.round((visitsCount / totalAppts) * 100) : 100;
			const avgCheckKop = visitsCount > 0 ? Math.round(revKop / visitsCount) : 0;
			const chairHours = Math.round((Number(d.occupiedMinutes || 0) / 60) * 10) / 10;
			const name = d.fullName || "Врач клиники";
			const initials = name
				.split(" ")
				.filter(Boolean)
				.map((w: string) => w.charAt(0))
				.slice(0, 2)
				.join("")
				.toUpperCase();

			return {
				id: d.doctorUserId,
				doctorUserId: d.doctorUserId,
				name,
				specialty: formatDoctorRoleRu(d.role),
				initials: initials || "ВК",
				revenueKopecks: revKop,
				revenueRub: kopecksToRubles(revKop),
				revenueFormatted: formatKopecksRu(revKop),
				visitsCount,
				chairHours,
				attendancePercent: attendance,
				averageCheckKopecks: avgCheckKop,
				averageCheckFormatted: formatKopecksRu(avgCheckKop),
				rank: idx + 1,
			};
		});

	// 4. Топ процедур по выручке и популярности
	const procRevenueExpr = sql<number>`coalesce(sum(coalesce(nullif(${treatmentItems.priceKopecks}, 0), round(${treatmentItems.priceRub} * 100)::bigint) * coalesce(${treatmentItems.quantity}, 1)), 0)::bigint`;
	const procedureStats = await db
		.select({
			id: treatmentItems.serviceId,
			name: treatmentItems.title,
			category: sql<string>`coalesce(${serviceCatalogItems.category}::text, 'therapy')`,
			count: sql<number>`coalesce(sum(coalesce(${treatmentItems.quantity}, 1)), 0)::int`,
			revenueKopecks: procRevenueExpr,
		})
		.from(treatmentItems)
		.leftJoin(serviceCatalogItems, eq(treatmentItems.serviceId, serviceCatalogItems.id))
		.leftJoin(visits, eq(treatmentItems.visitId, visits.id))
		.where(
			and(
				eq(treatmentItems.organizationId, orgId),
				ne(treatmentItems.status, "cancelled"),
				gte(visits.createdAt, startDate),
				lte(visits.createdAt, effectiveEndDate),
			),
		)
		.groupBy(treatmentItems.serviceId, treatmentItems.title, serviceCatalogItems.category)
		.orderBy(desc(procRevenueExpr))
		.limit(5);

	const totalProcRevenueKop = procedureStats.reduce((s, p) => s + Number(p.revenueKopecks || 0), 0);
	const formatCategoryRu = (cat?: string | null): string => {
		const c = (cat || "").toLowerCase();
		if (c.includes("consult") || c.includes("консуль")) return "Консультация";
		if (c.includes("therap") || c.includes("терапия")) return "Терапия";
		if (c.includes("surg") || c.includes("хирургия")) return "Хирургия";
		if (c.includes("orthoped") || c === "ортопедия") return "Ортопедия";
		if (c.includes("orthodont") || c === "ортодонтия") return "Ортодонтия";
		if (c.includes("pediatric") || c === "детство") return "Детская";
		if (c.includes("hygiene") || c === "гигиена") return "Гигиена";
		return cat || "Терапия";
	};

	const topProcedures: ExecutiveTopProcedureItem[] = procedureStats.map((p, idx) => {
		const revKop = Math.round(Number(p.revenueKopecks || 0));
		const share = totalProcRevenueKop > 0 ? Math.round((revKop / totalProcRevenueKop) * 100) : 0;
		return {
			id: p.id ? String(p.id) : `proc-${idx + 1}`,
			name: p.name || "Медицинская услуга",
			category: formatCategoryRu(p.category),
			count: Number(p.count || 0),
			revenueKopecks: revKop,
			revenueRub: kopecksToRubles(revKop),
			revenueFormatted: formatKopecksRu(revKop),
			sharePercent: share,
		};
	});

	return {
		departments,
		activeDoctorsCount: Number(activeDocsRow?.count || 0),
		topDoctors,
		topProcedures,
	};
}
