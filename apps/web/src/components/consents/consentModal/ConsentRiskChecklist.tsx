import React from "react";
import { AlertTriangle } from "lucide-react";
import type { ConsentScopeMismatchResult } from "./types.js";

export interface ConsentRiskChecklistProps {
	scopeMismatch: ConsentScopeMismatchResult;
	onResolveScopeMismatch?: () => void;
}

export const ConsentRiskChecklist: React.FC<ConsentRiskChecklistProps> = ({
	scopeMismatch,
	onResolveScopeMismatch,
}) => {
	if (!scopeMismatch.hasMismatch) {
		return null;
	}

	return (
		<div
			className="consent-scope-mismatch-banner"
			data-testid="modal-consent-scope-mismatch"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "12px",
				padding: "10px 14px",
				borderRadius: "8px",
				background: "var(--amber-surface, #fffbeb)",
				border: "1px solid var(--amber, #d97706)",
				color: "var(--ink)",
				fontSize: "12px",
				flexWrap: "wrap",
			}}
		>
			<div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flex: 1, minWidth: "260px" }}>
				<AlertTriangle size={18} style={{ color: "var(--amber, #d97706)", flexShrink: 0, marginTop: "2px" }} />
				<div>
					<div style={{ fontWeight: 700, color: "var(--amber-dark, #b45309)" }}>
						{scopeMismatch.warningTitle}
					</div>
					<div style={{ color: "var(--muted)", marginTop: "2px", lineHeight: 1.35 }}>
						{scopeMismatch.warningMessage}
					</div>
				</div>
			</div>
			{onResolveScopeMismatch && (
				<button
					type="button"
					className="consent-mode-btn active"
					style={{
						height: "28px",
						padding: "0 10px",
						fontSize: "11.5px",
						fontWeight: 600,
						background: "var(--amber, #d97706)",
						borderColor: "var(--amber-dark, #b45309)",
						color: "#ffffff",
						cursor: "pointer",
						borderRadius: "6px",
						whiteSpace: "nowrap",
					}}
					onClick={onResolveScopeMismatch}
				>
					<span>{scopeMismatch.suggestedActionLabel}</span>
				</button>
			)}
		</div>
	);
};
