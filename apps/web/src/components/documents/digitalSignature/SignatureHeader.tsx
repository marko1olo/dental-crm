import React from "react";
import { FileSignature, X } from "lucide-react";

interface SignatureHeaderProps {
	readonly onClose: () => void;
}

export const SignatureHeader: React.FC<SignatureHeaderProps> = ({ onClose }) => (
	<div
		className="document-package-modal-header"
		style={{
			background: "var(--paper-soft, #f8fafc)",
			borderBottom: "1px solid var(--line, #e2e8f0)",
			padding: "14px 20px",
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
		}}
	>
		<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
			<div
				style={{
					width: "38px",
					height: "38px",
					borderRadius: "10px",
					background: "rgba(13, 148, 136, 0.12)",
					border: "1px solid rgba(13, 148, 136, 0.25)",
					color: "var(--teal, #0d9488)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
				}}
			>
				<FileSignature size={20} aria-hidden="true" />
			</div>
			<div>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
					<h2
						style={{
							fontSize: "16px",
							fontWeight: 700,
							color: "var(--ink, #0f172a)",
							margin: 0,
							lineHeight: 1.25,
						}}
						id="digital-signature-tablet-title"
					>
						Подписание медицинских документов
					</h2>
					<span
						style={{
							fontSize: "11px",
							fontWeight: 700,
							padding: "2px 8px",
							borderRadius: "6px",
							background: "rgba(13, 148, 136, 0.14)",
							color: "var(--teal, #0d9488)",
							border: "1px solid rgba(13, 148, 136, 0.3)",
						}}
					>
						63-ФЗ ст. 5 · ПЭП
					</span>
				</div>
				<p style={{ fontSize: "12px", color: "var(--muted, #64748b)", margin: "2px 0 0 0" }}>
					Подписание пакета клиники стилусом, пальцем, через СМС или отметка о бумажном бланке
				</p>
			</div>
		</div>

		<button
			type="button"
			onClick={onClose}
			className="secondary-button"
			style={{
				height: "34px",
				width: "34px",
				minHeight: "34px",
				padding: 0,
				borderRadius: "8px",
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				border: "1px solid var(--line, #e2e8f0)",
				background: "var(--paper, #ffffff)",
				color: "var(--ink, #0f172a)",
				cursor: "pointer",
			}}
			aria-label="Закрыть планшет подписи"
			data-testid="btn-close-signature-tablet"
		>
			<X size={18} aria-hidden="true" />
		</button>
	</div>
);
