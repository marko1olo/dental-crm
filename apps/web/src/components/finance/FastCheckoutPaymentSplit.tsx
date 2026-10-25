import React from "react";
import {
	type FastCheckoutPaymentSplitProps,
	SplitCashTenderPanel,
	SplitMethodSelector,
	SplitRemainderBar,
	SplitSbpQrPanel,
	SplitTenderInputs,
} from "./fastCheckoutSplitModules";

export type { FastCheckoutPaymentSplitProps };

export const FastCheckoutPaymentSplit: React.FC<
	FastCheckoutPaymentSplitProps
> = (props) => {
	const {
		isSimpleCashierMode,
		activeMethod,
		targetBillRub,
		cashAmountRub,
		sbpAmountRub,
		remainingRub,
		cashTenderedRub,
		setCashTenderedRub,
		cashChange,
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		familyPayerName = "",
	} = props;

	const totalAvailableDeposit =
		(patientDepositRub || 0) + (patientFamilyBalanceRub || 0);

	return (
		<div className="space-y-3" data-testid="fast-checkout-payment-split-root">
			<SplitMethodSelector
				isSimpleCashierMode={isSimpleCashierMode}
				activeMethod={activeMethod}
				onSelectMethod={props.onSelectMethod}
				totalAvailableDeposit={totalAvailableDeposit}
				availableLoyaltyPointsRub={props.availableLoyaltyPointsRub}
				loyaltyAmountRub={props.loyaltyAmountRub}
				onApplyOneClickLoyaltyPoints={props.onApplyOneClickLoyaltyPoints}
				onSwitchToSplitMode={props.onSwitchToSplitMode}
			/>

			{!isSimpleCashierMode && (
				<div
					className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3"
					data-testid="split-payment-section"
				>
					<SplitRemainderBar
						remainingRub={remainingRub}
						totalAvailableDeposit={totalAvailableDeposit}
						patientFamilyBalanceRub={patientFamilyBalanceRub}
						familyPayerName={familyPayerName}
						onAddRemainingToCard={props.onAddRemainingToCard}
						onAddRemainingToCash={props.onAddRemainingToCash}
						onAddRemainingToSbp={props.onAddRemainingToSbp}
						onAddRemainingToDeposit={props.onAddRemainingToDeposit}
						onAddRemainingToLoyalty={props.onAddRemainingToLoyalty}
						onAddRemainingToFamily={props.onAddRemainingToFamily}
						onAddRemaining5050={props.onAddRemaining5050}
						onAddRemainingDepositPlusCard={props.onAddRemainingDepositPlusCard}
					/>

					<SplitTenderInputs
						{...props}
						totalAvailableDeposit={totalAvailableDeposit}
					/>
				</div>
			)}

			{(sbpAmountRub > 0 || activeMethod === "sbp_qr") && (
				<SplitSbpQrPanel
					sbpStatus={props.sbpStatus}
					isCheckingSbp={props.isCheckingSbp}
					sbpCheckMessage={props.sbpCheckMessage}
					sbpQrData={props.sbpQrData}
					effectiveSbpAmountRub={props.effectiveSbpAmountRub}
					onCheckSbpStatus={props.onCheckSbpStatus}
					onConfirmSbpManual={props.onConfirmSbpManual}
				/>
			)}

			{(cashAmountRub > 0 || activeMethod === "cash") && (
				<SplitCashTenderPanel
					cashAmountRub={cashAmountRub}
					targetBillRub={targetBillRub}
					cashTenderedRub={cashTenderedRub}
					setCashTenderedRub={setCashTenderedRub}
					cashChange={cashChange}
				/>
			)}
		</div>
	);
};
