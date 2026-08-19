import React, { useState } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { MedicalCardExtract003vuPayload, MedicalExtractTreatmentStage } from "@dental/shared";

export interface MedicalCardExtract003vuFormProps {
	initialPayload?: Partial<MedicalCardExtract003vuPayload>;
	onChange?: (payload: MedicalCardExtract003vuPayload) => void;
	disabled?: boolean;
}

export const MedicalCardExtract003vuForm: React.FC<MedicalCardExtract003vuFormProps> = React.memo(
	function MedicalCardExtract003vuForm({ initialPayload, onChange, disabled }) {
		const [admissionDiagnosis, setAdmissionDiagnosis] = useState(
			initialPayload?.diagnosisOnAdmission ?? "K04.0 Начальный пульпит зуба 2.6",
		);
		const [clinicalDiagnosis, setClinicalDiagnosis] = useState(
			initialPayload?.clinicalDiagnosisDetailed ?? "K04.0 Хронический фиброзный пульпит зуба 2.6",
		);
		const [recommendations, setRecommendations] = useState(
			initialPayload?.followUpRecommendations ?? "Диспансерный осмотр через 6 месяцев, контрольная прицельная визиография зуба 2.6.",
		);
		const [stages, setStages] = useState<MedicalExtractTreatmentStage[]>(() => {
			return (
				initialPayload?.treatmentStages ?? [
					{
						stageDate: "2026-08-10",
						toothNumber: 26,
						diagnosis: "K04.0 Пульпит",
						interventionSummary: "Анестезия Ubistesin 1.7 мл, экстирпация пульпы, медикаментозная обработка 3 каналов, временная обтурация гидроксидом кальция",
						anesthesiaUsed: "Ubistesin 4% 1.7 мл",
						treatingDoctorFullName: "Иванов И.И.",
					},
					{
						stageDate: "2026-08-17",
						toothNumber: 26,
						diagnosis: "K04.0 Пульпит",
						interventionSummary: "Постоянная обтурация корневых каналов методом латеральной компакции гуттаперчи с силером AH-Plus, реставрация коронковой части светоотверждаемым композитом",
						treatingDoctorFullName: "Иванов И.И.",
					},
				]
			);
		});

		const addStageRow = () => {
			if (disabled) return;
			setStages((prev) => [
				...prev,
				{
					stageDate: new Date().toISOString().slice(0, 10),
					toothNumber: 26,
					diagnosis: clinicalDiagnosis,
					interventionSummary: "Контрольный осмотр, коррекция окклюзионных контактов",
					treatingDoctorFullName: "Иванов И.И.",
				},
			]);
		};

		return (
			<div className="document-form-container form-003vu-wrapper">
				<DocumentPayloadCard
					title="Выписка из медицинской карты стоматологического больного (Форма № 003-В/у)"
					description="Официальная выписка с хроникой этапов лечения, диагностическими данными и рекомендациями"
				>
					<div className="form-group" style={{ marginBottom: "12px" }}>
						<label style={{ fontWeight: 600 }}>Диагноз при первичном обращении</label>
						<input
							type="text"
							className="form-control"
							value={admissionDiagnosis}
							onChange={(e) => setAdmissionDiagnosis(e.target.value)}
						/>
					</div>

					<div className="form-group" style={{ marginBottom: "12px" }}>
						<label style={{ fontWeight: 600 }}>Клинический развернутый диагноз</label>
						<input
							type="text"
							className="form-control"
							value={clinicalDiagnosis}
							onChange={(e) => setClinicalDiagnosis(e.target.value)}
						/>
					</div>

					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 8px 0" }}>
						<h4 style={{ margin: 0 }}>Хронологические этапы проведенного лечения ({stages.length})</h4>
						<button
							type="button"
							className="btn btn-sm btn-primary"
							onClick={addStageRow}
							disabled={disabled}
						>
							+ Добавить этап
						</button>
					</div>

					<div style={{ overflowX: "auto", marginBottom: "16px" }}>
						<table className="table table-bordered table-sm" style={{ fontSize: "12px" }}>
							<thead>
								<tr>
									<th>Дата</th>
									<th>Зуб</th>
									<th>Диагноз</th>
									<th>Проведенное лечение</th>
									<th>Врач</th>
								</tr>
							</thead>
							<tbody>
								{stages.map((st, idx) => (
									<tr key={idx}>
										<td>{st.stageDate}</td>
										<td>{st.toothNumber ?? "—"}</td>
										<td>{st.diagnosis}</td>
										<td>{st.interventionSummary}</td>
										<td>{st.treatingDoctorFullName}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="form-group">
						<label style={{ fontWeight: 600 }}>Рекомендации пациенту</label>
						<textarea
							className="form-control"
							rows={2}
							value={recommendations}
							onChange={(e) => setRecommendations(e.target.value)}
						/>
					</div>
				</DocumentPayloadCard>
			</div>
		);
	},
);
