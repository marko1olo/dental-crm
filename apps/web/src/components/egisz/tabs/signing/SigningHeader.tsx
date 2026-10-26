/**
 * SigningHeader.tsx — Header title and submode switcher for EgiszSigningTab
 */

import React from "react";

export interface SigningHeaderProps {
	readonly signaturePreviewMode: "print" | "xml";
	readonly onSignaturePreviewModeChange: (mode: "print" | "xml") => void;
}

export const SigningHeader: React.FC<SigningHeaderProps> = ({
	signaturePreviewMode,
	onSignaturePreviewModeChange,
}) => {
	return (
		<>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
				<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
					Подписание СЭМД УКЭП — Электронная подпись документов (УКЭП)
				</div>
				<span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(0, 86, 179, 0.1)", color: "var(--primary-strong)" }}>
					КриптоПро CSP
				</span>
			</div>
			<div style={{ fontSize: "0.8125rem", color: "var(--muted)", marginBottom: "1rem" }}>
				Усиленная квалифицированная электронная подпись (УКЭП ГОСТ Р 34.10-2012)
			</div>
			<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
				<button
					type="button"
					onClick={() => onSignaturePreviewModeChange("print")}
					style={{
						padding: "0.35rem 0.75rem", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
						border: "1px solid var(--line)", background: signaturePreviewMode === "print" ? "var(--paper-strong)" : "var(--paper)",
						color: "var(--ink)", cursor: "pointer",
					}}
				>
					Медицинская карта приёма
				</button>
				<button
					type="button"
					onClick={() => onSignaturePreviewModeChange("xml")}
					style={{
						padding: "0.35rem 0.75rem", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
						border: "1px solid var(--line)", background: signaturePreviewMode === "xml" ? "var(--paper-strong)" : "var(--paper)",
						color: "var(--ink)", cursor: "pointer",
					}}
				>
					HL7 CDA R2 XML
				</button>
			</div>
		</>
	);
};
