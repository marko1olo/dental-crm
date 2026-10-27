import React, { useRef, useState } from "react";
import { money } from "../../../AppHelpers";
import { actionFailureToast } from "../../../lib/panelStateText";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import { showToast } from "../../GlobalToast";
import { familyMutationId, familyPayRequestKey, type MutationTicket } from "../familyWalletMutationKey";
import { type FamilyGroup, type FamilyLedgerEntry, refusalToast } from "./types";
import { postFamilyPayApi } from "./familyWalletApi";
import { logger } from "../../../utils/logger";

export interface UseFamilyWalletPayActionParams {
	family: FamilyGroup | null;
	balanceVal: number;
	targetPatientId: string;
	headFullName: string;
	targetMemberName: string;
	amountInput: string;
	setAmountInput: React.Dispatch<React.SetStateAction<string>>;
	onPaymentSuccess?: (() => void | Promise<void>) | undefined;
	loadFamily: () => Promise<void>;
	setLedgerEntries: React.Dispatch<React.SetStateAction<FamilyLedgerEntry[]>>;
}

export function useFamilyWalletPayAction({
	family,
	balanceVal,
	targetPatientId,
	headFullName,
	targetMemberName,
	amountInput,
	setAmountInput,
	onPaymentSuccess,
	loadFamily,
	setLedgerEntries,
}: UseFamilyWalletPayActionParams) {
	const [isPaying, setIsPaying] = useState(false);
	const payMutationRef = useRef<MutationTicket | null>(null);

	const parsedAmount = normalizeRubAmountInput(amountInput);
	const amount = parsedAmount ?? 0;
	const amountInvalid = Boolean(amountInput.trim()) && parsedAmount === null;

	const payBlockReason = amountInvalid
		? "Впишите сумму цифрами, копейки после запятой: 1500,50"
		: amount > 0 && Math.abs(Math.round(amount * 100) - amount * 100) > 1e-4
			? "Сумма списания может содержать не более 2 знаков после запятой (копейки)."
			: amount > balanceVal && amount > 0
				? `На семейном счету только ${money(balanceVal)}. Спишите не больше этой суммы, остальное примите обычной оплатой или пополните счёт.`
				: null;

	const handlePay = async () => {
		if (!family || isPaying) return;
		if (amount <= 0) return void showToast("Введите сумму", "error");
		if (Math.abs(Math.round(amount * 100) - amount * 100) > 1e-4) {
			return void showToast("Сумма списания может содержать не более 2 знаков после запятой", "error");
		}
		if (amount > balanceVal) return void showToast("Недостаточно средств на семейном балансе", "error");

		const mutationId = familyMutationId(payMutationRef, "family-pay", familyPayRequestKey(targetPatientId, family.id, amount));
		setIsPaying(true);
		try {
			const res = await postFamilyPayApi(targetPatientId, family.id, amount, mutationId);
			if (!res.ok) {
				const errPayload = (await res.json().catch(() => null)) as { message?: string } | null;
				return void showToast(refusalToast("Списание с семейного счёта не прошло", res.status, errPayload?.message), "error");
			}
			payMutationRef.current = null;
			const payResult = (await res.json().catch(() => null)) as { duplicate?: boolean } | null;
			setLedgerEntries((prev) => [
				{
					id: `debit-${Date.now()}`,
					createdAt: new Date().toISOString(),
					entryType: "debit",
					amountRub: amount,
					amountKopecks: Math.round(amount * 100),
					payerFullName: headFullName,
					targetPatientId,
					targetPatientFullName: targetMemberName,
					notes: "Списание за лечение с семейного депозита",
					clientMutationId: mutationId,
				},
				...prev,
			]);
			showToast(payResult?.duplicate ? "Эта оплата уже была списана раньше — повторно деньги не списаны." : "Оплата списана с семейного кошелька", "success");
			setAmountInput("");
			if (onPaymentSuccess) onPaymentSuccess();
			void loadFamily();
		} catch (e) {
			logger.error("[family wallet] списание не получило ответа сервера:", e);
			showToast(actionFailureToast("Ответ по списанию с семейного счёта не получен", null), "error");
		} finally {
			setIsPaying(false);
		}
	};

	return { isPaying, amount, amountInvalid, payBlockReason, handlePay };
}
