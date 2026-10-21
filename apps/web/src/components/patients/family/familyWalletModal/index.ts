/**
 * apps/web/src/components/patient/familyWalletModal/index.ts
 *
 * Master barrel export for Family Wallet decomposition.
 */

export {
	FamilyDepositTopupSection,
	type FamilyDepositTopupSectionProps,
} from "./FamilyDepositTopupSection";
export {
	FamilyMembersBalanceList,
	type FamilyMembersBalanceListProps,
} from "./FamilyMembersBalanceList";
export {
	FamilyWalletHistoryTable,
	type FamilyWalletHistoryTableProps,
} from "./FamilyWalletHistoryTable";
export {
	FamilyWalletModalFooterActions,
	type FamilyWalletModalFooterActionsProps,
} from "./FamilyWalletModalFooterActions";
export {
	FamilyWalletModalHeader,
	type FamilyWalletModalHeaderProps,
} from "./FamilyWalletModalHeader";
export {
	FamilyWalletModalView,
	type FamilyWalletModalViewProps,
} from "./FamilyWalletModalView";
export {
	FamilyWalletNavTabs,
	type FamilyWalletNavTabsProps,
} from "./FamilyWalletNavTabs";

export {
	FamilyWalletSpendSection,
	type FamilyWalletSpendSectionProps,
} from "./FamilyWalletSpendSection";

export {
	FamilyWalletTransferSection,
	type FamilyWalletTransferSectionProps,
} from "./FamilyWalletTransferSection";
export type {
	FamilyCertificateItem,
	FamilyGroupDetails,
	FamilyMemberItem,
	FamilySpendingPermission,
	FamilyTransactionItem,
	FamilyWalletModalProps,
	FamilyWalletTab,
	TopupPaymentMethod,
} from "./types";
export { PRESET_AMOUNTS } from "./types";
export {
	type FamilyWalletLogic,
	useFamilyWalletLogic,
} from "./useFamilyWalletLogic";
