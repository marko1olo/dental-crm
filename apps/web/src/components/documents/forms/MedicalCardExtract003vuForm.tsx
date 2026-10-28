import React, { useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { MedicalCardExtract003vuPayload, MedicalExtractTreatmentStage } from "@dental/shared";
import { MedicalCardExtractStagesTable } from "./medicalCardExtract/MedicalCardExtractStagesTable";
import { getDefaultDemoStages } from "./medicalCardExtract/defaultStages";

export interface MedicalCardExtract003vuFormProps {
	initialPayload?: Partial<MedicalCardExtract003vuPayload> | undefined;
	onChange?: ((payload: MedicalCardExtract003vuPayload) => void) | undefined;
	disabled?: boolean | undefined;
}

export const MedicalCardExtract003vuForm: React.FC<MedicalCardExtract003vuFormProps> = React.memo(
	function MedicalCardExtract003vuForm({ initialPayload, onChange, disabled }) {
		const defaultDoctor = initialPayload?.attendingDoctorFullName?.trim() || "Врач-стоматолог";
		const [initialConsultationDiagnosis, setInitialConsultationDiagnosis] = useState(
			initialPayload?.initialConsultationDiagnosis ??
			(initialPayload as any)?.diagnosisOnAdmission ??
			(isDemoShowcaseMode() ? "K04.0 Начальный пульпит зуба 2.6" : ""),
		);
		const [clinicalDiagnosis, setClinicalDiagnosis] = useState(
			initialPayload?.primaryDiagnosisText ??
			(isDemoShowcaseMode() ? "K04.0 Хронический фиброзный пульпит зуба 2.6" : ""),
		);
		const [recommendations, setRecommendations] = useState(
			initialPayload?.followUpRecommendations ??
			(isDemoShowcaseMode()
				? "Контрольный осмотр и профгигиена через 6 месяцев, контрольная прицельная визиография зуба 2.6."
				: ""),
		);
		const [stages, setStages] = useState<MedicalExtractTreatmentStage[]>(() => {
			if (initialPayload?.treatmentStagesTimeline) {
				return initialPayload.treatmentStagesTimeline;
			}
			return isDemoShowcaseMode() ? getDefaultDemoStages(defaultDoctor) : [];
		});

		const addStageRow = () => {
			if (disabled) return;
			setStages((prev) => [
				...prev,
				{
					treatmentDate: new Date().toISOString().slice(0, 10),
					toothOrAnatomicalArea: "26",
					diagnosisIcd10: "K04.0",
					diagnosisText: clinicalDiagnosis,
					performedIntervention: "Контрольный осмотр, коррекция окклюзионных контактов",
					attendingDoctorFullName: defaultDoctor,
				},
			]);
		};

		return (
			<div className="document-form-container form-003vu-wrapper">
				<DocumentPayloadCard
					title="Справка о посещении клиники (Выписка из карты)"
					description="Официальная выписка с хроникой этапов лечения, диагностическими данными и рекомендациями"
				>
					<div className="form-group" style={{ marginBottom: "12px" }}>
						<label style={{ fontWeight: 600 }}>Диагноз первичного осмотра</label>
						<input
							type="text"
							className="form-control"
							placeholder="напр. K04.0 Начальный пульпит зуба 2.6"
							value={initialConsultationDiagnosis}
							onChange={(e) => setInitialConsultationDiagnosis(e.target.value)}
						/>
					</div>

					<div className="form-group" style={{ marginBottom: "12px" }}>
						<label style={{ fontWeight: 600 }}>Клинический развернутый диагноз</label>
						<input
							type="text"
							className="form-control"
							placeholder="напр. K04.0 Хронический фиброзный пульпит зуба 2.6"
							value={clinicalDiagnosis}
							onChange={(e) => setClinicalDiagnosis(e.target.value)}
						/>
					</div>

					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 8px 0" }}>
						<h4 style={{ margin: 0 }}>Хронологические этапы проведенного лечения ({stages.length})</h4>
						<button
							type="button"
							className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1.5 text-xs"
							onClick={addStageRow}
							disabled={disabled}
						>
							+ Добавить этап
						</button>
					</div>

					<MedicalCardExtractStagesTable stages={stages} />

					<div className="form-group">
						<label style={{ fontWeight: 600 }}>Рекомендации пациенту</label>
						<textarea
							className="form-control"
							rows={2}
							placeholder="Рекомендации по уходу, контрольным осмотрам, гигиене"
							value={recommendations}
							onChange={(e) => setRecommendations(e.target.value)}
						/>
					</div>
				</DocumentPayloadCard>
			</div>
		);
	},
);
