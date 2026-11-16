/**
 * apps/web/src/components/emr/record/tabs/RecordAnamnesisTab.tsx
 *
 * Жалобы и соматический анамнез медицинской карты приёма DENTE CRM.
 * Автономия врача, Чистый живой доменный язык (Мандаты 8e, 8x, 8am).
 */

import React from "react";
import { AlertTriangle, HeartPulse, Sparkles } from "lucide-react";
import type { MedicalRecordData, ClinicalAnamnesisData } from "../../types/recordDataTypes";

export interface RecordAnamnesisTabProps {
	formData: MedicalRecordData;
	onApplyNorm: () => void;
	onUpdateAnamnesis?: ((patch: Partial<ClinicalAnamnesisData>) => void) | undefined;
}

export type Form043AnamnesisTabProps = RecordAnamnesisTabProps;

const textareaClass =
	"w-full rounded border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 px-2.5 py-1.5 text-xs text-[var(--ink,#0f172a)] dark:text-slate-100 placeholder:text-slate-400 focus:border-[var(--teal,#0d9488)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)] transition-colors resize-y";

export const RecordAnamnesisTab: React.FC<RecordAnamnesisTabProps> = React.memo(
	function RecordAnamnesisTab({ formData, onApplyNorm, onUpdateAnamnesis }) {
		const a = formData.anamnesis;
		const hasAllergyWarning =
			Boolean(a.allergologicalHistory) &&
			!a.allergologicalHistory.toLowerCase().includes("не отягощен") &&
			!a.allergologicalHistory.toLowerCase().includes("нет") &&
			!a.allergologicalHistory.toLowerCase().includes("спокоен");

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
							<label className="emr-studio-field-label">Жалобы при обращении:</label>
							{onUpdateAnamnesis ? (
								<textarea
									rows={2}
									className={textareaClass}
									value={a.chiefComplaint}
									onChange={(e) => onUpdateAnamnesis({ chiefComplaint: e.target.value })}
									placeholder="Жалобы пациента (напр. боли от температурных раздражителей)..."
								/>
							) : (
								<div className="emr-studio-field-value">{a.chiefComplaint}</div>
							)}
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<label className="emr-studio-field-label">История настоящего заболевания:</label>
							{onUpdateAnamnesis ? (
								<textarea
									rows={2}
									className={textareaClass}
									value={a.historyOfPresentIllness}
									onChange={(e) => onUpdateAnamnesis({ historyOfPresentIllness: e.target.value })}
									placeholder="Анамнез заболевания (когда впервые появились симптомы, динамика)..."
								/>
							) : (
								<div className="emr-studio-field-value">{a.historyOfPresentIllness}</div>
							)}
						</div>
						<div style={{ gridColumn: "1 / -1" }}>
							<label className="emr-studio-field-label">Анамнез жизни:</label>
							{onUpdateAnamnesis ? (
								<textarea
									rows={2}
									className={textareaClass}
									value={a.medicalHistoryVitae}
									onChange={(e) => onUpdateAnamnesis({ medicalHistoryVitae: e.target.value })}
									placeholder="Перенесенные заболевания, условия труда и быта..."
								/>
							) : (
								<div className="emr-studio-field-value">{a.medicalHistoryVitae}</div>
							)}
						</div>
						<div>
							<div className="flex items-center justify-between mb-1">
								<label className="emr-studio-field-label" style={{ marginBottom: 0 }}>Аллергологический статус:</label>
								{hasAllergyWarning && (
									<span className="emr-studio-allergy-warning-inline inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
										<AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
										<span>Внимание: аллергоанамнез</span>
									</span>
								)}
							</div>
							{onUpdateAnamnesis ? (
								<textarea
									rows={2}
									className={`${textareaClass} ${hasAllergyWarning ? "border-amber-500/80 bg-amber-500/5" : ""}`}
									value={a.allergologicalHistory}
									onChange={(e) => onUpdateAnamnesis({ allergologicalHistory: e.target.value })}
									placeholder="Аллергические реакции на медикаменты (анестетики, антибиотики)..."
								/>
							) : (
								<div className="emr-studio-field-value">
									{hasAllergyWarning ? (
										<span className="emr-studio-allergy-warning-inline inline-flex items-center gap-1">
											<AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
											{a.allergologicalHistory}
										</span>
									) : (
										a.allergologicalHistory || "Не отягощен"
									)}
								</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">Сопутствующие соматические патологии:</label>
							{onUpdateAnamnesis ? (
								<textarea
									rows={2}
									className={textareaClass}
									value={a.concomitantSomaticDiseases}
									onChange={(e) => onUpdateAnamnesis({ concomitantSomaticDiseases: e.target.value })}
									placeholder="ССЗ, сахарный диабет, гепатит, ЖКТ..."
								/>
							) : (
								<div className="emr-studio-field-value">{a.concomitantSomaticDiseases}</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">Постоянный прием медикаментов:</label>
							{onUpdateAnamnesis ? (
								<textarea
									rows={2}
									className={textareaClass}
									value={a.currentSystemicMedications}
									onChange={(e) => onUpdateAnamnesis({ currentSystemicMedications: e.target.value })}
									placeholder="Антикоагулянты, гипотензивные, гормоны..."
								/>
							) : (
								<div className="emr-studio-field-value">{a.currentSystemicMedications}</div>
							)}
						</div>
						<div>
							<label className="emr-studio-field-label">Переносимость анестезии и вмешательств:</label>
							{onUpdateAnamnesis ? (
								<textarea
									rows={2}
									className={textareaClass}
									value={a.pastDentalInterventions}
									onChange={(e) => onUpdateAnamnesis({ pastDentalInterventions: e.target.value })}
									placeholder="Переносимость местной анестезии, обмороки, кровотечения..."
								/>
							) : (
								<div className="emr-studio-field-value">{a.pastDentalInterventions}</div>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export const Form043AnamnesisTab = RecordAnamnesisTab;
