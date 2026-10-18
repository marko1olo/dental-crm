/**
 * apps/web/src/components/billing/SbpDynamicQrCard.tsx
 *
 * DENTE Dental CRM — Autonomous Dynamic SBP QR Code Widget & Frictionless Payment Card.
 * Clean modular facade delegating to ./sbp/ submodules.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React, { useEffect } from "react";
import type { SbpDynamicQrCardProps } from "./sbp/sbpTypes.js";
import {
	useSbpPolling,
	SbpQrHeader,
	SbpQrPaidBanner,
	SbpQrExpiredBanner,
	SbpQrUnderplate,
	SbpQrControls,
} from "./sbp/index.js";

export type { SbpDynamicQrCardProps };

export const SbpDynamicQrCard: React.FC<SbpDynamicQrCardProps> = (props) => {
	const { sumRub } = props;
	const {
		status,
		secondsLeft,
		isCopied,
		isCheckingSbp,
		sbpCheckMessage,
		qrData,
		handleManualConfirmation,
		pollSbpStatus,
		handleCopyLink,
		handleRefreshQr,
	} = useSbpPolling(props);

	// Global Enter hotkey for frictionless cashier manual confirmation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && status === "awaiting") {
				const activeTag = document.activeElement?.tagName.toLowerCase();
				if (activeTag === "input" || activeTag === "textarea") return;
				e.preventDefault();
				handleManualConfirmation();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [status, handleManualConfirmation]);

	return (
		<div
			className="p-3.5 sm:p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xs transition-all flex flex-col gap-3"
			data-testid="sbp-dynamic-qr-card"
		>
			<SbpQrHeader status={status} secondsLeft={secondsLeft} />

			{status === "paid" ? (
				<SbpQrPaidBanner sumRub={sumRub} paymentId={qrData.paymentId} />
			) : status === "expired" ? (
				<SbpQrExpiredBanner onRefresh={handleRefreshQr} />
			) : (
				<div className="flex flex-col sm:flex-row items-center gap-4">
					<SbpQrUnderplate svg={qrData.svg} />
					<SbpQrControls
						sumRub={sumRub}
						crc16Hex={qrData.crc16Hex}
						sbpCheckMessage={sbpCheckMessage}
						isCheckingSbp={isCheckingSbp}
						isCopied={isCopied}
						onManualConfirm={handleManualConfirmation}
						onPollStatus={() => pollSbpStatus(true)}
						onCopyLink={handleCopyLink}
					/>
				</div>
			)}
		</div>
	);
};

export default SbpDynamicQrCard;
