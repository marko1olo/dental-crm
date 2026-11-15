import { Decimal } from "decimal.js";
import { and, eq, gte, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	appointments,
	doctorCommissions,
	inventoryItems,
	inventoryTransactions,
	labOrders,
	payments,
	users,
	visits,
} from "../../../db/schema.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	classifyServiceCategory,
	DENTAL_SPECIALTY_NAMES_RU,
	type DentalSpecialtyCategory,
	type CategoryAccrualBreakdown,
	isGeneralClinicOverheadConsumable,
} from "@dental/shared";
import type {
	DoctorPayoutScope,
	DoctorPayoutReport,
	DoctorPayoutRow,
	DoctorPayoutVisit,
	DoctorPayoutLabOrder,
	DoctorPayoutMaterialsState,
	DoctorPayoutState,
	PayoutFormulaInput,
	PayoutFormulaResult,
} from "./types.js";
import {
	roundMoney,
	percentOfMoney,
	isUsablePercent,
} from "./math.js";
import {
	extractMedicalCardNumber,
	humanizeRestorationType,
} from "./helpers.js";
import { fetchDoctorPayoutDrillDownDetails } from "./drillDown.js";
import { moneyFromDb, percentFromDb } from "./dbParsers.js";

/**
 * Выплата врачу за период.
 *
 * Начислено = (касса − возвраты) × ставка. Удержано = себестоимость материалов × процент
 * удержания + расходы ЗТЛ (кроме гарантийных переделок) × процент удержания.
 * По ТК РФ выплата не может быть отрицательной (payout >= 0).
 */
export function computeDoctorPayout(
	input: PayoutFormulaInput,
): PayoutFormulaResult {
	if (input.commissionPct === null) {
		return {
			state: "rate_missing",
			accruedRub: null,
			withheldMaterialRub: null,
			withheldLabRub: null,
			payoutRub: null,
		};
	}
	if (!isUsablePercent(input.commissionPct)) {
		return {
			state: "rate_invalid",
			accruedRub: null,
			withheldMaterialRub: null,
			withheldLabRub: null,
			payoutRub: null,
		};
	}

	const netRevenueRub = roundMoney(
		new Decimal(input.revenueRub).minus(new Decimal(input.refundRub ?? 0)),
	);
	const refundClawbackRub = input.refundRub && input.refundRub > 0
		? percentOfMoney(input.refundRub, input.commissionPct)
		: 0;

	// Вычет материалов
	let withheldMaterialRub: number | null = 0;
	const matMovements = input.materialMovements ?? 0;
	const matCost = input.materialCostRub ?? 0;
	if (matMovements > 0 && matCost > 0) {
		if (!isUsablePercent(input.materialDeductionPct ?? null)) {
			const legacyAccrued = percentOfMoney(netRevenueRub, input.commissionPct);
			return {
				state: "material_policy_missing",
				accruedRub: legacyAccrued,
				withheldMaterialRub: null,
				withheldLabRub: null,
				payoutRub: null,
			};
		}
		withheldMaterialRub = percentOfMoney(
			matCost,
			input.materialDeductionPct ?? 100,
		);
	}

	// Вычет ЗТЛ (лаборатория): при гарантии (isWarranty: true) расходы ЗТЛ с врача не удерживаются
	const labOrdersCount = input.labOrdersCount ?? 0;
	const isWarranty = Boolean(input.isWarranty);
	const labCostRub = isWarranty ? 0 : (input.labCostRub ?? 0);
	let withheldLabRub: number | null = 0;
	if (!isWarranty && labOrdersCount > 0 && labCostRub > 0) {
		const labPct = isUsablePercent(input.labDeductionPct ?? null)
			? (input.labDeductionPct as number)
			: 100;
		withheldLabRub = percentOfMoney(labCostRub, labPct);
	}

	// Чистая база выручки = max(0, Revenue - Refund - WithheldMaterials - WithheldLab)
	const directMaterialDeduction = new Decimal(withheldMaterialRub ?? 0);
	const directLabDeduction = new Decimal(withheldLabRub ?? 0);
	const netBaseRub = Decimal.max(
		0,
		new Decimal(netRevenueRub).minus(directMaterialDeduction).minus(directLabDeduction),
	);
	const accruedRub = percentOfMoney(netBaseRub.toNumber(), input.commissionPct);
	const payoutRub = accruedRub;

	return {
		state: "computed",
		accruedRub,
		withheldMaterialRub,
		withheldLabRub,
		payoutRub,
		refundClawbackRub,
	};
}

/** Состояние себестоимости по числу строк списания. */
export function materialsStateOf(
	movements: number,
	unpriced: number,
): DoctorPayoutMaterialsState {
	if (movements === 0) return "no_movements";
	return unpriced > 0 ? "cost_missing" : "counted";
}

/**
 * Текст строки: причина и действие.
 */
export function payoutRowNote(input: {
	readonly state: DoctorPayoutState;
	readonly materialsState: DoctorPayoutMaterialsState;
	readonly materialMovementsUnpriced: number;
	readonly commissionPct: number | null;
	readonly rateRowCount: number;
	readonly payoutRub: number | null;
	readonly revenueRub: number;
}): string {
	const parts: string[] = [];

	switch (input.state) {
		case "rate_missing":
			parts.push(
				"Ставка врача не задана, поэтому сумму к выплате считать не из чего. " +
					"Задайте процент врача — до этого показана только касса за период.",
			);
			break;
		case "rate_invalid":
			parts.push(
				`Ставка врача в базе непригодна для расчёта: ${input.commissionPct ?? "—"} %. ` +
					"Процент должен быть от 0 до 100. Исправьте ставку: по такому значению зарплата вышла бы неверной.",
			);
			break;
		case "material_policy_missing":
			parts.push(
				"Процент удержания за материалы не задан, а списания по оплаченным визитам есть. " +
					"Начислено показано, итог к выплате — нет: без процента удержания он был бы либо " +
					"выплатой материалов клиники врачу, либо удержанием, о котором не договаривались.",
			);
			break;
		case "computed":
			parts.push(
				"Начислено процентом от чистой базы выручки (за вычетом материалов и лаборатории ЗТЛ).",
			);
			break;
	}

	if (input.state !== "rate_missing" && input.state !== "rate_invalid") {
		if (input.materialsState === "no_movements") {
			parts.push(
				"Списаний материалов по оплаченным визитам нет — удерживать нечего. " +
					"Если материалы расходовались, включите их списание при подписании приёма: " +
					"иначе себестоимость в зарплату не попадёт.",
			);
		} else if (input.materialsState === "cost_missing") {
			parts.push(
				`Списаний без цены или без количества: ${input.materialMovementsUnpriced}. ` +
					"Себестоимость занижена, значит удержание меньше настоящего. Проставьте цену позиций склада.",
			);
		}
	}

	if (
		input.state === "computed" &&
		input.payoutRub !== null &&
		input.revenueRub > 0
	) {
		if (input.payoutRub < 0) {
			parts.push(
				"Выплата отрицательная: материалы дороже начисленного процента. " +
					"Это долг врача клинике, а не ноль — обнулять его нельзя.",
			);
		} else if (input.payoutRub === 0) {
			parts.push(
				"Удержания за материалы и ЗТЛ полностью покрыли начисленный процент. " +
					"Отрицательная выплата по ТК РФ запрещена (минимальная выплата 0,00 ₽).",
			);
		}
	}

	if (input.revenueRub === 0) {
		parts.push(
			"Кассы за период нет: оплаты по приёмам этого врача не проходили либо оплата не привязана к приёму.",
		);
	}

	if (input.rateRowCount > 1) {
		parts.push(
			`Активных ставок у врача найдено ${input.rateRowCount}; взята самая свежая по дате начала действия. ` +
				"Уникальности в базе нет — лишние ставки лучше отключить, чтобы расчёт не зависел от порядка строк.",
		);
	}

	return parts.join(" ");
}

/**
 * Один агрегатный запрос для ведомости выплат врачам.
 */
export function buildDoctorPayoutAggregateQuery(scope: DoctorPayoutScope) {
	const { organizationId, from, to } = scope;

	const paidVisits = db.$with("payout_paid_visits").as(
		db
			.select({ visitId: payments.visitId })
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.status, "paid"),
					isNotNull(payments.visitId),
					gte(payments.paidAt, from),
					lte(payments.paidAt, to),
				),
			)
			.groupBy(payments.visitId),
	);

	const revenue = db.$with("payout_revenue").as(
		db
			.select({
				doctorUserId: appointments.doctorUserId,
				revenueRub:
					sql<number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`.as(
						"revenue_rub",
					),
				paymentCount: sql<number>`count(*)::int`.as("payment_count"),
			})
			.from(payments)
			.innerJoin(visits, eq(payments.visitId, visits.id))
			.innerJoin(appointments, eq(visits.appointmentId, appointments.id))
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.status, "paid"),
					gte(payments.paidAt, from),
					lte(payments.paidAt, to),
					eq(visits.organizationId, organizationId),
					eq(appointments.organizationId, organizationId),
					isNotNull(appointments.doctorUserId),
				),
			)
			.groupBy(appointments.doctorUserId),
	);

	const materials = db.$with("payout_materials").as(
		db
			.select({
				doctorUserId: appointments.doctorUserId,
				materialCostRub: sql<number>`
					coalesce(
						sum(
							case
								when coalesce(${inventoryItems}."is_overhead", false) = true
								then 0
								else coalesce(${inventoryTransactions}."unit_cost_rub", 0) * abs(coalesce(${inventoryTransactions}."quantity_changed", 0))
							end
						),
						0
					)::numeric(12,2)
				`.as("material_cost_rub"),
				overheadCostRub: sql<number>`
					coalesce(
						sum(
							case
								when coalesce(${inventoryItems}."is_overhead", false) = true
								then coalesce(${inventoryTransactions}."unit_cost_rub", 0) * abs(coalesce(${inventoryTransactions}."quantity_changed", 0))
								else 0
							end
						),
						0
					)::numeric(12,2)
				`.as("overhead_cost_rub"),
				movements: sql<number>`count(*)::int`.as("movements"),
				movementsUnpriced: sql<number>`count(*) filter (
					where (${inventoryTransactions}."unit_cost_rub" is null
					   or ${inventoryTransactions}."unit_cost_rub" = 0
					   or ${inventoryTransactions}."quantity_changed" is null
					   or ${inventoryTransactions}."quantity_changed" = 0)
					  and coalesce(${inventoryItems}."is_overhead", false) = false
				)::int`.as("movements_unpriced"),
			})
			.from(inventoryTransactions)
			.innerJoin(
				paidVisits,
				eq(inventoryTransactions.visitId, paidVisits.visitId),
			)
			.innerJoin(visits, eq(inventoryTransactions.visitId, visits.id))
			.innerJoin(appointments, eq(visits.appointmentId, appointments.id))
			.leftJoin(
				inventoryItems,
				and(
					or(
						eq(inventoryTransactions.itemId, inventoryItems.id),
						eq(inventoryTransactions.inventoryItemId, inventoryItems.id),
					),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					eq(inventoryTransactions.transactionType, "auto_deduct"),
					eq(visits.organizationId, organizationId),
					eq(appointments.organizationId, organizationId),
					isNotNull(appointments.doctorUserId),
				),
			)
			.groupBy(appointments.doctorUserId),
	);

	const labOrdersCte = db.$with("payout_lab_orders").as(
		db
			.select({
				doctorUserId: labOrders.doctorId,
				labCostRub:
					sql<number>`coalesce(sum(coalesce(${labOrders.labCostRub}, 0)), 0)::numeric(12,2)`.as(
						"lab_cost_rub",
					),
				labOrdersCount: sql<number>`count(*)::int`.as("lab_orders_count"),
			})
			.from(labOrders)
			.where(
				and(
					eq(labOrders.organizationId, organizationId),
					isNotNull(labOrders.doctorId),
					inArray(labOrders.status, ["received", "ready", "ready_in_clinic", "fitted", "completed", "installed"]),
					eq(labOrders.isWarranty, false),
					gte(
						sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`,
						from,
					),
					lte(
						sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`,
						to,
					),
				),
			)
			.groupBy(labOrders.doctorId),
	);

	const rateCandidates = db.$with("payout_rate_candidates").as(
		db
			.select({
				userId: doctorCommissions.userId,
				commissionPct: doctorCommissions.commissionPct,
				materialDeductionPct: doctorCommissions.materialCostDeductionPct,
				labDeductionPct: doctorCommissions.labCostDeductionPct,
				effectiveFrom: doctorCommissions.effectiveFrom,
				rowNumber: sql<number>`row_number() over (
					partition by ${doctorCommissions}."user_id"
					order by ${doctorCommissions}."effective_from" desc, ${doctorCommissions}."created_at" desc
				)`.as("row_number"),
				rateRowCount:
					sql<number>`(count(*) over (partition by ${doctorCommissions}."user_id"))::int`.as(
						"rate_row_count",
					),
			})
			.from(doctorCommissions)
			.where(
				and(
					eq(doctorCommissions.organizationId, organizationId),
					eq(doctorCommissions.isActive, true),
					lte(doctorCommissions.effectiveFrom, to),
					isNotNull(doctorCommissions.userId),
				),
			),
	);

	const doctorFilter = scope.onlyDoctorUserId
		? and(
				eq(users.organizationId, organizationId),
				eq(users.id, scope.onlyDoctorUserId),
			)
		: eq(users.organizationId, organizationId);

	const periodRevenue = db.$with("payout_period_revenue").as(
		db
			.select({
				totalRevenueRub:
					sql<number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`.as(
						"total_revenue_rub",
					),
				totalPaymentCount: sql<number>`count(*)::int`.as("total_payment_count"),
				attributableRevenueRub: sql<number>`coalesce(
					sum(${payments.amountRub}) filter (where ${appointments.doctorUserId} is not null),
					0
				)::numeric(12,2)`.as("attributable_revenue_rub"),
			})
			.from(payments)
			.leftJoin(
				visits,
				and(
					eq(payments.visitId, visits.id),
					eq(visits.organizationId, organizationId),
				),
			)
			.leftJoin(
				appointments,
				and(
					eq(visits.appointmentId, appointments.id),
					eq(appointments.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.status, "paid"),
					gte(payments.paidAt, from),
					lte(payments.paidAt, to),
					scope.onlyDoctorUserId
						? eq(appointments.doctorUserId, scope.onlyDoctorUserId)
						: undefined,
				),
			),
	);

	const doctorRows = db.$with("payout_doctor_rows").as(
		db
			.select({
				doctorUserId: users.id,
				doctorName: users.fullName,
				role: users.role,
				isActive: users.isActive,
				revenueRub:
					sql<number>`coalesce(${revenue.revenueRub}, 0)::numeric(12,2)`.as(
						"doctor_revenue_rub",
					),
				paymentCount: sql<number>`coalesce(${revenue.paymentCount}, 0)::int`.as(
					"doctor_payment_count",
				),
				materialCostRub:
					sql<number>`coalesce(${materials.materialCostRub}, 0)::numeric(12,2)`.as(
						"doctor_material_cost_rub",
					),
				overheadCostRub:
					sql<number>`coalesce(${materials.overheadCostRub}, 0)::numeric(12,2)`.as(
						"doctor_overhead_cost_rub",
					),
				materialMovements:
					sql<number>`coalesce(${materials.movements}, 0)::int`.as(
						"doctor_material_movements",
					),
				materialMovementsUnpriced:
					sql<number>`coalesce(${materials.movementsUnpriced}, 0)::int`.as(
						"doctor_material_movements_unpriced",
					),
				labCostRub:
					sql<number>`coalesce(${labOrdersCte.labCostRub}, 0)::numeric(12,2)`.as(
						"doctor_lab_cost_rub",
					),
				labOrdersCount:
					sql<number>`coalesce(${labOrdersCte.labOrdersCount}, 0)::int`.as(
						"doctor_lab_orders_count",
					),
				commissionPct: rateCandidates.commissionPct,
				materialDeductionPct: rateCandidates.materialDeductionPct,
				labDeductionPct: rateCandidates.labDeductionPct,
				rateEffectiveFrom: rateCandidates.effectiveFrom,
				rateRowCount:
					sql<number>`coalesce(${rateCandidates.rateRowCount}, 0)::int`.as(
						"doctor_rate_row_count",
					),
			})
			.from(users)
			.leftJoin(revenue, eq(revenue.doctorUserId, users.id))
			.leftJoin(materials, eq(materials.doctorUserId, users.id))
			.leftJoin(labOrdersCte, eq(labOrdersCte.doctorUserId, users.id))
			.leftJoin(
				rateCandidates,
				and(
					eq(rateCandidates.userId, users.id),
					eq(rateCandidates.rowNumber, 1),
				),
			)
			.where(
				and(
					doctorFilter,
					or(
						eq(users.role, "doctor"),
						isNotNull(revenue.doctorUserId),
						isNotNull(materials.doctorUserId),
						isNotNull(labOrdersCte.doctorUserId),
					),
				),
			),
	);

	return db
		.with(
			paidVisits,
			revenue,
			materials,
			labOrdersCte,
			rateCandidates,
			periodRevenue,
			doctorRows,
		)
		.select({
			doctorUserId: doctorRows.doctorUserId,
			doctorName: doctorRows.doctorName,
			role: doctorRows.role,
			isActive: doctorRows.isActive,
			revenueRub: doctorRows.revenueRub,
			paymentCount: doctorRows.paymentCount,
			materialCostRub: doctorRows.materialCostRub,
			overheadCostRub: doctorRows.overheadCostRub,
			materialMovements: doctorRows.materialMovements,
			materialMovementsUnpriced: doctorRows.materialMovementsUnpriced,
			labCostRub: doctorRows.labCostRub,
			labOrdersCount: doctorRows.labOrdersCount,
			commissionPct: doctorRows.commissionPct,
			materialDeductionPct: doctorRows.materialDeductionPct,
			labDeductionPct: doctorRows.labDeductionPct,
			rateEffectiveFrom: doctorRows.rateEffectiveFrom,
			rateRowCount: doctorRows.rateRowCount,
			totalRevenueRub: periodRevenue.totalRevenueRub,
			totalPaymentCount: periodRevenue.totalPaymentCount,
			attributableRevenueRub: periodRevenue.attributableRevenueRub,
		})
		.from(periodRevenue)
		.leftJoin(doctorRows, sql`true`);
}

const METHOD_NOTE =
	"Касса — только платежи со статусом «оплачен», по дате оплаты в периоде. " +
	"Врач определяется по цепочке оплата → приём → врач приёма: отдельного поля врача у платежа нет. " +
	"Материалы удерживаются по тем же визитам, чья оплата вошла в период. " +
	"Порядок: сначала процент от кассы, затем вычет доли себестоимости материалов.";

/**
 * Выплаты всем врачам клиники за период.
 */
export async function doctorPayouts(
	scope: DoctorPayoutScope,
): Promise<DoctorPayoutReport> {
	const [snapshotRows, drillDown] = await withTenantCtx(
		scope.organizationId,
		async () => {
			const aggregates = await buildDoctorPayoutAggregateQuery(scope);
			const details = await fetchDoctorPayoutDrillDownDetails(scope);
			return [aggregates, details];
		},
	);

	const [snapshotHead] = snapshotRows;
	const aggregateRows = snapshotRows.filter(
		(
			row,
		): row is typeof row & {
			doctorUserId: string;
			doctorName: string;
			role: string;
			isActive: boolean;
		} => row.doctorUserId !== null,
	);

	const rows: DoctorPayoutRow[] = aggregateRows.map((row) => {
		const revenueRub = moneyFromDb(row.revenueRub, "выручка врача");
		const materialCostRub = moneyFromDb(
			row.materialCostRub,
			"себестоимость материалов",
		);
		const overheadCostRub = moneyFromDb(
			row.overheadCostRub ?? 0,
			"общеклинические расходники",
		);
		const materialMovements = Number(row.materialMovements ?? 0);
		const materialMovementsUnpriced = Number(
			row.materialMovementsUnpriced ?? 0,
		);
		const labCostRub = moneyFromDb(row.labCostRub, "расходы ЗТЛ");
		const labOrdersCount = Number(row.labOrdersCount ?? 0);
		const commissionPct = percentFromDb(
			row.commissionPct,
			"ставка врача (commission_pct)",
		);
		const materialDeductionPct = percentFromDb(
			row.materialDeductionPct,
			"процент удержания за материалы (material_cost_deduction_pct)",
		);
		const labDeductionPct = percentFromDb(
			row.labDeductionPct,
			"процент удержания за лабораторию (lab_cost_deduction_pct)",
		);

		const computed = computeDoctorPayout({
			revenueRub,
			materialCostRub,
			materialMovements,
			commissionPct,
			materialDeductionPct,
			overheadCostRub,
			labCostRub,
			labOrdersCount,
			labDeductionPct,
		});
		const materialsState = materialsStateOf(
			materialMovements,
			materialMovementsUnpriced,
		);
		const rateRowCount = Number(row.rateRowCount ?? 0);

		const doctorVisitPayments = drillDown.paidVisitsDetails.filter(
			(v) => v.doctorUserId === row.doctorUserId,
		);

		const visitsMap = new Map<string, DoctorPayoutVisit>();
		for (const v of doctorVisitPayments) {
			const paymentRub = moneyFromDb(v.paymentAmountRub, "сумма оплаты визита");
			const existing = visitsMap.get(v.visitId);
			if (existing) {
				visitsMap.set(v.visitId, {
					...existing,
					revenueRub: roundMoney(new Decimal(existing.revenueRub).plus(paymentRub)),
					paymentCount: existing.paymentCount + 1,
				});
			} else {
				const servicesForVisit = drillDown.visitServices
					.filter((srv) => srv.visitId === v.visitId)
					.map((srv) => {
						const specialty = classifyServiceCategory(
							srv.category || srv.title,
							srv.order804nCode,
						);
						return {
							id: srv.id,
							title: srv.title,
							order804nCode: srv.order804nCode ?? "A16.07.002",
							category: srv.category ?? null,
							specialty,
							toothCode: srv.toothCode ?? null,
							priceRub: moneyFromDb(srv.priceRub, "цена услуги"),
							quantity: Number(srv.quantity ?? 1),
						};
					});

				const materialsForVisit = drillDown.visitMaterials
					.filter((mat) => mat.visitId === v.visitId)
					.map((mat) => {
						const qty = Math.abs(Number(mat.quantityChanged ?? 0));
						const unitCost = moneyFromDb(mat.unitCostRub, "себестоимость материала");
						const totalCost = roundMoney(new Decimal(qty).times(new Decimal(unitCost)));
						const matName = mat.name ?? "Расходный материал";
						const isOverhead = isGeneralClinicOverheadConsumable(matName);
						return {
							id: mat.id,
							name: matName,
							quantity: qty,
							unit: mat.unit ?? "шт",
							unitCostRub: unitCost,
							totalCostRub: totalCost,
							isOverheadConsumable: isOverhead,
							coveredByClinic: isOverhead,
						};
					});

				const visitIso = v.appointmentStartTime
					? new Date(v.appointmentStartTime).toISOString()
					: new Date(v.visitCreatedAt).toISOString();
				const paidIso = v.paidAt
					? new Date(v.paidAt).toISOString()
					: visitIso;

				visitsMap.set(v.visitId, {
					visitId: v.visitId,
					appointmentId: v.appointmentId,
					paidAt: paidIso,
					visitDate: visitIso,
					patientId: v.patientId,
					patientName: v.patientName,
					medicalCardNumber: extractMedicalCardNumber(v.patientId, v.administrativeProfile),
					revenueRub: paymentRub,
					paymentCount: 1,
					services: servicesForVisit,
					materials: materialsForVisit,
				});
			}
		}

		const doctorVisitsList = Array.from(visitsMap.values()).sort(
			(a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
		);

		const doctorRawLabOrders = drillDown.rawLabOrders.filter(
			(order) => order.doctorId === row.doctorUserId,
		);

		const labPct = isUsablePercent(labDeductionPct)
			? labDeductionPct
			: (isUsablePercent(commissionPct) ? commissionPct : 100);

		const doctorLabOrdersList: DoctorPayoutLabOrder[] = doctorRawLabOrders.map((order) => {
			const itemsForOrder = drillDown.rawLabItems.filter(
				(item) => item.labOrderId === order.id,
			);
			const price = moneyFromDb(order.priceRub, "стоимость наряда ЗТЛ");
			const notesLower = ((order.clinicalNotes || "") + " " + (order.status || "")).toLowerCase();
			const isWarranty =
				Boolean((order as { isWarranty?: boolean }).isWarranty) ||
				notesLower.includes("гарант") ||
				notesLower.includes("warranty") ||
				notesLower.includes("переделк") ||
				notesLower.includes("рекламац");
			const withheld = isWarranty ? 0 : percentOfMoney(price, labPct);
			const tooth = itemsForOrder.length > 0
				? itemsForOrder.map((item) => String(item.toothFdi)).join(", ")
				: (order.toothFdi || "—");
			const restoration = itemsForOrder.length > 0
				? itemsForOrder.map((item) => humanizeRestorationType(item.restorationType, item.material)).join("; ")
				: humanizeRestorationType(null, order.material);

			return {
				id: order.id,
				orderNumber: order.secureToken
					? order.secureToken.slice(0, 8).toUpperCase()
					: order.id.slice(0, 8).toUpperCase(),
				toothFdi: tooth,
				restorationType: restoration,
				material: order.material,
				patientName: order.patientName ?? "Пациент",
				status: order.status,
				completedAt: order.completedAt ? new Date(order.completedAt).toISOString() : null,
				priceRub: price,
				withheldRub: withheld,
				deductionPct: isWarranty ? 0 : labPct,
				isWarranty,
				warrantyCoveredByClinicRub: isWarranty ? price : 0,
			};
		});

		const doctorRates = drillDown.doctorSpecialtyRates.filter(
			(r) => r.userId === row.doctorUserId,
		);
		const categoryTotals = new Map<DentalSpecialtyCategory, number>();
		for (const v of doctorVisitsList) {
			for (const srv of v.services) {
				const cat = srv.specialty ?? "other";
				const current = categoryTotals.get(cat) ?? 0;
				const srvCost = roundMoney(new Decimal(srv.priceRub).times(srv.quantity));
				categoryTotals.set(cat, roundMoney(new Decimal(current).plus(srvCost)));
			}
		}

		const categoryBreakdown: CategoryAccrualBreakdown[] = [];
		for (const [cat, grossRub] of categoryTotals.entries()) {
			const matchedRate = doctorRates.find(
				(r) =>
					(r.serviceCategory && r.serviceCategory.toLowerCase() === cat.toLowerCase()) ||
					(r.specialty && r.specialty.toLowerCase() === cat.toLowerCase()),
			);
			const appliedPct =
				matchedRate && isUsablePercent(percentFromDb(matchedRate.commissionPct, "specialty commission"))
					? percentFromDb(matchedRate.commissionPct, "specialty commission")!
					: (commissionPct ?? 0);

			const grossKop = Math.round(grossRub * 100);
			const accruedRub = percentOfMoney(grossRub, appliedPct);
			const accruedKop = Math.round(accruedRub * 100);

			categoryBreakdown.push({
				category: cat,
				categoryNameRu: DENTAL_SPECIALTY_NAMES_RU[cat] ?? cat,
				appliedPercent: appliedPct,
				grossRevenueKop: grossKop,
				grossRevenueRub: grossRub,
				netBaseKop: grossKop,
				netBaseRub: grossRub,
				accruedKop: accruedKop,
				accruedRub,
			});
		}

		return {
			doctorUserId: row.doctorUserId,
			doctorName: row.doctorName,
			role: row.role,
			isActive: row.isActive,
			revenueRub,
			paymentCount: Number(row.paymentCount ?? 0),
			materialCostRub,
			overheadCostRub,
			materialMovements,
			materialMovementsUnpriced,
			materialsState,
			labCostRub,
			labOrdersCount,
			withheldLabRub: computed.withheldLabRub,
			commissionPct,
			materialDeductionPct,
			rateEffectiveFrom: row.rateEffectiveFrom
				? new Date(row.rateEffectiveFrom).toISOString()
				: null,
			rateRowCount,
			state: computed.state,
			accruedRub: computed.accruedRub,
			withheldMaterialRub: computed.withheldMaterialRub,
			payoutRub: computed.payoutRub,
			...(categoryBreakdown.length > 0 ? { categoryBreakdown } : {}),
			note: payoutRowNote({
				state: computed.state,
				materialsState,
				materialMovementsUnpriced,
				commissionPct,
				rateRowCount,
				payoutRub: computed.payoutRub,
				revenueRub,
			}),
			visits: doctorVisitsList,
			labOrders: doctorLabOrdersList,
		};
	});

	rows.sort(
		(left, right) =>
			new Decimal(right.revenueRub).minus(new Decimal(left.revenueRub)).toNumber() ||
			left.doctorName.localeCompare(right.doctorName, "ru"),
	);

	const totalRevenueRub = moneyFromDb(
		snapshotHead?.totalRevenueRub ?? 0,
		"касса за период",
	);
	const attributableRevenueRub = moneyFromDb(
		snapshotHead?.attributableRevenueRub ?? 0,
		"касса, отнесённая к врачам",
	);

	let accrued = new Decimal(0);
	let withheldMaterial = new Decimal(0);
	let withheldLab = new Decimal(0);
	let payout = new Decimal(0);
	let materialCost = new Decimal(0);
	let totalOverheadCost = new Decimal(0);
	let totalLabCost = new Decimal(0);
	let doctorsCounted = 0;
	let doctorsWithoutRate = 0;

	for (const row of rows) {
		materialCost = materialCost.plus(new Decimal(row.materialCostRub));
		totalOverheadCost = totalOverheadCost.plus(new Decimal(row.overheadCostRub ?? 0));
		totalLabCost = totalLabCost.plus(new Decimal(row.labCostRub));
		if (
			row.state === "computed" &&
			row.payoutRub !== null &&
			row.withheldMaterialRub !== null
		) {
			accrued = accrued.plus(new Decimal(row.accruedRub ?? 0));
			withheldMaterial = withheldMaterial.plus(new Decimal(row.withheldMaterialRub));
			withheldLab = withheldLab.plus(new Decimal(row.withheldLabRub ?? 0));
			payout = payout.plus(new Decimal(row.payoutRub));
			doctorsCounted += 1;
		} else {
			doctorsWithoutRate += 1;
		}
	}

	const limitations: string[] = [];
	if (doctorsWithoutRate > 0) {
		limitations.push(
			`Итог к выплате посчитан по ${doctorsCounted} врач(ам) из ${rows.length}: ` +
				`у ${doctorsWithoutRate} не задана пригодная ставка. Это не ноль к выплате, а отсутствие расчёта.`,
		);
	}
	if (rows.length > 0 && rows.every((row) => row.materialMovements === 0)) {
		limitations.push(
			"Себестоимость материалов не удержана ни у одного врача: списаний по оплаченным визитам нет. " +
				"Пока склад не ведётся и материалы не списываются при подписании приёма, удерживать нечего.",
		);
	}
	if (
		new Decimal(totalRevenueRub)
			.minus(new Decimal(attributableRevenueRub))
			.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
			.greaterThan(0)
	) {
		limitations.push(
			"Часть кассы периода не отнесена ни к одному врачу: платёж не связан с приёмом. " +
				"Чтобы деньги попадали врачу, оплату нужно оформлять из визита, созданного из записи в расписании.",
		);
	}
	limitations.push(
		"Возвраты в расчёт не входят: перевод платежа в статус «возврат» в рабочем коде не выполняет никто, " +
			"и колонка возвратов была бы гарантированным нулём.",
	);

	return {
		period: { from: scope.from.toISOString(), to: scope.to.toISOString() },
		rows,
		totals: {
			revenueRub: totalRevenueRub,
			paymentCount: Number(snapshotHead?.totalPaymentCount ?? 0),
			attributableRevenueRub,
			unattributedRevenueRub: roundMoney(
				new Decimal(totalRevenueRub).minus(new Decimal(attributableRevenueRub)),
			),
			materialCostRub: roundMoney(materialCost),
			overheadCostRub: roundMoney(totalOverheadCost),
			labCostRub: roundMoney(totalLabCost),
			accruedRub: roundMoney(accrued),
			withheldMaterialRub: roundMoney(withheldMaterial),
			withheldLabRub: roundMoney(withheldLab),
			payoutRub: roundMoney(payout),
			doctorsCounted,
			doctorsWithoutRate,
		},
		methodNote: METHOD_NOTE,
		limitations,
		isEmpty: rows.length === 0,
	};
}
