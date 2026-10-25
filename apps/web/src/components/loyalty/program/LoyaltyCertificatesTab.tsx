import type React from "react";
import type { GiftCertificate } from "./loyaltyEngine";
import { LoyaltyCertificateNominalSelector } from "./tabs/certificates/LoyaltyCertificateNominalSelector";
import { LoyaltyCertificateVerifyBox } from "./tabs/certificates/LoyaltyCertificateVerifyBox";
import { LoyaltyCertificatePreviewCard } from "./tabs/certificates/LoyaltyCertificatePreviewCard";

export interface LoyaltyCertificatesTabProps {
	readonly certificateNominalRub: number;
	readonly onNominalChange: (nominal: number) => void;
	readonly recipientName: string;
	readonly onRecipientNameChange: (name: string) => void;
	readonly activeCertificate: GiftCertificate | null;
	readonly certVerifyInput: string;
	readonly onCertVerifyInputChange: (input: string) => void;
	readonly certRedeemFeedback: { readonly isSuccess: boolean; readonly message: string } | null;
	readonly onGenerateNewCertificate: () => void;
	readonly onVerifyAndRedeemCert: () => void;
	readonly clinicName: string;
}

export const LoyaltyCertificatesTab: React.FC<LoyaltyCertificatesTabProps> = (p) => {
	return (
		<div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
					gap: "1.5rem",
				}}
			>
				<div>
					<LoyaltyCertificateNominalSelector
						certificateNominalRub={p.certificateNominalRub}
						onNominalChange={p.onNominalChange}
						recipientName={p.recipientName}
						onRecipientNameChange={p.onRecipientNameChange}
						onGenerateNewCertificate={p.onGenerateNewCertificate}
					/>

					<LoyaltyCertificateVerifyBox
						certVerifyInput={p.certVerifyInput}
						onCertVerifyInputChange={p.onCertVerifyInputChange}
						certRedeemFeedback={p.certRedeemFeedback}
						onVerifyAndRedeemCert={p.onVerifyAndRedeemCert}
					/>
				</div>

				<div className="loyalty-certificate-printable">
					<LoyaltyCertificatePreviewCard
						activeCertificate={p.activeCertificate}
						recipientName={p.recipientName}
						clinicName={p.clinicName}
					/>
				</div>
			</div>
		</div>
	);
};
