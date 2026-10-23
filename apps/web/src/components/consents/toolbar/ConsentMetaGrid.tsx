import React, { useMemo } from "react";
import type { ConsentSubstitutionContext } from "../consentTemplates.js";
import { sanitizeConsentContext } from "../consentSummaryHelper.js";

export interface ConsentMetaGridProps {
	substitutionContext: ConsentSubstitutionContext;
}

export const ConsentMetaGrid: React.FC<ConsentMetaGridProps> = ({
	substitutionContext,
}) => {
	const cleanContext = useMemo(
		() => sanitizeConsentContext(substitutionContext),
		[substitutionContext],
	);

	const cleanTeethList = useMemo(() => {
		const raw = cleanContext.toothNumbers || "";
		if (!raw || raw === "Полость рта (зубной ряд)" || raw === "Полость рта") return [];
		return raw.split(/[,;\s]+/).filter(Boolean);
	}, [cleanContext.toothNumbers]);

	return (
		<div className="consent-meta-grid">
			<div className="consent-meta-item min-w-0">
				<span className="consent-meta-label">Пациент</span>
				<span
					className="consent-meta-value break-words"
					title={cleanContext.patientName || "Бланк для ручного заполнения («________»)"}
				>
					{cleanContext.patientName || (
						<em style={{ color: "var(--muted, #64748b)" }}>Бланк («________»)</em>
					)}
				</span>
				{cleanContext.birthDate && (
					<span className="consent-meta-label truncate">Д.Р.: {cleanContext.birthDate}</span>
				)}
			</div>

			<div className="consent-meta-item min-w-0">
				<span className="consent-meta-label">Лечащий врач</span>
				<span
					className="consent-meta-value break-words"
					title={cleanContext.doctorName || "Врач не назначен"}
				>
					{cleanContext.doctorName || (
						<em style={{ color: "var(--muted, #64748b)" }}>Не назначен</em>
					)}
				</span>
			</div>

			<div className="consent-meta-item min-w-0">
				<span className="consent-meta-label">Диагноз (МКБ-10)</span>
				<span
					className="consent-meta-value break-words"
					title={cleanContext.diagnosisIcd || "Первичный осмотр"}
				>
					{cleanContext.diagnosisIcd || (
						<em style={{ color: "var(--muted, #64748b)" }}>Не указан</em>
					)}
				</span>
			</div>

			<div className="consent-meta-item min-w-0">
				<span className="consent-meta-label">Зубы / Зона</span>
				<span
					className="consent-meta-value truncate"
					title={cleanContext.toothNumbers || "Полость рта"}
				>
					{cleanContext.toothNumbers || (
						<span style={{ color: "var(--muted, #64748b)" }}>Полость рта</span>
					)}
				</span>
				{cleanTeethList.length > 0 && (
					<div
						className="consent-teeth-badges"
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "3px",
							maxHeight: "56px",
							overflowY: "auto",
						}}
					>
						{cleanTeethList.map((t) => (
							<span key={t} className="consent-tooth-chip">
								{t}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
};
