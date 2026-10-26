import React from "react";
import type { SbpPaymentInvoice } from "../omnichannelTypes.js";
import { SbpCashierControl } from "./SbpCashierControl.js";
import { SbpInvoiceSummaryCard } from "./SbpInvoiceSummaryCard.js";
import { SbpLiveStatusPill } from "./SbpLiveStatusPill.js";
import { SbpQrFrame } from "./SbpQrFrame.js";
import { SbpShareActions } from "./SbpShareActions.js";
import { SbpTimerCard } from "./SbpTimerCard.js";
import type { useSbpPaymentModalState } from "./useSbpPaymentModalState.js";

export interface SbpModalBodyProps {
	readonly state: ReturnType<typeof useSbpPaymentModalState>;
	readonly invoice: SbpPaymentInvoice;
	readonly defaultTtlMinutes: number;
	readonly onSendToChat?: ((channel: "whatsapp" | "telegram", messageText: string) => void) | undefined;
}

export const SbpModalBody: React.FC<SbpModalBodyProps> = ({
	state,
	invoice,
	defaultTtlMinutes,
	onSendToChat,
}) => {
	const isPaidOrExpired = state.status === "paid_success" || state.status === "expired";

	return (
		<div className="sbp-modal-body">
			<div className="sbp-qr-column">
				<SbpQrFrame
					status={state.status}
					qrPayload={state.qrPayload}
					sumRub={invoice.sumRub}
					fiscalReceiptId={state.fiscalReceiptId}
					isManualReconciliation={state.isManualReconciliation}
					onRefresh={state.initQrPayload}
				/>
				{!isPaidOrExpired && (
					<SbpTimerCard
						remainingSeconds={state.remainingSeconds}
						defaultTtlMinutes={defaultTtlMinutes}
					/>
				)}
				<SbpLiveStatusPill
					status={state.status}
					isManualReconciliation={state.isManualReconciliation}
				/>
			</div>

			<div className="sbp-details-column">
				<SbpInvoiceSummaryCard invoice={invoice} />
				<SbpShareActions
					copied={state.copied}
					qrPayload={state.qrPayload}
					invoice={invoice}
					onCopyLink={state.handleCopyLink}
					onSendToChat={onSendToChat}
					onPrint={() => window.print()}
				/>
				{state.status !== "paid_success" && (
					<SbpCashierControl
						sumRub={invoice.sumRub}
						isCheckingStatus={state.isCheckingStatus}
						statusCheckMessage={state.statusCheckMessage}
						isManualConfirmPending={state.isManualConfirmPending}
						onCheckGatewayStatus={state.handleCheckGatewayStatus}
						onToggleManualConfirm={state.setIsManualConfirmPending}
						onConfirmManualReconciliation={state.handleConfirmManualReconciliation}
					/>
				)}
			</div>
		</div>
	);
};
