import React from "react";
import { CheckCircle2, Printer } from "lucide-react";

interface SignatureFooterProps {
	readonly isSubmitting: boolean;
	readonly onClose: () => void;
	readonly onConfirm: () => void;
	readonly onPrintArchiveA4?: (() => void) | undefined;
}

export const SignatureFooter: React.FC<SignatureFooterProps> = ({
	isSubmitting,
	onClose,
	onConfirm,
	onPrintArchiveA4,
}) => (
	<div
		className="document-package-modal-footer"
		style={{
			background: "var(--paper-soft, #f8fafc)",
			borderTop: "1px solid var(--line, #e2e8f0)",
			padding: "12px 20px",
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: "12px",
			flexWrap: "wrap",
		}}
	>
		<div>
			{onPrintArchiveA4 && (
				<button
					type="button"
					onClick={onPrintArchiveA4}
					className="secondary-button"
					style={{
						minHeight: "44px",
						padding: "0 16px",
						borderRadius: "8px",
						border: "1px solid var(--line, #cbd5e1)",
						background: "var(--paper, #ffffff)",
						color: "var(--ink, #0f172a)",
						fontSize: "13px",
						fontWeight: 600,
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						cursor: "pointer",
						touchAction: "manipulation",
					}}
					title="Распечатать двусторонний официальный бланк А4"
					data-testid="btn-print-archive-blank"
				>
					<Printer size={15} color="var(--teal, #0d9488)" />
					<span>Печать оригинала А4</span>
				</button>
			)}
		</div>

		<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
			<button
				type="button"
				onClick={onClose}
				className="secondary-button"
				style={{
					minHeight: "44px",
					padding: "0 16px",
					borderRadius: "8px",
					border: "1px solid var(--line, #cbd5e1)",
					background: "var(--paper, #ffffff)",
					color: "var(--ink, #0f172a)",
					fontSize: "13px",
					fontWeight: 600,
					cursor: "pointer",
					touchAction: "manipulation",
				}}
				data-testid="btn-cancel-signature"
			>
				Отмена
			</button>

			<button
				type="button"
				disabled={isSubmitting}
				onClick={onConfirm}
				className="primary-button"
				style={{
					minHeight: "44px",
					padding: "0 18px",
					borderRadius: "8px",
					border: "1px solid var(--teal, #0d9488)",
					background: "var(--teal, #0d9488)",
					color: "#ffffff",
					fontSize: "12.5px",
					fontWeight: 700,
					display: "inline-flex",
					alignItems: "center",
					gap: "8px",
					cursor: "pointer",
				}}
				data-testid="btn-confirm-pep-signature"
			>
				<CheckCircle2 size={15} />
				<span>{isSubmitting ? "Утверждение..." : "Утвердить подписание"}</span>
			</button>
		</div>
	</div>
);
