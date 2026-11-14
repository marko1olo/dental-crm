/**
 * apps/web/src/components/patients/family/familyWalletModal/useFamilyWalletLogic.ts
 * Master coordinator hook for Family Wallet Modal.
 * Mandate 8b: strictly <= 120 lines.
 */
import { useId, useState } from "react";
import type { FamilyWalletModalProps, FamilyWalletTab } from "./types";
import { useFamilyWalletData } from "./useFamilyWalletData";
import { useFamilyWalletMutations } from "./useFamilyWalletMutations";

export function useFamilyWalletLogic(props: FamilyWalletModalProps) {
	const { onClose, patientId, onFamilyDataChanged } = props;
	const [activeTab, setActiveTab] = useState<FamilyWalletTab>("info");

	const topupAmountInputId = useId();
	const spendAmountInputId = useId();

	const data = useFamilyWalletData(props);
	const mutations = useFamilyWalletMutations({
		patientId,
		familyData: data.familyData,
		familyBalanceNumeric: data.familyBalanceNumeric,
		membersList: data.membersList,
		spendingPermissions: data.spendingPermissions,
		loadFamilyDetails: data.loadFamilyDetails,
		onFamilyDataChanged,
		setActiveTab,
	});

	return {
		activeTab,
		setActiveTab,
		loading: data.loading,
		savingPermissions: data.savingPermissions,
		submitting: mutations.submitting,
		familyData: data.familyData,
		familyBalanceNumeric: data.familyBalanceNumeric,
		membersList: data.membersList,
		spendingPermissions: data.spendingPermissions,
		handleTogglePermission: data.handleTogglePermission,
		handleSavePermissions: data.handleSavePermissions,
		topupAmount: mutations.topupAmount,
		setTopupAmount: mutations.setTopupAmount,
		topupPayerId: mutations.topupPayerId,
		setTopupPayerId: mutations.setTopupPayerId,
		topupMethod: mutations.topupMethod,
		setTopupMethod: mutations.setTopupMethod,
		topupComment: mutations.topupComment,
		setTopupComment: mutations.setTopupComment,
		spendAmount: mutations.spendAmount,
		setSpendAmount: mutations.setSpendAmount,
		spendPatientId: mutations.spendPatientId,
		setSpendPatientId: mutations.setSpendPatientId,
		spendNote: mutations.spendNote,
		setSpendNote: mutations.setSpendNote,
		transactions: data.transactions,
		topupAmountInputId,
		spendAmountInputId,
		handleExecuteTopup: mutations.handleExecuteTopup,
		handleExecuteSpend: mutations.handleExecuteSpend,
		onClose,
	};
}

export type FamilyWalletLogic = ReturnType<typeof useFamilyWalletLogic>;
