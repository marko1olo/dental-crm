/**
 * apps/web/src/components/emr/record/tabs/RecordAnamnesisTab.tsx
 *
 * Жалобы и соматический анамнез медицинской карты приёма DENTE CRM.
 * Автономия врача, Чистый живой доменный язык.
 */

import React from "react";
import { AlertTriangle, HeartPulse, Sparkles } from "lucide-react";
import type { MedicalRecordData } from "../../types/recordDataTypes";

export interface RecordAnamnesisTabProps {
	formData: MedicalRecordData;
	onApplyNorm: () => void;
}

export type Form043AnamnesisTabProps = RecordAnamnesisTabProps;

export const RecordAnamnesisTab: React.FC<RecordAnamnesisTabProps> = React.memo(
	function RecordAnamnesisTab({ formData, onApplyNorm }) {
		const a = formData.anamnesis;
		return (
			<div>
				<div className="emr-studio-card emr-studio-section-card">
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
						<h3 className="emr-studio-card-title emr-studio-section-card-title flex items-center gap-2" style={{ margin: 0 }}>
							<HeartPulse className="w-4 h-4 text-sky-600" />
							<span>2. Жалобы и соматический анамнез</span>
						</h3>
						<button
							type="button"
							onClick={onApplyNorm}
							disabled={false}
							data-testid="btn-emr-anamnesis-norm"
							className="dente-btn dente-btn-secondary emr-studio-btn emr-studio-btn-secondary"
							style={{ fontSize: "11px", padding: "4px 10px", height: "30px" }}
							title="Заполнить незаполненные графы анамнеза физиологической нормой"
						>
							<Sparkles className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
							<span>Физиологическая норма</span>
						</button>
					</div>
					<div className="emr-studio-grid-2">
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr-studio-field-label">Жалобы при обращении:</div>
							<div className="emr-studio-field-value">{a.chiefComplaint}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr-studio-field-label">История настоящего заболевания:</div>
							<div className="emr-studio-field-value">{a.historyOfPresentIllness}</div>
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<div className="emr-studio-field-label">Анамнез жизни:</div>
							<div className="emr-studio-field-value">{a.medicalHistoryVitae}</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Аллергологический статус:</div>
							<div className="emr-studio-field-value">
								{a.allergologicalHistory &&
								!a.allergologicalHistory.toLowerCase().includes("не отягощен") &&
								!a.allergologicalHistory.toLowerCase().includes("нет") ? (
									<span className="emr-studio-allergy-warning-inline inline-flex items-center gap-1">
										<AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
										{a.allergologicalHistory}
									</span>
								) : (
									a.allergologicalHistory || "Не отягощен"
								)}
							</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Сопутствующие соматические патологии:</div>
							<div className="emr-studio-field-value">{a.concomitantSomaticDiseases}</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Постоянный прием медикаментов:</div>
							<div className="emr-studio-field-value">{a.currentSystemicMedications}</div>
						</div>
						<div>
							<div className="emr-studio-field-label">Переносимость анестезии и стоматологических вмешательств:</div>
							<div className="emr-studio-field-value">{a.pastDentalInterventions}</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export const Form043AnamnesisTab = RecordAnamnesisTab;
