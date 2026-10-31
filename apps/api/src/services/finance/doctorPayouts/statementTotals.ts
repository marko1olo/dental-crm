import { Decimal } from "decimal.js";
import type { DoctorPayoutRow, DoctorPayoutTotals } from "./types.js";
import { moneyFromDb } from "./dbParsers.js";
import { roundMoney } from "./math.js";

export const METHOD_NOTE =
	"Касса — только платежи со статусом «оплачен», по дате оплаты в периоде. " +
	"Врач определяется по цепочке оплата → приём → врач приёма: отдельного поля врача у платежа нет. " +
	"Материалы удерживаются по тем же визитам, чья оплата вошла в период. " +
	"Порядок: сначала процент от кассы, затем вычет доли себестоимости материалов.";

export interface SnapshotHeadInput {
	readonly totalRevenueRub?: unknown;
	readonly attributableRevenueRub?: unknown;
	readonly totalPaymentCount?: unknown;
}

/**
 * Расчет сводных итогов ведомости по всем врачам клиники за период.
 */
export function computeDoctorPayoutReportTotals(
	rows: readonly DoctorPayoutRow[],
	snapshotHead: SnapshotHeadInput | undefined,
): {
	totals: DoctorPayoutTotals;
	totalRevenueRub: number;
	attributableRevenueRub: number;
	doctorsCounted: number;
	doctorsWithoutRate: number;
} {
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

	const totals: DoctorPayoutTotals = {
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
	};

	return {
		totals,
		totalRevenueRub,
		attributableRevenueRub,
		doctorsCounted,
		doctorsWithoutRate,
	};
}

/**
 * Формирование аналитических примечаний и ограничений к расчету.
 */
export function buildDoctorPayoutLimitations(
	rows: readonly DoctorPayoutRow[],
	totalRevenueRub: number,
	attributableRevenueRub: number,
	doctorsCounted: number,
	doctorsWithoutRate: number,
): string[] {
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
	return limitations;
}
