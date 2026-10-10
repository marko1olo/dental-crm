export type {
	FamilyMember,
	FamilyLedgerEntry,
	FamilyGroup,
	FamilyTopupMethod,
} from "../familyWalletHelpers";

export {
	WALLET_PANEL_SUBJECT,
	refusalToast,
	PATIENT_ID_PATTERN,
	FAMILY_TOPUP_METHODS,
	BONUS_PRESETS,
	formatFamilyBalanceLabel,
	formatAvailableForDebitLabel,
	formatMoneyClean,
	safeFamilyMemberName,
	validateFamilyMemberStatus,
	calculateFamilyAllocation,
	calculateFamilyRefundRouting,
	checkOverdraftStatus,
} from "../familyWalletHelpers";

export interface FamilyWalletPanelProps {
	patientId: string;
	remainingDebtRub: number;
	onPaymentSuccess?: (() => void | Promise<void>) | undefined;
}

export interface FamilyWalletBalanceCardProps {
	family: import("../familyWalletHelpers").FamilyGroup;
	headFullName: string;
	balanceVal: number;
	animatedBalance: number;
	onOpenCombinedBilling: () => void;
	onToggleLedger: () => void;
	isLedgerOpen: boolean;
	ledgerCount: number;
	onOpenRefundModal: () => void;
}

export interface FamilyTransferModalProps {
	isOpen: boolean;
	onClose: () => void;
	family: import("../familyWalletHelpers").FamilyGroup;
	headFullName: string;
	headMember?: import("../familyWalletHelpers").FamilyMember | undefined;
	refundTargetPatientId: string;
	setRefundTargetPatientId: (id: string) => void;
	refundAmountInput: string;
	setRefundAmountInput: (val: string) => void;
	refundReason: string;
	setRefundReason: (val: string) => void;
	refundDestination: "family_deposit" | "cash_payout";
	setRefundDestination: (dest: "family_deposit" | "cash_payout") => void;
	isRefunding: boolean;
	onConfirmRefund: () => void | Promise<void>;
}

export interface FamilyHistoryFeedProps {
	isOpen: boolean;
	onClose: () => void;
	ledgerEntries: import("../familyWalletHelpers").FamilyLedgerEntry[];
	headFullName: string;
	onPrintLedger: () => void;
}
