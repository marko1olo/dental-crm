/**
 * DmsDiagnosisSelectorChips.tsx — Чипсы выбора разрешенных диагнозов МКБ-10
 */

import { Check } from "lucide-react";
import React from "react";
import { COMMON_DENTAL_ICD10_DIAGNOSES } from "../dmsInsurancePresets.js";

export interface DmsDiagnosisSelectorChipsProps {
	readonly approvedDiagnosisCodes: readonly string[];
	readonly onToggleDiagnosis: (code: string) => void;
}

export function DmsDiagnosisSelectorChips({
	approvedDiagnosisCodes,
	onToggleDiagnosis,
}: DmsDiagnosisSelectorChipsProps) {
	return (
		<div style={{ marginBottom: "16px" }}>
			<div className="dms-label" style={{ marginBottom: "8px" }}>Разрешенные диагнозы (МКБ-10):</div>
			<div className="dente-filter-chips">
				{COMMON_DENTAL_ICD10_DIAGNOSES.map((diag) => {
					const isApproved = approvedDiagnosisCodes.includes(diag.code);
					return (
						<button
							key={diag.code}
							type="button"
							className={`dente-filter-chip ${isApproved ? "active" : ""}`}
							data-active={isApproved}
							onClick={() => onToggleDiagnosis(diag.code)}
						>
							{isApproved && <Check size={13} />}
							<strong>{diag.code}</strong> — {diag.name}
						</button>
					);
				})}
			</div>
		</div>
	);
}
