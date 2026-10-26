import React from "react";
import type { ClinicalSeverity } from "../../icd10DentalCatalog";

interface Icd10SeverityBadgeProps {
	severity: ClinicalSeverity;
}

const LABELS: Record<ClinicalSeverity, string> = {
	critical: "Острое / Неотложное",
	high: "Высокая тяжесть",
	medium: "Стандартная",
	low: "Начальная / Профилактика",
};

export const Icd10SeverityBadge: React.FC<Icd10SeverityBadgeProps> = ({ severity }) => {
	const label = LABELS[severity] ?? severity;
	return (
		<span className={`icd10-severity-badge ${severity}`} title={`Категория тяжести: ${label}`}>
			{label}
		</span>
	);
};
