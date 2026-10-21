import React from "react";
import { createPortal } from "react-dom";
import type { DigitalSignatureTabletModalProps } from "./types";
import { useDigitalSignature } from "./useDigitalSignature";
import { SignatureHeader } from "./SignatureHeader";
import { SignatureContextCard } from "./SignatureContextCard";
import { SignatureTabSelector } from "./SignatureTabSelector";
import { SignatureCanvasPanel } from "./SignatureCanvasPanel";
import { SignatureSmsPanel } from "./SignatureSmsPanel";
import { SignaturePaperPanel } from "./SignaturePaperPanel";
import { SignatureFooter } from "./SignatureFooter";

export const DigitalSignatureTabletModal: React.FC<DigitalSignatureTabletModalProps> = (props) => {
	const {
		isOpen, onClose, document: doc, documentsPackageTitle,
		patient, doctorFullName, clinicName = "Стоматологическая клиника",
		onPrintArchiveA4,
	} = props;

	const {
		canvasRef, activeTab, setActiveTab, hasStroke, setHasStroke,
		smsCode, setSmsCode, smsCountdown, isSubmitting, paperSigned,
		setPaperSigned, docFingerprint, patientName, clearCanvas,
		handleSendSmsCode, handleConfirm,
	} = useDigitalSignature(props);

	if (!isOpen) return null;

	const titleText = documentsPackageTitle || doc?.title || "Пакет медицинской документации";

	const modalNode = (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="digital-signature-tablet-title"
			data-testid="modal-digital-signature-tablet"
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div
				className="document-package-modal-content"
				style={{
					maxWidth: "760px",
					width: "100%",
					background: "var(--paper, #ffffff)",
					color: "var(--ink, #0f172a)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "14px",
				}}
			>
				<SignatureHeader onClose={onClose} />

				<div className="document-package-modal-body" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
					<SignatureContextCard
						titleText={titleText}
						patient={patient}
						patientName={patientName}
						clinicName={clinicName}
						doctorFullName={doctorFullName}
						docFingerprint={docFingerprint}
					/>

					<SignatureTabSelector activeTab={activeTab} setActiveTab={setActiveTab} />

					{activeTab === "canvas" && (
						<SignatureCanvasPanel
							canvasRef={canvasRef}
							hasStroke={hasStroke}
							setHasStroke={setHasStroke}
							clearCanvas={clearCanvas}
							patientName={patientName}
							docFingerprint={docFingerprint}
						/>
					)}

					{activeTab === "sms" && (
						<SignatureSmsPanel
							patientPhone={patient?.phone || undefined}
							smsCode={smsCode}
							setSmsCode={setSmsCode}
							smsCountdown={smsCountdown}
							handleSendSmsCode={handleSendSmsCode}
						/>
					)}

					{activeTab === "paper" && (
						<SignaturePaperPanel
							paperSigned={paperSigned}
							setPaperSigned={setPaperSigned}
							onPrintArchiveA4={onPrintArchiveA4}
							patientName={patientName}
						/>
					)}
				</div>

				<SignatureFooter
					isSubmitting={isSubmitting}
					onClose={onClose}
					onConfirm={handleConfirm}
					onPrintArchiveA4={onPrintArchiveA4}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalNode, document.body)
		: modalNode;
};

DigitalSignatureTabletModal.displayName = "DigitalSignatureTabletModal";
