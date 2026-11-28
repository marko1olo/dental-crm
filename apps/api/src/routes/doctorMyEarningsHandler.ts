/**
 * doctorMyEarningsHandler.ts — Обработчик Fastify API для мобильного кошелька врача
 * GET /api/doctor/my-earnings и GET /api/v1/doctor/my-earnings.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { withTenantCtx } from "../db/rls.js";
import { doctorCommissions, pricelistDoctorPayrolls, users } from "../db/schema.js";
import {
	basisPointsFromPercent,
	calculateDoctorPeriodPayroll,
	computeEffectiveDoctorBaseAfterRefund,
	kopecksToRubles,
	percentageOfKopecks,
	resolveIdentItemBasis,
	type CashAdvanceAllocationPolicy,
	type DoctorCompletedServiceItem,
	type IdentSalaryModel,
	type Kopecks,
} from "@dental/shared";
import { requirePayoutAccess } from "./billingRoutes/payoutAccessService.js";
import { resolveDoctorUserUuid } from "./payrollSettlementDbQueries.js";
import {
	fetchDoctorPayrollDataset,
	SPECIALTY_TITLES,
} from "./doctorPayrollDbQueries.js";
import {
	formatDateIsoInTimeZone,
	resolveClinicTimeZone,
	resolveDoctorPayrollSettings,
	resolvePeriodDateBoundsInTimeZone,
} from "./payrollModules/payrollTypesAndQueries.js";

const doctorMyEarningsQuerySchema = z
	.object({
		doctorId: z.string().optional(),
		date: z.string().optional(),
		from: z.string().optional(),
		to: z.string().optional(),
		startDate: z.string().optional(),
		endDate: z.string().optional(),
		identSalaryModel: z.enum(["gross_before_discount", "net_proportional_discount", "net_doctor_bears_discount"]).optional(),
		cashAdvancePolicy: z.enum(["clinic_first", "doctor_first", "proportional"]).optional(),
		payoutModel: z.enum(["percentage", "chair_rental"]).optional(),
		chairRentalKop: z.coerce.number().int().min(0).optional(),
		taxRegime: z.enum(["employee", "self_employed"]).optional(),
	})
	.strict();

export async function handleGetDoctorMyEarnings(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const payoutAccess = await requirePayoutAccess(request, reply);
	if (!payoutAccess) return;

	const parsed = doctorMyEarningsQuerySchema.safeParse(request.query ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры запроса кошелька врача",
			details: parsed.error.format(),
		});
	}
	const q = parsed.data;
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

	const {
		fromStr,
		toStr,
		docUser,
		commRecords,
		pricelistRows,
		dataset: { shiftsCount, orders, completedServices, refundDeductions, unallocatedLabKop, priorDebtCarryOverKop },
	} = await withTenantCtx(orgId, async (tx) => {
		const clinicTimeZone = await resolveClinicTimeZone(tx, orgId);
		let resolvedFromStr: string;
		let resolvedToStr: string;
		if (q.date) {
			const cleanDate = q.date.slice(0, 10);
			resolvedFromStr = cleanDate;
			resolvedToStr = cleanDate;
		} else {
			const todayInZone = formatDateIsoInTimeZone(new Date(), clinicTimeZone);
			resolvedFromStr = q.from || q.startDate || todayInZone;
			resolvedToStr = q.to || q.endDate || todayInZone;
		}
		const { fromDate, toDate } = resolvePeriodDateBoundsInTimeZone(
			resolvedFromStr,
			resolvedToStr,
			clinicTimeZone,
		);

		const [u] = await tx
			.select({
				id: users.id,
				fullName: users.fullName,
				specialties: users.specialties,
				uiPreferences: users.uiPreferences,
			})
			.from(users)
			.where(and(eq(users.id, resolvedDocId), eq(users.organizationId, orgId)))
			.limit(1);

		const comms = await tx
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
					or(
						eq(doctorCommissions.userId, resolvedDocId),
						eq(doctorCommissions.doctorId, resolvedDocId),
					),
					eq(doctorCommissions.isActive, true),
				),
			)
			.orderBy(sql`${doctorCommissions.effectiveFrom} desc`);

		const prRows = await tx
			.select({
				serviceCode: pricelistDoctorPayrolls.serviceCode,
				serviceName: pricelistDoctorPayrolls.serviceName,
				doctorPayrollPercent: pricelistDoctorPayrolls.doctorPayrollPercent,
			})
			.from(pricelistDoctorPayrolls)
			.where(eq(pricelistDoctorPayrolls.organizationId, orgId));

		const dataset = await fetchDoctorPayrollDataset({
			orgId,
			resolvedDocId,
			fromStr: resolvedFromStr,
			toStr: resolvedToStr,
			fromDate,
			toDate,
			tx,
		});

		return {
			fromStr: resolvedFromStr,
			toStr: resolvedToStr,
			docUser: u,
			commRecords: comms,
			pricelistRows: prRows,
			dataset,
		};
	});

	const doctorName = docUser?.fullName || "Врач-стоматолог";
	const specId = Array.isArray(docUser?.specialties) && docUser.specialties[0]
		? String(docUser.specialties[0])
		: "therapy";
	const doctorSpecialty = SPECIALTY_TITLES[specId] || "Врач-стоматолог";

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
		const codeMatch = serviceCode ? pricelistPercentByCode.get(serviceCode.trim().toLowerCase()) : undefined;
		if (codeMatch !== undefined) {
			return codeMatch;
		}
		const nameMatch = serviceName ? pricelistPercentByName.get(serviceName.trim().toLowerCase()) : undefined;
		if (nameMatch !== undefined) {
			return nameMatch;
		}
		const catKey = category.toLowerCase() as AllowedSpecialtyCat;
		const categoryRate = categoryRatesMap[catKey];
		if (categoryRate !== undefined) {
			return categoryRate;
		}
		return basePercent;
	}

	const enrichedCompletedServices = completedServices.map((cs) => {
		const commPct = resolveServiceCommissionPercent(cs.category, cs.serviceNameRu, cs.serviceCode);
		return {
			...cs,
			customCommissionPercent: commPct,
		};
	});

	const doctorSettings = resolveDoctorPayrollSettings(docUser?.uiPreferences);
	const identSalaryModel: IdentSalaryModel = q.identSalaryModel ?? "net_proportional_discount";
	const cashAdvancePolicy: CashAdvanceAllocationPolicy = q.cashAdvancePolicy ?? "proportional";
	const resolvedPayoutModel: "percentage" | "chair_rental" =
		q.payoutModel ?? doctorSettings.payoutModel;
	const resolvedChairRentalKop =
		resolvedPayoutModel === "chair_rental"
			? (q.chairRentalKop ?? shiftsCount * doctorSettings.defaultShiftRateKop)
			: 0;
	const resolvedTaxRegime: "employee" | "self_employed" =
		q.taxRegime ??
		(q.payoutModel ? (resolvedPayoutModel === "chair_rental" ? "self_employed" : "employee") : doctorSettings.taxRegime);

	const payrollResult = calculateDoctorPeriodPayroll({
		doctorId: resolvedDocId,
		doctorName,
		specialtyId: specId,
		periodStartIso: fromStr.slice(0, 10),
		periodEndIso: toStr.slice(0, 10),
		services: enrichedCompletedServices,
		customBasePercentage: basePercent,
		categoryRates: categoryRatesMap,
		payoutModel: resolvedPayoutModel,
		chairRentalKop: resolvedChairRentalKop,
		advancePayoutKop: 0,
		taxRegime: resolvedTaxRegime,
		refundDeductions,
		unallocatedLabKop,
		identSalaryModel,
		cashAdvancePolicy,
		priorDebtCarryOverKop,
	});

	function computeOrderIdentItem(
		ord: (typeof orders)[number],
		itemCommPercent: number,
	): { grossKop: number; netBaseKop: number; earnedKop: number; effectivePaidKop: number } {
		const svcItem: DoctorCompletedServiceItem = {
			id: ord.id,
			dateIso: ord.dateIso,
			patientName: ord.patientName,
			medicalCardNumber: ord.medicalCardNumber,
			serviceNameRu: ord.serviceNameRu,
			category: (ord.category as DoctorCompletedServiceItem["category"]) || "therapy",
			grossRevenueKop: ord.grossKopecks,
			...(ord.listPriceKopecks !== undefined ? { listPriceKop: ord.listPriceKopecks } : {}),
			...(ord.discountKopecks !== undefined ? { discountKop: ord.discountKopecks } : {}),
			...(ord.salaryPriceKopecks !== undefined ? { salaryPriceKop: ord.salaryPriceKopecks } : {}),
			labCostKop: ord.labCostKopecks,
			materialCostKop: ord.materialCostKopecks,
			isPaid: ord.isPaid54Fz,
			paidAmountKop: ord.paidKopecks,
			actuallyPaidGrossKop: ord.paidKopecks,
		};
		const basis = resolveIdentItemBasis(svcItem, identSalaryModel, cashAdvancePolicy);
		if (!basis.shouldInclude) {
			return { grossKop: ord.grossKopecks, netBaseKop: 0, earnedKop: 0, effectivePaidKop: Math.max(0, ord.paidKopecks || 0) };
		}
		const effectiveGrossKop = computeEffectiveDoctorBaseAfterRefund({
			item: svcItem,
			identSalaryModel,
			cashAdvancePolicy,
			salaryPriceKop: basis.salaryBaseConfiguredKop,
			actualPaidKop: basis.actualPaidKop,
			refundKop: 0,
		});
		const netBaseKop = ord.category === "retail_hygiene"
			? effectiveGrossKop
			: Math.max(0, effectiveGrossKop - ord.labCostKopecks - ord.materialCostKopecks);
		const earnedKop = resolvedPayoutModel === "chair_rental"
			? netBaseKop
			: percentageOfKopecks(netBaseKop as Kopecks, basisPointsFromPercent(itemCommPercent));
		return {
			grossKop: effectiveGrossKop,
			netBaseKop,
			earnedKop,
			effectivePaidKop: Math.max(0, ord.paidKopecks || 0),
		};
	}

	// Группировка по реальным назначениям / визитам
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
		paidCount: number;
		totalCount: number;
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
			priceKopecks?: number | undefined;
			labCostRub: number;
			labCostKop: number;
			labCostKopecks?: number | undefined;
			materialCostRub: number;
			materialCostKop: number;
			materialCostKopecks?: number | undefined;
			commissionPercent: number;
			earnedRub: number;
			earnedKop: number;
			earnedKopecks?: number | undefined;
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
			costKopecks?: number | undefined;
			dueDate: string | null;
		}>;
	};

	const apptMap = new Map<string, ApptAccumulator>();

	for (const ord of orders) {
		const apptKey = ord.appointmentId || ord.visitId || ord.id;
		let appt = apptMap.get(apptKey);
		if (!appt) {
			appt = {
				appointmentId: ord.appointmentId || ord.id,
				visitId: ord.visitId || null,
				patientId: ord.patientId || "",
				patientFullName: ord.patientName,
				cardNumber: ord.medicalCardNumber,
				startsAtIso: ord.startsAtIso || `${ord.dateIso}T00:00:00.000Z`,
				endsAtIso: ord.endsAtIso || `${ord.dateIso}T00:00:00.000Z`,
				status: "completed",
				paymentStatus: ord.isPaid54Fz ? "paid" : "unpaid",
				paidCount: 0,
				totalCount: 0,
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

		const itemCommPercent = resolveServiceCommissionPercent(ord.category, ord.serviceNameRu, ord.serviceCode);
		const computed = computeOrderIdentItem(ord, itemCommPercent);
		const effectivePaidKop = computed.effectivePaidKop;
		const netBaseItemKop = computed.netBaseKop;
		const earnedItemKop = computed.earnedKop;

		appt.totalCount += 1;
		if (effectivePaidKop > 0) appt.paidCount += 1;
		appt.paymentStatus =
			appt.paidCount === appt.totalCount
				? "paid"
				: appt.paidCount > 0
					? "partial"
					: "unpaid";

		appt.grossRevenueKop += computed.grossKop;
		appt.labCostKop += ord.labCostKopecks;
		appt.materialsCostKop += ord.materialCostKopecks;
		appt.netBaseKop += netBaseItemKop;
		appt.doctorEarnedKop += earnedItemKop;

		appt.services.push({
			id: ord.id,
			nameRu: ord.serviceNameRu,
			category: ord.category,
			categoryRu: ord.categoryLabelRu,
			priceRub: kopecksToRubles(computed.grossKop),
			priceKop: computed.grossKop,
			priceKopecks: computed.grossKop,
			labCostRub: kopecksToRubles(ord.labCostKopecks),
			labCostKop: ord.labCostKopecks,
			labCostKopecks: ord.labCostKopecks,
			materialCostRub: kopecksToRubles(ord.materialCostKopecks),
			materialCostKop: ord.materialCostKopecks,
			materialCostKopecks: ord.materialCostKopecks,
			commissionPercent: itemCommPercent,
			earnedRub: kopecksToRubles(earnedItemKop),
			earnedKop: earnedItemKop,
			earnedKopecks: earnedItemKop,
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
				costKopecks: ord.labCostKopecks,
				dueDate: ord.dateIso,
			});
		}
	}

	const appointments = Array.from(apptMap.values()).map(({ paidCount: _pc, totalCount: _tc, ...a }) => ({
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
		const itemCommPercent = resolveServiceCommissionPercent(ord.category, ord.serviceNameRu, ord.serviceCode);
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
		const computed = computeOrderIdentItem(ord, itemCommPercent);
		cat.grossRevenueKop += computed.grossKop;
		cat.labDeductionsKop += ord.labCostKopecks;
		cat.netBaseKop += computed.netBaseKop;
		cat.doctorEarnedKop += computed.earnedKop;
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
		shiftsCount,
		identSalaryModel: payrollResult.identSalaryModel,
		cashAdvancePolicy: payrollResult.cashAdvancePolicy,
		payoutModel: payrollResult.payoutModel,
		chairRentalKop: payrollResult.chairRentalKop ?? 0,
		taxRegime: payrollResult.taxRegime,
		priorDebtCarryOverKop,
		priorDebtDeductedKop: payrollResult.priorDebtDeductedKop ?? 0,
		negativeCarryOverKop: payrollResult.negativeCarryOverKop ?? 0,
		netPayoutToDoctorKop: payrollResult.netPayoutToDoctorKop,
		totalGrossRevenueRub: kopecksToRubles(totalGrossRevenueKop),
		totalGrossRevenueKop,
		totalLabDeductionsRub: kopecksToRubles(totalLabDeductionsKop),
		totalLabDeductionsKop,
		totalMaterialDeductionsRub: kopecksToRubles(totalMaterialDeductionsKop),
		totalMaterialDeductionsKop,
		unallocatedLabKop: unallocatedLabKop ?? 0,
		totalRefundClawbackKop: payrollResult.totalRefundClawbackKop ?? 0,
		refundDeductionsCount: refundDeductions.length,
		netBaseRevenueRub: kopecksToRubles(netBaseRevenueKop),
		netBaseRevenueKop,
		totalDoctorEarnedRub: kopecksToRubles(totalDoctorEarnedKop),
		totalDoctorEarnedKop,
		averageCommissionPercent: (netBaseRevenueKop > 0
			? Number((BigInt(totalDoctorEarnedKop) * 100n + BigInt(netBaseRevenueKop) / 2n) / BigInt(netBaseRevenueKop))
			: basePercent),
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

	const debtFormulaSuffix = (payrollResult.priorDebtDeductedKop ?? 0) > 0
		? " − Долг прошлых периодов"
		: "";

	return reply.send({
		doctorId: resolvedDocId,
		doctorName,
		doctorSpecialty,
		identSalaryModel: payrollResult.identSalaryModel,
		cashAdvancePolicy: payrollResult.cashAdvancePolicy,
		payoutModel: payrollResult.payoutModel,
		chairRentalKop: payrollResult.chairRentalKop ?? 0,
		taxRegime: payrollResult.taxRegime,
		priorDebtCarryOverKop,
		priorDebtDeductedKop: payrollResult.priorDebtDeductedKop ?? 0,
		negativeCarryOverKop: payrollResult.negativeCarryOverKop ?? 0,
		netPayoutToDoctorKop: payrollResult.netPayoutToDoctorKop,
		period: {
			from: fromStr,
			to: toStr,
			date: q.date || fromStr,
		},
		summary,
		specialtyBreakdown,
		appointments,
		formulaExplanationRu: resolvedPayoutModel === "chair_rental"
			? `Начислено = (Выручка − ЗТЛ − Материалы) − Аренда кресла${debtFormulaSuffix}`
			: `Начислено = (Выручка − ЗТЛ − Материалы) × Ставка врача${debtFormulaSuffix}`,
	});
}
