import React, { useMemo } from "react";
import { generateQrCodeSvg, type SbpDynamicQrResult } from "@dental/shared/fiscal";
import type { SbpPaymentStatus } from "../omnichannelTypes.js";
import { SbpExpiredBanner } from "./SbpExpiredBanner.js";
import { SbpSuccessBanner } from "./SbpSuccessBanner.js";

export interface SbpQrFrameProps {
	readonly status: SbpPaymentStatus;
	readonly qrPayload: SbpDynamicQrResult | null;
	readonly sumRub: number;
	readonly fiscalReceiptId: string | null;
	readonly isManualReconciliation: boolean;
	readonly onRefresh: () => void;
}

export const SbpQrFrame: React.FC<SbpQrFrameProps> = ({
	status,
	qrPayload,
	sumRub,
	fiscalReceiptId,
	isManualReconciliation,
	onRefresh,
}) => {
	const qrSvgMarkup = useMemo(() => {
		if (!qrPayload) return "";
		return generateQrCodeSvg(qrPayload.nspkUrl, {
			size: 220,
			margin: 2,
			foregroundColor: "#0f172a",
			backgroundColor: "#ffffff",
			title: `QR-код СБП: ${qrPayload.sumFormattedRu}`,
		});
	}, [qrPayload]);

	return (
		<div className={`sbp-qr-frame sbp-status-${status}`}>
			{status === "paid_success" ? (
				<SbpSuccessBanner
					sumRub={sumRub}
					fiscalReceiptId={fiscalReceiptId}
					isManualReconciliation={isManualReconciliation}
				/>
			) : status === "expired" ? (
				<SbpExpiredBanner onRefresh={onRefresh} />
			) : (
				<div className="sbp-qr-wrapper">
					<div
						className="sbp-qr-svg-holder"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: QR-код сгенерирован доверенной функцией ISO 18004
						dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
					/>
					<div className="sbp-qr-center-logo" title="Система Быстрых Платежей">
						<span>СБП</span>
					</div>
				</div>
			)}
		</div>
	);
};
