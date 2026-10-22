/**
 * SigningActionButtons.tsx — 1-Click Action buttons facade
 */

import React from "react";
import { SigningMainActions } from "./SigningMainActions";
import { SigningAuxActions } from "./SigningAuxActions";

export interface SigningActionButtonsProps {
	readonly isSigning: boolean;
	readonly isSending: boolean;
	readonly onSignBoth: () => void;
	readonly onSignDocument: () => void;
	readonly onSignMoDocument: () => void;
	readonly onSendToRegistry: () => void;
	readonly onQueueDeferred: () => void;
	readonly onPrint: () => void;
	readonly onDownloadXml: () => void;
	readonly onValidateCdaXml: () => void;
	readonly onUploadDetachedSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly onUploadDetachedMoSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SigningActionButtons: React.FC<SigningActionButtonsProps> = ({
	isSigning,
	isSending,
	onSignBoth,
	onSignDocument,
	onSignMoDocument,
	onSendToRegistry,
	onQueueDeferred,
	onPrint,
	onDownloadXml,
	onValidateCdaXml,
	onUploadDetachedSig,
	onUploadDetachedMoSig,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1rem" }}>
			<SigningMainActions
				isSigning={isSigning}
				isSending={isSending}
				onSignBoth={onSignBoth}
				onSignDocument={onSignDocument}
				onSignMoDocument={onSignMoDocument}
				onSendToRegistry={onSendToRegistry}
				onQueueDeferred={onQueueDeferred}
			/>
			<SigningAuxActions
				onPrint={onPrint}
				onDownloadXml={onDownloadXml}
				onValidateCdaXml={onValidateCdaXml}
				onUploadDetachedSig={onUploadDetachedSig}
				onUploadDetachedMoSig={onUploadDetachedMoSig}
			/>
		</div>
	);
};
