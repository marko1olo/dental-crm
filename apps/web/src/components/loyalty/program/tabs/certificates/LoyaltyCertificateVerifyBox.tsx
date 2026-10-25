import type React from "react";

export interface LoyaltyCertificateVerifyBoxProps {
	readonly certVerifyInput: string;
	readonly onCertVerifyInputChange: (input: string) => void;
	readonly certRedeemFeedback: { readonly isSuccess: boolean; readonly message: string } | null;
	readonly onVerifyAndRedeemCert: () => void;
}

export const LoyaltyCertificateVerifyBox: React.FC<LoyaltyCertificateVerifyBoxProps> = ({
	certVerifyInput,
	onCertVerifyInputChange,
	certRedeemFeedback,
	onVerifyAndRedeemCert,
}) => {
	return (
		<div
			style={{
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "0.5rem",
				padding: "0.75rem 1rem",
				marginTop: "1rem",
			}}
		>
			<h5 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem" }}>
				Проверка и погашение сертификата
			</h5>
			<div style={{ display: "flex", gap: "0.5rem" }}>
				<input
					type="text"
					placeholder="7701-XXXX-XXXX-XXXX"
					value={certVerifyInput}
					onChange={(e) => onCertVerifyInputChange(e.target.value)}
					style={{
						flex: 1,
						padding: "0.5rem 0.75rem",
						borderRadius: "0.5rem",
						border: "1px solid var(--line)",
						fontSize: "0.875rem",
						fontFamily: "monospace",
					}}
				/>
				<button
					type="button"
					onClick={onVerifyAndRedeemCert}
					style={{
						padding: "0.5rem 1rem",
						minHeight: "44px",
						borderRadius: "0.5rem",
						border: "none",
						background: "var(--teal)",
						color: "var(--on-teal, var(--paper))",
						fontWeight: 700,
						fontSize: "0.8125rem",
						cursor: "pointer",
					}}
				>
					Списать
				</button>
			</div>
			{certRedeemFeedback && (
				<div
					style={{
						fontSize: "0.8125rem",
						marginTop: "0.5rem",
						fontWeight: 600,
						color: certRedeemFeedback.isSuccess ? "var(--ok-fg)" : "var(--bad-fg)",
					}}
				>
					{certRedeemFeedback.message}
				</div>
			)}
		</div>
	);
};
