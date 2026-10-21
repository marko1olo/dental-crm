import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { generateQrCodeSvg } from "@dental/shared";
import { detectMutuallyExclusiveToothProcedures } from "../validation/starProtocolValidationEngine";
import { SignatureLegalAndConflicts } from "./SignatureLegalAndConflicts";
import { SignatureMethodTabs } from "./SignatureMethodTabs";
import { SignatureModalFooter } from "./SignatureModalFooter";
import { SignatureModalHeader } from "./SignatureModalHeader";
import { SignaturePaperBlock } from "./SignaturePaperBlock";
import { SignaturePlanSummary } from "./SignaturePlanSummary";
import { SignatureQrBlock } from "./SignatureQrBlock";
import { SignatureSmsBlock } from "./SignatureSmsBlock";
import type { TreatmentPlanSignatureModalProps } from "./types";
import { useSignatureModalLogic } from "./useSignatureModalLogic";

export const TreatmentPlanSignatureModalView: React.FC<TreatmentPlanSignatureModalProps> = (props) => {
	const { isOpen, tier, patientName, patientId, planId, onClose, doctorFullName = "Лечащий врач стоматолог", clinicName = "Стоматологическая клиника ДЕНТЕ" } = props;

	const logic = useSignatureModalLogic(props);

	const allItems = useMemo(() => (tier?.stages ? tier.stages.flatMap((s) => s.items) : []), [tier]);
	const conflicts = useMemo(() => detectMutuallyExclusiveToothProcedures(allItems), [allItems]);

	const qrSvg = useMemo(() => {
		try {
			const targetPlanId = planId || tier.tierId || "draft";
			const verifyUrl = `https://dente.clinic/portal/sign?planId=${encodeURIComponent(targetPlanId)}&patientId=${encodeURIComponent(patientId)}`;
			return generateQrCodeSvg(verifyUrl, { size: 160 });
		} catch {
			return "";
		}
	}, [planId, tier?.tierId, patientId]);

	if (!isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" data-testid="treatment-plan-signature-modal">
			<div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl border border-[var(--border,#cbd5e1)] shadow-2xl overflow-hidden">
				<SignatureModalHeader onClose={onClose} />

				<div className="flex-1 overflow-y-auto p-5 space-y-4">
					<SignaturePlanSummary tier={tier} patientName={patientName} />

					<SignatureMethodTabs
						signMethod={logic.signMethod}
						onSelectMethod={(method) => {
							logic.setSignMethod(method);
							logic.setErrorText(null);
						}}
					/>

					{logic.signMethod === "sms" && (
						<SignatureSmsBlock
							phone={logic.phone}
							setPhone={logic.setPhone}
							smsCode={logic.smsCode}
							setSmsCode={logic.setSmsCode}
							smsSent={logic.smsSent}
							countdown={logic.countdown}
							isRequestingSms={logic.isRequestingSms}
							onRequestSmsCode={logic.handleRequestSmsCode}
						/>
					)}

					{logic.signMethod === "qr" && <SignatureQrBlock qrSvg={qrSvg} />}

					{logic.signMethod === "paper" && <SignaturePaperBlock signatureBase64={logic.signatureBase64} />}

					<SignatureLegalAndConflicts
						clinicName={clinicName}
						doctorFullName={doctorFullName}
						conflicts={conflicts}
						termsAccepted={logic.termsAccepted}
						setTermsAccepted={logic.setTermsAccepted}
						errorText={logic.errorText}
					/>
				</div>

				<SignatureModalFooter
					isSubmitting={logic.isSubmitting}
					signMethod={logic.signMethod}
					smsSent={logic.smsSent}
					hasConflicts={conflicts.length > 0}
					onClose={onClose}
					onPaperConfirm={logic.handlePaperConfirm}
					onConfirmAgreement={() => logic.handleConfirmAgreement()}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
