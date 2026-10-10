/**
 * apps/web/src/components/patient/familyWalletModal/index.ts
 *
 * Master barrel export for Family Wallet decomposition.
 */

export type {
	FamilyMemberItem,
	FamilyGroupDetails,
	FamilyTransactionItem,
	FamilyCertificateItem,
	FamilySpendingPermission,
	FamilyWalletTab,
	TopupPaymentMethod,
	FamilyWalletModalProps,
} from "./types";
export { PRESET_AMOUNTS } from "./types";

export {
	useFamilyWalletLogic,
	type FamilyWalletLogic,
} from "./useFamilyWalletLogic";

export {
	FamilyWalletModalHeader,
	type FamilyWalletModalHeaderProps,
} from "./FamilyWalletModalHeader";

export {
	FamilyWalletNavTabs,
	type FamilyWalletNavTabsProps,
} from "./FamilyWalletNavTabs";

export {
	FamilyMembersBalanceList,
	type FamilyMembersBalanceListProps,
} from "./FamilyMembersBalanceList";

export {
	FamilyDepositTopupSection,
	type FamilyDepositTopupSectionProps,
} from "./FamilyDepositTopupSection";

export {
	FamilyWalletSpendSection,
	type FamilyWalletSpendSectionProps,
} from "./FamilyWalletSpendSection";

export {
	FamilyWalletTransferSection,
	type FamilyWalletTransferSectionProps,
} from "./FamilyWalletTransferSection";

export {
	FamilyWalletHistoryTable,
	type FamilyWalletHistoryTableProps,
} from "./FamilyWalletHistoryTable";

export {
	FamilyWalletModalFooterActions,
	type FamilyWalletModalFooterActionsProps,
} from "./FamilyWalletModalFooterActions";

export {
	FamilyWalletModalView,
	type FamilyWalletModalViewProps,
} from "./FamilyWalletModalView";
