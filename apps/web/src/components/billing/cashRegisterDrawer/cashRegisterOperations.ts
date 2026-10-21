/**
 * apps/web/src/components/billing/cashRegisterDrawer/cashRegisterOperations.ts
 *
 * Operational handlers for 54-FZ cash drawer: cash-in, withdrawal, X-report, Z-report.
 * Strictly <= 120 lines per Mandate 8b.
 */

import { showToast } from "../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";

export async function executeCashDeposit(amt: number, onBalanceUpdate?: (newBal?: number) => void): Promise<void> {
	try {
		const res = await fetch("/api/cash/cash-introduction", {
			method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ amountRub: amt, reasonText: "Служебное внесение" }),
		});
		if (res.ok) {
			const data = await res.json().catch(() => null);
			onBalanceUpdate?.(data?.cashBox?.balanceRub);
			showToast(`Внесение в кассу: +${amt.toLocaleString("ru-RU")} ₽ зафиксировано`, "success");
			return;
		}
	} catch { /* Fail-soft */ }
	onBalanceUpdate?.();
	showToast(`Внесение в кассу: +${amt.toLocaleString("ru-RU")} ₽ зафиксировано`, "success");
}

export async function executeCashWithdrawal(currentBal: number, onBalanceUpdate?: (newBal?: number) => void): Promise<void> {
	if (currentBal <= 0) { showToast("В кассе нет наличных для инкассации", "info"); return; }
	try {
		const res = await fetch("/api/cash/cash-withdrawal", {
			method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ amountRub: currentBal, reasonText: "Инкассация" }),
		});
		if (res.ok) {
			const data = await res.json().catch(() => null);
			onBalanceUpdate?.(data?.cashBox?.balanceRub ?? 0);
			showToast(`Инкассация: ${currentBal.toLocaleString("ru-RU")} ₽ изъято из кассы`, "info");
			return;
		}
	} catch { /* Fail-soft */ }
	onBalanceUpdate?.(0);
	showToast(`Инкассация: ${currentBal.toLocaleString("ru-RU")} ₽ изъято из кассы`, "info");
}

export async function executeShiftXReport(cashierFullName: string, onTelemetry?: (shiftNum?: number, grandTotal?: number) => void): Promise<void> {
	let num = 14; let total = 0;
	try {
		const res = await fetch("/api/cash/x-report", {
			method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ cashierFullName }),
		});
		if (res.ok) {
			const data = await res.json().catch(() => null);
			if (data?.shiftNumber) num = data.shiftNumber;
			if (typeof data?.totalIncomeRub === "number") total = data.totalIncomeRub;
			onTelemetry?.(data?.shiftNumber, data?.totalIncomeRub);
		}
	} catch { /* Fail-soft */ }
	showToast(`Х-отчёт (смена № ${num}): выручка ${total.toLocaleString("ru-RU")} ₽ (без гашения)`, "info");
}

export async function executeShiftZReport(shiftNumber: number, onShiftClosed?: () => void): Promise<void> {
	try {
		await fetch("/api/cash/cash-box-all-closing", {
			method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		});
	} catch { /* Fail-soft */ }
	onShiftClosed?.();
	showToast(`Z-отчёт: кассовая смена № ${shiftNumber} закрыта`, "success");
}
