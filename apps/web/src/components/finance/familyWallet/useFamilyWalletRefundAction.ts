import React, { useRef, useState } from "react";
import { money } from "../../../AppHelpers";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import { showToast } from "../../GlobalToast";
import { familyMutationId, familyRefundRequestKey, type MutationTicket } from "../familyWalletMutationKey";
import { type FamilyGroup, type FamilyLedgerEntry } from "./types";
import { printFamilyLedgerStatement } from "../familyBillingPrint";
import { postFamilyRefundApi } from "./familyWalletApi";
import { logger } from "../../../utils/logger";

export interface RefundActionProps {
	family: FamilyGroup | null;
	patientId: string;
	headFullName: string;
	loadFamily: () => Promise<void>;
	setLedgerEntries: React.Dispatch<React.SetStateAction<FamilyLedgerEntry[]>>;
	balanceVal: number;
	ledgerEntries: FamilyLedgerEntry[];
}

export function useFamilyWalletRefundAction({
	family, patientId, headFullName, loadFamily, setLedgerEntries, balanceVal, ledgerEntries,
}: RefundActionProps) {
	const [refundAmountInput, setRefundAmountInput] = useState("");
	const [refundTargetPatientId, setRefundTargetPatientId] = useState<string>(patientId);
	const [refundReason, setRefundReason] = useState("Отмена визита / возврат за неоказанные услуги");
	const [refundDestination, setRefundDestination] = useState<"family_deposit" | "cash_payout">("family_deposit");
	const [isRefunding, setIsRefunding] = useState(false);
	const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
	const refundMutationRef = useRef<MutationTicket | null>(null);

	const handleExecuteRefund = async () => {
		if (!family || isRefunding) return;
		const refundAmount = normalizeRubAmountInput(refundAmountInput) ?? 0;
		if (refundAmount <= 0) return void showToast("Введите корректную сумму возврата", "error");
		if (refundDestination === "cash_payout") {
			showToast("Внимание: возврат наличными требует обязательного чека «Возврат прихода» на кассе!", "warning", 5000);
			return void setIsRefundModalOpen(false);
		}
		setIsRefunding(true);
		try {
			const targetMember = (family.members ?? []).find((m) => m.id === refundTargetPatientId);
			const targetName = targetMember?.fullName?.trim() || "Пациент";
			const targetId = refundTargetPatientId || patientId;
			const cleanReason = refundReason.trim();
			const mutationId = familyMutationId(refundMutationRef, "family-refund", familyRefundRequestKey(targetId, family.id, refundAmount, cleanReason));
			const res = await postFamilyRefundApi(targetId, family.id, refundAmount, `Возврат средств: ${cleanReason}`, mutationId);
			if (!res.ok) {
				const errPayload = await res.json().catch(() => null);
				return void showToast(errPayload?.message || "Не удалось вернуть средства на депозит", "error");
			}
			refundMutationRef.current = null;
			setLedgerEntries((prev) => [
				{
					id: `ledger-${mutationId}`,
					createdAt: new Date().toISOString(),
					entryType: "refund_deposit",
					amountRub: refundAmount,
					amountKopecks: Math.round(refundAmount * 100),
					payerFullName: headFullName,
					targetPatientId: targetId,
					targetPatientFullName: targetName,
					notes: `Возврат на семейный депозит: ${cleanReason}`,
					clientMutationId: mutationId,
				},
				...prev,
			]);
			showToast(`Средства (${money(refundAmount)}) успешно возвращены на семейный депозит!`, "success");
			setRefundAmountInput("");
			setIsRefundModalOpen(false);
			void loadFamily();
		} catch (e) {
			logger.error("[family wallet] ошибка возврата на депозит:", e);
			showToast("Ошибка связи при оформлении возврата", "error");
		} finally {
			setIsRefunding(false);
		}
	};

	const handlePrintLedger = () => {
		printFamilyLedgerStatement({
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			familyGroupName: family?.name?.trim() || "Семейная группа",
			headFullName,
			currentBalanceRub: balanceVal,
			entries: ledgerEntries,
		});
	};

	return {
		refundAmountInput, setRefundAmountInput, refundTargetPatientId, setRefundTargetPatientId,
		refundReason, setRefundReason, refundDestination, setRefundDestination,
		isRefunding, isRefundModalOpen, setIsRefundModalOpen, handleExecuteRefund, handlePrintLedger,
	};
}
