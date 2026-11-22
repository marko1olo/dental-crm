/**
 * doctorMyEarningsHandler.ts — Обработчик Fastify API для мобильного кошелька врача
 * GET /api/doctor/my-earnings и GET /api/v1/doctor/my-earnings.
 *
 * Соответствие:
 * - Мандат 8e: Автономия врача и финансовый суверенитет.
 * - Мандат 8n: Целочисленные копейки (amountKopecks, BIGINT) без float-дрифта.
 * - Мандат 8be: Строгая типизация, Zod safeParse, ноль any.
 * - Мандат 8wy: 100% реальный PostgreSQL без синтетических подделок.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { doctorCommissions, pricelistDoctorPayrolls, users } from "../db/schema.js";
import { calculateDoctorCommissionKopecks, calculateDoctorPeriodPayroll, kopecksToRubles } from "@dental/shared";
import { requirePayoutAccess } from "./billingRoutes/payoutAccessService.js";
import { resolveDoctorUserUuid } from "./payrollSettlementDbQueries.js";
import {
	fetchDoctorPayrollDataset,
	SPECIALTY_TITLES,
} from "./doctorPayrollDbQueries.js";

const doctorMyEarningsQuerySchema = z.object({
	doctorId: z.string().optional(),
	date: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
});

export async function handleGetDoctorMyEarnings(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const payoutAccess = await requirePayoutAccess(request, reply);
	if (!payoutAccess) return;

	const parsed = doctorMyEarningsQuerySchema.safeParse(request.query);
	const q = parsed.success ? parsed.data : {};
	const orgId = payoutAccess.organizationId;
	let rawDocId = q.doctorId || payoutAccess.userId || "";

	if (payoutAccess.scope === "own") {
		const resolvedTargetId = await resolveDoctorUserUuid(orgId, rawDocId, payoutAccess.userId);
		if (resolvedTargetId && resolvedTargetId !== payoutAccess.userId) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "payroll.read",
				role: payoutAccess.role,
				message: "Врач может просматривать начисления только по собственному кошельку",
			});
		}
		rawDocId = payoutAccess.userId;
	}

	const resolvedDocId = await resolveDoctorUserUuid(orgId, rawDocId, payoutAccess.userId ?? undefined);
	if (!resolvedDocId) {
		return reply.code(404).send({ error: "DoctorNotFound", message: "Врач не найден" });
	}

	const [docUser] = await db
		.select({
			id: users.id,
			fullName: users.fullName,
			specialties: users.specialties,
		})
		.from(users)
		.where(and(eq(users.id, resolvedDocId), eq(users.organizationId, orgId)))
		.limit(1);

	const doctorName = docUser?.fullName || "Врач-стоматолог";
	const specId = Array.isArray(docUser?.specialties) && docUser.specialties[0]
		? String(docUser.specialties[0])
		: "therapy";
	const doctorSpecialty = SPECIALTY_TITLES[specId] || "Врач-стоматолог";

	const commRecords = await db
		.select({
			serviceCategory: doctorCommissions.serviceCategory,
			commissionPct: doctorCommissions.commissionPct,
			commissionPercent: doctorCommissions.commissionPercent,
			effectiveFrom: doctorCommissions.effectiveFrom,
		})
		.from(doctorCommissions)
		.where(
			and(
				eq(doctorCommissions.organizationId, orgId),
				eq(doctorCommissions.userId, resolvedDocId),
				eq(doctorCommissions.isActive, true),
			),
		)
		.orderBy(sql`${doctorCommissions.effectiveFrom} desc`);

	type AllowedSpecialtyCat = "therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric";
	const categoryRatesMap: Partial<Record<AllowedSpecialtyCat, number>> = {};
	let basePercent = 25;

	for (const comm of commRecords) {
		const val = Number(comm.commissionPercent || comm.commissionPct);
		if (!Number.isFinite(val) || val <= 0) continue;

		if (comm.serviceCategory) {
			const catKey = comm.serviceCategory.toLowerCase() as AllowedSpecialtyCat;
			if (categoryRatesMap[catKey] === undefined) {
				categoryRatesMap[catKey] = val;
			}
		} else if (basePercent === 25) {
			basePercent = val;
		}
	}

	if (basePercent === 25 && commRecords.length > 0) {
		const firstVal = Number(commRecords[0]?.commissionPercent || commRecords[0]?.commissionPct);
		if (Number.isFinite(firstVal) && firstVal > 0) {
			basePercent = firstVal;
		}
	}

	const pricelistRows = await db
		.select({
			serviceCode: pricelistDoctorPayrolls.serviceCode,
			serviceName: pricelistDoctorPayrolls.serviceName,
			doctorPayrollPercent: pricelistDoctorPayrolls.doctorPayrollPercent,
		})
		.from(pricelistDoctorPayrolls)
		.where(eq(pricelistDoctorPayrolls.organizationId, orgId));

	const pricelistPercentByCode = new Map<string, number>();
	const pricelistPercentByName = new Map<string, number>();
	for (const pr of pricelistRows) {
		const pct = Number(pr.doctorPayrollPercent);
		if (Number.isFinite(pct) && pct > 0) {
			if (pr.serviceCode) {
				pricelistPercentByCode.set(pr.serviceCode.trim().toLowerCase(), pct);
			}
			if (pr.serviceName) {
				pricelistPercentByName.set(pr.serviceName.trim().toLowerCase(), pct);
			}
		}
	}

	function resolveServiceCommissionPercent(category: string, serviceName?: string, serviceCode?: string): number {
		if (serviceCode && pricelistPercentByCode.has(serviceCode.trim().toLowerCase())) {
			return pricelistPercentByCode.get(serviceCode.trim().toLowerCase())!;
		}
		if (serviceName && pricelistPercentByName.has(serviceName.trim().toLowerCase())) {
			return pricelistPercentByName.get(serviceName.trim().toLowerCase())!;
		}
		const catKey = category.toLowerCase() as AllowedSpecialtyCat;
		if (categoryRatesMap[catKey] !== undefined) {
			return categoryRatesMap[catKey]!;
		}
		return basePercent;
	}

	let fromStr: string;
	let toStr: string;
	if (q.date) {
		const cleanDate = q.date.slice(0, 10);
		fromStr = cleanDate;
		toStr = cleanDate;
	} else {
		fromStr = q.from || q.startDate || new Date().toISOString().slice(0, 10);
		toStr = q.to || q.endDate || new Date().toISOString().slice(0, 10);
	}

	const fromDate = new Date(`${fromStr.slice(0, 10)}T00:00:00.000Z`);
	const toDate = new Date(`${toStr.slice(0, 10)}T23:59:59.999Z`);

	const { shiftsCount, orders, completedServices, refundDeductions } = await fetchDoctorPayrollDataset({
		orgId,
		resolvedDocId,
		fromStr,
		toStr,
		fromDate,
		toDate,
	});

	const payrollResult = calculateDoctorPeriodPayroll({
		doctorId: resolvedDocId,
		doctorName,
		specialtyId: specId,
		periodStartIso: fromStr.slice(0, 10),
		periodEndIso: toStr.slice(0, 10),
		services: completedServices,
		customBasePercentage: basePercent,
		categoryRates: categoryRatesMap,
		payoutModel: "percentage",
		chairRentalKop: 0,
		advancePayoutKop: 0,
		taxRegime: "employee",
		refundDeductions,
	});

	// Группировка по назначениям / визитам для appointments
	type ApptAccumulator = {
		appointmentId: string;
		visitId: string | null;
		patientId: string;
		patientFullName: string;
		cardNumber: string;
		startsAtIso: string;
		endsAtIso: string;
		status: string;
		paymentStatus: "paid" | "partial" | "unpaid";
		grossRevenueKop: number;
		labCostKop: number;
		materialsCostKop: number;
		netBaseKop: number;
		doctorEarnedKop: number;
		services: Array<{
			id: string;
			nameRu: string;
			category: string;
			categoryRu: string;
			priceRub: number;
			priceKop: number;
			labCostRub: number;
			labCostKop: number;
			materialCostRub: number;
			materialCostKop: number;
			commissionPercent: number;
			earnedRub: number;
			earnedKop: number;
			isPaid: boolean;
		}>;
		labOrders: Array<{
			id: string;
			toothFdi: string | null;
			material: string | null;
			status: string;
			statusRu: string;
			costRub: number;
			costKop: number;
			dueDate: string | null;
		}>;
	};

	const apptMap = new Map<string, ApptAccumulator>();

	for (const ord of orders) {
		const apptKey = ord.orderNumber;
		let appt = apptMap.get(apptKey);
		if (!appt) {
			appt = {
				appointmentId: ord.id,
				visitId: ord.id,
				patientId: ord.id,
				patientFullName: ord.patientName,
				cardNumber: ord.medicalCardNumber,
				startsAtIso: ord.startsAtIso || `${ord.dateIso}T00:00:00.000Z`,
				endsAtIso: ord.endsAtIso || `${ord.dateIso}T00:00:00.000Z`,
				status: "completed",
				paymentStatus: ord.isPaid54Fz ? "paid" : "unpaid",
				grossRevenueKop: 0,
				labCostKop: 0,
				materialsCostKop: 0,
				netBaseKop: 0,
				doctorEarnedKop: 0,
				services: [],
				labOrders: [],
			};
			apptMap.set(apptKey, appt);
		}

		const itemCommPercent = resolveServiceCommissionPercent(ord.category, ord.serviceNameRu);
		const effectivePaidKop = Math.max(0, ord.paidKopecks || 0);
		const netBaseItemKop = effectivePaidKop > 0
			? Math.max(0, effectivePaidKop - ord.labCostKopecks - ord.materialCostKopecks)
			: 0;
		const earnedItemKop = effectivePaidKop > 0
			? calculateDoctorCommissionKopecks(netBaseItemKop, itemCommPercent)
			: 0;

		appt.grossRevenueKop += ord.grossKopecks;
		appt.labCostKop += ord.labCostKopecks;
		appt.materialsCostKop += ord.materialCostKopecks;
		appt.netBaseKop += netBaseItemKop;
		appt.doctorEarnedKop += earnedItemKop;

		appt.services.push({
			id: ord.id,
			nameRu: ord.serviceNameRu,
			category: ord.category,
			categoryRu: ord.categoryLabelRu,
			priceRub: kopecksToRubles(ord.grossKopecks),
			priceKop: ord.grossKopecks,
			labCostRub: kopecksToRubles(ord.labCostKopecks),
			labCostKop: ord.labCostKopecks,
			materialCostRub: kopecksToRubles(ord.materialCostKopecks),
			materialCostKop: ord.materialCostKopecks,
			commissionPercent: itemCommPercent,
			earnedRub: kopecksToRubles(earnedItemKop),
			earnedKop: earnedItemKop,
			isPaid: ord.isPaid54Fz,
		});

		if (ord.labCostKopecks > 0) {
			appt.labOrders.push({
				id: `${ord.id}-lab`,
				toothFdi: null,
				material: null,
				status: "completed",
				statusRu: "Готов",
				costRub: kopecksToRubles(ord.labCostKopecks),
				costKop: ord.labCostKopecks,
				dueDate: ord.dateIso,
			});
		}
	}

	const appointments = Array.from(apptMap.values()).map((a) => ({
		...a,
		grossRevenueRub: kopecksToRubles(a.grossRevenueKop),
		labCostRub: kopecksToRubles(a.labCostKop),
		materialsCostRub: kopecksToRubles(a.materialsCostKop),
		netBaseRub: kopecksToRubles(a.netBaseKop),
		doctorEarnedRub: kopecksToRubles(a.doctorEarnedKop),
	}));

	// Категориальная разбивка specialtyBreakdown
	type CatAccumulator = {
		category: string;
		categoryRu: string;
		commissionPercent: number;
		grossRevenueKop: number;
		labDeductionsKop: number;
		netBaseKop: number;
		doctorEarnedKop: number;
		servicesCount: number;
	};

	const catMap = new Map<string, CatAccumulator>();
	for (const ord of orders) {
		const itemCommPercent = resolveServiceCommissionPercent(ord.category, ord.serviceNameRu);
		let cat = catMap.get(ord.category);
		if (!cat) {
			cat = {
				category: ord.category,
				categoryRu: ord.categoryLabelRu,
				commissionPercent: itemCommPercent,
				grossRevenueKop: 0,
				labDeductionsKop: 0,
				netBaseKop: 0,
				doctorEarnedKop: 0,
				servicesCount: 0,
			};
			catMap.set(ord.category, cat);
		}
		const effectivePaidKop = Math.max(0, ord.paidKopecks || 0);
		const netBase = effectivePaidKop > 0
			? Math.max(0, effectivePaidKop - ord.labCostKopecks - ord.materialCostKopecks)
			: 0;
		const earned = effectivePaidKop > 0
			? calculateDoctorCommissionKopecks(netBase, itemCommPercent)
			: 0;

		cat.grossRevenueKop += ord.grossKopecks;
		cat.labDeductionsKop += ord.labCostKopecks;
		cat.netBaseKop += netBase;
		cat.doctorEarnedKop += earned;
		cat.servicesCount += 1;
	}

	const specialtyBreakdown = Array.from(catMap.values()).map((c) => ({
		category: c.category,
		categoryRu: c.categoryRu,
		commissionPercent: c.commissionPercent,
		grossRevenueRub: kopecksToRubles(c.grossRevenueKop),
		labDeductionsRub: kopecksToRubles(c.labDeductionsKop),
		netBaseRub: kopecksToRubles(c.netBaseKop),
		doctorEarnedRub: kopecksToRubles(c.doctorEarnedKop),
		servicesCount: c.servicesCount,
	}));

	const totalGrossRevenueKop = payrollResult.totalGrossRevenueKop;
	const totalLabDeductionsKop = payrollResult.totalLabDeductionsKop;
	const totalMaterialDeductionsKop = payrollResult.totalMaterialDeductionsKop;
	const netBaseRevenueKop = payrollResult.totalNetBaseKop;
	const totalDoctorEarnedKop = payrollResult.grossPayoutBeforeTaxKop;

	const paidOrders = orders.filter((o) => o.paidKopecks > 0);
	const unpaidOrders = orders.filter((o) => o.paidKopecks <= 0);
	const paidAmountKop = paidOrders.reduce((acc, o) => acc + o.paidKopecks, 0);
	const unpaidAmountKop = unpaidOrders.reduce((acc, o) => acc + Math.max(0, o.grossKopecks - o.paidKopecks), 0);

	const summary = {
		totalGrossRevenueRub: kopecksToRubles(totalGrossRevenueKop),
		totalGrossRevenueKop,
		totalLabDeductionsRub: kopecksToRubles(totalLabDeductionsKop),
		totalLabDeductionsKop,
		totalMaterialDeductionsRub: kopecksToRubles(totalMaterialDeductionsKop),
		totalMaterialDeductionsKop,
		netBaseRevenueRub: kopecksToRubles(netBaseRevenueKop),
		netBaseRevenueKop,
		totalDoctorEarnedRub: kopecksToRubles(totalDoctorEarnedKop),
		totalDoctorEarnedKop,
		averageCommissionPercent: (netBaseRevenueKop > 0 ? Math.round((totalDoctorEarnedKop / netBaseRevenueKop) * 100) : basePercent),
		completedAppointmentsCount: appointments.length,
		inChairAppointmentsCount: 0,
		totalAppointmentsCount: appointments.length,
		totalServicesCount: orders.length,
		paidAmountRub: kopecksToRubles(paidAmountKop),
		unpaidAmountRub: kopecksToRubles(unpaidAmountKop),
		paymentReconciliationStatus: (unpaidOrders.length === 0 ? "fully_reconciled" : "pending_cashier") as
			| "fully_reconciled"
			| "discrepancy_found"
			| "pending_cashier",
	};

	return reply.send({
		doctorId: resolvedDocId,
		doctorName,
		doctorSpecialty,
		period: {
			from: fromStr,
			to: toStr,
			date: q.date || fromStr,
		},
		summary,
		specialtyBreakdown,
		appointments,
		formulaExplanationRu: "Начислено = (Выручка − ЗТЛ − Материалы) × Ставка врача",
	});
}
