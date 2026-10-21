/**
 * apps/web/src/components/patients/family/familyWalletModal/useFamilyWalletMutations.ts
 * Master coordinator hook for family wallet mutations.
 * Mandate 8b: strictly <= 120 lines.
 */
import { useCallback } from "react";
import type {
	FamilyGroupDetails,
	FamilyMemberItem,
	FamilyWalletTab,
} from "./types";
import { useFamilySpendMutation } from "./useFamilySpendMutation";
import { useFamilyTopupMutation } from "./useFamilyTopupMutation";
import { useFamilyTransferMutation } from "./useFamilyTransferMutation";

export interface FamilyWalletMutationArgs {
	readonly patientId: string;
	readonly familyData: FamilyGroupDetails | null;
	readonly familyBalanceNumeric: number;
	readonly membersList: readonly FamilyMemberItem[];
	readonly spendingPermissions: Record<string, boolean>;
	readonly loadFamilyDetails: () => Promise<void>;
	readonly onFamilyDataChanged?: (() => void) | undefined;
	readonly setActiveTab: (tab: FamilyWalletTab) => void;
}

export function useFamilyWalletMutations({
	patientId,
	familyData,
	familyBalanceNumeric,
	membersList,
	spendingPermissions,
	loadFamilyDetails,
	onFamilyDataChanged,
	setActiveTab,
}: FamilyWalletMutationArgs) {
	const notifyChanged = useCallback(async () => {
		await loadFamilyDetails();
		onFamilyDataChanged?.();
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-family-data-changed"));
			window.dispatchEvent(new CustomEvent("dente-patient-balance-changed"));
		}
		setActiveTab("overview");
	}, [loadFamilyDetails, onFamilyDataChanged, setActiveTab]);

	const topup = useFamilyTopupMutation({
		patientId,
		familyData,
		notifyChanged,
	});

	const spend = useFamilySpendMutation({
		patientId,
		familyData,
		familyBalanceNumeric,
		spendingPermissions,
		notifyChanged,
	});

	const transfer = useFamilyTransferMutation({
		patientId,
		familyData,
		membersList,
		notifyChanged,
	});

	return {
		submitting: topup.topupSubmitting || spend.spendSubmitting,
		topupAmount: topup.topupAmount,
		setTopupAmount: topup.setTopupAmount,
		topupPayerId: topup.topupPayerId,
		setTopupPayerId: topup.setTopupPayerId,
		topupMethod: topup.topupMethod,
		setTopupMethod: topup.setTopupMethod,
		topupComment: topup.topupComment,
		setTopupComment: topup.setTopupComment,
		spendAmount: spend.spendAmount,
		setSpendAmount: spend.setSpendAmount,
		spendPatientId: spend.spendPatientId,
		setSpendPatientId: spend.setSpendPatientId,
		spendNote: spend.spendNote,
		setSpendNote: spend.setSpendNote,
		transferAmount: transfer.transferAmount,
		setTransferAmount: transfer.setTransferAmount,
		transferSourceId: transfer.transferSourceId,
		setTransferSourceId: transfer.setTransferSourceId,
		transferTargetId: transfer.transferTargetId,
		setTransferTargetId: transfer.setTransferTargetId,
		transferComment: transfer.transferComment,
		setTransferComment: transfer.setTransferComment,
		handleExecuteTopup: topup.handleExecuteTopup,
		handleExecuteSpend: spend.handleExecuteSpend,
		handleExecuteTransfer: transfer.handleExecuteTransfer,
	};
}
