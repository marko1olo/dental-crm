import React from "react";
import { ShieldCheck } from "lucide-react";
import type { Form043ValidationResult, MedicalRecordValidationResult } from "../types/recordDataTypes";

interface RecordCompletenessBarProps {
	validation: MedicalRecordValidationResult;
	onApplyNorm: () => void;
}

export const RecordCompletenessBar: React.FC<RecordCompletenessBarProps> = React.memo(function RecordCompletenessBar({ validation, onApplyNorm }) {
	const progressColor = validation.completenessScore >= 80 ? "green" : "yellow";

	return (
		<div className="emr-studio-completeness emr-studio-non-printable">
			<ShieldCheck className={`w-5 h-5 ${validation.isComplete ? "text-emerald-600" : "text-amber-500"}`} />
			<div style={{ fontSize: "12px", fontWeight: 600 }}>Заполненность карты: <strong>{validation.completenessScore}%</strong></div>
			<div className="emr-studio-progress-track">
				<div className={`emr-studio-progress-fill ${progressColor}`} style={{ width: `${validation.completenessScore}%` }} />
			</div>
			{validation.missingFields.length > 0 && (
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
					<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
						Не заполнено: {validation.missingFields.map((m) => m.label).join(", ")}
					</span>
					<button
						type="button"
						onClick={onApplyNorm}
						disabled={false}
						data-testid="btn-emr-completeness-norm"
						style={{ fontSize: "11px", color: "var(--teal, #0d9488)", background: "transparent", border: "none", textDecoration: "underline", cursor: "pointer", fontWeight: 600, padding: 0 }}
						title="Заполнить незаполненные показатели физиологической нормой"
					>
						Норма в 1 клик
					</button>
				</div>
			)}
		</div>
	);
});
