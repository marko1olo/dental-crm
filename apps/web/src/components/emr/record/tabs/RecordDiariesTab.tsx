import React from "react";
import { Calendar, Sparkles, ShieldCheck } from "lucide-react";
import type { MedicalCardForm043uData } from "../../emr043Types";

export interface Form043DiariesTabProps {
	formData: MedicalCardForm043uData;
	onOpenProtocolGenerator?: (() => void) | undefined;
	onOpenInternalProtocolGenerator: () => void;
}

export const Form043DiariesTab: React.FC<Form043DiariesTabProps> = React.memo(
	function Form043DiariesTab({ formData, onOpenProtocolGenerator, onOpenInternalProtocolGenerator }) {
		return (
			<div>
				<div className="emr043-section-card">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
						<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
							<Calendar className="w-4 h-4 text-sky-600" />
							4. Дневники клинических приёмов (Медицинская карта)
						</h3>
						<button
							type="button"
							className="emr043-btn emr043-btn-primary touch-manipulation"
							style={{ minHeight: "44px", padding: "0.45rem 1rem", fontSize: "0.85rem", background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)", color: "white", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
							onClick={() => (onOpenProtocolGenerator ? onOpenProtocolGenerator() : onOpenInternalProtocolGenerator())}
							data-testid="form043-synthesize-diary-btn"
							title="Сформировать дневник по МКБ-10 и зубной формуле"
						>
							<Sparkles className="w-4 h-4" />
							<span>Сформировать дневник по МКБ-10 и формуле</span>
						</button>
					</div>

					{formData.visitDiaries.map((diary, index) => (
						<div key={diary.id || index} className="emr043-soap-card">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid var(--glass-border, #e2e8f0)", paddingBottom: "6px" }}>
								<div>
									<span className="emr043-soap-badge">Визит #{index + 1}</span>
									<strong>{diary.entryDate}</strong> {diary.entryTime ? `в ${diary.entryTime}` : ""}
									{diary.toothNumber && <span style={{ marginLeft: "8px", fontWeight: 600, color: "var(--teal)" }}>• Зуб FDI № {diary.toothNumber}</span>}
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
									Врач: <strong>{diary.doctorFullName}</strong>
								</div>
							</div>
							<div style={{ marginBottom: "6px" }}>
								<span style={{ fontWeight: 700, color: "var(--teal)" }}>S (Subjective):</span> {diary.subjectiveComplaints}
							</div>
							<div style={{ marginBottom: "6px" }}>
								<span style={{ fontWeight: 700, color: "var(--teal)" }}>O (Objective):</span> {diary.objectiveStatusLocalis}
								{diary.eodMicroamperes ? ` [ЭОД: ${diary.eodMicroamperes} мкА]` : ""}
							</div>
							<div style={{ marginBottom: "6px" }}>
								<span style={{ fontWeight: 700, color: "var(--teal)" }}>A (Assessment):</span> <strong>{diary.assessmentDiagnosisText}</strong> [{diary.assessmentIcd10Code}]
							</div>
							<div style={{ marginBottom: "6px" }}>
								<span style={{ fontWeight: 700, color: "var(--teal)" }}>P (Plan & Protocol):</span> {diary.procedureProtocol}
							</div>
							{diary.anesthesiaDetails && (
								<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginBottom: "4px" }}>• Анестезия: {diary.anesthesiaDetails}</div>
							)}
							{diary.appliedMaterials && (
								<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginBottom: "4px" }}>• Материалы: {diary.appliedMaterials}</div>
							)}
							{diary.digitalSignatureHash && (
								<div style={{ marginTop: "8px", fontSize: "11px", color: "var(--ok-fg)", display: "flex", alignItems: "center", gap: "4px" }}>
									<ShieldCheck className="w-3.5 h-3.5" />
									<span>Заверено УКЭП (ГОСТ Р 34.10): {diary.digitalSignatureHash.slice(0, 20)}…</span>
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		);
	},
);

export const RecordDiariesTab = Form043DiariesTab;
