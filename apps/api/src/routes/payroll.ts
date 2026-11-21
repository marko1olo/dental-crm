/**
 * payroll.ts — Fastify API-маршруты расчета и закрытия зарплатной ведомости врачей (SSOT).
 * Соответствие: Мандат 8e (Автономия врача), Мандат 8n (Целочисленные копейки, Net Revenue),
 * Мандат 8wy (100% реальный PostgreSQL без синтетических подделок).
 * Декомпозирован в рамках Мандата 8b: тяжелые SQL-запросы вынесены в doctorPayrollDbQueries.ts.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { calculateDoctorPeriodPayroll, computePayloadHash, isValidUuid, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { doctorCommissions, users } from "../db/schema.js";
import { idempotencyKeys } from "../db/schema/idempotency.js";
import { getRequestIdentity } from "../security/identity.js";
import { roleHasPermission } from "../security/permissions.js";
import { requirePayoutAccess } from "./billingRoutes/payoutAccessService.js";
import {
	closeSettlementPeriodInDb,
	reopenSettlementPeriodInDb,
	resolveDoctorUserUuid,
} from "./payrollSettlementDbQueries.js";
import {
	fetchActiveDoctorProfiles,
	fetchClosedPayrollStatements,
	fetchDoctorPayrollDataset,
	type PayrollOrderDto,
	type ClosedPayrollPeriodDto,
} from "./doctorPayrollDbQueries.js";
import { handleGetDoctorMyEarnings } from "./doctorMyEarningsHandler.js";

const payrollCalculationsQuerySchema = z.object({
	doctorId: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	startDateIso: z.string().optional(),
	endDateIso: z.string().optional(),
	percent: z.union([z.string(), z.number()]).optional(),
	payoutModel: z.enum(["percentage", "chair_rental"]).optional(),
	shiftRateKop: z.union([z.string(), z.number()]).optional(),
	chairRentalRub: z.union([z.string(), z.number()]).optional(),
	chairRentalKop: z.union([z.string(), z.number()]).optional(),
	advanceRub: z.union([z.string(), z.number()]).optional(),
	taxRegime: z.enum(["employee", "self_employed"]).optional(),
});

type PayrollCalculationsQuery = z.infer<typeof payrollCalculationsQuerySchema>;

const closeSettlementSchema = z.object({
	idempotencyKey: z.string().optional(),
	doctorId: z.string().min(1),
	periodStart: z.string().min(1),
	periodEnd: z.string().min(1),
	grossRevenueKopecks: z.number().int().optional(),
	grossRevenueKop: z.number().int().optional(),
	grossRevenueRub: z.number().optional(),
	labCostKopecks: z.number().int().optional(),
	labCostKop: z.number().int().optional(),
	labCostRub: z.number().optional(),
	materialsCostKopecks: z.number().int().optional(),
	materialsCostKop: z.number().int().optional(),
	materialCostKop: z.number().int().optional(),
	materialsCostRub: z.number().optional(),
	netBaseRevenueKopecks: z.number().int().optional(),
	netBaseKopecks: z.number().int().optional(),
	netBaseKop: z.number().int().optional(),
	netBaseRevenueRub: z.number().optional(),
	amountKopecks: z.number().int().optional(),
	netPayoutKopecks: z.number().int().optional(),
	netPayoutKop: z.number().int().optional(),
	netPayoutRub: z.number().optional(),
	totalAccruedKopecks: z.number().int().optional(),
	totalAccruedKop: z.number().int().optional(),
	totalAccruedRub: z.number().optional(),
	calculatedPieceworkKopecks: z.number().int().optional(),
	calculatedPieceworkRub: z.number().optional(),
	fixedSalaryKopecks: z.number().int().optional(),
	fixedSalaryRub: z.number().optional(),
	serviceSalaryPriceKopecks: z.number().int().optional(),
	bonusesTotalKopecks: z.number().int().optional(),
	penaltiesTotalKopecks: z.number().int().optional(),
	payoutModel: z.enum(["percentage", "chair_rental"]).optional().default("percentage"),
	categoryPercent: z.number().optional(),
	chairRentalKopecks: z.number().int().optional(),
	chairRentalRub: z.number().optional(),
	rkoNumber: z.string().optional(),
	ndfl13Kopecks: z.number().int().optional(),
	ndflKopecks: z.number().int().optional(),
	ndflKop: z.number().int().optional(),
	ndfl13Rub: z.number().optional(),
	markPaid: z.boolean().optional().default(true),
});

const reopenSettlementSchema = z.object({
	doctorId: z.string().min(1),
	periodStart: z.string().min(1),
	periodEnd: z.string().min(1),
});

export async function registerPayrollRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/v1/doctors — Список активных докторов клиники с реальными ставками из doctor_commissions.
	 * DEF-PAYROLL-06: Ставки комиссии маскируются, если у вызывающего нет прав payroll.read.
	 */
	app.get("/api/v1/doctors", async (request: FastifyRequest, reply: FastifyReply) => {
		const identity = getRequestIdentity(request);
		if (!identity.organizationId) {
			return reply.code(401).send({
				error: "AuthRequired",
				message: "Не указан идентификатор организации",
			});
		}
		const orgId = identity.organizationId;

		try {
			const doctors = await fetchActiveDoctorProfiles(orgId);
			const hasFullPayrollAccess = identity.role ? roleHasPermission(identity.role, "payroll.read") : false;
			const hasOwnPayrollAccess = identity.role ? roleHasPermission(identity.role, "payroll.read.own") : false;

			const sanitizedDoctors = doctors.map((doc) => {
				const isSelf = Boolean(identity.userId && identity.userId === doc.id);
				const canSeeCommission = hasFullPayrollAccess || (isSelf && hasOwnPayrollAccess);
				if (canSeeCommission) {
					return doc;
				}
				return {
					...doc,
					commissionPercent: 0,
					defaultShiftRateKop: 0,
					minGuaranteeMonthlyKop: 0,
				};
			});
			return reply.send({ ok: true, doctors: sanitizedDoctors });
		} catch (err: unknown) {
			request.log.error(err, "Failed to fetch doctors list");
			return reply.send({ ok: true, doctors: [] });
		}
	});

	/**
	 * GET /api/v1/payroll/calculations — Расчет начислений в целочисленных копейках.
	 * DEF-PAYROLL-01: Контроль прав через requirePayoutAccess, врачу с payroll.read.own запрещен доступ к коллегам и ?doctorId=all.
	 */
	const getPayrollCalculationsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const payoutAccess = await requirePayoutAccess(request, reply);
		if (!payoutAccess) return;

		const parsedQuery = payrollCalculationsQuerySchema.safeParse(request.query);
		const q: PayrollCalculationsQuery = parsedQuery.success ? parsedQuery.data : {};
		const orgId = payoutAccess.organizationId;
		let rawDocId = q.doctorId || payoutAccess.userId || "";

		if (payoutAccess.scope === "own") {
			if (rawDocId === "all") {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "payroll.read",
					role: payoutAccess.role,
					message: "Врач может просматривать расчеты только по собственным начислениям",
				});
			}

			const resolvedTargetId = await resolveDoctorUserUuid(orgId, rawDocId, payoutAccess.userId);
			if (resolvedTargetId && resolvedTargetId !== payoutAccess.userId) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "payroll.read",
					role: payoutAccess.role,
					message: "Доступ к начислениям других врачей клиники запрещен",
				});
			}
			rawDocId = payoutAccess.userId;
		}

		const fromStr = q.from || q.startDate || q.startDateIso || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
		const toStr = q.to || q.endDate || q.endDateIso || new Date().toISOString().slice(0, 10);
		const fromDate = new Date(`${fromStr.slice(0, 10)}T00:00:00.000Z`);
		const toDate = new Date(`${toStr.slice(0, 10)}T23:59:59.999Z`);

		if (rawDocId === "all") {
			const activeDoctors = await fetchActiveDoctorProfiles(orgId);
			const allOrders: PayrollOrderDto[] = [];
			const allClosedPeriods: ClosedPayrollPeriodDto[] = [];
			let totalClinicShifts = 0;
			let totalClinicGrossKop = 0;
			let totalClinicLabKop = 0;
			let totalClinicMaterialKop = 0;
			let totalClinicNetBaseKop = 0;
			let totalClinicAccruedKop = 0;
			let totalClinicPayoutKop = 0;

			const doctorSummaries: Record<string, unknown> = {};

			for (const doc of activeDoctors) {
				const { shiftsCount, orders, completedServices } = await fetchDoctorPayrollDataset({
					orgId,
					resolvedDocId: doc.id,
					fromStr,
					toStr,
					fromDate,
					toDate,
				});

				const docPayoutModel = doc.payoutModel as "percentage" | "chair_rental";
				const isRental = docPayoutModel === "chair_rental";

				const payrollResult = calculateDoctorPeriodPayroll({
					doctorId: doc.id,
					doctorName: doc.name,
					specialtyId: doc.specialtyId,
					periodStartIso: fromStr.slice(0, 10),
					periodEndIso: toStr.slice(0, 10),
					services: completedServices,
					customBasePercentage: doc.commissionPercent,
					payoutModel: docPayoutModel,
					chairRentalKop: isRental ? Math.round(shiftsCount * doc.defaultShiftRateKop) : 0,
					advancePayoutKop: 0,
					taxRegime: doc.taxRegime,
				});

				const { closedPeriods } = await fetchClosedPayrollStatements(orgId, doc.id, doc.name);
				allClosedPeriods.push(...closedPeriods);
				allOrders.push(...orders);

				totalClinicShifts += shiftsCount;
				totalClinicGrossKop += payrollResult.totalGrossRevenueKop;
				totalClinicLabKop += payrollResult.totalLabDeductionsKop;
				totalClinicMaterialKop += payrollResult.totalMaterialDeductionsKop;
				totalClinicNetBaseKop += payrollResult.totalNetBaseKop;
				totalClinicAccruedKop += payrollResult.grossPayoutBeforeTaxKop;
				totalClinicPayoutKop += (payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop);

				doctorSummaries[doc.id] = {
					doctorId: doc.id,
					doctorName: doc.name,
					schemeType: isRental ? "chair_rental" : "net_percentage",
					totalGrossKopecks: payrollResult.totalGrossRevenueKop,
					totalLabCostKopecks: payrollResult.totalLabDeductionsKop,
					totalMaterialCostKopecks: payrollResult.totalMaterialDeductionsKop,
					totalNetBaseKopecks: payrollResult.totalNetBaseKop,
					doctorAccruedKopecks: payrollResult.grossPayoutBeforeTaxKop,
					chairRentalKopecks: payrollResult.chairRentalKop || 0,
					advanceKopecks: payrollResult.advancePayoutKop || 0,
					ndfl13TaxKopecks: payrollResult.ndfl13TaxKop || 0,
					payoutKopecks: payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop,
					payoutStatus: "accrued",
					servicesCount: orders.length,
					minimumGuaranteeApplied: payrollResult.minimumGuaranteeApplied,
				};
			}

			return reply.send({
				ok: true,
				shiftsCount: totalClinicShifts,
				summary: {
					doctorId: "all",
					doctorName: "Все врачи клиники",
					schemeType: "clinic_consolidated",
					totalGrossKopecks: totalClinicGrossKop,
					totalLabCostKopecks: totalClinicLabKop,
					totalMaterialCostKopecks: totalClinicMaterialKop,
					totalNetBaseKopecks: totalClinicNetBaseKop,
					doctorAccruedKopecks: totalClinicAccruedKop,
					chairRentalKopecks: 0,
					advanceKopecks: 0,
					ndfl13TaxKopecks: 0,
					payoutKopecks: totalClinicPayoutKop,
					payoutStatus: "accrued",
					servicesCount: allOrders.length,
					minimumGuaranteeApplied: false,
				},
				doctorSummaries,
				orders: allOrders,
				closedPeriods: allClosedPeriods,
			});
		}

		const resolvedDocId = await resolveDoctorUserUuid(orgId, rawDocId, payoutAccess.userId ?? undefined);
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
				commissionPercent: doctorCommissions.commissionPercent,
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

		const resolvedPct = activeComm?.commissionPct || activeComm?.commissionPercent;
		const basePercent = Number(q.percent) || (resolvedPct ? Number(resolvedPct) : 25);

		// Сбор клинического датасета (смены, приемы, оплаты, услуги, ЗТЛ, материалы)
		const { shiftsCount, orders, completedServices } = await fetchDoctorPayrollDataset({
			orgId,
			resolvedDocId,
			fromStr,
			toStr,
			fromDate,
			toDate,
		});

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
			chairRentalKop:
				q.chairRentalRub !== undefined
					? rublesToKopecks(Number(q.chairRentalRub) || 0)
					: q.chairRentalKop !== undefined
						? Number(q.chairRentalKop) || 0
						: q.payoutModel === "chair_rental"
							? Math.round(shiftsCount * (Number(q.shiftRateKop) || 400000))
							: 0,
			advancePayoutKop: rublesToKopecks(Number(q.advanceRub) || 0),
			taxRegime: q.taxRegime === "self_employed" ? "self_employed" : "employee",
		});

		// Закрытые периоды
		const { closedPeriods, statements } = await fetchClosedPayrollStatements(orgId, resolvedDocId, doctorName);

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
	};

	app.get("/api/v1/payroll/calculations", getPayrollCalculationsHandler);
	app.get("/api/payroll/calculations", getPayrollCalculationsHandler);

	/**
	 * POST /api/v1/payroll/close-settlement & /api/payroll/close-settlement — Фиксация закрытия расчетного периода в ACID транзакции
	 */
	const closeSettlementHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const payoutAccess = await requirePayoutAccess(request, reply);
		if (!payoutAccess) return;
		if (payoutAccess.scope !== "all") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "payroll.read",
				role: payoutAccess.role,
				message: "Закрытие расчетных периодов доступно только управляющему клиникой",
			});
		}

		const parsed = closeSettlementSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры закрытия расчетного периода",
				details: parsed.error.format(),
			});
		}

		const orgId = payoutAccess.organizationId;
		const body = parsed.data;

		const rawIdemKey = request.headers["idempotency-key"] || request.headers["x-idempotency-key"] || body.idempotencyKey;
		const idempotencyKey = typeof rawIdemKey === "string" && rawIdemKey.trim().length > 0 ? rawIdemKey.trim() : undefined;

		if (idempotencyKey) {
			if (!isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Заголовок Idempotency-Key должен содержать корректный UUID (рекомендуется UUIDv7).",
				});
			}
			reply.header("Idempotency-Key", idempotencyKey);
			reply.header("X-Idempotency-Key", idempotencyKey);

			const existingRecord = await withTenantCtx(orgId, async (tx) => {
				const [rec] = await tx
					.select()
					.from(idempotencyKeys)
					.where(and(eq(idempotencyKeys.clinicId, orgId), eq(idempotencyKeys.key, idempotencyKey)))
					.limit(1);
				return rec ?? null;
			});

			if (existingRecord) {
				if (existingRecord.status === "completed" && existingRecord.responseBody) {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply.code(existingRecord.responseCode || 200).send(existingRecord.responseBody);
				}
				if (existingRecord.status === "in_flight") {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция фиксации расчетного периода с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		const fromDate = new Date(`${body.periodStart.slice(0, 10)}T00:00:00.000Z`);
		const toDate = new Date(`${body.periodEnd.slice(0, 10)}T23:59:59.999Z`);
		const periodKey = body.periodStart.slice(0, 7) === body.periodEnd.slice(0, 7)
			? body.periodStart.slice(0, 7)
			: `${body.periodStart.slice(0, 10)}..${body.periodEnd.slice(0, 10)}`;

		// DEF-PAYROLL-04: Пакетный макро-поток в 1 клик для закрытия ведомостей всех врачей клиники в ACID-транзакции
		if (body.doctorId === "all") {
			const activeDoctors = await fetchActiveDoctorProfiles(orgId);
			const batchStatements: NonNullable<Awaited<ReturnType<typeof closeSettlementPeriodInDb>>["statement"]>[] = [];
			let totalClosedAppts = 0;

			await withTenantCtx(orgId, async (tx) => {
				for (const doc of activeDoctors) {
					const { shiftsCount, completedServices } = await fetchDoctorPayrollDataset({
						orgId,
						resolvedDocId: doc.id,
						fromStr: body.periodStart,
						toStr: body.periodEnd,
						fromDate,
						toDate,
					});

					const docPayoutModel = doc.payoutModel as "percentage" | "chair_rental";
					const isRental = docPayoutModel === "chair_rental";

					const payrollResult = calculateDoctorPeriodPayroll({
						doctorId: doc.id,
						doctorName: doc.name,
						specialtyId: doc.specialtyId,
						periodStartIso: body.periodStart.slice(0, 10),
						periodEndIso: body.periodEnd.slice(0, 10),
						services: completedServices,
						customBasePercentage: doc.commissionPercent,
						payoutModel: docPayoutModel,
						chairRentalKop: isRental ? Math.round(shiftsCount * doc.defaultShiftRateKop) : 0,
						advancePayoutKop: 0,
						taxRegime: doc.taxRegime,
					});

					const payoutKopecks = payrollResult.mainPayoutKop ?? payrollResult.netPayoutToDoctorKop;
					const rkoNumber = body.rkoNumber || `РКО-${doc.id.slice(0, 4).toUpperCase()}-${periodKey}`;

					const res = await closeSettlementPeriodInDb({
						organizationId: orgId,
						doctorId: doc.id,
						periodKey,
						fromDate,
						toDate,
						payoutModel: docPayoutModel,
						grossRevenueKopecks: payrollResult.totalGrossRevenueKop,
						labCostKopecks: payrollResult.totalLabDeductionsKop,
						materialsCostKopecks: payrollResult.totalMaterialDeductionsKop,
						netBaseRevenueKopecks: payrollResult.totalNetBaseKop,
						categoryPercent: doc.commissionPercent,
						calculatedPieceworkKopecks: payrollResult.grossPayoutBeforeTaxKop,
						fixedSalaryKopecks: payrollResult.chairRentalKop || 0,
						bonusesTotalKopecks: 0,
						penaltiesTotalKopecks: 0,
						totalAccruedKopecks: payrollResult.grossPayoutBeforeTaxKop,
						ndfl13Kopecks: payrollResult.ndfl13TaxKop || 0,
						netPayoutKopecks: payoutKopecks,
						rkoNumber,
						markPaid: body.markPaid ?? true,
					}, tx);

					if (res.statement) batchStatements.push(res.statement);
					totalClosedAppts += res.closedAppointmentsCount;
				}

				if (idempotencyKey) {
					const batchResponsePayload: Record<string, unknown> = {
						ok: true,
						statementId: batchStatements[0]?.id || "batch",
						statement: batchStatements[0] || null,
						statements: batchStatements,
						count: batchStatements.length,
						closedAppointmentsCount: totalClosedAppts,
						message: `Пакетное утверждение ведомостей клиники: зафиксированы расчетные периоды для ${batchStatements.length} врачей`,
					};

					await tx
						.insert(idempotencyKeys)
						.values({
							clinicId: orgId,
							key: idempotencyKey,
							status: "completed",
							payloadHash: computePayloadHash(request.body ?? {}),
							responseBody: batchResponsePayload,
							responseCode: 200,
						})
						.onConflictDoUpdate({
							target: [idempotencyKeys.clinicId, idempotencyKeys.key],
							set: {
								status: "completed",
								responseBody: batchResponsePayload,
								responseCode: 200,
							},
						});
				}
			});

			return reply.send({
				ok: true,
				statementId: batchStatements[0]?.id || "batch",
				statement: batchStatements[0] || null,
				statements: batchStatements,
				count: batchStatements.length,
				closedAppointmentsCount: totalClosedAppts,
				message: `Пакетное утверждение ведомостей клиники: зафиксированы расчетные периоды для ${batchStatements.length} врачей`,
			});
		}

		const resolvedDocId = await resolveDoctorUserUuid(orgId, body.doctorId, payoutAccess.userId ?? undefined);
		if (!resolvedDocId) {
			return reply.code(404).send({ error: "DoctorNotFoundError", message: "Врач не найден" });
		}

		const grossKop = (body.grossRevenueKopecks ?? body.grossRevenueKop) !== undefined
			? Math.max(0, body.grossRevenueKopecks ?? body.grossRevenueKop ?? 0)
			: rublesToKopecks(Math.max(0, body.grossRevenueRub ?? 0));

		const labKop = (body.labCostKopecks ?? body.labCostKop) !== undefined
			? Math.max(0, body.labCostKopecks ?? body.labCostKop ?? 0)
			: rublesToKopecks(Math.max(0, body.labCostRub ?? 0));

		const matKop = (body.materialsCostKopecks ?? body.materialsCostKop ?? body.materialCostKop) !== undefined
			? Math.max(0, body.materialsCostKopecks ?? body.materialsCostKop ?? body.materialCostKop ?? 0)
			: rublesToKopecks(Math.max(0, body.materialsCostRub ?? 0));

		const netBaseKop = (body.netBaseKopecks ?? body.netBaseKop) !== undefined
			? Math.max(0, body.netBaseKopecks ?? body.netBaseKop ?? 0)
			: body.netBaseRevenueRub !== undefined
				? rublesToKopecks(Math.max(0, body.netBaseRevenueRub))
				: Math.max(0, grossKop - labKop - matKop);

		const payoutKop = (body.amountKopecks ?? body.netPayoutKopecks ?? body.netPayoutKop) !== undefined
			? Math.max(0, body.amountKopecks ?? body.netPayoutKopecks ?? body.netPayoutKop ?? 0)
			: rublesToKopecks(Math.max(0, body.netPayoutRub ?? 0));

		const totalAccruedKop = (body.totalAccruedKopecks ?? body.totalAccruedKop) !== undefined
			? Math.max(0, body.totalAccruedKopecks ?? body.totalAccruedKop ?? 0)
			: body.totalAccruedRub !== undefined
				? rublesToKopecks(Math.max(0, body.totalAccruedRub))
				: payoutKop;

		const ndflKop = (body.ndflKopecks ?? body.ndflKop) !== undefined
			? Math.max(0, body.ndflKopecks ?? body.ndflKop ?? 0)
			: rublesToKopecks(Math.max(0, body.ndfl13Rub ?? 0));

		const chairRentalKop = body.chairRentalKopecks !== undefined ? Math.max(0, body.chairRentalKopecks) : body.chairRentalRub !== undefined ? rublesToKopecks(Math.max(0, body.chairRentalRub)) : 0;

		const responsePayload = await withTenantCtx(orgId, async (tx) => {
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
				rkoNumber: body.rkoNumber,
				markPaid: body.markPaid ?? true,
			}, tx);

			const payload: Record<string, unknown> = {
				ok: true,
				statementId: result.statementId,
				statement: result.statement,
				closedAppointmentsCount: result.closedAppointmentsCount,
				message: "Расчетный период успешно зафиксирован в PostgreSQL и РКО",
			};

			if (idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: payload,
						responseCode: 200,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: payload,
							responseCode: 200,
						},
					});
			}

			return payload;
		});

		return reply.send(responsePayload);
	};

	const reopenSettlementHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const payoutAccess = await requirePayoutAccess(request, reply);
		if (!payoutAccess) return;
		if (payoutAccess.scope !== "all") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "payroll.read",
				role: payoutAccess.role,
				message: "Открытие расчетных периодов доступно только управляющему клиникой",
			});
		}

		const parsed = reopenSettlementSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Не указаны параметры периода",
				details: parsed.error.format(),
			});
		}
		const body = parsed.data;
		const orgId = payoutAccess.organizationId;
		const resolvedDocId = await resolveDoctorUserUuid(orgId, body.doctorId, payoutAccess.userId ?? undefined);
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

	// Мобильный кошелек начислений врача (SSOT)
	app.get("/api/doctor/my-earnings", handleGetDoctorMyEarnings);
	app.get("/api/v1/doctor/my-earnings", handleGetDoctorMyEarnings);
	app.get("/api/my-earnings", handleGetDoctorMyEarnings);
}

export default registerPayrollRoutes;
