import { Decimal } from "decimal.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	classifyServiceCategory,
	DENTAL_SPECIALTY_NAMES_RU,
	type DentalSpecialtyCategory,
	type CategoryAccrualBreakdown,
	generateDoctorT51Html,
	type DoctorT51PrintPayload,
	type DoctorT51VisitItem,
	type DoctorT51LabItem,
	isGeneralClinicOverheadConsumable,
} from "@dental/shared";
import type {
	DoctorPayoutScope,
	DoctorPayoutReport,
	DoctorPayoutRow,
	DoctorPayoutVisit,
	DoctorPayoutLabOrder,
} from "./types.js";
import {
	roundMoney,
	percentOfMoney,
	isUsablePercent,
} from "./math.js";
import {
	computeDoctorPayout,
	materialsStateOf,
	payoutRowNote,
} from "./formula.js";
import {
	extractMedicalCardNumber,
	humanizeRestorationType,
} from "./helpers.js";
import { buildDoctorPayoutAggregateQuery } from "./queries.js";
import { fetchDoctorPayoutDrillDownDetails } from "./drillDown.js";

/**
 * Число из базы. numeric приходит то числом (разбор типов включён в
 * db/moneyTypeParsers.ts), то строкой (drizzle возвращает String для колонок
 * без mode: "number"). Обе формы нормальны; молчаливый NaN на деньгах — нет.
 */
function moneyFromDb(value: unknown, field: string): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
	}
	if (typeof value === "string" && value.trim() !== "") {
		try {
			return new Decimal(value.trim()).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
		} catch {
			// fall through to error
		}
	}
	if (value === null || value === undefined) return 0;
	throw new Error(
		`Поле «${field}» пришло из базы в непригодном для денег виде: ${JSON.stringify(value)}`,
	);
}

/** Процент из базы: null остаётся null, мусор — ошибка, а не тихий ноль. */
function percentFromDb(value: unknown, field: string): number | null {
	if (value === null || value === undefined) return null;
	if (typeof value === "number" && Number.isFinite(value)) {
		return new Decimal(value).toNumber();
	}
	if (typeof value === "string" && value.trim() !== "") {
		try {
			return new Decimal(value.trim()).toNumber();
		} catch {
			// fall through to error
		}
	}
	throw new Error(
		`Поле «${field}» пришло из базы в непригодном для процента виде: ${JSON.stringify(value)}`,
	);
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

	/*
	 * Контрольная сумма лежит в КАЖДОЙ строке ответа (левое соединение по `true`),
	 * поэтому читается из первой. Строк всегда минимум одна: ведущая сторона —
	 * агрегат без `group by`.
	 */
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

		// Build visits registry for this doctor
		const doctorVisitPayments = drillDown.paidVisitsDetails.filter(
			(v) => v.doctorUserId === row.doctorUserId,
		);

		// Group payments by visitId
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

		// Build lab orders registry for this doctor
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
			// Гарантийные переделки НЕ удерживаются с врача (0 ₽), а относятся на рекламационный фонд клиники
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

		// Build specialty category breakdown
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
				grossRevenueKop: grossKop as any,
				grossRevenueRub: grossRub,
				netBaseKop: grossKop as any,
				netBaseRub: grossRub,
				accruedKop: accruedKop as any,
				accruedRub,
			});
		}

		const t51Visits: DoctorT51VisitItem[] = doctorVisitsList.flatMap((v) =>
			v.services.map((srv) => {
				const srvTotal = roundMoney(new Decimal(srv.priceRub).times(srv.quantity));
				const srvAccrued = percentOfMoney(srvTotal, commissionPct ?? 0);
				return {
					visitId: v.visitId,
					visitDate: v.visitDate,
					patientName: v.patientName,
					medicalCardNumber: v.medicalCardNumber,
					serviceTitle: srv.title,
					order804nCode: srv.order804nCode,
					toothCode: srv.toothCode,
					priceRub: srvTotal,
					accruedRub: srvAccrued,
				};
			}),
		);

		const t51LabOrders: DoctorT51LabItem[] = doctorLabOrdersList.map((lo) => ({
			orderNumber: lo.orderNumber,
			patientName: lo.patientName,
			restorationType: lo.restorationType,
			toothFdi: lo.toothFdi,
			priceRub: lo.priceRub,
			withheldRub: lo.withheldRub,
			isWarranty: Boolean(lo.isWarranty),
		}));

		const t51Payload: DoctorT51PrintPayload = {
			organizationName: drillDown.organizationName,
			organizationInn: drillDown.organizationInn ?? "",
			doctorName: row.doctorName,
			personnelNumber: row.doctorUserId.slice(0, 8).toUpperCase(),
			specialtyTitle: row.role === "doctor" ? "Врач-стоматолог" : row.role,
			periodFromIso: scope.from.toISOString(),
			periodToIso: scope.to.toISOString(),
			grossRevenueRub: revenueRub,
			netBaseRevenueRub: roundMoney(
				Decimal.max(
					0,
					new Decimal(revenueRub)
						.minus(new Decimal(labCostRub))
						.minus(new Decimal(materialCostRub)),
				),
			),
			pieceworkAccruedRub: computed.accruedRub ?? 0,
			totalAccruedRub: computed.accruedRub ?? 0,
			ndflTaxRub: roundMoney(new Decimal(computed.accruedRub ?? 0).times(0.13)),
			withheldLabRub: computed.withheldLabRub ?? 0,
			withheldMaterialRub: computed.withheldMaterialRub ?? 0,
			overheadConsumablesCoveredRub: overheadCostRub,
			netPayoutRub: computed.payoutRub ?? 0,
			...(categoryBreakdown.length > 0 ? { categoryBreakdown } : {}),
			...(t51Visits.length > 0 ? { visits: t51Visits } : {}),
			...(t51LabOrders.length > 0 ? { labOrders: t51LabOrders } : {}),
		};

		const t51Html = generateDoctorT51Html(t51Payload);

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
			t51Html,
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
