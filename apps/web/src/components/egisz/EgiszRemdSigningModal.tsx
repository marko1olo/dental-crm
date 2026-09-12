/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD UKEP SIGNING STUDIO MODAL — DENTE DENTAL CRM
 * Canonical SSOT Facade over EgiszRemdHubModal (Mandate 8s)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { EgiszRemdHubModal } from "./EgiszRemdHubModal";
import type { EgiszDentalCdaPayload, GostSignatureInfo } from "./egiszRemdEngine";
import { SAMPLE_DENTAL_SEMD_105_PRESET } from "./egiszRemdEngine";

export interface EgiszRemdSigningModalProps {
	isOpen: boolean;
	onClose: () => void;
	payload?: EgiszDentalCdaPayload | undefined;
	documentId?: string | undefined;
	patientId?: string | undefined;
	visitId?: string | undefined;
	onSigned?: (
		updatedPayload: EgiszDentalCdaPayload,
		signatures: {
			doctorSignature?: GostSignatureInfo | undefined;
			moSignature?: GostSignatureInfo | undefined;
		},
	) => void;
	onSentToRemd?: (result: {
		success: boolean;
		remdDocId?: string | undefined;
		regNumber?: string | undefined;
		error?: string | undefined;
	}) => void;
}

export const EgiszRemdSigningModal: React.FC<EgiszRemdSigningModalProps> = ({
	isOpen,
	onClose,
	payload = SAMPLE_DENTAL_SEMD_105_PRESET,
	onSigned: _onSigned,
	onSentToRemd,
}) => {
	return (
		<EgiszRemdHubModal
			isOpen={isOpen}
			onClose={onClose}
			initialTab="signature"
			initialPayload={payload}
			onSentSuccess={(res) => {
				if (onSentToRemd) {
					onSentToRemd({
						success: true,
						regNumber: res.documentId,
						remdDocId: res.documentId,
					});
				}
			}}
		/>
	);
};
