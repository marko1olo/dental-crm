import type React from "react";
import {
	BankInstallmentBreakdownCard,
	BankInstallmentFooter,
	BankInstallmentHeader,
	BankInstallmentProviderSelector,
	type BankInstallmentQrModalProps,
	BankInstallmentQrView,
	useBankInstallmentLogic,
} from "./bankInstallmentModules";
import "./bankInstallment.css";

export type { BankInstallmentQrModalProps };

export const BankInstallmentQrModal: React.FC<BankInstallmentQrModalProps> = (
	props,
) => {
	const { isOpen, onClose, stageTitle, stageAmountKopecks, patientName } =
		props;

	const {
		selectedProvider,
		selectedTerm,
		setSelectedTerm,
		isCopied,
		isSmsSent,
		isApprovedState,
		activeProviderConfig,
		calculation,
		linkData,
		handleProviderChange,
		handleCopyLink,
		handleSendSms,
	} = useBankInstallmentLogic(props);

	if (!isOpen) return null;

	return (
		<div
			className="bank-installment-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="bank-installment-title"
			data-testid="bank-installment-modal"
		>
			<div className="bank-installment-container">
				<BankInstallmentHeader
					stageTitle={stageTitle}
					stageAmountKopecks={stageAmountKopecks}
					patientName={patientName}
					onClose={onClose}
				/>

				<div className="p-6 space-y-5 text-xs text-[var(--ink,#0f172a)] max-h-[80vh] overflow-y-auto">
					<BankInstallmentProviderSelector
						selectedProvider={selectedProvider}
						onProviderChange={handleProviderChange}
						activeProviderConfig={activeProviderConfig}
						selectedTerm={selectedTerm}
						onSelectTerm={setSelectedTerm}
					/>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
						<BankInstallmentQrView
							qrPayload={linkData.qrPayload}
							activeProviderConfig={activeProviderConfig}
							isCopied={isCopied}
							isSmsSent={isSmsSent}
							onCopyLink={handleCopyLink}
							onSendSms={handleSendSms}
						/>

						<BankInstallmentBreakdownCard
							calculation={calculation}
							selectedProvider={selectedProvider}
							activeProviderConfig={activeProviderConfig}
						/>
					</div>

					<BankInstallmentFooter
						isApprovedState={isApprovedState}
						stageAmountKopecks={stageAmountKopecks}
						onClose={onClose}
					/>
				</div>
			</div>
		</div>
	);
};

export default BankInstallmentQrModal;
