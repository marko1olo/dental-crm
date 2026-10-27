/**
 * FamilyBillingPaymentTab.tsx — Вкладка сплит-оплаты семейного счета (депозит + СБП QR / карта / нал).
 * Decomposed under Mandate 8b into atomic sub-components <= 120 lines.
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { CombinedFamilyBillingResult } from "@dental/shared";
import { FamilyBillingCashCardSection } from "./familyBillingTab/FamilyBillingCashCardSection";
import { FamilyBillingMethodSelector } from "./familyBillingTab/FamilyBillingMethodSelector";
import { FamilyBillingSbpSection } from "./familyBillingTab/FamilyBillingSbpSection";
import { FamilyBillingWalletOffsetSection } from "./familyBillingTab/FamilyBillingWalletOffsetSection";

export interface FamilyBillingPaymentTabProps {
	readonly useFamilyWallet: boolean;
	readonly setUseFamilyWallet: (val: boolean) => void;
	readonly availableFamilyWalletRub: number;
	readonly billingResult: CombinedFamilyBillingResult;
	readonly additionalPaymentMethod: "sbp" | "card" | "cash";
	readonly setAdditionalPaymentMethod: (method: "sbp" | "card" | "cash") => void;
	readonly cashReceivedRub: number;
	readonly setCashReceivedRub: (val: number) => void;
	readonly isCopiedSbpLink: boolean;
	readonly onCopySbpUrl: () => void;
	readonly onPrintSbpQrReceipt: () => void;
}

export const FamilyBillingPaymentTab: React.FC<FamilyBillingPaymentTabProps> = ({
	useFamilyWallet,
	setUseFamilyWallet,
	availableFamilyWalletRub,
	billingResult,
	additionalPaymentMethod,
	setAdditionalPaymentMethod,
	cashReceivedRub,
	setCashReceivedRub,
	isCopiedSbpLink,
	onCopySbpUrl,
	onPrintSbpQrReceipt,
}) => {
	const hasRemainingDue = billingResult.defaultSplit.remainingDueRub > 0;

	return (
		<div className="space-y-4">
			<FamilyBillingWalletOffsetSection
				useFamilyWallet={useFamilyWallet}
				setUseFamilyWallet={setUseFamilyWallet}
				availableFamilyWalletRub={availableFamilyWalletRub}
				billingResult={billingResult}
			/>

			{hasRemainingDue ? (
				<div className="space-y-4">
					<FamilyBillingMethodSelector
						additionalPaymentMethod={additionalPaymentMethod}
						setAdditionalPaymentMethod={setAdditionalPaymentMethod}
					/>

					{additionalPaymentMethod === "sbp" && (
						<FamilyBillingSbpSection
							billingResult={billingResult}
							isCopiedSbpLink={isCopiedSbpLink}
							onCopySbpUrl={onCopySbpUrl}
							onPrintSbpQrReceipt={onPrintSbpQrReceipt}
						/>
					)}

					{(additionalPaymentMethod === "card" || additionalPaymentMethod === "cash") && (
						<FamilyBillingCashCardSection
							additionalPaymentMethod={additionalPaymentMethod}
							billingResult={billingResult}
							cashReceivedRub={cashReceivedRub}
							setCashReceivedRub={setCashReceivedRub}
						/>
					)}
				</div>
			) : (
				<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
					<CheckCircle2 size={24} className="shrink-0 text-emerald-600" />
					<div className="text-xs sm:text-sm font-bold">
						Сумма счета ({billingResult.totalAmountFormattedRu}) полностью покрывается семейным депозитом! Доплата не требуется.
					</div>
				</div>
			)}
		</div>
	);
};
