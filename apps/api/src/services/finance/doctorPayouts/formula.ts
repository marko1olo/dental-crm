import { Decimal } from "decimal.js";
import type {
	DoctorPayoutMaterialsState,
	DoctorPayoutState,
	PayoutFormulaInput,
	PayoutFormulaResult,
} from "./types.js";
import {
	isUsablePercent,
	percentOfMoney,
	roundMoney,
} from "./math.js";

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
	const accruedRub = percentOfMoney(netRevenueRub, input.commissionPct);
	const refundClawbackRub = input.refundRub && input.refundRub > 0
		? percentOfMoney(input.refundRub, input.commissionPct)
		: 0;

	// Вычет материалов
	let withheldMaterialRub: number | null = 0;
	if (input.materialMovements > 0 && input.materialCostRub > 0) {
		if (!isUsablePercent(input.materialDeductionPct)) {
			// Себестоимость есть, а доля удержания неизвестна.
			return {
				state: "material_policy_missing",
				accruedRub,
				withheldMaterialRub: null,
				withheldLabRub: null,
				payoutRub: null,
			};
		}
		withheldMaterialRub = percentOfMoney(
			input.materialCostRub,
			input.materialDeductionPct,
		);
	}

	// Вычет зуботехнической лаборатории (ЗТЛ):
	// При гарантийных переделках (isWarranty: true) расходы ЗТЛ с врача НЕ удерживаются,
	// а относятся на рекламационный фонд клиники!
	const labOrdersCount = input.labOrdersCount ?? 0;
	const isWarranty = Boolean(input.isWarranty);
	const labCostRub = isWarranty ? 0 : (input.labCostRub ?? 0);
	let withheldLabRub: number | null = 0;
	if (!isWarranty && labOrdersCount > 0 && labCostRub > 0) {
		const labPct = isUsablePercent(input.labDeductionPct ?? null)
			? (input.labDeductionPct as number)
			: input.commissionPct;
		withheldLabRub = percentOfMoney(labCostRub, labPct);
	}

	const totalWithheld = new Decimal(withheldMaterialRub ?? 0).plus(
		new Decimal(withheldLabRub ?? 0),
	);
	// Запрет отрицательной зарплаты по ТК РФ: выплата не может быть меньше нуля (payout >= 0)
	const rawPayout = new Decimal(accruedRub).minus(totalWithheld);
	const payoutRub = roundMoney(Decimal.max(0, rawPayout));

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
 * Текст строки: причина и действие. Возвращается сервером, а не собирается на
 * клиенте, чтобы объяснение нельзя было потерять при вёрстке.
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
				"Начислено процентом от кассы, затем удержана доля себестоимости материалов и лаборатории (ЗТЛ).",
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
