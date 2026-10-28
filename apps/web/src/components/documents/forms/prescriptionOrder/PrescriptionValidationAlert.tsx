import React from "react";
import { AlertCircle } from "lucide-react";
import type { PrescriptionValidationResult } from "../prescriptionPrintEngine";

export const PrescriptionValidationAlert: React.FC<{ validation: PrescriptionValidationResult | null }> = ({ validation }) => {
	if (!validation || (validation.isValid && validation.warnings.length === 0)) return null;

	return (
		<div
			style={{
				margin: "8px 0", padding: "8px 12px", borderRadius: "var(--radius-sm, 4px)",
				backgroundColor: "var(--surface-warning, #fffbeb)", border: "1px solid var(--border-warning, #fef3c7)",
				color: "var(--text-warning, #92400e)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "4px",
			}}
		>
			{validation.errors.map((err, idx) => (
				<div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<AlertCircle size={13} aria-hidden="true" />
					<span>{err}</span>
				</div>
			))}
			{validation.warnings.map((warn, idx) => (
				<div key={`w-${idx}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<AlertCircle size={13} aria-hidden="true" />
					<span>{warn}</span>
				</div>
			))}
		</div>
	);
};
