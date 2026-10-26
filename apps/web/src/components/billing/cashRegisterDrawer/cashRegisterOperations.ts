/**
 * apps/web/src/components/billing/cashRegisterDrawer/cashRegisterOperations.ts
 *
 * Cash drawer operations: cash-in, encashment, X-report, shift closing.
 *
 * Iron rule: the UI mirrors the database, never wishes it. Every operation here
 * reports success ONLY on a 2xx answer from the API. A network or server failure
 * shows an honest error toast and leaves the local state untouched — otherwise
 * cash would appear in the drawer (or vanish from it) without a single row in
 * PostgreSQL, and the closing balance would stop matching the ledger.
 *
 * Strictly <= 120 lines per Mandate 8b.
 */

import { showToast } from "../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";

const formatRub = (amt: number): string => amt.toLocaleString("ru-RU");

export async function executeCashDeposit(
	amt: number,
	onBalanceUpdate?: (newBalanceRub?: number) => void,
): Promise<boolean> {
	try {
		const res = await fetch("/api/cash/cash-introduction", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ amountRub: amt, reasonText: "Служебное внесение" }),
		});
		if (res.ok) {
			const data = (await res.json().catch(() => null)) as { cashBox?: { balanceRub?: number } } | null;
			onBalanceUpdate?.(data?.cashBox?.balanceRub);
			showToast(`Внесение в кассу: +${formatRub(amt)} ₽ зафиксировано в журнале`, "success");
			return true;
		}
		showToast(`Внесение не зафиксировано: сервер ответил ошибкой ${res.status}. Сумма в ящике не изменена.`, "error");
		return false;
	} catch {
		showToast("Внесение не зафиксировано: нет связи с сервером. Проверьте сеть и повторите.", "error");
		return false;
	}
}

export async function executeCashWithdrawal(
	currentBal: number,
	onBalanceUpdate?: (newBalanceRub?: number) => void,
): Promise<boolean> {
	if (currentBal <= 0) {
		showToast("В кассе нет наличных для инкассации", "info");
		return false;
	}
	try {
		const res = await fetch("/api/cash/cash-withdrawal", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ amountRub: currentBal, reasonText: "Инкассация" }),
		});
		if (res.ok) {
			const data = (await res.json().catch(() => null)) as { cashBox?: { balanceRub?: number } } | null;
			onBalanceUpdate?.(data?.cashBox?.balanceRub ?? 0);
			showToast(`Инкассация: ${formatRub(currentBal)} ₽ изъято из кассы`, "info");
			return true;
		}
		showToast(`Инкассация не проведена: сервер ответил ошибкой ${res.status}. Наличные остаются в ящике.`, "error");
		return false;
	} catch {
		showToast("Инкассация не проведена: нет связи с сервером. Наличные остаются в ящике.", "error");
		return false;
	}
}

export async function executeShiftXReport(
	cashierFullName: string,
	onTelemetry?: (shiftNum?: number, grandTotal?: number) => void,
): Promise<boolean> {
	try {
		const res = await fetch("/api/cash/x-report", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ cashierFullName }),
		});
		if (res.ok) {
			const data = (await res.json().catch(() => null)) as { shiftNumber?: number; totalIncomeRub?: number } | null;
			onTelemetry?.(data?.shiftNumber, data?.totalIncomeRub);
			showToast(
				`Сверка смены${data?.shiftNumber !== undefined ? ` № ${data.shiftNumber}` : ""}: выручка ${formatRub(data?.totalIncomeRub ?? 0)} ₽ (без гашения)`,
				"info",
			);
			return true;
		}
		showToast(`Сверка не выполнена: сервер ответил ошибкой ${res.status}.`, "error");
		return false;
	} catch {
		showToast("Сверка не выполнена: нет связи с сервером кассы.", "error");
		return false;
	}
}

/**
 * Closes the cash shift. The shift closes in the UI only after the server
 * confirms — otherwise the drawer would show a closed shift while PostgreSQL
 * still counts it as open and the next X-report would disagree.
 */
export async function executeShiftZReport(onShiftClosed?: () => void): Promise<boolean> {
	try {
		const res = await fetch("/api/cash/cash-box-all-closing", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		});
		if (res.ok) {
			onShiftClosed?.();
			showToast("Смена закрыта. Итоги дня записаны в кассовую книгу.", "success");
			return true;
		}
		showToast(`Смена не закрыта: сервер ответил ошибкой ${res.status}. Закройте смену повторно.`, "error");
		return false;
	} catch {
		showToast("Смена не закрыта: нет связи с сервером. Проверьте сеть и повторите.", "error");
		return false;
	}
}
