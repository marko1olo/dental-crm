import React from "react";
import { ShieldCheck } from "lucide-react";
import type { Form043ValidationResult } from "../emr043Types";

interface RecordCompletenessBarProps {
	validation: Form043ValidationResult;
	onApplyNorm: () => void;
}

export const RecordCompletenessBar: React.FC<RecordCompletenessBarProps> = React.memo(function RecordCompletenessBar({ validation, onApplyNorm }) {
	const progressColor = validation.completenessScore >= 90 ? "green" : validation.completenessScore >= 60 ? "yellow" : "red";

	return (
		<div className="emr043-completeness-bar emr043-non-printable">
			<ShieldCheck className={`w-5 h-5 ${validation.isComplete ? "text-emerald-600" : "text-amber-500"}`} />
			<div style={{ fontSize: "12px", fontWeight: 600 }}>Заполненность карты: <strong>{validation.completenessScore}%</strong></div>
			<div className="emr043-progress-track">
				<div className={`emr043-progress-fill ${progressColor}`} style={{ width: `${validation.completenessScore}%` }} />
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
						data-testid="btn-043-completeness-norm"
						style={{ fontSize: "11px", color: "var(--teal, #0d9488)", background: "transparent", border: "none", textDecoration: "underline", cursor: "pointer", fontWeight: 600, padding: 0 }}
						title="Заполнить незаполненные показатели физиологической нормой"
					>
						Заполнить нормой
					</button>
				</div>
			)}
		</div>
	);
});
