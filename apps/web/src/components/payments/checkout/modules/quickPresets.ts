import type { CheckoutSplitItem, QuickCheckoutPresetResult, QuickCheckoutPresetType } from "./types.js";

/**
 * Быстрые пресеты оплаты в 1 клик (Мандат 8e):
 * 100_card, 100_cash, 100_sbp, use_deposit, deposit_cash, deposit_sbp, split_50_50, split_three_way, warranty_100.
 */
export function applyQuickCheckoutPreset(params: {
	readonly totalBillKop: number;
	readonly preset: QuickCheckoutPresetType;
	readonly availableDepositKop?: number | undefined;
}): QuickCheckoutPresetResult {
	const total = Math.max(0, params.totalBillKop);
	const dep = Math.max(0, params.availableDepositKop ?? 0);

	switch (params.preset) {
		case "100_card":
			return { payments: total > 0 ? [{ method: "bank_card", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "bank_card" };
		case "100_cash":
			return { payments: total > 0 ? [{ method: "cash", amountKop: total }] : [], cashTenderedKop: total, activeMethod: "cash" };
		case "100_sbp":
			return { payments: total > 0 ? [{ method: "sbp_qr", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "sbp_qr" };
		case "use_deposit": {
			if (dep >= total && total > 0) return { payments: [{ method: "patient_deposit", amountKop: total }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			if (dep > 0 && total > dep) return { payments: [{ method: "patient_deposit", amountKop: dep }, { method: "bank_card", amountKop: total - dep }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			return { payments: total > 0 ? [{ method: "bank_card", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "bank_card" };
		}
		case "deposit_cash": {
			if (dep >= total && total > 0) return { payments: [{ method: "patient_deposit", amountKop: total }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			if (dep > 0 && total > dep) {
				const rem = total - dep;
				return { payments: [{ method: "patient_deposit", amountKop: dep }, { method: "cash", amountKop: rem }], cashTenderedKop: rem, activeMethod: "cash" };
			}
			return { payments: total > 0 ? [{ method: "cash", amountKop: total }] : [], cashTenderedKop: total, activeMethod: "cash" };
		}
		case "deposit_sbp": {
			if (dep >= total && total > 0) return { payments: [{ method: "patient_deposit", amountKop: total }], cashTenderedKop: 0, activeMethod: "patient_deposit" };
			if (dep > 0 && total > dep) return { payments: [{ method: "patient_deposit", amountKop: dep }, { method: "sbp_qr", amountKop: total - dep }], cashTenderedKop: 0, activeMethod: "sbp_qr" };
			return { payments: total > 0 ? [{ method: "sbp_qr", amountKop: total }] : [], cashTenderedKop: 0, activeMethod: "sbp_qr" };
		}
		case "split_50_50": {
			const halfCardKop = Math.floor(total / 2);
			const halfCashKop = total - halfCardKop;
			const payments: CheckoutSplitItem[] = [];
			if (halfCardKop > 0) payments.push({ method: "bank_card", amountKop: halfCardKop });
			if (halfCashKop > 0) payments.push({ method: "cash", amountKop: halfCashKop });
			return { payments, cashTenderedKop: halfCashKop, activeMethod: "bank_card" };
		}
		case "split_three_way": {
			const usedDepKop = Math.min(dep, total);
			const remKop = Math.max(0, total - usedDepKop);
			const halfCardKop = Math.floor(remKop / 2);
			const halfCashKop = remKop - halfCardKop;
			const payments: CheckoutSplitItem[] = [];
			if (usedDepKop > 0) payments.push({ method: "patient_deposit", amountKop: usedDepKop });
			if (halfCardKop > 0) payments.push({ method: "bank_card", amountKop: halfCardKop });
			if (halfCashKop > 0) payments.push({ method: "cash", amountKop: halfCashKop });
			return { payments, cashTenderedKop: halfCashKop, activeMethod: usedDepKop > 0 ? "patient_deposit" : "bank_card" };
		}
		case "warranty_100":
			return { payments: [], cashTenderedKop: 0, activeMethod: "bank_card" };
	}
}
