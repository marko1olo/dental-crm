/**
 * EgiszSigningTab.tsx
 *
 * Tab 4: Qualified Electronic Signature (УКЭП) & Visual Stamps.
 * CryptoPro CSP / CAdES-BES detached signatures for Doctor and Medical Organization.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import { SigningActionButtons } from "./signing/SigningActionButtons";
import { SigningCertSelector } from "./signing/SigningCertSelector";
import { SigningHeader } from "./signing/SigningHeader";
import { SigningStampPreview } from "./signing/SigningStampPreview";
import type { EgiszSigningTabProps } from "./signing/signingTabTypes";

export type { EgiszSigningTabProps } from "./signing/signingTabTypes";

export const EgiszSigningTab: React.FC<EgiszSigningTabProps> = ({
	signaturePreviewMode,
	onSignaturePreviewModeChange,
	selectedCert,
	onSelectCert,
	availableCerts,
	isSigning,
	isSending,
	isCheckingCerts,
	doctorSig,
	moSig,
	onSignDocument,
	onSignMoDocument,
	onSignBothInOneClick,
	onSendToRegistry,
	onQueueDeferred,
	onUploadDetachedSig,
	onUploadDetachedMoSig,
	onRefreshCerts,
	onPrint,
	onDownloadXml,
	onValidateCdaXml,
	doctor,
	clinic,
}) => {
	const handleSignBoth = () => {
		if (onSignBothInOneClick) {
			onSignBothInOneClick();
		} else {
			onSignDocument();
			onSignMoDocument();
		}
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "1rem", background: "var(--paper)" }}>
				<SigningHeader
					signaturePreviewMode={signaturePreviewMode}
					onSignaturePreviewModeChange={onSignaturePreviewModeChange}
				/>
				<SigningCertSelector
					selectedCert={selectedCert}
					onSelectCert={onSelectCert}
					availableCerts={availableCerts}
					isCheckingCerts={isCheckingCerts}
					onRefreshCerts={onRefreshCerts}
					onQueueDeferred={onQueueDeferred}
					onUploadDetachedSig={onUploadDetachedSig}
				/>
				<SigningActionButtons
					isSigning={isSigning}
					isSending={isSending}
					onSignBoth={handleSignBoth}
					onSignDocument={onSignDocument}
					onSignMoDocument={onSignMoDocument}
					onSendToRegistry={onSendToRegistry}
					onQueueDeferred={onQueueDeferred}
					onPrint={onPrint}
					onDownloadXml={onDownloadXml}
					onValidateCdaXml={onValidateCdaXml}
					onUploadDetachedSig={onUploadDetachedSig}
					onUploadDetachedMoSig={onUploadDetachedMoSig}
				/>
			</div>

			<SigningStampPreview
				doctorSig={doctorSig}
				moSig={moSig}
				doctor={doctor}
				clinic={clinic}
			/>
		</div>
	);
};
