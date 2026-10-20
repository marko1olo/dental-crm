import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { showToast } from "../../GlobalToast.js";

/**
 * Hook for cash introduction (внесение) and withdrawal (изъятие / инкассация).
 * Mandate 8b: <= 120 lines.
 */
export function useCashboxCashMovement(mainCashBoxId: string | null, reloadBoxes: () => void) {
	const handleCashIn = async (amountRub: number, basis: string) => {
		if (!mainCashBoxId) {
			showToast("Основная касса не определена", "error");
			return;
		}
		const res = await fetch("/api/cash/cash-introduction", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ cashBoxId: mainCashBoxId, amountRub, reasonText: basis }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка внесения наличных");
		}
		reloadBoxes();
	};

	const handleCashOut = async (amountRub: number, basis: string, recipientFio?: string) => {
		if (!mainCashBoxId) {
			showToast("Основная касса не определена", "error");
			return;
		}
		const res = await fetch("/api/cash/cash-withdrawal", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ cashBoxId: mainCashBoxId, amountRub, reasonText: basis, recipientFio }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка инкассации / изъятия наличных");
		}
		reloadBoxes();
	};

	return { handleCashIn, handleCashOut };
}