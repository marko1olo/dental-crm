/**
 * packages/shared/src/finance/doctorPayoutCalculator.ts
 *
 * DENTE Dental CRM — Canonical Statutory Doctor Payout & Piece-Rate Accrual Engine.
 * Single Source of Truth (SSOT) providing kopeck-exact integer arithmetic
 * for doctor commissions, material deductions, lab withholdings, and refund clawbacks.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 friction, non-blocking guidance)
 * - Mandate 8i: Strict Integer Kopeck Arithmetic, zero float drift (IEEE-754)
 * - Mandate 8s: Universal SSOT & Anti-Duplication Law
 * - Labor Code of the Russian Federation (ТК РФ ст. 137, 192, payout >= 0)
 */

import { z } from "zod";
import { kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";

// ─── 1. CONSTANTS & LIMITS ───────────────────────────────────────────────────

/** Максимальный период расчета ведомости выплат (в днях). */
export const MAX_PAYOUT_PERIOD_DAYS = 93;

// ─── 2. DOMAIN TYPES & STATES ────────────────────────────────────────────────

export type DoctorPayoutScope = "all" | "self";

export type DoctorPayoutState =
	| "rate_missing"
	| "rate_invalid"
	| "material_policy_missing"
	| "computed";

export type DoctorPayoutMaterialsState =
	| "no_movements"
	| "cost_missing"
	| "counted";

export interface ResolvedPayoutPeriod {
	readonly fromIso: string;
	readonly toIso: string;
	readonly isDefault: boolean;
	readonly periodLabelRu: string;
}

export interface PayoutFormulaInput {
	readonly revenueRub: number;
	readonly materialCostRub: number;
	readonly materialMovements: number;
	readonly commissionPct: number | null;
	readonly materialDeductionPct: number | null;
	readonly overheadCostRub?: number | undefined;
	readonly labCostRub?: number | undefined;
	readonly labOrdersCount?: number | undefined;
	readonly labDeductionPct?: number | null | undefined;
	readonly isWarranty?: boolean | undefined;
	readonly refundRub?: number | undefined;
	readonly refundCount?: number | undefined;
	readonly payoutModel?: "percentage" | "chair_rental" | undefined;
	readonly chairRentalRub?: number | undefined;
	readonly advanceRub?: number | undefined;
	readonly taxRegime?: "employee" | "self_employed" | undefined;
}

export interface PayoutFormulaResult {
	readonly state: DoctorPayoutState;
	readonly payoutModel?: "percentage" | "chair_rental" | undefined;
	readonly accruedRub: number | null;
	readonly chairRentalRub?: number | undefined;
	readonly withheldMaterialRub: number | null;
	readonly withheldLabRub: number | null;
	readonly payoutRub: number | null;
	readonly advanceRub?: number | undefined;
	readonly mainPayoutRub?: number | undefined;
	readonly npdTaxRub?: number | undefined;
	readonly refundClawbackRub?: number | undefined;
}

// ─── 3. KOPECK-EXACT MATHEMATICAL ENGINE ─────────────────────────────────────

/**
 * Копейки: округление половины вверх (Round Half Up), как в регламентированном бухучете.
 * Защищено от двоичной плавающей точки IEEE-754.
 */
export function roundMoney(value: number | string | { toString(): string }): number {
	const num = typeof value === "number" ? value : Number(value?.toString());
	if (!Number.isFinite(num) || Number.isNaN(num)) return 0;
	const sign = num < 0 ? -1 : 1;
	const abs = Math.abs(num);
	const kopecks = Math.floor(abs * 100 + 0.5000000001);
	return (sign * kopecks) / 100;
}

/**
 * Процент от денежной суммы, округленный до копейки (Round Half Up).
 */
export function percentOfMoney(amountRub: number, percent: number): number {
	if (!Number.isFinite(amountRub) || !Number.isFinite(percent)) return 0;
	const kop = Math.round(amountRub * 100);
	const rawKop = (kop * percent) / 100;
	const sign = rawKop < 0 ? -1 : 1;
	const roundedKop = Math.floor(Math.abs(rawKop) + 0.5000000001) * sign;
	return roundedKop / 100;
}

/**
 * Пригодна ли ставка для расчета зарплаты (0 <= percent <= 100).
 */
export function isUsablePercent(value: number | null | undefined): value is number {
	return value !== null && value !== undefined && Number.isFinite(value) && value >= 0 && value <= 100;
}

// ─── 4. DOCTOR PAYOUT CALCULATION CORE ───────────────────────────────────────

/**
 * Расчет выплаты врачу за период с гарантией копеечной точности.
 *
 * Начислено = (касса − возвраты) × ставка.
 * Удержано = себестоимость материалов × процент удержания + расходы ЗТЛ (кроме гарантии) × процент удержания.
 * По ТК РФ выплата не может быть отрицательной (payout >= 0).
 */
export function computeDoctorPayout(input: PayoutFormulaInput): PayoutFormulaResult {
	if (input.payoutModel === "chair_rental") {
		const netRevenueRub = roundMoney(
			(input.revenueRub ?? 0) - (input.refundRub ?? 0),
		);
		const chairRentalRub = roundMoney(Math.max(0, input.chairRentalRub ?? 0));
		let withheldMaterialRub: number | null = 0;
		if (input.materialMovements > 0 && input.materialCostRub > 0) {
			withheldMaterialRub = isUsablePercent(input.materialDeductionPct)
				? percentOfMoney(input.materialCostRub, input.materialDeductionPct)
				: roundMoney(input.materialCostRub);
		}
		const isWarranty = Boolean(input.isWarranty);
		const labCostRub = isWarranty ? 0 : (input.labCostRub ?? 0);
		let withheldLabRub: number | null = 0;
		if (!isWarranty && labCostRub > 0) {
			withheldLabRub = isUsablePercent(input.labDeductionPct)
				? percentOfMoney(labCostRub, input.labDeductionPct)
				: roundMoney(labCostRub);
		}
		const totalDeductions = roundMoney(chairRentalRub + (withheldMaterialRub ?? 0) + (withheldLabRub ?? 0));
		const rawPayout = netRevenueRub - totalDeductions;
		const payoutRub = roundMoney(Math.max(0, rawPayout));
		const advanceRub = input.advanceRub ? roundMoney(Math.max(0, input.advanceRub)) : 0;
		const mainPayoutRub = roundMoney(Math.max(0, payoutRub - advanceRub));
		const npdTaxRub = percentOfMoney(payoutRub, 6);

		return {
			state: "computed",
			payoutModel: "chair_rental",
			accruedRub: netRevenueRub,
			chairRentalRub,
			withheldMaterialRub,
			withheldLabRub,
			payoutRub,
			advanceRub,
			mainPayoutRub,
			npdTaxRub,
			refundClawbackRub: 0,
		};
	}

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
		(input.revenueRub ?? 0) - (input.refundRub ?? 0),
	);
	const accruedRub = percentOfMoney(netRevenueRub, input.commissionPct);
	const refundClawbackRub =
		input.refundRub && input.refundRub > 0
			? percentOfMoney(input.refundRub, input.commissionPct)
			: 0;

	// Вычет материалов
	let withheldMaterialRub: number | null = 0;
	if (input.materialMovements > 0 && input.materialCostRub > 0) {
		if (!isUsablePercent(input.materialDeductionPct)) {
			// Себестоимость есть, а доля удержания неизвестна
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

	const totalWithheld = roundMoney((withheldMaterialRub ?? 0) + (withheldLabRub ?? 0));
	// Запрет отрицательной зарплаты по ТК РФ: выплата не может быть меньше нуля (payout >= 0)
	const rawPayout = accruedRub - totalWithheld;
	const payoutRub = roundMoney(Math.max(0, rawPayout));
	const advanceRub = input.advanceRub ? roundMoney(Math.max(0, input.advanceRub)) : 0;
	const mainPayoutRub = roundMoney(Math.max(0, payoutRub - advanceRub));
	const npdTaxRub = input.taxRegime === "self_employed" ? percentOfMoney(payoutRub, 6) : undefined;

	return {
		state: "computed",
		payoutModel: "percentage",
		accruedRub,
		withheldMaterialRub,
		withheldLabRub,
		payoutRub,
		advanceRub,
		mainPayoutRub,
		npdTaxRub,
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
 * Текст строки: причина и действие для понятного объяснения врачу и владельцу.
 */
export function payoutRowNote(input: {
	readonly state: DoctorPayoutState;
	readonly materialsState: DoctorPayoutMaterialsState;
	readonly materialMovementsUnpriced: number;
	readonly commissionPct: number | null;
	readonly rateRowCount: number;
	readonly payoutRub: number | null;
	readonly revenueRub: number;
	readonly payoutModel?: "percentage" | "chair_rental" | undefined;
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
			if (input.payoutModel === "chair_rental") {
				parts.push(
					"Расчёт по модели суверенной аренды кресла (соло-врач): из общей кассы вычтены аренда кресла, расходы ЗТЛ и материалы.",
				);
			} else {
				parts.push(
					"Начислено процентом от кассы, затем удержана доля себестоимости материалов и лаборатории (ЗТЛ).",
				);
			}
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

// ─── 5. CLINICAL & PERIOD HELPERS ────────────────────────────────────────────

/**
 * Извлекает валидный номер медицинской карты пациента (Мандаты 8e, 8x — чистый доменный язык).
 * Поддерживает как сигнатуру (cardNumber, patientId), так и (patientId, adminProfile).
 */
export function extractMedicalCardNumber(
	arg1: string | null | undefined,
	arg2?: unknown,
): string {
	if (arg2 && typeof arg2 === "object") {
		const prof = arg2 as Record<string, unknown>;
		if (typeof prof.cardNumber === "string" && prof.cardNumber.trim()) {
			return prof.cardNumber.trim();
		}
		if (typeof prof.medicalCardNumber === "string" && prof.medicalCardNumber.trim()) {
			return prof.medicalCardNumber.trim();
		}
		if (typeof prof.insurancePolicyNumber === "string" && prof.insurancePolicyNumber.trim()) {
			return `ОМС ${prof.insurancePolicyNumber.trim()}`;
		}
	}
	if (arg1 && arg1.trim().length > 0 && typeof arg2 === "string") {
		return arg1.trim();
	}
	const patientId = typeof arg2 === "string" ? arg2 : (arg1 ?? "");
	const clean = patientId.replace(/-/g, "").slice(0, 6).toUpperCase();
	return `МК-${clean || "UNKNOWN"}`;
}

/**
 * Возвращает понятное русское наименование зуботехнической конструкции.
 * Поддерживает как стандартный код, так и пару (restorationType, material).
 */
export function humanizeRestorationType(
	restorationType?: string | null,
	material?: string | null,
): string {
	const map: Record<string, string> = {
		crown_monolithic: "Коронка монолитная (CAD/CAM)",
		crown_zirconia: "Коронка из диоксида циркония",
		crown_emax: "Безметалловая коронка E.max",
		crown_metal_ceramic: "Металлокерамическая коронка",
		crown_temporary: "Временная фрезерованная коронка (PMMA)",
		veneer: "Керамический винир",
		inlay_onlay: "Вкладка / Накладка (Inlay/Onlay)",
		bridge_pontic: "Мостовидный протез",
		implant_abutment: "Индивидуальный циркониевый абатмент",
		aligners_setup: "Сетап элайнеров",
		clasp_denture: "Бюгельный протез на замках",
		full_denture: "Полный съемный пластиночный протез",
	};
	if (restorationType && map[restorationType]) {
		return map[restorationType];
	}
	return restorationType || material || "Зуботехническая конструкция";
}

/**
 * Разрешает даты начала и конца периода для отчета выплат.
 */
export function resolvePayoutPeriod(query: {
	from?: string | undefined;
	to?: string | undefined;
	month?: string | undefined;
}): ResolvedPayoutPeriod {
	const now = new Date();

	if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
		const [yearStr, monthStr] = query.month.split("-");
		const year = Number(yearStr);
		const month = Number(monthStr) - 1;
		const fromDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
		const toDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
		const monthNamesRu = [
			"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
			"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
		];
		return {
			fromIso: fromDate.toISOString(),
			toIso: toDate.toISOString(),
			isDefault: false,
			periodLabelRu: `${monthNamesRu[month] ?? ""} ${year}`,
		};
	}

	if (query.from && query.to) {
		const fromDate = new Date(query.from);
		const toDate = new Date(query.to);
		if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
			const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
			if (diffDays > MAX_PAYOUT_PERIOD_DAYS) {
				throw new Error(
					`Период не может превышать ${MAX_PAYOUT_PERIOD_DAYS} дней. Запрошено: ${Math.round(diffDays)} дн.`,
				);
			}
			return {
				fromIso: fromDate.toISOString(),
				toIso: toDate.toISOString(),
				isDefault: false,
				periodLabelRu: `${fromDate.toISOString().slice(0, 10)} — ${toDate.toISOString().slice(0, 10)}`,
			};
		}
	}

	// По умолчанию: текущий месяц целиком
	const fromDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
	const toDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
	return {
		fromIso: fromDate.toISOString(),
		toIso: toDate.toISOString(),
		isDefault: true,
		periodLabelRu: `${fromDate.toISOString().slice(0, 10)} — ${toDate.toISOString().slice(0, 10)}`,
	};
}
