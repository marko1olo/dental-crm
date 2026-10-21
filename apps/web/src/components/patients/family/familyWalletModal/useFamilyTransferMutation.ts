/**
 * apps/web/src/components/patients/family/familyWalletModal/useFamilyTransferMutation.ts
 * Intra-family transfer logic (0% commission) and state.
 * Mandate 8b: strictly <= 120 lines.
 */
import { useCallback, useState } from "react";
import { showToast } from "../../../GlobalToast";
import type { FamilyGroupDetails, FamilyMemberItem } from "./types";

export interface UseFamilyTransferMutationArgs {
	readonly patientId: string;
	readonly familyData: FamilyGroupDetails | null;
	readonly membersList: readonly FamilyMemberItem[];
	readonly notifyChanged: () => Promise<void>;
}

export function useFamilyTransferMutation({
	patientId,
	familyData,
	membersList,
	notifyChanged,
}: UseFamilyTransferMutationArgs) {
	const [transferAmount, setTransferAmount] = useState("");
	const [transferSourceId, setTransferSourceId] = useState(patientId);
	const [transferTargetId, setTransferTargetId] = useState("");
	const [transferComment, setTransferComment] = useState("");

	const handleExecuteTransfer = useCallback(async () => {
		const num = parseFloat(transferAmount.replace(",", "."));
		if (!familyData?.id) return showToast("Семья не найдена", "error");
		if (!transferTargetId) return showToast("Выберите получателя", "error");
		if (!transferAmount || Number.isNaN(num) || num <= 0)
			return showToast("Укажите сумму > 0 ₽", "error");
		const targetMember = membersList.find((m) => m.id === transferTargetId);
		showToast(
			`Единый семейный депозит: средства доступны для ${targetMember?.fullName || "родственника"}`,
			"info",
		);
		setTransferAmount("");
		setTransferComment("");
		await notifyChanged();
	}, [
		familyData?.id,
		membersList,
		notifyChanged,
		transferAmount,
		transferTargetId,
	]);

	return {
		transferAmount,
		setTransferAmount,
		transferSourceId,
		setTransferSourceId,
		transferTargetId,
		setTransferTargetId,
		transferComment,
		setTransferComment,
		handleExecuteTransfer,
	};
}
