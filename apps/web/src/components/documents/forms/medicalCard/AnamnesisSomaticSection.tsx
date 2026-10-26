/**
 * forms/medicalCard/AnamnesisSomaticSection.tsx
 * Somatic anamnesis and clinical norm 1-click applicator (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { DentalMedicalCardAnamnesisTabProps } from "./medicalCardAnamnesisTypes";

export const AnamnesisSomaticSection: React.FC<DentalMedicalCardAnamnesisTabProps> = ({
	chiefComplaint,
	setChiefComplaint,
	historyOfPresentIllness,
	setHistoryOfPresentIllness,
	allergologicalHistory,
	setAllergologicalHistory,
	concomitantDiseases,
	setConcomitantDiseases,
	currentMedications,
	setCurrentMedications,
	pregnancyLactationStatus,
	setPregnancyLactationStatus,
	pastDentalInterventions,
	setPastDentalInterventions,
	effectiveDisabled,
	onApplyAnamnesisNorm,
}) => {
	return (
		<>
			<div
				style={{
					display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px",
					padding: "10px 14px", background: "var(--teal-surface, rgba(13, 148, 136, 0.08))",
					borderRadius: "8px", border: "1px solid var(--teal-line, rgba(13, 148, 136, 0.2))", flexWrap: "wrap", gap: "8px",
				}}
			>
				<div>
					<strong style={{ color: "var(--teal-dark, #0f766e)", fontSize: "13px" }}>Клиническая норма:</strong>
					<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
						Заполнение физиологической нормой. Врач правит только патологию.
					</div>
				</div>
				<button
					type="button"
					data-testid="btn-043-anamnesis-norm-1click"
					className="btn btn-sm btn-success"
					onClick={onApplyAnamnesisNorm}
					disabled={effectiveDisabled}
					title="Заполнить анамнез, СОПР, прикус и план физиологической нормой"
					style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
				>
					<CheckCircle2 style={{ width: "16px", height: "16px" }} />
					Соматически здоров (Норма)
				</button>
			</div>

			<h5 style={{ marginBottom: "12px" }}>Жалобы и Анамнез заболевания</h5>
			<div style={{ marginBottom: "14px" }}>
				<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Жалобы пациента (Chief Complaint):</label>
				<textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="Жалобы на боли, эстетический дефект, кровоточивость десен..." rows={2} disabled={effectiveDisabled} style={{ width: "100%" }} />
			</div>

			<div style={{ marginBottom: "16px" }}>
				<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>История настоящего заболевания:</label>
				<textarea value={historyOfPresentIllness} onChange={(e) => setHistoryOfPresentIllness(e.target.value)} placeholder="Когда началось заболевание, динамика, проводимое ранее лечение..." rows={2} disabled={effectiveDisabled} style={{ width: "100%" }} />
			</div>

			<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
				Анамнез жизни и соматический статус
			</h5>
			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
				<label>
					Аллергологический анамнез
					<input type="text" value={allergologicalHistory} onChange={(e) => setAllergologicalHistory(e.target.value)} placeholder="Аллергии на лекарства, анестетики, латекс..." disabled={effectiveDisabled} />
				</label>
				<label>
					Сопутствующие заболевания
					<input type="text" value={concomitantDiseases} onChange={(e) => setConcomitantDiseases(e.target.value)} placeholder="Гипертония, СД, ИБС, гепатиты, отрицает..." disabled={effectiveDisabled} />
				</label>
			</div>

			<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
				<label>
					Принимаемые препараты
					<input type="text" value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} placeholder="Антикоагулянты, гипотензивные..." disabled={effectiveDisabled} />
				</label>
				<label>
					Беременность / Лактация
					<input type="text" value={pregnancyLactationStatus} onChange={(e) => setPregnancyLactationStatus(e.target.value)} placeholder="Нет / Срок в неделях" disabled={effectiveDisabled} />
				</label>
				<label>
					Перенесенные стом. вмешательства
					<input type="text" value={pastDentalInterventions} onChange={(e) => setPastDentalInterventions(e.target.value)} placeholder="Лечение кариеса, удаление..." disabled={effectiveDisabled} />
				</label>
			</div>
		</>
	);
};
