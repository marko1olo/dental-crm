import { useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
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
		if (isSubmittingCashIn) return;
		if (cashInAmount <= 0) {
			showToast("Укажите корректную сумму внесения", "warning");
			return;
		}
		setIsSubmittingCashIn(true);
		try {
			const res = await fetch("/api/cash/cash-introduction", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					amountRub: cashInAmount,
					reasonText: cashInReason,
					typeAlias: "change_float",
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => null);
				throw new Error(err?.message || `Ошибка внесения (${res.status})`);
			}
			showToast(`Внесено в кассу: ${cashInAmount} ₽ (${cashInReason})`, "success");
			setIsCashInSheetOpen(false);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось провести внесение наличных";
			showToast(msg, "error");
		} finally {
			setIsSubmittingCashIn(false);
		}
	};

	const handleConfirmCashOutAndZReport = async () => {
		if (isSubmittingCashOut) return;
		setIsSubmittingCashOut(true);
		try {
			const withdrawAmount =
				cashOutMode === "full"
					? cashInDrawerRub
					: cashOutMode === "keep_float"
						? Math.max(0, cashInDrawerRub - 3000)
						: 0;

			if (withdrawAmount > 0) {
				const withdrawRes = await fetch("/api/cash/cash-withdrawal", {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify({
						amountRub: withdrawAmount,
						reasonText: "Инкассация выручки за смену в главную кассу",
						typeAlias: "encashment",
					}),
				});
				if (!withdrawRes.ok) {
					const err = await withdrawRes.json().catch(() => null);
					throw new Error(err?.message || `Ошибка инкассации (${withdrawRes.status})`);
				}
			}

			const resClose = await fetch("/api/cashbox/shift/close", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					shiftNumber,
					force: true,
				}),
			});
			if (!resClose.ok) {
				const err = await resClose.json().catch(() => null);
				throw new Error(err?.message || `Ошибка закрытия смены (${resClose.status})`);
			}

			showToast(`Фискальный Z-отчёт смены снят. Инкассировано: ${withdrawAmount} ₽`, "success");
			setIsCashOutSheetOpen(false);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось закрыть смену и снять Z-отчёт";
			showToast(msg, "error");
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
