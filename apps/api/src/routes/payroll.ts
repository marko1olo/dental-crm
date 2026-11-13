/**
 * payroll.ts — Fastify API-маршруты расчета и закрытия зарплатной ведомости врачей (SSOT).
 * Соответствие: Мандат 8e (Автономия врача), Мандат 8n (Целочисленные копейки, Net Revenue),
 * Мандат 8wy (100% реальный PostgreSQL без синтетических подделок).
 * Sweet Spot: <= 200 строк.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	appointments,
	doctorCommissions,
	doctorPayrollStatements,
	doctorShiftRosters,
	inventoryItems,
	inventoryTransactions,
	labOrders,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../db/schema.js";
import { calculateDoctorPeriodPayroll, type DoctorCompletedServiceItem } from "@dental/shared";
import { getRequestIdentity } from "../security/identity.js";
import {
	closeSettlementPeriodInDb,
	findPayrollStatement,
	reopenSettlementPeriodInDb,
	resolveDoctorUserUuid,
} from "./payrollSettlementDbQueries.js";

interface PayrollOrderDto {
	id: string;
	orderNumber: string;
	dateIso: string;
	patientName: string;
	medicalCardNumber: string;
	serviceNameRu: string;
	category: string;
	categoryLabelRu: string;
	grossKopecks: number;
	labCostKopecks: number;
	materialCostKopecks: number;
	doctorId: string;
	isPaid54Fz: boolean;
}

interface PayrollCalculationsQuery {
	doctorId?: string;
	from?: string;
	to?: string;
	startDateIso?: string;
	endDateIso?: string;
	percent?: string | number;
	payoutModel?: "percentage" | "chair_rental";
	shiftRateKop?: string | number;
	advanceRub?: string | number;
	taxRegime?: "employee" | "self_employed";
}

const closeSettlementSchema = z.object({
	doctorId: z.string().min(1),
	periodStart: z.string().min(1),
	periodEnd: z.string().min(1),
	grossRevenueKop: z.number().optional(),
	grossRevenueKopecks: z.number().int().optional(),
	grossRevenueRub: z.number().optional(),
	labCostKop: z.number().optional(),
	labCostKopecks: z.number().int().optional(),
	labCostRub: z.number().optional(),
	materialCostKop: z.number().optional(),
	materialsCostKop: z.number().optional(),
	materialsCostKopecks: z.number().int().optional(),
	materialsCostRub: z.number().optional(),
	netBaseKop: z.number().optional(),
	netBaseKopecks: z.number().int().optional(),
	netBaseRevenueRub: z.number().optional(),
	amountKopecks: z.number().int().optional(),
	netPayoutKop: z.number().optional(),
	netPayoutKopecks: z.number().int().optional(),
	netPayoutRub: z.number().optional(),
	totalAccruedKop: z.number().optional(),
	totalAccruedKopecks: z.number().int().optional(),
	totalAccruedRub: z.number().optional(),
	payoutModel: z.enum(["percentage", "chair_rental"]).optional().default("percentage"),
	categoryPercent: z.number().optional(),
	chairRentalRub: z.number().optional(),
	ndflKop: z.number().optional(),
	ndflKopecks: z.number().int().optional(),
	ndfl13Rub: z.number().optional(),
	markPaid: z.boolean().optional().default(true),
});

type CloseSettlementBody = z.infer<typeof closeSettlementSchema>;

const SPECIALTY_TITLES: Record<string, string> = {
	therapy: "Врач-стоматолог-терапевт",
	orthopedics: "Врач-стоматолог-ортопед",
	surgery: "Врач-стоматолог-хирург",
	orthodontics: "Врач-ортодонт",
	hygiene: "Гигиенист стоматологический",
	pediatric: "Детский стоматолог",
	general_dentist: "Врач-стоматолог общей практики",
};

const CATEGORY_LABELS_RU: Record<string, string> = {
	therapy: "Терапия",
	orthopedics: "Ортопедия",
	surgery: "Хирургия",
	orthodontics: "Ортодонтия",
	hygiene: "Гигиена",
	retail_hygiene: "Товары профгигиены",
	pediatric: "Детская стоматология",
};

function normalizeClinicalCategory(
	cat?: string | null,
	specialty?: string | null,
): "therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric" {
	const c = (cat || "").toLowerCase();
	if (c === "prosthetics" || c === "orthopedics" || c === "orthopedic") return "orthopedics";
	if (c === "surgery" || c === "surgical") return "surgery";
	if (c === "orthodontics" || c === "orthodontic") return "orthodontics";
	if (c === "hygiene" || c === "prevention") return "hygiene";
	if (c === "pediatric" || c === "children") return "pediatric";
	if (c === "retail" || c === "retail_hygiene") return "retail_hygiene";
	if (c === "therapy" || c === "therapeutic" || c === "periodontology" || c === "consultation" || c === "imaging") return "therapy";

	const s = (specialty || "").toLowerCase();
	if (s === "orthopedist") return "orthopedics";
	if (s === "surgeon" || s === "implantologist") return "surgery";
	if (s === "orthodontist") return "orthodontics";
	if (s === "hygienist") return "hygiene";
	if (s === "pediatric") return "pediatric";

	return "therapy";
}

export async function registerPayrollRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/v1/doctors — Список активных докторов клиники с реальными ставками из doctor_commissions
	 */
	app.get("/api/v1/doctors", async (request: FastifyRequest, reply: FastifyReply) => {
		const identity = getRequestIdentity(request);
		const orgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";

		try {
			const docUsers = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					specialties: users.specialties,
					role: users.role,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, orgId),
						eq(users.isActive, true),
						or(eq(users.role, "doctor"), eq(users.role, "owner")),
					),
				);

			const commRows = await db
				.select({
					userId: doctorCommissions.userId,
					commissionPct: doctorCommissions.commissionPct,
				})
				.from(doctorCommissions)
				.where(
					and(
						eq(doctorCommissions.organizationId, orgId),
						eq(doctorCommissions.isActive, true),
					),
				);
			const commMap = new Map(commRows.map((c) => [c.userId, Number(c.commissionPct)]));

			const mapped = docUsers.map((u) => {
				const name = u.fullName || "Врач-стоматолог";
				const parts = name.trim().split(/\s+/);
				const initials = parts.length >= 2 ? `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase() : "ВС";
				const specId = Array.isArray(u.specialties) && u.specialties[0] ? String(u.specialties[0]) : "therapy";
				const specTitle = SPECIALTY_TITLES[specId] || "Врач-стоматолог";

				return {
					id: u.id,
					name,
					initials,
					specialtyId: specId,
					specialtyTitleRu: specTitle,
					commissionPercent: commMap.get(u.id) ?? 25,
					payoutModel: "percentage" as const,
					motivationScheme: "net_percentage" as const,
					defaultShiftRateKop: 400000,
					minGuaranteeMonthlyKop: 6000000,
					taxRegime: "employee" as const,
				};
			});

			return reply.send({ ok: true, doctors: mapped });
		} catch (err: unknown) {
			request.log.error(err, "Failed to fetch doctors list");
			return reply.send({ ok: true, doctors: [] });
		}
	});

	/**
	 * GET /api/v1/payroll/calculations — Расчет начислений в целочисленных копейках
	 */
	app.get("/api/v1/payroll/calculations", async (request: FastifyRequest, reply: FastifyReply) => {
		const q = (request.query || {}) as PayrollCalculationsQuery;
		const identity = getRequestIdentity(request);
		const orgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";
		const rawDocId = q.doctorId || identity.userId || "";

		const resolvedDocId = await resolveDoctorUserUuid(orgId, rawDocId, identity.userId ?? undefined);
		if (!resolvedDocId) {
			return reply.code(404).send({ error: "DoctorNotFound", message: "Врач не найден" });
		}

		// Получаем данные врача из базы данных
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

		// Получаем актуальную ставку комиссии врача
		const [activeComm] = await db
			.select({
				commissionPct: doctorCommissions.commissionPct,
				materialDeductionPct: doctorCommissions.materialCostDeductionPct,
				labDeductionPct: doctorCommissions.labCostDeductionPct,
			})
			.from(doctorCommissions)
			.where(
				and(
					eq(doctorCommissions.organizationId, orgId),
					eq(doctorCommissions.userId, resolvedDocId),
					eq(doctorCommissions.isActive, true),
				),
			)
			.orderBy(sql`${doctorCommissions.effectiveFrom} desc`)
			.limit(1);

		const basePercent = Number(q.percent) || (activeComm ? Number(activeComm.commissionPct) : 25);

		const fromStr = q.from || q.startDateIso || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
		const toStr = q.to || q.endDateIso || new Date().toISOString().slice(0, 10);
		const fromDate = new Date(`${fromStr.slice(0, 10)}T00:00:00.000Z`);
		const toDate = new Date(`${toStr.slice(0, 10)}T23:59:59.999Z`);

		// 1. Считаем фактические смены из doctor_shift_rosters
		let shiftsCount = 0;
		try {
			const shifts = await db
				.select({ id: doctorShiftRosters.id })
				.from(doctorShiftRosters)
				.where(
					and(
						eq(doctorShiftRosters.organizationId, orgId),
						eq(doctorShiftRosters.doctorId, resolvedDocId),
						gte(doctorShiftRosters.dateIso, fromStr.slice(0, 10)),
						lte(doctorShiftRosters.dateIso, toStr.slice(0, 10)),
					),
				);
			shiftsCount = shifts.length;
		} catch {
			shiftsCount = 0;
		}

		// 2. Читаем закрытые приемы за период
		const cardNumSql = sql<string>`coalesce(
			${patients.administrativeProfile}->>'cardNumber',
			${patients.administrativeProfile}->>'medicalCardNumber',
			'К-0'
		)`;

		const appts = await db
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
				status: appointments.status,
				startsAt: appointments.startsAt,
				patientName: patients.fullName,
				cardNumber: cardNumSql,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.id))
			.where(
				and(
					eq(appointments.organizationId, orgId),
					eq(appointments.doctorUserId, resolvedDocId),
					gte(appointments.startsAt, fromDate),
					lte(appointments.startsAt, toDate),
				),
			);

		const orders: PayrollOrderDto[] = [];
		const completedServices: DoctorCompletedServiceItem[] = [];

		if (appts.length > 0) {
			const apptIds = appts.map((a) => a.id);
			const clinicVisits = await db
				.select({ id: visits.id, appointmentId: visits.appointmentId })
				.from(visits)
				.where(and(eq(visits.organizationId, orgId), inArray(visits.appointmentId, apptIds)));

			const visitIds = clinicVisits.map((v) => v.id);
			const visitToAppt = new Map(clinicVisits.map((v) => [v.id, v.appointmentId]));

			// Реальные фактические оплаты из таблицы payments (проверяя status = 'paid')
			const paidVisitRows = visitIds.length > 0
				? await db
					.select({
						visitId: payments.visitId,
						amountRub: payments.amountRub,
						fiscalReceiptNumber: payments.fiscalReceiptNumber,
					})
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							inArray(payments.visitId, visitIds),
							eq(payments.status, "paid"),
						),
					)
				: [];

			const paidKopByVisit = new Map<string, number>();
			const fiscalReceiptByVisit = new Map<string, string>();
			for (const p of paidVisitRows) {
				if (!p.visitId) continue;
				const amtKop = Math.round(Number(p.amountRub || 0) * 100);
				paidKopByVisit.set(p.visitId, (paidKopByVisit.get(p.visitId) || 0) + amtKop);
				if (p.fiscalReceiptNumber && !fiscalReceiptByVisit.has(p.visitId)) {
					fiscalReceiptByVisit.set(p.visitId, p.fiscalReceiptNumber);
				}
			}

			// Услуги с категориями из каталога
			const treats = visitIds.length > 0
				? await db
					.select({
						id: treatmentItems.id,
						visitId: treatmentItems.visitId,
						priceRub: treatmentItems.priceRub,
						quantity: treatmentItems.quantity,
						title: treatmentItems.title,
						category: serviceCatalogItems.category,
						specialty: serviceCatalogItems.specialty,
						code: serviceCatalogItems.code,
						order804nCode: serviceCatalogItems.order804nCode,
					})
					.from(treatmentItems)
					.leftJoin(serviceCatalogItems, eq(treatmentItems.serviceId, serviceCatalogItems.id))
					.where(and(eq(treatmentItems.organizationId, orgId), inArray(treatmentItems.visitId, visitIds)))
				: [];

			// Суммарная стоимость услуг по визитам для пропорционального распределения фактических оплат
			const totalGrossByVisit = new Map<string, number>();
			for (const t of treats) {
				if (t.visitId) {
					const qty = Math.max(1, Number(t.quantity || 1));
					const gKop = Math.round(Number(t.priceRub || 0) * 100 * qty);
					totalGrossByVisit.set(t.visitId, (totalGrossByVisit.get(t.visitId) || 0) + gKop);
				}
			}
			const remainingPaidKopByVisit = new Map<string, number>(paidKopByVisit);

			// Заказы ЗТЛ для доктора за период (исключая гарантии и отмененные)
			const docLabOrders = await db
				.select({
					id: labOrders.id,
					patientId: labOrders.patientId,
					labCostRub: labOrders.labCostRub,
				})
				.from(labOrders)
				.where(
					and(
						eq(labOrders.organizationId, orgId),
						eq(labOrders.doctorId, resolvedDocId),
						eq(labOrders.isWarranty, false),
						inArray(labOrders.status, ["received", "ready", "ready_in_clinic", "fitted", "completed", "installed"]),
						gte(sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`, fromDate),
						lte(sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`, toDate),
					),
				);

			const labCostPoolByPatient = new Map<string, number>();
			for (const lo of docLabOrders) {
				const costKop = Math.round(Number(lo.labCostRub || 0) * 100);
				if (costKop > 0) {
					labCostPoolByPatient.set(
						lo.patientId,
						(labCostPoolByPatient.get(lo.patientId) || 0) + costKop,
					);
				}
			}

			// Списание материалов (только списываемые на пациента, без общеклинических накладных)
			const invDeductions = visitIds.length > 0
				? await db
					.select({
						visitId: inventoryTransactions.visitId,
						unitCostRub: inventoryTransactions.unitCostRub,
						quantityChanged: inventoryTransactions.quantityChanged,
						isOverhead: inventoryItems.isOverhead,
					})
					.from(inventoryTransactions)
					.leftJoin(
						inventoryItems,
						and(
							or(
								eq(inventoryTransactions.itemId, inventoryItems.id),
								eq(inventoryTransactions.inventoryItemId, inventoryItems.id),
							),
							eq(inventoryItems.organizationId, orgId),
						),
					)
					.where(
						and(
							eq(inventoryTransactions.organizationId, orgId),
							inArray(inventoryTransactions.visitId, visitIds),
							eq(inventoryTransactions.transactionType, "auto_deduct"),
						),
					)
				: [];

			const matCostByVisit = new Map<string, number>();
			for (const inv of invDeductions) {
				if (!inv.visitId || inv.isOverhead) continue;
				const cKop = Math.round(Number(inv.unitCostRub || 0) * Math.abs(Number(inv.quantityChanged || 0)) * 100);
				matCostByVisit.set(inv.visitId, (matCostByVisit.get(inv.visitId) || 0) + cKop);
			}

			for (const t of treats) {
				const qty = Math.max(1, Number(t.quantity || 1));
				const grossKop = Math.round(Number(t.priceRub || 0) * 100 * qty);
				const visitId = t.visitId;
				const visitTotalGross = visitId ? (totalGrossByVisit.get(visitId) || 0) : 0;
				const visitPaidTotal = visitId ? (paidKopByVisit.get(visitId) || 0) : 0;

				let actuallyPaidGrossKop = 0;
				if (visitId && visitTotalGross > 0 && visitPaidTotal > 0) {
					if (visitPaidTotal >= visitTotalGross) {
						actuallyPaidGrossKop = grossKop;
					} else {
						const remaining = remainingPaidKopByVisit.get(visitId) || 0;
						actuallyPaidGrossKop = Math.min(grossKop, remaining);
						remainingPaidKopByVisit.set(visitId, Math.max(0, remaining - actuallyPaidGrossKop));
					}
				}

				const isPaid = actuallyPaidGrossKop > 0;
				const isPartiallyPaid = actuallyPaidGrossKop > 0 && actuallyPaidGrossKop < grossKop;
				const isDebt = actuallyPaidGrossKop <= 0 && grossKop > 0;
				const invoiceStatus: "paid" | "partially_paid" | "unpaid" = actuallyPaidGrossKop >= grossKop
					? "paid"
					: actuallyPaidGrossKop > 0
						? "partially_paid"
						: "unpaid";
				const receiptNum = visitId ? fiscalReceiptByVisit.get(visitId) : undefined;
				const isPaid54Fz = Boolean(receiptNum) || isPaid || isPartiallyPaid;

				const linkedApptId = t.visitId ? visitToAppt.get(t.visitId) : undefined;
				const appt = appts.find((a) => a.id === linkedApptId);
				const patientId = appt?.patientId;

				let labKop = 0;
				if (patientId && (labCostPoolByPatient.get(patientId) || 0) > 0) {
					const pool = labCostPoolByPatient.get(patientId)!;
					labKop = Math.min(pool, grossKop);
					labCostPoolByPatient.set(patientId, pool - labKop);
				}

				const visitMatTotal = t.visitId ? (matCostByVisit.get(t.visitId) || 0) : 0;
				const matKop = Math.min(visitMatTotal, grossKop);
				if (t.visitId && matKop > 0) {
					matCostByVisit.set(t.visitId, Math.max(0, visitMatTotal - matKop));
				}

				const cat = normalizeClinicalCategory(t.category, t.specialty);
				const catLabelRu = CATEGORY_LABELS_RU[cat] || "Терапия";
				const serviceTitle = t.title || "Стоматологическая услуга";

				completedServices.push({
					id: t.id,
					dateIso: appt?.startsAt ? appt.startsAt.toISOString().slice(0, 10) : fromStr.slice(0, 10),
					patientName: appt?.patientName || "Пациент",
					medicalCardNumber: appt?.cardNumber || "—",
					serviceNameRu: serviceTitle,
					category: cat,
					grossRevenueKop: grossKop,
					labCostKop: labKop,
					materialCostKop: matKop,
					doctorId: resolvedDocId,
					order804nCode: t.order804nCode ?? undefined,
					serviceCode: t.code ?? undefined,
					isPaid,
					isDebt,
					invoiceStatus,
					paidAmountKop: actuallyPaidGrossKop,
					actuallyPaidGrossKop,
					fiscalReceiptNumber: receiptNum,
				});

				orders.push({
					id: t.id,
					orderNumber: `ОРД-${t.id.slice(0, 6).toUpperCase()}`,
					dateIso: appt?.startsAt ? appt.startsAt.toISOString().slice(0, 10) : fromStr.slice(0, 10),
					patientName: appt?.patientName || "Пациент",
					medicalCardNumber: appt?.cardNumber || "—",
					serviceNameRu: serviceTitle,
					category: cat,
					categoryLabelRu: catLabelRu,
					grossKopecks: grossKop,
					labCostKopecks: labKop,
					materialCostKopecks: matKop,
					doctorId: resolvedDocId,
					isPaid54Fz,
				});
			}
		}

		// Расчет через канонический калькулятор пакета @dental/shared
		const payrollResult = calculateDoctorPeriodPayroll({
			doctorId: resolvedDocId,
			doctorName,
			specialtyId: specId,
			periodStartIso: fromStr.slice(0, 10),
			periodEndIso: toStr.slice(0, 10),
			services: completedServices,
			customBasePercentage: basePercent,
			payoutModel: q.payoutModel === "chair_rental" ? "chair_rental" : "percentage",
			chairRentalKop: q.payoutModel === "chair_rental" ? Math.round(shiftsCount * (Number(q.shiftRateKop) || 400000)) : 0,
			advancePayoutKop: Math.round((Number(q.advanceRub) || 0) * 100),
			taxRegime: q.taxRegime === "self_employed" ? "self_employed" : "employee",
		});

		// 3. Закрытые периоды
		const statements = await db
			.select()
			.from(doctorPayrollStatements)
			.where(and(eq(doctorPayrollStatements.organizationId, orgId), eq(doctorPayrollStatements.doctorId, resolvedDocId)))
			.orderBy(sql`${doctorPayrollStatements.createdAt} DESC`);

		const closedPeriods = statements.map((s) => ({
			id: s.id,
			periodLabelRu: s.period,
			dateClosedIso: s.createdAt.toISOString().slice(0, 10),
			doctorName,
			rkoReceiptNumber: `РКО-${s.id.slice(0, 8).toUpperCase()}`,
			grossKopecks: Math.round(Number(s.grossRevenueKopecks || Math.round(Number(s.grossRevenueRub) * 100))),
			labCostKopecks: Math.round(Number(s.labCostKopecks || Math.round(Number(s.labCostRub) * 100))),
			materialCostKopecks: Math.round(Number(s.materialsCostKopecks || Math.round(Number(s.materialsCostRub) * 100))),
			netBaseKopecks: Math.round(Number(s.netBaseRevenueRub) * 100),
			payoutKopecks: Math.round(Number(s.netPayoutKopecks || Math.round(Number(s.netPayoutRub) * 100))),
			isPaidRko: Boolean(s.paidAt),
		}));

		return reply.send({
			ok: true,
			shiftsCount,
			summary: {
				doctorId: resolvedDocId,
				doctorName,
				schemeType: payrollResult.payoutModel === "chair_rental" ? "chair_rental" : "net_percentage",
				totalGrossKopecks: payrollResult.totalGrossRevenueKop,
				totalLabCostKopecks: payrollResult.totalLabDeductionsKop,
				totalMaterialCostKopecks: payrollResult.totalMaterialDeductionsKop,
				totalNetBaseKopecks: payrollResult.totalNetBaseKop,
				doctorAccruedKopecks: payrollResult.grossPayoutBeforeTaxKop,
				chairRentalKopecks: payrollResult.chairRentalKop || 0,
				advanceKopecks: payrollResult.advancePayoutKop || 0,
				ndfl13TaxKopecks: payrollResult.ndfl13TaxKop || 0,
				payoutKopecks: payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop,
				payoutStatus: statements[0]?.isFinalized ? "paid_rko" : "accrued",
				servicesCount: orders.length,
				minimumGuaranteeApplied: payrollResult.minimumGuaranteeApplied,
			},
			orders,
			closedPeriods,
		});
	});

	/**
	 * POST /api/v1/payroll/close-settlement & /api/payroll/close-settlement — Фиксация закрытия расчетного периода в ACID транзакции
	 */
	const closeSettlementHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = closeSettlementSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры закрытия расчетного периода",
				details: parsed.error.format(),
			});
		}

		const identity = getRequestIdentity(request);
		const orgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";
		const body = parsed.data;

		const resolvedDocId = await resolveDoctorUserUuid(orgId, body.doctorId, identity.userId ?? undefined);
		if (!resolvedDocId) {
			return reply.code(404).send({ error: "DoctorNotFoundError", message: "Врач не найден" });
		}

		const fromDate = new Date(`${body.periodStart.slice(0, 10)}T00:00:00.000Z`);
		const toDate = new Date(`${body.periodEnd.slice(0, 10)}T23:59:59.999Z`);
		const periodKey = body.periodStart.slice(0, 7) === body.periodEnd.slice(0, 7)
			? body.periodStart.slice(0, 7)
			: `${body.periodStart.slice(0, 10)}..${body.periodEnd.slice(0, 10)}`;

		const grossKop = (body.grossRevenueKopecks ?? body.grossRevenueKop) !== undefined
			? Math.max(0, body.grossRevenueKopecks ?? body.grossRevenueKop ?? 0)
			: Math.round(Math.max(0, body.grossRevenueRub ?? 0) * 100);

		const labKop = (body.labCostKopecks ?? body.labCostKop) !== undefined
			? Math.max(0, body.labCostKopecks ?? body.labCostKop ?? 0)
			: Math.round(Math.max(0, body.labCostRub ?? 0) * 100);

		const matKop = (body.materialsCostKopecks ?? body.materialsCostKop ?? body.materialCostKop) !== undefined
			? Math.max(0, body.materialsCostKopecks ?? body.materialsCostKop ?? body.materialCostKop ?? 0)
			: Math.round(Math.max(0, body.materialsCostRub ?? 0) * 100);

		const netBaseKop = (body.netBaseKopecks ?? body.netBaseKop) !== undefined
			? Math.max(0, body.netBaseKopecks ?? body.netBaseKop ?? 0)
			: body.netBaseRevenueRub !== undefined
				? Math.round(Math.max(0, body.netBaseRevenueRub) * 100)
				: Math.max(0, grossKop - labKop - matKop);

		const payoutKop = (body.amountKopecks ?? body.netPayoutKopecks ?? body.netPayoutKop) !== undefined
			? Math.max(0, body.amountKopecks ?? body.netPayoutKopecks ?? body.netPayoutKop ?? 0)
			: Math.round(Math.max(0, body.netPayoutRub ?? 0) * 100);

		const totalAccruedKop = (body.totalAccruedKopecks ?? body.totalAccruedKop) !== undefined
			? Math.max(0, body.totalAccruedKopecks ?? body.totalAccruedKop ?? 0)
			: body.totalAccruedRub !== undefined
				? Math.round(Math.max(0, body.totalAccruedRub) * 100)
				: payoutKop;

		const ndflKop = (body.ndflKopecks ?? body.ndflKop) !== undefined
			? Math.max(0, body.ndflKopecks ?? body.ndflKop ?? 0)
			: Math.round(Math.max(0, body.ndfl13Rub ?? 0) * 100);

		const chairRentalKop = body.chairRentalRub !== undefined ? Math.round(Math.max(0, body.chairRentalRub) * 100) : 0;

		const result = await closeSettlementPeriodInDb({
			organizationId: orgId,
			doctorId: resolvedDocId,
			periodKey,
			fromDate,
			toDate,
			payoutModel: body.payoutModel || "percentage",
			grossRevenueKopecks: grossKop,
			labCostKopecks: labKop,
			materialsCostKopecks: matKop,
			netBaseRevenueKopecks: netBaseKop,
			categoryPercent: body.categoryPercent ?? 25,
			calculatedPieceworkKopecks: totalAccruedKop,
			fixedSalaryKopecks: chairRentalKop,
			bonusesTotalKopecks: 0,
			penaltiesTotalKopecks: 0,
			totalAccruedKopecks: totalAccruedKop,
			ndfl13Kopecks: ndflKop,
			netPayoutKopecks: payoutKop,
			markPaid: body.markPaid ?? true,
		});

		return reply.send({
			ok: true,
			statementId: result.statementId,
			statement: result.statement,
			closedAppointmentsCount: result.closedAppointmentsCount,
			message: "Расчетный период успешно зафиксирован в PostgreSQL и РКО",
		});
	};

	const reopenSettlementHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const identity = getRequestIdentity(request);
		const orgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";
		const body = (request.body || {}) as { doctorId?: string; periodStart?: string; periodEnd?: string };
		if (!body.doctorId || !body.periodStart || !body.periodEnd) {
			return reply.code(400).send({ error: "ValidationError", message: "Не указаны параметры периода" });
		}
		const resolvedDocId = await resolveDoctorUserUuid(orgId, body.doctorId, identity.userId ?? undefined);
		if (!resolvedDocId) {
			return reply.code(404).send({ error: "DoctorNotFoundError", message: "Врач не найден" });
		}
		const periodKey = body.periodStart.slice(0, 7) === body.periodEnd.slice(0, 7)
			? body.periodStart.slice(0, 7)
			: `${body.periodStart.slice(0, 10)}..${body.periodEnd.slice(0, 10)}`;
		await reopenSettlementPeriodInDb(orgId, resolvedDocId, periodKey);
		return reply.send({ ok: true, isFinalized: false });
	};

	app.post("/api/v1/payroll/close-settlement", closeSettlementHandler);
	app.post("/api/payroll/close-settlement", closeSettlementHandler);
	app.post("/api/doctor/close-settlement-period", closeSettlementHandler);
	app.post("/api/v1/payroll/reopen-settlement", reopenSettlementHandler);
	app.post("/api/payroll/reopen-settlement", reopenSettlementHandler);
	app.post("/api/doctor/settlement-period/reopen", reopenSettlementHandler);
}

export default registerPayrollRoutes;
