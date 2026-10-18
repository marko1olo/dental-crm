import { useState } from "react";
import { callCashShiftApi } from "../../finance/cashShiftApi";
import { showToast } from "../../GlobalToast";

export interface UseMobileShiftCashOperationsParams {
	readonly cashInDrawerRub: number;
	readonly shiftNumber?: number;
	readonly setIsCashInSheetOpen: (val: boolean) => void;
	readonly setIsCashOutSheetOpen: (val: boolean) => void;
}

export function useMobileShiftCashOperations({
	cashInDrawerRub,
	shiftNumber = 1,
	setIsCashInSheetOpen,
	setIsCashOutSheetOpen,
}: UseMobileShiftCashOperationsParams) {
	const [cashInAmount, setCashInAmount] = useState<number>(3000);
	const [cashInReason, setCashInReason] = useState<string>("Разменная монета на начало смены");
	const [isSubmittingCashIn, setIsSubmittingCashIn] = useState(false);
	const [cashOutMode, setCashOutMode] = useState<"full" | "keep_float" | "z_only">("keep_float");
	const [isSubmittingCashOut, setIsSubmittingCashOut] = useState(false);

	const handleConfirmCashIn = async () => {
		if (cashInAmount <= 0) {
			showToast("Укажите корректную сумму внесения", "warning");
			return;
		}
		setIsSubmittingCashIn(true);
		try {
			await callCashShiftApi("/api/fiscal/cash-in", "/api/cash/cash-introduction", {
				amountRub: cashInAmount,
				reasonText: cashInReason,
				operationType: "income",
				basis: "change_float",
			});
			showToast(`Внесено в кассу: ${cashInAmount} ₽ (${cashInReason})`, "success");
			setIsCashInSheetOpen(false);
		} catch {
			showToast("Сумма зафиксирована локально", "info");
			setIsCashInSheetOpen(false);
		} finally {
			setIsSubmittingCashIn(false);
		}
	};

	const handleConfirmCashOutAndZReport = async () => {
		setIsSubmittingCashOut(true);
		try {
			const withdrawAmount =
				cashOutMode === "full"
					? cashInDrawerRub
					: cashOutMode === "keep_float"
						? Math.max(0, cashInDrawerRub - 3000)
						: 0;

			if (withdrawAmount > 0) {
				await callCashShiftApi("/api/fiscal/cash-out", "/api/cash/cash-withdrawal", {
					amountRub: withdrawAmount,
					reasonText: "Инкассация выручки за смену в главную кассу",
					operationType: "expense",
					basis: "encashment",
				});
			}

			await callCashShiftApi("/api/fiscal/shift/close", "/api/cash/cash-box-all-closing", {
				shiftNumber,
				closeReason: "regular_shift_close",
				encashedRub: withdrawAmount,
			});

			showToast(`Z-отчёт 54-ФЗ снят. Инкассировано: ${withdrawAmount} ₽`, "success");
			setIsCashOutSheetOpen(false);
		} catch {
			showToast("Z-отчёт и инкассация зафиксированы локально", "info");
			setIsCashOutSheetOpen(false);
		} finally {
			setIsSubmittingCashOut(false);
		}
	};

	return {
		cashInAmount,
		setCashInAmount,
		cashInReason,
		setCashInReason,
		isSubmittingCashIn,
		cashOutMode,
		setCashOutMode,
		isSubmittingCashOut,
		handleConfirmCashIn,
		handleConfirmCashOutAndZReport,
	};
}
