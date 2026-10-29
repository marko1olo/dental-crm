import React from "react";
import { AlertTriangle, HeartPulse, Sparkles } from "lucide-react";
import type { MedicalCardForm043uData } from "../../emr043Types";

export interface Form043AnamnesisTabProps {
	formData: MedicalCardForm043uData;
	onApplyNorm: () => void;
}

export const Form043AnamnesisTab: React.FC<Form043AnamnesisTabProps> = React.memo(
	function Form043AnamnesisTab({ formData, onApplyNorm }) {
		const a = formData.anamnesis;
		return (
			<div>
				<div className="emr043-section-card">
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
						<h3 className="emr043-section-card-title" style={{ margin: 0 }}>
							<HeartPulse className="w-4 h-4 text-sky-600" />
							2. Анамнез жизни и заболевания
						</h3>
						<button
							type="button"
							onClick={onApplyNorm}
							disabled={false}
							data-testid="btn-043-anamnesis-norm"
							className="emr043-btn emr043-btn-secondary"
							style={{ fontSize: "11px", padding: "4px 8px", height: "28px" }}
							title="Заполнить незаполненные графы анамнеза физиологической нормой"
						>
							<Sparkles className="w-3.5 h-3.5 text-amber-500" />
							<span>Норма анамнеза</span>
						</button>
					</div>
					<div className="emr043-grid-2">
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Жалобы при обращении:</div>
							<div className="emr043-field-value">{a.chiefComplaint}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">История настоящего заболевания:</div>
							<div className="emr043-field-value">{a.historyOfPresentIllness}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr043-field-label">Анамнез жизни:</div>
							<div className="emr043-field-value">{a.medicalHistoryVitae}</div>
						</div>
						<div>
							<div className="emr043-field-label">Аллергологический статус:</div>
							<div className="emr043-field-value">
								{a.allergologicalHistory &&
								!a.allergologicalHistory.toLowerCase().includes("не отягощен") &&
								!a.allergologicalHistory.toLowerCase().includes("нет") ? (
									<span className="emr043-allergy-warning-inline inline-flex items-center gap-1">
										<AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
										{a.allergologicalHistory}
									</span>
								) : (
									a.allergologicalHistory || "Не отягощен"
								)}
							</div>
						</div>
						<div>
							<div className="emr043-field-label">Сопутствующие соматические патологии:</div>
							<div className="emr043-field-value">{a.concomitantSomaticDiseases}</div>
						</div>
						<div>
							<div className="emr043-field-label">Постоянный прием медикаментов:</div>
							<div className="emr043-field-value">{a.currentSystemicMedications}</div>
						</div>
						<div>
							<div className="emr043-field-label">Переносимость анестезии и стоматологических вмешательств:</div>
							<div className="emr043-field-value">{a.pastDentalInterventions}</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export const RecordAnamnesisTab = Form043AnamnesisTab;
