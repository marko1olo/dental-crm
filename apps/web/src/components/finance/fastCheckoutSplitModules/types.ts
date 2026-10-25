import type { SbpDynamicQrResult } from "@dental/shared";
import type React from "react";
import type { CheckoutPaymentMethodType } from "../../payments/checkout/fastCheckoutPresets.js";

export interface FastCheckoutPaymentSplitProps {
	readonly isSimpleCashierMode: boolean;
	readonly activeMethod: CheckoutPaymentMethodType;
	readonly onSelectMethod: (method: CheckoutPaymentMethodType) => void;
	readonly targetBillRub: number;
	readonly targetBillKop: number;
	readonly cardAmountRub: number;
	readonly setCardAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly cashAmountRub: number;
	readonly setCashAmountRub: (val: number) => void;
	readonly sbpAmountRub: number;
	readonly setSbpAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly depositAmountRub: number;
	readonly setDepositAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly loyaltyAmountRub: number;
	readonly setLoyaltyAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly cashTenderedRub: number;
	readonly setCashTenderedRub: React.Dispatch<React.SetStateAction<number>>;
	readonly remainingRub: number;
	readonly remainingKop: number;
	readonly cashChange: {
		readonly changeDueKop: number;
		readonly missingKop: number;
		readonly isUnderpaid: boolean;
	};
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly sbpStatus: "awaiting" | "paid" | "failed";
	readonly isCheckingSbp: boolean;
	readonly sbpCheckMessage: string | null;
	readonly sbpQrData: {
		readonly payload: SbpDynamicQrResult;
		readonly svg: string;
	} | null;
	readonly effectiveSbpAmountRub: number;
	readonly onCheckSbpStatus: (manual?: boolean) => void;
	readonly onConfirmSbpManual: () => void;
	readonly onInputEnterKeyDown?: (
		e: React.KeyboardEvent<HTMLInputElement>,
	) => void;
	readonly onAddRemainingToCard: () => void;
	readonly onAddRemainingToCash: () => void;
	readonly onAddRemainingToSbp: () => void;
	readonly onAddRemainingToDeposit: () => void;
	readonly onAddRemainingToLoyalty: () => void;
	readonly onAddRemainingToFamily: () => void;
	readonly onAddRemaining5050: () => void;
	readonly onAddRemainingDepositPlusCard?: () => void;
	readonly availableLoyaltyPointsRub?: number | undefined;
	readonly onApplyOneClickLoyaltyPoints?: (() => void) | undefined;
	readonly onSwitchToSplitMode?: () => void;
}
